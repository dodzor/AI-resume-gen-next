import { tokenize } from "@/lib/jobSearch"

export const LAST_EDITED_RESUME_KEY = "lastEditedResumeId"

export function resumeMatchLabel(resume: { jobTitle?: string; name: string }) {
  return resume.jobTitle?.trim() || resume.name.trim() || "Untitled resume"
}

const ROLE_FILLER = new Set([
  "senior", "junior", "lead", "staff", "principal", "associate", "intern", "internship",
  "entry", "mid", "middle", "level", "full", "time", "sr", "jr", "ii", "iii", "iv",
  "head", "chief", "vice", "assistant", "experienced", "temporary", "contract", "remote",
])

function uniqueTerms(text: string) {
  const terms: string[] = []
  const seen = new Set<string>()
  for (const token of tokenize(text)) {
    if (seen.has(token)) continue
    seen.add(token)
    terms.push(token)
  }
  return terms
}

export function resumeSearchTerms(resume: {
  experiences: Array<{ role: string }>
  skills: string
  portfolioProjects: Array<{ toolsSkills: string }>
}) {
  const titleRoles = resume.experiences
    .map((entry) => uniqueTerms(entry.role).filter((term) => !ROLE_FILLER.has(term)))
    .filter((terms) => terms.length > 0)
  const skillTerms = uniqueTerms(
    [resume.skills, ...resume.portfolioProjects.map((project) => project.toolsSkills)].filter(Boolean).join(" "),
  )
  return { titleRoles, skillTerms }
}
