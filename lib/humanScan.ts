import { findBannedPhrases, isDutyLine } from './evidenceRules'

export type HumanScanVerdict = {
  claim: string
  stopReading: string
  dutyLines: string[]
  generatedPhrases: string[]
}

function linesOf(resumeText: string): string[] {
  return resumeText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function reviewHumanScan(resumeText: string): HumanScanVerdict {
  const lines = linesOf(resumeText)
  const dutyLines = lines.filter(isDutyLine).slice(0, 6)
  const generatedPhrases = findBannedPhrases(resumeText)
  const opening = lines.slice(0, 4).join(' ').replace(/\s+/g, ' ').trim()
  const claim = opening
    ? `In a quick scan this resume currently claims: ${opening.slice(0, 280)}`
    : 'The resume does not yet state what this person has already done.'

  let stopReading = 'Nothing in the opening lines is an obvious duty or stock phrase. A recruiter still only reads the current role, dates, one or two proof bullets, and skills.'
  if (dutyLines[0]) {
    stopReading = `A recruiter would stop at this duty: "${dutyLines[0].slice(0, 160)}"`
  } else if (generatedPhrases[0]) {
    stopReading = `A recruiter would stop at the stock phrase "${generatedPhrases[0]}".`
  }

  return { claim, stopReading, dutyLines, generatedPhrases }
}
