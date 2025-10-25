import defaultLogger from '../main/utils/logger.js';
import asarModuleResolver from '../utils/AsarModuleResolver.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

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
        this.moduleResolver = asarModuleResolver;
        
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
            // Configure NODE_PATH for module resolution in production ASAR apps
            // This allows plugins to resolve bundled modules like my-nft-gen
            this.moduleResolver.configureNodePath();
            this.logger.info('[AsarModuleResolver] NODE_PATH configured for module resolution');
            
            // Log diagnostic information for troubleshooting
            const diagnostics = this.moduleResolver.getDiagnostics();
            this.logger.info('[AsarModuleResolver] Module resolver diagnostics:', diagnostics);
            
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
        this.logger.info('Current NODE_PATH:', process.env.NODE_PATH);
        const loadResults = [];

        try {
            // Dynamically load PluginLoader from my-nft-gen
            this.logger.info('Attempting to load PluginLoader from my-nft-gen...');
            const { PluginLoader } = await import('my-nft-gen/src/core/plugins/PluginLoader.js');
            this.logger.success('✅ PluginLoader loaded successfully');
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
            const diagnostics = this.moduleResolver.getDiagnostics();
            this.logger.error('Module resolution diagnostics:', diagnostics);
            throw new Error(`Plugin loading system unavailable: ${error.message}`);
        }

        return loadResults;
    }

    /**
     * Find the plugin root directory (where package.json lives)
     * @private
     * @param {string} entryPointPath - Path to the plugin entry point
     * @returns {Promise<string>} Path to plugin root directory
     */
    async _findPluginRoot(entryPointPath) {
        try {
            let currentDir = path.dirname(entryPointPath);
            
            // Walk up the directory tree looking for package.json
            for (let i = 0; i < 10; i++) {
                const packageJsonPath = path.join(currentDir, 'package.json');
                try {
                    await fs.access(packageJsonPath);
                    this.logger.debug(`Found plugin root at: ${currentDir}`);
                    return currentDir;
                } catch (error) {
                    // Continue searching
                }
                
                const parentDir = path.dirname(currentDir);
                if (parentDir === currentDir) {
                    // Reached filesystem root
                    break;
                }
                currentDir = parentDir;
            }
            
            // If no package.json found, use the entry point's directory
            this.logger.warn(`No package.json found for plugin, using entry point directory: ${path.dirname(entryPointPath)}`);
            return path.dirname(entryPointPath);
        } catch (error) {
            this.logger.warn(`Error finding plugin root: ${error.message}`);
            return path.dirname(entryPointPath);
        }
    }

    /**
     * Set up node_modules symlinks for a plugin
     * This allows plugins to access app dependencies like 'sharp'
     * @private
     * @param {string} pluginRootDir - Root directory of the plugin
     * @returns {Promise<void>}
     */
    async _setupPluginNodeModules(pluginRootDir) {
        try {
            const pluginNodeModules = path.join(pluginRootDir, 'node_modules');
            
            this.logger.info(`[SetupPluginNodeModules] Plugin root: ${pluginRootDir}`);
            this.logger.info(`[SetupPluginNodeModules] Target node_modules: ${pluginNodeModules}`);
            
            // Check if node_modules already exists
            const stats = await fs.lstat(pluginNodeModules).catch(() => null);
            if (stats && stats.isDirectory()) {
                this.logger.info(`[SetupPluginNodeModules] Plugin already has node_modules directory: ${pluginNodeModules}`);
                // Don't try to set up symlinks if it already exists to avoid conflicts
                return;
            }
            
            this.logger.info(`[SetupPluginNodeModules] Setting up node_modules for plugin: ${pluginRootDir}`);
            
            // Create node_modules directory
            await fs.mkdir(pluginNodeModules, { recursive: true });
            this.logger.info(`[SetupPluginNodeModules] Created node_modules directory: ${pluginNodeModules}`);
            
            // Get the app's node_modules path
            const appNodeModules = this.moduleResolver.getNodeModulesPath();
            this.logger.info(`[SetupPluginNodeModules] App node_modules path: ${appNodeModules}`);
            
            if (!appNodeModules || !fsSync.existsSync(appNodeModules)) {
                this.logger.warn(`[SetupPluginNodeModules] Could not locate app node_modules at ${appNodeModules}, skipping symlink setup`);
                return;
            }
            
            // Symlink my-nft-gen with nested dependencies
            try {
                const appMyNftGen = path.join(appNodeModules, 'my-nft-gen');
                const appStats = await fs.lstat(appMyNftGen).catch(() => null);
                
                this.logger.info(`[SetupPluginNodeModules] App my-nft-gen path: ${appMyNftGen}`);
                this.logger.info(`[SetupPluginNodeModules] App my-nft-gen exists: ${!!appStats}`);
                
                if (appStats) {
                    const pluginMyNftGen = path.join(pluginNodeModules, 'my-nft-gen');
                    
                    // Create directory and symlink my-nft-gen's files
                    await fs.mkdir(pluginMyNftGen, { recursive: true });
                    
                    // Symlink all files and directories from app's my-nft-gen
                    try {
                        const entries = await fs.readdir(appMyNftGen, { withFileTypes: true });
                        this.logger.info(`[SetupPluginNodeModules] Found ${entries.length} entries in my-nft-gen`);
                        
                        for (const entry of entries) {
                            if (entry.name === 'package.json' || entry.name.startsWith('.')) {
                                continue;
                            }
                            
                            const appFile = path.join(appMyNftGen, entry.name);
                            const pluginFile = path.join(pluginMyNftGen, entry.name);
                            
                            const pluginExists = await fs.lstat(pluginFile).catch(() => null);
                            if (!pluginExists) {
                                await fs.symlink(appFile, pluginFile, entry.isDirectory() ? 'dir' : 'file');
                            }
                        }
                        
                        this.logger.info(`[SetupPluginNodeModules] ✅ Symlinked my-nft-gen to plugin`);
                    } catch (error) {
                        this.logger.warn(`[SetupPluginNodeModules] Error symlinking my-nft-gen contents: ${error.message}`);
                    }
                    
                    // Symlink my-nft-gen's nested node_modules (especially important for 'sharp')
                    try {
                        const myNftGenNodeModules = path.join(appMyNftGen, 'node_modules');
                        const myNftGenStats = await fs.lstat(myNftGenNodeModules).catch(() => null);
                        
                        this.logger.info(`[SetupPluginNodeModules] my-nft-gen node_modules path: ${myNftGenNodeModules}`);
                        this.logger.info(`[SetupPluginNodeModules] my-nft-gen node_modules exists: ${!!myNftGenStats}`);
                        
                        if (myNftGenStats && myNftGenStats.isDirectory()) {
                            const nestedPackages = await fs.readdir(myNftGenNodeModules);
                            this.logger.info(`[SetupPluginNodeModules] Found ${nestedPackages.length} nested packages in my-nft-gen (including sharp)`);
                            
                            for (const pkg of nestedPackages) {
                                if (pkg.startsWith('.')) continue;
                                
                                const appNestedPkg = path.join(myNftGenNodeModules, pkg);
                                const pluginNestedPkg = path.join(pluginNodeModules, pkg);
                                
                                const exists = await fs.lstat(pluginNestedPkg).catch(() => null);
                                if (!exists) {
                                    const isDir = (await fs.lstat(appNestedPkg)).isDirectory();
                                    await fs.symlink(appNestedPkg, pluginNestedPkg, isDir ? 'dir' : 'file');
                                    this.logger.debug(`[SetupPluginNodeModules] Symlinked: ${pkg}`);
                                }
                            }
                            
                            this.logger.info(`[SetupPluginNodeModules] ✅ Symlinked my-nft-gen's nested dependencies (including sharp)`);
                        }
                    } catch (error) {
                        this.logger.warn(`[SetupPluginNodeModules] Error symlinking my-nft-gen nested dependencies: ${error.message}`);
                    }
                }
            } catch (error) {
                this.logger.warn(`[SetupPluginNodeModules] Error setting up my-nft-gen symlinks: ${error.message}`);
            }
            
            // Symlink other app packages to plugin's node_modules
            try {
                const appPackages = await fs.readdir(appNodeModules);
                this.logger.info(`[SetupPluginNodeModules] Found ${appPackages.length} packages in app node_modules`);
                
                let symlinkedCount = 0;
                for (const pkg of appPackages) {
                    if (pkg === 'my-nft-gen' || pkg.startsWith('.')) continue;
                    
                    const appPkg = path.join(appNodeModules, pkg);
                    const pluginPkg = path.join(pluginNodeModules, pkg);
                    
                    const appPkgStats = await fs.lstat(appPkg).catch(() => null);
                    const pluginPkgStats = await fs.lstat(pluginPkg).catch(() => null);
                    
                    if (appPkgStats && !pluginPkgStats) {
                        await fs.symlink(appPkg, pluginPkg, appPkgStats.isDirectory() ? 'dir' : 'file');
                        symlinkedCount++;
                        if (pkg === 'sharp') {
                            this.logger.info(`[SetupPluginNodeModules] ✅ Symlinked 'sharp' to plugin`);
                        }
                    }
                }
                
                this.logger.info(`[SetupPluginNodeModules] Symlinked ${symlinkedCount} app packages to plugin`);
            } catch (error) {
                this.logger.warn(`[SetupPluginNodeModules] Error symlinking app packages: ${error.message}`);
            }
            
            this.logger.info(`✅ Plugin node_modules setup complete: ${pluginNodeModules}`);
        } catch (error) {
            this.logger.error(`Failed to setup plugin node_modules: ${error.message}`);
            // Don't throw - allow plugin to load anyway, may still work with NODE_PATH
        }
    }

    /**
     * Fix broken imports in plugin files
     * Converts relative my-nft-gen paths to proper npm package imports
     * @private
     * @param {string} filePath - Path to the file to fix
     * @returns {Promise<string>} Path to fixed file (original if no fixes needed)
     */
    async _fixPluginImports(filePath) {
        try {
            // Read the file content
            let content = await fs.readFile(filePath, 'utf8');
            const originalContent = content;
            
            // Fix relative my-nft-gen imports
            // Pattern: from "......./my-nft-gen/..." -> from "my-nft-gen/..."
            // This handles cases like: "../../../../../my-nft-gen/src/..."
            content = content.replace(
                /from\s+["']\.\.\/+.*?\/my-nft-gen\/([^"']+)["']/g,
                'from "my-nft-gen/$1"'
            );
            
            // If content changed, write to a temp file and return that path
            if (content !== originalContent) {
                this.logger.info(`Fixed broken imports in plugin: ${filePath}`);
                
                // Create a temp file with the fixed content
                const dir = path.dirname(filePath);
                const ext = path.extname(filePath);
                const base = path.basename(filePath, ext);
                const tempPath = path.join(dir, `.${base}.fixed${ext}`);
                
                await fs.writeFile(tempPath, content, 'utf8');
                this.logger.debug(`Created temporary fixed plugin file: ${tempPath}`);
                
                // Store temp path for cleanup later
                if (!this.tempPluginFiles) {
                    this.tempPluginFiles = [];
                }
                this.tempPluginFiles.push(tempPath);
                
                return tempPath;
            }
            
            return filePath;
        } catch (error) {
            this.logger.warn(`Failed to fix plugin imports, continuing with original: ${error.message}`);
            // Return original path on error - plugin may still load
            return filePath;
        }
    }

    /**
     * Resolve plugin entry point if path is a directory
     * @private
     * @param {string} pluginPath - Plugin path (may be directory or file)
     * @returns {Promise<string>} Resolved entry point path
     */
    async _resolvePluginPath(pluginPath) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            
            const stats = await fs.stat(pluginPath);
            
            if (stats.isDirectory()) {
                this.logger.warn(`Plugin path is a directory, attempting to resolve entry point: ${pluginPath}`);
                
                // Try package.json main field first
                try {
                    const packageJsonPath = path.join(pluginPath, 'package.json');
                    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                    
                    if (packageJson.main) {
                        const mainFile = path.join(pluginPath, packageJson.main);
                        await fs.access(mainFile);
                        this.logger.info(`Resolved plugin via package.json main: ${mainFile}`);
                        return mainFile;
                    }
                } catch (error) {
                    // Continue to default
                }
                
                // Try default plugin.js
                const defaultPluginPath = path.join(pluginPath, 'plugin.js');
                try {
                    await fs.access(defaultPluginPath);
                    this.logger.info(`Resolved plugin to default plugin.js: ${defaultPluginPath}`);
                    return defaultPluginPath;
                } catch (error) {
                    throw new Error(`Cannot resolve plugin entry point from directory ${pluginPath}: no plugin.js or package.json with main field`);
                }
            }
            
            return pluginPath;
        } catch (error) {
            this.logger.error(`Failed to resolve plugin path ${pluginPath}:`, error);
            throw error;
        }
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
            // Resolve entry point if path is a directory
            let resolvedPath = await this._resolvePluginPath(pluginInfo.path);
            this.logger.info(`[LoadSinglePlugin] Resolved path: ${resolvedPath}`);
            
            // Find the plugin root directory
            const pluginRootDir = await this._findPluginRoot(resolvedPath);
            this.logger.info(`[LoadSinglePlugin] Found plugin root: ${pluginRootDir}`);
            
            // Set up node_modules symlinks before loading the plugin
            // This allows the plugin to access app dependencies like 'sharp'
            this.logger.info(`[LoadSinglePlugin] Setting up node_modules symlinks...`);
            await this._setupPluginNodeModules(pluginRootDir);
            
            // Fix any broken imports in the plugin
            resolvedPath = await this._fixPluginImports(resolvedPath);
            
            await PluginLoader.loadPlugin(resolvedPath);
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
            
            // If this looks like a module resolution error, provide diagnostic info
            if (error.message && error.message.includes('Cannot find package')) {
                this.logger.error('Module resolution failed. Diagnostics:', this.moduleResolver.getDiagnostics());
            }
            
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
        // Clean up temporary fixed plugin files
        if (this.tempPluginFiles && this.tempPluginFiles.length > 0) {
            try {
                const fs = await import('fs/promises');
                for (const tempPath of this.tempPluginFiles) {
                    try {
                        await fs.unlink(tempPath);
                        this.logger.debug(`Cleaned up temporary plugin file: ${tempPath}`);
                    } catch (error) {
                        this.logger.warn(`Failed to clean up temp file ${tempPath}:`, error.message);
                    }
                }
                this.tempPluginFiles = [];
            } catch (error) {
                this.logger.warn('Failed to clean up temporary plugin files:', error.message);
            }
        }
        
        this.loadedPlugins.clear();
        this.initialized = false;
        this.logger.info('All plugins unloaded');
        
        // Emit event if event bus is available
        if (this.eventBus) {
            this.eventBus.emit('plugins:unloaded');
        }
    }
}