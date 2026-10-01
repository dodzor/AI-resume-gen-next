# How job titles are grouped

Grouping is a first-match title classification, not a cluster of similar titles. Each job gets at most one category, and the first regex in `JOB_CATEGORIES` that matches its title wins.

## Where it runs

Categories are written after a job refresh, or when the category file is older than the job cache.

1. `refreshGreenhouseJobs` in `lib/greenhouseJobs.ts` fetches every board, dedupes by URL, and writes `.cache/greenhouse-jobs.json`.
2. It then calls `writeJobCategories(jobs)`.
3. `fetchGreenhouseJobs` also calls `ensureJobCategories` on a cache hit. That rewrites categories only when `.cache/greenhouse-job-categories.json` is missing or older than the job cache (`categoryStamp < loadedStamp`).

`writeJobCategories` calls `categorizeJobs`, writes the records to the category cache, then builds an in-memory index:

```ts
async function writeJobCategories(jobs: GreenhouseJobListing[]) {
  const records = categorizeJobs(jobs)
  // write `.cache/greenhouse-job-categories.json`
  categoryMemory = {
    stamp: (await fs.stat(CATEGORIES_PATH)).mtimeMs,
    index: indexCategories(records),
  }
}
```

## How a title becomes a category

`categorizeJobs` in `lib/jobCategories.ts` walks every job and calls `categoryForTitle(job.title)`.

```ts
export function categoryForTitle(title: string): JobCategorySlug | null {
  const normalized = title.trim()
  for (const category of JOB_CATEGORIES) {
    if (category.pattern.test(normalized)) return category.slug
  }
  return null
}

export function categorizeJobs(jobs: Array<{ url: string; title: string }>): JobCategoryRecord[] {
  return jobs.flatMap((job) => {
    const category = categoryForTitle(job.title)
    return category ? [{ url: job.url, category }] : []
  })
}
```

The loop is ordered. Patterns are tested as nursing, mental health, dental, veterinary, healthcare, software, sales, then call center. The first hit is returned and the rest are skipped. A title that matches nothing is dropped, so it is absent from the category file but still in the job list.

That order matters for overlapping words. "Clinical Software Engineer" matches healthcare on `clinical` before software is considered. "Registered Nurse" matches nursing and never reaches healthcare's `medical`.

Each kept record is only `{ url, category }`. The title itself is not stored.

## How that index is used

`indexCategories` turns those records into two maps:

- `byUrl`: job URL to category slug
- `counts`: category slug to how many jobs landed there

`loadJobCategories` returns the in-memory index when the file mtime matches, otherwise it rereads the file.

On `/discover`, a `?category=` slug filters the full job list with `categories.byUrl.get(job.url) === category`. No category means every job is shown, including titles that matched no pattern.
