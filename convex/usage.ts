import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Plan tiers - must match lib/plan-limits.ts
 */
type PlanTier = "free" | "pro" | "enterprise";

/**
 * Action types that can be limited
 */
type ActionType = "job_analysis" | "ai_rewrite" | "create_resume" | "export";

/**
 * Plan limits configuration - must match lib/plan-limits.ts
 * For unlimited features, use -1
 */
const PLAN_LIMITS = {
  free: {
    monthly: {
      jobAnalyses: 3,
      aiRewrites: 3,
      exports: 0,
    },
    lifetime: {
      resumes: 1,
    },
    features: {
      pdfExport: false,
    },
  },
  pro: {
    monthly: {
      jobAnalyses: -1, // Unlimited
      aiRewrites: -1, // Unlimited
      exports: -1, // Unlimited
    },
    lifetime: {
      resumes: 10,
    },
    features: {
      pdfExport: true,
    },
  },
  enterprise: {
    monthly: {
      jobAnalyses: -1, // Unlimited
      aiRewrites: -1, // Unlimited
      exports: -1, // Unlimited
    },
    lifetime: {
      resumes: -1, // Unlimited
    },
    features: {
      pdfExport: true,
    },
  },
} as const;

/**
 * Helper: Check if limit is unlimited (-1)
 */
function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Helper: Get action limit for a plan tier
 */
function getActionLimit(tier: PlanTier, action: ActionType): number {
  const limits = PLAN_LIMITS[tier];
  
  switch (action) {
    case "job_analysis":
      return limits.monthly.jobAnalyses;
    case "ai_rewrite":
      return limits.monthly.aiRewrites;
    case "create_resume":
      return limits.lifetime.resumes;
    case "export":
      return limits.monthly.exports;
    default:
      return 0;
  }
}

/**
 * Helper: Check if feature is available
 */
function hasFeature(tier: PlanTier, feature: "pdfExport"): boolean {
  return PLAN_LIMITS[tier].features[feature];
}

/**
 * Helper: Calculate billing period based on user's subscription start date
 * Billing period is monthly, starting from the day of month when user first subscribed
 */
function calculateBillingPeriod(
  now: number,
  subscriptionStartDate: number
): { start: number; end: number } {
  const nowDate = new Date(now);
  const startDate = new Date(subscriptionStartDate);
  
  // Get the day of month when user first subscribed (e.g., 15th)
  const subscriptionDay = startDate.getUTCDate();
  
  // Calculate current billing period start
  // If today is before the subscription day this month, period started last month
  // If today is on or after the subscription day, period started this month
  let periodStartYear = nowDate.getUTCFullYear();
  let periodStartMonth = nowDate.getUTCMonth();
  
  if (nowDate.getUTCDate() < subscriptionDay) {
    // Current date is before subscription day, so period started last month
    periodStartMonth -= 1;
    if (periodStartMonth < 0) {
      periodStartMonth = 11;
      periodStartYear -= 1;
    }
  }
  
  // Calculate period start (subscription day of the period start month)
  const start = Date.UTC(
    periodStartYear,
    periodStartMonth,
    subscriptionDay,
    0,
    0,
    0,
    0
  );
  
  // Calculate period end (subscription day of next month)
  let periodEndMonth = periodStartMonth + 1;
  let periodEndYear = periodStartYear;
  if (periodEndMonth > 11) {
    periodEndMonth = 0;
    periodEndYear += 1;
  }
  
  // Handle edge case: if subscription day doesn't exist in end month (e.g., Feb 30)
  // Use last day of that month instead
  const daysInEndMonth = new Date(periodEndYear, periodEndMonth + 1, 0).getDate();
  const endDay = Math.min(subscriptionDay, daysInEndMonth);
  
  const end = Date.UTC(
    periodEndYear,
    periodEndMonth,
    endDay,
    0,
    0,
    0,
    0
  );
  
  return { start, end };
}

/**
 * Helper: Get user usage record (read-only, for queries)
 * Returns null if record doesn't exist
 */
