import Link from "next/link"
import { CountrySelect } from "@/components/CountrySelect"
import { RemoteCheckbox } from "@/components/RemoteCheckbox"
import { ResumeMatchToggle } from "@/components/ResumeMatchToggle"
import { discoverHref } from "@/lib/discoverHref"
import { countryOptionSlug, loadDiscoverJobs } from "@/lib/loadDiscoverJobs"
import { isJobCategorySlug, JOB_CATEGORIES } from "@/lib/jobCategories"
import { countryFromParam, countrySlug } from "@/lib/jobCountries"
import type { SkillTerm } from "@/lib/jobSearch"
import { loadMatchResume } from "@/lib/loadMatchResume"
import { resumeMatchLabel, resumeSearchTerms } from "@/lib/resumeMatch"

const PAGE_SIZE = 20

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Discover jobs",
  description: "Open software roles from public Greenhouse job boards.",
}

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  return parsed
}

function parseQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return (raw ?? "").trim().slice(0, 80)
}

function parseResume(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = (raw ?? "").trim()
  if (!trimmed || trimmed.length > 128) return undefined
  return trimmed
}

function parseCursorStack(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) return []
    return parsed.slice(-50)
  } catch {
    return []
  }
}

function resumeTerms(titleRoles: string[][], skillTerms: SkillTerm[]) {
  const terms: string[] = []
  const seen = new Set<string>()
  const add = (term: string) => {
    if (!term || term.length > 32 || seen.has(term)) return
    seen.add(term)
    terms.push(term)
  }
  for (const skill of skillTerms) {
    if (skill.fromRole) add(skill.term)
  }
  for (const role of titleRoles) {
    for (const term of role) add(term)
  }
  for (const skill of skillTerms) add(skill.term)
  return terms.slice(0, 8)
}

function listingLead(
  remote: boolean,
  categoryLabel: string | undefined,
  query: string,
  companyCount: number,
  countryLabel?: string,
  resumeLabel?: string,
) {
  const companies = companyCount > 0 ? ` across ${companyCount.toLocaleString()} companies` : ""
  const where = countryLabel ? ` in ${countryLabel}` : ""
  const matchedTo = resumeLabel ? ` matched to ${resumeLabel}` : ""
  if (query) {
    const scope = categoryLabel
      ? `${remote ? "Remote " : ""}${categoryLabel} roles`
      : remote
        ? "Remote roles"
        : "Roles"
    return `${scope} matching "${query}"${matchedTo}${where}${companies}.`
  }
  if (resumeLabel) {
    const scope = categoryLabel
      ? `${remote ? "Remote " : ""}${categoryLabel} roles`
      : remote
        ? "Remote roles"
        : "Roles"
    return `${scope} matched to ${resumeLabel}${where}${companies}.`
  }
  if (categoryLabel) {
    return `${remote ? "Remote " : ""}${categoryLabel} roles${where} from public Greenhouse job boards${companies}.`
  }
  if (remote) {
    return `Remote postings${where} from public Greenhouse job boards${companies}.`
  }
  if (countryLabel) {
    return `Open postings in ${countryLabel} from public Greenhouse job boards${companies}.`
  }
  return companyCount > 0
    ? `Open postings from public Greenhouse job boards${companies}.`
    : "Open postings from public Greenhouse job boards."
}

