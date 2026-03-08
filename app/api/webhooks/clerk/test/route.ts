import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook Test Endpoint
 * 
 * This endpoint helps verify that webhook events are being received.
 * You can use this to test your webhook configuration.
 * 
 * Usage:
 * 1. Check if webhook URL is accessible: GET /api/webhooks/clerk/test
 * 2. View recent webhook logs (if you implement logging storage)
 */

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    webhookUrl: '/api/webhooks/clerk',
    instructions: [
      '1. Check your server logs for webhook events',
      '2. Verify CLERK_WEBHOOK_SECRET is set in environment variables',
      '3. Check Clerk Dashboard → Webhooks for delivery status',
      '4. Look for logs starting with [requestId] and [extractPlanTier]',
      '5. Test by creating/updating a subscription in Clerk Dashboard',
    ],
    environment: {
      hasWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
      hasConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
    },
  });
}
