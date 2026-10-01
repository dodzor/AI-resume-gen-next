# Testing Step 3.3: API Routes with Auth + Usage Checks

This guide helps you test all updated API routes with authenticated and unauthenticated requests.

## Prerequisites

1. **Development server running:**
   ```bash
   npm run dev
   ```

2. **Browser with DevTools open:**
   - Chrome/Edge: F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows)
   - Firefox: F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows)

3. **Test user account:**
   - Sign in to your app at `http://localhost:3000`
   - Keep the browser console open for testing

---

## Quick Test Script

Copy and paste this into your browser console (while signed in):

```javascript
// Test all routes - authenticated
async function testAllRoutes() {
  const baseUrl = window.location.origin;
  const results = [];
  
  // Test 1: Analyze Job Description
  try {
    const res = await fetch(`${baseUrl}/api/analyze-job-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: 'Senior Software Engineer',
        job: 'We are looking for a senior software engineer with 5+ years of experience...'
      })
    });
    const data = await res.json();
    results.push({ route: 'analyze-job-description', status: res.status, success: res.ok, data });
  } catch (e) {
    results.push({ route: 'analyze-job-description', error: e.message });
  }
  
  // Test 2: Rewrite Bullet
  try {
    const res = await fetch(`${baseUrl}/api/rewrite-bullet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        bullet: 'Responsible for developing web applications'
      })
    });
    const data = await res.json();
    results.push({ route: 'rewrite-bullet', status: res.status, success: res.ok, data });
  } catch (e) {
    results.push({ route: 'rewrite-bullet', error: e.message });
  }
  
  // Test 3: Improve Experience
  try {
    const res = await fetch(`${baseUrl}/api/improve-experience`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        description: 'Worked on various projects'
      })
    });
    const data = await res.json();
    results.push({ route: 'improve-experience', status: res.status, success: res.ok, data });
  } catch (e) {
    results.push({ route: 'improve-experience', error: e.message });
  }
  
  // Test 4: Generate Summary
  try {
    const res = await fetch(`${baseUrl}/api/generate-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        job: 'Senior Software Engineer position...',
        name: 'John Doe',
        email: 'john@example.com',
        experience: '5 years',
        education: 'BS Computer Science',
        skills: 'JavaScript, React, Node.js'
      })
    });
    const data = await res.json();
    results.push({ route: 'generate-summary', status: res.status, success: res.ok, data });
  } catch (e) {
    results.push({ route: 'generate-summary', error: e.message });
  }
  
  // Test 5: Generate Resume
  try {
    const res = await fetch(`${baseUrl}/api/generate-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        experience: '5 years software development',
        education: 'BS Computer Science',
        skills: 'JavaScript, React, Node.js',
        job: 'Senior Software Engineer position...'
      })
    });
    const data = await res.json();
    results.push({ route: 'generate-resume', status: res.status, success: res.ok, data });
  } catch (e) {
    results.push({ route: 'generate-resume', error: e.message });
  }
  
  // Test 6: Generate PDF
  try {
    const res = await fetch(`${baseUrl}/api/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        content: '<html><body><h1>Resume</h1></body></html>'
      })
    });
    results.push({ 
      route: 'generate-pdf', 
      status: res.status, 
      success: res.ok,
      contentType: res.headers.get('content-type'),
      isPDF: res.headers.get('content-type')?.includes('application/pdf')
    });
  } catch (e) {
    results.push({ route: 'generate-pdf', error: e.message });
  }
  
  console.table(results);
  return results;
}

// Run tests
testAllRoutes();
```

---

## Individual Route Testing

### Test 1: `/api/analyze-job-description`

#### Authenticated Request (Should Work)

**Browser Console:**
```javascript
fetch('/api/analyze-job-description', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    title: 'Senior Software Engineer',
    job: 'We are looking for a senior software engineer with 5+ years of experience in JavaScript and React. Must have experience with Node.js and databases.'
  })
})
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

**Expected Result:**
- Status: `200 OK`
- Response: `{ success: true, tone: "...", keywords: [...], ... }`
- Usage counter incremented

#### Unauthenticated Request (Should Fail)

**Browser Console (in incognito/not signed in):**
```javascript
fetch('/api/analyze-job-description', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Senior Software Engineer',
    job: 'Test job description'
  })
})
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

**Expected Result:**
- Status: `401 Unauthorized`
- Response: `{ error: "Unauthorized", code: "UNAUTHORIZED", message: "..." }`

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/analyze-job-description \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","job":"Test description"}' \
  -v
```

---

### Test 2: `/api/rewrite-bullet`

#### Authenticated Request

