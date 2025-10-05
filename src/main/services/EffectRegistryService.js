/**
 * Service responsible for effect registry operations only
 * Follows Single Responsibility Principle
 */
class EffectRegistryService {
    constructor() {
        this.coreEffectsRegistered = false;
    }

    /**
     * Ensure core effects are registered only once using new enhanced registration with config linking
     * @returns {Promise<void>}
     */
    async ensureCoreEffectsRegistered() {
        if (!this.coreEffectsRegistered) {
            try {
                // Use the simpler PluginLoader approach that avoids validation issues
                const { PluginLoader } = await import('my-nft-gen/src/core/plugins/PluginLoader.js');

                // Ensure effects are loaded
                await PluginLoader.ensureEffectsLoaded();

                // Load plugins for UI display
                await this.loadPluginsForUI();

                // Also try to link configs if possible
                try {
                    const { ConfigLinker } = await import('my-nft-gen/src/core/registry/ConfigLinker.js');
                    await ConfigLinker.linkEffectsWithConfigs();
                } catch (linkError) {
                    // Config linking is optional - effects will still work without it
                    console.log('Config linking skipped:', linkError.message);
                }

                this.coreEffectsRegistered = true;
                console.log('✅ Core effects loaded successfully');
            } catch (error) {
                console.error('Failed to register core effects:', error);

                // Try the original enhanced registration as a fallback
                try {
                    const { EnhancedEffectsRegistration } = await import('my-nft-gen/src/core/registry/EnhancedEffectsRegistration.js');
                    await EnhancedEffectsRegistration.registerEffectsFromPackage('my-nft-effects-core');

                    this.coreEffectsRegistered = true;
                    console.log('✅ Core effects loaded using enhanced registration');
                } catch (fallbackError) {
                    console.error('All registration methods failed:', fallbackError);
                    throw error; // Re-throw original error
                }
            }
        }
    }

