import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { PlanTier } from '@/lib/plan-limits';

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

/**
 * Extract plan tier from Clerk user metadata
 * 
 * Checks user.publicMetadata.plan or user.publicMetadata.subscriptionTier
 * Falls back to "free" if not found
 */
function extractPlanTier(event: WebhookEvent): PlanTier {
  console.log(`[extractPlanTier] Extracting plan tier from event type: ${event.type}`);
  
  // Handle user events
  if (event.type === 'user.created' || event.type === 'user.updated') {
    const user = event.data;
    console.log(`[extractPlanTier] User data:`, JSON.stringify(user, null, 2));
    
    if (user?.publicMetadata?.plan) {
      const plan = user.publicMetadata.plan as string;
      console.log(`[extractPlanTier] Found plan in publicMetadata.plan: ${plan}`);
      if (plan === 'pro' || plan === 'enterprise') {
        return plan as PlanTier;
      }
    }
    if (user?.publicMetadata?.subscriptionTier) {
      const tier = user.publicMetadata.subscriptionTier as string;
      console.log(`[extractPlanTier] Found tier in publicMetadata.subscriptionTier: ${tier}`);
      if (tier === 'pro' || tier === 'enterprise') {
        return tier as PlanTier;
      }
    }
    // Check private metadata as fallback
    if (user?.privateMetadata?.plan) {
      const plan = user.privateMetadata.plan as string;
      console.log(`[extractPlanTier] Found plan in privateMetadata.plan: ${plan}`);
      if (plan === 'pro' || plan === 'enterprise') {
        return plan as PlanTier;
      }
    }
  }

  // Handle subscription events
  if (
    event.type === 'subscription.created' ||
    event.type === 'subscription.updated' ||
    event.type === 'subscriptionItem.updated'
  ) {
    const subscription = event.data;
    console.log(`[extractPlanTier] Subscription data:`, JSON.stringify(subscription, null, 2));
    
    // Clerk Commerce subscription structure:
    // - subscription.items[] contains subscription items
    // - Each item has: plan.name, plan.slug, status
    // - Find the active item and extract its plan
    
    // For subscription.updated/created events, check items array
    if (subscription?.items && Array.isArray(subscription.items)) {
      console.log(`[extractPlanTier] Found ${subscription.items.length} subscription items`);
      
      // Find the active subscription item
      const activeItem = subscription.items.find((item: any) => item.status === 'active');
      
      if (activeItem) {
        const planName = activeItem.plan?.name || activeItem.plan?.slug;
        console.log(`[extractPlanTier] Found active item with plan: ${planName}`);
        
        if (planName === 'pro' || planName === 'enterprise') {
          console.log(`[extractPlanTier] ✅ Extracted plan tier: ${planName}`);
          return planName as PlanTier;
        } else if (planName === 'free') {
          console.log(`[extractPlanTier] Active plan is 'free'`);
          return 'free';
        }
      } else {
        console.log(`[extractPlanTier] No active subscription item found`);
      }
    }
    
    // For subscriptionItem.updated events, check the item directly
    if (event.type === 'subscriptionItem.updated' && subscription?.plan) {
      const planName = subscription.plan?.name || subscription.plan?.slug;
      console.log(`[extractPlanTier] subscriptionItem.updated - plan: ${planName}, status: ${subscription.status}`);
      
      // Only use this item if it's active
      if (subscription.status === 'active') {
        if (planName === 'pro' || planName === 'enterprise') {
          console.log(`[extractPlanTier] ✅ Extracted plan tier from subscriptionItem: ${planName}`);
          return planName as PlanTier;
        } else if (planName === 'free') {
          return 'free';
        }
      } else {
        console.log(`[extractPlanTier] subscriptionItem is not active (status: ${subscription.status}), checking subscription...`);
        // If the item is not active, we need to check the parent subscription
        // This will be handled by subscription.updated event
      }
    }
    
    // Fallback: Check subscription status
    // If subscription status is not active, user should be on free plan
    if (subscription?.status && subscription.status !== 'active') {
      console.log(`[extractPlanTier] Subscription status is '${subscription.status}', defaulting to 'free'`);
      return 'free';
    }
  }

  // Default to free tier
  console.log(`[extractPlanTier] No plan found, defaulting to 'free'`);
  return 'free';
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

  const plan = extractPlanTier(event);
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

      case 'subscriptionItem.updated':
        console.log(`[${requestId}] Routing to handleSubscriptionUpdated (from subscriptionItem.updated)`);
        // subscriptionItem.updated events also need to update the plan
        // We'll use the same handler but extractPlanTier will handle the different structure
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
