/**
 * When the model fills experience bullets but drops job headings, recover
 * role / company / dates from common "Title at Company (dates)" lines in the raw text.
 */

export type ExperienceImportRow = {
  role: string
  company: string
  dates: string
  description: string
}

function extractExperienceHeadersFromPlainText(sourceText: string): Array<{
  role: string
  company: string
  dates: string
}> {
  const lines = sourceText.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const headers: Array<{ role: string; company: string; dates: string }> = []
  let inWork = false

  for (const line of lines) {
    if (/^work\s+experience$/i.test(line) || /^professional\s+experience$/i.test(line)) {
      inWork = true
      continue
    }
    if (
      inWork &&
      /^(education|skills|certifications?|portfolio|projects?|summary|publications|awards)\b/i.test(line)
    ) {
      break
    }
    if (!inWork) continue
    if (/^[•\-\*·]/.test(line)) continue

    const m = line.match(/^(.+?)\s+at\s+(.+?)\s*\(([^)]+)\)\s*$/i)
    if (m) {
      headers.push({
        role: m[1].trim(),
        company: m[2].trim(),
        dates: m[3].trim(),
      })
    }
  }

  return headers
}

export function enrichExperiencesFromSourceText(
  experiences: ExperienceImportRow[],
  sourceText: string
): ExperienceImportRow[] {
  const headers = extractExperienceHeadersFromPlainText(sourceText)
  if (headers.length === 0) return experiences

  return experiences.map((exp, i) => {
    const hasHeading = !!(
      exp.role?.trim() ||
      exp.company?.trim() ||
      exp.dates?.trim()
    )
    if (hasHeading) return exp
    const h = headers[i]
    if (!h) return exp
    return {
      ...exp,
      role: h.role,
      company: h.company,
      dates: h.dates,
    }
  })
}
