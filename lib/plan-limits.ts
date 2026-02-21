/**
 * Plan Limits Configuration
 * 
 * This file defines the subscription tier limits and provides helper functions
 * to check if actions are allowed based on plan tier.
 * 
 * Based on TIER_PLAN_DESIGN.md:
 * - Free: Limited usage to let users experience the product
 * - Pro: Unlimited usage for power users
 * - Enterprise: Future tier with advanced features
 */

/**
 * Subscription plan tiers
 */
export type PlanTier = 'free' | 'pro' | 'enterprise';

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
  
  // Monthly limits (reset each billing period)
  monthly: {
    jobAnalyses: number;      // -1 for unlimited
    aiRewrites: number;       // -1 for unlimited (includes bullet, experience, summary)
    exports: number;          // -1 for unlimited
  };
  
  // Lifetime limits (never reset)
  lifetime: {
    resumes: number;          // -1 for unlimited
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
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    plan: 'free',
    monthly: {
      jobAnalyses: 3,         // 3 job description analyses per month
      aiRewrites: 3,          // 3 AI rewrites total (bullet + experience + summary combined)
      exports: 0,             // No PDF exports (basic text export only)
    },
    lifetime: {
      resumes: 1,             // 1 resume total
    },
    features: {
      pdfExport: false,       // No PDF export
      advancedAnalytics: false,
      versionHistory: false,
      multipleResumes: false,
    },
  },
  
  pro: {
    plan: 'pro',
    monthly: {
      jobAnalyses: -1,         // Unlimited job analyses
      aiRewrites: -1,        // Unlimited AI rewrites
      exports: -1,           // Unlimited PDF exports
    },
    lifetime: {
      resumes: 10,           // 10 resumes total
    },
    features: {
      pdfExport: true,       // PDF export available
      advancedAnalytics: false, // Not yet implemented
      versionHistory: true,  // Resume version history
      multipleResumes: true,  // Can create multiple resumes
    },
  },
  
  enterprise: {
    plan: 'enterprise',
    monthly: {
      jobAnalyses: -1,       // Unlimited
      aiRewrites: -1,       // Unlimited
      exports: -1,           // Unlimited
    },
    lifetime: {
      resumes: -1,           // Unlimited resumes
    },
    features: {
      pdfExport: true,
      advancedAnalytics: true, // Job fit score, advanced suggestions
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
      return limits.lifetime.resumes;
    
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
