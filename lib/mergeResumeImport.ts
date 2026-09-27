import type { ResumeImportPayload } from '@/lib/resumeImportSchema'

export type ResumeMergeMode = 'fillEmpty' | 'replaceSections'

const defaultExperience = { role: '', company: '', dates: '', description: '' }
const defaultEducation = { degree: '', school: '', dates: '', gpa: '', coursework: '' }

function isBlank(s: unknown): boolean {
  return typeof s !== 'string' || !s.trim()
}

function isDefaultSingleExperience(experiences: unknown): boolean {
  if (!Array.isArray(experiences) || experiences.length !== 1) return false
  const e = experiences[0] as Record<string, unknown>
  return (
    isBlank(e?.role) &&
    isBlank(e?.company) &&
    isBlank(e?.dates) &&
    isBlank(e?.description)
  )
}

function isDefaultSingleEducation(entries: unknown): boolean {
  if (!Array.isArray(entries) || entries.length !== 1) return false
  const e = entries[0] as Record<string, unknown>
  return (
    isBlank(e?.degree) &&
    isBlank(e?.school) &&
    isBlank(e?.dates) &&
    isBlank(e?.gpa) &&
    isBlank(e?.coursework)
  )
}

function portfolioProjectsEffectivelyEmpty(projects: unknown): boolean {
  if (!Array.isArray(projects) || projects.length === 0) return true
  return projects.every((p) => {
    const o = p as Record<string, unknown>
    return isBlank(o?.name) && isBlank(o?.toolsSkills) && isBlank(o?.outcome)
  })
}

function normalizeExperiences(rows: ResumeImportPayload['experiences']) {
  const cleaned = (rows || [])
    .map((e) => ({
      role: (e.role || '').trim(),
      company: (e.company || '').trim(),
      dates: (e.dates || '').trim(),
      description: (e.description || '').trim(),
    }))
    .filter((e) => e.role || e.company || e.dates || e.description)
  return cleaned.length > 0 ? cleaned : [defaultExperience]
}

function normalizeEducation(rows: ResumeImportPayload['educationEntries']) {
  const cleaned = (rows || [])
    .map((e) => ({
      degree: (e.degree || '').trim(),
      school: (e.school || '').trim(),
      dates: (e.dates || '').trim(),
      gpa: (e.gpa || '').trim(),
      coursework: (e.coursework || '').trim(),
    }))
    .filter((e) => e.degree || e.school || e.dates || e.gpa || e.coursework)
  return cleaned.length > 0 ? cleaned : [defaultEducation]
}

function normalizeCertifications(rows: ResumeImportPayload['certifications']) {
  return (rows || [])
    .map((c) => ({
      name: (c.name || '').trim(),
      dates: (c.dates || '').trim(),
    }))
    .filter((c) => c.name || c.dates)
}

function normalizePortfolioProjects(rows: ResumeImportPayload['portfolioProjects']) {
  return (rows || [])
    .map((p) => ({
      name: (p.name || '').trim(),
      toolsSkills: (p.toolsSkills || '').trim(),
      outcome: (p.outcome || '').trim(),
    }))
    .filter((p) => p.name || p.toolsSkills || p.outcome)
}

/**
 * Merges PDF-derived resume fields into existing form state.
 * Never touches job targeting fields (job, jobTitle, tone, keywords, themes, etc.).
 */
export function mergeImportedResume(
  prev: Record<string, unknown>,
  imported: ResumeImportPayload,
  mode: ResumeMergeMode
): Record<string, unknown> {
  const imp = {
    name: (imported.name || '').trim(),
    email: (imported.email || '').trim(),
    phone: (imported.phone || '').trim(),
    location: (imported.location || '').trim(),
    summary: (imported.summary || '').trim(),
    skills: (imported.skills || '').trim(),
    portfolioLink: (imported.portfolioLink || '').trim(),
    experiences: normalizeExperiences(imported.experiences),
    educationEntries: normalizeEducation(imported.educationEntries),
    certifications: normalizeCertifications(imported.certifications),
    portfolioProjects: normalizePortfolioProjects(imported.portfolioProjects),
  }

  if (mode === 'replaceSections') {
    return {
      ...prev,
      name: imp.name,
      email: imp.email,
      phone: imp.phone,
      location: imp.location,
      summary: imp.summary,
      skills: imp.skills,
      portfolioLink: imp.portfolioLink,
      experiences: imp.experiences,
      educationEntries: imp.educationEntries,
      certifications: imp.certifications,
      portfolioProjects:
        imp.portfolioProjects.length > 0 ? imp.portfolioProjects : [],
    }
  }

  // fillEmpty
  const next: Record<string, unknown> = { ...prev }

  if (isBlank(prev.name)) next.name = imp.name
  if (isBlank(prev.email)) next.email = imp.email
  if (isBlank(prev.phone)) next.phone = imp.phone
  if (isBlank(prev.location)) next.location = imp.location
  if (isBlank(prev.summary)) next.summary = imp.summary
  if (isBlank(prev.skills)) next.skills = imp.skills
  if (isBlank(prev.portfolioLink)) next.portfolioLink = imp.portfolioLink

  const prevExp = prev.experiences
  if (isDefaultSingleExperience(prevExp)) {
    next.experiences = imp.experiences
  }

  const prevEdu = prev.educationEntries
  if (isDefaultSingleEducation(prevEdu)) {
    next.educationEntries = imp.educationEntries
  }

  const prevCerts = prev.certifications
  if (!Array.isArray(prevCerts) || prevCerts.length === 0) {
    next.certifications = imp.certifications
  }

  const prevPort = prev.portfolioProjects
  if (portfolioProjectsEffectivelyEmpty(prevPort)) {
    next.portfolioProjects =
      imp.portfolioProjects.length > 0 ? imp.portfolioProjects : []
  }

  return next
}
