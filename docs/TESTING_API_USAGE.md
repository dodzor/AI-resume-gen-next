# Testing Step 3.2: API Usage Check Utilities

This guide explains how to test the `checkUsageLimit()` and `incrementUsageAfterAction()` functions from `lib/api-usage.ts`.

## Prerequisites

1. **Development server running:**
   ```bash
   npm run dev
   ```

2. **Environment variables set:**
   - `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL
   - Clerk authentication configured

3. **Test endpoint created:**
   - `/app/api/test-usage/route.ts` (we'll create this)

4. **User signed in:**
   - You need to be authenticated to test usage checks

---

## Test Endpoint

Create `/app/api/test-usage/route.ts` to test the usage utilities:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import type { ActionType } from '@/lib/plan-limits';

/**
 * Test endpoint for Step 3.2: API Usage Check Utilities
 * 
 * DELETE THIS FILE after verifying Step 3.2 works correctly.
 * 
 * Usage:
 * - POST /api/test-usage?action=job_analysis - Test checkUsageLimit and incrementUsageAfterAction
 * - GET /api/test-usage - Get current usage status
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
```

---

## Test Scenarios

### Test 1: Check Usage Limit - Free User Within Limits

**Goal:** Verify `checkUsageLimit()` allows actions when user has remaining quota.

