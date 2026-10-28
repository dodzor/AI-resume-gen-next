import { OFFER } from './plan-limits'

/** Trim and collapse whitespace so line breaks are not a new job. */
export function normalizeJobText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * True when a free PDF was already issued for a different target job.
 * `exportedJob === undefined` means this application has not been downloaded yet.
 */
export function freePdfJobChanged(
  exportedJob: string | null | undefined,
  currentJob: string | null | undefined,
): boolean {
  if (exportedJob === undefined || exportedJob === null) return false
  return normalizeJobText(exportedJob) !== normalizeJobText(currentJob)
}

export function freePdfJobMessage(): string {
  return `This application was already downloaded for a different job. The free plan includes one tailored resume. This search is ${OFFER.searchPrice} for ${OFFER.paidApplications} applications over ${OFFER.searchDays} days.`
}
