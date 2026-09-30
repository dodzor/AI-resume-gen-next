import Link from "next/link"
import { fetchGreenhouseJobs } from "@/lib/greenhouseJobs"

export const metadata = {
  title: "Discover jobs",
  description: "Open roles from a Greenhouse job board.",
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

export default async function DiscoverPage() {
  let jobs: Awaited<ReturnType<typeof fetchGreenhouseJobs>> = []
  let loadError = false

  try {
    jobs = await fetchGreenhouseJobs(10)
  } catch {
    loadError = true
  }

  const companyName = jobs[0]?.companyName ?? "Greenhouse"

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
          Open roles at {companyName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The first 10 postings from the public Greenhouse job board.
        </p>

        {loadError ? (
          <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Greenhouse jobs could not be loaded. Try again in a moment.
          </p>
        ) : jobs.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">No open roles were returned.</p>
        ) : (
          <ol className="mt-8 divide-y divide-border rounded-xl border border-border bg-white">
            {jobs.map((job, index) => {
              const updated = formatUpdatedAt(job.updatedAt)
              return (
                <li key={job.id} className="px-4 py-4 md:px-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-6 shrink-0 text-sm font-medium text-slate-400">
                      {index + 1}
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
                        {job.location}
                        {updated ? ` · Updated ${updated}` : ""}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </main>
    </div>
  )
}
