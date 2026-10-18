import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { countrySlug } from "@/lib/jobCountries"

const PAGE_SIZE = 20
const CATALOG_SCAN = 4_000

const browseCursors = new Map<string, Map<number, string | null>>()

type SoftwareCatalog = {
  total: number
  remoteTotal: number
  countries: Array<{ name: string; count: number; remoteCount: number }>
  updatedAt: number
}

let catalogBuild: Promise<SoftwareCatalog> | null = null

export type DiscoverListing = {
  id: number
  boardToken: string
  title: string
  companyName: string
  location: string
  url: string
  updatedAt: string
  matchedInDescription: boolean
}

export type LoadedDiscoverJobs = {
  jobs: DiscoverListing[]
  total: number | null
  page: number
  isDone: boolean
  capped: boolean
  companyCount: number
  softwareCount: number
  countryOptions: Array<{ name: string; count: number }>
}

function client() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
  return new ConvexHttpClient(url)
}

function countryCount(
  countries: Array<{ name: string; count: number; remoteCount: number }>,
  country: string | undefined,
  remote: boolean,
) {
  const match = countries.find((entry) => entry.name === country)
  if (!match) return 0
  return remote ? match.remoteCount : match.count
}

async function loadCatalog(convex: ReturnType<typeof client>): Promise<SoftwareCatalog | null> {
  const existing = await convex.query(api.softwareJobs.getSoftwareCatalog, {})
  if (existing) return existing
  if (!catalogBuild) {
    catalogBuild = buildCatalog(convex).catch((error: unknown) => {
      catalogBuild = null
      throw error
    })
  }
  return catalogBuild
}

async function buildCatalog(convex: ReturnType<typeof client>): Promise<SoftwareCatalog> {
  let cursor: string | null = null
  let total = 0
  let remoteTotal = 0
  const countryCounts = new Map<string, { count: number; remoteCount: number }>()
  for (let step = 0; step < 40; step++) {
    const result = await convex.query(api.softwareJobs.scanSoftwareJobStats, {
      cursor,
      limit: CATALOG_SCAN,
    })
    total += result.scanned
    remoteTotal += result.remote
    for (const entry of result.countries) {
      const current = countryCounts.get(entry.name) ?? { count: 0, remoteCount: 0 }
      current.count += entry.count
      current.remoteCount += entry.remoteCount
      countryCounts.set(entry.name, current)
    }
    if (result.isDone || result.scanned === 0) break
    cursor = result.continueCursor
  }
  const countries = [...countryCounts.entries()]
    .map(([name, counts]) => ({ name, count: counts.count, remoteCount: counts.remoteCount }))
    .sort((left, right) => left.name.localeCompare(right.name))
  const secret = process.env.SOFTWARE_JOB_SYNC_SECRET
  if (secret) {
    try {
      await convex.mutation(api.softwareJobs.setSoftwareCatalog, {
        secret,
        total,
        remoteTotal,
        countries,
      })
    } catch {
      // The counted catalog still drives this response when the write is rejected.
    }
  }
  return { total, remoteTotal, countries, updatedAt: Date.now() }
}

export async function loadDiscoverJobs(input: {
  mode: "browse" | "search" | "empty"
  page: number
  remote: boolean
  country?: string
  query: string
  terms: string[]
}): Promise<LoadedDiscoverJobs> {
  const convex = client()
  const catalog = await loadCatalog(convex)
  const countries = catalog?.countries ?? []
  const countryOptions = countries
    .filter((entry) => (input.remote ? entry.remoteCount : entry.count) > 0)
    .map((entry) => ({
      name: entry.name,
      count: input.remote ? entry.remoteCount : entry.count,
    }))
  const softwareCount = catalog?.total ?? 0
  const empty = {
    jobs: [] as DiscoverListing[],
    total: 0 as number | null,
    page: 1,
    isDone: true,
    capped: false,
    companyCount: 0,
    softwareCount,
    countryOptions,
  }
  if (input.mode === "empty") return empty

  if (input.mode === "search") {
    const result = await convex.query(api.softwareJobs.searchSoftwareJobs, {
      query: input.query || undefined,
      terms: input.terms,
      remote: input.remote || undefined,
      country: input.country,
      page: input.page,
    })
    return {
      jobs: result.page.map((job) => ({ ...job, matchedInDescription: job.matchedInDescription })),
      total: result.total,
      page: input.page,
      isDone: result.isDone,
      capped: result.capped,
      companyCount: result.companyCount,
      softwareCount,
      countryOptions,
    }
  }

  let total: number | null = catalog ? catalog.total : null
  if (catalog && input.remote && input.country) total = countryCount(countries, input.country, true)
  else if (catalog && input.remote) total = catalog.remoteTotal
  else if (catalog && input.country) total = countryCount(countries, input.country, false)
  const pageCount = total == null ? null : Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = pageCount == null ? 1 : Math.min(input.page, pageCount)
  if (total === 0) return { ...empty, total, page, softwareCount, countryOptions }

  const result = await loadBrowsePage(convex, {
    page,
    remote: input.remote,
    country: input.country,
    catalogUpdatedAt: catalog?.updatedAt ?? 0,
  })
  return {
    jobs: result.jobs,
    total,
    page,
    isDone: result.isDone,
    capped: false,
    companyCount: 0,
    softwareCount,
    countryOptions,
  }
}

async function loadBrowsePage(
  convex: ReturnType<typeof client>,
  input: { page: number; remote: boolean; country?: string; catalogUpdatedAt: number },
) {
  const key = `${input.catalogUpdatedAt}|${input.remote ? 1 : 0}|${input.country ?? ""}`
  let cursors = browseCursors.get(key)
  if (!cursors) {
    if (browseCursors.size >= 32) {
      const oldest = browseCursors.keys().next().value
      if (oldest) browseCursors.delete(oldest)
    }
    cursors = new Map<number, string | null>([[1, null]])
    browseCursors.set(key, cursors)
  }

  let startPage = 1
  let cursor: string | null = null
  for (const [cachedPage, cachedCursor] of cursors) {
    if (cachedPage <= input.page && cachedPage >= startPage) {
      startPage = cachedPage
      cursor = cachedCursor
    }
  }

  let skip = (input.page - startPage) * PAGE_SIZE
  for (let attempt = 0; attempt < 20 && skip > 0; attempt++) {
    const result = await convex.query(api.softwareJobs.listSoftwareJobsPage, {
      cursor,
      skip,
      numItems: PAGE_SIZE,
      remote: input.remote || undefined,
      country: input.country,
    })
    if (result.skipped <= 0) return { jobs: [] as DiscoverListing[], isDone: true }
    if (result.reached || result.isDone) {
      if (!result.isDone) cursors.set(input.page + 1, result.continueCursor)
      return {
        jobs: result.page.map((job) => ({ ...job, matchedInDescription: false })),
        isDone: result.isDone,
      }
    }
    skip -= result.skipped
    cursor = result.continueCursor
    const advanced = result.skipped / PAGE_SIZE
    if (Number.isInteger(advanced)) {
      startPage += advanced
      cursors.set(startPage, result.continueCursor)
    }
  }

  const result = await convex.query(api.softwareJobs.listSoftwareJobsPage, {
    cursor,
    skip: 0,
    numItems: PAGE_SIZE,
    remote: input.remote || undefined,
    country: input.country,
  })
  if (!result.isDone) cursors.set(input.page + 1, result.continueCursor)
  return {
    jobs: result.page.map((job) => ({ ...job, matchedInDescription: false })),
    isDone: result.isDone,
  }
}

export function countryOptionSlug(name: string) {
  return countrySlug(name)
}
