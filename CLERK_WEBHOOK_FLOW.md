# Clerk Webhooks Flow Explanation

This document explains how Clerk Webhooks work in our subscription system, from user action to database update.

## Overview

Clerk Webhooks are HTTP callbacks that notify your application when events occur in Clerk (user creation, subscription changes, etc.). They enable real-time synchronization between Clerk's user management system and your application's database.

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLERK WEBHOOK FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

1. USER ACTION TRIGGERS EVENT
   ┌─────────────────┐
   │  User signs up  │  OR  │  User upgrades │  OR  │  Subscription │
   │  via Clerk      │      │  to Pro plan   │      │  is cancelled │
   └────────┬────────┘      └────────┬───────┘      └───────┬───────┘
            │                         │                      │
            └─────────────────────────┴──────────────────────┘
                                      │
                                      ▼
            ┌─────────────────────────────────────────┐
            │  Clerk detects event (e.g., user.created│
            │  subscription.created, etc.)            │
            └─────────────────┬───────────────────────┘
                              │
                              ▼
2. CLERK PREPARES WEBHOOK
   ┌─────────────────────────────────────────────────┐
   │  Clerk creates webhook payload:                  │
   │  - Event type (user.created, etc.)              │
   │  - Event data (user object, subscription, etc.)  │
   │  - Timestamp                                     │
   │  - Event ID                                      │
   └─────────────────┬───────────────────────────────┘
                     │
                     ▼
   ┌─────────────────────────────────────────────────┐
   │  Clerk signs payload with webhook secret:      │
   │  - Uses Svix library for signature             │
   │  - Creates HMAC signature from payload         │
   │  - Adds signature to headers:                  │
   │    • svix-id: unique event ID                  │
   │    • svix-timestamp: event timestamp           │
   │    • svix-signature: HMAC signature            │
   └─────────────────┬───────────────────────────────┘
                     │
                     ▼
3. CLERK SENDS HTTP POST REQUEST
   ┌─────────────────────────────────────────────────┐
   │  POST https://yourdomain.com/api/webhooks/clerk │
   │                                                  │
   │  Headers:                                        │
   │  - svix-id: evt_abc123...                       │
   │  - svix-timestamp: 1234567890                   │
   │  - svix-signature: v1,abc123def456...           │
   │  - Content-Type: application/json                │
   │                                                  │
   │  Body (JSON):                                    │
   │  {                                              │
   │    "type": "user.created",                      │
   │    "data": {                                    │
   │      "id": "user_2abc...",                      │
   │      "publicMetadata": {                        │
   │        "plan": "pro"                            │
   │      }                                          │
   │    }                                            │
   │  }                                              │
   └─────────────────┬───────────────────────────────┘
                     │
                     ▼
4. NEXT.JS API ROUTE RECEIVES REQUEST
   ┌─────────────────────────────────────────────────┐
   │  app/api/webhooks/clerk/route.ts                 │
   │                                                  │
   │  export async function POST(request) {         │
   │    // Step 4a: Extract payload                  │
   │    const payload = await request.text()         │
   │                                                  │
   │    // Step 4b: Verify signature                 │
   │    const event = await webhook.verify(          │
   │      payload,                                   │
   │      { secret: CLERK_WEBHOOK_SECRET }           │
   │    )                                            │
   │  }                                              │
   └─────────────────┬───────────────────────────────┘
                     │
                     ▼
5. SIGNATURE VERIFICATION
   ┌─────────────────────────────────────────────────┐
   │  webhook.verify() does:                         │
   │                                                  │
   │  1. Extracts svix headers from request          │
   │  2. Recreates HMAC signature using:             │
   │     - Payload body                              │
   │     - svix-timestamp                            │
   │     - CLERK_WEBHOOK_SECRET                      │
   │  3. Compares recreated signature with           │
   │     svix-signature header                       │
   │  4. If match: ✅ Verified (proceed)            │
   │     If no match: ❌ Reject (return 401)        │
   └─────────────────┬───────────────────────────────┘
                     │
                     ▼ (if verified)
