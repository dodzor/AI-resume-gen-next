/**
 * Plan limits.
 *
 * Free is one tailored resume, with PDF. The public scanner does not use these limits.
 * Search is a 30-day pass for 8 applications. Pro is the same access, billed monthly.
 * Enterprise stays in the data model and is not shown on the pricing page.
 *
 * Analyses and rewrites are abuse ceilings from config/features.ts. They reset
 * with the billing period and are not part of the offer on the pricing page.
 */

import { features } from '../config/features';

/** Length of the one-time search pass. */
export const SEARCH_PERIOD_MS = 30 * 24 * 60 * 60 * 1000

export const OFFER = {
  freeApplications: 1,
  paidApplications: 8,
  searchDays: 30,
  searchPrice: '$19',
  monthlyPrice: '$12',
} as const

/**
 * Subscription plan tiers
 */
export type PlanTier = 'free' | 'search' | 'pro' | 'enterprise';

export function planDisplayName(plan: PlanTier): string {
  switch (plan) {
    case 'search':
      return 'This search'
    case 'pro':
      return 'Still looking'
    case 'enterprise':
      return 'Enterprise'
    default:
      return 'Free'
  }
}

/**
 * Action types that can be limited
 */
export type ActionType = 
  | 'job_analysis'      // Analyze job description
  | 'ai_rewrite'        // AI-powered rewrites (bullet, experience, summary combined)
  | 'create_resume'     // Create new resume (lifetime limit, not monthly)
  | 'export';           // Export resume as PDF

/**
 * Plan limits configuration
 * 
 * For unlimited features, use -1
 * For monthly limits, the value represents the maximum per billing period
 * For lifetime limits (like resume count), the value represents the maximum total
 */
export interface PlanLimits {
  plan: PlanTier;
  
  // Monthly limits (reset each billing period). -1 is unlimited.
  monthly: {
    jobAnalyses: number;
    aiRewrites: number;
    exports: number;
  };

  /**
   * Tailored applications.
   * Free is a lifetime cap. Search and Pro reset each period.
   */
  applications: {
    limit: number;
    resetsEachPeriod: boolean;
  };
  
  // Feature flags
  features: {
    pdfExport: boolean;       // Can export as PDF
    advancedAnalytics: boolean; // Job fit score, advanced suggestions
    versionHistory: boolean;   // Resume version history
    multipleResumes: boolean;  // Can create multiple resumes
  };
}

/**
 * Plan limits configuration for each tier
 */
const paidAccess = {
  monthly: {
    jobAnalyses: features.analyses.paid,
    aiRewrites: features.rewrites.paid,
    exports: -1,
  },
  applications: {
    limit: OFFER.paidApplications,
    resetsEachPeriod: true,
  },
  features: {
    pdfExport: true,
    advancedAnalytics: false,
    versionHistory: true,
    multipleResumes: true,
  },
} as const

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    plan: 'free',
    monthly: {
      jobAnalyses: features.analyses.free,
      aiRewrites: features.rewrites.free,
      exports: -1,
    },
    applications: {
      limit: OFFER.freeApplications,
      resetsEachPeriod: false,
    },
    features: {
      pdfExport: true,
      advancedAnalytics: false,
      versionHistory: false,
      multipleResumes: false,
    },
  },

  search: {
    plan: 'search',
    ...paidAccess,
  },

  pro: {
    plan: 'pro',
    ...paidAccess,
  },

  enterprise: {
    plan: 'enterprise',
    monthly: {
      jobAnalyses: -1,
      aiRewrites: -1,
      exports: -1,
    },
    applications: {
      limit: -1,
      resetsEachPeriod: true,
    },
    features: {
      pdfExport: true,
      advancedAnalytics: true,
      versionHistory: true,
      multipleResumes: true,
    },
  },
};

/**
 * Get plan limits for a specific tier
 * 
 * @param tier - The plan tier
 * @returns Plan limits configuration
 */
export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier];
}

/**
 * Check if an action is allowed for a plan tier
 * 
 * @param tier - The plan tier
 * @param action - The action type to check
 * @returns true if the action is allowed (unlimited or has limit), false otherwise
 */
export function isActionAllowed(tier: PlanTier, action: ActionType): boolean {
  const limits = getPlanLimits(tier);
  
  switch (action) {
    case 'job_analysis':
      // Always allowed (even if limit is 0, the check happens at usage level)
      return true;
    
    case 'ai_rewrite':
      // Always allowed (limit checked at usage level)
      return true;
    
    case 'create_resume':
      // Always allowed (limit checked at usage level)
      return true;
    
    case 'export':
      // Check feature flag for PDF export
      return limits.features.pdfExport;
    
    default:
      return false;
  }
}

/**
 * Check if a limit is unlimited
 * 
 * @param limit - The limit value (-1 means unlimited)
 * @returns true if unlimited, false otherwise
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Get the limit for a specific action type
 * 
 * @param tier - The plan tier
 * @param action - The action type
 * @returns The limit value (-1 for unlimited, or the numeric limit)
 */
export function getActionLimit(tier: PlanTier, action: ActionType): number {
  const limits = getPlanLimits(tier);
  
  switch (action) {
    case 'job_analysis':
      return limits.monthly.jobAnalyses;
    
    case 'ai_rewrite':
      return limits.monthly.aiRewrites;
    
    case 'create_resume':
      return limits.applications.limit;
    
    case 'export':
      return limits.monthly.exports;
    
    default:
      return 0;
  }
}

/**
 * Check if a feature is available for a plan tier
 * 
 * @param tier - The plan tier
 * @param feature - The feature name
 * @returns true if the feature is available
 */
export function hasFeature(
  tier: PlanTier,
  feature: keyof PlanLimits['features']
): boolean {
  const limits = getPlanLimits(tier);
  return limits.features[feature];
}

/**
 * Get display-friendly limit text
 * 
 * @param limit - The limit value
 * @returns Human-readable limit text (e.g., "3", "Unlimited", "10")
 */
export function getLimitDisplayText(limit: number): string {
  if (isUnlimited(limit)) {
    return 'Unlimited';
  }
  return limit.toString();
}

/**
 * Check if usage count has reached the limit
 * 
 * @param usage - Current usage count
 * @param limit - The limit value (-1 for unlimited)
 * @returns true if limit is reached or exceeded
 */
export function isLimitReached(usage: number, limit: number): boolean {
  if (isUnlimited(limit)) {
    return false; // Never reached if unlimited
  }
  return usage >= limit;
}

/**
 * Calculate remaining quota
 * 
 * @param usage - Current usage count
 * @param limit - The limit value (-1 for unlimited)
 * @returns Remaining quota (-1 for unlimited, or the numeric remaining)
 */
export function getRemainingQuota(usage: number, limit: number): number {
  if (isUnlimited(limit)) {
    return -1; // Unlimited
  }
  return Math.max(0, limit - usage);
}

export function limitReachedMessage(plan: PlanTier, action: ActionType, limit: number): string {
  if (action === 'create_resume' && plan === 'free') {
    return `The free plan includes one tailored resume. This search is ${OFFER.searchPrice} for ${OFFER.paidApplications} applications over ${OFFER.searchDays} days.`
  }
  if (action === 'create_resume') {
    return `You've used all ${limit} applications for this period.`
  }
  if (action === 'ai_rewrite') {
    return 'You have used the rewrites included in this period. They reset at the start of the next one.'
  }
  if (action === 'job_analysis') {
    return 'You have used the job analyses included in this period. They reset at the start of the next one.'
  }
  return `You've reached the limit for this period (${limit}).`
}
