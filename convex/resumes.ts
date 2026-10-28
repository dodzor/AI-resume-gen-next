import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { freePdfJobChanged, freePdfJobMessage, normalizeJobText } from "../lib/jobText";
import type { PlanTier } from "../lib/plan-limits";

// Save or update a resume
export const saveResume = mutation({
  args: {
    resumeId: v.optional(v.id("resumes")), // Optional: if provided, update; otherwise create
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    experiences: v.array(v.object({
      role: v.string(),
      company: v.string(),
      dates: v.string(),
      description: v.string(),
    })),
    educationEntries: v.array(v.object({
      degree: v.string(),
      school: v.string(),
      dates: v.string(),
      gpa: v.optional(v.string()),
      coursework: v.optional(v.string()),
    })),
    certifications: v.array(v.object({
      name: v.string(),
      dates: v.string(),
    })),
    skills: v.string(),
    portfolioProjects: v.array(v.object({
      name: v.string(),
      toolsSkills: v.string(),
      outcome: v.string(),
    })),
    portfolioLink: v.optional(v.string()),
    job: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    template: v.optional(v.string()),
    tone: v.optional(v.string()),
    summary: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    keywordsByCategory: v.optional(v.object({
      mustHaveTechnicalTerms: v.optional(v.array(v.string())),
      niceToHaveTechnicalTerms: v.optional(v.array(v.string())),
      technicalSkills: v.optional(v.array(v.string())), // legacy documents only
      toolsFrameworks: v.optional(v.array(v.string())),
      methodologies: v.optional(v.array(v.string())),
      domainTerms: v.optional(v.array(v.string())),
      qualifications: v.optional(v.array(v.string())),
      responsibilities: v.optional(v.array(v.string())),
    })),
    keywordsWithCounts: v.optional(
      v.array(
        v.object({
          keyword: v.string(),
          count: v.number(),
          weight: v.number(),
        })
      )
    ),
    themes: v.optional(v.array(v.string())),
    recommendations: v.optional(v.array(v.string())),
    thematicSummary: v.optional(v.string()),
    generatedResume: v.optional(v.string()),
    maxStepReached: v.optional(v.number()),
    kind: v.optional(v.union(v.literal("master"), v.literal("tailored"))),
    rawDump: v.optional(v.string()),
    clarifyingQA: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.optional(v.string()),
      askedAt: v.number(),
    }))),
    confirmedFacts: v.optional(v.array(v.string())),
    masterResumeId: v.optional(v.id("resumes")),
    extractedRequirements: v.optional(v.array(v.string())),
    gaps: v.optional(v.array(v.string())),
    overlapPhrases: v.optional(v.array(v.string())),
    targetJobs: v.optional(v.array(v.string())),
    hostileReviews: v.optional(v.array(v.object({
      createdAt: v.number(),
      stopReading: v.string(),
      verdict: v.string(),
      annotations: v.array(v.object({
        target: v.string(),
        labels: v.array(v.string()),
        note: v.string(),
      })),
    }))),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject; // Clerk user ID

    const now = Date.now();
    const reviews = args.hostileReviews && args.hostileReviews.length > 3
      ? args.hostileReviews.slice(-3)
      : args.hostileReviews;
    const fields = { ...args, hostileReviews: reviews };

    // If resumeId provided, update existing resume
    if (args.resumeId) {
      const existing = await ctx.db.get(args.resumeId);
      if (!existing || existing.userId !== userId) {
        throw new Error("Resume not found or unauthorized");
      }
      await ctx.db.patch(args.resumeId, withoutEmpty({
        ...fields,
        userId,
        updatedAt: now,
      }));
      return args.resumeId;
    }

    // The career record is not an application and does not use the resume quota.
    if (args.kind === "master") {
      const owned = await ctx.db
        .query("resumes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const existingMaster = owned.find((resume) => resume.kind === "master");
      if (existingMaster) {
        await ctx.db.patch(existingMaster._id, withoutEmpty({
          ...fields,
          kind: "master" as const,
          userId,
          updatedAt: now,
        }));
        return existingMaster._id;
      }

      return await ctx.db.insert("resumes", withoutEmpty({
        ...fields,
        kind: "master" as const,
        userId,
        createdAt: now,
        updatedAt: now,
      }));
    }

    // Otherwise, create new tailored resume - check usage limit first
    // Check if user can create a new resume
    const canCreate = await ctx.runQuery(api.usage.canPerformAction, {
      action: "create_resume",
    });

    if (!canCreate.allowed) {
      // Throw error with upgrade requirement information
      const error: any = new Error(canCreate.reason || "Resume limit reached");
      error.upgradeRequired = canCreate.upgradeRequired || false;
      error.code = "USAGE_LIMIT_EXCEEDED";
      throw error;
    }

    // Create new resume
    const resumeId = await ctx.db.insert("resumes", withoutEmpty({
      ...fields,
      kind: "tailored" as const,
      userId,
      createdAt: now,
      updatedAt: now,
    }));

    // Increment usage counter after successful creation
    try {
      await ctx.runMutation(api.usage.incrementUsage, {
        action: "create_resume",
      });
    } catch (error) {
      // Log error but don't fail the resume creation
      console.error("Failed to increment usage counter:", error);
    }

    return resumeId;
  },
});

