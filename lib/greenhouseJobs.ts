import { promises as fs } from "fs"
import path from "path"
// Board tokens from the Last Round AI ATS company directory (CC-BY-4.0), August 2026.
import boardTokens from "./greenhouseBoards.json"
import { categorizeJobs, type JobCategoryRecord, type JobCategorySlug } from "./jobCategories"

const CACHE_PATH = path.join(process.cwd(), ".cache", "greenhouse-jobs.json")
const CATEGORIES_PATH = path.join(process.cwd(), ".cache", "greenhouse-job-categories.json")
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const CONCURRENCY = 16

export type GreenhouseJobListing = {
  id: number
  boardToken: string
  title: string
  companyName: string
  location: string
  url: string
  updatedAt: string
}

type GreenhouseJobsResponse = {
  jobs?: Array<{
    id?: number
    title?: string
    company_name?: string
    absolute_url?: string
    updated_at?: string
    location?: { name?: string }
  }>
}

type CacheFile = {
  fetchedAt: number
  jobs: GreenhouseJobListing[]
}

type CategoryIndex = {
  byUrl: Map<string, JobCategorySlug>
  counts: Map<JobCategorySlug, number>
}

let memory: CacheFile | null = null
let loadedStamp = 0
let categoryMemory: { stamp: number; index: CategoryIndex } | null = null
let refreshInFlight: Promise<GreenhouseJobListing[]> | null = null

function isFresh(cache: CacheFile) {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS
}

async function readDisk(): Promise<CacheFile | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8")
    const parsed = JSON.parse(raw) as CacheFile
    if (!parsed || !Array.isArray(parsed.jobs) || typeof parsed.fetchedAt !== "number") {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function mapJobs(boardToken: string, data: GreenhouseJobsResponse): GreenhouseJobListing[] {
  const jobs = Array.isArray(data.jobs) ? data.jobs : []
  return jobs.flatMap((job) => {
    if (typeof job.id !== "number" || !job.title || !job.absolute_url) {
      return []
    }
    return [{
      id: job.id,
      boardToken,
      title: job.title,
      companyName: job.company_name || boardToken,
      location: job.location?.name || "Location not listed",
      url: job.absolute_url,
      updatedAt: job.updated_at || "",
    }]
  })
}

async function fetchBoard(boardToken: string): Promise<GreenhouseJobListing[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`
  try {
    let response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) })
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) })
    }
    if (!response.ok) return []
    return mapJobs(boardToken, (await response.json()) as GreenhouseJobsResponse)
  } catch {
    return []
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await fn(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

export async function refreshGreenhouseJobs(): Promise<GreenhouseJobListing[]> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    let completed = 0
    const boards = await mapPool(boardTokens, CONCURRENCY, async (boardToken) => {
      const jobs = await fetchBoard(boardToken)
      completed += 1
      if (completed % 500 === 0 || completed === boardTokens.length) {
        console.log(`Fetched ${completed}/${boardTokens.length} boards`)
      }
      return jobs
    })
    const seen = new Set<string>()
    const jobs = boards.flat().filter((job) => {
      if (seen.has(job.url)) return false
      seen.add(job.url)
      return true
    })

    if (jobs.length === 0) {
      throw new Error("Greenhouse returned no jobs")
    }

    if (memory && jobs.length < memory.jobs.length * 0.9) {
      console.warn(
        `Greenhouse refresh returned ${jobs.length} roles; keeping ${memory.jobs.length}`
      )
      return memory.jobs
    }

    const cache: CacheFile = { fetchedAt: Date.now(), jobs }
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true })
    const tempPath = `${CACHE_PATH}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(cache))
    await fs.rename(tempPath, CACHE_PATH)
    memory = cache
    loadedStamp = (await fs.stat(CACHE_PATH)).mtimeMs
    await writeJobCategories(jobs)
    return jobs
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

function indexCategories(records: JobCategoryRecord[]): CategoryIndex {
  const byUrl = new Map<string, JobCategorySlug>()
  const counts = new Map<JobCategorySlug, number>()
  for (const record of records) {
    byUrl.set(record.url, record.category)
    counts.set(record.category, (counts.get(record.category) ?? 0) + 1)
  }
  return { byUrl, counts }
}

async function writeJobCategories(jobs: GreenhouseJobListing[]) {
  const records = categorizeJobs(jobs)
  const tempPath = `${CATEGORIES_PATH}.tmp`
  await fs.mkdir(path.dirname(CATEGORIES_PATH), { recursive: true })
  await fs.writeFile(tempPath, JSON.stringify(records))
  await fs.rename(tempPath, CATEGORIES_PATH)
  categoryMemory = {
    stamp: (await fs.stat(CATEGORIES_PATH)).mtimeMs,
    index: indexCategories(records),
  }
}

async function readJobCategories(): Promise<JobCategoryRecord[] | null> {
  try {
    const raw = await fs.readFile(CATEGORIES_PATH, "utf8")
    const parsed = JSON.parse(raw) as JobCategoryRecord[]
    if (!Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

async function ensureJobCategories(jobs: GreenhouseJobListing[]) {
  let categoryStamp = 0
  try {
    categoryStamp = (await fs.stat(CATEGORIES_PATH)).mtimeMs
  } catch {
    categoryStamp = 0
  }

  if (categoryStamp !== 0 && categoryStamp >= loadedStamp) return
  await writeJobCategories(jobs)
}

export async function loadJobCategories(): Promise<CategoryIndex> {
  let categoryStamp = 0
  try {
    categoryStamp = (await fs.stat(CATEGORIES_PATH)).mtimeMs
  } catch {
    categoryStamp = 0
  }

  if (categoryMemory && categoryMemory.stamp === categoryStamp && categoryStamp !== 0) {
    return categoryMemory.index
  }

  const records = await readJobCategories()
  const index = indexCategories(records ?? [])
  categoryMemory = { stamp: categoryStamp, index }
  return index
}

async function loadNewestCache(): Promise<CacheFile | null> {
  let diskStamp = 0
  try {
    diskStamp = (await fs.stat(CACHE_PATH)).mtimeMs
  } catch {
    diskStamp = 0
  }

  if (diskStamp !== loadedStamp) {
    const disk = await readDisk()
    if (disk) {
      memory = disk
      loadedStamp = diskStamp
    }
  }

  return memory
}

export async function fetchGreenhouseJobs(): Promise<GreenhouseJobListing[]> {
  const cached = await loadNewestCache()
  if (cached && isFresh(cached)) {
    await ensureJobCategories(cached.jobs)
    return cached.jobs
  }
  if (cached) {
    await ensureJobCategories(cached.jobs)
    void refreshGreenhouseJobs()
    return cached.jobs
  }

  return refreshGreenhouseJobs()
}

const entry = process.argv[1] ?? ""
if (entry.endsWith("greenhouseJobs.ts") || entry.endsWith("greenhouseJobs.js")) {
  refreshGreenhouseJobs()
    .then((jobs) => {
      const companies = new Set(jobs.map((job) => job.companyName)).size
      console.log(`Cached ${jobs.length} roles from ${companies} companies`)
    })
    .catch((error: unknown) => {
      console.error(error)
      process.exitCode = 1
    })
}
