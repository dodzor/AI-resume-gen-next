// Convex Auth Configuration
// This config allows the same Convex backend to authenticate users from both
// development and production Clerk instances.
//
// INSTRUCTIONS: Add your development Clerk Frontend API URL below.
// 
// To find your dev Clerk domain:
// 1. Go to https://dashboard.clerk.com
// 2. Make sure you're in your DEVELOPMENT instance (check instance switcher in top-left)
// 3. Navigate to: Configure → Domains
// 4. Look for "Frontend API" URL (format: https://<instance>.clerk.accounts.dev)
// 5. Copy that URL and add it to the clerkDomains array below
//
// After updating, run: npx convex dev (to sync the config)

const clerkDomains = [
  // Production Clerk instance (custom domain)
  'https://clerk.rolemirror.com',
  
  // Development Clerk instance - REPLACE THIS WITH YOUR DEV DOMAIN
  'https://handy-boxer-42.clerk.accounts.dev',
  
  // Optional: Also check Convex environment variable (if set in Convex dashboard)
  ...(process.env.CLERK_FRONTEND_API_URL && 
      process.env.CLERK_FRONTEND_API_URL !== 'https://clerk.rolemirror.com'
    ? [process.env.CLERK_FRONTEND_API_URL]
    : []),
];

export default {
  providers: clerkDomains
    .filter((domain) => domain && domain.startsWith('https://')) // Only valid HTTPS URLs
    .map((domain) => ({
      domain,
      applicationID: 'convex',
    })),
}
  