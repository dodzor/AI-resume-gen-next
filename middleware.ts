import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Get Clerk publishable key from environment
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Create middleware - use Clerk if key is available, otherwise passthrough
const middleware = publishableKey
  ? clerkMiddleware({
      publishableKey,
    })
  : function(request: NextRequest) {
      console.warn('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Middleware running in passthrough mode.');
      return NextResponse.next();
    };

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
