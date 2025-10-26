# Temp Plugin Directory Reuse Fix

**Status:** ✅ IMPLEMENTED & TESTED
**Date:** 2025-10-26

## Problem

Every time the app loaded, it created a **new temporary plugin directory** instead of reusing previously processed directories. This caused:
- Disk space waste with orphaned directories accumulating
- Unnecessary processing of already-processed plugins on every startup
- Performance degradation over time

**Root Cause:** The processed plugin directory mapping (`processedPluginDirs`) was stored only in memory within `SecurePluginLoader`. On app restart, this cache was lost, so new temp directories were always created.

## Solution

Implemented a **persistent cache system** for plugin directory mappings that survives app restarts:

### 1. Created `ProcessedPluginDirCacheService.js`
New service that maintains a persistent cache file (`{userData}/processed-plugin-dirs-cache.json`):
- Maps plugin source paths → processed (temp) directory paths
- Stores creation timestamps and source hashes for validation
- Auto-cleans orphaned entries
- Supports cache invalidation on plugin system changes

### 2. Updated `SecurePluginLoader`
- Added `ProcessedPluginDirCacheService` dependency
- Constructor now accepts `appDataPath` for persistent cache
- New `initialize()` method loads persistent cache on startup
- When processing plugins:
  - Checks in-memory cache first (loaded from persistent cache)
  - If found, reuses existing temp directory
  - If not found, creates new one and records in both caches
- Cleans up mappings when plugins are uninstalled

### 3. Updated `PluginLoaderOrchestrator`
- Passes `appDataPath` to `SecurePluginLoader` constructor
- Calls `initialize()` on loader to load persistent cache
- On plugin uninstall: removes mapping from persistent cache
- New cleanup method: `_cleanupPersistentCache()` removes orphaned entries
- Integrated cache cleanup into `cleanupOrphanedResources()`

## Files Modified

1. **Created:** `src/main/services/ProcessedPluginDirCacheService.js`
   - New service for persistent caching

2. **Modified:** `src/main/services/SecurePluginLoader.js`
   - Added persistent cache integration
   - Updated constructor and added initialize()
   - Records mappings to both in-memory and persistent cache

3. **Modified:** `src/services/PluginLoaderOrchestrator.js`
   - Updated `_getSecurePluginLoader()` to initialize cache
   - Updated `_cleanupProcessedDirectories()` to remove persistent cache entries
   - Added `_cleanupPersistentCache()` helper method
   - Updated `cleanupOrphanedResources()` to clean persistent cache

4. **Updated:** `tests/unit/SecurePluginLoader.test.js`
   - Updated Test 3 & 7 to verify new persistent caching behavior
   - Removed old timestamp cache-bust verification
   - Now tests the correct module caching approach

## How It Works

### App Startup Flow
```
1. App starts
2. loadInstalledPlugins() called
3. _getSecurePluginLoader() creates SecurePluginLoader
4. constructor initializes ProcessedPluginDirCacheService
5. initialize() loads persistent cache from disk
6. In-memory cache populated from persistent cache
7. For each plugin:
   - Check in-memory map (from persistent cache)
   - If found: reuse existing temp directory
   - If not found: process and create new one
8. New mappings recorded to persistent cache
```

### Persistent Cache Structure
```json
{
  "version": "1.0.0",
  "timestamp": "2025-10-26T...",
  "mappings": {
    "/path/to/plugin/source": {
      "sourceDir": "/path/to/plugin/source",
      "processedDir": "/userData/plugin-processed-1761234567890",
      "sourceHash": "abc123def456...",
      "createdAt": "2025-10-26T...",
      "lastAccessedAt": "2025-10-26T..."
    }
  }
}
```

## Performance Impact

**Positive:**
- ✅ Plugins processed only once (on first load or when source changes)
- ✅ Subsequent app starts skip redundant processing
- ✅ Orphaned directories identified and cleaned up
- ✅ Memory efficient with persistent storage

**Backward Compatibility:**
- ✅ Fully compatible - no breaking changes
- ✅ Old in-memory cache still used during app session
- ✅ Persistent cache is optional enhancement

## Testing

All 568 unit tests passing ✅
- Tests verify persistent cache system works correctly
- Tests verify module caching prevents re-registration
- Tests verify no cache-bust query parameters are used

## Cleanup & Maintenance

The system automatically:
- Cleans up orphaned cache entries (if corresponding temp dir doesn't exist)
- Removes entries when plugins are uninstalled
- Validates cache on load for data integrity
- Invalidates entire cache if version mismatches

Manual cleanup can be triggered via:
```javascript
const orchestrator = serviceFactory.getPluginLoaderOrchestrator();
await orchestrator.cleanupOrphanedResources();
```

## Complementary to PLUGIN_REREGISTRATION_FIX

This fix works alongside the existing plugin re-registration fix:
- **PLUGIN_REREGISTRATION_FIX**: Prevents plugins from being re-registered during rendering (in-memory module caching)
- **TEMP_PLUGIN_DIR_REUSE_FIX**: Prevents creation of new temp directories on each app startup (persistent directory mapping caching)

Together, they eliminate both:
1. Plugin re-registration warnings during rendering
2. Accumulation of orphaned temp directories over time