6. EVENT ROUTING
   ┌─────────────────────────────────────────────────┐
   │  switch (event.type) {                          │
   │    case 'user.created':                          │
   │      → handleUserCreated(event)                 │
   │    case 'user.updated':                          │
   │      → handleUserUpdated(event)                 │
   │    case 'subscription.created':                  │
   │      → handleSubscriptionCreated(event)         │
   │    case 'subscription.updated':                  │
   │      → handleSubscriptionUpdated(event)         │
   │    case 'subscription.deleted':                  │
   │      → handleSubscriptionDeleted(event)         │
   │  }                                              │
   └─────────────────┬───────────────────────────────┘
                     │
                     ▼
7. EXTRACT USER DATA
   ┌─────────────────────────────────────────────────┐
   │  For each event handler:                        │
   │                                                  │
   │  1. Extract userId from event.data              │
   │  2. Extract plan tier from metadata:            │
   │     - user.publicMetadata.plan                  │
   │     - user.publicMetadata.subscriptionTier      │
   │     - Falls back to "free" if not found         │
   │  3. Determine if counters should reset         │
   │     (e.g., on upgrade)                         │
   └─────────────────┬───────────────────────────────┘
                     │
                     ▼
8. UPDATE CONVEX DATABASE
   ┌─────────────────────────────────────────────────┐
   │  Initialize ConvexHttpClient:                   │
   │  const convex = new ConvexHttpClient(           │
   │    process.env.NEXT_PUBLIC_CONVEX_URL           │
   │  )                                              │
   │                                                  │
   │  Call mutation:                                 │
   │  await convex.mutation(                         │
   │    api.usage.updateUserPlan,                    │
   │    {                                            │
   │      userId: "user_2abc...",                    │
   │      plan: "pro",                               │
   │      resetCounters: true                        │
   │    }                                            │
   │  )                                              │
   └─────────────────┬───────────────────────────────┘
                     │
                     ▼
9. CONVEX MUTATION EXECUTES
   ┌─────────────────────────────────────────────────┐
   │  convex/usage.ts                                │
   │                                                  │
   │  export const updateUserPlan = mutation({       │
   │    handler: async (ctx, args) => {              │
   │      // Find or create userUsage record         │
   │      const usage = await ctx.db                  │
   │        .query("userUsage")                      │
   │        .withIndex("by_user", ...)                │
   │        .first()                                  │
   │                                                  │
   │      // Update plan tier                        │
   │      await ctx.db.patch(usage._id, {             │
   │        plan: args.plan,                         │
   │        planUpdatedAt: Date.now(),               │
   │        // Reset counters if upgrading          │
   │        ...                                       │
   │      })                                         │
   │    }                                            │
   │  })                                             │
   └─────────────────┬───────────────────────────────┘
                     │
                     ▼
10. DATABASE UPDATED
    ┌─────────────────────────────────────────────────┐
    │  userUsage table in Convex:                     │
    │                                                  │
    │  {                                              │
    │    userId: "user_2abc...",                      │
    │    plan: "pro",                                 │
    │    planUpdatedAt: 1234567890,                   │
    │    jobAnalysesUsed: 0,  // Reset if upgraded   │
    │    aiRewritesUsed: 0,   // Reset if upgraded   │
    │    ...                                          │
    │  }                                              │
    └─────────────────┬───────────────────────────────┘
                      │
                      ▼
11. RESPONSE TO CLERK
    ┌─────────────────────────────────────────────────┐
    │  Return NextResponse.json({ received: true })  │
    │  Status: 200 OK                                 │
    │                                                  │
    │  ✅ Clerk marks webhook as delivered            │
    │  ✅ No retry needed                             │
    └─────────────────────────────────────────────────┘

