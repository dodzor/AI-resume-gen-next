# Testing Usage Tracking Functions

This guide explains how to test the usage tracking functions we've implemented.

## Quick Start

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:3000/test-usage
   ```

3. **Make sure you're signed in** (the page requires authentication)

## Test Page Features

The test page (`/app/test-usage/page.tsx`) provides:

### 1. **Current Usage Display**
- Shows your current plan tier
- Displays usage counts vs limits for each action type
- Shows billing period dates

### 2. **Action Checks**
- Real-time checks for each action type:
  - Job Analysis
  - AI Rewrite
  - Create Resume
  - Export PDF
- Shows if action is allowed and remaining quota

### 3. **Test Actions**
Buttons to test each function:
- **Initialize Usage**: Creates initial usage record (if doesn't exist)
- **Increment Job Analysis**: Tests incrementing job analysis counter
- **Increment AI Rewrite**: Tests incrementing AI rewrite counter
- **Increment Resume**: Tests incrementing resume counter
- **Upgrade to Pro**: Tests upgrading from free to pro plan
- **Downgrade to Free**: Tests downgrading from pro to free plan

### 4. **Test Results**
- Shows real-time results of each test action
- Displays success/error messages
- Timestamped for easy tracking

## Testing Scenarios

### Scenario 1: New User Initialization
1. Sign in as a new user (or clear your usage record)
2. Click "Initialize Usage"
3. Verify:
   - Plan is set to "free"
   - All counters are at 0
   - Billing period is set correctly

### Scenario 2: Free Tier Limits
1. Make sure you're on free plan
2. Click "Increment Job Analysis" 3 times
3. Verify:
   - Counter increases: 0 → 1 → 2 → 3
   - After 3rd increment, "Job Analysis" shows "❌ Limit reached"
   - Remaining shows 0

### Scenario 3: Upgrade to Pro
1. Start on free plan with some usage (e.g., 2 job analyses used)
2. Click "Upgrade to Pro"
3. Verify:
   - Plan changes to "pro"
   - Counters reset to 0 (because of upgrade)
   - All actions show "Unlimited"
   - Billing period resets to upgrade date

### Scenario 4: Billing Period Reset
1. Wait for billing period to expire (or manually adjust in database)
2. Perform any action
3. Verify:
   - Monthly counters reset to 0
   - Billing period updates to new period
   - Lifetime counters (resumes) are NOT reset

### Scenario 5: Export Feature Check
1. On free plan, check "Export PDF" action
2. Verify:
   - Shows "❌ PDF export is not available in your plan"
3. Upgrade to Pro
4. Verify:
   - Shows "✅ Allowed (Unlimited)"

## Testing via Convex Dashboard

You can also test functions directly in the Convex dashboard:

1. **Go to Convex Dashboard**: https://dashboard.convex.dev
2. **Select your project**
3. **Go to "Functions" tab**
4. **Test queries:**
   - `usage.getUserUsage` (no args needed)
   - `usage.canPerformAction` (args: `{ action: "job_analysis" }`)
5. **Test mutations:**
   - `usage.incrementUsage` (args: `{ action: "job_analysis" }`)
   - `usage.updateUserPlan` (args: `{ userId: "your-user-id", plan: "pro" }`)
   - `usage.initializeUserUsage` (no args needed)

## Expected Behavior

### Free Plan Limits:
- Job Analyses: 3/month
- AI Rewrites: 3/month
- Resumes: 1 lifetime
- PDF Export: Not available

### Pro Plan Limits:
- Job Analyses: Unlimited
- AI Rewrites: Unlimited
- Resumes: 10 lifetime
- PDF Export: Available (Unlimited)

### Enterprise Plan Limits:
- Everything: Unlimited

## Troubleshooting

### "Not authenticated" error
- Make sure you're signed in via Clerk
- Check that Convex auth is properly configured

### Counters not incrementing
- Check that mutations are being called successfully
- Verify in Convex dashboard that data is being written

### Billing period not resetting
- Queries can't mutate data - period reset happens in mutations
- Try calling `incrementUsage` to trigger period reset

### Upgrade not working
- Make sure you're passing the correct `userId`
- Check that `updateUserPlan` mutation is being called
- Verify in Convex dashboard that plan is updated

## Manual Database Inspection

You can inspect the `userUsage` table directly in Convex dashboard:

1. Go to "Data" tab in Convex dashboard
2. Select `userUsage` table
3. View records to verify:
   - `subscriptionStartDate` is set correctly
   - `periodStart` and `periodEnd` are correct
   - Counters are accurate
   - Plan tier is correct

## Next Steps

After testing, you can:
1. Integrate these functions into your API routes (Step 3.3)
2. Create frontend hooks (Step 4.1)
3. Build UI components (Step 4.2-4.4)
