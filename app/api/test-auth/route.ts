import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/api-auth';

/**
 * Test endpoint for Step 3.1: API Authentication Utilities
 * 
 * This endpoint is used to test the requireAuth() and getUserId() functions.
 * 
 * DELETE THIS FILE after verifying Step 3.1 works correctly.
 * 
 * Usage:
 * - POST /api/test-auth - Tests requireAuth() function
 * - GET /api/test-auth - Tests getUserId() function
 */

// Test requireAuth()
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  
  if ('error' in authResult) {
    return authResult.error; // Should return 401 with error details
  }
  
  return NextResponse.json({
    success: true,
    userId: authResult.userId,
    message: 'Authentication successful'
  });
}

// Test getUserId() (non-throwing)
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  
  return NextResponse.json({
    authenticated: userId !== null,
    userId: userId || null,
    message: userId 
      ? 'User is authenticated' 
      : 'User is not authenticated (but no error thrown)'
  });
}
