import { z } from 'zod'

const str = z.preprocess(
  (val) => (val === null || val === undefined ? '' : String(val)),
  z.string()
)

const experienceSchema = z.object({
  role: str,
  company: str,
  dates: str,
  description: str,
})

const educationSchema = z.object({
  degree: str,
  school: str,
  dates: str,
  gpa: str,
  coursework: str,
})

const certificationSchema = z.object({
  name: str,
  dates: str,
})

const portfolioProjectSchema = z.object({
  name: str,
  toolsSkills: str,
  outcome: str,
})

/**
 * Models often return certifications as string[] or a single string instead of { name, dates }[].
 */
function normalizeCertificationsInput(val: unknown): unknown[] {
  if (val == null) return []
  if (typeof val === 'string') {
    return val
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => ({ name: line, dates: '' }))
  }
  if (!Array.isArray(val)) return []
  return val.map((item) => {
    if (typeof item === 'string') {
      const t = item.trim()
      return { name: t, dates: '' }
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const o = item as Record<string, unknown>
      return {
        name: o.name,
        dates: o.dates ?? o.date ?? '',
      }
    }
    return { name: '', dates: '' }
  })
}

/**
 * Models often return portfolio as string[] or a single blurb instead of full objects.
 */
function normalizePortfolioProjectsInput(val: unknown): unknown[] {
  if (val == null) return []
  if (typeof val === 'string') {
    return val
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => ({ name: line, toolsSkills: '', outcome: '' }))
  }
  if (!Array.isArray(val)) return []
  return val.map((item) => {
    if (typeof item === 'string') {
      const t = item.trim()
      return { name: t, toolsSkills: '', outcome: '' }
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const o = item as Record<string, unknown>
      return {
        name: o.name,
        toolsSkills: o.toolsSkills ?? o.tools ?? o.tech ?? '',
        outcome: o.outcome ?? o.description ?? o.summary ?? '',
      }
    }
    return { name: '', toolsSkills: '', outcome: '' }
  })
}

/** LLM output shape; validated server-side after extraction. */
export const resumeImportSchema = z.object({
  name: str.default(''),
  email: str.default(''),
  phone: str.default(''),
  location: str.default(''),
  summary: str.default(''),
  skills: str.default(''),
  portfolioLink: str.default(''),
  experiences: z.preprocess(
    (val) => (Array.isArray(val) ? val : []),
    z.array(experienceSchema)
  ).default([]),
  educationEntries: z.preprocess(
    (val) => (Array.isArray(val) ? val : []),
    z.array(educationSchema)
  ).default([]),
  certifications: z.preprocess(
    (val) => normalizeCertificationsInput(val),
    z.array(certificationSchema)
  ).default([]),
  portfolioProjects: z.preprocess(
    (val) => normalizePortfolioProjectsInput(val),
    z.array(portfolioProjectSchema)
  ).default([]),
})

export type ResumeImportPayload = z.infer<typeof resumeImportSchema>