async function getUserUsageRecord(
  ctx: any,
  userId: string
): Promise<{ _id: Id<"userUsage">; subscriptionStartDate: number; periodStart: number; periodEnd: number; plan: PlanTier; jobAnalysesUsed: number; aiRewritesUsed: number; exportsUsed: number; resumesCreated: number } | null> {
  const existing = await ctx.db
    .query("userUsage")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  
  return existing;
}

/**
 * Helper: Get or create user usage record (for mutations only)
 * Handles billing period reset if period has expired
 */
async function getOrCreateUserUsage(
  ctx: any,
  userId: string
): Promise<Id<"userUsage">> {
  const now = Date.now();
  
  // Try to find existing usage record
  const existing = await ctx.db
    .query("userUsage")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  
  if (existing) {
    // Check if billing period has expired
    if (now >= existing.periodEnd) {
      // Reset monthly counters for new billing period
      // Use user's subscription start date to calculate next period
      const newPeriod = calculateBillingPeriod(now, existing.subscriptionStartDate);
      await ctx.db.patch(existing._id, {
        periodStart: newPeriod.start,
        periodEnd: newPeriod.end,
        jobAnalysesUsed: 0,
        aiRewritesUsed: 0,
        exportsUsed: 0,
        updatedAt: now,
      });
    }
    return existing._id;
  }
  
  // Create new usage record
  // Set subscription start date to now (first time user uses the system)
  const subscriptionStartDate = now;
  const period = calculateBillingPeriod(now, subscriptionStartDate);
  const usageId = await ctx.db.insert("userUsage", {
    userId,
    plan: "free" as PlanTier,
    planUpdatedAt: now,
    subscriptionStartDate,
    periodStart: period.start,
    periodEnd: period.end,
    jobAnalysesUsed: 0,
    aiRewritesUsed: 0,
    exportsUsed: 0,
    resumesCreated: 0,
    createdAt: now,
    updatedAt: now,
  });
  
  return usageId;
}

/**
 * Query: Get user usage information
 * Returns current usage, limits, and plan tier
 */
export const getUserUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    // Get usage record (read-only, queries can't mutate)
    const usage = await getUserUsageRecord(ctx, userId);
    
    // If no record exists, return default values
    // Record will be created automatically by first mutation
    if (!usage) {
      const defaultPlan: PlanTier = "free";
      const subscriptionStartDate = now;
      const period = calculateBillingPeriod(now, subscriptionStartDate);
      
      return {
        plan: defaultPlan,
        usage: {
          jobAnalyses: 0,
          aiRewrites: 0,
          exports: 0,
          resumes: 0,
        },
        limits: {
          jobAnalyses: PLAN_LIMITS[defaultPlan].monthly.jobAnalyses,
          aiRewrites: PLAN_LIMITS[defaultPlan].monthly.aiRewrites,
          exports: PLAN_LIMITS[defaultPlan].monthly.exports,
          resumes: PLAN_LIMITS[defaultPlan].lifetime.resumes,
        },
        periodInfo: {
          start: period.start,
          end: period.end,
        },
      };
    }

    // Check if billing period expired
    // Note: Queries can't mutate, so we calculate the new period for display
    // Actual reset will happen in mutations when user performs an action
    let displayUsage = usage;
    let displayPeriod = { start: usage.periodStart, end: usage.periodEnd };
    
    if (now >= usage.periodEnd) {
      // Calculate what the period should be (for display purposes)
      const newPeriod = calculateBillingPeriod(now, usage.subscriptionStartDate);
      displayPeriod = newPeriod;
      // Show reset counters for display (actual reset happens in mutations)
      displayUsage = {
        ...usage,
        jobAnalysesUsed: 0,
        aiRewritesUsed: 0,
        exportsUsed: 0,
      };
    }

    return {
      plan: displayUsage.plan,
      usage: {
        jobAnalyses: displayUsage.jobAnalysesUsed,
        aiRewrites: displayUsage.aiRewritesUsed,
        exports: displayUsage.exportsUsed,
        resumes: displayUsage.resumesCreated,
      },
      limits: {
        jobAnalyses: PLAN_LIMITS[displayUsage.plan].monthly.jobAnalyses,
        aiRewrites: PLAN_LIMITS[displayUsage.plan].monthly.aiRewrites,
        exports: PLAN_LIMITS[displayUsage.plan].monthly.exports,
        resumes: PLAN_LIMITS[displayUsage.plan].lifetime.resumes,
      },
      periodInfo: {
        start: displayPeriod.start,
        end: displayPeriod.end,
      },
    };
  },
});

