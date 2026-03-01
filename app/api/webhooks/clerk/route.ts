import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent, webhook } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { PlanTier } from '@/lib/plan-limits';

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
  // Handle user events
  if (event.type === 'user.created' || event.type === 'user.updated') {
    const user = event.data;
    if (user?.publicMetadata?.plan) {
      const plan = user.publicMetadata.plan as string;
      if (plan === 'pro' || plan === 'enterprise') {
        return plan as PlanTier;
      }
    }
    if (user?.publicMetadata?.subscriptionTier) {
      const tier = user.publicMetadata.subscriptionTier as string;
      if (tier === 'pro' || tier === 'enterprise') {
        return tier as PlanTier;
      }
    }
    // Check private metadata as fallback
    if (user?.privateMetadata?.plan) {
      const plan = user.privateMetadata.plan as string;
      if (plan === 'pro' || plan === 'enterprise') {
        return plan as PlanTier;
      }
    }
  }

  // Handle subscription events
  if (
    event.type === 'subscription.created' ||
    event.type === 'subscription.updated'
  ) {
    const subscription = event.data;
    // Extract plan from subscription metadata or price ID
    if (subscription?.publicMetadata?.plan) {
      const plan = subscription.publicMetadata.plan as string;
      if (plan === 'pro' || plan === 'enterprise') {
        return plan as PlanTier;
      }
    }
    // If using Stripe, you might map price IDs to plan names
    // Example: if (subscription?.priceId === 'price_pro_monthly') return 'pro'
  }

  // Default to free tier
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
    event.type === 'subscription.deleted'
  ) {
    // Subscription events typically include user ID
    return (event.data as any)?.userId || (event.data as any)?.user_id || null;
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
  const userId = getUserId(event);
  if (!userId) {
    console.error('subscription.created: No user ID found in event data');
    return;
  }

  const plan = extractPlanTier(event);
  console.log(`subscription.created: Updating user ${userId} to plan ${plan}`);

  try {
    await convex.mutation(api.usage.updateUserPlan, {
      userId,
      plan,
      resetCounters: true, // Reset counters when subscription is created (upgrade)
    });
    console.log(`subscription.created: Successfully updated user ${userId}`);
  } catch (error) {
    console.error(`subscription.created: Failed to update user ${userId}:`, error);
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
  const userId = getUserId(event);
  console.log('subscription.updated: User ID:', userId);
  if (!userId) {
    console.error('subscription.updated: No user ID found in event data');
    return;
  }

  const plan = extractPlanTier(event);
  console.log(`subscription.updated: Updating user ${userId} to plan ${plan}`);

  try {
    await convex.mutation(api.usage.updateUserPlan, {
      userId,
      plan,
      resetCounters: false, // Don't reset counters on subscription update
    });
    console.log(`subscription.updated: Successfully updated user ${userId}`);
  } catch (error) {
    console.error(`subscription.updated: Failed to update user ${userId}:`, error);
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
  try {
    // Verify webhook secret is configured
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get the raw body for signature verification
    const payload = await request.text();

    // Verify webhook signature using Clerk's webhook utility
    // The webhook.verify function handles signature verification automatically
    // It extracts headers from the request internally
    const event = (await webhook.verify(payload, {
      secret: webhookSecret,
    })) as WebhookEvent;

    console.log(`Received Clerk webhook event: ${event.type}`);

    // Initialize Convex client
    const convex = getConvexClient();

    // Route event to appropriate handler
    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event, convex);
        break;

      case 'user.updated':
        await handleUserUpdated(event, convex);
        break;

      case 'subscription.created':
        await handleSubscriptionCreated(event, convex);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(event, convex);
        break;

      case 'subscription.deleted':
        await handleSubscriptionDeleted(event, convex);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
        // Return 200 OK even for unhandled events (Clerk expects acknowledgment)
        break;
    }

    // Always return 200 OK to acknowledge webhook receipt
    // Clerk will retry if we return an error status
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Clerk webhook:', error);

    // Return 500 to trigger Clerk retry
    // Clerk will retry failed webhooks automatically
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
