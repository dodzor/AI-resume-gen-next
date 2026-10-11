import { readFileSync } from "fs"
import path from "path"
import { ConvexHttpClient } from "convex/browser"
import type { PaginationResult } from "convex/server"
import { api } from "../convex/_generated/api"
import type { Doc, Id } from "../convex/_generated/dataModel"
import boardTokens from "./greenhouseBoards.json"
import { categoryForTitle } from "./jobCategories"
import { countriesInLocation, isRemoteLocation } from "./jobCountries"
import { plainTextFromGreenhouseContent } from "./jobSearch"

const LIST_CONCURRENCY = 16
const CONTENT_BATCH = 8
const DELETE_BATCH = 100
const FACET_BATCH = 20
const STAMP_PAGE_SIZE = 200
const MAX_TEXT_BYTES = 800_000

type GreenhouseJob = {
  id?: number
  title?: string
  company_name?: string
  absolute_url?: string
  updated_at?: string
  content?: string
  location?: { name?: string }
}

export type ListedSoftwareJob = {
  greenhouseId: number
  boardToken: string
  title: string
  companyName: string
  location: string
  url: string
  updatedAt: string
  remote: boolean
  countries: string[]
}

export type StoredSoftwareJob = {
  id: Id<"softwareJobs">
  descriptionId: Id<"softwareJobDescriptions">
  boardToken: string
  url: string
  updatedAt: string
  remote?: boolean
  countries?: string[]
}

function sameFacets(stored: StoredSoftwareJob, listed: ListedSoftwareJob) {
  if (typeof stored.remote !== "boolean" || !stored.countries) return false
  if (stored.remote !== listed.remote || stored.countries.length !== listed.countries.length) return false
  for (let index = 0; index < listed.countries.length; index++) {
    if (stored.countries[index] !== listed.countries[index]) return false
  }
  return true
}

export function planSoftwareJobSync(
  listed: ListedSoftwareJob[],
  stored: StoredSoftwareJob[],
  fetchedBoards: ReadonlySet<string>,
) {
  const listedByUrl = new Map<string, ListedSoftwareJob>()
  for (const job of listed) {
    if (!listedByUrl.has(job.url)) listedByUrl.set(job.url, job)
  }

  const storedByUrl = new Map<string, StoredSoftwareJob>()
  const toDelete: StoredSoftwareJob[] = []
  for (const job of stored) {
    const previous = storedByUrl.get(job.url)
    if (previous) {
      toDelete.push(job)
      continue
    }
    storedByUrl.set(job.url, job)
  }

  const toFetch: ListedSoftwareJob[] = []
  const toPatch: ListedSoftwareJob[] = []
  let unchanged = 0
  for (const job of listedByUrl.values()) {
    const stamp = storedByUrl.get(job.url)
    if (!stamp || stamp.updatedAt !== job.updatedAt) {
      toFetch.push(job)
      continue
    }
    if (sameFacets(stamp, job)) unchanged += 1
    else toPatch.push(job)
  }

  for (const job of storedByUrl.values()) {
    if (!fetchedBoards.has(job.boardToken)) continue
    if (!listedByUrl.has(job.url)) toDelete.push(job)
  }

  return { unchanged, toFetch, toPatch, toDelete }
}

const envFromFile = new Set<string>()

function loadEnvFile(fileName: string) {
  let raw: string
  try {
    raw = readFileSync(path.join(process.cwd(), fileName), "utf8")
  } catch {
    return
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] !== undefined && !envFromFile.has(key)) continue
    process.env[key] = value
    envFromFile.add(key)
  }
}

function textBytes(text: string) {
  return new TextEncoder().encode(text).length
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    let response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30000) })
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30000) })
    }
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

function toListedJob(boardToken: string, job: GreenhouseJob): ListedSoftwareJob | null {
  if (typeof job.id !== "number" || !job.title || !job.absolute_url) return null
  if (categoryForTitle(job.title) !== "software") return null
  const location = job.location?.name || "Location not listed"
  return {
    greenhouseId: job.id,
    boardToken,
    title: job.title,
    companyName: job.company_name || boardToken,
    location,
    url: job.absolute_url,
    updatedAt: job.updated_at || "",
    remote: isRemoteLocation(location),
    countries: [...countriesInLocation(location)].sort(),
  }
}

async function fetchBoardList(boardToken: string): Promise<ListedSoftwareJob[] | null> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`
  const data = await fetchJson(url)
  if (!data || typeof data !== "object" || !("jobs" in data) || !Array.isArray(data.jobs)) return null
  const listed: ListedSoftwareJob[] = []
  for (const job of data.jobs as GreenhouseJob[]) {
    const mapped = toListedJob(boardToken, job)
    if (mapped) listed.push(mapped)
  }
  return listed
}

async function fetchJobText(job: ListedSoftwareJob): Promise<string | null> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(job.boardToken)}/jobs/${job.greenhouseId}`
  const data = await fetchJson(url)
  if (!data || typeof data !== "object") return null
  const content = "content" in data && typeof data.content === "string" ? data.content : ""
  return plainTextFromGreenhouseContent(content)
}

async function forEachPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
}

