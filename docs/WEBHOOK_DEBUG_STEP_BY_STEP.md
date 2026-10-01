# Webhook Debugging: Step-by-Step Guide

## Understanding the Webhook URL

**Important distinction:**
- **Webhook URL** = Where Clerk sends webhooks TO (configured in Clerk Dashboard)
- **CLERK_WEBHOOK_SECRET** = Secret key that goes in `.env.local` (for verification)

## Step 1: Verify Your Webhook URL in Clerk Dashboard

Based on your screenshot, you have an ngrok URL: `https://3d5e-81-18-88-11.ngrok-free.app`

### ✅ Correct Webhook URL Format:

The webhook URL in Clerk Dashboard should be:
```
https://3d5e-81-18-88-11.ngrok-free.app/api/webhooks/clerk
```

**NOT just:**
```
https://3d5e-81-18-88-11.ngrok-free.app
```

### How to Check/Update:

1. In Clerk Dashboard → Webhooks → Endpoints
2. Click "Edit" on your endpoint
3. Verify the URL includes `/api/webhooks/clerk` at the end
4. If not, update it to: `https://3d5e-81-18-88-11.ngrok-free.app/api/webhooks/clerk`
5. Save the changes

---

## Step 2: Get the Webhook Secret

### Where to Find It:

1. In Clerk Dashboard → Webhooks → Endpoints
2. Click on your endpoint (or click "Edit")
3. Look for **"Signing Secret"** or **"Webhook Secret"**
4. It will look like: `whsec_abc123xyz...` or similar
5. Click "Copy" or "Reveal" to see the full secret

### Add to `.env.local`:

Create or update `.env.local` in your project root:

```bash
# Clerk Webhook Secret (from Clerk Dashboard → Webhooks → Endpoints → Signing Secret)
CLERK_WEBHOOK_SECRET=whsec_your_secret_here

# Your other environment variables...
NEXT_PUBLIC_CONVEX_URL=your_convex_url
# etc.
```

