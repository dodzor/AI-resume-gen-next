import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import type { ActionType } from '@/lib/plan-limits';

/**
 * Test endpoint for Step 3.2: API Usage Check Utilities
 * 
 * This endpoint is used to test the checkUsageLimit() and incrementUsageAfterAction() functions.
 * 
 * DELETE THIS FILE after verifying Step 3.2 works correctly.
 * 
 * Usage:
 * - POST /api/test-usage?action=job_analysis - Test checkUsageLimit and incrementUsageAfterAction
 * - GET /api/test-usage - Get current usage status for all actions
 */

// Test checkUsageLimit and incrementUsageAfterAction
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await requireAuth();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { userId } = authResult;

    // 2. Get action from query parameter
    const { searchParams } = new URL(request.url);
    const actionParam = searchParams.get('action') as ActionType | null;

    if (!actionParam) {
      return NextResponse.json(
        {
          error: 'Missing action parameter',
          message: 'Please provide an action parameter: ?action=job_analysis|ai_rewrite|create_resume|export',
        },
        { status: 400 }
      );
    }

    const validActions: ActionType[] = ['job_analysis', 'ai_rewrite', 'create_resume', 'export'];
    if (!validActions.includes(actionParam)) {
      return NextResponse.json(
        {
          error: 'Invalid action',
          message: `Action must be one of: ${validActions.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 3. Check usage limit
    const usageCheck = await checkUsageLimit(userId, actionParam);

    if (!usageCheck.allowed) {
      // Return the error response (includes upgrade prompt)
      return usageCheck.error;
    }

    // 4. Simulate successful operation
    // In a real API route, you would perform the actual operation here
    // For testing, we'll just return success

    // 5. Increment usage after "successful" operation
    await incrementUsageAfterAction(userId, actionParam);

    return NextResponse.json({
      success: true,
      message: `Action "${actionParam}" was allowed and usage was incremented`,
      userId,
      action: actionParam,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in test-usage endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Get current usage status (read-only)
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await requireAuth();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { userId } = authResult;

    // 2. Test checkUsageLimit for all actions
    const actions: ActionType[] = ['job_analysis', 'ai_rewrite', 'create_resume', 'export'];
    const results: Record<string, any> = {};

    for (const action of actions) {
      const usageCheck = await checkUsageLimit(userId, action);
      results[action] = {
        allowed: usageCheck.allowed,
        // If not allowed, extract error details
        ...(usageCheck.allowed
          ? {}
          : {
              error: 'Usage limit exceeded',
              // Note: We can't easily extract the full error response here
              // but we know it's not allowed
            }),
      };
    }

    return NextResponse.json({
      userId,
      usageChecks: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in test-usage GET endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
