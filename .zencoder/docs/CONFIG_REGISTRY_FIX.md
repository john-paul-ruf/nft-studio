# Core Effects Config Registry Fix

## Problem Solved
Core effects in production weren't displaying their editable properties in the config panel, while plugin effects worked fine. This was a silent failure in the config initialization system.

## Root Cause
The `ConfigLinker.linkEffectsWithConfigs()` method was completing without errors but failing to populate the ConfigRegistry with core effect configs. The fallback mechanism (`_manuallyRestoreConfigs()`) was inadequate—it only checked for properties attached to effect classes, which doesn't work in production builds.

## Solution Implemented

### Multi-Tiered Fallback Approach
The enhanced `_manuallyRestoreConfigs()` method now uses a prioritized approach:

**Approach 1 (Primary): Copy from my-nft-gen's ConfigRegistry** ✅
- Directly imports `my-nft-gen/src/core/registry/ConfigRegistry.js`
- Attempts to copy all configs from the library's registry to the local one
- Most reliable since my-nft-gen already has all core effect configs loaded
- Tries both `getAll()` and `getAllGlobal()` methods for compatibility

**Approach 2 (Fallback): Dynamic Class Discovery & Import**
- Checks for configs attached to effect classes (for plugin effects)
- Derives config class names from effect names (e.g., "hex" → "HexConfig")
- Attempts dynamic imports from multiple paths in my-nft-gen
- Registers successfully imported configs

**Approach 3 (Last Resort): Property-based Fallback**
- Falls back to the original approach of checking for `configClass` properties
- Only reached if Approaches 1 and 2 fail completely

### New Methods Added

```javascript
async _copyConfigsFromNftGenRegistry()
```
- Copies all configs from my-nft-gen's ConfigRegistry
- Returns count of successfully copied configs
- Provides detailed logging of what was found and copied

```javascript
async _dynamicallyImportConfigForEffect(effectName)
```
- Converts effect name to config class name
- Attempts dynamic import from various paths
- Returns the config class or null if not found

```javascript
_deriveConfigClassName(effectName)
```
- Converts kebab-case, snake_case, and camelCase effect names to PascalCase config class names
- Example: "blur-filter" → "BlurFilterConfig"

## Key Improvements

1. **Direct Registry Copy**: Uses my-nft-gen's already-loaded ConfigRegistry as the source of truth
2. **Better Diagnostics**: Logs exactly what succeeded/failed at each step
3. **Graceful Degradation**: Falls back through multiple approaches instead of failing immediately
4. **Production-Ready**: Handles scenarios where configs aren't attached to effect classes
5. **Plugin Compatibility**: Still supports plugin effects that may have configs attached

## Testing & Diagnostics
- ✅ Build succeeds without errors
- ✅ Tests pass
- ✅ Webpack compilation successful
- ✅ No TypeScript/syntax errors
- ✅ Enhanced diagnostic logging added for visibility into config restoration process

## Detailed Logging Output

When the app starts and ConfigLinker fails (or doesn't populate ConfigRegistry):

### First Attempt (Approach 1) - Direct Registry Copy:
```
📋 Approach 1: Copying from my-nft-gen ConfigRegistry...
🔄 Attempting to import my-nft-gen's ConfigRegistry...
📦 ConfigRegistry module loaded, exports: [list of exports]
✅ ConfigRegistry class loaded, methods: [list of methods]
🔍 Calling getAll() on nftGenConfigRegistry...
📍 getAll() returned: { type, isObject, keys, firstFive }
📋 Copying N configs from my-nft-gen registry...
✅ Copied config for [effect-name]
📊 Copy result: N succeeded, M failed
```

### Second Attempt (Approach 2) - Dynamic Discovery:
If Approach 1 returns 0 configs:
```
📌 Approach 2: Checking effect classes and attempting dynamic imports...
📂 Category "primary": effects= [count]
🔄 Attempting dynamic import for [effect-name]...
✅ Registered config for [effect-name]
📦 Approach 2 registered N configs out of M effects checked
```

### Final Status:
```
📊 [EffectRegistryService] Manual restoration complete: N configs registered
```

## Expected Behavior in Production

When the app starts:
1. **Cache Available**: Uses cached effects (fast path)
2. **ConfigLinker Success**: Uses linked configs normally
3. **ConfigLinker Fails**: Automatically falls back to:
   - **Step 1 (Primary)**: Copies configs from my-nft-gen's ConfigRegistry
     - Imports my-nft-gen's ConfigRegistry module
     - Calls `getAll()` or `getAllGlobal()` to retrieve all configs
     - Registers each config to the local ConfigRegistry
   - **Step 2 (Fallback)**: Dynamically imports missing configs
     - Checks effect classes for attached configs
     - Derives config class names from effect names
     - Attempts dynamic imports from my-nft-gen paths
   - **Step 3 (Last Resort)**: Property-based checks only

The console will display comprehensive diagnostic logs showing:
- Which import method succeeded/failed
- How many configs were retrieved from my-nft-gen
- How many configs were successfully registered
- Any errors encountered during the process
- Which effects couldn't be matched with configs

## Files Modified
- `src/main/services/EffectRegistryService.js`
  - Enhanced `_manuallyRestoreConfigs()` method
  - Added `_copyConfigsFromNftGenRegistry()` method
  - Added `_dynamicallyImportConfigForEffect()` method
  - Added `_deriveConfigClassName()` utility method

## Impact
- **Zero Breaking Changes**: Backward compatible with existing code
- **Production Stable**: Handles edge cases that were previously silent failures
- **Debugging Friendly**: Comprehensive logging shows exactly what's happening
- **Performance**: Primary approach is faster than dynamic imports