```

---

## Detailed Step-by-Step Explanation

### Step 1: User Action Triggers Event

**What happens:**
- User signs up for an account → `user.created` event
- User upgrades to Pro plan → `subscription.created` event
- User cancels subscription → `subscription.deleted` event
- User's metadata is updated → `user.updated` event

**Where:** Clerk's servers detect these events automatically.

---

### Step 2: Clerk Prepares Webhook

**What Clerk does:**
1. Creates a JSON payload with event data
2. Signs the payload using HMAC-SHA256 with your webhook secret
3. Adds signature headers (svix-id, svix-timestamp, svix-signature)

**Why signing is important:**
- Prevents unauthorized webhooks
- Ensures data integrity
- Verifies the request came from Clerk

---

### Step 3: Clerk Sends HTTP POST Request

**Request details:**
- **URL:** `https://yourdomain.com/api/webhooks/clerk` (configured in Clerk Dashboard)
- **Method:** POST
- **Headers:** Include Svix signature headers
- **Body:** JSON payload with event type and data

**Note:** Clerk will retry failed webhooks automatically (exponential backoff).

---

### Step 4: Next.js API Route Receives Request

**What happens:**
```typescript
export async function POST(request: NextRequest) {
  // Extract raw body (needed for signature verification)
  const payload = await request.text();
  
  // Verify webhook secret is configured
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
}
```

**Important:** We read the body as text (not JSON) because signature verification needs the raw payload.

---

### Step 5: Signature Verification

**How `webhook.verify()` works:**

1. **Extracts headers:**
   - `svix-id`: Unique event identifier
   - `svix-timestamp`: When the event occurred
   - `svix-signature`: HMAC signature

2. **Recreates signature:**
   ```javascript
   const signature = hmacSha256(
     svixTimestamp + "." + payload,
     CLERK_WEBHOOK_SECRET
   )
   ```

3. **Compares signatures:**
   - If match: ✅ Request is authentic, proceed
   - If no match: ❌ Reject with 401 Unauthorized

**Security benefit:** Even if someone knows your webhook URL, they can't forge requests without the secret.

---

### Step 6: Event Routing

**Switch statement routes to appropriate handler:**

```typescript
switch (event.type) {
  case 'user.created':
    await handleUserCreated(event, convex);
    break;
  // ... other cases
}
```

Each handler is specialized for its event type.

---

### Step 7: Extract User Data

**For each event, we extract:**

1. **User ID:**
   ```typescript
   function getUserId(event) {
     if (event.type === 'user.created') {
       return event.data.id; // "user_2abc..."
     }
     // ... other event types
   }
   ```

2. **Plan Tier:**
   ```typescript
   function extractPlanTier(event) {
     // Check user.publicMetadata.plan
     // Check user.publicMetadata.subscriptionTier
     // Fall back to "free"
   }
   ```

---

### Step 8: Update Convex Database

**Using ConvexHttpClient for server-side mutations:**

```typescript
const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL
);

await convex.mutation(api.usage.updateUserPlan, {
  userId: "user_2abc...",
  plan: "pro",
  resetCounters: true
});
```

**Why ConvexHttpClient?**
- Regular `useMutation` only works in React components (client-side)
- API routes run on the server, so we need HTTP client
- ConvexHttpClient makes HTTP requests to Convex backend

---

### Step 9: Convex Mutation Executes

**The mutation in `convex/usage.ts`:**

```typescript
export const updateUserPlan = mutation({
  handler: async (ctx, args) => {
    // Find existing usage record
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .first();
    
    // Update or create record
    if (usage) {
      await ctx.db.patch(usage._id, {
        plan: args.plan,
        planUpdatedAt: Date.now(),
        // Reset counters if upgrading
        ...(args.resetCounters && {
          jobAnalysesUsed: 0,
          aiRewritesUsed: 0,
          exportsUsed: 0
        })
      });
    } else {
      // Create new record
      await ctx.db.insert("userUsage", { ... });
    }
  }
});
```

---

### Step 10: Database Updated

**Result in Convex `userUsage` table:**

