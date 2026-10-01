## Clerk Production Instance Setup

This guide explains how to create and connect a **production** Clerk instance to this app so you can use real users and real payment methods (e.g. via Stripe) in production. No code changes are required for these steps.

---

### 1. Create a Production Clerk Instance

- **Sign in** to the Clerk dashboard (`https://dashboard.clerk.com`).
- In the top-left, open the **instance switcher** (it usually shows the name of your current dev instance).
- Click **“Create new”** (or **“New instance”**) and choose:
  - **Environment type**: `Production`
  - **Name**: something like `AI Resume Gen - Production`
- Finish the creation wizard.

---

### 2. Configure Paths / Allowed URLs for Production

Inside your new **production** instance:

- Go to **Configure → User & authentication → Paths**.
- Under **Application paths**, set:
  - **Home URL**: `https://rolemirror.com`
  - **Unauthorized sign in URL**: `https://accounts.rolemirror.com/sign-in`  
    (or the exact Account Portal sign-in URL that Clerk shows for your instance)
- Under **Component paths**, keep using the **Account Portal** options:
  - **`<SignIn />`**
    - Select **“Sign-in page on Account Portal”**.
    - URL: `https://accounts.rolemirror.com/sign-in` (or the Clerk-provided Account Portal sign-in URL).
  - **`<SignUp />`**
    - Select **“Sign-up page on Account Portal”**.
    - URL: `https://accounts.rolemirror.com/sign-up` (or the Clerk-provided Account Portal sign-up URL).
  - **Signing Out**
    - Select **“Sign-in page on Account Portal”**.
    - URL: `https://accounts.rolemirror.com/sign-in`.
- Save changes.

> **Note**: For the `accounts.rolemirror.com` URLs to work, you must also complete the **Connect domains** step in Clerk (see Step 7.3) and create the required DNS records. Until that’s done, Clerk may serve your Account Portal on a Clerk-hosted domain; in that case, use the exact URLs Clerk provides in the Paths screen.

---

### 3. Get Production API Keys from Clerk

In the production instance:

- Go to **Developers → API Keys** (or **API Keys & Webhooks**).
- Note/copy these keys:
  - **Publishable key** (frontend): usually named `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or shown as “Publishable key”.
  - **Secret key** (backend): usually named `CLERK_SECRET_KEY`.
- Keep the **secret key** private; do not commit it to git.

If your app uses additional Clerk environment variables (for example `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `CLERK_JWT_KEY`), note those values as well from the dashboard.

---

### 4. Set Clerk Production Environment Variables (Vercel)

In your **Vercel** project for this app:

- Open the project in the Vercel dashboard.
- Go to **Settings → Environment Variables**.