**Important:**
- ✅ Add `CLERK_WEBHOOK_SECRET` to `.env.local`
- ❌ Do NOT add the webhook URL to `.env.local` (it's configured in Clerk Dashboard)

---

## Step 3: Verify Environment Variable is Loaded

### Test if Secret is Set:

1. Visit: `http://localhost:3000/api/webhooks/clerk/test`
2. It should show:
   ```json
   {
     "environment": {
       "hasWebhookSecret": true,  // ← Should be true
       "hasConvexUrl": true
     }
   }
   ```

If `hasWebhookSecret` is `false`:
- Check `.env.local` exists in project root
- Check `CLERK_WEBHOOK_SECRET` is spelled correctly
- Restart your Next.js dev server (`npm run dev`)
- Environment variables are only loaded on server start

---

## Step 4: Verify Webhook Endpoint is Accessible

### Test the Endpoint Directly:

1. Make sure your Next.js server is running: `npm run dev`
2. Make sure ngrok is running: `ngrok http 3000`
3. Test the endpoint:
   ```bash
   curl -X POST https://3d5e-81-18-88-11.ngrok-free.app/api/webhooks/clerk \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

**Expected response:**
- If secret is missing: `{"error": "Webhook secret not configured"}`
- If secret is wrong: Error about signature verification
- If working: Should process (even if test data fails validation)

---

## Step 5: Check Which Events Are Enabled

In Clerk Dashboard → Webhooks → Endpoints → [Your Endpoint]:

### Required Events:
- ✅ `user.created`
- ✅ `user.updated`
- ✅ `subscription.created` ← **Most important for upgrades**
- ✅ `subscription.updated` ← **Also important**
- ✅ `subscription.deleted`

### How to Enable:

1. Click on your endpoint
2. Go to "Events" or "Subscriptions" tab
3. Check the boxes for the events above
4. Save changes

---

## Step 6: Test Webhook Delivery

### Option A: Use Clerk's Test Feature

1. In Clerk Dashboard → Webhooks → Endpoints
2. Click on your endpoint
3. Look for "Send Test Event" or "Test" button
4. Select event type: `subscription.created`
5. Click "Send"
6. **Immediately check your server logs** (terminal where `npm run dev` is running)

### Option B: Create a Real Subscription

1. Go to `/pricing` page
2. Click "Upgrade to Pro"
3. Complete checkout
4. **Immediately check server logs**

### What to Look For in Logs:

```
[timestamp] [requestId] Webhook request received
[requestId] Payload received (X bytes)
[requestId] ✅ Webhook signature verified
[requestId] 📨 Event type: subscription.created
```

If you see these logs → ✅ Webhook is working!
If you don't see any logs → ❌ Webhook is not reaching your server

---

## Step 7: Check ngrok is Running

Since you're using ngrok for local development:

### Verify ngrok:

1. Check ngrok is running: `ngrok http 3000`
2. Verify the URL matches what's in Clerk Dashboard
3. **Important:** ngrok URLs change when you restart ngrok!
   - If you restart ngrok, you get a NEW URL
   - You MUST update the webhook URL in Clerk Dashboard to match

### ngrok URL Format:

```
https://[random-id]-[ip].ngrok-free.app
```

Example: `https://3d5e-81-18-88-11.ngrok-free.app`

---

## Step 8: Check Clerk Dashboard → Webhooks → Logs

1. Go to Clerk Dashboard → Webhooks
2. Click on "Logs" or "Activity" tab
3. Look for recent webhook delivery attempts
4. Check status:
   - ✅ **200 OK** = Success (webhook delivered)
   - ❌ **500/400** = Failed (check error message)
   - ⏱️ **Pending** = Still retrying

### If You See Failures:

Click on a failed delivery to see:
- Error message
- Response body
- Request headers
- This will tell you why it failed

---

## Common Issues & Solutions

### Issue 1: "Webhook secret not configured"

**Symptom:** Logs show: `CLERK_WEBHOOK_SECRET environment variable is not set`

**Solution:**
1. Check `.env.local` exists in project root (not in `app/` folder)
2. Verify `CLERK_WEBHOOK_SECRET=whsec_...` is in the file
3. Restart Next.js server: Stop and run `npm run dev` again
4. Environment variables only load on server start

---

### Issue 2: "Webhook signature verification failed"

**Symptom:** Error about signature verification

**Solution:**
1. Verify `CLERK_WEBHOOK_SECRET` in `.env.local` matches the secret in Clerk Dashboard
2. Copy the secret directly from Clerk Dashboard (don't type it manually)
3. Make sure there are no extra spaces or quotes in `.env.local`

---

### Issue 3: "404 Not Found" in Clerk Dashboard logs

**Symptom:** Clerk Dashboard shows 404 errors

**Solution:**
1. Verify webhook URL includes `/api/webhooks/clerk` at the end
2. Check ngrok is running and URL matches
3. Verify Next.js server is running on port 3000
4. Test the URL directly in browser (should show error, but not 404)

---

### Issue 4: No webhook logs at all

**Symptom:** No logs appear when subscription is created

**Possible causes:**
1. Webhook URL is wrong in Clerk Dashboard
2. ngrok URL changed (restarted ngrok)
3. Events not enabled in Clerk Dashboard
4. Subscription not actually created (payment failed)
5. Webhook endpoint not accessible from internet

**Solution:**
1. Verify webhook URL in Clerk Dashboard
2. Check ngrok is running and URL matches
3. Check events are enabled
4. Use Clerk's "Send Test Event" feature
5. Check Clerk Dashboard → Webhooks → Logs for delivery attempts

---

## Quick Checklist

Before testing, verify:

- [ ] Next.js server is running (`npm run dev`)
- [ ] ngrok is running (`ngrok http 3000`)
- [ ] Webhook URL in Clerk Dashboard: `https://[ngrok-url]/api/webhooks/clerk`
- [ ] `CLERK_WEBHOOK_SECRET` is in `.env.local` (project root)
- [ ] Next.js server was restarted after adding secret
- [ ] Events are enabled: `subscription.created`, `subscription.updated`
- [ ] Test endpoint works: `/api/webhooks/clerk/test` shows `hasWebhookSecret: true`

---

## Next Steps After Verification

Once webhooks are firing:

1. **Check the logs** for the full event data structure
2. **Verify plan extraction** is working (check `extractPlanTier` logs)
3. **Check Convex database** to see if plan is updated
4. **If plan is still "free"**, the issue is in plan extraction logic (not webhook delivery)

---

## Summary

**What goes in `.env.local`:**
```bash
CLERK_WEBHOOK_SECRET=whsec_your_secret_from_clerk_dashboard
```

**What goes in Clerk Dashboard:**
```
Webhook URL: https://your-ngrok-url.ngrok-free.app/api/webhooks/clerk
```

**The webhook URL itself does NOT go in `.env.local`** - it's configured in Clerk Dashboard.
