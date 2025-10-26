import electronPkg from 'electron';
import path from 'path';
import fs from 'fs/promises';
import SafeConsole from '../main/utils/SafeConsole.js';
import { PluginManagerService } from './PluginManagerService.js';

const { app } = electronPkg;

/**
 * Plugin Loader Orchestrator
 *
 * Purpose: Central coordinator for all plugin lifecycle operations.
 * This service orchestrates the entire plugin lifecycle from install to uninstall,
 * coordinating between PluginManagerService, SecurePluginLoader, EffectRegistryService,
 * and RegistryCacheService.
 *
 * Responsibilities:
 * - Install plugins (download, configure, prepare dependencies, load, register)
 * - Uninstall plugins (unregister, cleanup symlinks, remove config, delete files)
 * - Load plugins (bulk loading of installed plugins)
 * - Reload plugins (hot reload without restart)
 * - Cleanup orphaned resources (temp dirs, broken symlinks)
 *
 * Design Pattern: Orchestrator/Coordinator pattern
 * - Doesn't do the work itself
 * - Delegates to specialized services
 * - Manages the workflow and state transitions
 * - Provides progress callbacks for UI feedback
 */
class PluginLoaderOrchestrator {
    constructor(applicationFactory, appDataPath = null) {
        this.applicationFactory = applicationFactory;
        // Allow appDataPath to be passed in (for testing), otherwise use Electron's path
        try {
            this.appDataPath = appDataPath || app.getPath('userData');
        } catch (error) {
            // In test environment, app might not be available
            this.appDataPath = appDataPath || '/tmp/nft-studio-test';
        }
        this.pluginManager = null;
        this.securePluginLoader = null;
        this.effectRegistryService = null;
        this.registryCacheService = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the orchestrator
     * Lazy-loads services as needed
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize plugin manager
            this.pluginManager = new PluginManagerService(this.appDataPath);
            await this.pluginManager.initialize();

            // Get services from factory
            this.effectRegistryService = this.applicationFactory.getEffectRegistryService();
            this.registryCacheService = this.applicationFactory.getRegistryCacheService();

            // Lazy load SecurePluginLoader (only when needed)
            // This avoids circular dependencies and speeds up startup

            this.isInitialized = true;
            SafeConsole.log('✅ [PluginLoaderOrchestrator] Initialized');
        } catch (error) {
            SafeConsole.error('❌ [PluginLoaderOrchestrator] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Get SecurePluginLoader (lazy load and initialize)
     * @returns {SecurePluginLoader}
     * @private
     */
    async _getSecurePluginLoader() {
        if (!this.securePluginLoader) {
            const { SecurePluginLoader } = await import('../main/services/SecurePluginLoader.js');
            this.securePluginLoader = new SecurePluginLoader(this.appDataPath);
            // Load persistent cache of processed plugin directories
            await this.securePluginLoader.initialize();
        }
        return this.securePluginLoader;
    }

    // ==================== INSTALL FLOW ====================

    /**
     * Install and load a plugin
     *
     * Flow:
     * 1. Download/extract plugin (if from npm)
     * 2. Validate plugin structure
     * 3. Add to plugins-config.json
     * 4. Prepare dependencies (symlink/copy node_modules)
     * 5. Process plugin directory (rewrite imports)
     * 6. Load and register with my-nft-gen
     * 7. Update registry cache
     * 8. Emit success event
     *
     * @param {Object} pluginData - Plugin installation data
     * @param {string} pluginData.name - Plugin name
     * @param {string} pluginData.path - Plugin path (local) or npm package name
     * @param {string} pluginData.type - 'local' or 'npm'
     * @param {Function} progressCallback - Progress callback (phase, message, percent)
     * @returns {Promise<Object>} Installation result
     */
    async installAndLoadPlugin(pluginData, progressCallback = null) {
        await this.initialize();

        const { name, path: pluginPath, type } = pluginData;
        let validation = null; // Initialize to handle errors before validation occurs

        try {
            SafeConsole.log(`🔧 [PluginLoaderOrchestrator] Installing plugin: ${name}`);
            this._reportProgress(progressCallback, 'validating', `Validating plugin: ${name}`, 10);

            // Step 1: Download/extract if from npm
            let finalPluginPath = pluginPath;
            let pluginAlreadyInConfig = false;
            if (type === 'npm') {
                this._reportProgress(progressCallback, 'downloading', `Downloading ${name} from npm`, 20);
                // Use PluginManagerService's npm installer (downloads and adds to config)
                const downloadResult = await this.pluginManager.installFromNpm(name, (progress, message) => {
                    this._reportProgress(progressCallback, 'downloading', message, 20 + (progress * 0.1));
                });
                if (!downloadResult.success) {
                    throw new Error(`Download failed: ${downloadResult.error}`);
                }
                // installFromNpm already added it to config, so extract the path
                const plugin = await this.pluginManager.getPluginByName(downloadResult.info?.name || name);
                finalPluginPath = plugin?.path || pluginPath;
                pluginAlreadyInConfig = true;
            }

            // Step 2: Validate plugin structure
            this._reportProgress(progressCallback, 'validating', `Validating plugin structure`, 30);
            const validation = await this.pluginManager.validatePlugin(finalPluginPath);
            if (!validation.valid) {
                throw new Error(`Invalid plugin: ${validation.error}`);
            }

            // Step 3: Add to plugins-config.json (skip for npm since installFromNpm already did it)
            if (!pluginAlreadyInConfig) {
                this._reportProgress(progressCallback, 'configuring', `Adding to plugin configuration`, 40);
                await this.pluginManager.addPlugin({
                    name: validation.info?.name || name,
                    path: finalPluginPath,
                    type,
                    enabled: true
                });
            }

            // Step 4-6: Prepare, process, and load plugin
            this._reportProgress(progressCallback, 'loading', `Loading and registering effects`, 50);
            const canonicalName = validation.info?.name || name;
            const loadResult = await this._loadSinglePlugin({
                name: canonicalName,
                path: finalPluginPath,
                success: true
            }, progressCallback);

            if (!loadResult.success) {
                throw new Error(`Failed to load plugin: ${loadResult.error}`);
            }

            // Step 7: Invalidate registry cache (plugin list changed)
            this._reportProgress(progressCallback, 'updating', `Updating registry cache`, 90);
            await this.registryCacheService.invalidateCache();
            
            // Step 7b: Final synchronization - allow all file system operations to settle
            // This is critical to prevent UI unlocking before background symlink/registration operations complete
            this._reportProgress(progressCallback, 'finalizing', `Finalizing plugin installation...`, 95);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 8: Success
            this._reportProgress(progressCallback, 'complete', `Plugin installed successfully`, 100);

            SafeConsole.log(`✅ [PluginLoaderOrchestrator] Plugin installed: ${canonicalName}`);

            return {
                success: true,
                plugin: {
                    name: canonicalName,
                    path: finalPluginPath,
                    // Strip out non-serializable effectClass objects for IPC serialization
                    effects: (loadResult.effects || []).map(e => ({
                        name: e.name,
                        category: e.category,
                        metadata: e.metadata
                        // Explicitly exclude effectClass - it's not serializable
                    }))
                }
            };
        } catch (error) {
            const canonicalName = validation?.info?.name || name;
            SafeConsole.error(`❌ [PluginLoaderOrchestrator] Install failed for ${canonicalName}:`, error);
            this._reportProgress(progressCallback, 'error', `Installation failed: ${error.message}`, 0);

            // Rollback: remove from config if added
            try {
                await this.pluginManager.removePlugin(canonicalName);
            } catch (rollbackError) {
                SafeConsole.error('⚠️ [PluginLoaderOrchestrator] Rollback failed:', rollbackError);
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==================== BULK LOAD FLOW ====================

    /**
     * Load all installed plugins
     *
     * Flow:
     * 1. Discover plugins from plugins-config.json
     * 2. For each plugin:
     *    - Prepare dependencies
     *    - Load and register
     * 3. Update registry cache
     * 4. Emit completion event
     *
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Load results
     */
    async loadInstalledPlugins(progressCallback = null) {
        await this.initialize();

        try {
            SafeConsole.log('🔄 [PluginLoaderOrchestrator] Loading installed plugins...');
            this._reportProgress(progressCallback, 'discovering', 'Discovering installed plugins', 0);

            // Get enabled plugins
            const plugins = await this.pluginManager.loadPluginsForGeneration();
            const pluginCount = plugins.length;

            if (pluginCount === 0) {
                SafeConsole.log('ℹ️ [PluginLoaderOrchestrator] No plugins to load');
                return { success: true, loaded: 0, failed: 0, results: [] };
            }

            SafeConsole.log(`📦 [PluginLoaderOrchestrator] Found ${pluginCount} plugin(s) to load`);

            const results = [];
            let loadedCount = 0;
            let failedCount = 0;

            // Load each plugin with timeout protection
            for (let i = 0; i < pluginCount; i++) {
                const pluginInfo = plugins[i];
                const percent = Math.floor(((i + 1) / pluginCount) * 100);

                this._reportProgress(
                    progressCallback,
                    'loading',
                    `Loading plugin ${i + 1}/${pluginCount}: ${pluginInfo.name}`,
                    percent
                );

                try {
                    const result = await this._loadSinglePluginWithTimeout(pluginInfo, 120000); // 2 min timeout

                    if (result.success) {
                        loadedCount++;
                        // Strip out non-serializable effectClass objects for IPC serialization
                        const cleanedEffects = (result.effects || []).map(e => ({
                            name: e.name,
                            category: e.category,
                            metadata: e.metadata
                            // Explicitly exclude effectClass - it's not serializable
                        }));
                        results.push({ 
                            success: true, 
                            plugin: pluginInfo.name,
                            effects: cleanedEffects,
                            configs: result.configs || []
                        });
                    } else {
                        failedCount++;
                        results.push({ success: false, plugin: pluginInfo.name, error: result.error });
                    }
                } catch (error) {
                    failedCount++;
                    SafeConsole.error(`⚠️ [PluginLoaderOrchestrator] Failed to load ${pluginInfo.name}:`, error.message);
                    results.push({ success: false, plugin: pluginInfo.name, error: error.message });
                }
            }

            // Update cache
            this._reportProgress(progressCallback, 'caching', 'Updating registry cache', 100);
            await this.registryCacheService.invalidateCache();

            SafeConsole.log(`✅ [PluginLoaderOrchestrator] Bulk load complete: ${loadedCount} loaded, ${failedCount} failed`);

            return {
                success: true,
                loaded: loadedCount,
                failed: failedCount,
                results
            };
        } catch (error) {
            SafeConsole.error('❌ [PluginLoaderOrchestrator] Bulk load failed:', error);
            return {
                success: false,
                error: error.message,
                loaded: 0,
                failed: 0,
                results: []
            };
        }
    }

    // ==================== UNINSTALL FLOW ====================

    /**
     * Uninstall a plugin
     *
     * Flow:
     * 1. Find plugin in config
     * 2. Unregister effects from EffectRegistry
     * 3. Clean up plugin's node_modules symlinks
     * 4. Clean up processed temp directories
     * 5. Remove from plugins-config.json
     * 6. Optionally delete source directory
     * 7. Invalidate registry cache
     * 8. Emit uninstall event
     *
     * @param {string} pluginName - Plugin name
     * @param {Object} options - Uninstall options
     * @param {boolean} options.deleteSource - Delete plugin source directory
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Uninstall result
     */
    async uninstallPlugin(pluginName, options = {}, progressCallback = null) {
        await this.initialize();

        const { deleteSource = false } = options;

        try {
            SafeConsole.log(`🗑️ [PluginLoaderOrchestrator] Uninstalling plugin: ${pluginName}`);
            this._reportProgress(progressCallback, 'finding', `Finding plugin: ${pluginName}`, 10);

            // Step 1: Find plugin in config
            const plugins = await this.pluginManager.getPlugins();
            const plugin = plugins.find(p => p.name === pluginName);

            if (!plugin) {
                throw new Error(`Plugin not found: ${pluginName}`);
            }

            // Step 2: Unregister effects (if registry is loaded)
            this._reportProgress(progressCallback, 'unregistering', 'Unregistering effects', 20);
            await this._unregisterPluginEffects(pluginName);

            // Step 3: Clean up symlinks
            this._reportProgress(progressCallback, 'cleaning-symlinks', 'Cleaning up symlinks', 40);
            await this._cleanupPluginSymlinks(plugin.path);

            // Step 4: Clean up processed directories
            this._reportProgress(progressCallback, 'cleaning-temp', 'Cleaning up temp directories', 60);
            await this._cleanupProcessedDirectories(plugin.path);

            // Step 5: Remove from config
            this._reportProgress(progressCallback, 'removing-config', 'Removing from configuration', 70);
            await this.pluginManager.removePlugin(pluginName);

            // Step 6: Delete source (optional)
            if (deleteSource) {
                this._reportProgress(progressCallback, 'deleting', 'Deleting plugin files', 80);
                await this._deletePluginSource(plugin.path);
            }

            // Step 7: Invalidate cache
            this._reportProgress(progressCallback, 'updating-cache', 'Updating registry cache', 90);
            await this.registryCacheService.invalidateCache();

            // Step 8: Success
            this._reportProgress(progressCallback, 'complete', 'Plugin uninstalled successfully', 100);

            SafeConsole.log(`✅ [PluginLoaderOrchestrator] Plugin uninstalled: ${pluginName}`);

            return {
                success: true,
                plugin: pluginName,
                deletedSource: deleteSource
            };
        } catch (error) {
            SafeConsole.error(`❌ [PluginLoaderOrchestrator] Uninstall failed for ${pluginName}:`, error);
            this._reportProgress(progressCallback, 'error', `Uninstall failed: ${error.message}`, 0);

            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==================== CLEANUP FLOW ====================

    /**
     * Cleanup orphaned resources
     *
     * Purpose: Remove orphaned temp directories and broken symlinks that
     * were created during plugin loading but never cleaned up.
     *
     * @returns {Promise<Object>} Cleanup results
     */
    async cleanupOrphanedResources() {
        await this.initialize();

        try {
            SafeConsole.log('🧹 [PluginLoaderOrchestrator] Cleaning up orphaned resources...');

            const results = {
                tempDirsRemoved: 0,
                symlinksRemoved: 0,
                errors: []
            };

            // Find all plugin-processed-* directories in userData
            const userDataFiles = await fs.readdir(this.appDataPath);
            const processedDirs = userDataFiles.filter(f => f.startsWith('plugin-processed-'));

            SafeConsole.log(`🔍 [PluginLoaderOrchestrator] Found ${processedDirs.length} processed plugin directories`);

            // Get current plugins to check if they're still referenced
            const plugins = await this.pluginManager.getPlugins();
            const pluginPaths = new Set(plugins.map(p => p.path));

            // Check each processed directory
            for (const dirName of processedDirs) {
                const dirPath = path.join(this.appDataPath, dirName);

                try {
                    // Check if this directory is still referenced by any plugin
                    const isReferenced = await this._isProcessedDirReferenced(dirPath, pluginPaths);

                    if (!isReferenced) {
                        SafeConsole.log(`🗑️ [PluginLoaderOrchestrator] Removing orphaned directory: ${dirName}`);
                        await fs.rm(dirPath, { recursive: true, force: true });
                        results.tempDirsRemoved++;
                    }
                } catch (error) {
                    SafeConsole.error(`⚠️ [PluginLoaderOrchestrator] Failed to remove ${dirName}:`, error.message);
                    results.errors.push({ path: dirPath, error: error.message });
                }
            }

            // Also clean up orphaned entries from the persistent cache
            SafeConsole.log(`🧹 [PluginLoaderOrchestrator] Cleaning up persistent cache entries...`);
            const cacheCleanupResults = await this._cleanupPersistentCache();

            SafeConsole.log(`✅ [PluginLoaderOrchestrator] Cleanup complete: ${results.tempDirsRemoved} dirs removed, ${cacheCleanupResults.removed} cache entries cleaned`);

            return {
                success: true,
                ...results,
                cacheEntriesRemoved: cacheCleanupResults.removed
            };
        } catch (error) {
            SafeConsole.error('❌ [PluginLoaderOrchestrator] Cleanup failed:', error);
            return {
                success: false,
                error: error.message,
                tempDirsRemoved: 0,
                symlinksRemoved: 0,
                errors: []
            };
        }
    }

    // ==================== RELOAD FLOW ====================

    /**
     * Reload a plugin (hot reload)
     *
     * Flow:
     * 1. Unregister old plugin effects
     * 2. Re-load plugin from disk
     * 3. Re-register effects
     * 4. Update registry cache
     * 5. Emit reload event
     *
     * @param {string} pluginName - Plugin name
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Reload result
     */
    async reloadPlugin(pluginName, progressCallback = null) {
        await this.initialize();

        try {
            SafeConsole.log(`🔄 [PluginLoaderOrchestrator] Reloading plugin: ${pluginName}`);
            this._reportProgress(progressCallback, 'finding', `Finding plugin: ${pluginName}`, 10);

            // Find plugin
            const plugins = await this.pluginManager.getPlugins();
            const plugin = plugins.find(p => p.name === pluginName);

            if (!plugin) {
                throw new Error(`Plugin not found: ${pluginName}`);
            }

            // Unregister old effects
            this._reportProgress(progressCallback, 'unregistering', 'Unregistering old effects', 30);
            await this._unregisterPluginEffects(pluginName);

            // Clean up old processed directories
            this._reportProgress(progressCallback, 'cleaning', 'Cleaning up old files', 40);
            await this._cleanupProcessedDirectories(plugin.path);

            // Re-load plugin
            this._reportProgress(progressCallback, 'loading', 'Loading plugin', 60);
            const loadResult = await this._loadSinglePlugin({
                name: plugin.name,
                path: plugin.path,
                success: true
            }, progressCallback);

            if (!loadResult.success) {
                throw new Error(`Failed to reload: ${loadResult.error}`);
            }

            // Update cache
            this._reportProgress(progressCallback, 'caching', 'Updating cache', 90);
            await this.registryCacheService.invalidateCache();

            this._reportProgress(progressCallback, 'complete', 'Plugin reloaded successfully', 100);

            SafeConsole.log(`✅ [PluginLoaderOrchestrator] Plugin reloaded: ${pluginName}`);

            return {
                success: true,
                plugin: pluginName,
                // Strip out non-serializable effectClass objects for IPC serialization
                effects: (loadResult.effects || []).map(e => ({
                    name: e.name,
                    category: e.category,
                    metadata: e.metadata
                    // Explicitly exclude effectClass - it's not serializable
                }))
            };
        } catch (error) {
            SafeConsole.error(`❌ [PluginLoaderOrchestrator] Reload failed for ${pluginName}:`, error);
            this._reportProgress(progressCallback, 'error', `Reload failed: ${error.message}`, 0);

            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Load a single plugin
     * @param {Object} pluginInfo - Plugin info
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Load result
     * @private
     */
    async _loadSinglePlugin(pluginInfo, progressCallback = null) {
        try {
            const loader = await this._getSecurePluginLoader();

            this._reportProgress(progressCallback, 'processing', `Processing plugin: ${pluginInfo.name}`, 55);

            // Create a wrapper callback to keep UI locked during loading
            const loaderProgressCallback = (phase, message, percent) => {
                // Map internal loader phases to user-visible phases
                const phaseMap = {
                    'setup-node-modules': 'processing',
                    'symlink': 'processing',
                    'process-directory': 'processing',
                    'import': 'registering'
                };
                
                const displayPhase = phaseMap[phase] || phase;
                const displayPercent = Math.min(percent, 80); // Cap at 80% to leave room for final registration
                
                this._reportProgress(
                    progressCallback, 
                    displayPhase, 
                    message, 
                    55 + (displayPercent * 0.25) // Scale from 55% to 80%
                );
            };

            const result = await loader.loadPluginInMainProcess(pluginInfo.path, loaderProgressCallback);

            if (result.success && result.effects && result.effects.length > 0) {
                this._reportProgress(progressCallback, 'registering', `Registering ${result.effects.length} effects`, 85);
                
                // 🔥 CRITICAL: Captured effects must be registered with EffectRegistry
                // SecurePluginLoader only captures them in memory - we need to register them for real
                await this._registerCapturedEffects(result.effects, pluginInfo.name);
                
                this._reportProgress(progressCallback, 'registering', `Registered ${result.effects.length} effects`, 87);
            }

            return result;
        } catch (error) {
            SafeConsole.error(`⚠️ [PluginLoaderOrchestrator] Load failed for ${pluginInfo.name}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load a single plugin with timeout
     * @param {Object} pluginInfo - Plugin info
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<Object>} Load result
     * @private
     */
    async _loadSinglePluginWithTimeout(pluginInfo, timeoutMs) {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Plugin loading timeout (${timeoutMs}ms)`)), timeoutMs)
        );

        return Promise.race([
            this._loadSinglePlugin(pluginInfo),
            timeoutPromise
        ]);
    }

    /**
     * Unregister plugin effects from registry
     * @param {string} pluginName - Plugin name
     * @private
     */
    async _unregisterPluginEffects(pluginName) {
        try {
            // This would require EffectRegistry to track which effects came from which plugin
            // For now, we'll log that we would unregister
            SafeConsole.log(`🗑️ [PluginLoaderOrchestrator] Would unregister effects for: ${pluginName}`);
            // TODO: Implement actual unregistration when EffectRegistry supports it
        } catch (error) {
            SafeConsole.error('⚠️ [PluginLoaderOrchestrator] Unregister effects failed:', error);
        }
    }

    /**
     * Clean up plugin symlinks
     * @param {string} pluginPath - Plugin path
     * @private
     */
    async _cleanupPluginSymlinks(pluginPath) {
        try {
            // Check for node_modules symlinks in plugin directory
            const nodeModulesPath = path.join(pluginPath, 'node_modules');
            const stats = await fs.lstat(nodeModulesPath).catch(() => null);

            if (stats && stats.isSymbolicLink()) {
                SafeConsole.log(`🔗 [PluginLoaderOrchestrator] Removing symlink: ${nodeModulesPath}`);
                await fs.unlink(nodeModulesPath);
            }
        } catch (error) {
            SafeConsole.error('⚠️ [PluginLoaderOrchestrator] Symlink cleanup failed:', error);
        }
    }

    /**
     * Clean up processed directories for a plugin
     * @param {string} pluginPath - Plugin path
     * @private
     */
    async _cleanupProcessedDirectories(pluginPath) {
        try {
            const loader = await this._getSecurePluginLoader();

            // Check if this plugin has a processed directory cached
            if (loader.processedPluginDirs && loader.processedPluginDirs.has(pluginPath)) {
                const processedDir = loader.processedPluginDirs.get(pluginPath);
                SafeConsole.log(`🗑️ [PluginLoaderOrchestrator] Removing processed directory: ${processedDir}`);

                await fs.rm(processedDir, { recursive: true, force: true });
                loader.processedPluginDirs.delete(pluginPath);
                
                // Also remove from persistent cache
                await loader.dirCacheService.removeMapping(pluginPath);
            }
        } catch (error) {
            SafeConsole.error('⚠️ [PluginLoaderOrchestrator] Processed dir cleanup failed:', error);
        }
    }

    /**
     * Delete plugin source directory
     * @param {string} pluginPath - Plugin path
     * @private
     */
    async _deletePluginSource(pluginPath) {
        try {
            SafeConsole.log(`🗑️ [PluginLoaderOrchestrator] Deleting plugin source: ${pluginPath}`);
            await fs.rm(pluginPath, { recursive: true, force: true });
        } catch (error) {
            SafeConsole.error('⚠️ [PluginLoaderOrchestrator] Source deletion failed:', error);
            throw error;
        }
    }

    /**
     * Check if a processed directory is still referenced
     * @param {string} processedDirPath - Processed directory path
     * @param {Set} pluginPaths - Set of current plugin paths
     * @returns {Promise<boolean>} True if still referenced
     * @private
     */
    async _isProcessedDirReferenced(processedDirPath, pluginPaths) {
        try {
            // A processed directory is referenced if its original plugin path
            // is still in the plugin config
            // The directory name contains a timestamp, but we can check if any
            // plugin path is a substring of files in this directory

            // For now, we'll assume directories older than 1 day are orphaned
            const stats = await fs.stat(processedDirPath);
            const age = Date.now() - stats.mtimeMs;
            const oneDayMs = 24 * 60 * 60 * 1000;

            return age < oneDayMs; // Keep if less than 1 day old
        } catch (error) {
            return false; // If we can't stat it, consider it orphaned
        }
    }

    /**
     * Clean up orphaned entries from the persistent processed plugin dir cache
     * @returns {Promise<Object>} Cleanup results
     * @private
     */
    async _cleanupPersistentCache() {
        try {
            const loader = await this._getSecurePluginLoader();
            return await loader.dirCacheService.cleanupOrphanedEntries();
        } catch (error) {
            SafeConsole.error('⚠️ [PluginLoaderOrchestrator] Persistent cache cleanup failed:', error);
            return { total: 0, removed: 0 };
        }
    }

    /**
     * Register captured effects with the real EffectRegistry and link their configs
     * @param {Array} capturedEffects - Effects captured by SecurePluginLoader
     * @param {string} pluginName - Plugin name for logging
     * @private
     */
    async _registerCapturedEffects(capturedEffects, pluginName) {
        try {
            if (!this.effectRegistryService) {
                SafeConsole.warn(`⚠️ [PluginLoaderOrchestrator] EffectRegistry service not available, skipping effect registration`);
                return;
            }

            SafeConsole.log(`🔧 [PluginLoaderOrchestrator] Registering ${capturedEffects.length} effects from plugin: ${pluginName}`);

            // Get the registries we need
            const effectRegistry = await this.effectRegistryService.getEffectRegistry();
            const configRegistry = await this.effectRegistryService.getConfigRegistry();
            
            // Dynamically import ConfigLinker to link effects with their configs
            const { ConfigLinker } = await import('my-nft-gen/src/core/registry/ConfigLinker.js');

            for (const effect of capturedEffects) {
                try {
                    if (effectRegistry && effect.effectClass) {
                        // Register the effect class
                        effectRegistry.registerGlobal(effect.effectClass, effect.category, effect.metadata);
                        SafeConsole.log(`✅ [PluginLoaderOrchestrator] Registered effect: ${effect.name} (Category: ${effect.category})`);
                    }
                } catch (effectError) {
                    SafeConsole.error(`⚠️ [PluginLoaderOrchestrator] Failed to register effect ${effect.name}:`, effectError.message);
                }
            }

            // 🔥 CRITICAL: Link effects with their config classes
            // This creates the connection that PluginRegistry uses to display effects in the UI
            await ConfigLinker.linkEffectsWithConfigs();
            SafeConsole.log(`✅ [PluginLoaderOrchestrator] Config linking complete for plugin: ${pluginName}`);

            SafeConsole.log(`✅ [PluginLoaderOrchestrator] Effect registration complete for plugin: ${pluginName}`);
        } catch (error) {
            SafeConsole.error('⚠️ [PluginLoaderOrchestrator] Effect registration failed:', error);
            throw error;
        }
    }

    /**
     * Report progress to callback
     * @param {Function} callback - Progress callback
     * @param {string} phase - Current phase
     * @param {string} message - Progress message
     * @param {number} percent - Progress percentage (0-100)
     * @private
     */
    _reportProgress(callback, phase, message, percent) {
        if (callback && typeof callback === 'function') {
            try {
                callback({ phase, message, percent });
            } catch (error) {
                SafeConsole.error('⚠️ [PluginLoaderOrchestrator] Progress callback error:', error);
            }
        }
    }
}

export default PluginLoaderOrchestrator;
