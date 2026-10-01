# Subscription Tier Implementation Plan

## Overview

This document outlines a comprehensive, step-by-step approach to implement subscription tier functionality with usage limits, based on the tier structure defined in `TIER_PLAN_DESIGN.md` and the gaps identified in `IMPLEMENTATION_ANALYSIS.md`.

---

## Phase 1: Backend Infrastructure (Foundation)

### Step 1.1: Define Plan Limits Configuration
**File**: `lib/plan-limits.ts` (new file)
**Effort**: 30 minutes
**Priority**: High

**Tasks**:
- Create TypeScript constants for plan limits based on `TIER_PLAN_DESIGN.md`:
  - Free: 3 job analyses/month, 1 resume, 3 bullet rewrites, 1 experience improvement, 1 summary generation
  - Pro: Unlimited job analyses, unlimited AI rewrites, 10 resumes, unlimited exports
  - Enterprise (future): All Pro features + advanced analytics
- Define TypeScript types: `PlanTier`, `ActionType`, `PlanLimits`
- Export helper functions: `getPlanLimits(tier)`, `isActionAllowed(tier, action)`
- Make limits easily configurable (single source of truth)

**Dependencies**: None
**Testing**: Unit tests for limit calculations

---

### Step 1.2: Extend Convex Schema for Usage Tracking
**File**: `convex/schema.ts` (modify existing)
**Effort**: 1 hour
**Priority**: High

**Tasks**:
- Add new `userUsage` table to schema:
  ```typescript
  userUsage: defineTable({
    userId: v.string(), // Clerk user ID
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")), // Current plan tier
    planUpdatedAt: v.number(), // When plan was last updated
    
    // Monthly usage counters (reset at billing period start)
    periodStart: v.number(), // Timestamp of current billing period start
    periodEnd: v.number(), // Timestamp of current billing period end
    
    // Usage counters
    jobAnalysesUsed: v.number(), // Count of job analyses this period
    aiRewritesUsed: v.number(), // Count of AI rewrites (bullet + experience + summary)
    resumesCreated: v.number(), // Count of resumes created (lifetime, not monthly)
    exportsUsed: v.number(), // Count of PDF exports this period
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) // Fast lookup by user
  ```
- Ensure backward compatibility (existing resumes table unchanged)
- Run Convex schema migration

**Dependencies**: None
**Testing**: Verify schema deployment, test index queries

---

### Step 1.3: Create Usage Tracking Functions
**File**: `convex/usage.ts` (new file)
**Effort**: 2-3 hours
**Priority**: High

**Tasks**:
- **Query: `getUserUsage`**
  - Get or create user usage record
  - Return current usage, limits, and plan tier
  - Handle billing period reset logic (if period expired, reset counters)
  - Returns: `{ plan, usage, limits, periodInfo }`
  
- **Query: `canPerformAction`**
  - Check if user can perform specific action
  - Parameters: `{ action: ActionType }` (e.g., 'job_analysis', 'ai_rewrite', 'create_resume', 'export')
  - Returns: `{ allowed: boolean, reason?: string, remaining?: number, upgradeRequired?: boolean }`
  - Logic:
    - Get user's plan and current usage
    - Check if action is allowed for plan tier
    - For monthly limits, check if counter < limit
    - For lifetime limits (like resume count), check total count
    - Return clear error messages for upgrade prompts
  
- **Mutation: `incrementUsage`**
  - Increment usage counter after successful operation
  - Parameters: `{ action: ActionType }`
  - Logic:
    - Get or create user usage record
    - Check if billing period expired → reset counters if needed
    - Increment appropriate counter
    - Update `updatedAt` timestamp
  - Should be idempotent (handle duplicate calls gracefully)
  
- **Mutation: `updateUserPlan`**
  - Update user's plan tier (called by webhook)
  - Parameters: `{ userId: string, plan: PlanTier }`
  - Logic:
    - Find user usage record
    - Update `plan` and `planUpdatedAt`
    - Optionally reset usage counters (if plan upgrade)
  
