export const JOB_CATEGORIES = [
  {
    slug: "nursing",
    label: "Nursing",
    pattern: /\b(nurses?|nursing|rn|lpns?|cnas?)\b/i,
  },
  {
    slug: "mental-health",
    label: "Mental Health & Therapy",
    pattern: /\b(psychiatrists?|therapists?|counsellors?|counselors?|pmhnp|psychotherapists?)\b/i,
  },
  {
    slug: "dental",
    label: "Dental",
    pattern: /\b(dentists?|dental|hygienists?)\b/i,
  },
  {
    slug: "veterinary",
    label: "Veterinary & Animal Health",
    pattern: /\b(veterinarians?|veterinary|vet[\s-]?techs?)\b/i,
  },
  {
    slug: "healthcare",
    label: "Healthcare & Clinical",
    pattern: /\b(pharmacists?|clinical|physicians?|medical)\b/i,
  },
  {
    slug: "software",
    label: "Software",
    pattern: /\b(software|engineers?|engineering|developers?)\b/i,
  },
  {
    slug: "sales",
    label: "Sales",
    pattern: /\b(account executives?|sales)\b/i,
  },
  {
    slug: "call-center",
    label: "Call Center & BPO",
    pattern: /\b(customer service|call cent(?:er|re)s?|representatives?)\b/i,
  },
] as const

export type JobCategorySlug = (typeof JOB_CATEGORIES)[number]["slug"]

export type JobCategoryRecord = {
  url: string
  category: JobCategorySlug
}

const CATEGORY_SLUGS = new Set<string>(JOB_CATEGORIES.map((category) => category.slug))

export function isJobCategorySlug(value: string): value is JobCategorySlug {
  return CATEGORY_SLUGS.has(value)
}

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
