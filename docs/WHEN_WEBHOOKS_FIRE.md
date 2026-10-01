# When Webhooks Should Be Received in This App

This document explains when and why Clerk webhook events should be received in your application.

## Webhook Event Timeline

### 1. **User Registration/Sign-Up** → `user.created`

**When it fires:**
- Immediately when a new user signs up through Clerk
- This happens when a user creates an account (via sign-up form, OAuth, etc.)

**Expected timing:**
- **Immediate** (within seconds of account creation)

**What your app does:**
- Initializes a new `userUsage` record in Convex
- Sets plan to `"free"` by default
- Creates initial billing period

**How to verify:**
- Check logs for: `[handleUserCreated] Initializing user user_abc123 with plan free`
- Check Convex dashboard for new `userUsage` record

---

### 2. **User Upgrades to Pro** → `subscription.created` or `subscription.updated`

**When it fires:**
- When a user completes checkout on `/pricing` page using Clerk's `<PricingTable />` component
- Clerk creates a subscription in Stripe (if integrated)
- Clerk then sends webhook event to your app

**Expected timing:**
- **Within 1-5 seconds** after successful checkout completion
- May be slightly delayed if Clerk needs to process payment with Stripe first

**User flow:**
```
1. User visits /pricing page
2. User clicks "Upgrade to Pro" button
3. Clerk PricingTable opens checkout modal
4. User enters payment details
5. Payment is processed (Stripe)
6. Clerk creates subscription record
7. ⚡ WEBHOOK FIRES: subscription.created
8. Your webhook handler updates Convex userUsage.plan = "pro"
9. User sees Pro features unlocked (may need page refresh)
```

**What your app does:**
- Receives `subscription.created` or `subscription.updated` event
- Extracts plan tier from subscription data
- Updates `userUsage.plan` in Convex to `"pro"`
- Resets usage counters (if `subscription.created`)

**How to verify:**
- Check logs immediately after checkout:
  ```
  [requestId] 📨 Event type: subscription.created
  [handleSubscriptionCreated] Extracted plan: pro
  [handleSubscriptionCreated] ✅ Successfully updated user user_abc123 to plan pro
  ```
- Check Clerk Dashboard → Webhooks → Delivery tab
- Check Convex `userUsage` table - `plan` field should be `"pro"`

---

### 3. **Subscription Changes** → `subscription.updated`

**When it fires:**
- User upgrades from one plan to another (e.g., Free → Pro → Enterprise)
- User downgrades plan
- Subscription status changes (active → canceled → active)
- Billing cycle changes
- Payment method updated

**Expected timing:**
- **Within 1-5 seconds** after the change is processed

**What your app does:**
- Updates `userUsage.plan` in Convex
- Does NOT reset counters (preserves usage history)

---

### 4. **Subscription Cancellation** → `subscription.deleted`

**When it fires:**
- User cancels their subscription
- Subscription expires and is not renewed
- Payment fails and subscription is terminated

**Expected timing:**
- **Within 1-5 seconds** after cancellation/expiration

**What your app does:**
- Sets `userUsage.plan` back to `"free"`
- Keeps usage counters (user retains their data)

---

### 5. **User Metadata Updates** → `user.updated`

**When it fires:**
- User's public/private metadata is updated
- This can happen if you manually update metadata via Clerk API
- Or if Clerk automatically updates metadata based on subscription

**Expected timing:**
- **Immediate** when metadata changes

**Note:** This is less reliable for subscription tracking. Prefer `subscription.created/updated` events.

---

## Expected Webhook Flow for Subscription Upgrade

Here's the complete timeline when a user upgrades to Pro:

```
T+0s    User clicks "Upgrade to Pro" on /pricing page
        ↓
T+1s    Clerk PricingTable opens checkout modal
        ↓
T+5s    User enters payment details and submits
        ↓
T+6s    Stripe processes payment
        ↓
T+7s    Clerk creates subscription record
        ↓
T+8s    ⚡ WEBHOOK: subscription.created fires
        ↓
T+8s    Your webhook handler receives event
        ↓
T+8s    Handler extracts plan tier from event data
        ↓
T+9s    Handler calls Convex mutation: updateUserPlan
        ↓
T+9s    Convex updates userUsage.plan = "pro"
        ↓
T+10s   ✅ Plan updated in database
        ↓
T+10s   User refreshes page or navigates
        ↓
T+10s   Frontend queries useUsageLimits()
        ↓
        Frontend sees plan = "pro" and unlocks Pro features
```

**Total expected time: ~10 seconds from checkout to feature unlock**

---

## When Webhooks Might NOT Fire