// Delete a resume
export const deleteResume = mutation({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== identity.subject) {
      throw new Error("Resume not found or unauthorized");
    }

    await ctx.db.delete(args.resumeId);

    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (resume.kind !== "master" && usage && usage.resumesCreated > 0) {
      await ctx.db.patch(usage._id, {
        resumesCreated: usage.resumesCreated - 1,
        updatedAt: Date.now(),
      });
    }
  },
});

function withoutEmpty<T extends Record<string, unknown>>(value: T): T {
  const copy = { ...value };
  for (const key of Object.keys(copy)) {
    if (copy[key] === undefined) delete copy[key];
  }
  return copy;
}

// One career record per user. Never increments resumesCreated.
export const ensureMaster = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;
    const owned = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const existing = owned.find((resume) => resume.kind === "master");
    if (existing) return existing._id;

    const seed = owned[0];
    const dumpLines: string[] = [];
    if (seed) {
      for (const exp of seed.experiences) {
        dumpLines.push(`${exp.role} at ${exp.company} (${exp.dates})`);
        if (exp.description) dumpLines.push(exp.description);
      }
      if (seed.skills) dumpLines.push(`Skills: ${seed.skills}`);
      if (seed.summary) dumpLines.push(seed.summary);
    }

    const now = Date.now();
    return await ctx.db.insert("resumes", withoutEmpty({
      userId,
      kind: "master" as const,
      name: seed?.name || "",
      email: seed?.email || "",
      phone: seed?.phone,
      location: seed?.location,
      experiences: seed?.experiences || [],
      educationEntries: seed?.educationEntries || [],
      certifications: seed?.certifications || [],
      skills: seed?.skills || "",
      portfolioProjects: seed?.portfolioProjects || [],
      portfolioLink: seed?.portfolioLink,
      summary: seed?.summary,
      template: "modern-minimal",
      rawDump: dumpLines.filter(Boolean).join("\n\n"),
      clarifyingQA: [],
      confirmedFacts: [],
      createdAt: now,
      updatedAt: now,
    }));
  },
});

// Copies confirmed master evidence into a new application. Counts toward the quota.
export const createApplicationFromMaster = mutation({
  args: {
    masterResumeId: v.id("resumes"),
    job: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const master = await ctx.db.get(args.masterResumeId);
    if (!master || master.userId !== userId || master.kind !== "master") {
      throw new Error("Career record not found");
    }

    const canCreate = await ctx.runQuery(api.usage.canPerformAction, {
      action: "create_resume",
    });
    if (!canCreate.allowed) {
      const error: any = new Error(canCreate.reason || "Resume limit reached");
      error.upgradeRequired = canCreate.upgradeRequired || false;
      error.code = "USAGE_LIMIT_EXCEEDED";
      throw error;
    }

    const now = Date.now();
    const resumeId = await ctx.db.insert("resumes", withoutEmpty({
      userId,
      kind: "tailored" as const,
      masterResumeId: master._id,
      name: master.name,
      email: master.email,
      phone: master.phone,
      location: master.location,
      experiences: master.experiences,
      educationEntries: master.educationEntries,
      certifications: master.certifications,
      skills: master.skills,
      portfolioProjects: master.portfolioProjects,
      portfolioLink: master.portfolioLink,
      summary: master.summary,
      job: args.job,
      jobTitle: args.jobTitle,
      template: "modern-minimal",
      confirmedFacts: master.confirmedFacts,
      createdAt: now,
      updatedAt: now,
    }));

    try {
      await ctx.runMutation(api.usage.incrementUsage, { action: "create_resume" });
    } catch (error) {
      console.error("Failed to increment usage counter:", error);
    }

    return resumeId;
  },
});