**If you already have Clerk env vars set (e.g. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` with a test key):**

- **Option A: Edit the existing variable** (recommended):
  - Find the existing variable (e.g. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) in the list.
  - Click the **three dots (⋯)** or **Edit** button next to it.
  - In the edit dialog, you’ll see checkboxes for **Development**, **Preview**, and **Production**.
  - **Uncheck** **Development** and **Preview** (to keep the test key for those environments).
  - **Check** **Production**.
  - **Change the value** to the **production** Clerk key (from Step 3).
  - Save.
- **Option B: Add a new variable with the same name**:
  - Click **Add New**.
  - Enter the same variable name (e.g. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).
  - **Only check** the **Production** checkbox (leave Development and Preview unchecked).
  - Enter the **production** Clerk key as the value.
  - Save.

**For each Clerk environment variable you need in production:**

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → the **publishable key** from the **production** Clerk instance (starts with `pk_live_...`).
- `CLERK_SECRET_KEY` → the **secret key** from the **production** Clerk instance (starts with `sk_live_...`).
- `CLERK_FRONTEND_API_URL` → the **Frontend API URL** from your **production** Clerk instance.
  - **How to find it**: In Clerk Dashboard → **Configure → Domains** (or **Settings → Domains**), look for the **Frontend API** URL.
  - Format: `https://<your-instance>.clerk.accounts.dev` or `https://accounts.rolemirror.com` (if you've connected a custom domain).
  - **This is required** for Convex authentication to work.
- If you have any Clerk-related URLs as env vars (for example):
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
  
  set them to the **production** URLs (matching what you configured in **Step 2**), and make sure they are **only enabled for Production** (or update them for Production if they already exist).

**Also verify these non-Clerk env vars are set for Production:**
- `NEXT_PUBLIC_CONVEX_URL` → Your Convex deployment URL (must be set for Production).
- `OPENAI_API_KEY` → Your OpenAI API key (if your app uses OpenAI).

> **Important**: 
> - In Vercel, the **same variable name** can have **different values** for different environments (Development, Preview, Production).
> - Your existing test keys (e.g. `pk_test_...`) should remain set for **Development** and **Preview** only.
> - Your production keys (e.g. `pk_live_...`) should be set for **Production** only.
> - This way, your dev/preview deployments use test keys, and your production deployment uses live keys automatically.

---

### 5. Redeploy the App in Production

After updating the environment variables:

- In Vercel, trigger a **new deployment** for the **Production** environment:
  - Either by pushing to the branch that is connected to Production (e.g. `main`), or
  - By clicking **“Redeploy”** for the latest production deployment.
- Wait for the deployment to finish.

Once deployed, the production app will now use the **production** Clerk instance.

---

### 5.1. Troubleshooting: Empty Page After Deployment

If `rolemirror.com` loads an **empty page** after adding production Clerk keys, follow these debugging steps:

**Step 1: Check Vercel Deployment Logs**
- In Vercel dashboard, go to your project → **Deployments**.
- Click on the latest production deployment.
- Open the **Build Logs** and **Function Logs** tabs.
- Look for:
  - Build errors (red text).
  - Runtime errors mentioning Clerk, Convex, or missing environment variables.
  - Any errors about `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_FRONTEND_API_URL`, or `NEXT_PUBLIC_CONVEX_URL`.

**Step 2: Verify All Required Environment Variables Are Set for Production**
- In Vercel → **Settings → Environment Variables**, verify these are set **for Production**:
  - ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → Should start with `pk_live_...` (not `pk_test_...`).
  - ✅ `CLERK_SECRET_KEY` → Should start with `sk_live_...` (not `sk_test_...`).
  - ✅ `CLERK_FRONTEND_API_URL` → Should point to your **production** Clerk Frontend API URL.
    - If using a **custom domain**: `clerk.rolemirror.com` (must be verified in Clerk first).
    - If using **default Clerk domain**: `https://<your-production-instance>.clerk.accounts.dev`.
  - ✅ `NEXT_PUBLIC_CONVEX_URL` → Your Convex deployment URL.
  - ✅ `OPENAI_API_KEY` → If your app uses OpenAI.

**Step 3: Check Browser Console**
- Open `https://rolemirror.com` in your browser.
- Open **Developer Tools** (F12 or Cmd+Option+I).
- Go to the **Console** tab.
- Look for:
  - JavaScript errors (red text).
  - Errors mentioning Clerk, Convex, or missing environment variables.
  - Network errors (check the **Network** tab for failed requests).

**Step 4: Verify Clerk Keys Match Production Instance**
- In Clerk Dashboard, make sure you're viewing the **Production** instance (check the instance switcher in the top-left).
- Go to **Developers → API Keys**.
- Verify the **Publishable key** shown matches what you set in Vercel (should start with `pk_live_...`).
- Verify the **Secret key** shown matches what you set in Vercel (should start with `sk_live_...`).

**Step 5: Check Domain Configuration and DNS Verification in Clerk**
- In your **production** Clerk instance, go to **Configure → User & authentication → Paths**.
- Verify **Home URL** is set to `https://rolemirror.com`.
- **Critical**: Check DNS verification status:
  - Go to **Configure → Domains** (or the **"Connect domains"** section from the Finalize setup panel).
  - Verify that **Frontend API** (`clerk.rolemirror.com`) shows as **"Verified"** (green checkmark).
  - Verify that **Account Portal** (`accounts.rolemirror.com`) shows as **"Verified"** (green checkmark).
  - If either shows **"Unverified"** (red warning), you need to add CNAME records in your DNS provider (see Step 7.3 for detailed instructions).
  - **This is the most common cause of "Clerk: Failed to load Clerk" errors.**

**Step 6: Common Issues and Fixes**

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| **"Clerk: Failed to load Clerk" error** | **DNS not verified for Frontend API** | **Add CNAME record: `clerk.rolemirror.com` → `frontend-api.clerk.services` in your DNS provider. Wait for verification (see Step 7.3).** |
| **"Missing required parameter: client_id" (Google OAuth)** | **Google OAuth not configured for production** | **Set up Google OAuth credentials in production Clerk instance (see Step 7.1). Create OAuth app in Google Cloud Console and add redirect URIs from Clerk.** |
| Empty white page | Missing `CLERK_FRONTEND_API_URL` | Add `CLERK_FRONTEND_API_URL` for Production in Vercel |
| Empty white page | Missing `NEXT_PUBLIC_CONVEX_URL` | Add `NEXT_PUBLIC_CONVEX_URL` for Production in Vercel |
| "Configuration Error" message | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` not set | Verify it's set for Production in Vercel |
| Page loads but auth doesn't work | Wrong key (test vs live) | Verify keys start with `pk_live_` and `sk_live_` |
| CORS errors in console | Domain not allowed in Clerk | Check Step 2 (Paths configuration) |

**Step 7: Redeploy After Fixes**
- After fixing any environment variables, **redeploy** your production deployment in Vercel.
- Wait for the deployment to complete, then test again.

> **Note**: Webhooks are **not** required for the app to load. Webhooks are only needed if you want to sync user data to your backend or trigger server-side actions when users sign up/sign in. The empty page issue is almost always caused by missing or incorrect environment variables.

---

### 6. Verify Production Auth Is Working

- Open your **production** URL in a browser (not `localhost`).
- Try:
  - Visiting the **sign-in** and **sign-up** pages.
  - Creating a new user.
  - Signing in/out.
- Confirm that:
  - Users created in production **do not appear** in your dev Clerk instance.
  - Users appear in the **Users** list of the **production** Clerk instance.

If that works, your production Clerk instance is correctly wired up.

---

### 7. Complete the Clerk “Finalize setup” Panel

In your **production** Clerk instance, you may see a **“Finalize setup”** section with three cards:

- **Setup social connection credentials**
- **Configure your Stripe account**
- **Connect domains**

Walk through them in this order:

- **7.1 Setup social connection credentials** (Required if you want Google/GitHub/etc. sign-in to work)
  - Click **Configure** under **"Setup social connection credentials"**.
  - This step is **required** if you want users to sign in with Google, GitHub, or other social providers in production.
  - The error **"Missing required parameter: client_id"** means Google OAuth is not configured for your production instance.

  **To set up Google OAuth for production:**
  
  1. **In Clerk Dashboard** (production instance):
     - Go to **Configure → User & authentication → Social connections** (or click **Configure** from the "Setup social connection credentials" card).
     - Find **Google** in the list and click **Configure** or **Set up**.
     - Clerk will show you:
       - **Redirect URI(s)** that you need to add to Google Cloud Console (copy these - you'll need them in step 3).
       - Fields for **Client ID** and **Client Secret** (leave these empty for now).
  
  2. **Create OAuth credentials in Google Cloud Console**:
     - Go to [Google Cloud Console](https://console.cloud.google.com/).
     - Select your project (or create a new one if needed).
     - Navigate to **APIs & Services → Credentials**.
     - Click **+ CREATE CREDENTIALS** → **OAuth client ID**.
     - If prompted, configure the **OAuth consent screen** first:
       - Choose **External** (unless you have a Google Workspace account).
       - Fill in required fields (App name, User support email, Developer contact).
       - Add your production domain (`rolemirror.com`) to **Authorized domains**.
       - Save and continue through the scopes and test users steps.
     - Back in **Credentials**, select **OAuth client ID**:
       - **Application type**: Choose **Web application**.
       - **Name**: Something like "RoleMirror Production" or "AI Resume Gen Production".
       - **Authorized JavaScript origins**: Add:
         - `https://rolemirror.com`
         - `https://accounts.rolemirror.com` (if using custom Account Portal domain)
         - Or the Clerk-provided Account Portal domain if not using custom domain
       - **Authorized redirect URIs**: Add the **exact redirect URI(s)** that Clerk showed you in step 1.
         - These typically look like:
           - `https://accounts.rolemirror.com/v1/oauth_callback` (if using custom domain)
           - `https://<your-instance>.clerk.accounts.dev/v1/oauth_callback` (if using default Clerk domain)
         - **Important**: Copy the exact URIs from Clerk - they must match exactly.
       - Click **Create**.
     - **Copy the Client ID and Client Secret** that Google generates.
  
  3. **Add credentials to Clerk**:
     - Go back to Clerk Dashboard → **Configure → User & authentication → Social connections → Google**.
     - Paste the **Client ID** from Google into the **Client ID** field in Clerk.
     - Paste the **Client Secret** from Google into the **Client Secret** field in Clerk.
     - Click **Save** or **Apply**.
     - Google should now show as **"Configured"** or have a green checkmark.
  
  4. **Test Google sign-in**:
     - Go to your production site (`https://rolemirror.com`).
     - Try signing in with Google.
     - If you still get errors, double-check:
       - The redirect URIs in Google Cloud Console **exactly match** what Clerk shows.
       - You're using the **production** Clerk instance (not development).
       - The OAuth consent screen is published (if you're outside the test users list).
  
  **To set up GitHub OAuth for production:**
  
  1. **In Clerk Dashboard** (production instance):
     - Go to **Configure → User & authentication → Social connections**.
     - Find **GitHub** in the list and click **Configure** or **Set up**.
     - Clerk will show one or more **Redirect URI(s)** that you must add in GitHub.
     - Leave the **Client ID** and **Client Secret** fields empty for now.
  
  2. **Create an OAuth app in GitHub**:
     - Sign in to GitHub and go to **Settings → Developer settings → OAuth Apps**.
       - For a personal GitHub account: click your profile → **Settings** → **Developer settings** → **OAuth Apps**.
       - For a GitHub organization: go to the org → **Settings** → **Developer settings** → **OAuth Apps**.
     - Click **New OAuth App**.
     - Fill in:
       - **Application name**: e.g. `RoleMirror Production` or `AI Resume Gen Production`.
       - **Homepage URL**: `https://rolemirror.com`.
       - **Authorization callback URL**: paste the **exact redirect URI** that Clerk showed for GitHub (from step 1).
         - This typically looks like:
           - `https://accounts.rolemirror.com/v1/oauth_callback` (if using custom Account Portal domain), or
           - `https://<your-instance>.clerk.accounts.dev/v1/oauth_callback` (if using the default Clerk domain).
     - Click **Register application**.
     - After the app is created:
       - Copy the **Client ID**.
       - Click **Generate a new client secret** (or **Generate client secret**) and copy the **Client secret**.
  
  3. **Add GitHub credentials to Clerk**:
     - Go back to Clerk Dashboard → **Configure → User & authentication → Social connections → GitHub**.
     - Paste the **Client ID** from GitHub into the **Client ID** field.
     - Paste the **Client secret** from GitHub into the **Client Secret** field.
     - Click **Save** or **Apply**.
     - GitHub should now show as **Configured** or display a green checkmark.
  
  4. **Test GitHub sign-in**:
     - Go to your production site (`https://rolemirror.com`).
     - Try signing in with GitHub.
     - If you see errors:
       - Confirm the **Authorization callback URL** in GitHub **exactly matches** the redirect URI Clerk shows.
       - Make sure you're editing the **production** Clerk instance.
       - If you changed domains (e.g. added `accounts.rolemirror.com`), re-check that both Clerk and GitHub are using the same URL.
 
 TODO:
  **To set up LinkedIn OAuth for production:**
 
  1. **In Clerk Dashboard** (production instance):
     - Go to **Configure → User & authentication → Social connections**.
     - Find **LinkedIn** in the list and click **Configure** or **Set up**.
     - Copy the **Redirect URI(s)** Clerk shows for LinkedIn (you’ll paste one into LinkedIn).
     - Leave the **Client ID** and **Client Secret** fields empty for now.
 
  2. **Create a LinkedIn application**:
     - Go to the [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
     - Click **Create app** (or select an existing app if you already created one for production).
     - Fill in the basic app details (name, company, logo, etc.) and submit.
     - Once the app is created, open it and:
       - Go to the **Auth** or **Authentication** section.
       - Under **OAuth 2.0 / Redirect URLs**, add the **exact Redirect URI** that Clerk showed for LinkedIn, typically:
         - `https://accounts.rolemirror.com/v1/oauth_callback` (if using the custom Account Portal domain), or
         - `https://<your-instance>.clerk.accounts.dev/v1/oauth_callback` (if using the default Clerk domain).
       - Save your changes.
     - In the same section, copy the **Client ID** and **Client Secret** that LinkedIn generates.
 
  3. **Add LinkedIn credentials to Clerk**:
     - Go back to Clerk Dashboard → **Configure → User & authentication → Social connections → LinkedIn**.
     - Paste the **Client ID** from LinkedIn into the **Client ID** field.
     - Paste the **Client Secret** from LinkedIn into the **Client Secret** field.
     - Click **Save** or **Apply**.
     - LinkedIn should now show as **Configured** or display a green checkmark.
 
  4. **Test LinkedIn sign-in**:
     - Go to your production site (`https://rolemirror.com`).
     - Try signing in with LinkedIn.
     - If you see errors:
       - Confirm the **Redirect URL** in LinkedIn **exactly matches** the Redirect URI Clerk shows.
       - Make sure you’re using the **production** Clerk instance and the correct LinkedIn app (not a dev/sandbox app).
       - If you updated domains, re-check that both Clerk and LinkedIn are using the same redirect URL.
 
  **For other social providers** (e.g. X/Twitter, Facebook, Microsoft):**
  - Follow the same pattern:
    1. Configure the provider in Clerk (get the redirect URI).
    2. Create an OAuth app in the provider's developer console.
    3. Add the redirect URI from Clerk to the provider's allowed/redirect URIs.
    4. Copy the client ID and secret back to Clerk.
  
  **Important Notes:**
  - ⚠️ **Development and Production instances need separate OAuth credentials.** Don't reuse your dev Google OAuth credentials for production.
  - The redirect URIs must **exactly match** what Clerk provides - even a trailing slash difference will cause errors.
  - If you're using a custom Account Portal domain (`accounts.rolemirror.com`), make sure that domain is added to Google's authorized JavaScript origins.

- **7.2 Configure your Stripe account**
  - Click **Configure** under **“Configure your Stripe account”**.
  - Either:
    - Connect an existing **live** Stripe account, or
    - Create a new Stripe account and complete onboarding.
  - Once connected:
    - Make sure Stripe is in **Live** mode (not Test) for real payments.
    - If Clerk exposes any Stripe-related keys or webhook URLs in this flow, copy them; you may need them in your app or in Stripe’s dashboard.

- **7.3 Connect domains** (Required for custom Clerk domains)
  - Click **Configure** under **“Connect domains”**.
  - You’ll see a **DNS Configuration** page showing two domains that need to be verified:
    - **Frontend API**: `clerk.rolemirror.com` → Must point to `frontend-api.clerk.services`
    - **Account Portal**: `accounts.rolemirror.com` → Must point to `accounts.clerk.services`
  
  **To verify the Frontend API domain (this is critical for your app to work):**
  
  1. **Copy the CNAME record details** from Clerk:
     - **Host/Name**: `clerk` (or `clerk.rolemirror.com` depending on your DNS provider)
     - **Target/Value**: `frontend-api.clerk.services`
     - Use the copy buttons in Clerk to get the exact values.
  
  2. **Add the CNAME record in your DNS provider** (e.g. Cloudflare, Namecheap, GoDaddy, Route 53):
     - Log in to your DNS provider where `rolemirror.com` is managed.
     - Navigate to **DNS Management** or **DNS Records**.
     - Click **Add Record** or **Create Record**.
     - Select record type: **CNAME**.
     - **Name/Host**: Enter `clerk` (or `clerk.rolemirror.com` if your provider requires the full domain).
     - **Target/Points to/Value**: Enter `frontend-api.clerk.services`
     - **TTL**: Leave as default (usually 3600 or Auto).
     - **Save** the record.
  
  3. **Verify the Account Portal domain** (also required):
     - Repeat the same process for `accounts.rolemirror.com`:
       - **Name/Host**: `accounts` (or `accounts.rolemirror.com`)
       - **Target/Points to/Value**: `accounts.clerk.services`
       - **Save** the record.
  
  4. **Wait for DNS propagation**:
     - DNS changes can take **5 minutes to 48 hours** to propagate, but usually complete within **15-30 minutes**.
     - You can check if DNS has propagated using:
       - **Command line**: `dig clerk.rolemirror.com CNAME` or `nslookup clerk.rolemirror.com`
       - **Online tools**: Use a DNS checker like `dnschecker.org` or `whatsmydns.net`
     - The CNAME should resolve to `frontend-api.clerk.services`.
  
  5. **Verify in Clerk Dashboard**:
     - Return to the Clerk **DNS Configuration** page.
     - Click **Refresh** or wait a few minutes.
     - The status should change from **"Unverified"** (red) to **"Verified"** (green) once DNS has propagated.
     - Both `clerk.rolemirror.com` and `accounts.rolemirror.com` must show as **Verified**.
  
  **Important Notes:**
  - ⚠️ **Your app will not work** until the **Frontend API** domain (`clerk.rolemirror.com`) is verified. This is why you're seeing "Clerk: Failed to load Clerk" errors.
  - The Account Portal domain (`accounts.rolemirror.com`) must also be verified for sign-in/sign-up pages to work.
  - If you're using a DNS proxy (like Cloudflare's proxy), make sure it's set to **DNS only** (gray cloud) not **Proxied** (orange cloud) for these CNAME records, or follow Clerk's proxy configuration instructions if available.
  - If verification fails after 24 hours, double-check:
    - The CNAME record name matches exactly (case-sensitive).
    - The target value is exactly `frontend-api.clerk.services` (no trailing dots or typos).
    - Your DNS provider has actually saved and published the record.

Once these three items are done (or intentionally skipped where not needed), the Clerk “Finalize setup” panel should show as complete or mostly complete.

---

### 8. Enabling Real Payment Methods in Your App (Stripe / Other PSP)

Once auth is running on production:

- In your payment provider (most likely **Stripe**):
  - Switch to **Live mode**.
  - Create or confirm your **live** API keys.
  - Add them as **Production** environment variables in Vercel (separate from your test keys).
- Make sure your payment-related webhooks (e.g. Stripe webhooks) are configured to point to your **production** domain and routes.
- Deploy again after updating payment-related env vars.

This will allow you to test **real payment methods** in production while using the **production** Clerk instance that is also fully “finalized” in the Clerk dashboard.

---

### 9. Quick Checklist

- **Clerk**
  - [X] Production instance created.
  - [X] Allowed URLs configured for the production domain.
  - [ ] “Finalize setup” panel completed (social connections, Stripe, domains as needed).
  - [X] Production publishable and secret keys obtained.
  - [X] Production keys set as **Production** env vars in Vercel.
  - [ ] Production deployment completed and sign-in/sign-up verified.
- **Payments (e.g. Stripe)**
  - [ ] Live API keys configured as **Production** env vars.
  - [ ] Webhooks configured for production URLs.
  - [ ] Test a real transaction end-to-end.

Once all boxes are checked, you are effectively running **Clerk in production** and can safely add and test real payment methods.