- **Mutation: `initializeUserUsage`**
  - Create initial usage record for new user
  - Called automatically when user first performs action
  - Sets plan to "free" by default

**Dependencies**: Step 1.1 (plan limits), Step 1.2 (schema)
**Testing**: 
- Test usage tracking accuracy
- Test billing period reset logic
- Test concurrent increment operations
- Test plan upgrade/downgrade scenarios

---

### Step 1.4: Create Monthly Reset Cron Job
**File**: `convex/crons.ts` (new file)
**Effort**: 1 hour
**Priority**: Low (can be done later, but recommended)

**Tasks**:
- Set up Convex cron job to reset monthly usage counters
- Schedule: First day of each month at midnight UTC
- Logic:
  - Query all `userUsage` records
  - Check if `periodEnd` < current timestamp
  - Reset monthly counters: `jobAnalysesUsed`, `aiRewritesUsed`, `exportsUsed`
  - Update `periodStart` and `periodEnd` to new billing period
  - Keep `resumesCreated` (lifetime counter, not reset)
- Handle edge cases (users with different billing cycles if needed)

**Dependencies**: Step 1.2 (schema), Step 1.3 (usage functions)
**Testing**: Test cron job execution, verify counter resets

---

## Phase 2: Clerk Webhook Integration

### Step 2.1: Create Clerk Webhook Handler
**File**: `app/api/webhooks/clerk/route.ts` (new file)
**Effort**: 2-3 hours
**Priority**: High

**Tasks**:
- Set up Next.js API route handler for Clerk webhooks
- Verify webhook signature using `CLERK_WEBHOOK_SECRET`
- Handle Clerk webhook events:
  - `user.created`: Initialize user usage record (plan: "free")
  - `user.updated`: Check if subscription metadata changed
  - `subscription.created`: Update plan tier from metadata
  - `subscription.updated`: Update plan tier (upgrade/downgrade)
  - `subscription.deleted`: Downgrade to "free" plan
- Extract plan tier from Clerk user metadata:
  - `user.publicMetadata.plan` or `user.publicMetadata.subscriptionTier`
  - Map Stripe price IDs to plan names if needed
- Call Convex mutation `updateUserPlan` to sync plan
- Return 200 OK to Clerk (required for webhook acknowledgment)

**Dependencies**: Step 1.3 (usage functions)
**Testing**:
- Test webhook signature verification
- Test each event type
- Test plan sync to Convex
- Use Clerk webhook testing tool or ngrok for local testing

**Environment Variables Needed**:
- `CLERK_WEBHOOK_SECRET` (from Clerk dashboard)

---

### Step 2.2: Configure Clerk Webhook in Dashboard
**Effort**: 15 minutes
**Priority**: High
**Status**: ✅ **COMPLETE** (Production configured)

**Tasks**:
- Go to Clerk Dashboard → Webhooks
- Create new webhook endpoint: `https://yourdomain.com/api/webhooks/clerk`
- Select events to listen to:
  - `user.created`
  - `user.updated`
  - `subscription.created` (if using Clerk billing)
  - `subscription.updated`
  - `subscription.deleted`
- Copy webhook secret to `.env.local`
- Test webhook delivery

**Dependencies**: Step 2.1 (webhook handler)
**Testing**: Send test webhook from Clerk dashboard

**Production Status**:
- ✅ Webhook configured for production domain
- ✅ Webhook secret set in Vercel production environment variables
- ✅ Webhook events tested and working

---

## Phase 3: API Route Protection & Usage Enforcement

### Step 3.1: Create API Authentication Utilities
**File**: `lib/api-auth.ts` (new file)
**Effort**: 30 minutes
**Priority**: High

**Tasks**:
- Create `requireAuth()` helper function:
  ```typescript
  export async function requireAuth(): Promise<{ userId: string } | { error: NextResponse }>
  ```
  - Uses `auth()` from `@clerk/nextjs/server`
  - Returns `userId` if authenticated
  - Returns `NextResponse` with 401 if not authenticated
- Create `getUserId()` helper (non-throwing version)
- Export types for auth results

