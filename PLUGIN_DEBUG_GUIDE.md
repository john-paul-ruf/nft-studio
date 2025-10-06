# Plugin Loading Debug Guide

## Issue Summary
Plugins work in dev build but don't show up as options to add in the packaged Electron app.

## Root Cause Analysis

The issue is likely one of the following:

1. **Timing Issue**: Plugins are being loaded but the registry query happens before they're fully registered
2. **Module Resolution**: In the packaged app (app.asar), the `my-nft-gen` module path resolution might differ
3. **Registry Instance**: Multiple instances of the PluginRegistry might exist, causing plugins to register in one instance but queries to happen on another

## Changes Made

### 1. Enhanced Logging in `EffectRegistryService.js`

Added comprehensive logging to track the plugin loading flow:

- `📦 [EffectRegistryService]` - Plugin discovery and loading
- `🔄 [EffectRegistryService]` - Process steps
- `✅ [EffectRegistryService]` - Success messages
- `⚠️ [EffectRegistryService]` - Warnings
- `❌ [EffectRegistryService]` - Errors
- `📊 [EffectRegistryService]` - Registry state information

### 2. Enhanced Logging in `EffectDiscoveryService.js`

Added logging to track what effects are being returned to the UI:

- `🔍 [EffectDiscoveryService]` - Effect discovery process
- Shows counts of effects by category (primary, secondary, finalImage)

### 3. Added Registry State Logging

New method `logRegistryState()` that logs:
- Number of effects in each category
- Names of all registered effects
- Called after plugin loading completes

## Testing Instructions

### Step 1: Build and Package
```bash
npm run build
npm run package:mac
```

### Step 2: Run the Packaged App

**IMPORTANT**: To see the main process logs, run the app from Terminal:

```bash
"/Users/the.phoenix/WebstormProjects/nft-studio/build/mac/NFT Studio.app/Contents/MacOS/NFT Studio"
```

This will show all the main process console output in your terminal.

### Step 3: Get the Debug Log File

All logs are also written to a file. To find the log file location:

1. Open the app
2. Open Developer Tools (Cmd+Option+I)
3. In the console, run:
   ```javascript
   await window.api.plugins.getDebugLogPath()
   ```
4. This will return the path to `plugin-debug.log` in your userData directory

Or you can directly open it at:
```bash
open ~/Library/Application\ Support/NFT\ Studio/plugin-debug.log
```

### Step 4: Look for These Log Messages

#### Expected Flow:
```
🔄 [EffectRegistryService] Starting core effects registration...
🔄 [EffectRegistryService] Loading core effects...
✅ [EffectRegistryService] Core effects loaded
🔄 [EffectRegistryService] Loading user plugins...
📦 [EffectRegistryService] Found X plugin(s) to load
📦 [EffectRegistryService] Loading plugins for UI: [...]
🔄 [EffectRegistryService] Loading plugin for UI: <plugin-name> from <path>
✅ [EffectRegistryService] Plugin loaded via PluginLoader: <plugin-name>
✅ [EffectRegistryService] Finished loading X plugin(s)
✅ [EffectRegistryService] User plugins loaded
🔄 [EffectRegistryService] Linking configs...
✅ [EffectRegistryService] Configs linked
✅ [EffectRegistryService] Core effects registration complete
📊 [EffectRegistryService] Current registry state: { primary: X, secondary: Y, ... }
📊 [EffectRegistryService] Primary effects: effect1, effect2, ...
```

#### When Effects Are Requested:
```
🔍 [EffectDiscoveryService] Getting available effects...
📊 [EffectRegistryService] getAllEffectsWithConfigs() returning: { primary: X, secondary: Y, ... }
🔍 [EffectDiscoveryService] Raw effects from registry: { primary: X, secondary: Y, ... }
✅ [EffectDiscoveryService] Returning available effects: { primary: X, secondary: Y, ... }
```

### Step 5: Diagnose the Issue

#### Scenario A: Plugins Not Found
If you see:
```
ℹ️ [EffectRegistryService] No plugins found to load
```

**Problem**: PluginManagerService is not finding the plugins
**Solution**: Check that plugins are properly saved in the userData directory

#### Scenario B: Plugins Load But Don't Register
If you see:
```
✅ [EffectRegistryService] Plugin loaded via PluginLoader: <name>
```
But the registry state shows the same number of effects as before:
```
📊 [EffectRegistryService] Current registry state: { primary: 20, ... }
```

**Problem**: Plugin's `register()` function is not properly registering with the PluginRegistry
**Solution**: Check the plugin's register function and ensure it's using the correct registry instance

#### Scenario C: PluginLoader Fails
If you see:
```
⚠️ [EffectRegistryService] PluginLoader failed for <name>, trying direct import: <error>
```

**Problem**: PluginLoader can't load the plugin (path issue or module resolution)
**Solution**: Check if the fallback direct import works, and investigate the error message

#### Scenario D: No Register Function
If you see:
```
⚠️ [EffectRegistryService] Plugin <name> has no register() function - may not be properly registered
```

**Problem**: Plugin doesn't export a `register()` function
**Solution**: Ensure the plugin exports a proper register function

#### Scenario E: Registry Returns Different Counts
If you see:
```
📊 [EffectRegistryService] Current registry state: { primary: 25, ... }
```
But later:
```
📊 [EffectRegistryService] getAllEffectsWithConfigs() returning: { primary: 20, ... }
```

**Problem**: Multiple registry instances exist
**Solution**: This is the critical issue - the PluginRegistry is not a singleton

## Potential Fixes

### Fix 1: Ensure Single Registry Instance

If the issue is multiple registry instances, we need to ensure that `my-nft-gen` uses a singleton pattern for the PluginRegistry. Check the `my-nft-gen` source code.

### Fix 2: Force Registry Refresh

After loading plugins, explicitly refresh the registry:

```javascript
// In EffectRegistryService.js, after loadPluginsForUI()
const { PluginRegistry } = await import('my-nft-gen/src/core/registry/PluginRegistry.js');
await PluginRegistry.refresh(); // If such a method exists
```

### Fix 3: Module Resolution in Production

If the issue is module resolution, we may need to:

1. Ensure `my-nft-gen` is properly unpacked from asar (already done in package.json)
2. Add explicit path resolution for production:

```javascript
const myNftGenPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'my-nft-gen')
    : path.join(__dirname, '..', '..', 'node_modules', 'my-nft-gen');
```

### Fix 4: Wait for Registry Initialization

Add a delay or event-based waiting mechanism to ensure the registry is fully initialized before querying:

```javascript
// After plugin loading
await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
```

## Next Steps

1. **Run the packaged app** and collect the console logs
2. **Share the logs** showing the plugin loading sequence
3. **Check the registry state** - does it show the plugin effects?
4. **Check the UI query** - does it return the same counts?
5. **Based on the logs**, we can identify which scenario applies and implement the appropriate fix

## Additional Debug Commands

You can also add these IPC handlers to manually trigger registry refresh from the UI:

```javascript
// In renderer process (DevTools console)
await window.api.refreshEffectRegistry(false); // Force reload plugins
await window.api.debugEffectRegistry(); // Get registry debug info
```

This will help test if manually refreshing the registry makes the plugins appear.