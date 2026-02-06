# Convex Quickstart Guide for AI Resume Generator

## What is Convex?

Convex is a backend-as-a-service that provides:
- **Real-time database** - Automatic reactivity, data syncs instantly to all clients
- **Serverless functions** - Write backend logic in TypeScript
- **Built-in authentication** - Already integrated with Clerk in your app
- **Type-safe** - Full TypeScript support with auto-generated types

## Core Concepts

### 1. **Queries** - Read data (reactive)
Queries automatically re-run when data changes. Perfect for displaying data in your UI.

### 2. **Mutations** - Write data (synchronous)
Mutations modify your database. They're synchronous and transactional.

### 3. **Actions** - External API calls (asynchronous)
Actions can call external APIs, make HTTP requests, or perform long-running operations.

## Your Current Setup

✅ Convex is already installed and configured
✅ Clerk authentication is integrated
✅ `ConvexClientProvider` is set up in your layout
✅ Basic example exists in `convex/messages.ts`

## Step-by-Step: Persisting Resume Data

### Step 1: Define Your Schema

Create `convex/schema.ts` to define your data structure:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  resumes: defineTable({
    // User identification (from Clerk)
    userId: v.string(),
    
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
    template: v.optional(v.string()),
    tone: v.optional(v.string()),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // Index for fast queries by user
    .index("by_created", ["createdAt"]), // Index for sorting by date
});
```

#### Understanding Validators: `v.string()` Explained

**Important:** `v.string()` does NOT return the userId value. It's a **validator** that defines the **type** of data allowed.

Think of it like TypeScript types, but for runtime validation:

```typescript
// Schema definition - this is like a "contract" or "blueprint"
userId: v.string()  // ← This says: "userId field must be a string type"
```

**How it works:**

1. **Schema (line 42)**: `userId: v.string()` defines that the `userId` field must be a string
   - This is validation/type checking, not data assignment
   - Similar to TypeScript: `userId: string` in an interface

2. **Mutation Handler (line 149)**: The actual value comes from here:
   ```typescript
   const userId = identity.subject; // ← THIS is where the actual userId value comes from
   ```

3. **When inserting data (line 164-168)**: You provide the actual value:
   ```typescript
   await ctx.db.insert("resumes", {
     ...args,
     userId,  // ← The actual string value (e.g., "user_abc123")
     createdAt: now,
   });
   ```

**Example flow:**
```typescript
// 1. Schema says: "userId must be a string"
userId: v.string()

// 2. Mutation gets the actual value from Clerk
const userId = identity.subject; // e.g., "user_2abc123xyz"

// 3. When inserting, Convex validates:
await ctx.db.insert("resumes", {
  userId: "user_2abc123xyz", // ✅ Valid: it's a string
  // userId: 12345,          // ❌ Error: not a string!
});
```

**Why use validators?**
- **Type safety**: Ensures data matches expected format
- **Runtime validation**: Catches errors before they're stored
- **Auto-generated types**: Convex generates TypeScript types from your schema

### Step 2: Create Mutations (Save Data)

Create `convex/resumes.ts`:

```typescript
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
    template: v.optional(v.string()),
    tone: v.optional(v.string()),
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
```

### Step 3: Create Queries (Read Data)

Add to `convex/resumes.ts`:

```typescript
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
```

### Step 4: Use in React Components

In your `components/content.tsx` or wherever you manage form state:

```typescript
'use client'

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from 'react';

