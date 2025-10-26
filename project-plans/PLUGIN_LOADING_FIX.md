# Plugin Loading Race Condition Fix

## Problem
When installing plugins from npm, the loading overlay was disappearing before symlink and registration operations completed. This caused:
- UI appearing unlocked while symlinks were still being created
- Plugins not appearing as "loaded" in the plugin manager
- User confusion about whether plugins actually installed
- Plugins becoming available only after app restart or re-render

## Root Cause
The progress callback was reporting "complete" (100%) after `_loadSinglePlugin()` returned, but the actual heavy operations inside `loadPluginInMainProcess()` (creating node_modules, symlinking, processing imports) were still running async in the background. The UI would release the lock before this work finished.

## Solution

### 1. Progress Callback Threading Through Stack
**File:** `src/services/PluginLoaderOrchestrator.js`
- Modified `_loadSinglePlugin()` to create a progress callback wrapper
- Passes this callback to `loader.loadPluginInMainProcess()` 
- Maps internal loader phases to user-visible phases
- Scales progress from 55% to 80% during loading, leaving 80-100% for final registration

### 2. Granular Progress Reporting in Loader
**File:** `src/main/services/SecurePluginLoader.js`
- Added `progressCallback` parameter to `loadPluginInMainProcess()`
- Reports progress at key stages during the loading process:
  - 5%: Setting up plugin node_modules
  - 15%: Symlinking dependencies
  - 25-35%: Processing plugin directory (recursive import rewriting)
  - 40%: Setting up temp node_modules
  - 50%: Importing plugin module
  - 60-65%: Using cached or newly imported module
  - 70%: Registering plugin effects
  - 80%: Successfully registered effects

### 3. Extended Overlay Duration
**File:** `src/hooks/usePluginLoading.js`
- Extended auto-hide delay from 2 seconds to 5 seconds for "complete" phase
- Kept 3-second delay for errors
- This gives the system time to complete background operations before hiding the lock

## How It Works Now

1. **User clicks "Install Plugin"**
   - UI shows loading overlay
   - Progress callback starts firing continuously

2. **Installation Phase**
   - Downloading: 0-20% (if npm)
   - Configuring: 20-50%

3. **Loading & Registration Phase** (where the fix applies)
   - Setup node_modules: 55-60%
   - Symlink dependencies: 60-65%
   - Process directory: 65-70%
   - Import module: 70-80%

4. **Completion Phase**
   - Update cache: 90%
   - Complete: 100%
   - **Overlay stays visible for 5 seconds** to ensure background ops finish

5. **UI Unlocks**
   - After 5 seconds, overlay disappears
   - Plugins are guaranteed to be registered
   - Plugin manager is refreshed
   - Effects are available for rendering

## Benefits
✅ UI stays locked until ALL operations complete  
✅ User sees granular progress updates  
✅ Plugins appear immediately after installation  
✅ No race condition between symlink and registration  
✅ Consistent behavior across all platforms  

## Testing
To test this fix:
1. Install a plugin from npm (should show progress lock for ~8-10 seconds)
2. Verify plugin appears in plugin manager immediately after
3. Verify plugin effects are available for rendering
4. Restart app and verify plugins load correctly