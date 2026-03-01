/**
 * API Usage Check Utilities
 * 
 * This file provides helper functions for checking usage limits and incrementing
 * usage counters in API routes.
 * 
 * Based on SUBSCRIPTION_IMPLEMENTATION_PLAN.md Step 3.2
 */

import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { ActionType } from '@/lib/plan-limits';

/**
 * Result type for successful usage check
 */
export type UsageCheckSuccess = {
  allowed: true;
};

/**
 * Result type for failed usage check
 */
export type UsageCheckError = {
  allowed: false;
  error: NextResponse;
};

/**
 * Result type for usage check
 */
export type UsageCheckResult = UsageCheckSuccess | UsageCheckError;

/**
 * Get or create Convex HTTP client for server-side operations
 * 
 * @returns ConvexHttpClient instance
 * @throws Error if NEXT_PUBLIC_CONVEX_URL is not set
 */
function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is not set');
  }
  return new ConvexHttpClient(convexUrl);
}

/**
 * Check if user can perform a specific action based on their usage limits
 * 
 * This function calls the Convex query to check if the user has remaining quota
 * for the specified action. If the limit is exceeded, it returns an error response
 * with an upgrade prompt.
 * 
 * @param userId - Clerk user ID
 * @param action - Action type to check ('job_analysis', 'ai_rewrite', 'create_resume', 'export')
 * @param convex - Optional ConvexHttpClient instance (will create one if not provided)
 * @returns Promise that resolves to either { allowed: true } or { allowed: false, error: NextResponse }
 * 
 * @example
 * ```typescript
 * const usageCheck = await checkUsageLimit(userId, 'job_analysis', convex);
 * if (!usageCheck.allowed) {
 *   return usageCheck.error; // Returns 403 with upgrade prompt
 * }
 * // Proceed with the action
 * ```
 */
export async function checkUsageLimit(
  userId: string,
  action: ActionType,
  convex?: ConvexHttpClient
): Promise<UsageCheckResult> {
  try {
    const client = convex || getConvexClient();
    
    // Use server-side version that accepts userId directly
    const result = await client.query(api.usage.canPerformActionServer, { userId, action });
    
    if (!result.allowed) {
      // Build error response with upgrade prompt
      const statusCode = result.upgradeRequired ? 403 : 403; // 403 Forbidden
      
      return {
        allowed: false,
        error: NextResponse.json(
          {
            error: 'Usage limit exceeded',
            code: 'USAGE_LIMIT_EXCEEDED',
            message: result.reason || 'You have reached your usage limit for this action.',
            details: {
              upgradeRequired: result.upgradeRequired,
              action,
              remaining: result.remaining,
              limit: result.remaining === -1 ? -1 : undefined, // Only include limit if not unlimited
            },
          },
          { status: statusCode }
        ),
      };
    }
    
    return { allowed: true };
  } catch (error: any) {
    console.error('Error checking usage limit:', error);
    
    // If the query fails (e.g., auth context issue), we have two options:
    // 1. Fail open (allow the action) - not secure
    // 2. Fail closed (deny the action) - more secure but might block legitimate users
    // We'll fail closed for security, but log the error
    
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: 'Usage Check Error',
          code: 'USAGE_CHECK_ERROR',
          message: 'Unable to verify usage limits. Please try again or contact support.',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Increment usage counter after successful operation
 * 
 * This function should be called AFTER a successful operation to track usage.
 * It handles errors gracefully - if the increment fails, it logs the error but
 * doesn't fail the main operation.
 * 
 * @param userId - Clerk user ID
 * @param action - Action type that was performed
 * @param convex - Optional ConvexHttpClient instance (will create one if not provided)
 * @returns Promise that resolves when increment is complete (or failed silently)
 * 
 * @example
 * ```typescript
 * // After successful operation
 * const result = await processRequest(...);
 * 
 * // Increment usage (non-blocking, errors are logged but don't fail the request)
 * await incrementUsageAfterAction(userId, 'job_analysis', convex);
 * 
 * return NextResponse.json(result);
 * ```
 */
export async function incrementUsageAfterAction(
  userId: string,
  action: ActionType,
  convex?: ConvexHttpClient
): Promise<void> {
  try {
    const client = convex || getConvexClient();
    
    // Use server-side version that accepts userId directly
    await client.mutation(api.usage.incrementUsageServer, { userId, action });
    
    // Success - usage incremented
  } catch (error: any) {
    // Log the error but don't fail the main operation
    // This ensures that if usage tracking fails, the user's action still succeeds
    console.error(`Failed to increment usage for action ${action}:`, error);
    
    // Optionally, you could send this to an error tracking service
    // but we don't want to block the user's request
  }
}

/**
 * Map API route paths to action types
 * 
 * This helper function maps API route paths to their corresponding action types
 * for usage tracking.
 * 
 * @param routePath - The API route path (e.g., '/api/rewrite-bullet')
 * @returns ActionType or null if route doesn't need usage tracking
 */
export function getActionTypeForRoute(routePath: string): ActionType | null {
  const routeActionMap: Record<string, ActionType> = {
    '/api/analyze-job-description': 'job_analysis',
    '/api/rewrite-bullet': 'ai_rewrite',
    '/api/improve-experience': 'ai_rewrite',
    '/api/generate-summary': 'ai_rewrite',
    '/api/generate-resume': 'create_resume',
    '/api/generate-pdf': 'export',
  };
  
  return routeActionMap[routePath] || null;
}

/**
 * Helper to create consistent error responses for usage limits
 * 
 * @param action - Action type that was blocked
 * @param reason - Reason message
 * @param remaining - Remaining quota (0 if limit reached)
 * @param upgradeRequired - Whether upgrade is required
 * @returns NextResponse with error details
 */
export function createUsageLimitErrorResponse(
  action: ActionType,
  reason: string,
  remaining: number = 0,
  upgradeRequired: boolean = true
): NextResponse {
  return NextResponse.json(
    {
      error: 'Usage limit exceeded',
      code: 'USAGE_LIMIT_EXCEEDED',
      message: reason,
      details: {
        upgradeRequired,
        action,
        remaining,
      },
    },
    { status: 403 }
  );
}