### 1. **Webhook Not Configured**
- Webhook URL not set in Clerk Dashboard
- Webhook secret not configured in environment variables
- Webhook endpoint not accessible (wrong URL, server down)

### 2. **Webhook Events Not Enabled**
- In Clerk Dashboard → Webhooks, ensure these events are selected:
  - ✅ `subscription.created`
  - ✅ `subscription.updated`
  - ✅ `subscription.deleted`
  - ✅ `user.created`
  - ✅ `user.updated`

### 3. **Payment Processing Issues**
- If payment fails, subscription won't be created → no webhook
- If Stripe integration is misconfigured, subscription creation may fail

### 4. **Webhook Delivery Failures**
- Webhook handler returns error (500 status)
- Network issues preventing webhook delivery
- Webhook signature verification fails

### 5. **Development/Testing Environment**
- Local development: Webhooks won't reach `localhost:3000`
- Need to use ngrok or similar tool to expose local server
- Or test in deployed environment

---

## How to Verify Webhooks Are Firing

### Method 1: Check Server Logs (Best)

After user upgrades:
1. Immediately check your server logs
2. Look for webhook receipt logs:
   ```
   [timestamp] [requestId] Webhook request received
   [requestId] 📨 Event type: subscription.created
   ```

### Method 2: Check Clerk Dashboard

1. Go to Clerk Dashboard → Webhooks
2. Click on your webhook endpoint
3. Check "Delivery" tab
4. Look for recent webhook attempts with:
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed (check error message)
   - ⏱️ Pending = Still retrying

### Method 3: Check Convex Database

1. Go to Convex Dashboard
2. Open `userUsage` table
3. Find the user who upgraded
4. Check if `plan` field is `"pro"` (should update within seconds)

### Method 4: Test Endpoint

Visit: `/api/webhooks/clerk/test`
- Shows if webhook configuration is correct
- Verifies environment variables are set

---

## Troubleshooting: Webhooks Not Firing

### If webhook doesn't fire after checkout:

1. **Check Clerk Dashboard:**
   - Is webhook URL correct? (should be `https://yourdomain.com/api/webhooks/clerk`)
   - Are subscription events enabled?
   - Check Delivery tab for failed attempts

2. **Check Server Logs:**
   - Are there any webhook receipt logs at all?
   - If no logs: Webhook URL might be wrong or server unreachable
   - If logs show errors: Check error messages

3. **Check Subscription Creation:**
   - In Clerk Dashboard → Users → [User] → Subscriptions
   - Was subscription actually created?
   - If no subscription: Payment might have failed

4. **Test Webhook Manually:**
   - In Clerk Dashboard → Webhooks → "Send Test Event"
   - Select `subscription.created`
   - Check if test event reaches your server

5. **Verify Environment:**
   - Is `CLERK_WEBHOOK_SECRET` set correctly?
   - Does it match the secret in Clerk Dashboard?
   - Is webhook endpoint accessible from internet? (not localhost)

---

## Expected Behavior Summary

| User Action | Webhook Event | Timing | What Happens |
|------------|---------------|--------|--------------|
| User signs up | `user.created` | Immediate | Creates userUsage record with plan="free" |
| User upgrades to Pro | `subscription.created` | 1-5 seconds | Updates userUsage.plan="pro", resets counters |
| User changes plan | `subscription.updated` | 1-5 seconds | Updates userUsage.plan, keeps counters |
| User cancels | `subscription.deleted` | 1-5 seconds | Sets userUsage.plan="free", keeps counters |
| Metadata updated | `user.updated` | Immediate | Updates plan if metadata changed |

---

## Key Takeaways

1. **Webhooks fire AFTER subscription is created**, not during checkout
2. **Timing is usually 1-5 seconds** after successful payment
3. **Check logs immediately** after checkout to see webhook receipt
4. **If webhooks don't fire**, check:
   - Webhook configuration in Clerk Dashboard
   - Server accessibility
   - Event types enabled
   - Payment/subscription actually succeeded

5. **The app should update within ~10 seconds** of successful checkout

---

## Next Steps

If webhooks are not firing:
1. Follow the troubleshooting steps above
2. Check the enhanced logs we added (they show exactly what's happening)
3. Verify webhook configuration in Clerk Dashboard
4. Test with Clerk's "Send Test Event" feature
5. Check if subscription is actually being created in Clerk

If webhooks ARE firing but plan isn't updating:
1. Check the `📦 Full event data` log to see event structure
2. Verify `extractPlanTier()` is reading from correct fields
3. Check if plan extraction logic needs to map price IDs to plan tiers