    /**
     * Get effect registry
     * @returns {Promise<Object>} Effect registry
     */
    async getEffectRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { EffectRegistry } = await import('my-nft-gen/src/core/registry/EffectRegistry.js');
        return EffectRegistry;
    }

    /**
     * Get config registry
     * @returns {Promise<Object>} Config registry
     */
    async getConfigRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { ConfigRegistry } = await import('my-nft-gen/src/core/registry/ConfigRegistry.js');
        return ConfigRegistry;
    }

    /**
     * Get all available effects by category
     * @returns {Promise<Object>} Effects by category
     */
    async getAllEffects() {
        const EffectRegistry = await this.getEffectRegistry();
        const { EffectCategories } = await import('my-nft-gen/src/core/registry/EffectCategories.js');

        return {
            primary: EffectRegistry.getByCategoryGlobal(EffectCategories.PRIMARY),
            secondary: EffectRegistry.getByCategoryGlobal(EffectCategories.SECONDARY),
            keyFrame: EffectRegistry.getByCategoryGlobal(EffectCategories.KEY_FRAME),
            final: EffectRegistry.getByCategoryGlobal(EffectCategories.FINAL_IMAGE)
        };
    }

    /**
     * Get specific effect by name
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Effect or null if not found
     */
    async getEffect(effectName) {
        const EffectRegistry = await this.getEffectRegistry();
        return EffectRegistry.getGlobal(effectName);
    }

    /**
     * Get modern plugin registry with config linking
     * @returns {Promise<Object>} Plugin registry
     */
    async getPluginRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { PluginRegistry } = await import('my-nft-gen/src/core/registry/PluginRegistry.js');
        return PluginRegistry;
    }

    /**
     * Get effect with its linked config class
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Plugin with effect and config class or null if not found
     */
    async getEffectWithConfig(effectName) {
        const PluginRegistry = await this.getPluginRegistry();
        return PluginRegistry.get(effectName);
    }

    /**
     * Get all effects with their config classes by category
     * @returns {Promise<Object>} Effects with configs by category
     */
    async getAllEffectsWithConfigs() {
        const PluginRegistry = await this.getPluginRegistry();
        const { EffectCategories } = await import('my-nft-gen/src/core/registry/EffectCategories.js');

        return {
            primary: PluginRegistry.getByCategory(EffectCategories.PRIMARY),
            secondary: PluginRegistry.getByCategory(EffectCategories.SECONDARY),
            keyFrame: PluginRegistry.getByCategory(EffectCategories.KEY_FRAME),
            finalImage: PluginRegistry.getByCategory(EffectCategories.FINAL_IMAGE)
        };
    }

    /**
     * Get plugin registry statistics including config linking info
     * @returns {Promise<Object>} Registry statistics
     */
    async getRegistryStats() {
        const PluginRegistry = await this.getPluginRegistry();
        return PluginRegistry.getStats();
    }

    /**
     * Check if core effects are registered
     * @returns {boolean} True if registered
     */
    areCoreEffectsRegistered() {
        return this.coreEffectsRegistered;
    }

    /**
     * Debug method to check current registry state
     * @returns {Promise<Object>} Registry debug information
     */
    async debugRegistry() {
        try {
            const EffectRegistry = await this.getEffectRegistry();
            const { EffectCategories } = await import('my-nft-gen/src/core/registry/EffectCategories.js');
            
            const debug = {
                primary: Object.keys(EffectRegistry.getByCategoryGlobal(EffectCategories.PRIMARY)),
                secondary: Object.keys(EffectRegistry.getByCategoryGlobal(EffectCategories.SECONDARY)),
                keyFrame: Object.keys(EffectRegistry.getByCategoryGlobal(EffectCategories.KEY_FRAME)),
                finalImage: Object.keys(EffectRegistry.getByCategoryGlobal(EffectCategories.FINAL_IMAGE))
            };
            
            return debug;
        } catch (error) {
            console.error('❌ Failed to debug registry:', error);
            return { error: error.message };
        }
    }

    /**
     * Load plugins for UI display (called during initial effect registry setup)
     * @returns {Promise<void>}
     */
    async loadPluginsForUI() {
        try {
            // Import PluginManagerService to get enabled plugins
            const { app } = await import('electron');
            const { PluginManagerService } = await import('../../services/PluginManagerService.js');
            
            const appDataPath = app.getPath('userData');
            const pluginManager = new PluginManagerService(appDataPath);
            await pluginManager.initialize();
            
            const pluginPaths = await pluginManager.loadPluginsForGeneration();
            
            if (pluginPaths.length > 0) {
                console.log('Loading plugins for UI:', pluginPaths);
                
                const { PluginLoader } = await import('my-nft-gen/src/core/plugins/PluginLoader.js');
                
                for (const pluginInfo of pluginPaths) {
                    if (pluginInfo.success) {
                        try {
                            console.log(`🔄 Loading plugin for UI: ${pluginInfo.name} from ${pluginInfo.path}`);
                            
                            // Try PluginLoader first
                            try {
                                await PluginLoader.loadPlugin(pluginInfo.path);
                                console.log(`✅ Plugin loaded via PluginLoader: ${pluginInfo.name}`);
                            } catch (loaderError) {
                                console.log(`⚠️ PluginLoader failed for ${pluginInfo.name}, trying direct import:`, loaderError.message);
                                
                                // Fallback: try direct import of the plugin file
                                const fs = await import('fs/promises');
                                const path = await import('path');
                                
                                // Check if it's a directory with package.json
                                const stats = await fs.stat(pluginInfo.path);
                                let pluginFile = pluginInfo.path;
                                
                                if (stats.isDirectory()) {
                                    // Look for package.json to get main entry point
                                    const packageJsonPath = path.join(pluginInfo.path, 'package.json');
                                    try {
                                        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                                        pluginFile = path.join(pluginInfo.path, packageJson.main || 'index.js');
                                    } catch (pkgError) {
                                        // Default to plugin.js or index.js
                                        const possibleFiles = ['plugin.js', 'index.js'];
                                        for (const file of possibleFiles) {
                                            const testPath = path.join(pluginInfo.path, file);
                                            try {
                                                await fs.access(testPath);
                                                pluginFile = testPath;
                                                break;
                                            } catch (e) {
                                                // Continue to next file
                                            }
                                        }
                                    }
                                }
                                
                                // Import the plugin file directly
                                console.log(`🔄 Importing plugin file: ${pluginFile}`);
                                await import(`file://${pluginFile}`);
                                console.log(`✅ Plugin imported directly: ${pluginInfo.name}`);
                            }
                        } catch (error) {
                            console.error(`❌ Failed to load plugin ${pluginInfo.name} for UI:`, error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load plugins for UI:', error);
            // Don't throw - this is optional for UI display
        }
    }

    /**
     * Force refresh the effect registry (used after loading plugins)
     * This reloads the plugin registry to include newly loaded plugins
     * @param {boolean} skipPluginReload - Skip reloading plugins (used to prevent infinite loops)
     * @returns {Promise<void>}
     */
    async refreshRegistry(skipPluginReload = false) {
        try {
            console.log('🔄 Refreshing effect registry...');

            // Only reload plugins if not explicitly skipped
            // This prevents infinite loops when refreshRegistry is called from plugin:loaded events
            if (!skipPluginReload) {
                // Reload plugins to ensure they're properly loaded
                await this.loadPluginsForUI();
            }

            // Force config linking again to pick up new plugins
            try {
                const { ConfigLinker } = await import('my-nft-gen/src/core/registry/ConfigLinker.js');
                await ConfigLinker.linkEffectsWithConfigs();
                console.log('✅ Config linking completed');
            } catch (linkError) {
                console.log('⚠️ Config linking skipped:', linkError.message);
            }

            // Log current registry state for debugging
            const EffectRegistry = await this.getEffectRegistry();
            const { EffectCategories } = await import('my-nft-gen/src/core/registry/EffectCategories.js');

            const primaryEffects = EffectRegistry.getByCategoryGlobal(EffectCategories.PRIMARY);
            console.log('📊 Primary effects in registry:', Object.keys(primaryEffects));

            // Emit a single event to notify UI that effects should be reloaded
            // This is better than emitting multiple plugin:loaded events
            await this.emitEffectsRefreshedEvent();

            console.log('✅ Effect registry refreshed');
        } catch (error) {
            console.error('❌ Failed to refresh effect registry:', error);
            throw error;
        }
    }

    /**
     * Emit effects refreshed event to the renderer process
     */
    async emitEffectsRefreshedEvent() {
        try {
            const { BrowserWindow } = await import('electron');
            const windows = BrowserWindow.getAllWindows();

            const event = {
                type: 'effects:refreshed',
                data: {
                    timestamp: new Date().toISOString()
                },
                timestamp: Date.now(),
                source: 'EffectRegistryService'
            };

            console.log('📊 Emitting effects:refreshed event');

            windows.forEach(window => {
                window.webContents.send('eventbus-message', event);
            });
        } catch (error) {
            console.error('Failed to emit effects refreshed event:', error);
        }
    }

}

export default EffectRegistryService;