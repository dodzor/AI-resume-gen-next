import Link from "next/link"
import { redirect } from "next/navigation"
import { CountrySelect } from "@/components/CountrySelect"
import { DiscoverRequestSpinner } from "@/components/DiscoverRequestSpinner"
import { DiscoverPagination } from "@/components/DiscoverPagination"
import { RemoteCheckbox } from "@/components/RemoteCheckbox"
import { ResumeMatchToggle } from "@/components/ResumeMatchToggle"
import { discoverHref } from "@/lib/discoverHref"
import { countryOptionSlug, loadDiscoverJobs } from "@/lib/loadDiscoverJobs"
import { countryFromParam, countrySlug } from "@/lib/jobCountries"
import type { SkillTerm } from "@/lib/jobSearch"
import { loadMatchResume } from "@/lib/loadMatchResume"
import { resumeMatchLabel, resumeSearchTerms } from "@/lib/resumeMatch"
import { SiteHeader } from "@/components/SiteHeader"
import { features } from "@/config/features"

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
  query: string,
  companyCount: number,
  countryLabel?: string,
  resumeLabel?: string,
) {
  const companies = companyCount > 0 ? ` across ${companyCount.toLocaleString()} companies` : ""
  const where = countryLabel ? ` in ${countryLabel}` : ""
  const matchedTo = resumeLabel ? ` matched to ${resumeLabel}` : ""
  const scope = `${remote ? "Remote " : ""}Software roles`
  if (query) {
    return `${scope} matching "${query}"${matchedTo}${where}${companies}.`
  }
  if (resumeLabel) {
    return `${scope} matched to ${resumeLabel}${where}${companies}.`
  }
  return `${scope}${where} from public Greenhouse job boards${companies}.`
}

function emptyListing(
  remote: boolean,
  query: string,
  countryLabel?: string,
  resumeLabel?: string,
  resumeHasNoTerms?: boolean,
) {
  const where = countryLabel ? ` in ${countryLabel}` : ""
  const remoteWord = remote ? "remote " : ""
  if (resumeHasNoTerms) {
    return resumeLabel
      ? `${resumeLabel} has no roles or skills to match.`
      : "This resume has no roles or skills to match."
  }
  if (query) {
    return `No ${remoteWord}Software roles match "${query}"${where}.`
  }
  if (resumeLabel) {
    return `No ${remoteWord}Software roles match ${resumeLabel}${where}.`
  }
  if (countryLabel) {
    return remote
      ? `No remote Software roles in ${countryLabel}.`
      : `No open Software roles in ${countryLabel}.`
  }
  return remote ? "No remote roles in Software." : "No open roles in Software."
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
    q?: string | string[]
    remote?: string | string[]
    country?: string | string[]
    resume?: string | string[]
  }>
}) {
  if (!features.discoverJobs) redirect("/")

  const {
    page: pageParam,
    q: queryParam,
    remote: remoteParam,
    country: countryParam,
    resume: resumeParam,
  } = await searchParams
  const query = parseQuery(queryParam)
  const remoteValue = Array.isArray(remoteParam) ? remoteParam[0] : remoteParam
  const remote = remoteValue === "1"
  const requestedCountry = Array.isArray(countryParam) ? countryParam[0] : countryParam
  const country = countryFromParam(requestedCountry)
  const countryParamSlug = country ? countrySlug(country) : undefined
  const requestedResume = parseResume(resumeParam)
  const requestedPage = parsePage(pageParam)
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
    page: 1,
    isDone: true,
    capped: false,
    companyCount: 0,
    softwareCount: 0,
    countryOptions: [] as Array<{ name: string; count: number }>,
  }

  try {
    loaded = await loadDiscoverJobs({
      mode: resumeHasNoTerms ? "empty" : searching ? "search" : "browse",
      page: requestedPage,
      remote,
      country,
      query,
      terms,
    })
  } catch {
    loadError = true
  }

  const jobs = loaded.jobs
  const total = loaded.total
  const pageCount = total == null ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(loaded.page, pageCount)
  if (!loadError && page !== requestedPage) {
    redirect(discoverHref(page, undefined, query, remote, countryParamSlug, requestedResume))
  }
  const start = jobs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = start === 0 ? 0 : start + jobs.length - 1
  const hrefFor = (target: number) => discoverHref(target, undefined, query, remote, countryParamSlug, requestedResume)
  const resultsNoun = total === 1 ? "result" : "results"
  const resultsLabel =
    total == null
      ? null
      : jobs.length === 0
        ? `${total.toLocaleString()} ${resultsNoun}`
        : `Showing ${start.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()} ${resultsNoun}`

  return (
    <DiscoverRequestSpinner>
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Greenhouse
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Open roles
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {listingLead(remote, query, loaded.companyCount, country, resumeLabel)}
        </p>

        <form method="get" action="/discover" className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
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
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-white px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-blue-600 sm:text-sm"
          />
          <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted/60 active:bg-muted sm:flex-none"
          >
            Search
          </button>
          {query ? (
            <Link
              href={discoverHref(1, undefined, undefined, remote, countryParamSlug, requestedResume)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted/60 active:bg-muted sm:flex-none"
            >
              Clear
            </Link>
          ) : null}
          </div>
        </form>

        <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
          <RemoteCheckbox checked={remote} href={discoverHref(1, undefined, query, !remote, countryParamSlug, requestedResume)} />
          <ResumeMatchToggle
            activeResumeId={requestedResume}
            query={query}
            remote={remote}
            country={countryParamSlug}
          />
          <CountrySelect
            value={countryParamSlug ?? ""}
            options={[
              { value: "", label: "Any country", href: discoverHref(1, undefined, query, remote, undefined, requestedResume) },
              ...loaded.countryOptions.map((option) => ({
                value: countryOptionSlug(option.name),
                label: `${option.name} (${option.count.toLocaleString()})`,
                href: discoverHref(1, undefined, query, remote, countryOptionSlug(option.name), requestedResume),
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

        {loadError ? (
          <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Software roles could not be loaded. Try again in a moment.
          </p>
        ) : (
          <>
            {resultsLabel && !resumeHasNoTerms ? (
              <p className="mt-6 text-sm text-muted-foreground">{resultsLabel}</p>
            ) : null}
            {jobs.length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">
                {emptyListing(remote, query, country, resumeLabel, resumeHasNoTerms)}
              </p>
            ) : (
              <>
                <DiscoverPagination className="mt-4" page={page} pageCount={pageCount} hrefFor={hrefFor} />
                <ol className="mt-4 divide-y divide-border rounded-xl border border-border bg-white">
                  {jobs.map((job, index) => {
                    const updated = formatUpdatedAt(job.updatedAt)
                    return (
                      <li key={`${job.boardToken}-${job.id}`} className="px-4 py-4 md:px-5">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 w-8 shrink-0 text-right text-xs font-medium tabular-nums text-slate-400 sm:w-14 sm:text-sm">
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
                            <Link
                              href={`/?tailorUrl=${encodeURIComponent(job.url)}`}
                              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 hover:text-blue-900"
                            >
                              Use for an application
                            </Link>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
                <DiscoverPagination className="mt-6" page={page} pageCount={pageCount} hrefFor={hrefFor} />
              </>
            )}
          </>
        )}
      </main>
    </div>
    </DiscoverRequestSpinner>
  )
}
