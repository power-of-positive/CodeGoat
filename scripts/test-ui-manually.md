# Manual UI Testing Guide for Stage Reordering Functionality (Task #70)

## Background
The backend has been updated to use `priority` field instead of `order`, fixing the compatibility issue with the frontend. Now we need to verify the manual reordering UI functionality works correctly.

## Prerequisites
- Backend server running on localhost:3000
- Frontend server running on localhost:5175
- Browser with developer tools open

## Test Steps

### Step 1: Navigate to Settings
1. Open http://localhost:5175 in your browser
2. Click on "Settings" in the navigation
3. Wait for the "Validation Stages" section to load

### Step 2: Verify Reorder Controls Are Visible
1. Look for each validation stage in the list
2. Confirm each stage has up/down arrow buttons (chevron icons) on the left side
3. The first stage should have the up arrow disabled
4. The last stage should have the down arrow disabled

### Step 3: Test Down Arrow (Move Stage Down)
1. Find a stage that is NOT the last in the list
2. Note the current order of stages
3. Click the down arrow (chevron-down icon) for that stage
4. Verify the stage moves down one position in the list
5. Verify the list re-renders with the new order
6. Check that the server was updated by refreshing the page and verifying order persists

### Step 4: Test Up Arrow (Move Stage Up)
1. Find a stage that is NOT the first in the list  
2. Note the current order of stages
3. Click the up arrow (chevron-up icon) for that stage
4. Verify the stage moves up one position in the list
5. Verify the list re-renders with the new order
6. Check that the server was updated by refreshing the page and verifying order persists

### Step 5: Test Edge Cases
1. Verify the first stage's up arrow is disabled
2. Verify the last stage's down arrow is disabled
3. Try clicking disabled arrows to ensure they don't cause errors

### Step 6: Console Error Check
1. Open browser developer tools (F12)
2. Go to Console tab
3. Perform the reordering tests above
4. Verify no JavaScript errors appear in the console
5. Check Network tab to see API calls are being made when reordering

## Expected Behavior

### Visual Elements
- ✅ Up/down arrow buttons should be visible next to each validation stage
- ✅ Buttons should be small, icon-only buttons positioned on the left
- ✅ Disabled buttons should appear visually disabled (grayed out)
- ✅ Enabled buttons should respond to hover effects

### Functionality
- ✅ Clicking down arrow should move stage down one position
- ✅ Clicking up arrow should move stage up one position
- ✅ Changes should be immediately visible in the UI
- ✅ Changes should persist after page refresh
- ✅ No console errors should occur
- ✅ API calls should be visible in Network tab (PUT requests to /api/settings/validation/stages/:id)

### Backend Integration
- ✅ Each reorder operation should make 2 API calls (to swap priorities of 2 stages)
- ✅ API calls should use `priority` field, not `order` field
- ✅ Server should respond with updated stages
- ✅ Frontend should refresh the stage list after successful API calls

## Success Criteria
All the above expected behaviors should work correctly. If any step fails, the task is not complete.

## What to Look For in Code
The implementation should include:

1. **StageReorderControls component** (lines 144-177 in Settings.tsx)
   - Renders up/down arrow buttons
   - Disables buttons appropriately for first/last items
   - Calls onMove with correct parameters

2. **useStageReordering hook** (lines 289-322 in Settings.tsx)  
   - Implements moveStage function
   - Swaps priorities between adjacent stages
   - Makes parallel API calls to update both affected stages

3. **StageListItem integration**
   - Includes StageReorderControls in the UI
   - Passes correct props (stage, index, totalStages, onMove)
   - Positions controls correctly in the layout

## Completion
If all tests pass, Task #70 - Manual stage reordering functionality is COMPLETE.