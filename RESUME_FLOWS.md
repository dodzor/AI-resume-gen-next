# Resume Management Flows Documentation

This document describes the key flows in the AI Resume Generator application, including auto-save, resume loading, and resume switching functionality.

## Table of Contents

1. [On Page Load Flow](#on-page-load-flow)
2. [Auto-Save Flow](#auto-save-flow)
3. [Resume Switching Flow](#resume-switching-flow)
4. [Creating New Resume Flow](#creating-new-resume-flow)

---

## On Page Load Flow

### Overview
When the user visits the page or refreshes, the application automatically loads their most recent resume or the one they were last editing.

### Steps

1. **Fetch All Resumes**
   - `useQuery(api.resumes.getUserResumes)` automatically fetches all resumes for the authenticated user
   - This happens reactively when the component mounts

2. **Determine Which Resume to Load**
   - Check `localStorage` for `lastEditedResumeId`
   - If found, verify the resume still exists in the fetched resumes list
   - If not found or doesn't exist, use the most recent resume (first in the list, sorted by creation date)
   - If no resumes exist, show empty state

3. **Set Current Resume ID**
   - Set `currentResumeId` state to the selected resume ID
   - This triggers the `getResume` query automatically via conditional `useQuery`

4. **Load Resume Data**
   - When `getResume` data becomes available, map Convex resume data to form state:
     - Map all fields (name, email, experiences, education, etc.)
     - Handle optional fields with fallbacks
     - Map `generatedResume` HTML string
   - Update form state with mapped data
   - Set `loadedResumeData` for change detection
   - Update `localStorage` with the resume ID

5. **Complete Loading**
   - Set loading flags to false
   - Reset `hasUserEdited` flag (prevents auto-save on initial load)
   - Form is now ready for editing

### Key Components
- **Convex Queries**: `getUserResumes`, `getResume`
- **State Management**: `currentResumeId`, `isLoadingResume`, `loadedResumeData`
- **localStorage**: `LAST_EDITED_RESUME_KEY`

---

## Auto-Save Flow

### Overview
The application automatically saves resume changes 2 seconds after the user stops editing, preventing data loss and providing a seamless experience.

### Steps

1. **User Makes Edit**
   - User changes any field in `formData` or `generatedResume`
   - React detects the state change

2. **Track User Edit**
   - `useEffect` detects `formData` or `generatedResume` changes
   - Sets `hasUserEdited = true` (only if not loading from Convex and not initial mount)
   - This flag prevents auto-save from triggering on initial data load

3. **Debounce Timer**
   - `useEffect` detects the change and:
     - Clears any existing timeout
     - Sets a new 2-second timeout
     - If user edits again within 2 seconds, the timer resets

4. **After 2 Seconds of Inactivity**
   - Timeout fires and calls `handleAutoSave()`

5. **Auto-Save Validation**
   - `handleAutoSave` performs several checks:
     - **Loading check**: Don't save if still loading from Convex
     - **Edit check**: Don't save if user hasn't edited yet
     - **Change check**: Don't save if form data hasn't actually changed (compares with `loadedResumeData`)
     - **Required fields**: Don't save if `name` or `email` is missing

6. **Save to Convex**
   - If all checks pass:
     - Set `isSaving = true` (shows "Saving..." indicator)
     - Call `saveResume` mutation with current form data
     - If `currentResumeId` exists, it updates; otherwise creates new resume
     - Returns the resume ID

7. **Update State After Save**
   - Set `currentResumeId` to the returned ID
   - Set `lastSaved` timestamp (shows "Saved [time]" indicator)
   - Update `localStorage` with resume ID
   - Update `loadedResumeData` to current state (prevents false change detection)
   - Set `isSaving = false`

### Key Components
- **Change Detection**: `hasFormDataChanged()` function compares current vs loaded data
- **Debounce**: 2-second timeout using `setTimeout`
- **State Flags**: `hasUserEdited`, `isLoadingFromConvex`, `isSaving`
- **Mutation**: `saveResume` from Convex

### Edge Cases Handled
- Prevents saving on initial page load
- Prevents saving if data hasn't actually changed
- Prevents saving while loading resume data
- Silently fails on errors (logs to console, doesn't interrupt user)

---

## Resume Switching Flow

### Overview
Users can switch between multiple saved resumes using the ResumeSwitcher component, which provides a dropdown list of all their resumes.

### Steps

1. **User Opens Switcher**
   - User clicks "Switch" button in the ResumeSwitcher component
   - Dropdown menu opens showing all user's resumes
   - Each resume shows: name, email, and last saved date

2. **User Selects Resume**
   - User clicks on a resume in the dropdown
   - Calls `handleSelectResume(resumeId)` handler
   - Dropdown closes automatically

3. **Update Current Resume ID**
   - `handleSelectResume` sets `currentResumeId` to the selected ID
   - Sets loading flags: `isLoadingFromConvex = true`, `isLoadingResume = true`
   - Resets `hasUserEdited = false` (prevents auto-save during switch)

4. **Fetch Resume Data**
   - `useQuery(api.resumes.getResume)` automatically fetches the resume data
   - Query is conditional: only runs when `currentResumeId` is set

5. **Map Data to Form**
   - When `getResume` data becomes available, `useEffect` triggers:
     - Maps all Convex resume fields to form data structure
     - Handles optional fields and arrays
     - Sets `formData` with mapped data
     - Sets `generatedResume` with saved HTML
     - Updates `loadedResumeData` for change detection

6. **Update localStorage**
   - Stores the selected resume ID in `localStorage`
   - Ensures this resume loads on next page refresh

7. **Complete Loading**
   - After a short delay (100ms), sets loading flags to false
   - Resets `hasUserEdited` flag
   - Form now displays the selected resume
   - User can continue editing

### Key Components
- **ResumeSwitcher Component**: UI component with dropdown menu
- **Handler**: `handleSelectResume(resumeId)`
- **State**: `currentResumeId`, `isLoadingResume`
- **Query**: `getResume` from Convex

### UI Features
- Shows current resume name and last saved time
- Highlights currently selected resume in dropdown
- Loading indicator while switching
- Smooth transitions between resumes

---

## Creating New Resume Flow

### Overview
Users can create a new resume from scratch, which clears the current form and starts fresh.

### Steps

1. **User Clicks "New Resume"**
   - User clicks "New Resume" button in ResumeSwitcher or empty state
   - Calls `handleCreateNew()` handler

2. **Reset Form State**
   - Sets `formData` to default empty values using `getDefaultFormData()`
   - Clears `generatedResume` (empty string)
   - Sets `currentResumeId = null` (indicates new resume)

3. **Reset Tracking State**
   - Clears `loadedResumeData` (no baseline for change detection)
   - Resets `hasUserEdited = false`
   - Removes `lastEditedResumeId` from `localStorage`
   - Sets loading flags to false

4. **Form Ready for Input**
   - Form now shows empty/default values
   - User can start filling out the new resume
   - Auto-save will create a new resume when user starts editing

5. **First Auto-Save**
   - When user makes first edit and auto-save triggers:
     - Since `currentResumeId` is null, `saveResume` creates a new resume
     - Returns new resume ID
     - Updates `currentResumeId` with new ID
     - Updates `localStorage` with new ID

### Key Components
- **Handler**: `handleCreateNew()`
- **Default Data**: `getDefaultFormData()` function
- **State Reset**: All form and tracking state cleared

### UI States
- Shows "No resume loaded" if no resume is selected
- Empty state shows "Create Your First Resume" CTA if no resumes exist
- Form shows default/empty values ready for input

---

## State Management Overview

### Key State Variables

- **`currentResumeId`**: ID of currently loaded/editing resume (null for new)
- **`formData`**: Current form state (all resume fields)
- **`generatedResume`**: HTML string of generated resume
- **`loadedResumeData`**: Snapshot of loaded data for change detection
- **`hasUserEdited`**: Flag indicating user has made changes
- **`isLoadingResume`**: Flag for loading state UI
- **`isSaving`**: Flag for save-in-progress indicator
- **`lastSaved`**: Timestamp of last successful save

### Refs Used

- **`isInitialMount`**: Tracks if component just mounted (prevents auto-save on mount)
- **`isLoadingFromConvex`**: Tracks if loading data from Convex (prevents auto-save during load)
- **`saveTimeoutRef`**: Reference to debounce timeout (for cleanup)

### localStorage Keys

- **`LAST_EDITED_RESUME_KEY`**: Stores the ID of the last edited resume

---

## Convex Integration

### Queries (Read Operations)

- **`getUserResumes`**: Fetches all resumes for current user (sorted by creation date, newest first)
- **`getResume`**: Fetches a single resume by ID (conditional query, only runs when ID is set)

### Mutations (Write Operations)

- **`saveResume`**: Creates or updates a resume
  - If `resumeId` provided: updates existing resume
  - If no `resumeId`: creates new resume
  - Returns the resume ID

### Authentication

- All queries and mutations automatically use Clerk authentication
- User identity is retrieved via `ctx.auth.getUserIdentity()`
- Only user's own resumes are accessible

---

## Error Handling

### Auto-Save Errors
- Errors are caught and logged to console
- User is not interrupted (silent failure)
- User can continue editing and auto-save will retry on next change

### Loading Errors
- If resume loading fails, falls back to empty form
- Error is logged to console
- User can still create new resume

### Missing Resume
- If localStorage has resume ID that no longer exists, falls back to most recent
- If no resumes exist, shows empty state with CTA

---

## Performance Considerations

### Debouncing
- Auto-save uses 2-second debounce to prevent excessive saves
- Timer resets on each change, only saves after user stops editing

### Change Detection
- Deep comparison only runs when auto-save is triggered
- Uses JSON.stringify for comparison (simple but effective)
- Prevents unnecessary saves when data hasn't changed

### Reactive Updates
- Convex queries are reactive - automatically update when data changes
- No manual refetching needed
- UI updates automatically when resume data changes in database

---

## User Experience Features

### Visual Feedback
- "Saving..." indicator while save is in progress
- "Saved [time]" confirmation after successful save
- Loading spinner while fetching resumes
- Resume switcher shows current resume name and last saved time

### Seamless Continuation
- Automatically loads last edited resume on page refresh
- Remembers user's work across sessions
- No data loss on accidental refresh

### Multi-Resume Management
- Easy switching between multiple resumes
- Clear indication of which resume is currently being edited
- Quick access to create new resume
