# Pin Feature Bug Fix - Settings File Parameter Position

## Issue
When pinning settings and rendering the same frame, the frame was **NOT** identical. The randomization was still active even though the pin feature was enabled.

## Root Cause
The `settingsFile` parameter was being passed to the backend in the **wrong position**.

### Backend Function Signature
```javascript
// my-nft-gen/src/app/Project.js line 374
async generateSingleFrame(
    frameNumber, 
    totalFrames = null, 
    returnAsBuffer = true, 
    outputDirectory = null,    // 4th parameter
    settingsFile = null        // 5th parameter
)
```

### Frontend Call (BEFORE FIX)
```javascript
// RenderCoordinator.js line 59 (WRONG)
const result = await project.generateSingleFrame(
    frameNumber, 
    totalFrames, 
    true, 
    settingsFile  // ❌ Passed as 4th parameter (outputDirectory position)
);
```

This meant:
- `outputDirectory` was receiving the settings file path
- `settingsFile` was receiving `undefined`
- Backend was generating NEW random settings every time (unpinned mode)

### Frontend Call (AFTER FIX)
```javascript
// RenderCoordinator.js line 60 (CORRECT)
const result = await project.generateSingleFrame(
    frameNumber, 
    totalFrames, 
    true, 
    null,         // ✅ Explicitly pass null for outputDirectory
    settingsFile  // ✅ Correctly passed as 5th parameter
);
```

## Fix Applied
**File**: `/Users/the.phoenix/WebstormProjects/nft-studio/src/services/RenderCoordinator.js`

**Line 60**: Added `null` as the 4th parameter to correctly position the `settingsFile` parameter.

**Added Comment**: Documented the function signature to prevent future mistakes.

## Testing
After this fix, the pin feature should work correctly:

1. **Unpinned Mode**: Each render produces different results (randomization active)
2. **Pinned Mode**: Each render produces identical results (randomization frozen)

### Quick Test
```bash
# 1. Start the app
npm start

# 2. Render a frame (unpinned)
# 3. Click Pin button
# 4. Render again (pinned)
# 5. Verify: Frame should be IDENTICAL to step 2
# 6. Render multiple times (pinned)
# 7. Verify: All frames should be IDENTICAL
```

### Expected Console Logs (Pinned Mode)
```
📌 RenderPipeline: Using pinned settings file: /tmp/...
🚀 Settings file: /tmp/... (pinned)
📌 Using pinned settings file: /tmp/...
```

## Impact
- **Before**: Pin feature was completely broken - settings file never reached the backend
- **After**: Pin feature works as designed - settings file is correctly loaded and used

## Related Files
- `/Users/the.phoenix/WebstormProjects/nft-studio/src/services/RenderCoordinator.js` (FIXED)
- `/Users/the.phoenix/WebstormProjects/my-nft-gen/src/app/Project.js` (Backend - no changes needed)
- `/Users/the.phoenix/WebstormProjects/nft-studio/PIN_FEATURE_TESTING_GUIDE.md` (Testing guide)

## Lessons Learned
1. **Parameter Position Matters**: When calling functions with multiple optional parameters, explicitly pass `null` for skipped parameters
2. **Function Signature Documentation**: Always document complex function signatures at the call site
3. **End-to-End Testing**: This bug would have been caught immediately with visual testing (comparing rendered frames)

## Status
✅ **FIXED** - Pin feature should now work correctly. Ready for testing.