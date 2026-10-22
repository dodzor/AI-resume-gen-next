import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { PlanTier } from '@/lib/plan-limits';
import { planTierFromLabel } from '@/lib/plan-tier';

// Clerk webhook event types
type WebhookEvent = {
  type: string;
  data: any;
};

// Dynamic import for svix (webhook verification library)
// Install with: npm install svix
let Webhook: typeof import('svix').Webhook;
try {
  const svixModule = require('svix');
  Webhook = svixModule.Webhook;
} catch (error) {
  console.error('svix module not found. Please install it with: npm install svix');
}

/**
 * Clerk Webhook Handler
 * 
 * Handles Clerk webhook events to sync user subscription plans with Convex.
 * 
 * Supported events:
 * - user.created: Initialize user usage record with "free" plan
 * - user.updated: Check if subscription metadata changed and update plan
 * - subscription.created: Update plan tier from metadata
 * - subscription.updated: Update plan tier (upgrade/downgrade)
 * - subscription.deleted: Downgrade to "free" plan
 * 
 * Environment Variables Required:
 * - CLERK_WEBHOOK_SECRET: Webhook signing secret from Clerk Dashboard
 * - NEXT_PUBLIC_CONVEX_URL: Convex deployment URL
 */

// Initialize Convex HTTP client for server-side mutations
const getConvexClient = () => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is not set');
  }
  return new ConvexHttpClient(convexUrl);
};

function subscriptionItems(data: any): any[] {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.subscription_items)) return data.subscription_items;
  if (Array.isArray(data?.subscriptionItems)) return data.subscriptionItems;
  if (data?.plan) return [data];
  return [];
}

function tierFromSubscriptionItem(item: any): PlanTier | null {
  const status = item?.status as string | undefined;
  if (status && status !== 'active' && status !== 'past_due') return null;
  const plan = item?.plan;
  const labeled =
    planTierFromLabel(plan?.slug) ??
    planTierFromLabel(plan?.name) ??
    planTierFromLabel(item?.plan_slug);
  if (labeled === 'enterprise' || labeled === 'pro') return labeled;
  if (labeled === 'free' || plan?.is_default === true || plan?.isDefault === true) return 'free';
  if (plan?.slug || plan?.name) return 'pro';
  return null;
}

/**
 * Plan written into Convex for this event.
 * Returns null when the event does not say which plan the user is on,
 * so profile updates cannot wipe a paid plan back to free.
 */
function extractPlanTier(event: WebhookEvent): PlanTier | null {
  console.log(`[extractPlanTier] Extracting plan tier from event type: ${event.type}`);

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const user = event.data;
    return (
      planTierFromLabel(user?.publicMetadata?.plan) ??
      planTierFromLabel(user?.publicMetadata?.subscriptionTier) ??
      planTierFromLabel(user?.privateMetadata?.plan)
    );
  }

  if (event.type.startsWith('subscription')) {
    const subscription = event.data;
    let found: PlanTier | null = null;
    for (const item of subscriptionItems(subscription)) {
      const tier = tierFromSubscriptionItem(item);
      if (tier === 'enterprise') return 'enterprise';
      if (tier === 'pro') found = 'pro';
      else if (tier === 'free' && !found) found = 'free';
    }
    if (found) {
      console.log(`[extractPlanTier] Extracted plan tier: ${found}`);
      return found;
    }
    const status = subscription?.status as string | undefined;
    if (status && status !== 'active' && status !== 'past_due') {
      console.log(`[extractPlanTier] Subscription status is '${status}', using free`);
      return 'free';
    }
  }

  console.log(`[extractPlanTier] No plan found on this event`);
  return null;
}

/**
 * Get user ID from webhook event
 */
function getUserId(event: WebhookEvent): string | null {
  if (event.type === 'user.created' || event.type === 'user.updated') {
    return event.data.id || null;
  }
  if (
    event.type === 'subscription.created' ||
    event.type === 'subscription.updated' ||
    event.type === 'subscription.deleted' ||
    event.type === 'subscriptionItem.updated'
  ) {
    // Subscription events include user ID in payer object
    const payer = (event.data as any)?.payer;
    if (payer) {
      return payer.user_id || payer.userId || null;
    }
    return null;
  }
  return null;
}

/**
 * Handle user.created event
 * Initialize user usage record with "free" plan
 */
