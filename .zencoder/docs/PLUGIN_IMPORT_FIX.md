# Plugin Import Path Resolution Fix

## Problem
When downloaded npm plugins try to import from `my-nft-gen/src/...`, the imports were failing in production with:
```
Cannot find module '/path/to/plugins/my-plugin/node_modules/my-nft-gen/src/core/layer/LayerEffect.js'
```

The issue occurred because:
1. Plugins are downloaded as npm packages with their own `node_modules`
2. When a plugin imports `from 'my-nft-gen/src/...'`, Node's module resolution looks in the plugin's local `node_modules/my-nft-gen`
3. In production with ASAR packaging, the plugin's nested `my-nft-gen` may not have the full `src/` directory structure
4. The app has a properly configured `my-nft-gen` in its main `node_modules`, but plugins can't access it

## Solution: Option B - Recursive Import Rewriting (Pre-Import Phase)

Instead of trying to create symlinks or modify module resolution, we **recursively rewrite ALL plugin file imports to use absolute paths** before importing them.

### How It Works

**File**: `src/main/services/SecurePluginLoader.js` - `loadPluginInMainProcess()` method

**Key Insight**: The entry point file isn't enough—we must rewrite ALL files in the plugin tree, because when the entry point imports other plugin files, those files also have `my-nft-gen` imports that need rewriting.

#### Before Fix
```javascript
const pluginModule = await import(pluginUrl); 
// Entry point imports local files: from './src/effects/QuantumFieldEffect.js'
// Those files import: from 'my-nft-gen/src/core/layer/LayerEffect.js'
// ❌ Resolves to plugin's node_modules (fails in production)
```

#### After Fix
```javascript
// 1. Create temporary directory for processed plugin
const tempPluginDir = path.join(app.getPath('userData'), `plugin-processed-${timestamp}`);
await fs.mkdir(tempPluginDir, { recursive: true });

// 2. Recursively process ALL plugin files, rewriting imports in each
await this.processPluginDirectory(pluginDir, tempPluginDir);
// Example rewrites:
// BEFORE (in entry point): from './src/effects/QuantumFieldEffect.js'
// AFTER:                   from 'file:///plugin/src/effects/QuantumFieldEffect.js'
//
// BEFORE (in QuantumFieldEffect.js): from 'my-nft-gen/src/core/layer/LayerEffect.js'
// AFTER:                             from 'file:///app/node_modules/my-nft-gen/src/core/layer/LayerEffect.js'

// 3. Import from the temporary processed directory
const pluginModule = await import(pathToFileURL(tempPluginPath).href);
// ✅ All imports in ALL files now resolve correctly
```

## Technical Details

### Recursive Import Rewriting Process

The `processPluginDirectory()` method recursively walks the plugin directory and rewrites:

```javascript
// 1. Package imports with subpaths
from 'my-nft-gen/src/core/layer/LayerEffect.js'
↓
from 'file:///Users/app/node_modules/my-nft-gen/src/core/layer/LayerEffect.js'

// 2. Relative local imports (critical!)
from './src/effects/QuantumFieldEffect.js'
↓
from 'file:///plugin/src/effects/QuantumFieldEffect.js'

// 3. Direct package imports  
import 'my-nft-gen'
↓
import 'file:///Users/app/node_modules/my-nft-gen'

// 4. Dynamic imports
import('./effects/file.js')
↓
import('file:///plugin/effects/file.js')

// 5. Both single and double quotes
from "my-nft-gen/src/..."
↓
from 'file:///...'
```

**Important**: All files (including nested ones) are processed recursively, so when QuantumFieldEffect.js imports LayerEffect.js, that import is also rewritten.

### Production Environment Compatibility

- **ASAR Unpacking**: The `package.json` includes:
  ```json
  "asarUnpack": [
    "**/node_modules/my-nft-gen/**/*"
  ]
  ```
  This ensures `my-nft-gen` with all `src/` files is unpacked and accessible on the filesystem.

- **Path Resolution**: Uses `resolveMyNftGenPath()` which checks:
  1. `process.cwd() + '/node_modules/my-nft-gen'` 
  2. `app.getAppPath() + '/node_modules/my-nft-gen'`
  
  This works in both development and production/ASAR environments.

## Benefits

✅ **Eliminates Plugin node_modules Conflicts** - Plugins always use app's version  
✅ **Recursive Import Rewriting** - All files processed, not just entry point  
✅ **Production-Ready** - Works with ASAR-packaged apps  
✅ **No Symlink Complexity** - Simpler than directory symlinks  
✅ **Backward Compatible** - Doesn't break existing plugins  
✅ **Handles Nested Imports** - Relative imports between plugin files work correctly  
✅ **Clear Logging** - Detailed logs for every file processed and import rewritten  
✅ **Error Resilience** - Gracefully handles missing paths with warnings  

## Edge Cases Handled

1. **Nested relative imports** - When entry.js imports ./effects/effect.js, and effect.js imports ./helpers.js, all are rewritten correctly
2. **Deep plugin trees** - Recursively processes all subdirectories, preserving structure
3. **Dynamic imports** - `import()` statements with both single/double quotes are rewritten  
4. **Module re-exports** - Works with nested imports inside my-nft-gen since all files are processed first
5. **Missing paths** - Falls back gracefully with warnings and continues processing
6. **node_modules within plugins** - Only processes first level to avoid bloat; skips deeply nested node_modules
7. **Special files** - Skips .git, dist, build directories; copies non-JS files as-is

## Testing

To verify the fix works:

```bash
# Build the application
npm run build

# Package for production  
npm run package

# Test with a downloaded plugin that imports from my-nft-gen/src/...
```

## Debugging

Enable debug logging by setting `SafeConsole` verbosity. The recursive rewriting logs:
```
🔒 [SecurePluginLoader] Creating temporary processed plugin directory: /path/userData/plugin-processed-1234567890
🔒 [SecurePluginLoader] Processing node_modules to rewrite dependency imports
🔒 [SecurePluginLoader] Rewriting in src/effects/QuantumFieldEffect.js: from './src/effects/Base.js' -> file:///plugin/src/effects/Base.js
🔒 [SecurePluginLoader] Rewriting in src/effects/QuantumFieldEffect.js: from 'my-nft-gen/src/core/layer/LayerEffect.js' -> file:///app/node_modules/my-nft-gen/src/core/layer/LayerEffect.js
✅ [SecurePluginLoader] Processed: src/effects/QuantumFieldEffect.js
✅ [SecurePluginLoader] Processed plugin directory with rewritten imports
🔒 [SecurePluginLoader] Plugin URL: file:///path/userData/plugin-processed-1234567890/index.js.mjs
```

## Implementation Notes

- Entire plugin directories are copied and processed to `app.getPath('userData')/plugin-processed-${timestamp}`
- All `.js` and `.mjs` files in the plugin tree are rewritten (non-JS files are copied as-is)
- The temporary directory maintains the same structure as the original plugin, so relative imports work correctly
- Both `my-nft-gen` imports AND relative local imports are rewritten to absolute `file://` URLs
- `.mjs` extension ensures Node.js recognizes files as ES modules (required for `export` statements)
- Cache-busting timestamp in import URL query parameter prevents stale module cache issues
- Error handling catches import failures at the top level with detailed logging
- Symlink setup code is retained as fallback for compatibility
- Temporary processed directories are created in app data folder (not cleaned up yet, but could be garbage-collected)