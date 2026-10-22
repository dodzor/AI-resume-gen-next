/**
 * Shared fidelity rules for every resume-writing route.
 * The model may arrange confirmed facts. It may not invent them.
 */

export const FIDELITY_TEMPERATURE = 0.2

export const PRODUCT_RULE =
  'If you could not defend the sentence in an interview, it does not belong.'

export const NEVER_INVENT = `Never invent metrics, responsibilities, achievements, scope, tools, or experience. If a number or fact would strengthen a line and the user has not provided it, insert [X] and ask for the real value. Leave [X] visible until the user replaces it.`

export const OUTCOME_SHAPE = `Write each bullet in this shape only: strong action verb, then what the person did, then the measurable outcome.
Each bullet must answer: what changed because this person was there?
Do not add a metric to fill the pattern. If the outcome number is missing, write [X].
If the source line is still a responsibility ("Responsible for…", "Worked on…", "Helped with…"), say so and keep [X] where the outcome is missing.`

export const EMPLOYER_LANGUAGE = `Use the employer's words only when they truthfully name work the candidate did.
A missing keyword is a gap or a wording mismatch (for example "Sales Administration" versus "Revenue Operations"), not a reason to insert the keyword.
Do not upgrade title, team size, budget, or scope to match the seniority of the posting. Seniority and themes are signals for which confirmed facts to put first.`

export const BANNED_PHRASES = [
  'leveraged synergies',
  'dynamic self-starter',
  'results-oriented professional',
  'results-oriented',
  'spearheaded transformational',
  'results-driven',
  'self-starter',
  'proven track record',
  'team player',
  'think outside the box',
  'go-getter',
  'thought leader',
  'detail-oriented',
  'hard-working',
  'fast learner',
  'synergy',
  'value-added',
  'cutting-edge',
  'best practices',
  'robust architecture',
  'natural leader',
  'people person',
  'change agent',
  'passionate',
  'go-to-market',
]

export const EVIDENCE_RULES = `${NEVER_INVENT}

${OUTCOME_SHAPE}

${EMPLOYER_LANGUAGE}

The line should sound like something the candidate would say out loud.
Never use these stock phrases: ${BANNED_PHRASES.join(', ')}.`

export type HostileLabel = 'stop-reading' | 'generic' | 'ai-voice' | 'credibility'

export type HostileAnnotation = {
  target: string
  labels: HostileLabel[]
  note: string
}

export type HostileReview = {
  createdAt: number
  stopReading: string
  verdict: string
  annotations: HostileAnnotation[]
}

const HOSTILE_LABELS = new Set<HostileLabel>(['stop-reading', 'generic', 'ai-voice', 'credibility'])

export function parseModelJson<T>(raw: string): T {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) cleaned = match[0]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(cleaned) as T
}

export function numberKeys(text: string): Set<string> {
  const keys = new Set<string>()
  for (const match of text.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? []) {
    keys.add(match.toLowerCase())
    keys.add(match.replace(/%$/, '').replace(/,/g, '').toLowerCase())
  }
  return keys
}

export function scrubInventedNumbers(text: string, source: string): string {
  const allowed = numberKeys(source)
  return text.replace(/\d[\d,]*(?:\.\d+)?%?/g, (match) => {
    const bare = match.replace(/%$/, '').replace(/,/g, '').toLowerCase()
    if (allowed.has(match.toLowerCase()) || allowed.has(bare)) return match
    return '[X]'
  })
}

const CLAIM_WORDS = ['doubled', 'tripled', 'halved', 'million', 'billion']

export function scrubInventedClaims(text: string, source: string): string {
  let out = scrubInventedNumbers(text, source)
  const sourceLower = source.toLowerCase()
  for (const word of CLAIM_WORDS) {
    if (sourceLower.includes(word)) continue
    out = out.replace(new RegExp(`\\b${word}\\b`, 'gi'), '[X]')
  }
  return out
}

export function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase()
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase))
}

export function isDutyLine(line: string): boolean {
  const stripped = line.trim().replace(/^[-*•]\s*/, '')
  return /^(responsible for|worked on|helped with|assisted with|tasked with|in charge of|duties included|was responsible|helped to)\b/i.test(stripped)
}

