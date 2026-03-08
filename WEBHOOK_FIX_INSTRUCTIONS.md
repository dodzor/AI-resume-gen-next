# Webhook Fix Instructions

## The Problem

The error occurred because `webhook` doesn't exist in `@clerk/nextjs/server`. Clerk uses the `svix` library for webhook signature verification.

## Solution

### Step 1: Install svix

Run this command in your terminal:

```bash
npm install svix
```

If you get permission errors, you may need to fix npm cache permissions first:
```bash
sudo chown -R $(whoami) ~/.npm
```

Then try installing again:
```bash
npm install svix
```

### Step 2: Verify the Fix

After installing `svix`, restart your Next.js dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Test the Webhook

1. Make sure your webhook URL in Clerk Dashboard is correct:
   ```
   https://your-ngrok-url.ngrok-free.app/api/webhooks/clerk
   ```

2. Test by sending a test event from Clerk Dashboard:
   - Go to Clerk Dashboard → Webhooks → Endpoints
   - Click on your endpoint
   - Click "Send Test Event"
   - Select `subscription.created`
   - Check your server logs

3. You should now see logs like:
   ```
   [requestId] ✅ Webhook signature verified
   [requestId] 📨 Event type: subscription.created
   ```

## What Changed

The webhook handler now:
- Uses `svix` library directly (instead of non-existent `webhook` from Clerk)
- Properly verifies webhook signatures using Svix
- Provides better error messages if `svix` is not installed

## Alternative: If npm install fails

If you can't install `svix` due to permission issues, you can:

1. Fix npm permissions:
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

2. Or use a different package manager:
   ```bash
   yarn add svix
   # or
   pnpm add svix
   ```

## Verification

After installing `svix`, the webhook should work. Check:
- ✅ No more "Export webhook doesn't exist" error
- ✅ Webhook requests return 200 OK
- ✅ Logs show "Webhook signature verified"
- ✅ Events are processed correctly
