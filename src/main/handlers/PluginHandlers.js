import { ipcMain, dialog, app } from 'electron';
import path from 'path';
import { PluginManagerService } from '../../services/PluginManagerService.js';

/**
 * Handles plugin management IPC operations
 * Following SOLID principles for clean architecture
 */
class PluginHandlers {
    constructor() {
        const appDataPath = app.getPath('userData');
        this.pluginManager = new PluginManagerService(appDataPath);
        this.initialized = false;
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.pluginManager.initialize();
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
                return await this.pluginManager.installFromNpm(packageName);
            } catch (error) {
                console.error('Failed to install npm plugin:', error);
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

        console.log('✅ Plugin IPC handlers registered');
    }

    /**
     * Unregister all plugin-related IPC handlers
     */
    unregister() {
        const handlers = [
            'plugins:get-all',
            'plugins:get-enabled',
            'plugins:add',
            'plugins:remove',
            'plugins:toggle',
            'plugins:validate',
            'plugins:install-npm',
            'plugins:select-local',
            'plugins:get-for-generation'
        ];

        handlers.forEach(channel => {
            ipcMain.removeHandler(channel);
        });

        console.log('✅ Plugin IPC handlers unregistered');
    }
}

export default PluginHandlers;