**Steps:**
1. Sign in as a free user (or ensure you're on free plan)
2. Make sure you haven't used all your quota yet
3. Test checking usage for `job_analysis`:

**Using Browser Console:**
```javascript
fetch('/api/test-usage?action=job_analysis', {
  method: 'POST',
  credentials: 'include'
})
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Action \"job_analysis\" was allowed and usage was incremented",
  "userId": "user_xxxxxxxxxxxxx",
  "action": "job_analysis",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Code:** `200 OK`

**Verify:**
- ✅ Status code is 200
- ✅ Response indicates action was allowed
- ✅ Usage counter was incremented (check via `/test-usage` page or Convex dashboard)

---

### Test 2: Check Usage Limit - Free User Limit Exceeded

**Goal:** Verify `checkUsageLimit()` returns 403 error when limit is exceeded.

**Steps:**
1. Sign in as a free user
2. Use up all your quota (e.g., perform 3 job analyses)
3. Try to perform the action again:

**Using Browser Console:**
```javascript
fetch('/api/test-usage?action=job_analysis', {
  method: 'POST',
  credentials: 'include'
})
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

**Expected Result:**
```json
{
  "error": "Usage limit exceeded",
  "code": "USAGE_LIMIT_EXCEEDED",
  "message": "You've used all your free job analyses (3/3). Upgrade to Pro for unlimited access.",
  "details": {
    "upgradeRequired": true,
    "action": "job_analysis",
    "remaining": 0
  }
}
```

**Status Code:** `403 Forbidden`

**Verify:**
- ✅ Status code is 403
- ✅ Error object has `error`, `code`, `message`, and `details` fields
- ✅ `upgradeRequired` is `true`
- ✅ `remaining` is `0`
- ✅ Message includes upgrade prompt

---

### Test 3: Check Usage Limit - Pro User (Unlimited)

**Goal:** Verify `checkUsageLimit()` allows unlimited actions for Pro users.

**Steps:**
1. Upgrade to Pro plan (use `/test-usage` page or Convex dashboard)
2. Test checking usage for any action:

**Using Browser Console:**
```javascript
fetch('/api/test-usage?action=job_analysis', {
  method: 'POST',
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Action \"job_analysis\" was allowed and usage was incremented",
  "userId": "user_xxxxxxxxxxxxx",
  "action": "job_analysis",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Code:** `200 OK`

**Verify:**
- ✅ Status code is 200
- ✅ Action is always allowed (even after many uses)
- ✅ Usage is still tracked (for analytics) but doesn't block actions

---

### Test 4: Increment Usage After Action

**Goal:** Verify `incrementUsageAfterAction()` increments counters correctly.

**Steps:**
1. Check current usage (via `/test-usage` page or GET endpoint)
2. Perform an action:

**Using Browser Console:**
```javascript
// First, check current usage
fetch('/api/test-usage', {
  method: 'GET',
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => {
    console.log('Current usage checks:', data);
    
    // Then perform an action
    return fetch('/api/test-usage?action=ai_rewrite', {
      method: 'POST',
      credentials: 'include'
    });
  })
  .then(res => res.json())
  .then(data => console.log('After action:', data));
```

**Expected Result:**
- Usage counter increases by 1
- Action succeeds
- No errors in increment (even if increment fails, action still succeeds)

**Verify:**
- ✅ Usage counter increments correctly
- ✅ Action completes successfully
- ✅ If increment fails, it's logged but doesn't block the action

---

### Test 5: Export Feature Check (Free vs Pro)

**Goal:** Verify export action is blocked for free users.

**Steps:**
1. **As Free User:**
   ```javascript
   fetch('/api/test-usage?action=export', {
     method: 'POST',
     credentials: 'include'
   })
     .then(res => {
       console.log('Status:', res.status);
       return res.json();
     })
     .then(data => console.log('Response:', data));
   ```

   **Expected Result:**
   ```json
   {
     "error": "Usage limit exceeded",
     "code": "USAGE_LIMIT_EXCEEDED",
     "message": "PDF export is not available in your plan. Upgrade to Pro for PDF export.",
     "details": {
       "upgradeRequired": true,
       "action": "export",
       "remaining": 0
     }
   }
   ```
   **Status Code:** `403 Forbidden`

2. **Upgrade to Pro and try again:**
   - Should return `200 OK` with success message

---

### Test 6: Get All Usage Checks (GET endpoint)

**Goal:** Verify GET endpoint returns usage status for all actions.

**Steps:**
```javascript
fetch('/api/test-usage', {
  method: 'GET',
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('All usage checks:', data));
```

**Expected Result:**
```json
{
  "userId": "user_xxxxxxxxxxxxx",
  "usageChecks": {
    "job_analysis": {
      "allowed": true
    },
    "ai_rewrite": {
      "allowed": true
    },
    "create_resume": {
      "allowed": true
    },
    "export": {
      "allowed": false,
      "error": "Usage limit exceeded"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Testing with curl

### Test checkUsageLimit (within limits):
```bash
# Get your session cookie from browser DevTools → Application → Cookies
curl -X POST "http://localhost:3000/api/test-usage?action=job_analysis" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -v
```

### Test checkUsageLimit (limit exceeded):
```bash
# After using all quota
curl -X POST "http://localhost:3000/api/test-usage?action=job_analysis" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -v
```

### Test GET endpoint:
```bash
curl -X GET "http://localhost:3000/api/test-usage" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -v
```

---

## Testing with Postman

### Setup Postman Collection

1. **Create a new collection:** "API Usage Testing"

2. **Request 1: Check Usage (Within Limits)**
   - Method: `POST`
   - URL: `http://localhost:3000/api/test-usage?action=job_analysis`
   - Cookies: Include session cookie
   - Expected: 200 OK

3. **Request 2: Check Usage (Limit Exceeded)**
   - Method: `POST`
   - URL: `http://localhost:3000/api/test-usage?action=job_analysis`
   - Cookies: Include session cookie
   - Expected: 403 Forbidden with upgrade prompt

4. **Request 3: Get All Usage Checks**
   - Method: `GET`
   - URL: `http://localhost:3000/api/test-usage`
   - Cookies: Include session cookie
   - Expected: 200 OK with all usage checks

5. **Request 4: Test Export (Free User)**
   - Method: `POST`
   - URL: `http://localhost:3000/api/test-usage?action=export`
   - Cookies: Include session cookie
   - Expected: 403 Forbidden

---

## Verification Checklist

### `checkUsageLimit()` Function
- [ ] Returns `{ allowed: true }` when user has remaining quota
- [ ] Returns `{ allowed: false, error: NextResponse }` when limit exceeded
- [ ] Error response has correct structure: `{ error, code, message, details }`
- [ ] Error code is `"USAGE_LIMIT_EXCEEDED"`
- [ ] Status code is 403 for limit exceeded
- [ ] Upgrade prompt included in error message
- [ ] Works correctly for all action types
- [ ] Pro users have unlimited access
- [ ] Free users blocked from export feature

### `incrementUsageAfterAction()` Function
- [ ] Increments usage counter correctly
- [ ] Doesn't fail the main operation if increment fails
- [ ] Errors are logged but don't block requests
- [ ] Works correctly for all action types
- [ ] Handles billing period reset correctly

### Error Handling
- [ ] Handles Convex connection errors gracefully
- [ ] Returns appropriate error responses
- [ ] Logs errors for debugging
- [ ] Doesn't expose sensitive information in errors

### Integration
- [ ] Works correctly with `requireAuth()` from Step 3.1
- [ ] Uses server-side Convex functions (`canPerformActionServer`, `incrementUsageServer`)
- [ ] ConvexHttpClient is created correctly
- [ ] Environment variables are checked

---

## Expected Test Results Summary

| Scenario | Action | Plan | Status | Response |
|----------|--------|------|--------|----------|
| Within limits | `job_analysis` | Free | 200 | Success, usage incremented |
| Limit exceeded | `job_analysis` | Free (3/3 used) | 403 | Error with upgrade prompt |
| Unlimited | `job_analysis` | Pro | 200 | Success, usage incremented |
| Feature blocked | `export` | Free | 403 | Error: "PDF export not available" |
| Feature allowed | `export` | Pro | 200 | Success, usage incremented |
| Resume limit | `create_resume` | Free (1/1 used) | 403 | Error with upgrade prompt |

---

## Troubleshooting

### Issue: Always getting "Usage Check Error"
- **Check:** Make sure `NEXT_PUBLIC_CONVEX_URL` is set in `.env.local`
- **Check:** Verify Convex deployment is running
- **Check:** Check server logs for Convex connection errors

### Issue: Usage not incrementing
- **Check:** Verify `incrementUsageServer` mutation exists in `convex/usage.ts`
- **Check:** Check Convex dashboard for errors
- **Check:** Verify user is authenticated (userId is valid)

### Issue: Limits not enforced
- **Check:** Verify `canPerformActionServer` query exists in `convex/usage.ts`
- **Check:** Check user's plan in Convex dashboard
- **Check:** Verify usage counters are correct

### Issue: Pro users getting blocked
- **Check:** Verify plan is set to "pro" in Convex
- **Check:** Check that unlimited limits (-1) are handled correctly
- **Check:** Verify `getActionLimit()` returns -1 for Pro plan

---

## Next Steps

After verifying Step 3.2 works correctly:

1. **Delete test endpoint** (`/app/api/test-usage/route.ts`) if you created one
2. **Proceed to Step 3.3:** Update All API Routes with Auth + Usage Checks
3. **Test integration:** Verify usage checks work in actual API routes

---

## Notes

- These tests verify the usage check utilities work correctly
- The actual integration into API routes happens in Step 3.3
- You can keep the test endpoint for now and delete it after Step 3.3 is complete
- Consider using the `/test-usage` page (`/app/test-usage/page.tsx`) to verify usage tracking at the Convex level