// New application seeded with the CV profile from an existing resume.
// The target job stays empty unless this call passes one.
export const createApplicationFromResume = mutation({
  args: {
    sourceResumeId: v.id("resumes"),
    job: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const source = await ctx.db.get(args.sourceResumeId);
    if (!source || source.userId !== userId) {
      throw new Error("Resume not found");
    }

    const canCreate = await ctx.runQuery(api.usage.canPerformAction, {
      action: "create_resume",
    });
    if (!canCreate.allowed) {
      const error: any = new Error(canCreate.reason || "Resume limit reached");
      error.upgradeRequired = canCreate.upgradeRequired || false;
      error.code = "USAGE_LIMIT_EXCEEDED";
      throw error;
    }

    const now = Date.now();
    const resumeId = await ctx.db.insert("resumes", withoutEmpty({
      userId,
      kind: "tailored" as const,
      name: source.name,
      email: source.email,
      phone: source.phone,
      location: source.location,
      experiences: source.experiences,
      educationEntries: source.educationEntries,
      certifications: source.certifications,
      skills: source.skills,
      portfolioProjects: source.portfolioProjects,
      portfolioLink: source.portfolioLink,
      summary: source.summary,
      template: source.template || "modern-minimal",
      job: args.job,
      jobTitle: args.jobTitle,
      createdAt: now,
      updatedAt: now,
    }));

    try {
      await ctx.runMutation(api.usage.incrementUsage, { action: "create_resume" });
    } catch (error) {
      console.error("Failed to increment usage counter:", error);
    }

    return resumeId;
  },
});

// Get all resumes for the current user
export const getUserResumes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return []; // Return empty array if not authenticated
    }

    const userId = identity.subject;

    // Query using the index we defined
    const resumes = await ctx.db
      .query("resumes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc") // Most recent first
      .collect();

    return resumes;
  },
});

// Get a single resume by ID
export const getResume = query({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const resume = await ctx.db.get(args.resumeId);
    
    // Verify ownership
    if (!resume || resume.userId !== identity.subject) {
      throw new Error("Resume not found or unauthorized");
    }

    return resume;
  },
});

async function planForPdfLock(ctx: QueryCtx | MutationCtx, userId: string): Promise<PlanTier> {
  const usage = await ctx.db
    .query("userUsage")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!usage) return "free";
  if (usage.plan === "search" && Date.now() >= usage.periodEnd) return "free";
  return usage.plan;
}

/**
 * Free PDFs stay on the job description from the first download.
 * Paid plans are not locked to that text.
 */
export const freePdfJobAllowed = query({
  args: {
    userId: v.string(),
    resumeId: v.optional(v.id("resumes")),
    job: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await planForPdfLock(ctx, args.userId);
    if (plan !== "free") return { allowed: true as const };

    if (!args.resumeId) {
      return {
        allowed: false as const,
        upgradeRequired: false,
        reason: "Save the application before downloading.",
      };
    }

    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== args.userId) {
      return {
        allowed: false as const,
        upgradeRequired: false,
        reason: "Resume not found",
      };
    }

    const sameAsDownload = !freePdfJobChanged(resume.exportedJob, args.job)
    const sameAsSaved = !freePdfJobChanged(resume.exportedJob, resume.job)
    if (sameAsDownload && sameAsSaved) {
      return { allowed: true as const };
    }

    return {
      allowed: false as const,
      upgradeRequired: true,
      reason: freePdfJobMessage(),
      exportedJob: resume.exportedJob,
    };
  },
});

/** Remember the job from the first free PDF. Later calls leave the stored text in place. */
export const recordExportedJob = mutation({
  args: {
    userId: v.string(),
    resumeId: v.id("resumes"),
    job: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await planForPdfLock(ctx, args.userId);
    if (plan !== "free") return { recorded: false };

    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== args.userId) return { recorded: false };
    if (resume.exportedJob !== undefined) return { recorded: false };

    await ctx.db.patch(resume._id, {
      exportedJob: normalizeJobText(args.job),
      updatedAt: Date.now(),
    });
    return { recorded: true };
  },
});