async function handleUserCreated(event: WebhookEvent, convex: ConvexHttpClient) {
  const userId = getUserId(event);
  if (!userId) {
    console.error('user.created: No user ID found in event data');
    return;
  }

  const plan = extractPlanTier(event) ?? 'free';
  console.log(`user.created: Initializing user ${userId} with plan ${plan}`);

  try {
    await convex.mutation(api.usage.updateUserPlan, {
      userId,
      plan,
      resetCounters: false, // New user, no counters to reset
    });
    console.log(`user.created: Successfully initialized user ${userId}`);
  } catch (error) {
    console.error(`user.created: Failed to initialize user ${userId}:`, error);
    throw error;
  }
}

/**
 * Handle user.updated event
 * Check if subscription metadata changed and update plan
 */
async function handleUserUpdated(event: WebhookEvent, convex: ConvexHttpClient) {
  const userId = getUserId(event);
  if (!userId) {
    console.error('user.updated: No user ID found in event data');
    return;
  }

  const plan = extractPlanTier(event);
  if (!plan) {
    console.log(`user.updated: No plan metadata for ${userId}; leaving Convex plan unchanged`);
    return;
  }
  console.log(`user.updated: Updating user ${userId} to plan ${plan}`);

  try {
    await convex.mutation(api.usage.updateUserPlan, {
      userId,
      plan,
      resetCounters: false, // Don't reset counters on metadata update
    });
    console.log(`user.updated: Successfully updated user ${userId}`);
  } catch (error) {
    console.error(`user.updated: Failed to update user ${userId}:`, error);
    throw error;
  }
}

/**
 * Handle subscription.created event
 * Update plan tier from subscription metadata
 */
async function handleSubscriptionCreated(
  event: WebhookEvent,
  convex: ConvexHttpClient
) {
  console.log(`[handleSubscriptionCreated] Processing subscription.created event`);
  console.log(`[handleSubscriptionCreated] Full event:`, JSON.stringify(event, null, 2));
  
  const userId = getUserId(event);
  console.log(`[handleSubscriptionCreated] Extracted userId: ${userId}`);
  
  if (!userId) {
    console.error('[handleSubscriptionCreated] ❌ No user ID found in event data');
    console.error('[handleSubscriptionCreated] Event data structure:', JSON.stringify(event.data, null, 2));
    return;
  }

  const plan = extractPlanTier(event);
  if (!plan) {
    console.log(`[handleSubscriptionCreated] No plan on event for ${userId}; leaving Convex plan unchanged`);
    return;
  }
  console.log(`[handleSubscriptionCreated] Extracted plan: ${plan}`);
  console.log(`[handleSubscriptionCreated] Updating user ${userId} to plan ${plan}`);

  try {
    await convex.mutation(api.usage.updateUserPlan, {
      userId,
      plan,
      resetCounters: true, // Reset counters when subscription is created (upgrade)
    });
    console.log(`[handleSubscriptionCreated] ✅ Successfully updated user ${userId} to plan ${plan}`);
  } catch (error) {
    console.error(`[handleSubscriptionCreated] ❌ Failed to update user ${userId}:`, error);
    throw error;
  }
}

/**
 * Handle subscription.updated event
 * Update plan tier (upgrade/downgrade)
 */
async function handleSubscriptionUpdated(
  event: WebhookEvent,
  convex: ConvexHttpClient
) {
  console.log(`[handleSubscriptionUpdated] Processing subscription.updated event`);
//   console.log(`[handleSubscriptionUpdated] Full event:`, JSON.stringify(event, null, 2));
  
  const userId = getUserId(event);
  console.log(`[handleSubscriptionUpdated] Extracted userId: ${userId}`);
  
  if (!userId) {
    console.error('[handleSubscriptionUpdated] ❌ No user ID found in event data');
    console.error('[handleSubscriptionUpdated] Event data structure:', JSON.stringify(event.data, null, 2));
    return;
  }

  const plan = extractPlanTier(event);
  if (!plan) {
    console.log(`[handleSubscriptionUpdated] No plan on event for ${userId}; leaving Convex plan unchanged`);
    return;
  }
  console.log(`[handleSubscriptionUpdated] Extracted plan: ${plan}`);
  console.log(`[handleSubscriptionUpdated] Updating user ${userId} to plan ${plan}`);

  try {
    await convex.mutation(api.usage.updateUserPlan, {
      userId,
      plan,
      resetCounters: false, // Don't reset counters on subscription update
    });
    console.log(`[handleSubscriptionUpdated] ✅ Successfully updated user ${userId} to plan ${plan}`);
  } catch (error) {
    console.error(`[handleSubscriptionUpdated] ❌ Failed to update user ${userId}:`, error);
    throw error;
  }
}

/**
 * Handle subscription.deleted event
 * Downgrade to "free" plan
 */
