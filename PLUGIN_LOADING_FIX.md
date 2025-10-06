# Plugin Loading Fix for Production Builds

## Problem
Plugins were loading correctly in development mode but not in the packaged Electron application. The effects from newly added plugins were not appearing in the effects list.

## Root Cause
The issue was caused by improper handling of dynamic imports in production Electron builds:

1. **ASAR Packaging**: The app is packaged into an ASAR archive (`"asar": true` in package.json)
2. **File URL Issues**: Using `file://${path}` directly doesn't work reliably in packaged apps
3. **Module Resolution**: Dynamic imports need proper URL conversion for both dev and production environments

## Changes Made

### 1. EffectRegistryService.js
**File**: `/src/main/services/EffectRegistryService.js`

**Changes**:
- Replaced `await import(\`file://${pluginFile}\`)` with proper `pathToFileURL()` conversion
- Added cache-busting query parameter to ensure fresh imports
- Added explicit call to plugin's `register()` function
- Enhanced error logging with full stack traces

**Before**:
```javascript
await import(`file://${pluginFile}`);
```

**After**:
```javascript
const { pathToFileURL } = await import('url');
const pluginUrl = pathToFileURL(pluginFile).href;
const pluginUrlWithCache = `${pluginUrl}?t=${Date.now()}`;
const pluginModule = await import(pluginUrlWithCache);

if (pluginModule.register && typeof pluginModule.register === 'function') {
    await pluginModule.register();
}
```

### 2. PreviewHandlers.js
**File**: `/src/main/handlers/PreviewHandlers.js`

**Changes**:
- Fixed dynamic imports of `my-nft-gen` modules to use `pathToFileURL()`
- Applied fix to both `handleEffectPreview()` and `createPreviewProject()` methods

**Before**:
```javascript
const { Project } = await import(`file://${myNftGenPath}/src/app/Project.js`);
```

**After**:
```javascript
const { pathToFileURL } = await import('url');
const projectUrl = pathToFileURL(path.join(myNftGenPath, 'src/app/Project.js')).href;
const { Project } = await import(projectUrl);
```

## Why This Works

### pathToFileURL()
- Node.js built-in function from the `url` module
- Properly converts file system paths to `file://` URLs
- Handles platform-specific path differences (Windows vs Unix)
- Works correctly in both development and production Electron builds
- Properly escapes special characters in paths

### Cache Busting
- The `?t=${Date.now()}` query parameter ensures plugins are freshly imported
- Prevents Node.js module cache from serving stale plugin code
- Critical for plugin hot-reloading when users add new plugins

### Explicit register() Call
- Ensures the plugin's registration function is called
- Previously relied on side effects during import
- Now explicitly invokes the plugin's setup code

## Testing Instructions

### 1. Build the Production App
```bash
npm run package:mac
# or
npm run package:win
# or
npm run package:linux
```

### 2. Test Plugin Loading
1. Open the packaged application
2. Go to Settings → Plugins
3. Click "Add Plugin"
4. Select your plugin directory (e.g., `/Users/the.phoenix/WebstormProjects/my-nft-zencoder-generated-effects-plugin`)
5. Verify the plugin appears in "Installed Plugins"
6. Go back to the main canvas view
7. Check the effects list - your plugin effects should now appear

### 3. Check Console Logs
Open the Electron DevTools console (View → Toggle Developer Tools) and look for:

**Success indicators**:
```
🔄 Loading plugin for UI: [plugin-name] from [path]
🔄 Importing plugin file: [path]/plugin.js
🔄 Importing from URL: file://[path]/plugin.js?t=1234567890
🔄 Calling register() for plugin: [plugin-name]
✅ Plugin registered: [plugin-name]
🔄 Refreshing effect registry...
✅ Effect registry refreshed
```

**Error indicators** (if something goes wrong):
```
❌ Failed to load plugin [plugin-name] for UI: [error message]
   Plugin path: [path]
   Error stack: [stack trace]
```

## Additional Notes

### ASAR Unpacking
If plugins still don't load, you may need to add plugin directories to the `asarUnpack` configuration in `package.json`:

```json
"asarUnpack": [
  "node_modules/ffmpeg-static/bin/${os}/${arch}/ffmpeg",
  "node_modules/ffmpeg-static/index.js",
  "node_modules/ffmpeg-static/package.json",
  "**/node_modules/sharp/**/*",
  "**/node_modules/@img/**/*",
  "**/node_modules/canvas/**/*"
]
```

However, **external plugins** (outside the app bundle) should work without unpacking since they're loaded from the user's file system.

### Plugin Path Requirements
- Plugins must be accessible from the file system
- Plugin paths should be absolute paths
- Plugin directories must contain a valid `package.json` with a `main` field
- The main file must export a `register()` function

### Debugging Tips
1. Check the Electron console for detailed error messages
2. Verify the plugin path is correct and accessible
3. Ensure the plugin's `package.json` is valid
4. Check that the plugin's main file exports a `register()` function
5. Test the plugin in development mode first (`npm run start:dev`)

## Related Files
- `/src/main/services/EffectRegistryService.js` - Plugin loading logic
- `/src/main/handlers/PreviewHandlers.js` - Preview generation with dynamic imports
- `/src/services/PluginManagerService.js` - Plugin configuration management
- `/src/components/PluginManagerDialog.jsx` - Plugin UI management
- `/package.json` - Electron builder configuration

## References
- [Node.js URL.pathToFileURL()](https://nodejs.org/api/url.html#urlpathtofileurlpath)
- [Electron ASAR Archives](https://www.electronjs.org/docs/latest/tutorial/asar-archives)
- [Dynamic Imports in Node.js](https://nodejs.org/api/esm.html#import-expressions)

## Related Fixes
- [Render Worker Thread Fix](./RENDER_WORKER_FIX.md) - Fixes "Process exited with code 1" error during rendering in production builds