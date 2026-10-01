## App Features

This document lists the key features of the app, derived from `IMPLEMENTATION_ANALYSIS.md`.

---

## Job Description Analysis & Insights

- **Job Description Input**
  - Users can paste any job description into the app.
  - "Analyze Job Description" button triggers backend analysis.

- **Tone / Seniority Detection**
  - Automatically classifies roles as **junior**, **mid**, or **senior**.
  - Uses cues like years of experience, ownership level, leadership expectations, and technical depth.
  - Seniority level is surfaced in the UI and can be manually adjusted via a tone selector.

- **Keyword Extraction & Processing**
  - Extracts keywords and phrases from the job description, including:
    - Technical skills and technologies.
    - Tools and frameworks.
    - Methodologies and processes.
    - Domain-specific terms.
    - Required qualifications.
    - Key responsibilities.
  - Each keyword includes an **occurrence count** in the job description.
  - **Smart sorting** by:
    - Occurrence count (descending), then
    - Alphabetically for ties.
  - **Backend fallback**: If the AI does not return counts, the backend performs regex-based counting.
  - Pre-computed:
    - `keywordsWithCounts`: `{ keyword, count }[]`.
    - `keywords`: sorted keyword string array.
    - `keywordsByCategory`: categorized keywords by type.

- **Themes, Recommendations, and Summary**
  - Extracts high-level **themes** that the job emphasizes.
  - Generates **actionable recommendations** about what the resume should demonstrate.
  - Produces a **summary sentence** describing the job’s emphasis.
  - These insights are fully wired into the UI and AI prompts.

- **Visual Feedback After Analysis**
  - Displays detected seniority level.
  - Tone selector to override the detected level.
  - Keyword badges with visual weight based on importance:
    - High priority (3+ occurrences): strong styling (e.g., bold border, blue-600).
    - Medium priority (1–2 occurrences): medium emphasis.
    - Low priority (0 occurrences): lighter, gray, italic.
  - Thematic insights card:
    - Prominent visual card with gradient background.
    - Shows summary sentence and detailed recommendations.

---

## AI-Powered Resume Building

- **Tone-Aware Summary Generation**
  - Generates professional summaries aligned with:
    - Detected or selected seniority level (junior/mid/senior).
    - Role tone (ownership, leadership, strategic vs tactical).
    - Extracted job themes and recommendations.
    - Relevant keywords.
  - Adjusts language to match expected scope and ownership for each level.

- **Tone-Aware Bullet Point Rewriting**
  - Rewrites individual bullet points using:
    - Selected keywords.
    - Detected themes and recommendations.
    - Chosen seniority/tone.
  - Adapts wording, ownership level, and scope (junior vs. senior).
  - Returns both rewritten bullet points and reasoning/meta-data (e.g., which keywords and themes were used).

- **Experience Improvement**
  - "Improve Experience" feature to enhance entire experience descriptions.
  - Uses job description context, themes, and recommendations to:
    - Emphasize what the role values.
    - Remove clichés and buzzwords.
    - Provide more concrete, impact-oriented phrasing.

- **Keyword Integration Across the Resume**
  - Keywords flow through the full resume-building process:
    - Summary generation.
    - Individual bullet rewriting.
    - Experience improvement.
    - Skills section coverage tracking.
  - For each bullet point:
    - Relevant keywords are shown above the input.
    - Users can select/deselect which keywords to incorporate.
    - App automatically detects which keywords ended up in the rewritten bullet.
  - In the skills section:
    - Calculates **keyword coverage percentage**.
    - Highlights missing keywords.
    - Allows users to add missing skills.

- **Contextual Guidance & Tooling**
  - Info tooltips explaining:
    - How tone affects AI output.
    - How keywords are used.
    - How thematic insights influence text.
  - "Rewrite" button shows how many keywords will be incorporated before executing.

- **Buzzword & Cliché Filtering**
  - All AI operations (summary, rewrite, improve) employ:
    - Buzzword and cliché detection.
    - Rephrasing to maintain authenticity and clarity.

---

## Theme Extraction & Integration

- **Theme Extraction**
  - Separate AI flow extracts:
    - Core themes (e.g., ownership, system design, mentorship).
    - Recommendations about the candidate’s resume.
    - Single-sentence thematic summary.

- **Theme Persistence**
  - Themes, recommendations, and summary are:
    - Stored in form state.
    - Persisted in the Convex database with each resume.
    - Loaded back with the resume on subsequent visits.

