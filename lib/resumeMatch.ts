import { tokenizeWithCase, type SkillTerm } from "@/lib/jobSearch"

export const LAST_EDITED_RESUME_KEY = "lastEditedResumeId"

export function resumeMatchLabel(resume: { jobTitle?: string; name: string }) {
  return resume.jobTitle?.trim() || resume.name.trim() || "Untitled resume"
}

const ROLE_FILLER = new Set([
  "senior", "junior", "lead", "staff", "principal", "associate", "intern", "internship",
  "entry", "mid", "middle", "level", "full", "time", "sr", "jr", "ii", "iii", "iv",
  "head", "chief", "vice", "assistant", "experienced", "temporary", "contract", "remote",
])

const GENERIC_ROLE = new Set([
  "developer", "developers", "engineer", "engineers", "engineering", "programmer", "development",
  "backend", "frontend", "fullstack", "software", "manager", "management", "analyst", "designer",
  "architect", "consultant", "specialist", "officer", "director", "coordinator",
])

function uniqueSkillTerms(text: string) {
  const byTerm = new Map<string, SkillTerm>()
  for (const token of tokenizeWithCase(text)) {
    const existing = byTerm.get(token.term)
    if (!existing) byTerm.set(token.term, token)
    else if (token.acronym) existing.acronym = true
  }
  return [...byTerm.values()]
}

export function resumeSearchTerms(resume: {
  experiences: Array<{ role: string }>
  skills: string
  portfolioProjects: Array<{ toolsSkills: string }>
  jobTitle?: string
}) {
  const titleRoles: string[][] = []
  const seenRoles = new Set<string>()
  const roleSkills: SkillTerm[] = []
  const roleTexts = [...resume.experiences.map((entry) => entry.role), resume.jobTitle ?? ""]
  for (const role of roleTexts) {
    const title: string[] = []
    for (const token of tokenizeWithCase(role)) {
      if (ROLE_FILLER.has(token.term) || GENERIC_ROLE.has(token.term)) continue
      roleSkills.push({ ...token, fromRole: true })
      if (!token.acronym) title.push(token.term)
    }
    const key = title.join(" ")
    if (!key || seenRoles.has(key)) continue
    seenRoles.add(key)
    titleRoles.push(title)
  }
  const skillTerms = uniqueSkillTerms(
    [resume.skills, ...resume.portfolioProjects.map((project) => project.toolsSkills)].filter(Boolean).join(" "),
  )
  for (const token of roleSkills) {
    const existing = skillTerms.find((term) => term.term === token.term)
    if (!existing) skillTerms.push(token)
    else {
      if (token.acronym) existing.acronym = true
      if (token.fromRole) existing.fromRole = true
    }
  }
  return { titleRoles, skillTerms }
}