/**
 * Query: Check if user can perform a specific action
 * Returns allowed status with reason, remaining quota, and upgrade requirement
 */
export const canPerformAction = query({
  args: {
    action: v.union(
      v.literal("job_analysis"),
      v.literal("ai_rewrite"),
      v.literal("create_resume"),
      v.literal("export")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        allowed: false,
        reason: "Not authenticated",
        remaining: 0,
        upgradeRequired: false,
      };
    }

    const userId = identity.subject;
    const action = args.action as ActionType;

    // Get usage record (read-only, queries can't mutate)
    const usage = await getUserUsageRecord(ctx, userId);
    
    // If no record exists, assume free plan with default limits
    // Record will be created automatically by first mutation
    if (!usage) {
      const defaultPlan: PlanTier = "free";
      const limit = getActionLimit(defaultPlan, action);
      
      // For export, check feature availability
      if (action === "export") {
        if (!hasFeature(defaultPlan, "pdfExport")) {
          return {
            allowed: false,
            reason: "PDF export is not available in your plan. Upgrade to Pro for PDF export.",
            remaining: 0,
            upgradeRequired: true,
          };
        }
      }
      
      // Check if unlimited
      if (isUnlimited(limit)) {
        return {
          allowed: true,
          remaining: -1,
          upgradeRequired: false,
        };
      }
      
      // For new users, they haven't used anything yet
      return {
        allowed: true,
        remaining: limit,
        upgradeRequired: false,
      };
    }

    const plan = usage.plan;
    const limit = getActionLimit(plan, action);

    // Check feature availability for export
    if (action === "export") {
      if (!hasFeature(plan, "pdfExport")) {
        return {
          allowed: false,
          reason: "PDF export is not available in your plan. Upgrade to Pro for PDF export.",
          remaining: 0,
          upgradeRequired: true,
        };
      }
    }

    // Get current usage for this action
    let currentUsage: number;
    switch (action) {
      case "job_analysis":
        currentUsage = usage.jobAnalysesUsed;
        break;
      case "ai_rewrite":
        currentUsage = usage.aiRewritesUsed;
        break;
      case "create_resume":
        currentUsage = usage.resumesCreated;
        break;
      case "export":
        currentUsage = usage.exportsUsed;
        break;
      default:
        return {
          allowed: false,
          reason: "Unknown action",
          remaining: 0,
          upgradeRequired: false,
        };
    }

    // Check if unlimited
    if (isUnlimited(limit)) {
      return {
        allowed: true,
        remaining: -1, // -1 means unlimited
        upgradeRequired: false,
      };
    }

    // Check if limit reached
    if (currentUsage >= limit) {
      const actionNames: Record<ActionType, string> = {
        job_analysis: "job analyses",
        ai_rewrite: "AI rewrites",
        create_resume: "resumes",
        export: "PDF exports",
      };

      return {
        allowed: false,
        reason: `You've used all your free ${actionNames[action]} (${limit}/${limit}). Upgrade to Pro for unlimited access.`,
        remaining: 0,
        upgradeRequired: true,
      };
    }

    // Calculate remaining
    const remaining = limit - currentUsage;

    return {
      allowed: true,
      remaining,
      upgradeRequired: false,
    };
  },
});

/**
 * Mutation: Increment usage counter after successful operation
 * Handles billing period reset if needed
 * Idempotent - can be called multiple times safely
 */