- **Theme Usage in AI Operations**
  - Supplied to all AI prompts:
    - Summary generation.
    - Bullet rewriting.
    - Experience improvement.
  - Ensures the resume consistently emphasizes what the specific job values.

- **Theme Detection in Outputs**
  - Detects which themes are emphasized in rewritten bullets.
  - Displays theme coverage in UI (e.g., bullet reasoning tooltips).

---

## Resume Management & Persistence

- **Resume Storage & Auto-Save**
  - Resumes are persisted in a Convex database.
  - Auto-save with debounce to prevent excessive writes.

- **Multi-Resume Support**
  - Users can create and manage multiple resumes.
  - Resume switcher to toggle between different versions.
  - Automatic loading of the last edited resume (tracked via `localStorage`).

- **Ownership & Security**
  - Every resume record is scoped to a specific `userId` (from Clerk).
  - Backend enforces ownership:
    - Queries and mutations verify the authenticated user.
    - Throws on unauthorized access attempts.
  - Database indexed by `userId` for efficient user-specific queries.

- **Real-Time Updates**
  - Convex reactive queries:
    - Provide live updates across sessions/tabs.
    - Keep resume content in sync.

---

## Authentication & User Management (Clerk)

- **Clerk Integration**
  - App uses `@clerk/nextjs` for authentication and user management.
  - Clerk middleware secures all routes except static assets and explicitly public routes.
  - `ClerkProvider` wraps the Next.js app for auth context.

- **Convex + Clerk Integration**
  - `ConvexProviderWithClerk` connects Clerk tokens to Convex.
  - Convex trusts Clerk as an identity provider via `auth.config.ts`.
  - All Convex operations use `ctx.auth.getUserIdentity()` to enforce per-user data.

- **Authenticated UI**
  - Main app content gated by:
    - `<Authenticated>` component.
    - `<Unauthenticated>` view for sign-in.
  - Header shows:
    - `<SignInButton>` for signed-out users.
    - `<UserButton>` with profile/sign-out for signed-in users.

- **Clerk-Managed Billing UI**
  - Pricing page uses Clerk’s `<PricingTable />`.
  - Clerk Billing configured with subscription plans (free, pro, enterprise).
  - Production Stripe integration supporting real credit card payments.

- **Known Gaps (Auth UX)**
  - Uses Clerk hosted sign-in/sign-up pages rather than fully custom `/sign-in` and `/sign-up` routes.
  - No dedicated in-app user profile page yet.

---

## Subscription Plans, Usage Limits & Billing

- **Plan Tiers & Limits**
  - Supported plans:
    - **Free**
      - Limited job analyses per month.
      - Limited AI rewrites per month.
      - No or limited PDF exports.
      - 1 lifetime resume.
    - **Pro**
      - Higher or unlimited job analyses and AI rewrites.
      - More PDF exports.
      - Up to 10 lifetime resumes.
    - **Enterprise**
      - Effectively unlimited usage across all tracked actions.
  - Central `PLAN_LIMITS` configuration in code.

- **Usage Tracking via Convex**
  - `userUsage` table tracks per-user usage:
    - `jobAnalysesUsed`, `aiRewritesUsed`, `exportsUsed`, `resumesUsed`, etc.
    - `plan` field storing current tier.
    - `periodStart` and `periodEnd` for billing period.
  - Indexed by `userId` for fast lookup.

- **Server-Side Usage Enforcement**
  - Dedicated Convex functions:
    - `getUserUsage` – fetch usage + limits for UI.
    - `canPerformAction` – checks if an action is allowed.
    - `incrementUsage` – increments counters after success.
  - All relevant API routes call:
    - `checkUsageLimit` before performing actions.
    - `incrementUsageAfterAction` once actions succeed.
  - Returns structured results indicating:
    - `allowed` / `upgradeRequired`.
    - Remaining quota.
    - Human-readable reasons.

- **Clerk Webhook Integration**
  - Webhook route handles Clerk events:
    - `user.created`, `user.updated`.
    - `subscription.created`, `subscription.updated`, `subscription.deleted`.
  - Maps subscription state from Clerk (and Stripe) to internal plan tiers.
  - Updates Convex `userUsage` table when subscription changes:
    - Syncs `plan` and billing period.
    - Resets counters when upgrading from free to paid.

