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
    // Target job locked by the first free PDF. Absent until that download.
    exportedJob: v.optional(v.string()),
    jobTitle: v.optional(v.string()), // Extracted job title
    template: v.optional(v.string()),
    tone: v.optional(v.string()), // 'junior' | 'mid' | 'senior'
    summary: v.optional(v.string()), // AI-generated summary
    
    // Keywords
    keywords: v.optional(v.array(v.string())), // Flat array of keywords (for backward compatibility)
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

    // Themes and Recommendations
    themes: v.optional(v.array(v.string())), // Core themes identified from job description
    recommendations: v.optional(v.array(v.string())), // What the resume should show
    thematicSummary: v.optional(v.string()), // One sentence explaining what the job emphasizes
    
    // Generated Resume (HTML string). Tailored resumes only; the master is never exported.
    generatedResume: v.optional(v.string()),

    // master = private career record (does not count toward resumesCreated).
    // tailored = one application, child of the master. Missing kind means tailored.
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
    
    // Metadata
    maxStepReached: v.optional(v.number()), // Last completed step (1-8)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // Index for fast queries by user
    .index("by_created", ["createdAt"]), // Index for sorting by date

  // User usage tracking for subscription limits
  userUsage: defineTable({
    // User identification (from Clerk)
    userId: v.string(),
    
    // Plan information
    plan: v.union(
      v.literal("free"),
      v.literal("search"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    planUpdatedAt: v.number(), // Timestamp when plan was last updated
    
    // Subscription tracking (for per-user billing periods)
    subscriptionStartDate: v.number(), // Date when user first subscribed (used to calculate billing periods)
    
    // Billing period tracking (for monthly limits)
    periodStart: v.number(), // Timestamp of current billing period start
    periodEnd: v.number(), // Timestamp of current billing period end
    
    // Monthly usage counters (reset at billing period start)
    jobAnalysesUsed: v.number(), // Count of job analyses this period
    aiRewritesUsed: v.number(), // Rewrites, summaries, imports, and full resume generations this period
    exportsUsed: v.number(), // Count of PDF exports this period
    
    // Lifetime total. The free cap uses this. Paid plans use applicationsUsed.
    resumesCreated: v.number(),
    // Applications opened in the current search pass or billing period.
    applicationsUsed: v.optional(v.number()),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]), // Fast lookup by user ID

  // Plain-text descriptions live in their own table so a timestamp check can
  // read softwareJobs without loading the posting body.
  softwareJobDescriptions: defineTable({
    text: v.string(),
    remote: v.optional(v.boolean()),
  }).searchIndex("search_text", {
    searchField: "text",
    filterFields: ["remote"],
  }),

  softwareJobs: defineTable({
    greenhouseId: v.number(),
    boardToken: v.string(),
    title: v.string(),
    companyName: v.string(),
    location: v.string(),
    url: v.string(),
    updatedAt: v.string(),
    descriptionId: v.id("softwareJobDescriptions"),
    remote: v.optional(v.boolean()),
    countries: v.optional(v.array(v.string())),
  })
    .index("by_url", ["url"])
    .index("by_remote", ["remote"])
    .index("by_description", ["descriptionId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["remote"],
    }),

  softwareJobCountries: defineTable({
    jobId: v.id("softwareJobs"),
    country: v.string(),
    remote: v.boolean(),
  })
    .index("by_country_remote", ["country", "remote"])
    .index("by_job", ["jobId"]),

  softwareCatalog: defineTable({
    total: v.number(),
    remoteTotal: v.number(),
    countries: v.array(
      v.object({
        name: v.string(),
        count: v.number(),
        remoteCount: v.number(),
      }),
    ),
    updatedAt: v.number(),
  }),
});