```json
{
  "userId": "user_2abc123...",
  "plan": "pro",
  "planUpdatedAt": 1234567890,
  "jobAnalysesUsed": 0,
  "aiRewritesUsed": 0,
  "exportsUsed": 0,
  "resumesCreated": 0
}
```

**Now the user has Pro plan limits!**

---

### Step 11: Response to Clerk

**We return 200 OK:**

```typescript
return NextResponse.json({ received: true });
```

**Why this matters:**
- ✅ Clerk marks webhook as successfully delivered
- ✅ No retry needed
- ❌ If we return 500, Clerk will retry (exponential backoff)

---

## Event Types and Their Handlers

### 1. `user.created`
**When:** New user signs up
**Handler:** `handleUserCreated()`
**Action:** Initialize usage record with "free" plan

### 2. `user.updated`
**When:** User metadata changes
**Handler:** `handleUserUpdated()`
**Action:** Update plan if metadata changed

### 3. `subscription.created`
**When:** User subscribes to a plan
**Handler:** `handleSubscriptionCreated()`
**Action:** Update plan and reset counters (upgrade)

### 4. `subscription.updated`
**When:** Subscription changes (upgrade/downgrade)
**Handler:** `handleSubscriptionUpdated()`
**Action:** Update plan tier

### 5. `subscription.deleted`
**When:** Subscription is cancelled
**Handler:** `handleSubscriptionDeleted()`
**Action:** Downgrade to "free" plan

---

## Error Handling Flow

```
┌─────────────────────────────────────────┐
│  Webhook processing fails               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Return 500 status code                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Clerk detects failure                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Clerk retries webhook                  │
│  (exponential backoff: 1s, 2s, 4s...)  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  After max retries, Clerk logs failure  │
│  (you can see in Clerk Dashboard)       │
└─────────────────────────────────────────┘
```

---

## Security Considerations

### 1. **Signature Verification**
- ✅ Always verify webhook signatures
- ✅ Never trust unverified requests
- ✅ Keep `CLERK_WEBHOOK_SECRET` secure (never commit to git)

### 2. **Idempotency**
- Webhooks may be delivered multiple times
- Your handlers should be idempotent (safe to run multiple times)
- Example: Check if plan is already updated before updating

### 3. **Rate Limiting**
- Clerk may send many webhooks at once
- Consider rate limiting your webhook handler
- Use queues for high-volume scenarios

---

## Testing Webhooks Locally

### Using ngrok:

```bash
# 1. Start your Next.js dev server
npm run dev

# 2. In another terminal, expose localhost
ngrok http 3000

# 3. Copy the ngrok URL (e.g., https://abc123.ngrok.io)

# 4. In Clerk Dashboard:
#    - Go to Webhooks
#    - Add endpoint: https://abc123.ngrok.io/api/webhooks/clerk
#    - Select events to listen to
#    - Copy webhook secret to .env.local

# 5. Test by triggering events in Clerk Dashboard
```

---

## Configuration Checklist

- [ ] Webhook endpoint created: `/api/webhooks/clerk`
- [ ] `CLERK_WEBHOOK_SECRET` added to `.env.local`
- [ ] Webhook configured in Clerk Dashboard
- [ ] Events selected: `user.created`, `user.updated`, `subscription.*`
- [ ] Webhook URL set: `https://yourdomain.com/api/webhooks/clerk`
- [ ] Test webhook sent from Clerk Dashboard
- [ ] Verified plan updates in Convex database

---

## Summary

Clerk Webhooks provide a **real-time, secure, and reliable** way to sync user subscription data from Clerk to your application database. The flow ensures:

1. ✅ **Security:** Signature verification prevents unauthorized requests
2. ✅ **Reliability:** Automatic retries handle temporary failures
3. ✅ **Real-time:** Changes sync immediately (no polling needed)
4. ✅ **Scalability:** Handles high-volume events efficiently

The webhook handler acts as a **bridge** between Clerk's user management system and your Convex database, keeping subscription plans in sync automatically.