**Dependencies**: None
**Testing**: Test auth helper with authenticated/unauthenticated requests

---

### Step 3.2: Create Usage Check Utilities
**File**: `lib/api-usage.ts` (new file)
**Effort**: 1 hour
**Priority**: High

**Tasks**:
- Create `checkUsageLimit()` helper function:
  ```typescript
  export async function checkUsageLimit(
    userId: string,
    action: ActionType,
    convex: ConvexHttpClient
  ): Promise<{ allowed: true } | { allowed: false, error: NextResponse }>
  ```
  - Calls Convex query `api.usage.canPerformAction`
  - Returns error response with upgrade prompt if limit exceeded
  - Returns success if allowed
- Create `incrementUsageAfterAction()` helper:
  - Calls Convex mutation `api.usage.incrementUsage` after successful operation
  - Handles errors gracefully (don't fail the main operation if increment fails)
- Map API routes to action types:
  - `/api/analyze-job-description` → `'job_analysis'`
  - `/api/rewrite-bullet` → `'ai_rewrite'`
  - `/api/improve-experience` → `'ai_rewrite'`
  - `/api/generate-summary` → `'ai_rewrite'`
  - `/api/generate-resume` → `'create_resume'` (check resume count)
  - `/api/generate-pdf` → `'export'`

**Dependencies**: Step 1.3 (usage functions), Step 3.1 (auth utilities)
**Testing**: Test usage checks, test increment after action

---

### Step 3.3: Update All API Routes with Auth + Usage Checks
**Files**: All `/app/api/**/route.ts` files (7 routes)
**Effort**: 2-3 hours
**Priority**: High

**Routes to Update**:
1. `/app/api/analyze-job-description/route.ts`
2. `/app/api/rewrite-bullet/route.ts`
3. `/app/api/improve-experience/route.ts`
4. `/app/api/generate-summary/route.ts`
5. `/app/api/generate-resume/route.ts`
6. `/app/api/generate-pdf/route.ts`
7. `/app/api/search/route.ts` (if it needs protection)

**Pattern for Each Route**:
```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const authResult = await requireAuth()
  if (!authResult.userId) return authResult.error
  
  const { userId } = authResult
  
  // 2. Check usage limit BEFORE processing
  const usageCheck = await checkUsageLimit(userId, 'job_analysis', convex)
  if (!usageCheck.allowed) return usageCheck.error
  
  // 3. Process request (existing logic)
  const result = await processRequest(...)
  
  // 4. Increment usage AFTER successful operation
  await incrementUsageAfterAction(userId, 'job_analysis', convex)
  
  // 5. Return result
  return NextResponse.json(result)
}
```

**Special Cases**:
- `/api/generate-resume`: Check resume count limit (lifetime, not monthly)
- `/api/generate-pdf`: Only check if user has Pro plan (free tier: basic export only)
- Error responses should include upgrade prompts:
  ```typescript
  {
    error: 'Usage limit exceeded',
    code: 'USAGE_LIMIT_EXCEEDED',
    message: 'You've used your free AI rewrites for this month.',
    upgradeRequired: true,
    action: 'ai_rewrite',
    remaining: 0,
    limit: 3
  }
  ```

**Dependencies**: Step 3.1 (auth), Step 3.2 (usage checks)
**Testing**: 
- Test each route with authenticated/unauthenticated requests
- Test usage limit enforcement
- Test upgrade prompts in error responses
- Test usage increment after successful operations

---

## Phase 4: Frontend Hooks & State Management

### Step 4.1: Create Usage Limits Hook
**File**: `hooks/useUsageLimits.ts` (new file) — Main hook that provides:
* Plan information (plan, isPro, isFree, isEnterprise)
* Usage data (jobAnalyses, aiRewrites, exports, resumes)
* Limits for each action type
* Permission checks (canRewrite, canAnalyze, canCreateResume, canExport)
* Remaining quotas for each action
* Loading states
**Effort**: 1-2 hours
**Priority**: High

**Tasks**:
- Create React hook `useUsageLimits()`:
  ```typescript
  export function useUsageLimits() {
    const usage = useQuery(api.usage.getUserUsage)
    
    return {
      plan: usage?.plan ?? 'free',
      isPro: usage?.plan === 'pro',
      isFree: usage?.plan === 'free',
      usage: usage?.usage ?? {},
      limits: usage?.limits ?? {},
      canRewrite: checkCanPerform('ai_rewrite', usage),
      canAnalyze: checkCanPerform('job_analysis', usage),
      canCreateResume: checkCanPerform('create_resume', usage),
      canExport: checkCanPerform('export', usage),
      isLoading: usage === undefined,
      remaining: {
        jobAnalyses: calculateRemaining('job_analysis', usage),
        aiRewrites: calculateRemaining('ai_rewrite', usage),
        resumes: calculateRemaining('create_resume', usage),
        exports: calculateRemaining('export', usage),
      }
    }
  }
  ```
- Use Convex `useQuery` for reactive updates
- Handle loading and error states
- Provide helper functions for checking specific actions
- Calculate remaining quota for each action type

useCanPerformAction(action) — Hook for real-time action checks with upgrade requirements

**Dependencies**: Step 1.3 (usage functions)
**Testing**: Test hook with different plan tiers, test reactive updates

---

### Step 4.2: Create Usage Display Component
**File**: `components/UsageDisplay.tsx` (new file)
**Effort**: 2-3 hours
**Priority**: Medium

**Tasks**:
- Create component to display current plan and usage:
  - Show plan badge (Free / Pro / Enterprise)
  - Progress bars for each quota:
    - Job Analyses: "3 / 3 used" (free) or "Unlimited" (pro)
    - AI Rewrites: "2 / 3 used" (free) or "Unlimited" (pro)
    - Resumes: "1 / 1 created" (free) or "3 / 10 created" (pro)
    - Exports: "0 / 0 used" (free) or "Unlimited" (pro)
  - Color coding:
    - Green: Under 50% used
    - Yellow: 50-80% used
    - Red: 80-100% used
  - "Upgrade to Pro" CTA button for free users
  - Link to pricing page
- Design: Match app's design system, use Tailwind classes
- Responsive: Works on mobile and desktop
- Placement: Can be in header, sidebar, or dedicated usage page

**Dependencies**: Step 4.1 (usage hook)
**Testing**: Test display with different usage levels, test upgrade CTA

---

### Step 4.3: Create Usage-Gated Button Component
**File**: `components/UsageGatedButton.tsx` (new file)
**Effort**: 1-2 hours
**Priority**: Medium

**Tasks**:
- Create wrapper component for action buttons:
  ```typescript
  <UsageGatedButton
    action="ai_rewrite"
    onClick={handleRewrite}
    className="..."
  >
    Rewrite Bullet ({remaining} left)
  </UsageGatedButton>
  ```
- Logic:
  - Check if action is allowed using `useUsageLimits()` hook
  - If allowed: Render button normally, show remaining count
  - If not allowed: 
    - Disable button
    - Show tooltip/helper text: "Upgrade to Pro for unlimited rewrites"
    - On click: Show upgrade modal instead of executing action
- Show remaining quota in button text: "Rewrite (2 left)" or "Rewrite (Unlimited)"
- Handle loading state (while checking usage)

**Dependencies**: Step 4.1 (usage hook), Step 4.4 (upgrade modal)
**Testing**: Test button states, test upgrade modal trigger

---

### Step 4.4: Create Upgrade Modal Component
**File**: `components/UpgradeModal.tsx` (new file)
**Effort**: 1-2 hours
**Priority**: Medium

**Tasks**:
- Create modal component for upgrade prompts:
  - Title: "Upgrade to Pro"
  - Message: Context-specific (e.g., "You've used your free AI rewrites. Upgrade for unlimited access.")
  - Feature list: Show what Pro includes
  - CTA button: "Upgrade to Pro" → Links to `/pricing` or Clerk checkout
  - Close button
- Triggered by:
  - Usage-gated buttons when limit reached
  - API error responses with `upgradeRequired: true`
  - Manual trigger from usage display
- Design: Modal overlay, centered content, matches app design
- Use headlessui or similar for accessibility

**Dependencies**: None (can use Clerk's pricing components)
**Testing**: Test modal open/close, test CTA navigation

---

## Phase 5: Frontend Integration

### Step 5.1: Integrate Usage Checks in Form Component
**File**: `components/form.tsx` (modify existing)
**Effort**: 2-3 hours
**Priority**: High

**Tasks**:
- Import `useUsageLimits()` hook
- Wrap action buttons with `UsageGatedButton`:
  - "Analyze Job Description" button → `action="job_analysis"`
  - "Rewrite Bullet" button → `action="ai_rewrite"`
  - "Improve Experience" button → `action="ai_rewrite"`
  - "Generate Summary" button → `action="ai_rewrite"`
- Add usage display component (header or sidebar)
- Handle API error responses:
  - Check for `upgradeRequired: true` in error response
  - Show upgrade modal when limit exceeded
- Update button text to show remaining quota:
  - "Rewrite Bullet (2 left)" for free users
  - "Rewrite Bullet (Unlimited)" for pro users
- Disable buttons when limit reached (with tooltip)

**Dependencies**: Step 4.1 (hook), Step 4.2 (display), Step 4.3 (gated button), Step 4.4 (modal)
**Testing**: 
- Test button states with different usage levels
- Test upgrade modal triggers
- Test API error handling

---

### Step 5.2: Integrate Resume Count Limit
**File**: `components/content.tsx` and `components/form.tsx` (modify existing)
**Effort**: 1 hour
**Priority**: Medium

**Tasks**:
- Check resume count limit before creating new resume:
  - Use `useUsageLimits()` to check `canCreateResume`
  - Show upgrade modal if free user tries to create 2nd resume
  - Disable "New Resume" button if limit reached
- Update resume switcher to show limit:
  - "1 / 1 resumes" for free users
  - "3 / 10 resumes" for pro users
- Handle resume creation in `saveResume` mutation:
  - Check limit before allowing new resume creation
  - Increment counter after successful creation

**Dependencies**: Step 4.1 (usage hook), Step 1.3 (usage functions)
**Testing**: Test resume creation limits, test upgrade prompts

---

**File**: `components/form.tsx` (mod### Step 5.3: Integrate Export Limit
ify existing)
**Effort**: 30 minutes
**Priority**: Medium

**Tasks**:
- Check export limit before PDF generation:
  - Free tier: Basic text export only (copy to clipboard)
  - Pro tier: PDF export available
- Show upgrade prompt if free user tries to export PDF:
  - "PDF export is available in Pro. Upgrade to download your resume as PDF."
- Update export button text based on plan:
  - Free: "Copy to Clipboard"
  - Pro: "Download PDF"

**Dependencies**: Step 4.1 (usage hook), Step 3.3 (API route protection)
**Testing**: Test export limits, test upgrade prompts

---

## Phase 6: Error Handling & User Experience

### Step 6.1: Create Error Handling Utilities
**File**: `lib/api-errors.ts` (new file)
**Effort**: 1 hour
**Priority**: Medium

**Tasks**:
- Create custom error classes:
  - `UsageLimitError`: For usage limit exceeded
  - `UnauthorizedError`: For authentication failures
  - `ForbiddenError`: For permission issues
- Create consistent error response format:
  ```typescript
  {
    error: string,
    code: string,
    message: string,
    details?: {
      upgradeRequired?: boolean,
      action?: ActionType,
      remaining?: number,
      limit?: number
    }
  }
  ```
- Create error handler for frontend:
  - Parse API error responses
  - Show appropriate UI (toast, modal, inline message)
  - Handle upgrade prompts consistently

**Dependencies**: None
**Testing**: Test error handling, test error message display

---

### Step 6.2: Add Toast Notifications for Usage Warnings
**File**: `components/UsageToast.tsx` (new file, optional)
**Effort**: 1 hour
**Priority**: Low

**Tasks**:
- Create toast notification component:
  - Show warning when user reaches 80% of limit
  - Show error when limit reached
  - Include upgrade CTA in toast
- Use react-hot-toast or similar library
- Trigger toasts:
  - After successful action (show remaining quota)
  - When limit approached (80% threshold)
  - When limit reached (with upgrade prompt)

**Dependencies**: Step 4.1 (usage hook)
**Testing**: Test toast triggers, test toast content

---

## Phase 7: Testing & Validation

### Step 7.1: Unit Tests for Backend Functions
**Files**: `convex/usage.test.ts` (new file, if using Convex testing)
**Effort**: 2-3 hours
**Priority**: Medium

**Tasks**:
- Test `getUserUsage` query:
  - New user initialization
  - Billing period reset logic
  - Usage counter accuracy
- Test `canPerformAction` query:
  - Free tier limits
  - Pro tier unlimited access
  - Edge cases (exactly at limit)
- Test `incrementUsage` mutation:
  - Counter increments correctly
  - Idempotency (duplicate calls)
  - Billing period handling
- Test `updateUserPlan` mutation:
  - Plan upgrade
  - Plan downgrade
  - Counter reset on upgrade

**Dependencies**: All Phase 1 steps
**Testing**: Run test suite, verify coverage

---

### Step 7.2: Integration Tests for API Routes
**Effort**: 2-3 hours
**Priority**: Medium

**Tasks**:
- Test each API route:
  - Unauthenticated requests → 401 error
  - Authenticated requests with limits → 403 error with upgrade prompt
  - Authenticated requests within limits → Success + usage increment
- Test usage tracking accuracy:
  - Verify counters increment correctly
  - Verify limits enforced correctly
  - Verify upgrade prompts shown correctly
- Test error responses:
  - Consistent error format
  - Upgrade prompts included
  - Proper HTTP status codes

**Dependencies**: All Phase 3 steps
**Testing**: Use Postman, curl, or automated test suite

---

### Step 7.3: End-to-End User Flow Testing
**Effort**: 2-3 hours
**Priority**: High

**Tasks**:
- Test free user flow:
  1. Sign up → Verify initial limits
  2. Perform actions → Verify counters increment
  3. Reach limit → Verify upgrade prompt
  4. Try to exceed limit → Verify blocked
- Test pro user flow:
  1. Upgrade to Pro → Verify plan updated
  2. Perform unlimited actions → Verify no limits
  3. Verify usage display shows "Unlimited"
- Test upgrade flow:
  1. Click upgrade CTA → Navigate to pricing
  2. Complete checkout → Verify webhook updates plan
  3. Return to app → Verify Pro features unlocked
- Test billing period reset:
  1. Use all free tier limits
  2. Wait for/reset billing period
  3. Verify counters reset
  4. Verify actions allowed again

**Dependencies**: All previous phases
**Testing**: Manual testing, consider Playwright for automation

---

## Phase 8: Documentation & Deployment

### Step 8.1: Update Environment Variables Documentation
**File**: `.env.example` (new file), `README.md` (update)
**Effort**: 30 minutes
**Priority**: High

**Tasks**:
- Add `CLERK_WEBHOOK_SECRET` to `.env.example`
- Document webhook setup in README
- Add instructions for Clerk webhook configuration
- Document plan limits configuration

**Dependencies**: Step 2.1 (webhook handler)
**Testing**: Verify documentation is clear and complete

---

### Step 8.2: Create Migration Guide
**File**: `MIGRATION_GUIDE.md` (new file)
**Effort**: 1 hour
**Priority**: Medium

**Tasks**:
- Document deployment steps:
  1. Deploy Convex schema changes
  2. Deploy backend functions
  3. Configure Clerk webhook
  4. Deploy frontend changes
  5. Verify webhook delivery
  6. Test with test user
- Document rollback procedure
- Document monitoring and debugging tips

**Dependencies**: All previous phases
**Testing**: Follow migration guide in staging environment

---

## Implementation Order & Dependencies

### Recommended Implementation Sequence:

1. **Week 1: Backend Foundation**
   - Step 1.1: Plan limits config
   - Step 1.2: Convex schema
   - Step 1.3: Usage tracking functions
   - Step 3.1: API auth utilities
   - Step 3.2: Usage check utilities

2. **Week 1-2: API Protection**
   - Step 3.3: Update all API routes
   - Step 2.1: Clerk webhook handler
   - Step 2.2: Configure Clerk webhook

3. **Week 2: Frontend Foundation**
   - Step 4.1: Usage limits hook
   - Step 4.2: Usage display component
   - Step 4.3: Usage-gated button
   - Step 4.4: Upgrade modal

4. **Week 2-3: Frontend Integration**
   - Step 5.1: Integrate in form component
   - Step 5.2: Resume count limit
   - Step 5.3: Export limit

5. **Week 3: Polish & Testing**
   - Step 6.1: Error handling
   - Step 6.2: Toast notifications (optional)
   - Step 7.1-7.3: Testing
   - Step 1.4: Cron job (can be done anytime)

6. **Week 3-4: Documentation & Deployment**
   - Step 8.1: Environment docs
   - Step 8.2: Migration guide
   - Final testing and deployment

---

## Critical Success Factors

1. **Backend First**: Complete all backend infrastructure before frontend integration
2. **Incremental Testing**: Test each phase before moving to next
3. **Error Handling**: Comprehensive error handling from the start
4. **User Experience**: Clear upgrade prompts, not frustrating paywalls
5. **Monitoring**: Track usage patterns and conversion rates
6. **Flexibility**: Make limits easily configurable for A/B testing

---

## Risk Mitigation

1. **Webhook Failures**: Implement retry logic, manual sync option
2. **Usage Tracking Accuracy**: Add audit logs, reconciliation checks
3. **Performance**: Index database properly, cache usage queries
4. **User Confusion**: Clear messaging, helpful tooltips, support docs
5. **Revenue Impact**: Monitor conversion rates, adjust limits if needed

---

## Future Enhancements (Post-MVP)

1. **Usage Analytics Dashboard**: For users to see detailed usage history
2. **Billing Period Customization**: Per-user billing cycles
3. **Trial Periods**: Free Pro trial for new users
4. **Usage Alerts**: Email notifications when approaching limits
5. **Enterprise Features**: Advanced analytics, team management
6. **One-Time Purchase Option**: $29 resume pack as alternative to subscription

---

## Production Status

### ✅ Production Payments & Billing - COMPLETE

**Status**: Production payment processing is fully operational.

**Completed Setup**:
- ✅ **Production Clerk Instance**: Created and configured with production API keys
- ✅ **Stripe Account**: Connected to Clerk production instance
- ✅ **Billing Configuration**: Clerk Billing enabled with subscription plans
- ✅ **Payment Processing**: Credit card payments working in production
- ✅ **Pricing Page**: Functional with live payment processing (no longer blank)
- ✅ **Custom Domains**: `clerk.rolemirror.com` and `accounts.rolemirror.com` DNS verified
- ✅ **Google OAuth**: Configured for production with OAuth credentials
- ✅ **Environment Variables**: Production keys configured in Vercel (separate from dev)
- ✅ **Convex Configuration**: Production Convex deployment configured with production Clerk Frontend API URL

**Payment Flow Verified**:
- Users can view pricing plans on `/pricing` page
- Credit card payment processing works end-to-end
- Subscription creation triggers Clerk webhooks
- Plan tier syncing to Convex `userUsage` table working
- Usage limits enforced based on subscription tier

**Next Steps**:
- Monitor payment processing and webhook delivery
- Track subscription conversion rates
- Monitor usage patterns and adjust limits if needed
- Consider adding trial periods or promotional offers

---

## Notes

- This plan assumes Clerk handles subscription billing (via Stripe integration)
- If using custom billing, adjust webhook events accordingly
- Plan limits can be adjusted based on user feedback and conversion data
- Consider A/B testing different limit configurations
- Monitor AI API costs closely - usage limits directly impact costs
- ✅ **Production payments are now live** - real credit card transactions are processing successfully