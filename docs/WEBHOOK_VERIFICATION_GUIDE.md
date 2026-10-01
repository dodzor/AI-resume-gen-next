# Webhook Verification Guide

This guide helps you verify that Clerk webhook events are being received and processed correctly.

## Enhanced Logging

The webhook handler now includes comprehensive logging with:
- Request IDs for tracking individual webhook calls
- Timestamps for each log entry
- Full event data structure logging
- Detailed plan extraction logging
- Error stack traces

## How to Check Webhook Logs

### 1. **Check Your Server Logs**

#### If running locally (`npm run dev`):
- Check your terminal/console where Next.js is running
- Look for logs starting with `[requestId]` and timestamps
- Example log output:
  ```
  [2024-01-15T10:30:00.000Z] [abc123] Webhook request received
  [abc123] Payload received (1234 bytes)
  [abc123] ✅ Webhook signature verified
  [abc123] 📨 Event type: subscription.created
  [abc123] 📦 Full event data: {...}
  ```

#### If deployed (Vercel, etc.):
- Go to your deployment platform's logs dashboard
- Filter for `/api/webhooks/clerk` route
- Look for the same log patterns

### 2. **Check Clerk Dashboard**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** section
3. Find your webhook endpoint
4. Check the **Delivery** tab to see:
   - Recent webhook deliveries
   - Success/failure status
   - Response codes
   - Retry attempts

### 3. **Test Webhook Endpoint**

Visit: `http://localhost:3000/api/webhooks/clerk/test` (or your deployed URL)

This will show:
- Whether webhook secret is configured
- Whether Convex URL is configured
- Basic connectivity check

### 4. **What to Look For in Logs**

#### ✅ **Successful Webhook Receipt:**
```
[timestamp] [requestId] Webhook request received
[requestId] Payload received (X bytes)
[requestId] ✅ Webhook signature verified
[requestId] 📨 Event type: subscription.created
```

#### ✅ **Plan Extraction:**
```
[extractPlanTier] Extracting plan tier from event type: subscription.created
[extractPlanTier] Subscription data: {...}
[extractPlanTier] Subscription.priceId: price_abc123
[extractPlanTier] Found plan in subscription.publicMetadata.plan: pro
```

#### ✅ **Successful Update:**
```
[handleSubscriptionCreated] ✅ Successfully updated user user_abc123 to plan pro
[requestId] ✅ Webhook processing completed successfully
```

#### ❌ **Common Issues:**

**No user ID found:**
```
[handleSubscriptionCreated] ❌ No user ID found in event data
[handleSubscriptionCreated] Event data structure: {...}
```
→ Check the event data structure to see where userId is stored

**Plan extraction fails:**
```
[extractPlanTier] No plan found, defaulting to 'free'
```
→ The subscription data doesn't contain plan information in expected format
→ Check the logged subscription data structure

**Webhook signature verification fails:**
```
Error processing Clerk webhook: Webhook verification failed
```
→ Check that `CLERK_WEBHOOK_SECRET` matches the secret in Clerk Dashboard

## Testing Webhook Events

### Option 1: Use Clerk Dashboard Test Feature

1. Go to Clerk Dashboard → Webhooks
2. Click on your webhook endpoint
3. Use the "Send Test Event" feature
4. Select event type: `subscription.created` or `subscription.updated`
5. Check your logs for the test event

### Option 2: Create a Real Subscription

1. Go to your `/pricing` page
2. Click "Upgrade to Pro" (or your Pro plan)
3. Complete the checkout process
4. Immediately check your server logs
5. You should see `subscription.created` or `subscription.updated` events

### Option 3: Use ngrok for Local Testing

If testing locally:

```bash
# Terminal 1: Start your Next.js app
npm run dev

# Terminal 2: Expose localhost with ngrok
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Update Clerk Dashboard webhook URL to: https://abc123.ngrok.io/api/webhooks/clerk
```

## What the Logs Will Tell You

### 1. **Is the webhook being received?**
- Look for: `Webhook request received`
- If missing: Webhook URL might be wrong or not accessible

### 2. **Is signature verification working?**
- Look for: `✅ Webhook signature verified`
- If missing: Check `CLERK_WEBHOOK_SECRET` environment variable

### 3. **What event type is being sent?**
- Look for: `📨 Event type: subscription.created`
- This tells you which Clerk event is firing

### 4. **What data is in the event?**
- Look for: `📦 Full event data: {...}`
- This shows the complete event structure from Clerk
- **This is the most important log** - it shows exactly what Clerk is sending

### 5. **Can we extract the user ID?**
- Look for: `Extracted userId: user_abc123`
- If missing: Check the event data structure to find where userId is stored

### 6. **Can we extract the plan tier?**
- Look for: `Extracted plan: pro`
- If showing `free` when it should be `pro`: The plan extraction logic needs to be updated based on the actual event data structure

## Next Steps After Verification

Once you see the logs:

1. **If webhooks are NOT being received:**
   - Verify webhook URL in Clerk Dashboard
   - Check webhook is enabled
   - Verify webhook secret matches

2. **If webhooks ARE received but plan is wrong:**
   - Look at the `Full event data` log
   - Find where the plan/price ID is stored
   - Update `extractPlanTier()` function to read from the correct field
   - Consider implementing price ID to plan tier mapping

3. **If user ID is missing:**
   - Check the event data structure in logs
   - Update `getUserId()` function to read from the correct field

## Quick Debug Checklist

- [ ] Webhook URL is correct in Clerk Dashboard
- [ ] `CLERK_WEBHOOK_SECRET` is set in environment variables
- [ ] Webhook events are enabled in Clerk Dashboard (subscription.created, subscription.updated)
- [ ] Server logs are accessible
- [ ] Test subscription creation triggers webhook
- [ ] Logs show full event data structure
- [ ] Plan extraction is working (or shows what needs to be fixed)

## Common Event Data Structures

Based on Clerk's webhook documentation, subscription events typically include:

```json
{
  "type": "subscription.created",
  "data": {
    "id": "sub_abc123",
    "userId": "user_xyz789",  // or "user_id"
    "priceId": "price_pro_monthly",
    "productId": "prod_abc123",
    "status": "active",
    "publicMetadata": {
      "plan": "pro"  // May or may not be set automatically
    }
  }
}
```

**Note:** The actual structure may vary. Check your logs to see the exact structure!
