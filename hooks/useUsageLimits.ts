'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { ActionType } from '@/lib/plan-limits'
import { getRemainingQuota, isUnlimited } from '@/lib/plan-limits'

/**
 * Response structure from getUserUsage query
 */
interface UserUsageResponse {
  plan: 'free' | 'pro' | 'enterprise'
  usage: {
    jobAnalyses: number
    aiRewrites: number
    exports: number
    resumes: number
  }
  limits: {
    jobAnalyses: number
    aiRewrites: number
    exports: number
    resumes: number
  }
  periodInfo: {
    start: number
    end: number
  }
}

/**
 * Response structure from canPerformAction query
 */
interface CanPerformActionResponse {
  allowed: boolean
  reason?: string
  remaining: number
  upgradeRequired?: boolean
}

/**
 * Helper function to check if an action can be performed based on usage data
 */
function checkCanPerform(
  action: ActionType,
  usage: UserUsageResponse | undefined
): boolean {
  if (!usage) return false

  const limit = getLimitForAction(usage, action)
  const currentUsage = getUsageForAction(usage, action)

  // If unlimited, always allowed
  if (isUnlimited(limit)) {
    return true
  }

  // Check if limit reached
  return currentUsage < limit
}

/**
 * Helper function to calculate remaining quota for an action
 */
function calculateRemaining(
  action: ActionType,
  usage: UserUsageResponse | undefined
): number {
  if (!usage) return 0

  const limit = getLimitForAction(usage, action)
  const currentUsage = getUsageForAction(usage, action)

  return getRemainingQuota(currentUsage, limit)
}

/**
 * Get the limit for a specific action from usage data
 */
function getLimitForAction(
  usage: UserUsageResponse,
  action: ActionType
): number {
  switch (action) {
    case 'job_analysis':
      return usage.limits.jobAnalyses
    case 'ai_rewrite':
      return usage.limits.aiRewrites
    case 'create_resume':
      return usage.limits.resumes
    case 'export':
      return usage.limits.exports
    default:
      return 0
  }
}

/**
 * Get the current usage for a specific action from usage data
 */
function getUsageForAction(
  usage: UserUsageResponse,
  action: ActionType
): number {
  switch (action) {
    case 'job_analysis':
      return usage.usage.jobAnalyses
    case 'ai_rewrite':
      return usage.usage.aiRewrites
    case 'create_resume':
      return usage.usage.resumes
    case 'export':
      return usage.usage.exports
    default:
      return 0
  }
}

/**
 * Hook to get user usage limits and check permissions
 * 
 * @returns Object containing plan info, usage data, limits, and helper functions
 */
export function useUsageLimits() {
  const usage = useQuery(api.usage.getUserUsage)

  return {
    // Plan information
    plan: usage?.plan ?? 'free',
    isPro: usage?.plan === 'pro',
    isFree: usage?.plan === 'free',
    isEnterprise: usage?.plan === 'enterprise',

    // Usage data
    usage: usage?.usage ?? {
      jobAnalyses: 0,
      aiRewrites: 0,
      exports: 0,
      resumes: 0,
    },

    // Limits
    limits: usage?.limits ?? {
      jobAnalyses: 3,
      aiRewrites: 3,
      exports: 0,
      resumes: 1,
    },

    // Period information
    periodInfo: usage?.periodInfo ?? {
      start: Date.now(),
      end: Date.now(),
    },

    // Permission checks
    canRewrite: checkCanPerform('ai_rewrite', usage),
    canAnalyze: checkCanPerform('job_analysis', usage),
    canCreateResume: checkCanPerform('create_resume', usage),
    canExport: checkCanPerform('export', usage),

    // Remaining quotas
    remaining: {
      jobAnalyses: calculateRemaining('job_analysis', usage),
      aiRewrites: calculateRemaining('ai_rewrite', usage),
      resumes: calculateRemaining('create_resume', usage),
      exports: calculateRemaining('export', usage),
    },

    // Loading state
    isLoading: usage === undefined,

    // Raw usage data (for advanced use cases)
    rawUsage: usage,
  }
}

/**
 * Hook to check if a specific action can be performed
 * Uses the canPerformAction query for real-time checks
 * 
 * @param action - The action type to check
 * @returns Object with allowed status, reason, remaining quota, and upgrade requirement
 */
export function useCanPerformAction(action: ActionType) {
  const result = useQuery(api.usage.canPerformAction, { action })

  return {
    allowed: result?.allowed ?? false,
    reason: result?.reason,
    remaining: result?.remaining ?? 0,
    upgradeRequired: result?.upgradeRequired ?? false,
    isLoading: result === undefined,
  }
}
