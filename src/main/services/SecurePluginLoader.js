import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import SafeConsole from '../utils/SafeConsole.js';

// Static flag to track if IPC handlers have been registered
let ipcHandlersRegistered = false;

// Static maps to share data across all instances
const globalPluginResults = new Map();

/**
 * Secure plugin loader using Electron's context isolation
 * Plugins run in isolated renderer processes with limited API access
 */
export class SecurePluginLoader {
    constructor() {
        this.pluginWindows = new Map();
        this.pluginResults = globalPluginResults; // Use shared map
        this.setupIPC();
    }

    /**
     * Setup IPC handlers for plugin communication (only once)
     */
    setupIPC() {
        // Only register handlers once to avoid "second handler" error
        if (ipcHandlersRegistered) {
            SafeConsole.log('🔒 [SecurePluginLoader] IPC handlers already registered, skipping');
            return;
        }

        SafeConsole.log('🔒 [SecurePluginLoader] Registering IPC handlers');

        // Handle plugin registration requests
        ipcMain.handle('plugin:register-effect', async (event, data) => {
            const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
            SafeConsole.log(`📥 [SecurePluginLoader] Received effect registration from window ${windowId}:`, data.name);

            // Store registration data
            const results = globalPluginResults.get(windowId) || { effects: [], configs: [] };
            results.effects.push(data);
            globalPluginResults.set(windowId, results);

            return { success: true };
        });

        ipcMain.handle('plugin:register-config', async (event, data) => {
            const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
            SafeConsole.log(`📥 [SecurePluginLoader] Received config registration from window ${windowId}:`, data.name);

            // Store registration data
            const results = globalPluginResults.get(windowId) || { effects: [], configs: [] };
            results.configs.push(data);
            globalPluginResults.set(windowId, results);

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

            const results = globalPluginResults.get(windowId) || { effects: [], configs: [] };
            results.error = error;
            globalPluginResults.set(windowId, results);

            return { success: false };
        });

        ipcHandlersRegistered = true;
        SafeConsole.log('✅ [SecurePluginLoader] IPC handlers registered successfully');
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
     * Detect if plugin code uses ES module syntax
     * @param {string} code - Plugin code
     * @returns {boolean} True if ES module
     */
    isESModule(code) {
        // Check for ES module patterns
        const esModulePatterns = [
            /^\s*export\s+/m,
            /^\s*import\s+/m,
            /^\s*export\s+default\s+/m,
            /^\s*export\s+\{/m
        ];
        
        return esModulePatterns.some(pattern => pattern.test(code));
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
            
            // Detect if this is an ES module
            const isESModule = this.isESModule(pluginCode);
            SafeConsole.log(`🔒 [SecurePluginLoader] Plugin type: ${isESModule ? 'ES Module' : 'CommonJS/Plain'}`);

            let pluginHtml;
            
            if (isESModule) {
                // For ES modules, we need to write the plugin as a separate file and import it
                const pluginModulePath = path.join(app.getPath('userData'), `plugin-module-${Date.now()}.js`);
                
                SafeConsole.log(`🔒 [SecurePluginLoader] Transforming ES module plugin code`);
                
                try {
                    // Transform the plugin code to work with our API
                    // More robust transformation that preserves the full declaration
                    let transformedCode = pluginCode;
                    
                    // Handle export default (must be done first to avoid conflicts)
                    transformedCode = transformedCode.replace(/export\s+default\s+/g, 'window.__pluginExport = ');
                    
                    // Handle export { ... } (named exports)
                    transformedCode = transformedCode.replace(/export\s+\{([^}]+)\}/g, (match, exports) => {
                        const exportNames = exports.split(',').map(e => e.trim().split(/\s+as\s+/)[0]);
                        return `window.__pluginExports = { ${exportNames.join(', ')} };`;
                    });
                    
                    // Handle export const/let/var declarations
                    // This regex matches: export const/let/var NAME = VALUE;
                    // It captures everything up to the semicolon or newline
                    transformedCode = transformedCode.replace(
                        /export\s+((?:const|let|var)\s+(\w+)\s*=\s*[^;\n]+[;\n]?)/gm,
                        (match, declaration, name) => {
                            SafeConsole.log(`🔒 [SecurePluginLoader] Transformed variable export: ${name}`);
                            // Ensure declaration ends with semicolon
                            const cleanDeclaration = declaration.trim().endsWith(';') ? declaration : declaration.trim() + ';';
                            return `${cleanDeclaration}\nwindow.__pluginExport_${name} = ${name};`;
                        }
                    );
                    
                    // Handle export async function declarations
                    transformedCode = transformedCode.replace(
                        /export\s+(async\s+function\s+(\w+)\s*\([^)]*\)\s*\{)/g,
                        (match, declaration, name) => {
                            SafeConsole.log(`🔒 [SecurePluginLoader] Transformed async function export: ${name}`);
                            return declaration;
                        }
                    );
                    
                    // Handle export function declarations
                    transformedCode = transformedCode.replace(
                        /export\s+(function\s+(\w+)\s*\([^)]*\)\s*\{)/g,
                        (match, declaration, name) => {
                            SafeConsole.log(`🔒 [SecurePluginLoader] Transformed function export: ${name}`);
                            return declaration;
                        }
                    );
                    
                    // Handle export class declarations
                    transformedCode = transformedCode.replace(
                        /export\s+(class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{)/g,
                        (match, declaration, name) => {
                            SafeConsole.log(`🔒 [SecurePluginLoader] Transformed class export: ${name}`);
                            return declaration;
                        }
                    );
                    
                    // After all transformations, add window assignments for functions and classes
                    // This is done separately to avoid complex regex for matching full function/class bodies
                    const functionMatches = transformedCode.matchAll(/(?:async\s+)?function\s+(\w+)\s*\(/g);
                    for (const match of functionMatches) {
                        const funcName = match[1];
                        if (!transformedCode.includes(`window.__pluginExport_${funcName}`)) {
                            // Find the end of the function and add the assignment
                            transformedCode += `\nwindow.__pluginExport_${funcName} = ${funcName};`;
                            SafeConsole.log(`🔒 [SecurePluginLoader] Added window assignment for function: ${funcName}`);
                        }
                    }
                    
                    const classMatches = transformedCode.matchAll(/class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g);
                    for (const match of classMatches) {
                        const className = match[1];
                        if (!transformedCode.includes(`window.__pluginExport_${className}`)) {
                            transformedCode += `\nwindow.__pluginExport_${className} = ${className};`;
                            SafeConsole.log(`🔒 [SecurePluginLoader] Added window assignment for class: ${className}`);
                        }
                    }
                    
                    // Note: We skip syntax validation here because the transformed code
                    // will be executed as an ES module (with <script type="module">),
                    // which supports features like import.meta that would fail in new Function().
                    // Any syntax errors will be caught during actual execution in the sandbox.
                    SafeConsole.log(`✅ [SecurePluginLoader] Code transformation complete (validation deferred to module execution)`);
                    
                    SafeConsole.log(`🔒 [SecurePluginLoader] Writing transformed code to: ${pluginModulePath}`);
                    await fs.writeFile(pluginModulePath, transformedCode, 'utf8');
                    SafeConsole.log(`🔒 [SecurePluginLoader] Transformed code written successfully`);
                } catch (transformError) {
                    SafeConsole.log(`❌ [SecurePluginLoader] Failed to transform plugin code: ${transformError.message}`);
                    throw new Error(`Plugin transformation failed: ${transformError.message}`);
                }
                
                // Create HTML that loads the ES module
                pluginHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Plugin Sandbox</title>
</head>
<body>
    <script type="module">
        (async function() {
            try {
                window.pluginAPI.console.log('Loading plugin module from: ${pluginModulePath}');
                
                // Import the plugin module
                const pluginModule = await import('file://${pluginModulePath}');
                
                window.pluginAPI.console.log('Plugin module imported successfully');
                window.pluginAPI.console.log('Plugin exports:', Object.keys(pluginModule));
                
                // Check if this is a my-nft-gen style plugin with a register() function
                if (pluginModule.register && typeof pluginModule.register === 'function') {
                    window.pluginAPI.console.log('Detected my-nft-gen plugin with register() function');
                    
                    // Create mock EffectRegistry and PositionRegistry to capture registrations
                    const mockEffectRegistry = {
                        registerGlobal: (effectClass, category, metadata) => {
                            window.pluginAPI.console.log('Mock EffectRegistry.registerGlobal called:', {
                                name: effectClass._name_ || effectClass.name,
                                category: category,
                                metadata: metadata
                            });
                            
                            // Register the effect via our API
                            window.pluginAPI.registerEffect(
                                effectClass._name_ || effectClass.name,
                                effectClass.toString(),
                                category
                            );
                        },
                        hasGlobal: (name) => {
                            window.pluginAPI.console.log('Mock EffectRegistry.hasGlobal called:', name);
                            return false; // Always return false to allow registration
                        },
                        getByCategoryGlobal: (category) => {
                            window.pluginAPI.console.log('Mock EffectRegistry.getByCategoryGlobal called:', category);
                            return {}; // Return empty object
                        }
                    };
                    
                    const mockPositionRegistry = {
                        register: (name, positionClass) => {
                            window.pluginAPI.console.log('Mock PositionRegistry.register called:', name);
                        }
                    };
                    
                    // Call the register function with mock registries
                    window.pluginAPI.console.log('Calling plugin register() function...');
                    await pluginModule.register(mockEffectRegistry, mockPositionRegistry);
                    window.pluginAPI.console.log('Plugin register() function completed successfully');
                } else {
                    // Fallback to old behavior for non-my-nft-gen plugins
                    window.pluginAPI.console.log('Not a my-nft-gen plugin, checking for other export patterns');
                    
                    // Give the module time to execute
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Check for exported plugin registration
                    if (window.__pluginExport) {
                        window.pluginAPI.console.log('Found default export');
                        // Handle default export
                        if (typeof window.__pluginExport === 'function') {
                            window.pluginAPI.console.log('Calling default export function');
                            await window.__pluginExport(
                                window.pluginAPI.registerEffect,
                                window.pluginAPI.registerConfig,
                                window.pluginAPI.console
                            );
                        }
                    }
                    
                    // Handle named exports
                    let exportCount = 0;
                    for (const key in window) {
                        if (key.startsWith('__pluginExport_')) {
                            const exportName = key.replace('__pluginExport_', '');
                            window.pluginAPI.console.log('Found named export:', exportName);
                            exportCount++;
                        }
                    }
                    
                    window.pluginAPI.console.log('Plugin loaded with ' + exportCount + ' named exports');
                }
                
                // Signal success
                await window.pluginAPI.ready();
            } catch (error) {
                console.error('Plugin execution failed:', error);
                window.pluginAPI.console.error('Plugin execution failed:', error.message);
                window.pluginAPI.console.error('Stack:', error.stack);
                await window.pluginAPI.error(error.message + ' (Stack: ' + error.stack + ')');
            }
        })();
    </script>
</body>
</html>`;
            } else {
                // For non-ES modules, use the original approach
                // Escape the plugin code for safe embedding
                const escapedPluginCode = pluginCode
                    .replace(/\\/g, '\\\\')
                    .replace(/`/g, '\\`')
                    .replace(/\$/g, '\\$');

                pluginHtml = `
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
            }

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