import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  PLAN_LIMITS,
  SEARCH_PERIOD_MS,
  getActionLimit,
  hasFeature,
  isUnlimited,
  limitReachedMessage,
  type ActionType,
  type PlanTier,
} from "../lib/plan-limits";
import { applicationResumes } from "../lib/applicationResumes";

const planTierValidator = v.union(
  v.literal("free"),
  v.literal("search"),
  v.literal("pro"),
  v.literal("enterprise")
);

type UsageSnapshot = {
  _id: Id<"userUsage">;
  subscriptionStartDate: number;
  periodStart: number;
  periodEnd: number;
  plan: PlanTier;
  jobAnalysesUsed: number;
  aiRewritesUsed: number;
  exportsUsed: number;
  resumesCreated: number;
  applicationsUsed?: number;
};

function effectivePlan(
  usage: { plan: PlanTier; subscriptionStartDate: number },
  now: number
): PlanTier {
  // The search pass ends 30 days after it was bought. periodEnd also rolls
  // forward after that so the free monthly ceiling can reset, and that roll
  // must not turn the pass back on.
  if (usage.plan === "search" && now >= usage.subscriptionStartDate + SEARCH_PERIOD_MS) {
    return "free";
  }
  return usage.plan;
}

function monthlyUsed(
  usage: {
    periodEnd: number;
    jobAnalysesUsed: number;
    aiRewritesUsed: number;
    exportsUsed: number;
  },
  action: "job_analysis" | "ai_rewrite" | "export",
  now: number
): number {
  if (now >= usage.periodEnd) return 0;
  if (action === "job_analysis") return usage.jobAnalysesUsed;
  if (action === "ai_rewrite") return usage.aiRewritesUsed;
  return usage.exportsUsed;
}

function applicationsUsedNow(
  usage: { resumesCreated: number; applicationsUsed?: number; periodEnd: number },
  plan: PlanTier,
  now: number
): number {
  if (!PLAN_LIMITS[plan].applications.resetsEachPeriod) return usage.resumesCreated;
  if (now >= usage.periodEnd) return 0;
  return usage.applicationsUsed ?? 0;
}

function periodForPlan(plan: PlanTier, now: number, subscriptionStartDate: number) {
  if (plan === "search") return { start: now, end: now + SEARCH_PERIOD_MS };
  return calculateBillingPeriod(now, subscriptionStartDate);
}

function applicationIncrement(
  usage: {
    resumesCreated: number;
    applicationsUsed?: number;
    plan: PlanTier;
    periodEnd: number;
    subscriptionStartDate: number;
  },
  now: number
): { resumesCreated: number; applicationsUsed?: number } {
  const plan = effectivePlan(usage, now);
  const next: { resumesCreated: number; applicationsUsed?: number } = {
    resumesCreated: usage.resumesCreated + 1,
  };
  if (PLAN_LIMITS[plan].applications.resetsEachPeriod) {
    next.applicationsUsed = (usage.applicationsUsed ?? 0) + 1;
  }
  return next;
}

function limitsFor(plan: PlanTier) {
  const limits = PLAN_LIMITS[plan];
  return {
    jobAnalyses: limits.monthly.jobAnalyses,
    aiRewrites: limits.monthly.aiRewrites,
    exports: limits.monthly.exports,
    resumes: limits.applications.limit,
  };
}

const modelCeilings = v.object({
  free: v.number(),
  search: v.number(),
  pro: v.number(),
  enterprise: v.number(),
});

