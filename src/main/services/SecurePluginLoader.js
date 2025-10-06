import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import SafeConsole from '../utils/SafeConsole.js';

/**
 * Secure plugin loader using Electron's context isolation
 * Plugins run in isolated renderer processes with limited API access
 */
export class SecurePluginLoader {
    constructor() {
        this.pluginWindows = new Map();
        this.pluginResults = new Map();
        this.setupIPC();
    }

    /**
     * Setup IPC handlers for plugin communication
     */
    setupIPC() {
        // Handle plugin registration requests
        ipcMain.handle('plugin:register-effect', async (event, data) => {
            const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
            SafeConsole.log(`📥 [SecurePluginLoader] Received effect registration from window ${windowId}:`, data.name);

            // Store registration data
            const results = this.pluginResults.get(windowId) || { effects: [], configs: [] };
            results.effects.push(data);
            this.pluginResults.set(windowId, results);

            return { success: true };
        });

        ipcMain.handle('plugin:register-config', async (event, data) => {
            const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
            SafeConsole.log(`📥 [SecurePluginLoader] Received config registration from window ${windowId}:`, data.name);

            // Store registration data
            const results = this.pluginResults.get(windowId) || { effects: [], configs: [] };
            results.configs.push(data);
            this.pluginResults.set(windowId, results);

            return { success: true };
        });

        ipcMain.handle('plugin:ready', async (event) => {
            const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
            SafeConsole.log(`✅ [SecurePluginLoader] Plugin window ${windowId} is ready`);
            return { success: true };
        });

        ipcMain.handle('plugin:error', async (event, error) => {
            const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
            SafeConsole.log(`❌ [SecurePluginLoader] Plugin window ${windowId} error:`, error);

            const results = this.pluginResults.get(windowId) || { effects: [], configs: [] };
            results.error = error;
            this.pluginResults.set(windowId, results);

            return { success: false };
        });
    }

    /**
     * Create plugin preload script
     */
    async createPluginPreload() {
        const preloadPath = path.join(app.getPath('userData'), 'plugin-preload.js');

        const preloadCode = `
const { contextBridge, ipcRenderer } = require('electron');

// Expose limited API to plugins
contextBridge.exposeInMainWorld('pluginAPI', {
    // Registration functions
    registerEffect: async (name, effectCode, category) => {
        return await ipcRenderer.invoke('plugin:register-effect', {
            name,
            effectCode: effectCode.toString(),
            category
        });
    },

    registerConfig: async (name, configCode) => {
        return await ipcRenderer.invoke('plugin:register-config', {
            name,
            configCode: configCode.toString()
        });
    },

    // Signal ready
    ready: async () => {
        return await ipcRenderer.invoke('plugin:ready');
    },

    // Report error
    error: async (message) => {
        return await ipcRenderer.invoke('plugin:error', message);
    },

    // Safe console
    console: {
        log: (...args) => console.log('[Plugin]', ...args),
        error: (...args) => console.error('[Plugin]', ...args),
        warn: (...args) => console.warn('[Plugin]', ...args)
    }
});
`;

        await fs.writeFile(preloadPath, preloadCode, 'utf8');
        return preloadPath;
    }

    /**
     * Load a plugin in an isolated context
     * @param {string} pluginPath - Path to plugin file
     * @returns {Promise<Object>} Plugin load result
     */
    async loadPlugin(pluginPath) {
        let pluginWindow = null;

        try {
            SafeConsole.log(`🔒 [SecurePluginLoader] Loading plugin in isolated context: ${pluginPath}`);
            SafeConsole.log(`🔒 [SecurePluginLoader] Plugin path exists: ${await fs.access(pluginPath).then(() => true).catch(() => false)}`);

            // Create preload script
            const preloadPath = await this.createPluginPreload();

            // Create hidden window for plugin execution
            pluginWindow = new BrowserWindow({
                width: 1,
                height: 1,
                show: false,
                webPreferences: {
                    preload: preloadPath,
                    contextIsolation: true,
                    nodeIntegration: false,
                    sandbox: true,
                    webSecurity: true
                }
            });

            const windowId = pluginWindow.id;
            this.pluginWindows.set(windowId, pluginWindow);

            // Read plugin code first
            const pluginCode = await fs.readFile(pluginPath, 'utf8');

            // Escape the plugin code for safe embedding
            const escapedPluginCode = pluginCode
                .replace(/\\/g, '\\\\')
                .replace(/`/g, '\\`')
                .replace(/\$/g, '\\$');

            // Load plugin HTML that will execute the plugin
            const pluginHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Plugin Sandbox</title>
</head>
<body>
    <script>
        (async function() {
            try {
                // Plugin code is embedded directly
                const pluginCode = \`${escapedPluginCode}\`;

                // Create a function from the plugin code
                const pluginFunction = new Function('registerEffect', 'registerConfig', 'console', pluginCode);

                // Execute with our safe API
                pluginFunction(
                    window.pluginAPI.registerEffect,
                    window.pluginAPI.registerConfig,
                    window.pluginAPI.console
                );

                // Signal success
                await window.pluginAPI.ready();
            } catch (error) {
                console.error('Plugin execution failed:', error);
                await window.pluginAPI.error(error.message);
            }
        })();
    </script>
</body>
</html>`;

            // Write temporary HTML file
            const htmlPath = path.join(app.getPath('userData'), `plugin-${Date.now()}.html`);
            await fs.writeFile(htmlPath, pluginHtml, 'utf8');

            // Load the HTML
            await pluginWindow.loadFile(htmlPath);

            // Wait for plugin to complete (with timeout)
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Plugin execution timeout'));
                }, 10000); // 10 second timeout

                const checkInterval = setInterval(() => {
                    const results = this.pluginResults.get(windowId);
                    if (results) {
                        clearInterval(checkInterval);
                        clearTimeout(timeout);
                        resolve(results);
                    }
                }, 100);
            });

            // Get results
            const results = this.pluginResults.get(windowId);

            // Clean up
            await fs.unlink(htmlPath).catch(() => {});
            this.pluginResults.delete(windowId);
            this.pluginWindows.delete(windowId);
            pluginWindow.destroy();

            SafeConsole.log(`✅ [SecurePluginLoader] Plugin loaded successfully:`, {
                effects: results?.effects?.length || 0,
                configs: results?.configs?.length || 0
            });

            return {
                success: !results?.error,
                effects: results?.effects || [],
                configs: results?.configs || [],
                error: results?.error
            };

        } catch (error) {
            SafeConsole.log(`❌ [SecurePluginLoader] Failed to load plugin: ${error.message}`);

            // Clean up on error
            if (pluginWindow) {
                const windowId = pluginWindow.id;
                this.pluginResults.delete(windowId);
                this.pluginWindows.delete(windowId);
                pluginWindow.destroy();
            }

            return {
                success: false,
                error: error.message,
                effects: [],
                configs: []
            };
        }
    }

    /**
     * Clean up all plugin windows
     */
    cleanup() {
        for (const [windowId, window] of this.pluginWindows) {
            window.destroy();
        }
        this.pluginWindows.clear();
        this.pluginResults.clear();
    }
}

export default SecurePluginLoader;