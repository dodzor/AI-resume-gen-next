import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  resumes: defineTable({
    // User identification (from Clerk)
    userId: v.string(),
    resumeId: v.optional(v.id("resumes")),
    
    // Personal Information
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    
    // Work Experience
    experiences: v.array(v.object({
      role: v.string(),
      company: v.string(),
      dates: v.string(),
      description: v.string(),
    })),
    
    // Education
    educationEntries: v.array(v.object({
      degree: v.string(),
      school: v.string(),
      dates: v.string(),
      gpa: v.optional(v.string()),
      coursework: v.optional(v.string()),
    })),
    
    // Certifications
    certifications: v.array(v.object({
      name: v.string(),
      dates: v.string(),
    })),
    
    // Skills
    skills: v.string(),
    
    // Portfolio
    portfolioProjects: v.array(v.object({
      name: v.string(),
      toolsSkills: v.string(),
      outcome: v.string(),
    })),
    portfolioLink: v.optional(v.string()),
    
    // Job Description & Template
    job: v.optional(v.string()),
    jobTitle: v.optional(v.string()), // Extracted job title
    template: v.optional(v.string()),
    tone: v.optional(v.string()), // 'junior' | 'mid' | 'senior'
    summary: v.optional(v.string()), // AI-generated summary
    
    // Generated Resume (HTML string)
    generatedResume: v.optional(v.string()),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // Index for fast queries by user
    .index("by_created", ["createdAt"]), // Index for sorting by date
});
