// Bump when the patterns change so the category cache is rebuilt.
export const CATEGORY_RULES_VERSION = 2

export const JOB_CATEGORIES = [
  {
    slug: "nursing",
    label: "Nursing",
    pattern: /\b(nurses?|nursing|rn|lpns?|cnas?|crnas?|aprns?|midwives?|cnm|np)\b/i,
  },
  {
    slug: "mental-health",
    label: "Mental Health & Therapy",
    pattern:
      /\b(psychiatrists?|psychotherapists?|psychologists?|psychology|counsellors?|counselors?|pmhnp|social workers?|(?:behavior|behaviour)(?:al)? (?:technicians?|analysts?|intervention|health)|rbts?|bcbas?|bcabas?|(?<!physical )(?<!occupational )(?<!respiratory )(?<!speech )(?<!radiation )therapists?)\b/i,
  },
  {
    slug: "dental",
    label: "Dental",
    pattern: /\b(dentists?|dental|hygienists?|orthodont(?:ist|ic)s?)\b/i,
  },
  {
    slug: "veterinary",
    label: "Veterinary & Animal Health",
    pattern: /\b(veterinarians?|veterinary|vet[\s-]?techs?|dvms?)\b/i,
  },
  {
    slug: "legal",
    label: "Legal",
    pattern: /\b(attorneys?|lawyers?|paralegals?|solicitors?|counsel)\b/i,
  },
  {
    slug: "healthcare",
    label: "Healthcare & Clinical",
    pattern:
      /\b(pharmacists?|clinical|physicians?|medical|surgeons?|phlebotom(?:ist|y)|paramedics?|a?emts?|radiologists?|radiologic|radiology|sonographers?|optometrists?|optometry|caregivers?|pathologists?|(?:physical|occupational|respiratory|speech|radiation) therapists?|occupational therapy|speech[- ]language)\b/i,
  },
  {
    slug: "design",
    label: "Design",
    pattern: /\b(designers?|ui|ux|product design)\b/i,
  },
  {
    slug: "marketing",
    label: "Marketing",
    pattern: /\b(marketing|seo)\b/i,
  },
  {
    slug: "data",
    label: "Data",
    pattern:
      /\b(data (?:scientists?|analysts?|engineers?|architects?)|analytics engineers?|machine learning|mlops|business analysts?)\b/i,
  },
  {
    slug: "software",
    label: "Software",
    pattern:
      /\b(software|engineers?|engineering|developers?|devops|sre|architects?|cyber[- ]?security|information security|security analysts?)\b/i,
  },
  {
    slug: "product",
    label: "Product",
    pattern: /\bproduct\b/i,
  },
  {
    slug: "sales",
    label: "Sales",
    pattern:
      /\b(account (?:executives?|managers?)|sales|business development|bdrs?|sdrs?|vendeurs?|vendeuses?|customer success)\b/i,
  },
  {
    slug: "call-center",
    label: "Call Center & BPO",
    pattern: /\b(customer service|customer support|call cent(?:er|re)s?|representatives?)\b/i,
  },
  {
    slug: "finance",
    label: "Finance",
    pattern:
      /\b(accountants?|accounting|bookkeepers?|cfo|cpa|chief financial officers?|financial analysts?|finance (?:managers?|directors?|analysts?|partners?)|(?:head|director|vp|chief) of finance)\b/i,
  },
  {
    slug: "people",
    label: "People & HR",
    pattern: /\b(recruiters?|talent acquisition|human resources?|people partners?|(?<![\/])hr)\b/i,
  },
  {
    slug: "projects",
    label: "Project & Program",
    pattern: /\b(?:project|program(?:me)?) managers?\b/i,
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