function ceilingFor(
  plan: PlanTier,
  action: ActionType,
  ceilings: { free: number; search: number; pro: number; enterprise: number } | undefined
): number {
  if (ceilings && (action === "job_analysis" || action === "ai_rewrite")) {
    return ceilings[plan];
  }
  return getActionLimit(plan, action);
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
): Promise<UsageSnapshot | null> {
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
    if (now >= existing.periodEnd && existing.plan !== "search") {
      const newPeriod = calculateBillingPeriod(now, existing.subscriptionStartDate);
      await ctx.db.patch(existing._id, {
        periodStart: newPeriod.start,
        periodEnd: newPeriod.end,
        jobAnalysesUsed: 0,
        aiRewritesUsed: 0,
        exportsUsed: 0,
        applicationsUsed: 0,
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
    applicationsUsed: 0,
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
        limits: limitsFor(defaultPlan),
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

    const plan = effectivePlan(usage, now);
    return {
      plan,
      usage: {
        jobAnalyses: displayUsage.jobAnalysesUsed,
        aiRewrites: displayUsage.aiRewritesUsed,
        exports: displayUsage.exportsUsed,
        resumes: applicationsUsedNow(usage, plan, now),
      },
      limits: limitsFor(plan),
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
            reason: "PDF export is not available on this plan.",
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

    const now = Date.now();
    const plan = effectivePlan(usage, now);
    const limit = getActionLimit(plan, action);

    // Check feature availability for export
    if (action === "export") {
      if (!hasFeature(plan, "pdfExport")) {
        return {
          allowed: false,
          reason: "PDF export is not available on this plan.",
          remaining: 0,
          upgradeRequired: true,
        };
      }
    }

    // Get current usage for this action
    let currentUsage: number;
    switch (action) {
      case "job_analysis":
      case "ai_rewrite":
      case "export":
        currentUsage = monthlyUsed(usage, action, now);
        break;
      case "create_resume":
        currentUsage = applicationsUsedNow(usage, plan, now);
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
      return {
        allowed: false,
        reason: limitReachedMessage(plan, action, limit),
        remaining: 0,
        upgradeRequired: action !== "job_analysis" && action !== "ai_rewrite",
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
          Object.assign(update, applicationIncrement(updatedUsage, now));
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
        Object.assign(update, applicationIncrement(usage, now));
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
    plan: planTierValidator,
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
      const period = periodForPlan(args.plan, now, subscriptionStartDate);
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
        resumesCreated: 0,
        applicationsUsed: 0,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }
    
    const planChanged = usage.plan !== args.plan;
    // A retried subscription.created must not start a second search window
    // while the one we already opened is still running.
    const searchWindowStillOpen =
      args.plan === "search" && usage.plan === "search" && now < usage.periodEnd;
    const openingPaidPeriod =
      args.plan !== "free" &&
      !searchWindowStillOpen &&
      (planChanged || args.resetCounters === true);

    const update: Partial<typeof usage> = {
      plan: args.plan,
      planUpdatedAt: now,
      updatedAt: now,
    };

    // A new search pass or billing period starts at zero applications.
    // resumesCreated stays, so a finished pass still counts toward the free cap.
    if (openingPaidPeriod) {
      const period = periodForPlan(args.plan, now, now);
      update.subscriptionStartDate = now;
      update.periodStart = period.start;
      update.periodEnd = period.end;
      update.jobAnalysesUsed = 0;
      update.aiRewritesUsed = 0;
      update.exportsUsed = 0;
      const owned = await ctx.db
        .query("resumes")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      const cap = PLAN_LIMITS[args.plan].applications.limit;
      const count = applicationResumes(owned).length;
      const seeded = isUnlimited(cap) ? count : Math.min(count, cap);
      // A new billing period on the same plan starts over.
      // Switching plans keeps the applications already saved.
      const renewingSamePlan = !planChanged && args.resetCounters === true;
      update.applicationsUsed = renewingSamePlan ? 0 : seeded;
    }
    
    await ctx.db.patch(usage._id, update);
    return { success: true };
  },
});

/**
 * When the career record is hidden, every saved resume is an application.
 * Raise the lifetime counter to that number if older masters were not counted.
 */
export const syncApplicationCount = mutation({
  args: { applicationCount: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const resumes = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const count = Math.min(Math.max(0, Math.floor(args.applicationCount)), resumes.length);
    const usageId = await getOrCreateUserUsage(ctx, identity.subject);
    const usage = await ctx.db.get(usageId);
    if (!usage || count === 0) return { updated: false };

    const now = Date.now();
    const plan = effectivePlan(usage, now);
    const patch: { resumesCreated?: number; applicationsUsed?: number; updatedAt: number } = {
      updatedAt: now,
    };
    if (usage.resumesCreated < count) patch.resumesCreated = count;
    if (PLAN_LIMITS[plan].applications.resetsEachPeriod) {
      const cap = PLAN_LIMITS[plan].applications.limit;
      const next = isUnlimited(cap) ? count : Math.min(count, cap);
      if ((usage.applicationsUsed ?? 0) !== next) patch.applicationsUsed = next;
    }
    if (patch.resumesCreated === undefined && patch.applicationsUsed === undefined) {
      return { updated: false };
    }

    await ctx.db.patch(usageId, patch);
    return { updated: true, resumesCreated: patch.resumesCreated, applicationsUsed: patch.applicationsUsed };
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
    applicationsUsed: 0,
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
    ceilings: v.optional(modelCeilings),
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
      const limit = ceilingFor(defaultPlan, action, args.ceilings);
      
      // For export, check feature availability
      if (action === "export") {
        if (!hasFeature(defaultPlan, "pdfExport")) {
          return {
            allowed: false,
            reason: "PDF export is not available on this plan.",
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

    const now = Date.now();
    const plan = effectivePlan(usage, now);
    const limit = ceilingFor(plan, action, args.ceilings);

    // Check feature availability for export
    if (action === "export") {
      if (!hasFeature(plan, "pdfExport")) {
        return {
          allowed: false,
          reason: "PDF export is not available on this plan.",
          remaining: 0,
          upgradeRequired: true,
        };
      }
    }

    // Get current usage for this action
    let currentUsage: number;
    switch (action) {
      case "job_analysis":
      case "ai_rewrite":
      case "export":
        currentUsage = monthlyUsed(usage, action, now);
        break;
      case "create_resume":
        currentUsage = applicationsUsedNow(usage, plan, now);
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
      return {
        allowed: false,
        reason: limitReachedMessage(plan, action, limit),
        remaining: 0,
        upgradeRequired: action !== "job_analysis" && action !== "ai_rewrite",
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
          Object.assign(update, applicationIncrement(updatedUsage, now));
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
        Object.assign(update, applicationIncrement(usage, now));
        break;
      case "export":
        update.exportsUsed = usage.exportsUsed + 1;
        break;
    }
    
    await ctx.db.patch(usageId, update);
    return { success: true };
  },
});
