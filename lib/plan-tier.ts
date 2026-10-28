import type { PlanTier } from '@/lib/plan-limits'

/**
 * Map a Clerk plan slug or display name onto a stored tier.
 * Clerk often sends "Pro" or "user:pro"; exact equality with "pro" misses those.
 */
export function planTierFromLabel(value: unknown): PlanTier | null {
  if (typeof value !== 'string') return null
  const label = value.trim().toLowerCase().replace(/^(user|org):/, '')
  if (/(^|[^a-z])enterprise([^a-z]|$)/.test(label)) return 'enterprise'
  if (label.includes('search')) return 'search'
  if (
    /(^|[^a-z])pro([^a-z]|$)/.test(label) ||
    label.includes('still-looking') ||
    label.includes('still_looking') ||
    label === 'monthly'
  ) {
    return 'pro'
  }
  if (label === 'free' || label.startsWith('free_') || label.startsWith('free-')) return 'free'
  return null
}
