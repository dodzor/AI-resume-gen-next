'use client'

import { useUsageLimits } from '@/hooks/useUsageLimits'
import { OFFER, isUnlimited, planDisplayName } from '@/lib/plan-limits'
import Link from 'next/link'

interface UsageDisplayProps {
  className?: string
  showUpgradeButton?: boolean
  compact?: boolean
}

/**
 * Component to display current plan and application allowance.
 */
export default function UsageDisplay({
  className = '',
  showUpgradeButton = true,
  compact = false,
}: UsageDisplayProps) {
  const {
    plan,
    isFree,
    usage,
    limits,
    remaining,
    periodInfo,
    isLoading,
  } = useUsageLimits()

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <p className="text-gray-500 text-sm">Loading usage...</p>
      </div>
    )
  }

  const getUsagePercentage = (used: number, limit: number): number => {
    if (isUnlimited(limit)) return 0
    if (limit === 0) return 0
    return Math.min(100, (used / limit) * 100)
  }

  const getProgressColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-green-500'
    if (percentage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getPlanBadgeColor = (): string => {
    switch (plan) {
      case 'search':
        return 'bg-blue-100 text-blue-800'
      case 'pro':
        return 'bg-sky-100 text-sky-800'
      case 'enterprise':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const periodEnd = new Date(periodInfo.end).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  const footer = isFree
    ? 'One tailored resume, with PDF. The scanner stays free without an account.'
    : plan === 'search'
      ? `8 applications until ${periodEnd}. This pass does not renew.`
      : plan === 'pro'
        ? '8 applications each billing period. Cancel any time.'
        : 'Enterprise access.'

  const applications = (
    <UsageItem
      label="Applications"
      used={usage.resumes}
      limit={limits.resumes}
      remaining={remaining.resumes}
      getUsagePercentage={getUsagePercentage}
      getProgressColor={getProgressColor}
    />
  )

  if (compact) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanBadgeColor()}`}>
            {planDisplayName(plan)}
          </span>
          {isFree && showUpgradeButton && (
            <Link
              href="/pricing"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {OFFER.searchPrice} for this search
            </Link>
          )}
        </div>
        {applications}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Usage & Limits</h3>
          <p className="text-sm text-gray-500 mt-1">
            Current plan:{' '}
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanBadgeColor()}`}>
              {planDisplayName(plan)}
            </span>
          </p>
        </div>
        {isFree && showUpgradeButton && (
          <Link
            href="/pricing"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            This search · {OFFER.searchPrice}
          </Link>
        )}
      </div>

      <div className="space-y-5">{applications}</div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500">{footer}</p>
      </div>
    </div>
  )
}

interface UsageItemProps {
  label: string
  used: number
  limit: number
  remaining: number
  getUsagePercentage: (used: number, limit: number) => number
  getProgressColor: (percentage: number) => string
}

function UsageItem({
  label,
  used,
  limit,
  remaining,
  getUsagePercentage,
  getProgressColor,
}: UsageItemProps) {
  const percentage = getUsagePercentage(used, limit)
  const isUnlimitedLimit = isUnlimited(limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">
          {isUnlimitedLimit ? (
            <span className="text-green-600 font-medium">Unlimited</span>
          ) : (
            <>
              {used} / {limit}
              {remaining > 0 && (
                <span className="text-gray-500 ml-1">({remaining} left)</span>
              )}
            </>
          )}
        </span>
      </div>
      {!isUnlimitedLimit && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getProgressColor(percentage)}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  )
}
