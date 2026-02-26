# Testing Step 3.1: API Authentication Utilities

This guide explains how to test the `requireAuth()` and `getUserId()` functions from `lib/api-auth.ts` without modifying any code.

## Prerequisites

1. **Development server running:**
   ```bash
   npm run dev
   ```

2. **Clerk configured:**
   - Make sure Clerk is set up with `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`
   - You should be able to sign in/out in the app

3. **Test API route (temporary):**
   - We'll create a simple test endpoint to verify the auth utilities work
   - Or use an existing API route that you can temporarily modify (just for testing)

## Testing Approach

### Option 1: Create a Temporary Test Endpoint (Recommended)

Create a simple test endpoint at `/app/api/test-auth/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/api-auth';

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
```

**Note:** This is just for testing. You can delete it after verification.

### Option 2: Test with Existing API Routes

You can test by temporarily adding auth checks to an existing route, but this requires code changes. We'll focus on Option 1.

---

## Test Scenarios

### Test 1: `requireAuth()` - Authenticated Request

**Goal:** Verify `requireAuth()` returns `userId` when user is authenticated.

**Steps:**
1. Sign in to your app in the browser
2. Open browser DevTools → Network tab
3. Make a POST request to `/api/test-auth`:

**Using Browser Console:**
```javascript
fetch('/api/test-auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include' // Important: includes cookies/auth headers
})
  .then(res => res.json())
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

**Using curl (with session cookie):**
```bash
# First, get your session cookie from browser DevTools → Application → Cookies
# Then use it in curl:
curl -X POST http://localhost:3000/api/test-auth \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE"
```

**Expected Result:**
```json
{
  "success": true,
  "userId": "user_xxxxxxxxxxxxx",
  "message": "Authentication successful"
}
```

**Status Code:** `200 OK`

---

### Test 2: `requireAuth()` - Unauthenticated Request

**Goal:** Verify `requireAuth()` returns 401 error when user is not authenticated.

**Steps:**
1. Sign out of your app (or use incognito/private window)
2. Make a POST request without authentication:

**Using Browser Console (in incognito/not signed in):**
```javascript
fetch('/api/test-auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
})
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

**Using curl (without cookies):**
```bash
curl -X POST http://localhost:3000/api/test-auth \
  -H "Content-Type: application/json" \
  -v  # -v shows response headers
```