- **Frontend Usage UX**
  - Custom hooks:
    - `useUsageLimits` – real-time usage + limit data.
    - `useCanPerformAction` – convenience checks for specific actions.
  - Components:
    - `UsageDisplay` – shows current plan, usage bars, and quotas.
    - `UsageGatedButton` – wraps action buttons (analyze, rewrite, export):
      - Displays remaining quota text.
      - Shows upgrade modal when limits are exceeded.

- **Billing Period Management**
  - Automatic calculation and reset based on subscription start date.
  - Convex cron job to reset monthly usage on schedule.

---

## Protected API Routes & Error Handling

- **Server-Side Authentication for All APIs**
  - Reusable helper in `lib/api-auth.ts`:
    - `requireAuth()` – enforces authentication and returns `userId` or a 401 response.
    - `getUserId()` – optional auth flow when needed.
  - All critical API routes use `requireAuth`:
    - `/api/analyze-job-description`
    - `/api/rewrite-bullet`
    - `/api/improve-experience`
    - `/api/generate-summary`
    - `/api/generate-resume`
    - `/api/generate-pdf`
    - `/api/search` (auth-only, no usage tracking).

- **Consistent Error Handling**
  - `lib/api-errors.ts` defines:
    - `UnauthorizedError`, `ForbiddenError`, `UsageLimitError`.
  - APIs return a consistent error payload:
    - `{ error, code, message, details }`.
  - Correct HTTP status codes (401, 403, 429, 500).

- **API Usage Utilities**
  - `lib/api-usage.ts` centralizes:
    - Usage checks.
    - Counter increments.
    - Error response generation for exceeded limits.

---

## Deployment, PDF Generation & Analytics

- **Production Deployment**
  - App deployed on Vercel with production environment configuration.
  - Separate dev and prod environment variables.
  - Custom domain ready with documented DNS setup flow.

- **Next.js & Security**
  - Running on Next.js `15.5.7` (patched per React2Shell security advisory).

- **Serverless PDF Generation**
  - Uses `puppeteer-core` and `@sparticuz/chromium` for PDF generation in serverless environments.
  - Vercel function timeout and runtime configuration tuned for Chromium.
  - PDF exports counted against plan limits via usage tracking.

- **Analytics**
  - `@vercel/analytics` integrated.
  - `<Analytics />` component added to root `layout.tsx`.
  - Automatic page view tracking across all routes.

---

## Environment & Configuration (Documentation-Oriented Features)

- **Environment Variables (Conceptual Support)**
  - Authentication, Convex, OpenAI, Clerk webhooks, Stripe, and PDF generation rely on environment config.
  - Documentation and quickstart guides describe:
    - Required vs optional variables.
    - Public vs secret variables.
    - Production vs development setup.

- **Planned Improvements (Not Yet Implemented)**
  - `.env.example` with all variables and explanations.
  - Centralized environment validation and type-safe access helpers.

---

## UX & Future Enhancements (Planned / Partial)

> These are improvements described in `IMPLEMENTATION_ANALYSIS.md` as **medium** or **low priority**; they may be partially implemented or planned, but they define the intended feature set of the app.

- **Resume Match & Progress Scoring**
  - Overall match score between resume and job description.
  - Breakdown by:
    - Technical skills.
    - Experience alignment.
    - Theme coverage.
  - Visual progress bar that updates as the user edits their resume.

- **Gap Analysis & Contextual Suggestions**
  - Detailed explanation of:
    - Missing important keywords.
    - Under-emphasized themes.
  - Inline suggestions in:
    - Experience section.
    - Summary section.
    - Skills section.

- **Profession-Aware Bullet Patterns**
  - Adapts the "Action + Scope + Context + Outcome" pattern to different professions:
    - Software engineers, designers, lawyers, teachers, marketers, etc.
  - Avoids forcing numeric metrics where they don’t naturally apply.
  - Provides role-specific examples of strong bullet points.

- **Custom Sign-In / Sign-Up Pages**
  - Embedded sign-in/sign-up routes (`/sign-in`, `/sign-up`) with tailored layout and branding.
  - Ability to add marketing content, testimonials, and feature lists to auth pages.

- **Environment Variable Documentation & Validation**
  - `.env.example`, environment validation on startup, and type-safe env access helpers.
  - Dedicated documentation (`ENV_SETUP.md`) for local and production setup.

- **Advanced UX Enhancements**
  - Comparison view: job description vs. resume side-by-side.
  - Smart suggestions: "You should add experience with X", "Emphasize Y more".
  - Enhanced semantic theme detection beyond simple keyword matching.
  - Export and sharing of analysis results (PDF/text) and multiple job analyses.