async function loadStoredJobs(convex: ConvexHttpClient, secret: string) {
  const stored: StoredSoftwareJob[] = []
  let cursor: string | null = null
  for (;;) {
    const page: PaginationResult<Doc<"softwareJobs">> = await convex.query(api.softwareJobs.listSoftwareJobStamps, {
      secret,
      cursor,
      numItems: STAMP_PAGE_SIZE,
    })
    for (const job of page.page) {
      stored.push({
        id: job._id,
        descriptionId: job.descriptionId,
        boardToken: job.boardToken,
        url: job.url,
        updatedAt: job.updatedAt,
        remote: job.remote,
        countries: job.countries ? [...job.countries] : undefined,
      })
    }
    if (page.isDone) break
    cursor = page.continueCursor
  }
  return stored
}

export async function syncSoftwareJobs() {
  loadEnvFile(".env")
  loadEnvFile(".env.local")

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const secret = process.env.SOFTWARE_JOB_SYNC_SECRET
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
  if (!secret) {
    throw new Error(
      "SOFTWARE_JOB_SYNC_SECRET is not set. Add it to .env.local and to the Convex deployment environment.",
    )
  }

  const convex = new ConvexHttpClient(convexUrl)
  const stored = await loadStoredJobs(convex, secret)
  console.log(`Loaded ${stored.length} stored software jobs`)

  const listed: ListedSoftwareJob[] = []
  const fetchedBoards = new Set<string>()
  let completed = 0
  let failedBoards = 0
  await forEachPool(boardTokens, LIST_CONCURRENCY, async (boardToken) => {
    const jobs = await fetchBoardList(boardToken)
    completed += 1
    if (completed % 500 === 0 || completed === boardTokens.length) {
      console.log(`Fetched ${completed}/${boardTokens.length} boards`)
    }
    if (!jobs) {
      failedBoards += 1
      return
    }
    fetchedBoards.add(boardToken)
    listed.push(...jobs)
  })

  if (fetchedBoards.size === 0) {
    throw new Error("Every Greenhouse board request failed")
  }

  const plan = planSoftwareJobSync(listed, stored, fetchedBoards)
  console.log(
    `${plan.unchanged} unchanged, ${plan.toPatch.length} to update filters, ${plan.toFetch.length} to fetch, ${plan.toDelete.length} to delete, ${failedBoards} boards failed`,
  )

  let deleted = 0
  for (let start = 0; start < plan.toDelete.length; start += DELETE_BATCH) {
    const ids = plan.toDelete.slice(start, start + DELETE_BATCH).map((job) => job.id)
    const result = await convex.mutation(api.softwareJobs.deleteSoftwareJobs, { secret, ids })
    deleted += result.deleted
  }

  let patched = 0
  for (let start = 0; start < plan.toPatch.length; start += FACET_BATCH) {
    const jobs = plan.toPatch.slice(start, start + FACET_BATCH).map((job) => ({
      url: job.url,
      remote: job.remote,
      countries: job.countries,
    }))
    const result = await convex.mutation(api.softwareJobs.patchSoftwareJobFacets, { secret, jobs })
    patched += result.patched
    if (patched % 500 < FACET_BATCH || start + FACET_BATCH >= plan.toPatch.length) {
      console.log(`Updated filters on ${patched} software jobs`)
    }
  }

  let upserted = 0
  let skipped = 0
  let contentFailed = 0
  for (let start = 0; start < plan.toFetch.length; start += CONTENT_BATCH) {
    const slice = plan.toFetch.slice(start, start + CONTENT_BATCH)
    const jobs: Array<ListedSoftwareJob & { text: string }> = []
    await Promise.all(
      slice.map(async (job) => {
        const text = await fetchJobText(job)
        if (text === null) {
          contentFailed += 1
          return
        }
        if (textBytes(text) > MAX_TEXT_BYTES) {
          skipped += 1
          console.warn(`Skipping ${job.url}: description is too large`)
          return
        }
        jobs.push({
          ...job,
          text,
        })
      }),
    )
    if (jobs.length === 0) continue
    const result = await convex.mutation(api.softwareJobs.upsertSoftwareJobs, { secret, jobs })
    upserted += result.upserted
    skipped += result.skipped
    if (upserted % 200 < CONTENT_BATCH || start + CONTENT_BATCH >= plan.toFetch.length) {
      console.log(`Upserted ${upserted} software jobs`)
    }
  }

  if (failedBoards === 0) {
    const seen = new Set<string>()
    const countryCounts = new Map<string, { count: number; remoteCount: number }>()
    let total = 0
    let remoteTotal = 0
    for (const job of listed) {
      if (seen.has(job.url)) continue
      seen.add(job.url)
      total += 1
      if (job.remote) remoteTotal += 1
      for (const name of job.countries) {
        const current = countryCounts.get(name) ?? { count: 0, remoteCount: 0 }
        current.count += 1
        if (job.remote) current.remoteCount += 1
        countryCounts.set(name, current)
      }
    }
    const countries = [...countryCounts.entries()]
      .map(([name, counts]) => ({ name, count: counts.count, remoteCount: counts.remoteCount }))
      .sort((left, right) => left.name.localeCompare(right.name))
    await convex.mutation(api.softwareJobs.setSoftwareCatalog, { secret, total, remoteTotal, countries })
  }

  console.log(
    `Software sync finished: ${upserted} upserted, ${plan.unchanged} unchanged, ${patched} filters updated, ${deleted} deleted, ${contentFailed} content fetches failed, ${skipped} skipped`,
  )
}

const entry = process.argv[1] ?? ""
if (entry.endsWith("syncSoftwareJobs.ts") || entry.endsWith("syncSoftwareJobs.js")) {
  syncSoftwareJobs().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
