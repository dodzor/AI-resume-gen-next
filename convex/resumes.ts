import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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
    themes: v.optional(v.array(v.string())),
    recommendations: v.optional(v.array(v.string())),
    thematicSummary: v.optional(v.string()),
    generatedResume: v.optional(v.string()),
    maxStepReached: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject; // Clerk user ID

    const now = Date.now();

    // If resumeId provided, update existing resume
    if (args.resumeId) {
      await ctx.db.patch(args.resumeId, {
        ...args,
        userId,
        updatedAt: now,
      });
      return args.resumeId;
    }

    // Otherwise, create new resume - check usage limit first
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
    const resumeId = await ctx.db.insert("resumes", {
      ...args,
      userId,
      createdAt: now,
      updatedAt: now,
    });

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