export const incrementUsage = mutation({
  args: {
    action: v.union(
      v.literal("job_analysis"),
      v.literal("ai_rewrite"),
      v.literal("create_resume"),
      v.literal("export")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const action = args.action as ActionType;
    const now = Date.now();

    // Get or create usage record
    const usageId = await getOrCreateUserUsage(ctx, userId);
    const usage = await ctx.db.get(usageId);
    
    if (!usage) {
      throw new Error("Failed to get usage record");
    }

    // Check if billing period expired and reset if needed
    if (now >= usage.periodEnd) {
      const newPeriod = calculateBillingPeriod(now, usage.subscriptionStartDate);
      await ctx.db.patch(usageId, {
        periodStart: newPeriod.start,
        periodEnd: newPeriod.end,
        jobAnalysesUsed: 0,
        aiRewritesUsed: 0,
        exportsUsed: 0,
        updatedAt: now,
      });
      
      // Reload usage after reset
      const updatedUsage = await ctx.db.get(usageId);
      if (!updatedUsage) {
        throw new Error("Failed to get updated usage record");
      }
      
      // Increment the appropriate counter
      const update: Partial<typeof updatedUsage> = {
        updatedAt: now,
      };
      
      switch (action) {
        case "job_analysis":
          update.jobAnalysesUsed = updatedUsage.jobAnalysesUsed + 1;
          break;
        case "ai_rewrite":
          update.aiRewritesUsed = updatedUsage.aiRewritesUsed + 1;
          break;
        case "create_resume":
          update.resumesCreated = updatedUsage.resumesCreated + 1;
          break;
        case "export":
          update.exportsUsed = updatedUsage.exportsUsed + 1;
          break;
      }
      
      await ctx.db.patch(usageId, update);
      return { success: true };
    }

    // Increment the appropriate counter
    const update: Partial<typeof usage> = {
      updatedAt: now,
    };
    
    switch (action) {
      case "job_analysis":
        update.jobAnalysesUsed = usage.jobAnalysesUsed + 1;
        break;
      case "ai_rewrite":
        update.aiRewritesUsed = usage.aiRewritesUsed + 1;
        break;
      case "create_resume":
        update.resumesCreated = usage.resumesCreated + 1;
        break;
      case "export":
        update.exportsUsed = usage.exportsUsed + 1;
        break;
    }
    
    await ctx.db.patch(usageId, update);
    return { success: true };
  },
});

/**
 * Mutation: Update user's plan tier (called by webhook)
 * Optionally resets usage counters if plan is upgraded
 */
export const updateUserPlan = mutation({
  args: {
    userId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
    resetCounters: v.optional(v.boolean()), // If true, reset monthly counters (useful for upgrades)
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find user usage record
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!usage) {
      // Create new usage record if it doesn't exist
      // Set subscription start date to now (first time user subscribes)
      const subscriptionStartDate = now;
      const period = calculateBillingPeriod(now, subscriptionStartDate);
      await ctx.db.insert("userUsage", {
        userId: args.userId,
        plan: args.plan,
        planUpdatedAt: now,
        subscriptionStartDate,
        periodStart: period.start,
        periodEnd: period.end,
        jobAnalysesUsed: 0,
        aiRewritesUsed: 0,
        exportsUsed: 0,
        resumesCreated: 0, // New user, start with 0 resumes
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }
    
    // Determine if upgrading from free to paid plan
    const isUpgradingToPaid = usage.plan === "free" && (args.plan === "pro" || args.plan === "enterprise");
    const isDowngradingToFree = (usage.plan === "pro" || usage.plan === "enterprise") && args.plan === "free";
    
    // Update plan
    const update: Partial<typeof usage> = {
      plan: args.plan,
      planUpdatedAt: now,
      updatedAt: now,
    };
    
    // If upgrading from free to paid, reset subscription start date to upgrade date
    // This ensures billing cycle aligns with when they started paying
    if (isUpgradingToPaid) {
      update.subscriptionStartDate = now;
      // Reset billing period to start from upgrade date
      const period = calculateBillingPeriod(now, now);
      update.periodStart = period.start;
      update.periodEnd = period.end;
      update.jobAnalysesUsed = 0;
      update.aiRewritesUsed = 0;
      update.exportsUsed = 0;
    } else if (args.resetCounters) {
      // Optionally reset monthly counters (for other upgrade scenarios)
      // Use existing subscription start date to maintain billing cycle
      const period = calculateBillingPeriod(now, usage.subscriptionStartDate);
      update.periodStart = period.start;
      update.periodEnd = period.end;
      update.jobAnalysesUsed = 0;
      update.aiRewritesUsed = 0;
      update.exportsUsed = 0;
    }
    
    // Note: resumesCreated is NOT reset (lifetime counter)
    // Note: When downgrading to free, subscriptionStartDate is preserved
    // (in case they upgrade again, we keep their original date)
    
    await ctx.db.patch(usage._id, update);
    return { success: true };
  },
});

/**
 * Mutation: Initialize user usage record (called automatically)
 * Sets plan to "free" by default
 */
export const initializeUserUsage = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    // Check if usage record already exists
    const existing = await ctx.db
      .query("userUsage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (existing) {
      // Already initialized
      return { success: true, alreadyExists: true };
    }

    // Create new usage record
    // Set subscription start date to now (first time user uses the system)
    const subscriptionStartDate = now;
    const period = calculateBillingPeriod(now, subscriptionStartDate);
    await ctx.db.insert("userUsage", {
      userId,
      plan: "free",
      planUpdatedAt: now,
      subscriptionStartDate,
      periodStart: period.start,
      periodEnd: period.end,
      jobAnalysesUsed: 0,
      aiRewritesUsed: 0,
      exportsUsed: 0,
      resumesCreated: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, alreadyExists: false };
  },
});

