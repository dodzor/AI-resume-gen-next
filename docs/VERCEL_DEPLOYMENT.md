# Vercel Deployment Guide

This guide will help you deploy your AI Resume Generator app to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your app's dependencies configured (already done)
3. Environment variables ready

## Step 1: Install Dependencies

Make sure to install the updated dependencies:

```bash
npm install
```

The app uses:
- `puppeteer` (for local development - includes bundled Chromium)
- `puppeteer-core` (for Vercel serverless functions)
- `@sparticuz/chromium` (bundled Chromium for Vercel serverless functions)

The code automatically detects the environment and uses the appropriate package:
- **Vercel**: Uses `puppeteer-core` + `@sparticuz/chromium`
- **Local**: Uses full `puppeteer` package

## Step 2: Set Up Environment Variables

In your Vercel project dashboard, go to **Settings → Environment Variables** and add the following:

### Required Environment Variables

1. **`NEXT_PUBLIC_CONVEX_URL`**
   - Your Convex deployment URL
   - Format: `https://your-deployment.convex.cloud`
   - Available to: Production, Preview, Development

2. **`CLERK_WEBHOOK_SECRET`**
   - Your Clerk webhook signing secret
   - Found in Clerk Dashboard → Webhooks → Your webhook → Signing Secret
   - Available to: Production, Preview, Development

3. **`OPENAI_API_KEY`**
   - Your OpenAI API key
   - Found in OpenAI Dashboard → API Keys
   - Available to: Production, Preview, Development

4. **`CLERK_FRONTEND_API_URL`**
   - Your Clerk frontend API URL (for Convex authentication)
   - Format: `https://your-app.clerk.accounts.dev`
   - Available to: Production, Preview, Development

### Optional (if using Clerk environment variables)

5. **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**
   - Your Clerk publishable key
   - Available to: Production, Preview, Development

6. **`CLERK_SECRET_KEY`**
   - Your Clerk secret key
   - Available to: Production, Preview, Development

**Note**: You can deploy without `CLERK_WEBHOOK_SECRET` initially, but you'll need to add it after deployment (see Step 4).

## Step 3: Deploy to Vercel

**Deploy first to get your Vercel URL**, then configure the webhook in Step 4.

### Option A: Deploy via Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

5. **Copy your deployment URL** - You'll see something like:
   ```
   https://your-app-name.vercel.app
   ```
   Save this URL - you'll need it for the next step!

### Option B: Deploy via GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Vercel will automatically detect it's a Next.js app
5. Add your environment variables in the setup wizard
6. Click "Deploy"
7. **Copy your deployment URL** from the Vercel dashboard after deployment completes

## Step 4: Configure Clerk Webhook

Now that you have your Vercel URL, configure the webhook:

1. Go to your Clerk Dashboard → Webhooks
2. Click "Add Endpoint" or "Create Endpoint"
3. Enter your webhook URL: `https://your-vercel-app.vercel.app/api/webhooks/clerk`
   - Replace `your-vercel-app.vercel.app` with your actual Vercel deployment URL
4. Select the events you need:
   - `user.created`
   - `user.updated`
   - `user.deleted` (if needed)
   - Any subscription-related events (if using Clerk subscriptions)
5. Click "Create" or "Save"
6. **Copy the Signing Secret** - It will look like `whsec_...`
7. Go back to Vercel → Your Project → Settings → Environment Variables
8. Add `CLERK_WEBHOOK_SECRET` with the signing secret you just copied
9. **Redeploy** your app (or wait for automatic redeploy if using GitHub integration)

**Note**: The webhook won't work until you add `CLERK_WEBHOOK_SECRET` to Vercel and redeploy. This is normal - you can deploy first, then configure the webhook.

## Step 5: Verify Deployment

After deployment, verify:

1. ✅ Your app loads at the Vercel URL
2. ✅ Authentication works (Clerk login)
3. ✅ Resume generation works
4. ✅ PDF export works (this uses Puppeteer, which should now work on Vercel)
5. ✅ Webhooks are receiving events (check Clerk dashboard)

## Important Notes

### Puppeteer on Vercel

The app has been configured to use `@sparticuz/chromium` which is compatible with Vercel's serverless functions. The PDF generation endpoint (`/api/generate-pdf`) has been configured with:
- Maximum duration: 60 seconds (in `vercel.json`)
- Automatic detection of Vercel environment
- Optimized Chromium arguments for serverless

### Function Timeouts

- The PDF generation function has a 60-second timeout (configured in `vercel.json`)
- If you need longer timeouts, upgrade to Vercel Pro plan (up to 300 seconds)

### Build Configuration

The app uses Next.js 15.5.3 with Turbopack. Vercel will automatically:
- Detect Next.js
- Run `npm run build` (which uses `--turbopack`)
- Optimize the build

## Troubleshooting

### PDF Generation Fails

If PDF generation fails on Vercel:
1. Check function logs in Vercel dashboard
2. Verify `@sparticuz/chromium` is installed
3. Check that the function timeout is sufficient (60s default)

### Environment Variables Not Working

1. Ensure variables are set for the correct environments (Production/Preview/Development)
2. Redeploy after adding new environment variables
3. Check variable names match exactly (case-sensitive)

### Clerk Webhook Issues

1. **"I don't have a Vercel URL yet"**: Deploy first (Step 3), then configure the webhook (Step 4) with your deployment URL
2. Verify webhook URL is correct: `https://your-app.vercel.app/api/webhooks/clerk`
3. Check webhook secret matches in both Clerk and Vercel
4. Make sure you've redeployed after adding `CLERK_WEBHOOK_SECRET` to Vercel
5. Review webhook logs in Clerk dashboard to see delivery status

## Next Steps

After successful deployment:
1. Set up a custom domain (optional)
2. Configure preview deployments for pull requests
3. Set up monitoring and error tracking
4. Configure analytics (if needed)

## Support

For issues specific to:
- **Vercel**: Check [Vercel Documentation](https://vercel.com/docs)
- **Next.js**: Check [Next.js Documentation](https://nextjs.org/docs)
- **Puppeteer on Vercel**: Check [@sparticuz/chromium](https://github.com/Sparticuz/chromium)
