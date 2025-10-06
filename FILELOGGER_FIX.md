# FileLogger Fix - App Ready Timing Issue

## Problem Identified

**Root Cause**: The FileLogger was trying to access `app.getPath('userData')` before the Electron app was ready, which caused it to fail silently and not write any logs.

### The Issue Chain:

1. **Module Import Order**:
   - `main.js` imports `SolidIpcHandlers`
   - `SolidIpcHandlers` imports `ServiceFactory` (as a singleton: `export default new ServiceFactory()`)
   - ServiceFactory's constructor immediately calls `configure()`
   - `configure()` creates `EffectRegistryService` and calls `ensureCoreEffectsRegistered()`
   - `EffectRegistryService` constructor calls `fileLogger.initialize()`

2. **Timing Problem**:
   - All of this happens **before** `app.whenReady()` fires in `main.js`
   - FileLogger's `initialize()` tries to call `app.getPath('userData')`
   - **Electron requires the app to be ready before `app.getPath()` can be called**
   - The call fails, FileLogger never initializes, no logs are written

3. **Why You Didn't See Logs**:
   - Console logs from main process don't appear in DevTools (Cmd+Option+I)
   - Main process logs only go to stdout (terminal)
   - You weren't running the packaged app from terminal
   - FileLogger failed to initialize, so no file logs were written either

## Solution Implemented

Modified `FileLogger.js` to handle the app-ready timing issue:

### Key Changes:

1. **Async Initialization with App Ready Check**:
   ```javascript
   async initialize() {
       if (this.initialized) return;
       
       // Wait for app to be ready before accessing userData path
       if (!app.isReady()) {
           await app.whenReady();
       }
       
       const userDataPath = app.getPath('userData');
       // ... rest of initialization
   }
   ```

2. **Pending Logs Queue**:
   - Logs are queued if FileLogger isn't initialized yet
   - When initialization completes, all pending logs are written
   - This ensures no logs are lost during startup

3. **Auto-Initialization**:
   - First call to `log()` automatically triggers initialization
   - No need to manually call `initialize()` anymore
   - Gracefully handles the timing issue

### Code Flow After Fix:

```
1. ServiceFactory imports → EffectRegistryService created
2. EffectRegistryService calls fileLogger.log()
3. FileLogger queues the log and starts initialization
4. FileLogger waits for app.whenReady()
5. Once ready, creates log file and writes all pending logs
6. All subsequent logs are written immediately
```

## Testing Instructions

### Option 1: Run from Terminal (See Console Logs)

```bash
"/Users/the.phoenix/WebstormProjects/nft-studio/build/mac/NFT Studio.app/Contents/MacOS/NFT Studio"
```

This will show all main process console.log() output in your terminal.

### Option 2: Check the Log File

1. Open the packaged app normally
2. Open DevTools (Cmd+Option+I)
3. In the console, run:
   ```javascript
   const result = await window.api.plugins.getDebugLogPath();
   console.log(result.logPath);
   ```
4. Open the log file at the path shown (typically `~/Library/Application Support/NFT Studio/plugin-debug.log`)

Or directly:
```bash
open ~/Library/Application\ Support/NFT\ Studio/plugin-debug.log
```

### What You Should See Now

The log file should contain entries like:

```
=== Plugin Debug Log - 2024-01-XX... ===

[2024-01-XX...] FileLogger initialized at: /Users/.../plugin-debug.log
[2024-01-XX...] 🔄 [EffectRegistryService] Starting core effects registration...
[2024-01-XX...] 🔄 [EffectRegistryService] Loading core effects...
[2024-01-XX...] ✅ [EffectRegistryService] Core effects loaded
[2024-01-XX...] 🔄 [EffectRegistryService] Loading user plugins...
[2024-01-XX...] 📦 [EffectRegistryService] Found X plugin(s) to load
...
```

## Why This Fix Works

1. **Respects Electron Lifecycle**: Waits for app to be ready before accessing app APIs
2. **No Lost Logs**: Queues logs during initialization so nothing is missed
3. **Transparent**: Services don't need to know about the timing issue
4. **Robust**: Handles both dev and production environments correctly

## Next Steps

Once you can see the logs:

1. **Verify Plugin Loading**: Check if plugins are being found and loaded
2. **Check Registry State**: Look at the effect counts before and after plugin loading
3. **Identify the Scenario**: Match the log patterns to one of the scenarios in `PLUGIN_DEBUG_GUIDE.md`
4. **Implement the Fix**: Based on the identified scenario, apply the appropriate solution

## Important Electron Concepts Learned

1. **Main vs Renderer Process**:
   - Main process: Node.js environment, runs `main.js`
   - Renderer process: Browser environment, runs your React app
   - Console logs are separate for each process

2. **App Lifecycle**:
   - Many Electron APIs require `app.whenReady()` to fire first
   - Module imports happen before `app.whenReady()`
   - Need to handle async initialization carefully

3. **Debugging Production Apps**:
   - Main process logs don't appear in DevTools
   - File-based logging is essential for production debugging
   - Always run packaged apps from terminal during debugging

4. **Singleton Pattern Timing**:
   - `export default new ClassName()` creates instance immediately on import
   - Be careful with initialization code in constructors
   - Use lazy initialization for app-dependent resources