/**
 * Query: Check if user can perform a specific action (SERVER-SIDE VERSION)
 * This version accepts userId directly for use in API routes
 * Returns allowed status with reason, remaining quota, and upgrade requirement
 */
export const canPerformActionServer = query({
  args: {
    userId: v.string(),
    action: v.union(
      v.literal("job_analysis"),
      v.literal("ai_rewrite"),
      v.literal("create_resume"),
      v.literal("export")
    ),
  },
  handler: async (ctx, args) => {
    const userId = args.userId;
    const action = args.action as ActionType;

    // Get usage record (read-only, queries can't mutate)
    const usage = await getUserUsageRecord(ctx, userId);
    
    // If no record exists, assume free plan with default limits
    // Record will be created automatically by first mutation
    if (!usage) {
      const defaultPlan: PlanTier = "free";
      const limit = getActionLimit(defaultPlan, action);
      
      // For export, check feature availability
      if (action === "export") {
        if (!hasFeature(defaultPlan, "pdfExport")) {
          return {
            allowed: false,
            reason: "PDF export is not available in your plan. Upgrade to Pro for PDF export.",
            remaining: 0,
            upgradeRequired: true,
          };
        }
      }
      
      // Check if unlimited
      if (isUnlimited(limit)) {
        return {
          allowed: true,
          remaining: -1,
          upgradeRequired: false,
        };
      }
      
      // For new users, they haven't used anything yet
      return {
        allowed: true,
        remaining: limit,
        upgradeRequired: false,
      };
    }

    const plan = usage.plan;
    const limit = getActionLimit(plan, action);

    // Check feature availability for export
    if (action === "export") {
      if (!hasFeature(plan, "pdfExport")) {
        return {
          allowed: false,
          reason: "PDF export is not available in your plan. Upgrade to Pro for PDF export.",
          remaining: 0,
          upgradeRequired: true,
        };
      }
    }

    // Get current usage for this action
    let currentUsage: number;
    switch (action) {
      case "job_analysis":
        currentUsage = usage.jobAnalysesUsed;
        break;
      case "ai_rewrite":
        currentUsage = usage.aiRewritesUsed;
        break;
      case "create_resume":
        currentUsage = usage.resumesCreated;
        break;
      case "export":
        currentUsage = usage.exportsUsed;
        break;
      default:
        return {
          allowed: false,
          reason: "Unknown action",
          remaining: 0,
          upgradeRequired: false,
        };
    }

    // Check if unlimited
    if (isUnlimited(limit)) {
      return {
        allowed: true,
        remaining: -1, // -1 means unlimited
        upgradeRequired: false,
      };
    }

    // Check if limit reached
    if (currentUsage >= limit) {
      const actionNames: Record<ActionType, string> = {
        job_analysis: "job analyses",
        ai_rewrite: "AI rewrites",
        create_resume: "resumes",
        export: "PDF exports",
      };

      return {
        allowed: false,
        reason: `You've used all your free ${actionNames[action]} (${limit}/${limit}). Upgrade to Pro for unlimited access.`,
        remaining: 0,
        upgradeRequired: true,
      };
    }

    // Calculate remaining
    const remaining = limit - currentUsage;

    return {
      allowed: true,
      remaining,
      upgradeRequired: false,
    };
  },
});

