/**
 * Interface for Plugin Lifecycle Management
 * 
 * This interface defines the contract for managing plugins,
 * including loading, unloading, validation, and lifecycle events.
 * 
 * @interface IPluginManager
 */
export class IPluginManager {
    /**
     * Loads all available plugins from the plugin directory
     * 
     * @returns {Promise<Array<Object>>} Array of loaded plugin objects
     * @throws {PluginLoadError} When plugin loading fails
     */
    async loadPlugins() {
        throw new Error('IPluginManager.loadPlugins() must be implemented');
    }

    /**
     * Loads a specific plugin by ID
     * 
     * @param {string} pluginId - Unique plugin identifier
     * @returns {Promise<Object>} Loaded plugin object
     * @throws {PluginNotFoundError} When plugin doesn't exist
     * @throws {PluginLoadError} When plugin loading fails
     */
    async loadPlugin(pluginId) {
        throw new Error('IPluginManager.loadPlugin() must be implemented');
    }

    /**
     * Unloads a specific plugin and cleans up its resources
     * 
     * @param {string} pluginId - Unique plugin identifier
     * @returns {Promise<void>}
     * @throws {PluginNotFoundError} When plugin doesn't exist
     */
    async unloadPlugin(pluginId) {
        throw new Error('IPluginManager.unloadPlugin() must be implemented');
    }

    /**
     * Validates plugin structure and compatibility
     * 
     * @param {Object} plugin - Plugin object to validate
     * @returns {Promise<PluginValidationResult>} Validation result
     */
    async validatePlugin(plugin) {
        throw new Error('IPluginManager.validatePlugin() must be implemented');
    }

    /**
     * Gets all currently loaded plugins
     * 
     * @returns {Array<Object>} Array of loaded plugin objects
     */
    getLoadedPlugins() {
        throw new Error('IPluginManager.getLoadedPlugins() must be implemented');
    }

    /**
     * Gets a specific plugin by ID
     * 
     * @param {string} pluginId - Unique plugin identifier
     * @returns {Object|null} Plugin object or null if not found
     */
    getPlugin(pluginId) {
        throw new Error('IPluginManager.getPlugin() must be implemented');
    }

    /**
     * Checks if a plugin is currently loaded
     * 
     * @param {string} pluginId - Unique plugin identifier
     * @returns {boolean} True if plugin is loaded
     */
    isPluginLoaded(pluginId) {
        throw new Error('IPluginManager.isPluginLoaded() must be implemented');
    }

    /**
     * Reloads a specific plugin (unload then load)
     * 
     * @param {string} pluginId - Unique plugin identifier
     * @returns {Promise<Object>} Reloaded plugin object
     */
    async reloadPlugin(pluginId) {
        throw new Error('IPluginManager.reloadPlugin() must be implemented');
    }

    /**
     * Gets plugin metadata without loading the plugin
     * 
     * @param {string} pluginId - Unique plugin identifier
     * @returns {Promise<Object>} Plugin metadata
     */
    async getPluginMetadata(pluginId) {
        throw new Error('IPluginManager.getPluginMetadata() must be implemented');
    }
}

/**
 * Plugin validation result structure
 * @typedef {Object} PluginValidationResult
 * @property {boolean} isValid - Whether the plugin is valid
 * @property {Array<string>} errors - List of validation errors
 * @property {Array<string>} warnings - List of validation warnings
 * @property {string} version - Plugin version if valid
 * @property {Array<string>} dependencies - Plugin dependencies
 */