```javascript
fetch('/api/rewrite-bullet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    bullet: 'Responsible for developing web applications using React and Node.js'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected:** `200 OK` with rewritten bullet

#### Unauthenticated Request

```javascript
fetch('/api/rewrite-bullet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bullet: 'Test bullet'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected:** `401 Unauthorized`

---

### Test 3: `/api/improve-experience`

#### Authenticated Request

```javascript
fetch('/api/improve-experience', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    description: 'Worked on various web development projects using React and Node.js'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected:** `200 OK` with improved description

#### Unauthenticated Request

```javascript
fetch('/api/improve-experience', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: 'Test description'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected:** `401 Unauthorized`

---

### Test 4: `/api/generate-summary`

#### Authenticated Request

```javascript
fetch('/api/generate-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    job: 'Senior Software Engineer position requiring 5+ years experience',
    name: 'John Doe',
    email: 'john@example.com',
    experience: '5 years software development',
    education: 'BS Computer Science',
    skills: 'JavaScript, React, Node.js'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected:** `200 OK` with generated summary

#### Unauthenticated Request

```javascript
fetch('/api/generate-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    job: 'Test job',
    name: 'Test',
    email: 'test@example.com',
    experience: 'Test',
    education: 'Test',
    skills: 'Test'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected:** `401 Unauthorized`

---

### Test 5: `/api/generate-resume`

#### Authenticated Request

```javascript
fetch('/api/generate-resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    experience: '5 years software development',
    education: 'BS Computer Science',
    skills: 'JavaScript, React, Node.js',
    job: 'Senior Software Engineer position...'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected:** `200 OK` with generated resume HTML

#### Unauthenticated Request

```javascript
fetch('/api/generate-resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test',
    email: 'test@example.com',
    experience: 'Test',
    education: 'Test',
    skills: 'Test',
    job: 'Test'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected:** `401 Unauthorized`

---

### Test 6: `/api/generate-pdf`

#### Authenticated Request (Pro User)

```javascript
fetch('/api/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    content: '<html><body><h1>Resume</h1><p>Test content</p></body></html>'
  })
})
  .then(res => {
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    return res.blob();
  })
  .then(blob => {
    console.log('PDF blob size:', blob.size, 'bytes');
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-resume.pdf';
    a.click();
  });
```

**Expected (Pro):** `200 OK` with PDF blob  
**Expected (Free):** `403 Forbidden` with upgrade prompt

#### Unauthenticated Request

```javascript
fetch('/api/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: '<html><body>Test</body></html>'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data));
```

**Expected:** `401 Unauthorized`

---

## Testing Usage Limits

### Test Free Tier Limits

1. **Sign in as a free user**
2. **Use up your quota:**
   ```javascript
   // Use all 3 job analyses
   for (let i = 0; i < 3; i++) {
     await fetch('/api/analyze-job-description', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       credentials: 'include',
       body: JSON.stringify({
         title: `Test Job ${i}`,
         job: 'Test description'
       })
     });
   }
   ```

3. **Try to exceed limit:**
   ```javascript
   fetch('/api/analyze-job-description', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include',
     body: JSON.stringify({
       title: 'Test Job',
       job: 'Test description'
     })
   })
     .then(res => {
       console.log('Status:', res.status);
       return res.json();
     })
     .then(data => console.log('Response:', data));
   ```

**Expected:** `403 Forbidden` with:
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

---

## Testing with Postman

### Setup

1. **Create a new collection:** "API Routes Testing"
2. **Set up environment variables:**
   - `baseUrl`: `http://localhost:3000`
   - `sessionCookie`: (Get from browser DevTools → Application → Cookies → `__session`)

### Request Examples

**1. Analyze Job Description (Authenticated)**
- Method: `POST`
- URL: `{{baseUrl}}/api/analyze-job-description`
- Headers:
  - `Content-Type: application/json`
- Cookies:
  - `__session: {{sessionCookie}}`
- Body (JSON):
  ```json
  {
    "title": "Senior Software Engineer",
    "job": "We are looking for..."
  }
  ```

**2. Analyze Job Description (Unauthenticated)**
- Method: `POST`
- URL: `{{baseUrl}}/api/analyze-job-description`
- Headers:
  - `Content-Type: application/json`
- No cookies
- Body: Same as above
- Expected: `401 Unauthorized`

---

## Testing Checklist

### Authentication Tests
- [ ] All routes return `401 Unauthorized` when not authenticated
- [ ] All routes work when authenticated (with valid session cookie)
- [ ] Error messages are clear and helpful

### Usage Limit Tests
- [ ] Free users can use actions within limits
- [ ] Free users get `403 Forbidden` when limit exceeded
- [ ] Error responses include upgrade prompts
- [ ] Pro users have unlimited access
- [ ] Usage counters increment correctly

### Route-Specific Tests
- [ ] `/api/analyze-job-description` - `job_analysis` action
- [ ] `/api/rewrite-bullet` - `ai_rewrite` action
- [ ] `/api/improve-experience` - `ai_rewrite` action
- [ ] `/api/generate-summary` - `ai_rewrite` action
- [ ] `/api/generate-resume` - `create_resume` action (lifetime limit)
- [ ] `/api/generate-pdf` - `export` action (Pro-only)
- [ ] `/api/search` - No protection (should work without auth)

### Error Handling Tests
- [ ] Invalid request body returns `400 Bad Request`
- [ ] Missing required fields return appropriate errors
- [ ] OpenAI API errors are handled gracefully
- [ ] Usage increment errors don't fail the main operation

---

## Quick Test Script (All Routes)

Save this as `test-routes.html` and open in browser:

```html
<!DOCTYPE html>
<html>
<head>
  <title>API Routes Test</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    .test { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
    .success { background: #d4edda; }
    .error { background: #f8d7da; }
    button { margin: 5px; padding: 10px; }
  </style>
</head>
<body>
  <h1>API Routes Test</h1>
  <button onclick="testAll()">Test All Routes (Authenticated)</button>
  <button onclick="testUnauthenticated()">Test All Routes (Unauthenticated)</button>
  <div id="results"></div>

  <script>
    const baseUrl = 'http://localhost:3000';
    
    async function testRoute(name, url, method, body, authenticated = true) {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      };
      
      if (authenticated) {
        options.credentials = 'include';
      }
      
      try {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => ({ raw: 'Non-JSON response' }));
        return {
          name,
          status: res.status,
          success: res.ok,
          authenticated,
          data
        };
      } catch (e) {
        return {
          name,
          error: e.message,
          authenticated
        };
      }
    }
    
    async function testAll() {
      const results = [];
      const routes = [
        ['analyze-job-description', '/api/analyze-job-description', 'POST', { title: 'Test', job: 'Test' }],
        ['rewrite-bullet', '/api/rewrite-bullet', 'POST', { bullet: 'Test bullet' }],
        ['improve-experience', '/api/improve-experience', 'POST', { description: 'Test' }],
        ['generate-summary', '/api/generate-summary', 'POST', { job: 'Test', name: 'Test', email: 'test@test.com', experience: 'Test', education: 'Test', skills: 'Test' }],
        ['generate-resume', '/api/generate-resume', 'POST', { name: 'Test', email: 'test@test.com', experience: 'Test', education: 'Test', skills: 'Test', job: 'Test' }],
        ['generate-pdf', '/api/generate-pdf', 'POST', { content: '<html><body>Test</body></html>' }]
      ];
      
      for (const [name, url, method, body] of routes) {
        const result = await testRoute(name, baseUrl + url, method, body, true);
        results.push(result);
      }
      
      displayResults(results);
    }
    
    async function testUnauthenticated() {
      const results = [];
      const routes = [
        ['analyze-job-description', '/api/analyze-job-description', 'POST', { title: 'Test', job: 'Test' }],
        ['rewrite-bullet', '/api/rewrite-bullet', 'POST', { bullet: 'Test' }]
      ];
      
      for (const [name, url, method, body] of routes) {
        const result = await testRoute(name, baseUrl + url, method, body, false);
        results.push(result);
      }
      
      displayResults(results);
    }
    
    function displayResults(results) {
      const div = document.getElementById('results');
      div.innerHTML = results.map(r => `
        <div class="test ${r.success ? 'success' : 'error'}">
          <strong>${r.name}</strong> (${r.authenticated ? 'Authenticated' : 'Unauthenticated'})<br>
          Status: ${r.status || 'N/A'}<br>
          Success: ${r.success ? 'Yes' : 'No'}<br>
          ${r.error ? `Error: ${r.error}` : ''}
          ${r.data ? `Data: ${JSON.stringify(r.data).substring(0, 200)}...` : ''}
        </div>
      `).join('');
    }
  </script>
</body>
</html>
```

---

## Expected Results Summary

| Route | Authenticated | Unauthenticated | Free Limit | Pro |
|-------|--------------|-----------------|------------|-----|
| `/api/analyze-job-description` | 200 OK | 401 Unauthorized | 3/month | Unlimited |
| `/api/rewrite-bullet` | 200 OK | 401 Unauthorized | 3/month | Unlimited |
| `/api/improve-experience` | 200 OK | 401 Unauthorized | 3/month | Unlimited |
| `/api/generate-summary` | 200 OK | 401 Unauthorized | 3/month | Unlimited |
| `/api/generate-resume` | 200 OK | 401 Unauthorized | 1 lifetime | 10 lifetime |
| `/api/generate-pdf` | 200 OK (Pro) / 403 (Free) | 401 Unauthorized | Blocked | Unlimited |
| `/api/search` | 200 OK | 200 OK | N/A | N/A |

---

## Troubleshooting

### Issue: Always getting 401 even when signed in
- **Check:** Make sure `credentials: 'include'` is set in fetch options
- **Check:** Verify you're signed in to the same domain (localhost:3000)
- **Check:** Check browser console for Clerk errors

### Issue: Usage limits not enforced
- **Check:** Verify Convex is running and connected
- **Check:** Check user's plan in Convex dashboard
- **Check:** Verify usage counters are incrementing

### Issue: Pro users getting blocked
- **Check:** Verify plan is set to "pro" in Convex
- **Check:** Check Convex dashboard for user's plan tier

---

## Notes

- All routes now require authentication except `/api/search`
- Usage limits are enforced server-side
- Error responses include upgrade prompts
- Usage tracking happens after successful operations
- Test in both authenticated and unauthenticated states
- Test with both free and pro plan tiers