export default function Content() {
  // Query: Automatically fetches and re-renders when data changes
  const resumes = useQuery(api.resumes.getUserResumes);
  
  // Mutations: Functions to call when saving
  const saveResume = useMutation(api.resumes.saveResume);
  const deleteResume = useMutation(api.resumes.deleteResume);

  const [formData, setFormData] = useState({...});
  const [currentResumeId, setCurrentResumeId] = useState<Id<"resumes"> | null>(null);

  // Load a resume when user selects one
  const loadResume = async (resumeId: Id<"resumes">) => {
    const resume = await getResume({ resumeId });
    setFormData({
      name: resume.name,
      email: resume.email,
      // ... map all fields
    });
    setCurrentResumeId(resumeId);
  };

  // Save current form data
  const handleSave = async () => {
    try {
      const resumeId = await saveResume({
        resumeId: currentResumeId ?? undefined, // Update if exists, create if new
        name: formData.name,
        email: formData.email,
        // ... pass all form fields
      });
      
      setCurrentResumeId(resumeId);
      console.log("Resume saved!");
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  // Auto-save example (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentResumeId) {
        handleSave();
      }
    }, 2000); // Save 2 seconds after last change

    return () => clearTimeout(timer);
  }, [formData]);

  return (
    <div>
      {/* Resume list sidebar */}
      <div>
        <h3>My Resumes</h3>
        {resumes === undefined ? (
          <p>Loading...</p>
        ) : resumes.length === 0 ? (
          <p>No resumes yet</p>
        ) : (
          <ul>
            {resumes.map((resume) => (
              <li key={resume._id}>
                <button onClick={() => loadResume(resume._id)}>
                  {resume.name} - {new Date(resume.createdAt).toLocaleDateString()}
                </button>
                <button onClick={() => deleteResume({ resumeId: resume._id })}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Your existing form */}
      <Form formData={formData} setFormData={setFormData} />
      
      {/* Save button */}
      <button onClick={handleSave}>Save Resume</button>
    </div>
  );
}
```

## Key Patterns

### 1. **Auto-save Pattern**
```typescript
// Debounced auto-save
useEffect(() => {
  const timer = setTimeout(() => {
    saveResume({ ...formData });
  }, 2000);
  return () => clearTimeout(timer);
}, [formData]);
```

### 2. **Loading States**
```typescript
const resumes = useQuery(api.resumes.getUserResumes);

// resumes can be:
// - undefined (loading)
// - [] (no data)
// - [resume1, resume2, ...] (data loaded)
```

### 3. **Error Handling**
```typescript
const saveResume = useMutation(api.resumes.saveResume);

try {
  await saveResume({ ...data });
} catch (error) {
  // Handle error (show toast, etc.)
  console.error(error);
}
```

### 4. **Optimistic Updates**
```typescript
// Convex handles this automatically - UI updates immediately
// If mutation fails, Convex reverts the change
```

## Advanced: Actions for AI Operations

You can also use **Actions** to call your existing API routes or external services:

```typescript
// convex/resumes.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateResumeWithAI = action({
  args: {
    resumeId: v.id("resumes"),
    jobDescription: v.string(),
  },
  handler: async (ctx, args) => {
    // Call your existing API route
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeId: args.resumeId,
        jobDescription: args.jobDescription,
      }),
    });

    const result = await response.json();
    
    // Update the resume in Convex
    await ctx.runMutation(api.resumes.saveResume, {
      resumeId: args.resumeId,
      ...result.updatedResume,
    });

    return result;
  },
});
```

## Environment Variables

Make sure you have in your `.env.local`:
```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## Running Convex

1. **Start Convex dev server:**
   ```bash
   npx convex dev
   ```

2. **Deploy to production:**
   ```bash
   npx convex deploy
   ```

## Next Steps

1. ✅ Define your schema (`convex/schema.ts`)
2. ✅ Create mutations for saving resumes
3. ✅ Create queries for loading resumes
4. ✅ Integrate `useQuery` and `useMutation` in your components
5. ✅ Add auto-save functionality
6. ✅ Create a resume list/selector UI

## Resources

- [Convex Docs](https://docs.convex.dev)
- [React Integration](https://docs.convex.dev/client/react)
- [Authentication with Clerk](https://docs.convex.dev/auth/clerk)
- [Schema Definition](https://docs.convex.dev/database/schemas)