async function handleSubscriptionDeleted(
  event: WebhookEvent,
  convex: ConvexHttpClient
) {
  const userId = getUserId(event);
  if (!userId) {
    console.error('subscription.deleted: No user ID found in event data');
    return;
  }

  console.log(`subscription.deleted: Downgrading user ${userId} to free plan`);

  try {
    await convex.mutation(api.usage.updateUserPlan, {
      userId,
      plan: 'free',
      resetCounters: false, // Keep usage counters when downgrading
    });
    console.log(`subscription.deleted: Successfully downgraded user ${userId}`);
  } catch (error) {
    console.error(`subscription.deleted: Failed to downgrade user ${userId}:`, error);
    throw error;
  }
}

/**
 * Main webhook handler
 * Verifies webhook signature and routes events to appropriate handlers
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [${requestId}] Webhook request received`);
  
  try {
    // Verify webhook secret is configured
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(`[${requestId}] CLERK_WEBHOOK_SECRET environment variable is not set`);
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get the raw body for signature verification
    const payload = await request.text();
    console.log(`[${requestId}] Payload received (${payload.length} bytes)`);

    // Get headers for signature verification
    const headers = {
      'svix-id': request.headers.get('svix-id') || '',
      'svix-timestamp': request.headers.get('svix-timestamp') || '',
      'svix-signature': request.headers.get('svix-signature') || '',
    };

    console.log(`[${requestId}] Webhook headers:`, {
      'svix-id': headers['svix-id'] ? 'present' : 'missing',
      'svix-timestamp': headers['svix-timestamp'] ? 'present' : 'missing',
      'svix-signature': headers['svix-signature'] ? 'present' : 'missing',
    });

    // Verify webhook signature using Svix
    if (!Webhook) {
      console.error(`[${requestId}] ❌ svix module not installed. Please run: npm install svix`);
      return NextResponse.json(
        { 
          error: 'Webhook verification library not installed',
          message: 'Please install svix: npm install svix',
          requestId 
        },
        { status: 500 }
      );
    }

    const wh = new Webhook(webhookSecret);
    let event: WebhookEvent;

    try {
      event = wh.verify(payload, headers) as WebhookEvent;
      console.log(`[${requestId}] ✅ Webhook signature verified`);
      console.log(`[${requestId}] 📨 Event type: ${event.type}`);
    //   console.log(`[${requestId}] 📦 Full event data:`, JSON.stringify(event, null, 2));
    } catch (error) {
      console.error(`[${requestId}] ❌ Webhook signature verification failed:`, error);
      return NextResponse.json(
        { error: 'Webhook signature verification failed', requestId },
        { status: 401 }
      );
    }

    // Initialize Convex client
    const convex = getConvexClient();

    // Route event to appropriate handler
    switch (event.type) {
      case 'user.created':
        console.log(`[${requestId}] Routing to handleUserCreated`);
        await handleUserCreated(event, convex);
        break;

      case 'user.updated':
        console.log(`[${requestId}] Routing to handleUserUpdated`);
        await handleUserUpdated(event, convex);
        break;

      case 'subscription.created':
        console.log(`[${requestId}] Routing to handleSubscriptionCreated`);
        await handleSubscriptionCreated(event, convex);
        break;

      case 'subscription.updated':
        console.log(`[${requestId}] Routing to handleSubscriptionUpdated`);
        await handleSubscriptionUpdated(event, convex);
        break;

      case 'subscription.deleted':
        console.log(`[${requestId}] Routing to handleSubscriptionDeleted`);
        await handleSubscriptionDeleted(event, convex);
        break;

      case 'subscriptionItem.created':
      case 'subscriptionItem.updated':
      case 'subscriptionItem.active':
      case 'subscriptionItem.pastDue':
        console.log(`[${requestId}] Routing ${event.type} to handleSubscriptionUpdated`);
        await handleSubscriptionUpdated(event, convex);
        break;

      default:
        console.log(`[${requestId}] ⚠️ Unhandled webhook event type: ${event.type}`);
        console.log(`[${requestId}] Event data:`, JSON.stringify(event.data, null, 2));
        // Return 200 OK even for unhandled events (Clerk expects acknowledgment)
        break;
    }

    // Always return 200 OK to acknowledge webhook receipt
    // Clerk will retry if we return an error status
    console.log(`[${requestId}] ✅ Webhook processing completed successfully`);
    return NextResponse.json({ received: true, requestId, eventType: event.type });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error processing Clerk webhook:`, error);
    if (error instanceof Error) {
      console.error(`[${requestId}] Error stack:`, error.stack);
    }

    // Return 500 to trigger Clerk retry
    // Clerk will retry failed webhooks automatically
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
