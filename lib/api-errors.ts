/**
 * API Error Handling Utilities
 *
 * Centralized error types and helpers for building and parsing
 * consistent API error responses.
 *
 * Based on SUBSCRIPTION_IMPLEMENTATION_PLAN.md Step 6.1
 */

import { NextResponse } from 'next/server';
import type { ActionType } from '@/lib/plan-limits';

/**
 * Shape of the `details` field for API errors.
 */
export interface ApiErrorDetails {
  upgradeRequired?: boolean;
  action?: ActionType;
  remaining?: number;
  limit?: number;
}

/**
 * Standard API error response body.
 */
export interface ApiErrorResponseBody {
  error: string;
  code: string;
  message: string;
  details?: ApiErrorDetails;
}

/**
 * Base API error class used by more specific error types.
 */
export class ApiError extends Error {
  code: string;
  details?: ApiErrorDetails;

  constructor(message: string, code: string, details?: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error thrown when a user has exceeded their usage limits.
 */
export class UsageLimitError extends ApiError {
  constructor(message: string, details?: ApiErrorDetails) {
    super(message, 'USAGE_LIMIT_EXCEEDED', details);
    this.name = 'UsageLimitError';
  }
}

/**
 * Error for unauthenticated requests (HTTP 401).
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required. Please sign in to continue.') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error for forbidden requests (HTTP 403).
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * Helper to build a consistent JSON error response.
 *
 * @param body - Error response body
 * @param status - HTTP status code (defaults to 400)
 */
export function createErrorResponse(
  body: ApiErrorResponseBody,
  status: number = 400
): NextResponse {
  return NextResponse.json(body, { status });
}

/**
 * Helper to build a Usage Limit error response.
 *
 * Prefer using this over duplicating error JSON in routes.
 */
export function createUsageLimitError(
  message: string,
  details: ApiErrorDetails & { action: ActionType }
): NextResponse {
  const body: ApiErrorResponseBody = {
    error: 'Usage limit exceeded',
    code: 'USAGE_LIMIT_EXCEEDED',
    message,
    details,
  };

  return createErrorResponse(body, 403);
}

/**
 * Helper to build an Unauthorized error response (401).
 */
export function createUnauthorizedError(
  message = 'Authentication required. Please sign in to continue.'
): NextResponse {
  const body: ApiErrorResponseBody = {
    error: 'Unauthorized',
    code: 'UNAUTHORIZED',
    message,
  };

  return createErrorResponse(body, 401);
}

/**
 * Helper to build a Forbidden error response (403).
 */
export function createForbiddenError(
  message = 'You do not have permission to perform this action.'
): NextResponse {
  const body: ApiErrorResponseBody = {
    error: 'Forbidden',
    code: 'FORBIDDEN',
    message,
  };

  return createErrorResponse(body, 403);
}

/**
 * Frontend utility: safely parse an error response body.
 *
 * This is intended to be used in client components after a `fetch` call.
 */
export async function parseApiErrorResponse(
  response: Response
): Promise<ApiErrorResponseBody | null> {
  try {
    const data = await response.json();

    if (!data || typeof data !== 'object') {
      return null;
    }

    const { error, code, message, details } = data as Partial<ApiErrorResponseBody>;

    if (typeof error !== 'string' || typeof code !== 'string' || typeof message !== 'string') {
      return null;
    }

    return {
      error,
      code,
      message,
      details: details as ApiErrorDetails | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Frontend helper to classify an API error response.
 *
 * This does not show UI directly; instead it provides structured info
 * that components can use to decide whether to show a toast, modal, etc.
 */
export function classifyApiError(
  body: ApiErrorResponseBody
): {
  isUnauthorized: boolean;
  isForbidden: boolean;
  isUsageLimit: boolean;
  upgradeRequired: boolean;
} {
  const code = body.code?.toUpperCase?.() ?? '';

  const isUnauthorized = code === 'UNAUTHORIZED';
  const isForbidden = code === 'FORBIDDEN';
  const isUsageLimit = code === 'USAGE_LIMIT_EXCEEDED';
  const upgradeRequired = Boolean(body.details?.upgradeRequired);

  return {
    isUnauthorized,
    isForbidden,
    isUsageLimit,
    upgradeRequired,
  };
}

