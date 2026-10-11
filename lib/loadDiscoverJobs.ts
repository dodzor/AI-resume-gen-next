import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { countrySlug } from "@/lib/jobCountries"

const PAGE_SIZE = 20

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
  isDone: boolean
  continueCursor: string | null
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

export async function loadDiscoverJobs(input: {
  mode: "browse" | "search" | "empty"
  cursor: string | null
  page: number
  remote: boolean
  country?: string
  query: string
  terms: string[]
}): Promise<LoadedDiscoverJobs> {
  const convex = client()
  const catalog = await convex.query(api.softwareJobs.getSoftwareCatalog, {})
  const countries = catalog?.countries ?? []
  const countryOptions = countries
    .filter((entry) => (input.remote ? entry.remoteCount : entry.count) > 0)
    .map((entry) => ({
      name: entry.name,
      count: input.remote ? entry.remoteCount : entry.count,
    }))
  const softwareCount = catalog?.total ?? 0
  const empty = {
    jobs: [],
    total: 0,
    isDone: true,
    continueCursor: null,
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
      isDone: result.isDone,
      continueCursor: null,
      capped: result.capped,
      companyCount: result.companyCount,
      softwareCount,
      countryOptions,
    }
  }

  const result = await convex.query(api.softwareJobs.listSoftwareJobsPage, {
    cursor: input.cursor,
    numItems: PAGE_SIZE,
    remote: input.remote || undefined,
    country: input.country,
  })
  let total: number | null = catalog ? catalog.total : null
  if (catalog && input.remote && input.country) total = countryCount(countries, input.country, true)
  else if (catalog && input.remote) total = catalog.remoteTotal
  else if (catalog && input.country) total = countryCount(countries, input.country, false)

  return {
    jobs: result.page.map((job) => ({ ...job, matchedInDescription: false })),
    total,
    isDone: result.isDone,
    continueCursor: result.continueCursor,
    capped: false,
    companyCount: 0,
    softwareCount,
    countryOptions,
  }
}

export function countryOptionSlug(name: string) {
  return countrySlug(name)
}
