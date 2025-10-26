import { ipcMain, dialog, app } from 'electron';
import path from 'path';
import { PluginManagerService } from '../../services/PluginManagerService.js';

/**
 * Handles plugin management IPC operations
 *
 * Refactored in Phase 4 to use PluginLoaderOrchestrator for lifecycle operations.
 * The orchestrator provides unified install, uninstall, reload, and cleanup operations.
 *
 * Following SOLID principles for clean architecture
 */
class PluginHandlers {
    constructor(applicationFactory = null) {
        const appDataPath = app.getPath('userData');
        this.pluginManager = new PluginManagerService(appDataPath);
        this.applicationFactory = applicationFactory;
        this.orchestrator = null;
        this.initialized = false;
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.pluginManager.initialize();

            // Initialize orchestrator if factory is available
            if (this.applicationFactory && !this.orchestrator) {
                this.orchestrator = this.applicationFactory.getPluginLoaderOrchestrator();
                await this.orchestrator.initialize();
            }

            this.initialized = true;
        }
    }

    /**
     * Register all plugin-related IPC handlers
     */
    register() {
        ipcMain.handle('plugins:get-all', async () => {
            try {
                await this.ensureInitialized();
                const plugins = await this.pluginManager.getPlugins();
                return { success: true, plugins };
            } catch (error) {
                console.error('Failed to get plugins:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:get-enabled', async () => {
            try {
                await this.ensureInitialized();
                const plugins = await this.pluginManager.getEnabledPlugins();
                return { success: true, plugins };
            } catch (error) {
                console.error('Failed to get enabled plugins:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:add', async (event, pluginData) => {
            try {
                await this.ensureInitialized();
                return await this.pluginManager.addPlugin(pluginData);
            } catch (error) {
                console.error('Failed to add plugin:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:remove', async (event, pluginName) => {
            try {
                await this.ensureInitialized();
                return await this.pluginManager.removePlugin(pluginName);
            } catch (error) {
                console.error('Failed to remove plugin:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:toggle', async (event, pluginName) => {
            try {
                await this.ensureInitialized();
                return await this.pluginManager.togglePlugin(pluginName);
            } catch (error) {
                console.error('Failed to toggle plugin:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:validate', async (event, pluginPath) => {
            try {
                await this.ensureInitialized();
                return await this.pluginManager.validatePlugin(pluginPath);
            } catch (error) {
                console.error('Failed to validate plugin:', error);
                return { valid: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:install-npm', async (event, packageName) => {
            try {
                await this.ensureInitialized();
                
                if (!this.orchestrator) {
                    return { success: false, error: 'Orchestrator not available' };
                }
                
                // Create progress callback that sends updates back to renderer
                const progressCallback = (progress) => {
                    try {
                        // Send both events for compatibility
                        // plugins:install-progress for dialog progress bar
                        event.sender.send('plugins:install-progress', {
                            packageName,
                            ...progress
                        });
                        
                        // plugins:operation-progress for global full-screen overlay
                        event.sender.send('plugins:operation-progress', {
                            operation: 'install',
                            plugin: packageName,
                            ...progress
                        });
                    } catch (err) {
                        console.error('Failed to send progress update:', err);
                    }
                };
                
                // Use the full orchestration flow that downloads, processes, and registers
                const result = await this.orchestrator.installAndLoadPlugin(
                    {
                        name: packageName,
                        path: packageName,
                        type: 'npm'
                    },
                    progressCallback
                );
                
                console.log('🔧 PluginHandlers: Orchestrator npm install returned:', { success: result.success, pluginName: result.plugin?.name, error: result.error });
                
                // Emit plugin installation completion event
                if (result.success) {
                    try {
                        // CRITICAL: Reload plugin configs to sync with orchestrator's changes
                        // The orchestrator has its own PluginManagerService instance that just added a plugin to disk
                        // We need to reload our in-memory cache to stay in sync
                        await this.pluginManager.loadPluginConfigs();
                        console.log('🔄 PluginHandlers: Reloaded plugin configs after successful installation');
                        
                        console.log('🔌 PluginHandlers: Sending plugins:operation-complete event for npm plugin:', result.plugin?.name || packageName);
                        event.sender.send('plugins:operation-complete', {
                            operation: 'install',
                            success: true,
                            plugin: result.plugin?.name || packageName,
                            effects: result.plugin?.effects || []
                        });
                        console.log('✅ PluginHandlers: plugins:operation-complete event sent successfully');
                        // Small delay to ensure event is sent before returning
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (err) {
                        console.error('❌ Failed to send plugin complete event:', err);
                    }
                } else {
                    console.log('⚠️ PluginHandlers npm: Installation failed, not sending completion event. Error:', result.error);
                }
                
                return result;
            } catch (error) {
                console.error('❌ Failed to install npm plugin - outer catch:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:select-local', async () => {
            try {
                const result = await dialog.showOpenDialog({
                    title: 'Select Plugin',
                    properties: ['openFile', 'openDirectory'],
                    filters: [
                        { name: 'JavaScript', extensions: ['js', 'mjs'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (result.canceled || !result.filePaths[0]) {
                    return { success: false, canceled: true };
                }

                const pluginPath = result.filePaths[0];
                await this.ensureInitialized();
                const validation = await this.pluginManager.validatePlugin(pluginPath);

                if (!validation.valid) {
                    return { success: false, error: validation.error };
                }

                return {
                    success: true,
                    path: pluginPath,
                    info: validation.info
                };
            } catch (error) {
                console.error('Failed to select local plugin:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:get-for-generation', async () => {
            try {
                await this.ensureInitialized();
                // NOTE: This returns CONFIGURED plugins only, no auto-discovery
                // Plugins are registered ONLY at:
                // 1. App startup via PluginLoaderOrchestrator.loadInstalledPlugins()
                // 2. User install via plugins:install-and-load IPC handler
                const loadResults = await this.pluginManager.loadPluginsForGeneration();
                return { success: true, plugins: loadResults };
            } catch (error) {
                console.error('Failed to get plugins for generation:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:get-debug-log-path', async () => {
            try {
                const fileLogger = require('../utils/FileLogger');
                const logPath = fileLogger.getLogPath();
                return { success: true, logPath };
            } catch (error) {
                console.error('Failed to get debug log path:', error);
                return { success: false, error: error.message };
            }
        });

        // ==================== ORCHESTRATOR HANDLERS (Phase 4) ====================

        ipcMain.handle('plugins:install-and-load', async (event, pluginData) => {
            try {
                await this.ensureInitialized();

                if (!this.orchestrator) {
                    return { success: false, error: 'Orchestrator not available' };
                }

                // Create progress callback
                const progressCallback = (progress) => {
                    try {
                        event.sender.send('plugins:operation-progress', {
                            operation: 'install',
                            plugin: pluginData.name,
                            ...progress
                        });
                    } catch (err) {
                        console.error('Failed to send progress:', err);
                    }
                };

                const result = await this.orchestrator.installAndLoadPlugin(pluginData, progressCallback);
                
                console.log('🔧 PluginHandlers: Orchestrator local install returned:', { success: result.success, pluginName: result.plugin?.name, error: result.error });
                
                // Emit plugin installation completion event
                if (result.success) {
                    try {
                        // CRITICAL: Reload plugin configs to sync with orchestrator's changes
                        // The orchestrator has its own PluginManagerService instance that just added a plugin to disk
                        // We need to reload our in-memory cache to stay in sync
                        await this.pluginManager.loadPluginConfigs();
                        console.log('🔄 PluginHandlers: Reloaded plugin configs after successful installation');
                        
                        console.log('🔌 PluginHandlers: Sending plugins:operation-complete event for local plugin:', result.plugin?.name || pluginData.name);
                        event.sender.send('plugins:operation-complete', {
                            operation: 'install',
                            success: true,
                            plugin: result.plugin?.name || pluginData.name,
                            effects: result.plugin?.effects || []
                        });
                        console.log('✅ PluginHandlers: plugins:operation-complete event sent successfully');
                        // Small delay to ensure event is sent before returning
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (err) {
                        console.error('❌ Failed to send plugin complete event:', err);
                    }
                } else {
                    console.log('⚠️ PluginHandlers local: Installation failed, not sending completion event. Error:', result.error);
                }
                
                return result;
            } catch (error) {
                console.error('❌ Failed to install and load plugin - outer catch:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:uninstall', async (event, pluginName, options = {}) => {
            try {
                await this.ensureInitialized();

                if (!this.orchestrator) {
                    return { success: false, error: 'Orchestrator not available' };
                }

                // Create progress callback
                const progressCallback = (progress) => {
                    try {
                        event.sender.send('plugins:operation-progress', {
                            operation: 'uninstall',
                            plugin: pluginName,
                            ...progress
                        });
                    } catch (err) {
                        console.error('Failed to send progress:', err);
                    }
                };

                const result = await this.orchestrator.uninstallPlugin(pluginName, options, progressCallback);
                
                // Reload plugin configs and emit completion event on success
                if (result.success) {
                    try {
                        await this.pluginManager.loadPluginConfigs();
                        console.log('🔄 PluginHandlers: Reloaded plugin configs after successful uninstallation');
                        
                        event.sender.send('plugins:operation-complete', {
                            operation: 'uninstall',
                            success: true,
                            plugin: pluginName
                        });
                    } catch (err) {
                        console.error('❌ Failed to send uninstall complete event:', err);
                    }
                }
                
                return result;
            } catch (error) {
                console.error('Failed to uninstall plugin:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:reload', async (event, pluginName) => {
            try {
                await this.ensureInitialized();

                if (!this.orchestrator) {
                    return { success: false, error: 'Orchestrator not available' };
                }

                // Create progress callback
                const progressCallback = (progress) => {
                    try {
                        event.sender.send('plugins:operation-progress', {
                            operation: 'reload',
                            plugin: pluginName,
                            ...progress
                        });
                    } catch (err) {
                        console.error('Failed to send progress:', err);
                    }
                };

                const result = await this.orchestrator.reloadPlugin(pluginName, progressCallback);
                
                // Reload plugin configs and emit completion event on success
                if (result.success) {
                    try {
                        await this.pluginManager.loadPluginConfigs();
                        console.log('🔄 PluginHandlers: Reloaded plugin configs after successful reload');
                        
                        event.sender.send('plugins:operation-complete', {
                            operation: 'reload',
                            success: true,
                            plugin: pluginName
                        });
                    } catch (err) {
                        console.error('❌ Failed to send reload complete event:', err);
                    }
                }
                
                return result;
            } catch (error) {
                console.error('Failed to reload plugin:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:cleanup-orphaned', async () => {
            try {
                await this.ensureInitialized();

                if (!this.orchestrator) {
                    return { success: false, error: 'Orchestrator not available' };
                }

                const result = await this.orchestrator.cleanupOrphanedResources();
                return result;
            } catch (error) {
                console.error('Failed to cleanup orphaned resources:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('plugins:load-installed', async (event) => {
            try {
                await this.ensureInitialized();

                if (!this.orchestrator) {
                    return { success: false, error: 'Orchestrator not available' };
                }

                // Create progress callback
                const progressCallback = (progress) => {
                    try {
                        event.sender.send('plugins:operation-progress', {
                            operation: 'bulk-load',
                            ...progress
                        });
                    } catch (err) {
                        console.error('Failed to send progress:', err);
                    }
                };

                const result = await this.orchestrator.loadInstalledPlugins(progressCallback);
                return result;
            } catch (error) {
                console.error('Failed to load installed plugins:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('✅ Plugin IPC handlers registered (with orchestrator support)');
    }

    /**
     * Unregister all plugin-related IPC handlers
     */
    unregister() {
        const handlers = [
            // Legacy handlers
            'plugins:get-all',
            'plugins:get-enabled',
            'plugins:add',
            'plugins:remove',
            'plugins:toggle',
            'plugins:validate',
            'plugins:install-npm',
            'plugins:select-local',
            'plugins:get-for-generation',
            'plugins:get-debug-log-path',
            // Orchestrator handlers (Phase 4)
            'plugins:install-and-load',
            'plugins:uninstall',
            'plugins:reload',
            'plugins:cleanup-orphaned',
            'plugins:load-installed'
        ];

        handlers.forEach(channel => {
            ipcMain.removeHandler(channel);
        });

        console.log('✅ Plugin IPC handlers unregistered');
    }
}

export default PluginHandlers;