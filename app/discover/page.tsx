import Link from "next/link"
import { fetchGreenhouseJobs, loadJobCategories, loadJobSearchIndex } from "@/lib/greenhouseJobs"
import { isJobCategorySlug, JOB_CATEGORIES } from "@/lib/jobCategories"
import { descriptionMatchPositions } from "@/lib/jobSearch"

const PAGE_SIZE = 20

export const metadata = {
  title: "Discover jobs",
  description: "Open roles from a Greenhouse job board.",
}

function parsePage(value: string | string[] | undefined, pageCount: number) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  return Math.min(parsed, pageCount)
}

function parseQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return (raw ?? "").trim().slice(0, 80)
}

function discoverHref(page: number, category?: string, query?: string) {
  const params = new URLSearchParams()
  if (category) params.set("category", category)
  if (query) params.set("q", query)
  if (page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? `/discover?${search}` : "/discover"
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function titleTokenMatchers(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (token.length <= 3) {
        const pattern = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i")
        return (title: string, _lower: string) => pattern.test(title)
      }
      return (_title: string, lower: string) => lower.includes(token)
    })
}

function countMatchedCategories<T extends string>(jobs: Array<{ url: string }>, byUrl: Map<string, T>) {
  const counts = new Map<string, number>()
  for (const job of jobs) {
    const slug = byUrl.get(job.url)
    if (!slug) continue
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  return counts
}

function formatUpdatedAt(value: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[]
    category?: string | string[]
    q?: string | string[]
  }>
}) {
  const { page: pageParam, category: categoryParam, q: queryParam } = await searchParams
  const requestedCategory = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam
  const category = requestedCategory && isJobCategorySlug(requestedCategory) ? requestedCategory : undefined
  const query = parseQuery(queryParam)
  const unknownCategory = Boolean(requestedCategory) && !category
  let jobs: Awaited<ReturnType<typeof fetchGreenhouseJobs>> = []
  let loadError = false

  try {
    jobs = await fetchGreenhouseJobs()
  } catch {
    loadError = true
  }

  const categories = await loadJobCategories()
  const matchers = titleTokenMatchers(query)
  const searchIndex = matchers.length === 0 ? null : await loadJobSearchIndex(jobs.length)
  const descriptionPositions = searchIndex ? descriptionMatchPositions(query, searchIndex) : null
  const descriptionSearchReady = descriptionPositions !== null
  const matchedInDescription = new Set<(typeof jobs)[number]>()
  let matchedJobs: typeof jobs
  if (matchers.length === 0) {
    matchedJobs = jobs
  } else {
    const titleHits: typeof jobs = []
    const titlePositions = new Set<number>()
    for (let index = 0; index < jobs.length; index++) {
      const job = jobs[index]
      const lower = job.title.toLowerCase()
      if (!matchers.every((matches) => matches(job.title, lower))) continue
      titleHits.push(job)
      titlePositions.add(index)
    }
    const descriptionHits: typeof jobs = []
    if (descriptionPositions) {
      for (const position of descriptionPositions) {
        if (titlePositions.has(position)) continue
        const job = jobs[position]
        if (!job) continue
        descriptionHits.push(job)
        matchedInDescription.add(job)
      }
    }
    matchedJobs = titleHits.concat(descriptionHits)
  }
  const visibleJobs = category
    ? matchedJobs.filter((job) => categories.byUrl.get(job.url) === category)
    : matchedJobs
  const matchedCounts =
    matchers.length === 0 ? null : countMatchedCategories(matchedJobs, categories.byUrl)
  const categoryLabel = JOB_CATEGORIES.find((item) => item.slug === category)?.label
  const companyCount = new Set(visibleJobs.map((job) => job.companyName)).size
  const pageCount = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE))
  const page = parsePage(pageParam, visibleJobs.length === 0 ? 1 : pageCount)
  const start = (page - 1) * PAGE_SIZE
  const pageJobs = visibleJobs.slice(start, start + PAGE_SIZE)
  const rangeStart = visibleJobs.length === 0 ? 0 : start + 1
  const rangeEnd = start + pageJobs.length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="RoleMirror" className="h-12 w-12 object-contain" />
          </Link>
          <Link
            href="/"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
          >
            Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Greenhouse
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Open roles
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {query
            ? categoryLabel
              ? `${categoryLabel} roles matching "${query}"${companyCount > 0 ? ` across ${companyCount.toLocaleString()} companies` : ""}.`
              : companyCount > 0
                ? `Roles matching "${query}" across ${companyCount.toLocaleString()} companies.`
                : `Roles matching "${query}".`
            : categoryLabel
              ? `${categoryLabel} roles from public Greenhouse job boards${companyCount > 0 ? ` across ${companyCount.toLocaleString()} companies` : ""}.`
              : companyCount > 0
                ? `Open postings from public Greenhouse job boards across ${companyCount.toLocaleString()} companies.`
                : "Open postings from public Greenhouse job boards."}
        </p>

        <form method="get" action="/discover" className="mt-6 flex gap-2">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <label className="sr-only" htmlFor="role-search">
            Search titles and descriptions
          </label>
          <input
            id="role-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search titles and descriptions"
            maxLength={80}
            className="min-w-0 flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-blue-600"
          />
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
          >
            Search
          </button>
          {query ? (
            <Link
              href={discoverHref(1, category)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              Clear
            </Link>
          ) : null}
        </form>

        {query && !descriptionSearchReady ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Descriptions are still indexing. These results match titles only.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={discoverHref(1, undefined, query)}
            className={`rounded-full border px-3 py-1 text-sm ${
              category
                ? "border-border text-foreground hover:bg-muted/60"
                : "border-blue-600 bg-blue-600 text-white"
            }`}
          >
            All
          </Link>
          {JOB_CATEGORIES.map((item) => {
            const count = matchedCounts
              ? (matchedCounts.get(item.slug) ?? 0)
              : (categories.counts.get(item.slug) ?? 0)
            const selected = item.slug === category
            return (
              <Link
                key={item.slug}
                href={discoverHref(1, item.slug, query)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-border text-foreground hover:bg-muted/60"
                }`}
              >
                {item.label}
                {count > 0 ? ` (${count.toLocaleString()})` : ""}
              </Link>
            )
          })}
        </div>

        {loadError ? (
          <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Greenhouse jobs could not be loaded. Try again in a moment.
          </p>
        ) : unknownCategory ? (
          <p className="mt-8 text-sm text-muted-foreground">That category is not available.</p>
        ) : visibleJobs.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            {query
              ? categoryLabel
                ? `No ${categoryLabel} roles match "${query}".`
                : `No roles match "${query}".`
              : categoryLabel
                ? `No open roles in ${categoryLabel}.`
                : "No open roles were returned."}
          </p>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {visibleJobs.length.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={discoverHref(page - 1, category, query)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
                >
                  Previous
                </Link>
              ) : null}
              {page < pageCount ? (
                <Link
                  href={discoverHref(page + 1, category, query)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
                >
                  Next
                </Link>
              ) : null}
            </div>
            </div>
            <ol className="mt-4 divide-y divide-border rounded-xl border border-border bg-white">
            {pageJobs.map((job, index) => {
              const updated = formatUpdatedAt(job.updatedAt)
              return (
                <li key={`${job.boardToken}-${job.id}`} className="px-4 py-4 md:px-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-14 shrink-0 text-right text-sm font-medium tabular-nums text-slate-400">
                      {(start + index + 1).toLocaleString()}
                    </span>
                    <div className="min-w-0">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 hover:text-blue-700"
                      >
                        {job.title}
                      </a>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {job.companyName} · {job.location}
                        {updated ? ` · Updated ${updated}` : ""}
                      </p>
                      {matchedInDescription.has(job) ? (
                        <p className="mt-1 text-xs font-medium text-blue-700">Matched in description</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
            </ol>
          </>
        )}
      </main>
    </div>
  )
}
