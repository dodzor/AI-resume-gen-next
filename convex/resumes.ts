import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
      technicalSkills: v.array(v.string()),
      toolsFrameworks: v.array(v.string()),
      methodologies: v.array(v.string()),
      domainTerms: v.array(v.string()),
      qualifications: v.array(v.string()),
      responsibilities: v.array(v.string()),
    })),
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

    // Otherwise, create new resume
    const resumeId = await ctx.db.insert("resumes", {
      ...args,
      userId,
      createdAt: now,
      updatedAt: now,
    });

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
