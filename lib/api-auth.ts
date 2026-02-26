/**
 * API Authentication Utilities
 * 
 * This file provides helper functions for authenticating users in API routes.
 * Uses Clerk's server-side authentication to verify user identity.
 * 
 * Based on SUBSCRIPTION_IMPLEMENTATION_PLAN.md Step 3.1
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Result type for successful authentication
 */
export type AuthSuccess = {
  userId: string;
};

/**
 * Result type for failed authentication
 */
export type AuthError = {
  error: NextResponse;
};

/**
 * Result type for authentication check
 */
export type AuthResult = AuthSuccess | AuthError;

/**
 * Type guard to check if auth result is successful
 */
export function isAuthSuccess(result: AuthResult): result is AuthSuccess {
  return 'userId' in result;
}

/**
 * Type guard to check if auth result is an error
 */
export function isAuthError(result: AuthResult): result is AuthError {
  return 'error' in result;
}

/**
 * Require authentication for API routes
 * 
 * This function checks if the user is authenticated using Clerk's auth() function.
 * If authenticated, returns the userId. If not authenticated, returns a 401 error response.
 * 
 * @returns Promise that resolves to either { userId: string } or { error: NextResponse }
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await requireAuth();
 *   if (!isAuthSuccess(authResult)) {
 *     return authResult.error;
 *   }
 *   
 *   const { userId } = authResult;
 *   // Use userId for the rest of the handler
 * }
 * ```
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await requireAuth();
 *   if ('error' in authResult) {
 *     return authResult.error;
 *   }
 *   
 *   const { userId } = authResult;
 *   // Use userId for the rest of the handler
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        error: NextResponse.json(
          {
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please sign in to continue.',
          },
          { status: 401 }
        ),
      };
    }
    
    return { userId };
  } catch (error) {
    console.error('Error checking authentication:', error);
    return {
      error: NextResponse.json(
        {
          error: 'Authentication Error',
          code: 'AUTH_ERROR',
          message: 'An error occurred while checking authentication.',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Get user ID without throwing an error
 * 
 * This is a non-throwing version of requireAuth(). It returns the userId if authenticated,
 * or null if not authenticated. Use this when you need to check authentication status
 * without returning an error response.
 * 
 * @returns Promise that resolves to userId string if authenticated, or null if not authenticated
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const userId = await getUserId();
 *   
 *   if (userId) {
 *     // User is authenticated
 *     return NextResponse.json({ data: 'protected data' });
 *   } else {
 *     // User is not authenticated, but we don't want to return an error
 *     return NextResponse.json({ data: 'public data' });
 *   }
 * }
 * ```
 */
export async function getUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}