**Expected Result:**
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "message": "Authentication required. Please sign in to continue."
}
```

**Status Code:** `401 Unauthorized`

**Verify:**
- ✅ Status code is 401
- ✅ Error object has `error`, `code`, and `message` fields
- ✅ `code` is `"UNAUTHORIZED"`

---

### Test 3: `getUserId()` - Authenticated Request

**Goal:** Verify `getUserId()` returns `userId` when authenticated (non-throwing).

**Steps:**
1. Sign in to your app
2. Make a GET request to `/api/test-auth`:

**Using Browser Console:**
```javascript
fetch('/api/test-auth', {
  method: 'GET',
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected Result:**
```json
{
  "authenticated": true,
  "userId": "user_xxxxxxxxxxxxx",
  "message": "User is authenticated"
}
```

**Status Code:** `200 OK`

---

### Test 4: `getUserId()` - Unauthenticated Request

**Goal:** Verify `getUserId()` returns `null` without throwing error.

**Steps:**
1. Sign out (or use incognito window)
2. Make a GET request:

**Using Browser Console:**
```javascript
fetch('/api/test-auth', {
  method: 'GET'
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected Result:**
```json
{
  "authenticated": false,
  "userId": null,
  "message": "User is not authenticated (but no error thrown)"
}
```

**Status Code:** `200 OK` (not 401!)

**Verify:**
- ✅ Status code is 200 (not 401)
- ✅ `authenticated` is `false`
- ✅ `userId` is `null`
- ✅ No error thrown (unlike `requireAuth()`)

---

## Testing with Postman

### Setup Postman Collection

1. **Create a new collection:** "API Auth Testing"

2. **Request 1: Test requireAuth (Authenticated)**
   - Method: `POST`
   - URL: `http://localhost:3000/api/test-auth`
   - Headers:
     - `Content-Type: application/json`
   - Auth Tab:
     - Type: "No Auth" (we'll use cookies)
   - Cookies:
     - Add your session cookie from browser
   - Expected: 200 OK with userId

3. **Request 2: Test requireAuth (Unauthenticated)**
   - Method: `POST`
   - URL: `http://localhost:3000/api/test-auth`
   - Headers:
     - `Content-Type: application/json`
   - No cookies
   - Expected: 401 Unauthorized

4. **Request 3: Test getUserId (Authenticated)**
   - Method: `GET`
   - URL: `http://localhost:3000/api/test-auth`
   - Cookies: Include session cookie
   - Expected: 200 OK with userId

5. **Request 4: Test getUserId (Unauthenticated)**
   - Method: `GET`
   - URL: `http://localhost:3000/api/test-auth`
   - No cookies
   - Expected: 200 OK with null userId

---

## Testing Type Guards

You can also test the type guard functions in a TypeScript file:

**Create:** `/app/test-auth-types.ts` (temporary test file)

```typescript
import { requireAuth, isAuthSuccess, isAuthError, type AuthResult } from '@/lib/api-auth';

async function testTypeGuards() {
  const result: AuthResult = await requireAuth();
  
  // Test isAuthSuccess()
  if (isAuthSuccess(result)) {
    console.log('Success! User ID:', result.userId);
    // TypeScript should know result.userId exists here
  }
  
  // Test isAuthError()
  if (isAuthError(result)) {
    console.log('Error! Status:', result.error.status);
    // TypeScript should know result.error exists here
  }
  
  // Alternative: Using 'in' operator
  if ('userId' in result) {
    console.log('User ID:', result.userId);
  } else {
    console.log('Error response:', result.error);
  }
}
```

**Verify:**
- ✅ TypeScript doesn't show errors
- ✅ Type narrowing works correctly
- ✅ IntelliSense shows correct properties

---

## Edge Cases to Test

### 1. **Clerk Service Error**
- Simulate Clerk being unavailable
- Verify error handling returns 500 with `AUTH_ERROR` code

### 2. **Malformed Auth Token**
- Try with invalid/expired session cookie
- Should return 401 Unauthorized

### 3. **Concurrent Requests**
- Make multiple requests simultaneously
- Verify all handle correctly

---

## Verification Checklist

### `requireAuth()` Function
- [ ] Returns `{ userId: string }` when authenticated
- [ ] Returns `{ error: NextResponse }` with 401 when not authenticated
- [ ] Error response has correct structure: `{ error, code, message }`
- [ ] Error code is `"UNAUTHORIZED"` for unauthenticated requests
- [ ] Handles Clerk errors gracefully (returns 500 with `AUTH_ERROR`)

### `getUserId()` Function
- [ ] Returns `string` (userId) when authenticated
- [ ] Returns `null` when not authenticated
- [ ] Never throws errors (always returns null on failure)
- [ ] Status code is always 200 (doesn't return error response)

### Type Guards
- [ ] `isAuthSuccess()` correctly identifies success case
- [ ] `isAuthError()` correctly identifies error case
- [ ] TypeScript type narrowing works correctly

### Error Response Format
- [ ] Consistent error structure across all error cases
- [ ] Includes `error`, `code`, and `message` fields
- [ ] HTTP status codes are correct (401 for unauthorized, 500 for errors)

---

## Quick Test Script

Save this as `test-auth.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Testing requireAuth() - Unauthenticated ==="
curl -X POST "$BASE_URL/api/test-auth" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo -e "\n=== Testing getUserId() - Unauthenticated ==="
curl -X GET "$BASE_URL/api/test-auth" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo -e "\n=== Testing requireAuth() - Authenticated ==="
echo "Note: Add your session cookie to test authenticated requests"
echo "Get cookie from browser DevTools → Application → Cookies → __session"
echo "Then run:"
echo "curl -X POST '$BASE_URL/api/test-auth' -H 'Content-Type: application/json' -H 'Cookie: __session=YOUR_COOKIE'"
```

Make it executable:
```bash
chmod +x test-auth.sh
./test-auth.sh
```

---

## Expected Test Results Summary

| Function | Scenario | Status Code | Response |
|----------|----------|-------------|----------|
| `requireAuth()` | Authenticated | 200 | `{ userId: "user_xxx" }` |
| `requireAuth()` | Unauthenticated | 401 | `{ error: "Unauthorized", code: "UNAUTHORIZED", message: "..." }` |
| `requireAuth()` | Clerk Error | 500 | `{ error: "Authentication Error", code: "AUTH_ERROR", message: "..." }` |
| `getUserId()` | Authenticated | 200 | `{ authenticated: true, userId: "user_xxx" }` |
| `getUserId()` | Unauthenticated | 200 | `{ authenticated: false, userId: null }` |

---

## Next Steps

After verifying Step 3.1 works correctly:

1. **Delete test endpoint** (`/app/api/test-auth/route.ts`) if you created one
2. **Proceed to Step 3.2:** Create Usage Check Utilities
3. **Proceed to Step 3.3:** Update All API Routes with Auth + Usage Checks

---

## Troubleshooting

### Issue: Always getting 401 even when signed in
- **Check:** Make sure you're including cookies in the request (`credentials: 'include'` in fetch)
- **Check:** Verify Clerk is properly configured in `.env.local`
- **Check:** Make sure you're signed in to the same domain (localhost:3000)

### Issue: TypeScript errors
- **Check:** Make sure `@clerk/nextjs` is installed: `npm list @clerk/nextjs`
- **Check:** Verify TypeScript can resolve the imports

### Issue: getUserId() returns null when authenticated
- **Check:** Clerk auth might not be working in API routes
- **Check:** Verify middleware is configured correctly
- **Check:** Check browser console for Clerk errors

---

## Notes

- These tests verify the authentication utilities work correctly
- The actual integration into API routes happens in Step 3.3
- You can keep the test endpoint for now and delete it after Step 3.3 is complete
- Consider adding these tests to your test suite if you set up automated testing
