# Plugin Re-Registration Issue - FIXED

**Problem:** Plugins were being re-registered on every render, causing warnings like:
```
Plugin 'pixelate-event' is already registered, overwriting
```

## Root Causes

### 1. **Cache-Bust Timestamp on Module Imports** (CRITICAL)
In `SecurePluginLoader.loadPluginInMainProcess()`, plugins were being imported with a cache-bust query parameter:
```javascript
// ❌ WRONG: Forces fresh import each time, triggers register() again
const pluginModule = await import(pluginUrl + `?t=${Date.now()}`);
```

Every time a plugin was imported with a different timestamp, the ES module system treated it as a new module, causing the plugin's `register()` function to execute again.

### 2. **Registry Access During Rendering**
Methods like `getPluginRegistry()`, `getEffectRegistry()`, and `getConfigRegistry()` were calling `ensureCoreEffectsRegistered()` on every access, even during render operations when plugins were already registered.

## Solution

### Fix 1: Module Import Caching (SecurePluginLoader.js)
```javascript
// ✅ CORRECT: Cache imported modules to prevent re-registration
this.importedPlugins = new Map(); // Cache: pluginUrl -> module

// When loading a plugin:
let pluginModule = this.importedPlugins.get(pluginUrl);
if (pluginModule) {
    SafeConsole.log(`Using cached plugin module (prevents re-registration)`);
} else {
    // Import WITHOUT cache-bust timestamp
    pluginModule = await import(pluginUrl);
    this.importedPlugins.set(pluginUrl, pluginModule);
}
```

### Fix 2: Remove Re-Registration Triggers (EffectRegistryService.js)
```javascript
// ✅ CORRECT: getPluginRegistry() no longer calls ensureCoreEffectsRegistered()
async getPluginRegistry() {
    // Plugins are registered ONLY at app startup via PluginLoaderOrchestrator
    // Getting the registry during render should NOT trigger re-registration
    const { PluginRegistry } = await this._loadModules();
    return PluginRegistry;
}
```

## Architectural Constraint

Plugins are now registered at exactly TWO points:
1. **App Startup**: `main.js` → `PluginLoaderOrchestrator.loadInstalledPlugins()`
2. **User Installation**: `PluginHandlers` → `plugins:install-and-load` IPC handler

Any other code path that needs plugins should only READ from the already-populated registry, never WRITE/register.

## Files Modified

- `src/main/services/SecurePluginLoader.js` - Added import caching
- `src/main/services/EffectRegistryService.js` - Removed unnecessary re-registration calls

## Testing

Verify the fix works by:
1. Start the app and check the render loop
2. Run multiple frames and confirm no "already registered, overwriting" warnings
3. Install a new plugin and confirm it works without duplicate registrations
4. Test effect discovery and validation during rendering

## Performance Impact

**Positive**: Plugins are no longer re-imported/re-registered during rendering, reducing overhead.

**Backward Compatibility**: Fully compatible - no API changes, only internal optimization.