export function containsPlaceholder(text: string): boolean {
  return /\[X\]/i.test(text)
}

export function resumePlainText(formData: {
  summary?: string
  skills?: string
  experiences?: Array<{ role?: string; company?: string; dates?: string; description?: string }>
  educationEntries?: Array<{ degree?: string; school?: string; dates?: string }>
}): string {
  const parts = [
    formData.summary || '',
    formData.skills || '',
    ...(formData.experiences || []).map((exp) =>
      [exp.role, exp.company, exp.dates, exp.description].filter(Boolean).join(' ')
    ),
    ...(formData.educationEntries || []).map((edu) =>
      [edu.degree, edu.school, edu.dates].filter(Boolean).join(' ')
    ),
  ]
  return parts.join('\n')
}

export function exportBlockReason(text: string): string | null {
  if (containsPlaceholder(text)) {
    return 'Replace every [X] with a fact you can defend in an interview. This resume is not ready to export.'
  }
  const banned = findBannedPhrases(text)
  if (banned.length > 0) {
    return `Remove stock phrasing before export: ${banned.slice(0, 3).join(', ')}.`
  }
  return null
}

export function normalizeHostileReview(value: unknown, createdAt = Date.now()): HostileReview {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const annotations = Array.isArray(record.annotations) ? record.annotations : []
  return {
    createdAt,
    stopReading: typeof record.stopReading === 'string' ? record.stopReading : 'Not specified.',
    verdict: typeof record.verdict === 'string' ? record.verdict : '',
    annotations: annotations
      .map((item) => {
        const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
        const labels = Array.isArray(row.labels)
          ? row.labels.filter((label): label is HostileLabel => typeof label === 'string' && HOSTILE_LABELS.has(label as HostileLabel))
          : []
        return {
          target: typeof row.target === 'string' ? row.target : '',
          labels,
          note: typeof row.note === 'string' ? row.note : '',
        }
      })
      .filter((item) => item.target || item.note),
  }
}

export function sharedPhrases(texts: string[], limit = 12): string[] {
  const docs = texts.map((text) => text.trim()).filter(Boolean)
  if (docs.length < 2) return []
  const stop = new Set([
    'a','an','and','are','as','at','be','been','but','by','for','from','has','have','in','into','is','it','of','on','or','that','the','their','this','to','with','you','your','our','will','we','they','them','who','what','when','where','how','job','role','team','work','working','experience','years','year','including','across','using','use','able','ability','strong','skills','skill','required','requirements','preferred','plus','other','such','than','then','about','over','under','within','per','via','not','all','any','can','may','should','must','new','well'
  ])
  const counts = new Map<string, number>()
  for (const doc of docs) {
    const words = doc
      .toLowerCase()
      .split(/[^a-z0-9+#.]/)
      .filter((word) => word.length > 2 && !stop.has(word))
    const phrases = new Set<string>()
    for (const word of words) phrases.add(word)
    for (let index = 0; index < words.length - 1; index += 1) {
      phrases.add(`${words[index]} ${words[index + 1]}`)
    }
    for (const phrase of phrases) counts.set(phrase, (counts.get(phrase) ?? 0) + 1)
  }
  const shared = [...counts.entries()]
    .filter(([, count]) => count === docs.length)
    .map(([phrase]) => phrase)
    .sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length)
  const kept: string[] = []
  for (const phrase of shared) {
    if (kept.some((existing) => existing.includes(phrase) && existing !== phrase)) continue
    kept.push(phrase)
    if (kept.length === limit) break
  }
  return kept
}

export function sameOrganization(left: string, right: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const a = normalize(left)
  const b = normalize(right)
  if (!a || !b) return false
  return a.includes(b) || b.includes(a)
}

export function bulletLines(description: string): string[] {
  return description
    .split('\n')
    .map((line) => line.trim().replace(/^[-*•]\s*/, ''))
    .filter(Boolean)
}

export function capToSourceBullets(bullets: string[], sourceDescription: string, sourceText: string): string[] {
  const sourceCount = bulletLines(sourceDescription).length
  if (sourceCount === 0) return []
  return bullets
    .map((bullet) => scrubInventedClaims(bullet, sourceText))
    .filter((bullet) => bullet.trim())
    .slice(0, sourceCount)
}
