import defaultLogger from '../main/utils/logger.js';

/**
 * Manages the lifecycle of plugin loading and initialization
 * Separates plugin loading concerns from project management
 * Follows Single Responsibility Principle
 */
export class PluginLifecycleManager {
    constructor(pluginManagerService, eventBus = null, logger = null) {
        // Dependency injection following Dependency Inversion Principle
        this.pluginManagerService = pluginManagerService;
        this.eventBus = eventBus;
        this.logger = logger || defaultLogger;
        
        // Track initialization state
        this.initialized = false;
        this.loadedPlugins = new Map();
    }

    /**
     * Initialize the plugin lifecycle manager
     * @returns {Promise<void>}
     */
    async initialize() {
        if (!this.initialized) {
            await this.pluginManagerService.initialize();
            this.initialized = true;
            this.logger.info('PluginLifecycleManager initialized');
        }
    }

    /**
     * Ensure plugins are loaded and ready for use
     * @returns {Promise<Array>} Array of plugin loading results
     */
    async ensurePluginsLoaded() {
        await this.initialize();

        const pluginPaths = await this.pluginManagerService.loadPluginsForGeneration();
        if (pluginPaths.length === 0) {
            this.logger.info('No plugins configured for loading');
            return [];
        }

        this.logger.info('Loading plugins for project:', pluginPaths);
        const loadResults = [];

        try {
            // Dynamically load PluginLoader from my-nft-gen
            const { PluginLoader } = await import('my-nft-gen/src/core/plugins/PluginLoader.js');
            let loadedAnyPlugin = false;

            for (const pluginInfo of pluginPaths) {
                const result = await this._loadSinglePlugin(PluginLoader, pluginInfo);
                loadResults.push(result);
                
                if (result.success) {
                    loadedAnyPlugin = true;
                }
            }

            // If we loaded any plugins, refresh the effect registry
            if (loadedAnyPlugin) {
                await this._refreshEffectRegistry();
            }

        } catch (error) {
            this.logger.error('Failed to load PluginLoader:', error);
            throw new Error(`Plugin loading system unavailable: ${error.message}`);
        }

        return loadResults;
    }

    /**
     * Load a single plugin and track its state
     * @private
     * @param {Object} PluginLoader - The plugin loader instance
     * @param {Object} pluginInfo - Plugin information
     * @returns {Promise<Object>} Loading result
     */
    async _loadSinglePlugin(PluginLoader, pluginInfo) {
        if (!pluginInfo.success) {
            const error = `Plugin ${pluginInfo.name} failed validation`;
            this.logger.warn(error);
            return {
                name: pluginInfo.name,
                path: pluginInfo.path,
                success: false,
                error
            };
        }

        try {
            await PluginLoader.loadPlugin(pluginInfo.path);
            this.loadedPlugins.set(pluginInfo.name, {
                name: pluginInfo.name,
                path: pluginInfo.path,
                loadedAt: new Date().toISOString()
            });
            
            this.logger.info(`✅ Plugin loaded: ${pluginInfo.name}`);
            
            // Emit event if event bus is available
            if (this.eventBus) {
                this.eventBus.emit('plugin:loaded', {
                    name: pluginInfo.name,
                    path: pluginInfo.path
                });
            }

            return {
                name: pluginInfo.name,
                path: pluginInfo.path,
                success: true
            };
        } catch (error) {
            this.logger.error(`Failed to load plugin ${pluginInfo.name}:`, error);
            
            // Emit error event if event bus is available
            if (this.eventBus) {
                this.eventBus.emit('plugin:loadError', {
                    name: pluginInfo.name,
                    path: pluginInfo.path,
                    error: error.message
                });
            }

            return {
                name: pluginInfo.name,
                path: pluginInfo.path,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Refresh the effect registry after loading plugins
     * @private
     * @returns {Promise<void>}
     */
    async _refreshEffectRegistry() {
        try {
            const EffectRegistryService = await import('../main/services/EffectRegistryService.js');
            const registryService = new EffectRegistryService.default();
            // Pass false to ensure plugins are reloaded since we just loaded new ones
            await registryService.refreshRegistry(false);
            this.logger.info('✅ Effect registry refreshed with loaded plugins');
            
            // Emit event if event bus is available
            if (this.eventBus) {
                this.eventBus.emit('effectRegistry:refreshed');
            }
        } catch (error) {
            this.logger.error('Failed to refresh effect registry:', error);
            throw error;
        }
    }

    /**
     * Get information about currently loaded plugins
     * @returns {Array} Array of loaded plugin information
     */
    getLoadedPlugins() {
        return Array.from(this.loadedPlugins.values());
    }

    /**
     * Get plugin paths for serialization (e.g., for worker threads)
     * @returns {Array<string>} Array of plugin paths
     */
    getPluginPaths() {
        return Array.from(this.loadedPlugins.values()).map(plugin => plugin.path);
    }

    /**
     * Check if plugins are initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get the count of loaded plugins
     * @returns {number} Number of loaded plugins
     */
    getLoadedPluginCount() {
        return this.loadedPlugins.size;
    }

    /**
     * Check if a specific plugin is loaded
     * @param {string} pluginName - Name of the plugin to check
     * @returns {boolean} True if plugin is loaded
     */
    isPluginLoaded(pluginName) {
        return this.loadedPlugins.has(pluginName);
    }

    /**
     * Unload all plugins (for cleanup)
     * @returns {Promise<void>}
     */
    async unloadAllPlugins() {
        this.loadedPlugins.clear();
        this.initialized = false;
        this.logger.info('All plugins unloaded');
        
        // Emit event if event bus is available
        if (this.eventBus) {
            this.eventBus.emit('plugins:unloaded');
        }
    }
}