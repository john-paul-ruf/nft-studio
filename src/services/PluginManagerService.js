import path from 'path';
import fs from 'fs/promises';
import { PluginDownloadService } from './PluginDownloadService.js';

export class PluginManagerService {
    constructor(appDataPath, logger = null) {
        this.appDataPath = appDataPath;
        this.pluginsDir = path.join(appDataPath, 'plugins');
        this.pluginsConfigPath = path.join(appDataPath, 'plugins-config.json');
        this.loadedPlugins = new Map();
        this.pluginConfigs = [];
        this.downloadService = new PluginDownloadService(this.pluginsDir, logger);
    }

    async initialize() {
        try {
            await fs.mkdir(this.pluginsDir, { recursive: true });
            await this.loadPluginConfigs();
        } catch (error) {
            console.error('Failed to initialize plugin manager:', error);
        }
    }

    async loadPluginConfigs() {
        try {
            const configData = await fs.readFile(this.pluginsConfigPath, 'utf8');
            this.pluginConfigs = JSON.parse(configData);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Failed to load plugin configs:', error);
            }
            this.pluginConfigs = [];
        }
    }

    async savePluginConfigs() {
        try {
            await fs.writeFile(
                this.pluginsConfigPath,
                JSON.stringify(this.pluginConfigs, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Failed to save plugin configs:', error);
            throw error;
        }
    }

    async addPlugin(pluginData) {
        const { name, path: pluginPath, type, enabled = true } = pluginData;

        const existingIndex = this.pluginConfigs.findIndex(p => p.name === name);
        if (existingIndex >= 0) {
            this.pluginConfigs[existingIndex] = {
                ...this.pluginConfigs[existingIndex],
                ...pluginData,
                updatedAt: new Date().toISOString()
            };
        } else {
            this.pluginConfigs.push({
                name,
                path: pluginPath,
                type,
                enabled,
                addedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        await this.savePluginConfigs();
        return { success: true, message: 'Plugin added successfully' };
    }

    async removePlugin(name) {
        const index = this.pluginConfigs.findIndex(p => p.name === name);
        if (index >= 0) {
            const plugin = this.pluginConfigs[index];
            this.pluginConfigs.splice(index, 1);
            await this.savePluginConfigs();
            this.loadedPlugins.delete(name);
            return { success: true, message: 'Plugin removed successfully', plugin };
        }
        return { success: false, message: 'Plugin not found' };
    }

    async togglePlugin(name) {
        const plugin = this.pluginConfigs.find(p => p.name === name);
        if (plugin) {
            plugin.enabled = !plugin.enabled;
            plugin.updatedAt = new Date().toISOString();
            await this.savePluginConfigs();
            return { success: true, enabled: plugin.enabled };
        }
        return { success: false, message: 'Plugin not found' };
    }

    async getPlugins() {
        return this.pluginConfigs;
    }

    async getEnabledPlugins() {
        return this.pluginConfigs.filter(p => p.enabled);
    }

    async validatePlugin(pluginPath) {
        try {
            const fullPath = path.isAbsolute(pluginPath)
                ? pluginPath
                : path.join(this.pluginsDir, pluginPath);

            const stats = await fs.stat(fullPath);

            if (stats.isDirectory()) {
                // Try package.json first
                try {
                    const packageJsonPath = path.join(fullPath, 'package.json');
                    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

                    if (packageJson.main) {
                        const mainFile = path.join(fullPath, packageJson.main);
                        await fs.access(mainFile);

                        return {
                            valid: true,
                            info: {
                                name: packageJson.name,
                                version: packageJson.version,
                                description: packageJson.description,
                                author: packageJson.author,
                                main: packageJson.main
                            }
                        };
                    }
                } catch (error) {
                    // Continue to check for default plugin.js
                }

                // Check for default plugin.js
                const defaultPluginPath = path.join(fullPath, 'plugin.js');
                try {
                    await fs.access(defaultPluginPath);
                    return {
                        valid: true,
                        info: {
                            type: 'directory',
                            entryPoint: 'plugin.js',
                            path: fullPath
                        }
                    };
                } catch (error) {
                    return { valid: false, error: 'Plugin directory must have plugin.js or package.json with main entry point' };
                }
            } else if (stats.isFile() && pluginPath.endsWith('.js')) {
                return { valid: true, info: { type: 'single-file' } };
            }

            return { valid: false, error: 'Invalid plugin format' };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Install a plugin from npm registry
     * Works in both development and production environments
     * Downloads directly from npm registry without requiring npm CLI
     * @param {string} packageName - Package name to install
     * @param {Function} onProgress - Optional callback for progress updates (percentage, message)
     * @returns {Promise<Object>} Installation result
     */
    async installFromNpm(packageName, onProgress = null) {
        try {
            // Download and extract from npm registry
            const result = await this.downloadService.installPackage(packageName, onProgress);

            if (!result.success) {
                return { success: false, error: result.error };
            }

            // Add to plugin configuration
            await this.addPlugin({
                name: result.info.name || packageName,
                path: result.extractPath,
                type: 'npm',
                version: result.info.version,
                description: result.info.description,
                enabled: true
            });

            return {
                success: true,
                message: `Plugin ${packageName} installed successfully`,
                info: result.info
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Install multiple plugins from npm
     * Useful for batch operations
     * @param {Array<string>} packageNames - Array of package names
     * @param {Function} onProgress - Optional callback for overall progress
     * @returns {Promise<Array>} Array of installation results
     */
    async installMultipleFromNpm(packageNames, onProgress = null) {
        const results = [];
        const total = packageNames.length;

        for (let i = 0; i < total; i++) {
            const packageName = packageNames[i];
            const progress = Math.round((i / total) * 100);

            if (onProgress) {
                onProgress(progress, `Installing ${i + 1}/${total}: ${packageName}`);
            }

            const result = await this.installFromNpm(packageName);
            results.push({
                package: packageName,
                ...result
            });
        }

        return results;
    }

    /**
     * Resolve plugin entry point - handles both directory and file plugins
     * @private
     * @param {string} fullPath - Full path to plugin (directory or file)
     * @returns {Promise<string>} Resolved entry point path
     */
    async _resolvePluginEntryPoint(fullPath) {
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
            // For directories, try package.json main field first, then default to plugin.js
            try {
                const packageJsonPath = path.join(fullPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                
                if (packageJson.main) {
                    const mainFile = path.join(fullPath, packageJson.main);
                    await fs.access(mainFile);
                    return mainFile;
                }
            } catch (error) {
                // package.json doesn't exist or main field not found, continue to default
            }
            
            // Try default plugin.js
            const defaultPluginPath = path.join(fullPath, 'plugin.js');
            try {
                await fs.access(defaultPluginPath);
                return defaultPluginPath;
            } catch (error) {
                throw new Error(`Plugin directory ${fullPath} has no plugin.js and no package.json with main field`);
            }
        }
        
        // If it's a file, return as-is
        return fullPath;
    }

    async loadPluginsForGeneration() {
        const enabledPlugins = await this.getEnabledPlugins();
        const loadResults = [];

        for (const plugin of enabledPlugins) {
            try {
                const fullPath = path.isAbsolute(plugin.path)
                    ? plugin.path
                    : path.join(this.pluginsDir, plugin.path);

                // Resolve entry point for directory plugins
                const entryPoint = await this._resolvePluginEntryPoint(fullPath);

                loadResults.push({
                    name: plugin.name,
                    path: entryPoint,
                    success: true
                });
            } catch (error) {
                console.error(`Failed to prepare plugin ${plugin.name}:`, error);
                loadResults.push({
                    name: plugin.name,
                    path: plugin.path,
                    success: false,
                    error: error.message
                });
            }
        }

        // REMOVED: AUTO-DISCOVERY (moved to explicit initialization phase)
        // Plugins are now ONLY registered at:
        // 1. App startup via PluginLoaderOrchestrator.loadInstalledPlugins()
        // 2. User install via PluginHandlers IPC
        // This ensures the constraint: "plugins register ONLY at startup or when added through plugin manager"

        return loadResults;
    }

    /**
     * Get plugin by name
     * @param {string} name - Plugin name
     * @returns {Promise<Object|null>} Plugin data or null
     */
    async getPluginByName(name) {
        return this.pluginConfigs.find(p => p.name === name) || null;
    }

    /**
     * Get plugin metadata (extended info)
     * @param {string} name - Plugin name
     * @returns {Promise<Object|null>} Plugin metadata or null
     */
    async getPluginMetadata(name) {
        const plugin = await this.getPluginByName(name);
        if (!plugin) return null;

        try {
            const fullPath = path.isAbsolute(plugin.path)
                ? plugin.path
                : path.join(this.pluginsDir, plugin.path);

            const validation = await this.validatePlugin(fullPath);

            return {
                ...plugin,
                validation,
                fullPath
            };
        } catch (error) {
            return {
                ...plugin,
                validation: { valid: false, error: error.message }
            };
        }
    }
}