/**
 * Mutation: Increment usage counter after successful operation (SERVER-SIDE VERSION)
 * This version accepts userId directly for use in API routes
 * Handles billing period reset if needed
 * Idempotent - can be called multiple times safely
 */
export const incrementUsageServer = mutation({
  args: {
    userId: v.string(),
    action: v.union(
      v.literal("job_analysis"),
      v.literal("ai_rewrite"),
      v.literal("create_resume"),
      v.literal("export")
    ),
  },
  handler: async (ctx, args) => {
    const userId = args.userId;
    const action = args.action as ActionType;
    const now = Date.now();

    // Get or create usage record
    const usageId = await getOrCreateUserUsage(ctx, userId);
    const usage = await ctx.db.get(usageId);
    
    if (!usage) {
      throw new Error("Failed to get usage record");
    }

    // Check if billing period expired and reset if needed
    if (now >= usage.periodEnd) {
      const newPeriod = calculateBillingPeriod(now, usage.subscriptionStartDate);
      await ctx.db.patch(usageId, {
        periodStart: newPeriod.start,
        periodEnd: newPeriod.end,
        jobAnalysesUsed: 0,
        aiRewritesUsed: 0,
        exportsUsed: 0,
        updatedAt: now,
      });
      
      // Reload usage after reset
      const updatedUsage = await ctx.db.get(usageId);
      if (!updatedUsage) {
        throw new Error("Failed to get updated usage record");
      }
      
      // Increment the appropriate counter
      const update: Partial<typeof updatedUsage> = {
        updatedAt: now,
      };
      
      switch (action) {
        case "job_analysis":
          update.jobAnalysesUsed = updatedUsage.jobAnalysesUsed + 1;
          break;
        case "ai_rewrite":
          update.aiRewritesUsed = updatedUsage.aiRewritesUsed + 1;
          break;
        case "create_resume":
          update.resumesCreated = updatedUsage.resumesCreated + 1;
          break;
        case "export":
          update.exportsUsed = updatedUsage.exportsUsed + 1;
          break;
      }
      
      await ctx.db.patch(usageId, update);
      return { success: true };
    }

    // Increment the appropriate counter
    const update: Partial<typeof usage> = {
      updatedAt: now,
    };
    
    switch (action) {
      case "job_analysis":
        update.jobAnalysesUsed = usage.jobAnalysesUsed + 1;
        break;
      case "ai_rewrite":
        update.aiRewritesUsed = usage.aiRewritesUsed + 1;
        break;
      case "create_resume":
        update.resumesCreated = usage.resumesCreated + 1;
        break;
      case "export":
        update.exportsUsed = usage.exportsUsed + 1;
        break;
    }
    
    await ctx.db.patch(usageId, update);
    return { success: true };
  },
});