function emptyListing(
  remote: boolean,
  categoryLabel: string | undefined,
  query: string,
  countryLabel?: string,
  resumeLabel?: string,
  resumeHasNoTerms?: boolean,
) {
  const where = countryLabel ? ` in ${countryLabel}` : ""
  if (resumeHasNoTerms) {
    return resumeLabel
      ? `${resumeLabel} has no roles or skills to match.`
      : "This resume has no roles or skills to match."
  }
  if (query) {
    const remoteWord = remote ? "remote " : ""
    return categoryLabel
      ? `No ${remoteWord}${categoryLabel} roles match "${query}"${where}.`
      : `No ${remoteWord}roles match "${query}"${where}.`
  }
  if (resumeLabel) {
    const remoteWord = remote ? "remote " : ""
    return categoryLabel
      ? `No ${remoteWord}${categoryLabel} roles match ${resumeLabel}${where}.`
      : `No ${remoteWord}roles match ${resumeLabel}${where}.`
  }
  if (categoryLabel && countryLabel) {
    return remote
      ? `No remote ${categoryLabel} roles in ${countryLabel}.`
      : `No open ${categoryLabel} roles in ${countryLabel}.`
  }
  if (categoryLabel) {
    return remote ? `No remote roles in ${categoryLabel}.` : `No open roles in ${categoryLabel}.`
  }
  if (countryLabel) {
    return remote ? `No remote roles in ${countryLabel}.` : `No open roles in ${countryLabel}.`
  }
  return remote ? "No remote roles were returned." : "No open roles were returned."
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
    remote?: string | string[]
    country?: string | string[]
    resume?: string | string[]
    cursor?: string | string[]
  }>
}) {
  const {
    page: pageParam,
    category: categoryParam,
    q: queryParam,
    remote: remoteParam,
    country: countryParam,
    resume: resumeParam,
    cursor: cursorParam,
  } = await searchParams
  const requestedCategory = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam
  const category = requestedCategory && isJobCategorySlug(requestedCategory) ? requestedCategory : undefined
  const query = parseQuery(queryParam)
  const remoteValue = Array.isArray(remoteParam) ? remoteParam[0] : remoteParam
  const remote = remoteValue === "1"
  const requestedCountry = Array.isArray(countryParam) ? countryParam[0] : countryParam
  const country = countryFromParam(requestedCountry)
  const countryParamSlug = country ? countrySlug(country) : undefined
  const requestedResume = parseResume(resumeParam)
  const unknownCategory = Boolean(requestedCategory) && !category
  const unsupportedCategory = Boolean(category) && category !== "software"
  const cursorStack = parseCursorStack(cursorParam)
  const page = parsePage(pageParam)
  const resumePromise = requestedResume ? loadMatchResume(requestedResume) : Promise.resolve(null)
  const matchResume = await resumePromise
  const resumeMissing = matchResume?.status === "missing"
  const loadedResume = matchResume?.status === "ok" ? matchResume.resume : null
  const { titleRoles, skillTerms } = loadedResume
    ? resumeSearchTerms(loadedResume)
    : { titleRoles: [] as string[][], skillTerms: [] as SkillTerm[] }
  const resumeHasNoTerms = Boolean(loadedResume) && titleRoles.length === 0 && skillTerms.length === 0
  const resumeLabel = loadedResume && !resumeHasNoTerms ? resumeMatchLabel(loadedResume) : undefined
  const terms = resumeLabel ? resumeTerms(titleRoles, skillTerms) : []
  const searching = query.length > 0 || terms.length > 0
  let loadError = false
  let loaded = {
    jobs: [] as Awaited<ReturnType<typeof loadDiscoverJobs>>["jobs"],
    total: 0 as number | null,
    isDone: true,
    continueCursor: null as string | null,
    capped: false,
    companyCount: 0,
    softwareCount: 0,
    countryOptions: [] as Array<{ name: string; count: number }>,
  }

  try {
    loaded = await loadDiscoverJobs({
      mode: unknownCategory || unsupportedCategory || resumeHasNoTerms ? "empty" : searching ? "search" : "browse",
      cursor: cursorStack.at(-1) ?? null,
      page,
      remote,
      country,
      query,
      terms,
    })
  } catch {
    loadError = true
  }

  const categoryLabel = category ? JOB_CATEGORIES.find((item) => item.slug === category)?.label : undefined
  const jobs = loaded.jobs
  const total = loaded.total
  const start = jobs.length === 0 ? 0 : searching ? (page - 1) * PAGE_SIZE + 1 : cursorStack.length * PAGE_SIZE + 1
  const rangeEnd = start === 0 ? 0 : start + jobs.length - 1
  const pageCount = Math.max(1, Math.ceil((total ?? jobs.length) / PAGE_SIZE))
  const nextStack =
    !searching && loaded.continueCursor && !loaded.isDone ? [...cursorStack, loaded.continueCursor] : undefined
  const previousStack = cursorStack.slice(0, -1)

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
          {listingLead(remote, categoryLabel ?? "Software", query, loaded.companyCount, country, resumeLabel)}
        </p>

        <form method="get" action="/discover" className="mt-6 flex gap-2">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {remote ? <input type="hidden" name="remote" value="1" /> : null}
          {countryParamSlug ? <input type="hidden" name="country" value={countryParamSlug} /> : null}
          {requestedResume ? <input type="hidden" name="resume" value={requestedResume} /> : null}
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
              href={discoverHref(1, category, undefined, remote, countryParamSlug, requestedResume)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <RemoteCheckbox checked={remote} href={discoverHref(1, category, query, !remote, countryParamSlug, requestedResume)} />
          <ResumeMatchToggle
            activeResumeId={requestedResume}
            category={category}
            query={query}
            remote={remote}
            country={countryParamSlug}
          />
          <CountrySelect
            value={countryParamSlug ?? ""}
            options={[
              { value: "", label: "Any country", href: discoverHref(1, category, query, remote, undefined, requestedResume) },
              ...loaded.countryOptions.map((option) => ({
                value: countryOptionSlug(option.name),
                label: `${option.name} (${option.count.toLocaleString()})`,
                href: discoverHref(1, category, query, remote, countryOptionSlug(option.name), requestedResume),
              })),
            ]}
          />
        </div>

        {loaded.capped ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Showing the closest matches. A broad search does not list every role.
          </p>
        ) : null}
        {resumeMissing ? (
          <p className="mt-3 text-sm text-muted-foreground">That resume could not be loaded.</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={discoverHref(1, undefined, query, remote, countryParamSlug, requestedResume)}
            className={`rounded-full border px-3 py-1 text-sm ${
              category
                ? "border-border text-foreground hover:bg-muted/60"
                : "border-blue-600 bg-blue-600 text-white"
            }`}
          >
            All
          </Link>
          {JOB_CATEGORIES.map((item) => {
            const count = item.slug === "software" ? loaded.softwareCount : 0
            const selected = item.slug === category
            return (
              <Link
                key={item.slug}
                href={discoverHref(1, item.slug, query, remote, countryParamSlug, requestedResume)}
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
            Software roles could not be loaded. Try again in a moment.
          </p>
        ) : unknownCategory ? (
          <p className="mt-8 text-sm text-muted-foreground">That category is not available.</p>
        ) : unsupportedCategory ? (
          <p className="mt-8 text-sm text-muted-foreground">
            Only Software roles are in the live catalog.
          </p>
        ) : jobs.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            {emptyListing(remote, categoryLabel ?? "Software", query, country, resumeLabel, resumeHasNoTerms)}
          </p>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {start.toLocaleString()}–{rangeEnd.toLocaleString()}
              {total != null ? ` of ${total.toLocaleString()}` : ""}
            </p>
            <div className="flex items-center gap-2">
              {searching && page > 1 ? (
                <Link
                  href={discoverHref(page - 1, category, query, remote, countryParamSlug, requestedResume)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
                >
                  Previous
                </Link>
              ) : null}
              {!searching && cursorStack.length > 0 ? (
                <Link
                  href={discoverHref(1, category, query, remote, countryParamSlug, requestedResume, previousStack)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
                >
                  Previous
                </Link>
              ) : null}
              {searching && page < pageCount ? (
                <Link
                  href={discoverHref(page + 1, category, query, remote, countryParamSlug, requestedResume)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
                >
                  Next
                </Link>
              ) : null}
              {!searching && nextStack ? (
                <Link
                  href={discoverHref(1, category, query, remote, countryParamSlug, requestedResume, nextStack)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
                >
                  Next
                </Link>
              ) : null}
            </div>
            </div>
            <ol className="mt-4 divide-y divide-border rounded-xl border border-border bg-white">
            {jobs.map((job, index) => {
              const updated = formatUpdatedAt(job.updatedAt)
              return (
                <li key={`${job.boardToken}-${job.id}`} className="px-4 py-4 md:px-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-14 shrink-0 text-right text-sm font-medium tabular-nums text-slate-400">
                      {(start + index).toLocaleString()}
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
                      {job.matchedInDescription ? (
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
