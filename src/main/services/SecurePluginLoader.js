import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import SafeConsole from '../utils/SafeConsole.js';
import Module from 'module';

// Define __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
            
            // Store completion status so the waiting code knows the plugin is done
            const results = globalPluginResults.get(windowId) || { effects: [], configs: [] };
            results.ready = true; // Mark as ready
            globalPluginResults.set(windowId, results);
            
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
     * Resolve any npm package path
     * @param {string} packageName - Name of package to resolve
     * @returns {string|null} Resolved path or null if not found
     */
    resolvePackagePath(packageName) {
        try {
            // Try to resolve from process.cwd() node_modules (dev mode)
            const nodeModulesPath = path.join(process.cwd(), 'node_modules', packageName);
            if (fsSync.existsSync(nodeModulesPath)) {
                SafeConsole.log(`✅ [SecurePluginLoader] Found ${packageName} in cwd: ${nodeModulesPath}`);
                return fsSync.realpathSync(nodeModulesPath);
            }
            
            // Try from app path node_modules (production)
            const appPath = app.getAppPath();
            const altPath = path.join(appPath, 'node_modules', packageName);
            if (fsSync.existsSync(altPath)) {
                SafeConsole.log(`✅ [SecurePluginLoader] Found ${packageName} in app path: ${altPath}`);
                return fsSync.realpathSync(altPath);
            }
            
            // Try from ASAR unpacked resources
            // When ASAR is unpacked, files go to app.asar.unpacked/ directory
            try {
                if (process.resourcesPath) {
                    // process.resourcesPath points to the Resources directory
                    // app.asar and app.asar.unpacked are sibling directories in Resources
                    const asarUnpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', packageName);
                    if (fsSync.existsSync(asarUnpackedPath)) {
                        SafeConsole.log(`✅ [SecurePluginLoader] Found ${packageName} in ASAR unpacked resources: ${asarUnpackedPath}`);
                        return fsSync.realpathSync(asarUnpackedPath);
                    }
                }
            } catch (e) {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Error checking ASAR resources path: ${e.message}`);
            }
            
            // Try to find from main process module path in ASAR context
            try {
                if (process.mainModule?.filename?.includes?.('.asar')) {
                    // If filename is /path/to/app.asar/main.js, we need /path/to/app.asar.unpacked
                    const asarDir = path.dirname(process.mainModule.filename); // /path/to/app.asar
                    const parentDir = path.dirname(asarDir); // /path/to
                    const unpackedPath = path.join(parentDir, 'app.asar.unpacked', 'node_modules', packageName);
                    if (fsSync.existsSync(unpackedPath)) {
                        SafeConsole.log(`✅ [SecurePluginLoader] Found ${packageName} via ASAR unpacked: ${unpackedPath}`);
                        return fsSync.realpathSync(unpackedPath);
                    }
                }
            } catch (e) {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Error checking ASAR unpacked path: ${e.message}`);
            }
            
            SafeConsole.log(`⚠️ [SecurePluginLoader] Could not resolve ${packageName} in any location`);
            return null;
        } catch (error) {
            SafeConsole.log(`⚠️ [SecurePluginLoader] Error resolving ${packageName} path:`, error.message);
            return null;
        }
    }

    /**
     * Resolve my-nft-gen package path (legacy wrapper)
     * @returns {string|null} Resolved path or null if not found
     */
    resolveMyNftGenPath() {
        return this.resolvePackagePath('my-nft-gen');
    }

    /**
     * Resolve the entry point file for a package
     * For bare imports like 'from "my-nft-gen"', we need to resolve to the actual entry file
     * @param {string} packagePath - Path to the package directory
     * @returns {string} Entry point file path
     */
    resolvePackageEntryPoint(packagePath) {
        try {
            // Try to read package.json to find the actual entry point
            const packageJsonPath = path.join(packagePath, 'package.json');
            if (fsSync.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fsSync.readFileSync(packageJsonPath, 'utf8'));
                
                // Check for ES module entry points (exports, module, main in that order)
                if (packageJson.exports) {
                    if (typeof packageJson.exports === 'string') {
                        return path.join(packagePath, packageJson.exports);
                    }
                    if (packageJson.exports['.']) {
                        const mainExport = packageJson.exports['.'];
                        if (typeof mainExport === 'string') {
                            return path.join(packagePath, mainExport);
                        }
                        if (mainExport.import) {
                            return path.join(packagePath, mainExport.import);
                        }
                    }
                }
                
                if (packageJson.module) {
                    return path.join(packagePath, packageJson.module);
                }
                
                if (packageJson.main) {
                    return path.join(packagePath, packageJson.main);
                }
            }
            
            // Fallback: check for common entry points
            const commonEntryPoints = ['index.mjs', 'index.js', 'index.cjs', 'dist/index.mjs', 'dist/index.js'];
            for (const entryPoint of commonEntryPoints) {
                const fullPath = path.join(packagePath, entryPoint);
                if (fsSync.existsSync(fullPath)) {
                    SafeConsole.log(`✅ [SecurePluginLoader] Using entry point: ${entryPoint}`);
                    return fullPath;
                }
            }
            
            // Default to index.mjs if nothing else found
            SafeConsole.log(`⚠️ [SecurePluginLoader] No entry point found, defaulting to index.mjs`);
            return path.join(packagePath, 'index.mjs');
        } catch (error) {
            SafeConsole.log(`⚠️ [SecurePluginLoader] Error resolving entry point: ${error.message}`);
            // Fallback to index.mjs
            return path.join(packagePath, 'index.mjs');
        }
    }

    /**
     * Rewrite imports for a specific npm package to use absolute paths
     * @param {string} code - Plugin code
     * @param {string} packageName - Package name to rewrite imports for
     * @returns {string} Modified code with absolute imports
     */
    rewritePackageImports(code, packageName) {
        // Check if code has any imports from this package
        if (!code.includes(packageName)) {
            return code;
        }
        
        const packagePath = this.resolvePackagePath(packageName);
        
        if (!packagePath) {
            SafeConsole.log(`❌ [SecurePluginLoader] CRITICAL: Could not resolve ${packageName}`);
            SafeConsole.log(`   Plugin imports from '${packageName}' will fail!`);
            SafeConsole.log(`   Checked paths:`);
            SafeConsole.log(`     - process.cwd()/node_modules (dev)`);
            SafeConsole.log(`     - app.getAppPath()/node_modules`);
            SafeConsole.log(`     - process.resourcesPath/app.asar.unpacked/node_modules (production)`);
            SafeConsole.log(`     - process.mainModule ASAR unpacked path (fallback)`);
            SafeConsole.log(`   process.cwd() = ${process.cwd()}`);
            SafeConsole.log(`   app.getAppPath() = ${app.getAppPath()}`);
            SafeConsole.log(`   process.resourcesPath = ${process.resourcesPath}`);
            return code;
        }

        // Convert filesystem path to file:// URL for ES modules
        const packageUrl = pathToFileURL(packagePath).href;
        SafeConsole.log(`✅ [SecurePluginLoader] Resolved ${packageName} to: ${packagePath}`);
        SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting imports to use: ${packageUrl}`);

        // Resolve the entry point for bare imports (without subpath)
        const entryPointPath = this.resolvePackageEntryPoint(packagePath);
        const entryPointUrl = pathToFileURL(entryPointPath).href;
        SafeConsole.log(`✅ [SecurePluginLoader] Entry point for bare imports: ${entryPointUrl}`);

        // Escape special regex characters in package name for safe regex use
        const escapedPackageName = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Build regex patterns to match various import/require styles
        // We need separate patterns for single and double quotes to match them correctly
        
        // Pattern for: from 'package-name' or from 'package-name/subpath'
        const fromSingleQuotePattern = `from\\s+'${escapedPackageName}([^']*)'`;
        // Pattern for: from "package-name" or from "package-name/subpath"
        const fromDoubleQuotePattern = `from\\s+"${escapedPackageName}([^"]*)"`;
        // Pattern for: import 'package-name' or import 'package-name/subpath'
        const importSingleQuotePattern = `import\\s+'${escapedPackageName}([^']*)'`;
        // Pattern for: import "package-name" or import "package-name/subpath"
        const importDoubleQuotePattern = `import\\s+"${escapedPackageName}([^"]*)"`;
        // Pattern for: require('package-name') or require('package-name/subpath')
        const requireSingleQuotePattern = `require\\('${escapedPackageName}([^']*)'\\)`;
        // Pattern for: require("package-name") or require("package-name/subpath")
        const requireDoubleQuotePattern = `require\\("${escapedPackageName}([^"]*)\"\\)`;

        // Replace from imports with single quotes
        if (code.includes(`from '${packageName}`)) {
            code = code.replace(new RegExp(fromSingleQuotePattern, 'g'), (match, subpath) => {
                const resolved = subpath ? packageUrl + subpath : entryPointUrl;
                SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting: ${match} -> from '${resolved}'`);
                return `from '${resolved}'`;
            });
        }

        // Replace from imports with double quotes
        if (code.includes(`from "${packageName}`)) {
            code = code.replace(new RegExp(fromDoubleQuotePattern, 'g'), (match, subpath) => {
                const resolved = subpath ? packageUrl + subpath : entryPointUrl;
                SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting: ${match} -> from "${resolved}"`);
                return `from "${resolved}"`;
            });
        }

        // Replace import statements with single quotes
        if (code.includes(`import '${packageName}`)) {
            code = code.replace(new RegExp(importSingleQuotePattern, 'g'), (match, subpath) => {
                const resolved = subpath ? packageUrl + subpath : entryPointUrl;
                SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting: ${match} -> import '${resolved}'`);
                return `import '${resolved}'`;
            });
        }

        // Replace import statements with double quotes
        if (code.includes(`import "${packageName}`)) {
            code = code.replace(new RegExp(importDoubleQuotePattern, 'g'), (match, subpath) => {
                const resolved = subpath ? packageUrl + subpath : entryPointUrl;
                SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting: ${match} -> import "${resolved}"`);
                return `import "${resolved}"`;
            });
        }

        // Replace require statements with single quotes
        if (code.includes(`require('${packageName}`)) {
            code = code.replace(new RegExp(requireSingleQuotePattern, 'g'), (match, subpath) => {
                const resolved = subpath ? packageUrl + subpath : entryPointUrl;
                SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting: ${match} -> require('${resolved}')`);
                return `require('${resolved}')`;
            });
        }

        // Replace require statements with double quotes
        if (code.includes(`require("${packageName}`)) {
            code = code.replace(new RegExp(requireDoubleQuotePattern, 'g'), (match, subpath) => {
                const resolved = subpath ? packageUrl + subpath : entryPointUrl;
                SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting: ${match} -> require("${resolved}")`);
                return `require("${resolved}")`;
            });
        }

        // Handle dynamic imports with single quotes: import('package-name/subpath')
        if (code.includes(`import('${packageName}`)) {
            code = code.replace(new RegExp(`import\\s*\\(\\s*'${escapedPackageName}([^']*)'\\s*\\)`, 'g'), (match, subpath) => {
                const resolved = subpath ? packageUrl + subpath : entryPointUrl;
                SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting dynamic import: ${match} -> import('${resolved}')`);
                return `import('${resolved}')`;
            });
        }

        // Handle dynamic imports with double quotes: import("package-name/subpath")
        if (code.includes(`import("${packageName}`)) {
            code = code.replace(new RegExp(`import\\s*\\(\\s*"${escapedPackageName}([^"]*)\"\\s*\\)`, 'g'), (match, subpath) => {
                const resolved = subpath ? packageUrl + subpath : entryPointUrl;
                SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting dynamic import: ${match} -> import("${resolved}")`);
                return `import("${resolved}")`;
            });
        }

        return code;
    }

    /**
     * Rewrite import statements to use absolute paths for my-nft-gen
     * @param {string} code - Plugin code
     * @param {string} pluginDir - Plugin directory for resolving relative imports
     * @returns {string} Modified code with absolute imports
     */
    rewriteImportsWithAbsolutePaths(code, pluginDir = null) {
        // List of packages that plugins commonly depend on and that should be resolved from app node_modules
        // NOTE: my-nft-gen must be resolved for production (ASAR) to work properly
        // Even though it has proper exports, plugins need to import it and it won't be found
        // in the isolated temp directory without explicit resolution
        const packagesToRewrite = ['my-nft-gen', 'sharp', '@img/sharp-darwin-arm64', '@img/sharp-darwin-x64'];
        
        // Rewrite imports for all known packages
        for (const pkg of packagesToRewrite) {
            code = this.rewritePackageImports(code, pkg);
        }

        // Rewrite relative local imports (./src/..., ../..., etc.) to absolute paths
        if (pluginDir) {
            const pluginDirUrl = pathToFileURL(pluginDir).href;
            SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting relative local imports using base: ${pluginDirUrl}`);

            // Handle relative imports with single quotes: from './path'
            code = code.replace(
                /from\s+'([.][/][^']+)'/g,
                (match, relativePath) => {
                    try {
                        const resolvedPath = path.resolve(pluginDir, relativePath);
                        const resolvedUrl = pathToFileURL(resolvedPath).href;
                        SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting relative import: ${match} -> ${resolvedUrl}`);
                        return `from '${resolvedUrl}'`;
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Failed to resolve relative import ${match}: ${error.message}`);
                        return match;
                    }
                }
            );

            // Handle relative imports with double quotes: from "./path"
            code = code.replace(
                /from\s+"([.][/][^"]+)"/g,
                (match, relativePath) => {
                    try {
                        const resolvedPath = path.resolve(pluginDir, relativePath);
                        const resolvedUrl = pathToFileURL(resolvedPath).href;
                        SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting relative import: ${match} -> ${resolvedUrl}`);
                        return `from "${resolvedUrl}"`;
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Failed to resolve relative import ${match}: ${error.message}`);
                        return match;
                    }
                }
            );

            // Handle dynamic import() calls with single quotes: import('./path')
            code = code.replace(
                /import\s*\(\s*'([.][/][^']+)'\s*\)/g,
                (match, relativePath) => {
                    try {
                        const resolvedPath = path.resolve(pluginDir, relativePath);
                        const resolvedUrl = pathToFileURL(resolvedPath).href;
                        SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting relative dynamic import: ${match} -> import('${resolvedUrl}')`);
                        return `import('${resolvedUrl}')`;
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Failed to resolve relative import ${match}: ${error.message}`);
                        return match;
                    }
                }
            );

            // Handle dynamic import() calls with double quotes: import("./path")
            code = code.replace(
                /import\s*\(\s*"([.][/][^"]+)"\s*\)/g,
                (match, relativePath) => {
                    try {
                        const resolvedPath = path.resolve(pluginDir, relativePath);
                        const resolvedUrl = pathToFileURL(resolvedPath).href;
                        SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting relative dynamic import: ${match} -> import("${resolvedUrl}")`);
                        return `import("${resolvedUrl}")`;
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Failed to resolve relative import ${match}: ${error.message}`);
                        return match;
                    }
                }
            );
        }

        return code;
    }

    /**
     * Recursively process all plugin files, rewriting imports
     * @param {string} pluginDir - Plugin directory path
     * @param {string} tempDir - Temporary directory for processed files
     * @returns {Promise<void>}
     */
    async processPluginDirectory(pluginDir, tempDir) {
        const myNftGenPath = this.resolveMyNftGenPath();
        if (!myNftGenPath) {
            SafeConsole.log(`⚠️ [SecurePluginLoader] Could not resolve my-nft-gen initially, will still process plugin files`);
            SafeConsole.log(`   Import rewriting may fail, but will attempt anyway`);
        }

        const myNftGenUrl = myNftGenPath ? pathToFileURL(myNftGenPath).href : null;
        
        // Helper function to convert original file path to temp directory URL with .mjs extension
        const convertToTempUrl = (originalFilePath) => {
            // Make path relative to plugin root
            const relPath = path.relative(pluginDir, originalFilePath);
            // Map to temp directory
            let tempPath = path.join(tempDir, relPath);
            // Add .mjs extension if needed
            if (!tempPath.endsWith('.mjs')) {
                tempPath = tempPath.replace(/\.js$/, '.mjs');
            }
            return pathToFileURL(tempPath).href;
        };
        
        // Recursively walk the plugin directory
        const walkDir = async (dir, relativeBase = '', isNodeModules = false) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                // Handle directories
                if (entry.isDirectory()) {
                    // Skip .git, dist, build, and node_modules (always)
                    // Plugins should NOT bring their own dependencies
                    if (['.git', 'dist', 'build', 'node_modules'].includes(entry.name)) {
                        SafeConsole.log(`🔒 [SecurePluginLoader] Skipping directory: ${entry.name}`);
                        continue;
                    }
                    
                    const isNestedNodeModules = false;
                    
                    const subDir = path.join(dir, entry.name);
                    const subRelative = path.join(relativeBase, entry.name);
                    
                    // Create corresponding directory in temp location
                    await fs.mkdir(path.join(tempDir, subRelative), { recursive: true });
                    await walkDir(subDir, subRelative, isNestedNodeModules);
                } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
                    // Process JavaScript files
                    const fullPath = path.join(dir, entry.name);
                    let relativePath = path.join(relativeBase, entry.name);
                    
                    // Rename to .mjs extension to ensure ES module recognition
                    if (!relativePath.endsWith('.mjs')) {
                        relativePath = relativePath.replace(/\.js$/, '.mjs');
                    }
                    
                    const tempPath = path.join(tempDir, relativePath);
                    
                    try {
                        let code = await fs.readFile(fullPath, 'utf8');
                        
                        // Log original imports for debugging
                        if (code.includes('my-nft-gen')) {
                            SafeConsole.log(`🔒 [SecurePluginLoader] File has my-nft-gen imports: ${fullPath}`);
                            const importLines = code.split('\n').filter(line => line.includes('my-nft-gen'));
                            importLines.forEach(line => SafeConsole.log(`   Original: ${line.trim()}`));
                        }
                        
                        // Rewrite all npm package imports using the generic method
                        const packagesToRewrite = ['my-nft-gen', 'sharp', '@img/sharp-darwin-arm64', '@img/sharp-darwin-x64'];
                        for (const pkg of packagesToRewrite) {
                            const beforeLength = code.length;
                            code = this.rewritePackageImports(code, pkg);
                            const afterLength = code.length;
                            if (beforeLength !== afterLength && pkg === 'my-nft-gen') {
                                SafeConsole.log(`✅ [SecurePluginLoader] Rewrote my-nft-gen imports in: ${fullPath}`);
                            }
                        }
                        
                        // Also rewrite relative local imports to absolute file:// URLs pointing to temp directory
                        // This ensures imports like './src/effects/...' work correctly and resolve to the rewritten files
                        // Handle relative imports with single quotes: from './path'
                        code = code.replace(
                            /from\s+'([.][/][^']+)'/g,
                            (match, relativePath) => {
                                try {
                                    const resolvedPath = path.resolve(dir, relativePath);
                                    const tempUrl = convertToTempUrl(resolvedPath);
                                    SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting relative import in ${relativePath}: ${match} -> ${tempUrl}`);
                                    return `from '${tempUrl}'`;
                                } catch (error) {
                                    SafeConsole.log(`⚠️ [SecurePluginLoader] Failed to resolve relative import ${match}: ${error.message}`);
                                    return match;
                                }
                            }
                        );
                        
                        // Handle relative imports with double quotes: from "./path"
                        code = code.replace(
                            /from\s+"([.][/][^"]+)"/g,
                            (match, relativePath) => {
                                try {
                                    const resolvedPath = path.resolve(dir, relativePath);
                                    const tempUrl = convertToTempUrl(resolvedPath);
                                    SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting relative import in ${relativePath}: ${match} -> ${tempUrl}`);
                                    return `from "${tempUrl}"`;
                                } catch (error) {
                                    SafeConsole.log(`⚠️ [SecurePluginLoader] Failed to resolve relative import ${match}: ${error.message}`);
                                    return match;
                                }
                            }
                        );
                        
                        // Handle dynamic imports with single quotes: import('./path')
                        code = code.replace(
                            /import\s*\(\s*'([.][/][^']+)'\s*\)/g,
                            (match, relativePath) => {
                                try {
                                    const resolvedPath = path.resolve(dir, relativePath);
                                    const tempUrl = convertToTempUrl(resolvedPath);
                                    SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting relative dynamic import in ${relativePath}: ${match} -> import('${tempUrl}')`);
                                    return `import('${tempUrl}')`;
                                } catch (error) {
                                    SafeConsole.log(`⚠️ [SecurePluginLoader] Failed to resolve relative import ${match}: ${error.message}`);
                                    return match;
                                }
                            }
                        );
                        
                        // Handle dynamic imports with double quotes: import("./path")
                        code = code.replace(
                            /import\s*\(\s*"([.][/][^"]+)"\s*\)/g,
                            (match, relativePath) => {
                                try {
                                    const resolvedPath = path.resolve(dir, relativePath);
                                    const tempUrl = convertToTempUrl(resolvedPath);
                                    SafeConsole.log(`🔒 [SecurePluginLoader] Rewriting relative dynamic import in ${relativePath}: ${match} -> import("${tempUrl}")`);
                                    return `import("${tempUrl}")`;
                                } catch (error) {
                                    SafeConsole.log(`⚠️ [SecurePluginLoader] Failed to resolve relative import ${match}: ${error.message}`);
                                    return match;
                                }
                            }
                        );
                        
                        await fs.writeFile(tempPath, code, 'utf8');
                        SafeConsole.log(`✅ [SecurePluginLoader] Processed: ${relativePath}`);
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Error processing ${relativePath}: ${error.message}`);
                    }
                } else {
                    // Copy non-JS files as-is
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.join(relativeBase, entry.name);
                    const tempPath = path.join(tempDir, relativePath);
                    
                    try {
                        await fs.copyFile(fullPath, tempPath);
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Error copying ${relativePath}: ${error.message}`);
                    }
                }
            }
        };
        
        await walkDir(pluginDir);
    }

    /**
     * Load a plugin directly in the main process (Node.js context)
     * This allows plugins to use Node.js modules like my-nft-gen with native dependencies (sharp, etc.)
     * @param {string} pluginPath - Path to plugin file
     * @returns {Promise<Object>} Plugin load result
     */
    async loadPluginInMainProcess(pluginPath) {
        try {
            SafeConsole.log(`🔒 [SecurePluginLoader] Loading plugin in main process: ${pluginPath}`);
            
            // Get the app's root node_modules path for module resolution
            // This allows plugins to resolve my-nft-gen and other app dependencies
            const appRoot = path.dirname(path.dirname(path.dirname(path.dirname(__filename)))); // Go up from src/main/services
            const appNodeModules = path.join(appRoot, 'node_modules');
            const pluginDir = path.dirname(pluginPath);
            const pluginNodeModules = path.join(pluginDir, 'node_modules');
            
            SafeConsole.log(`🔒 [SecurePluginLoader] App root: ${appRoot}`);
            SafeConsole.log(`🔒 [SecurePluginLoader] Plugin directory: ${pluginDir}`);
            SafeConsole.log(`🔒 [SecurePluginLoader] App node_modules: ${appNodeModules}`);
            SafeConsole.log(`🔒 [SecurePluginLoader] App node_modules exists: ${fsSync.existsSync(appNodeModules)}`);
            
            // Verify app node_modules exists, if not try alternative paths
            let finalAppNodeModules = appNodeModules;
            if (!fsSync.existsSync(appNodeModules)) {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Calculated app node_modules not found, trying alternatives...`);
                
                // Try process.cwd()
                const cwdNodeModules = path.join(process.cwd(), 'node_modules');
                if (fsSync.existsSync(cwdNodeModules)) {
                    SafeConsole.log(`✅ [SecurePluginLoader] Found node_modules at cwd: ${cwdNodeModules}`);
                    finalAppNodeModules = cwdNodeModules;
                } else {
                    // Try app.getPath('appPath')
                    try {
                        const appPath = app.getAppPath();
                        const appPathNodeModules = path.join(appPath, 'node_modules');
                        if (fsSync.existsSync(appPathNodeModules)) {
                            SafeConsole.log(`✅ [SecurePluginLoader] Found node_modules at app path: ${appPathNodeModules}`);
                            finalAppNodeModules = appPathNodeModules;
                        }
                    } catch (e) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Could not get app path: ${e.message}`);
                    }
                }
            }
            
            SafeConsole.log(`🔒 [SecurePluginLoader] Using app node_modules: ${finalAppNodeModules}`);
            SafeConsole.log(`🔒 [SecurePluginLoader] Final app node_modules exists: ${fsSync.existsSync(finalAppNodeModules)}`);
            
            // Create a proper node_modules directory in the plugin directory
            // We'll symlink packages and patch my-nft-gen's package.json for compatibility
            try {
                let stats = await fs.lstat(pluginNodeModules).catch(() => null);
                
                if (!stats) {
                    SafeConsole.log(`🔒 [SecurePluginLoader] Creating node_modules directory...`);
                    await fs.mkdir(pluginNodeModules, { recursive: true });
                    SafeConsole.log(`✅ [SecurePluginLoader] Created node_modules directory`);
                } else if (stats.isDirectory()) {
                    SafeConsole.log(`✅ [SecurePluginLoader] node_modules directory already exists`);
                } else {
                    // If it exists but isn't a directory, remove and recreate
                    await fs.rm(pluginNodeModules, { recursive: true, force: true });
                    await fs.mkdir(pluginNodeModules, { recursive: true });
                }
                
                // Create a symlink for my-nft-gen but with a patched package.json
                // We use a directory with a patched package.json + symlinks to the actual package
                const pluginMyNftGen = path.join(pluginNodeModules, 'my-nft-gen');
                const appMyNftGen = path.join(finalAppNodeModules, 'my-nft-gen');
                
                // Check if app has my-nft-gen
                const appStats = await fs.lstat(appMyNftGen).catch(() => null);
                if (appStats) {
                    // Ensure plugin my-nft-gen directory exists
                    await fs.mkdir(pluginMyNftGen, { recursive: true });
                    
                    // Update package.json with patched exports
                    try {
                        const appPackageJson = path.join(appMyNftGen, 'package.json');
                        const appPackageContent = await fs.readFile(appPackageJson, 'utf-8');
                        const packageJson = JSON.parse(appPackageContent);
                        
                        // Patch the exports field to allow ./index.js
                        if (packageJson.exports && !packageJson.exports['./index.js']) {
                            SafeConsole.log(`🔒 [SecurePluginLoader] Adding ./index.js to exports...`);
                            packageJson.exports['./index.js'] = './index.js';
                        }
                        
                        // Write patched package.json to plugin's node_modules
                        const pluginPackageJsonPath = path.join(pluginMyNftGen, 'package.json');
                        await fs.writeFile(pluginPackageJsonPath, JSON.stringify(packageJson, null, 2));
                        SafeConsole.log(`✅ [SecurePluginLoader] Created/updated patched package.json`);
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Error updating package.json: ${error.message}`);
                    }
                    
                    // Symlink all files and directories from app's my-nft-gen to plugin's
                    // (except package.json which we've already handled)
                    // This ensures files are present even if directory was partially created before
                    try {
                        const entries = await fs.readdir(appMyNftGen, { withFileTypes: true });
                        let symlinkCount = 0;
                        
                        for (const entry of entries) {
                            // Skip package.json and hidden files
                            if (entry.name === 'package.json' || entry.name.startsWith('.')) {
                                continue;
                            }
                            
                            const appFile = path.join(appMyNftGen, entry.name);
                            const pluginFile = path.join(pluginMyNftGen, entry.name);
                            
                            // Check if plugin version already exists
                            const pluginExists = await fs.lstat(pluginFile).catch(() => null);
                            if (!pluginExists) {
                                await fs.symlink(appFile, pluginFile, entry.isDirectory() ? 'dir' : 'file');
                                symlinkCount++;
                                SafeConsole.log(`  📎 Symlinked: ${entry.name}`);
                            }
                        }
                        SafeConsole.log(`✅ [SecurePluginLoader] Ensured ${symlinkCount} symlinks for my-nft-gen`);
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Error symlinking my-nft-gen contents: ${error.message}`);
                    }
                    
                    SafeConsole.log(`✅ [SecurePluginLoader] my-nft-gen ready with patched exports`);
                    
                    // Also symlink my-nft-gen's nested node_modules into plugin's node_modules
                    // This allows plugins to import dependencies like 'sharp' that are nested in my-nft-gen
                    try {
                        const myNftGenNodeModules = path.join(appMyNftGen, 'node_modules');
                        const myNftGenNodeModulesStats = await fs.lstat(myNftGenNodeModules).catch(() => null);
                        
                        if (myNftGenNodeModulesStats && myNftGenNodeModulesStats.isDirectory()) {
                            SafeConsole.log(`🔒 [SecurePluginLoader] Symlinking my-nft-gen's nested dependencies...`);
                            const nestedPackages = await fs.readdir(myNftGenNodeModules);
                            let nestedCount = 0;
                            
                            for (const pkg of nestedPackages) {
                                if (pkg.startsWith('.')) continue;
                                
                                const appNestedPkg = path.join(myNftGenNodeModules, pkg);
                                const pluginNestedPkg = path.join(pluginNodeModules, pkg);
                                
                                // Only symlink if not already present
                                const exists = await fs.lstat(pluginNestedPkg).catch(() => null);
                                if (!exists) {
                                    const isDir = (await fs.lstat(appNestedPkg)).isDirectory();
                                    await fs.symlink(appNestedPkg, pluginNestedPkg, isDir ? 'dir' : 'file');
                                    nestedCount++;
                                }
                            }
                            SafeConsole.log(`✅ [SecurePluginLoader] Symlinked ${nestedCount} nested dependencies (including sharp)`);
                        }
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Could not symlink my-nft-gen nested dependencies: ${error.message}`);
                    }
                }
                
                // Symlink other app packages to plugin's node_modules
                // This allows plugins to use any dependency the app has
                try {
                    SafeConsole.log(`🔒 [SecurePluginLoader] Symlinking app dependencies...`);
                    const appPackages = await fs.readdir(finalAppNodeModules);
                    let symlinkCount = 0;
                    
                    for (const pkg of appPackages) {
                        // Skip if already processed or is a hidden file
                        if (pkg === 'my-nft-gen' || pkg.startsWith('.')) continue;
                        
                        const appPkg = path.join(finalAppNodeModules, pkg);
                        const pluginPkg = path.join(pluginNodeModules, pkg);
                        
                        const appPkgStats = await fs.lstat(appPkg).catch(() => null);
                        const pluginPkgStats = await fs.lstat(pluginPkg).catch(() => null);
                        
                        if (appPkgStats && !pluginPkgStats) {
                            await fs.symlink(appPkg, pluginPkg, appPkgStats.isDirectory() ? 'dir' : 'file');
                            symlinkCount++;
                        }
                    }
                    
                    SafeConsole.log(`✅ [SecurePluginLoader] Symlinked ${symlinkCount} app packages`);
                } catch (symlinkError) {
                    SafeConsole.log(`⚠️ [SecurePluginLoader] Could not symlink all packages: ${symlinkError.message}`);
                }
                
            } catch (moduleSetupError) {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Could not setup node_modules: ${moduleSetupError.message}`);
                SafeConsole.log(`   Will attempt import anyway, but module resolution might fail`);
            }
            
            // Process the entire plugin directory recursively to rewrite ALL imports (not just the entry point)
            // This is critical because when the entry point imports other plugin files, those files
            // must also have their my-nft-gen imports rewritten
            const pluginTimestamp = Date.now();
            const tempPluginDir = path.join(app.getPath('userData'), `plugin-processed-${pluginTimestamp}`);
            
            SafeConsole.log(`🔒 [SecurePluginLoader] Creating temporary processed plugin directory: ${tempPluginDir}`);
            await fs.mkdir(tempPluginDir, { recursive: true });
            
            // Process all files in the plugin directory, rewriting imports in each one
            await this.processPluginDirectory(pluginDir, tempPluginDir);
            SafeConsole.log(`✅ [SecurePluginLoader] Processed plugin directory with rewritten imports`);
            
            // Set up node_modules in the temp directory so plugins can resolve dependencies
            // This mirrors the symlink setup we did for the original plugin directory
            try {
                const tempNodeModules = path.join(tempPluginDir, 'node_modules');
                await fs.mkdir(tempNodeModules, { recursive: true });
                SafeConsole.log(`🔒 [SecurePluginLoader] Setting up node_modules in temp directory`);
                
                // Symlink my-nft-gen itself
                const myNftGenPath = this.resolveMyNftGenPath();
                if (myNftGenPath) {
                    const tempMyNftGen = path.join(tempNodeModules, 'my-nft-gen');
                    const existsCheck = await fs.lstat(tempMyNftGen).catch(() => null);
                    if (!existsCheck) {
                        await fs.symlink(myNftGenPath, tempMyNftGen, 'dir');
                        SafeConsole.log(`✅ [SecurePluginLoader] Symlinked my-nft-gen in temp node_modules`);
                    }
                    
                    // Also symlink my-nft-gen's nested dependencies (sharp, etc.)
                    try {
                        const myNftGenNodeModules = path.join(myNftGenPath, 'node_modules');
                        const myNftGenNodeModulesStats = await fs.lstat(myNftGenNodeModules).catch(() => null);
                        
                        SafeConsole.log(`🔒 [SecurePluginLoader] Checking my-nft-gen node_modules: ${myNftGenNodeModules}`);
                        SafeConsole.log(`🔒 [SecurePluginLoader] my-nft-gen node_modules exists: ${!!myNftGenNodeModulesStats}`);
                        
                        if (myNftGenNodeModulesStats && myNftGenNodeModulesStats.isDirectory()) {
                            SafeConsole.log(`🔒 [SecurePluginLoader] Symlinking my-nft-gen's nested dependencies in temp...`);
                            const nestedPackages = await fs.readdir(myNftGenNodeModules);
                            SafeConsole.log(`🔒 [SecurePluginLoader] Found ${nestedPackages.length} nested packages: ${nestedPackages.join(', ')}`);
                            let nestedCount = 0;
                            
                            for (const pkg of nestedPackages) {
                                if (pkg.startsWith('.')) continue;
                                
                                const appNestedPkg = path.join(myNftGenNodeModules, pkg);
                                const tempNestedPkg = path.join(tempNodeModules, pkg);
                                
                                const exists = await fs.lstat(tempNestedPkg).catch(() => null);
                                if (!exists) {
                                    const isDir = (await fs.lstat(appNestedPkg)).isDirectory();
                                    await fs.symlink(appNestedPkg, tempNestedPkg, isDir ? 'dir' : 'file');
                                    nestedCount++;
                                    if (pkg === 'sharp') {
                                        SafeConsole.log(`✅ [SecurePluginLoader] Symlinked 'sharp': ${appNestedPkg} -> ${tempNestedPkg}`);
                                    }
                                }
                            }
                            SafeConsole.log(`✅ [SecurePluginLoader] Symlinked ${nestedCount} nested dependencies in temp (including sharp)`);
                        } else {
                            SafeConsole.log(`⚠️ [SecurePluginLoader] my-nft-gen node_modules not found: ${myNftGenNodeModules}`);
                            SafeConsole.log(`   Will try to symlink app packages directly instead`);
                        }
                    } catch (error) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] Could not symlink my-nft-gen nested dependencies in temp: ${error.message}`);
                    }
                }
                
                // Symlink app packages to temp node_modules
                try {
                    SafeConsole.log(`🔒 [SecurePluginLoader] Symlinking app dependencies to temp node_modules...`);
                    SafeConsole.log(`🔒 [SecurePluginLoader] App node_modules: ${finalAppNodeModules}`);
                    const appPackages = await fs.readdir(finalAppNodeModules);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Found ${appPackages.length} app packages`);
                    let symlinkCount = 0;
                    
                    for (const pkg of appPackages) {
                        if (pkg.startsWith('.')) continue;
                        
                        const appPkg = path.join(finalAppNodeModules, pkg);
                        const tempPkg = path.join(tempNodeModules, pkg);
                        
                        const appPkgStats = await fs.lstat(appPkg).catch(() => null);
                        const tempPkgStats = await fs.lstat(tempPkg).catch(() => null);
                        
                        if (appPkgStats && !tempPkgStats) {
                            await fs.symlink(appPkg, tempPkg, appPkgStats.isDirectory() ? 'dir' : 'file');
                            symlinkCount++;
                            if (pkg === 'sharp') {
                                SafeConsole.log(`✅ [SecurePluginLoader] Symlinked 'sharp' from app: ${appPkg} -> ${tempPkg}`);
                            }
                        }
                    }
                    
                    SafeConsole.log(`✅ [SecurePluginLoader] Symlinked ${symlinkCount} app packages to temp node_modules`);
                } catch (symlinkError) {
                    SafeConsole.log(`⚠️ [SecurePluginLoader] Could not symlink all packages to temp: ${symlinkError.message}`);
                }
            } catch (tempSetupError) {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Could not setup temp node_modules: ${tempSetupError.message}`);
                SafeConsole.log(`   Will attempt import anyway, but dependency resolution might fail`);
            }
            
            // Now import from the temporary processed directory
            // The entry point filename has been renamed to .mjs during processing
            let pluginFileName = path.basename(pluginPath);
            if (!pluginFileName.endsWith('.mjs')) {
                pluginFileName = pluginFileName.replace(/\.js$/, '.mjs');
            }
            const rewrittenPluginPath = path.join(tempPluginDir, pluginFileName);
            
            // Convert to URL for ES module import
            const pluginUrl = pathToFileURL(rewrittenPluginPath).href;
            SafeConsole.log(`🔒 [SecurePluginLoader] Plugin URL: ${pluginUrl}`);
            
            // Dynamically import the rewritten plugin module in the main process
            // All imports in this file AND all its dependencies now have absolute paths
            const pluginModule = await import(pluginUrl + `?t=${pluginTimestamp}`); // Add timestamp to bust cache
            
            SafeConsole.log(`🔒 [SecurePluginLoader] Plugin module imported successfully`);
            SafeConsole.log(`🔒 [SecurePluginLoader] Plugin exports:`, Object.keys(pluginModule));
            
            // Check if this is a my-nft-gen style plugin with a register() function
            if (pluginModule.register && typeof pluginModule.register === 'function') {
                SafeConsole.log(`🔒 [SecurePluginLoader] Detected my-nft-gen plugin with register() function`);
                
                // Load my-nft-gen registries in the main process
                const registryModules = await Promise.all([
                    import('my-nft-gen/src/core/registry/EffectRegistry.js'),
                    import('my-nft-gen/src/core/registry/ConfigRegistry.js'),
                    import('my-nft-gen/src/core/registry/PositionRegistry.js')
                ]);
                
                const EffectRegistry = registryModules[0].EffectRegistry;
                const ConfigRegistry = registryModules[1].ConfigRegistry;
                const PositionRegistry = registryModules[2].PositionRegistry;
                
                SafeConsole.log(`🔒 [SecurePluginLoader] Loaded registries from my-nft-gen`);
                
                // Create mock registries to capture effect registrations without polluting the global registry
                const registeredEffects = [];
                const registeredConfigs = [];
                
                // Create a mock effect registry that captures registrations
                // This prevents plugins from polluting the global registry during discovery
                const mockEffectRegistry = {
                    // Core registration method
                    registerGlobal: (effectClass, category, metadata) => {
                        SafeConsole.log(`🔒 [SecurePluginLoader] Effect registered: ${effectClass._name_ || effectClass.name} (Category: ${category})`);
                        registeredEffects.push({
                            name: effectClass._name_ || effectClass.name,
                            category: category,
                            metadata: metadata,
                            effectClass: effectClass  // Store the actual class for later registration
                        });
                    },
                    register: function(effectClass, category, metadata) {
                        return this.registerGlobal(effectClass, category, metadata);
                    },
                    // Query methods
                    hasGlobal: (name) => false,
                    getGlobal: (name) => null,
                    getByCategoryGlobal: (category) => [],
                    getByCategory: function(category) {
                        return this.getByCategoryGlobal(category);
                    },
                    // Singleton access
                    getInstance: function() {
                        return this;
                    }
                };
                
                // Create a mock config registry
                const mockConfigRegistry = {
                    registerGlobal: (configClass, metadata) => {
                        SafeConsole.log(`🔒 [SecurePluginLoader] Config registered: ${configClass._name_ || configClass.name}`);
                        registeredConfigs.push({
                            name: configClass._name_ || configClass.name,
                            metadata: metadata,
                            configClass: configClass
                        });
                    },
                    register: function(configClass, metadata) {
                        return this.registerGlobal(configClass, metadata);
                    },
                    hasGlobal: (name) => false,
                    getGlobal: (name) => null,
                    getInstance: function() {
                        return this;
                    }
                };
                
                // Create a mock position registry
                const mockPositionRegistry = {
                    register: (name, positionClass) => {
                        SafeConsole.log(`🔒 [SecurePluginLoader] Position registered: ${name}`);
                    },
                    getInstance: function() {
                        return this;
                    }
                };
                
                // Call the register function
                SafeConsole.log(`🔒 [SecurePluginLoader] Calling plugin register() function...`);
                try {
                    // Try 3-argument form (EffectRegistry, ConfigRegistry, PositionRegistry) first
                    await pluginModule.register(mockEffectRegistry, mockConfigRegistry, mockPositionRegistry);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Plugin register() function completed successfully`);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Total effects captured: ${registeredEffects.length}`);
                    
                    // Return the captured effects with their classes
                    // EffectRegistryService will handle the actual registration
                    return {
                        success: true,
                        effects: registeredEffects,
                        configs: registeredConfigs,
                        error: null
                    };
                } catch (registerError) {
                    SafeConsole.log(`❌ [SecurePluginLoader] Error in plugin register() function: ${registerError.message}`);
                    SafeConsole.log(`❌ [SecurePluginLoader] Stack: ${registerError.stack}`);
                    throw registerError;
                }
            } else {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Plugin has no register() function, checking for other export patterns`);
                
                return {
                    success: true,
                    effects: [],
                    configs: [],
                    error: 'Plugin does not have a register() function'
                };
            }
            
        } catch (error) {
            SafeConsole.log(`❌ [SecurePluginLoader] Failed to load plugin in main process: ${error.message}`);
            SafeConsole.log(`❌ [SecurePluginLoader] Stack: ${error.stack}`);
            
            return {
                success: false,
                error: error.message,
                effects: [],
                configs: []
            };
        }
    }

    /**
     * Load a plugin in an isolated context (fallback for special cases)
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
                // For ES modules, we need to process the entire plugin directory
                // to ensure ALL nested imports are rewritten
                
                // Find the actual plugin root (where package.json is, or entry point's directory)
                let pluginDir = path.dirname(pluginPath);
                
                // Try to find package.json to locate the actual package root
                // Walk up from the entry point to find package.json
                let currentDir = pluginDir;
                let foundPackageRoot = false;
                for (let i = 0; i < 10; i++) {
                    const packageJsonPath = path.join(currentDir, 'package.json');
                    try {
                        await fs.access(packageJsonPath);
                        pluginDir = currentDir; // Use the package root
                        foundPackageRoot = true;
                        SafeConsole.log(`🔒 [SecurePluginLoader] Found package root at: ${pluginDir}`);
                        break;
                    } catch (e) {
                        // Not found, try parent directory
                    }
                    const parentDir = path.dirname(currentDir);
                    if (parentDir === currentDir) {
                        // Reached filesystem root
                        break;
                    }
                    currentDir = parentDir;
                }
                
                if (!foundPackageRoot) {
                    SafeConsole.log(`🔒 [SecurePluginLoader] No package.json found, using entry point directory: ${pluginDir}`);
                }
                
                const pluginTimestamp = Date.now();
                const processedPluginDir = path.join(app.getPath('userData'), `plugin-processed-${pluginTimestamp}`);
                
                SafeConsole.log(`🔒 [SecurePluginLoader] Processing plugin directory recursively: ${pluginDir}`);
                SafeConsole.log(`🔒 [SecurePluginLoader] Output directory: ${processedPluginDir}`);
                
                // Declare these variables before the try block so they're accessible later
                let transformedCode;
                let pluginModulePath;
                let pluginModuleUrl;
                
                try {
                    // Create output directory
                    await fs.mkdir(processedPluginDir, { recursive: true });
                    
                    // Process entire plugin directory recursively
                    await this.processPluginDirectory(pluginDir, processedPluginDir);
                    
                    // Use the processed entry point instead of the original
                    // Calculate the relative path from plugin root to the entry point
                    const relativePath = path.relative(pluginDir, pluginPath);
                    const processedPluginPath = path.join(processedPluginDir, relativePath);
                    
                    SafeConsole.log(`🔒 [SecurePluginLoader] Original plugin path: ${pluginPath}`);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Relative path: ${relativePath}`);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Processed plugin path: ${processedPluginPath}`);
                    
                    // Read the processed plugin code
                    transformedCode = await fs.readFile(processedPluginPath, 'utf8');
                    
                    SafeConsole.log(`🔒 [SecurePluginLoader] Processing plugin code`);
                    
                    // Rewrite imports to use absolute paths
                    // Pass processedPluginDir so relative imports are resolved correctly
                    transformedCode = this.rewriteImportsWithAbsolutePaths(transformedCode, processedPluginDir);
                    
                    // The imports are already rewritten by processPluginDirectory and rewriteImportsWithAbsolutePaths
                    // For ES modules with proper export statements, we can use them as-is
                    const isESModule = this.isESModule(transformedCode);
                    
                    pluginModulePath = path.join(app.getPath('userData'), `plugin-module-${pluginTimestamp}.js`);
                    pluginModuleUrl = pathToFileURL(pluginModulePath).href;
                    
                    SafeConsole.log(`🔒 [SecurePluginLoader] Plugin module path: ${pluginModulePath}`);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Plugin module URL: ${pluginModuleUrl}`);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Detected ES module: ${isESModule}`);
                    
                    // For ES modules, never transform exports - just use as-is
                    // ES modules will be imported and their exports accessed directly
                    if (!isESModule) {
                        SafeConsole.log(`🔒 [SecurePluginLoader] Transforming exports for non-ES module plugin`);
                        
                        // Handle export default (must be done first to avoid conflicts)
                        transformedCode = transformedCode.replace(/export\s+default\s+/g, 'window.__pluginExport = ');
                        
                        // Handle export { ... } (named exports)
                        transformedCode = transformedCode.replace(/export\s+\{([^}]+)\}/g, (match, exports) => {
                            const exportNames = exports.split(',').map(e => e.trim().split(/\s+as\s+/)[0]);
                            return `window.__pluginExports = { ${exportNames.join(', ')} };`;
                        });
                        
                        // Handle export const/let/var declarations
                        transformedCode = transformedCode.replace(
                            /export\s+((?:const|let|var)\s+(\w+)\s*=\s*[^;\n]+[;\n]?)/gm,
                            (match, declaration, name) => {
                                SafeConsole.log(`🔒 [SecurePluginLoader] Transformed variable export: ${name}`);
                                const cleanDeclaration = declaration.trim().endsWith(';') ? declaration : declaration.trim() + ';';
                                return `${cleanDeclaration}\nwindow.__pluginExport_${name} = ${name};`;
                            }
                        );
                        
                        // Handle export function declarations
                        transformedCode = transformedCode.replace(
                            /export\s+((?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{)/g,
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
                    } else {
                        SafeConsole.log(`🔒 [SecurePluginLoader] ES module detected - preserving all code as-is (no transformation)`);
                    }
                    
                    // Debug: Show first 1500 chars and last 500 chars of transformed code
                    SafeConsole.log(`🔒 [SecurePluginLoader] Transformed code length: ${transformedCode.length}`);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Transformed code preview (first 1500 chars):`);
                    SafeConsole.log(transformedCode.substring(0, 1500));
                    SafeConsole.log(`🔒 [SecurePluginLoader] ... [middle content truncated] ...`);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Transformed code preview (last 500 chars):`);
                    SafeConsole.log(transformedCode.substring(Math.max(0, transformedCode.length - 500)));
                    
                    // Check for suspicious patterns that might cause syntax errors
                    if (transformedCode.includes('Unexpected identifier') || transformedCode.includes('export Mock')) {
                        SafeConsole.log(`⚠️ [SecurePluginLoader] WARNING: Code contains suspicious export pattern`);
                    }
                    
                    // Verify the code doesn't have corrupted export statements
                    const exportLines = transformedCode.split('\n').filter((line, idx) => {
                        return line.trim().startsWith('export ') && (idx === 0 || !transformedCode.split('\n')[idx - 1].trim().endsWith('\\'));
                    });
                    SafeConsole.log(`🔒 [SecurePluginLoader] Found ${exportLines.length} export statements`);
                    exportLines.slice(0, 5).forEach((line, i) => {
                        SafeConsole.log(`  Export ${i + 1}: ${line.substring(0, 100)}`);
                    });
                    
                    // Note: We skip syntax validation here because the transformed code
                    // will be executed as an ES module (with <script type="module">),
                    // which supports features like import.meta that would fail in new Function().
                    // Any syntax errors will be caught during actual execution in the sandbox.
                    SafeConsole.log(`✅ [SecurePluginLoader] Code transformation complete (validation deferred to module execution)`);
                    
                    SafeConsole.log(`🔒 [SecurePluginLoader] Writing transformed code to: ${pluginModulePath}`);
                    await fs.writeFile(pluginModulePath, transformedCode, 'utf8');
                    SafeConsole.log(`🔒 [SecurePluginLoader] Transformed code written successfully (${transformedCode.length} bytes)`);
                } catch (transformError) {
                    SafeConsole.log(`❌ [SecurePluginLoader] Failed to transform plugin code: ${transformError.message}`);
                    throw new Error(`Plugin transformation failed: ${transformError.message}`);
                }
                
                // Create HTML that loads the ES module with import maps
                // Get the resolved path to my-nft-gen BEFORE creating the HTML
                const myNftGenPath = this.resolveMyNftGenPath();
                const myNftGenUrl = myNftGenPath ? pathToFileURL(myNftGenPath).href : null;
                
                SafeConsole.log(`🔒 [SecurePluginLoader] Setting up import map for my-nft-gen: ${myNftGenUrl}`);
                
                // Create import map to resolve my-nft-gen from anywhere in the plugin hierarchy
                // This ensures nested imports also resolve correctly
                if (!myNftGenUrl) {
                    SafeConsole.log(`⚠️ [SecurePluginLoader] Could not resolve my-nft-gen path for import map - plugins may fail to load if they depend on my-nft-gen`);
                }
                
                const importMap = myNftGenUrl ? `
    <script type="importmap">
    {
        "imports": {
            "my-nft-gen": ${JSON.stringify(myNftGenUrl)},
            "my-nft-gen/": ${JSON.stringify(myNftGenUrl + '/')}
        }
    }
    </script>
                ` : '';
                
                pluginHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Plugin Sandbox</title>
    ${importMap}
</head>
<body>
    <script type="module">
        (async function() {
            try {
                window.pluginAPI.console.log('Loading plugin module from: ${pluginModuleUrl}');
                
                // Import the plugin module
                const pluginModule = await import('${pluginModuleUrl}');
                
                window.pluginAPI.console.log('Plugin module imported successfully');
                window.pluginAPI.console.log('Plugin exports:', Object.keys(pluginModule));
                
                // Check if this is a my-nft-gen style plugin with a register() function
                if (pluginModule.register && typeof pluginModule.register === 'function') {
                    window.pluginAPI.console.log('Detected my-nft-gen plugin with register() function');
                    
                    // Create mock EffectRegistry and PositionRegistry to capture registrations
                    let registrationCount = 0;
                    const mockEffectRegistry = {
                        registerGlobal: (effectClass, category, metadata) => {
                            registrationCount++;
                            window.pluginAPI.console.log(\`Mock EffectRegistry.registerGlobal called ($\{registrationCount}):\`, {
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
                    window.pluginAPI.console.log('Mock registries ready:', {
                        effectRegistry: typeof mockEffectRegistry,
                        positionRegistry: typeof mockPositionRegistry
                    });
                    
                    try {
                        const registerResult = await pluginModule.register(mockEffectRegistry, mockPositionRegistry);
                        window.pluginAPI.console.log('Plugin register() function completed successfully');
                        window.pluginAPI.console.log('Register result:', registerResult);
                        window.pluginAPI.console.log(\`Total effects registered via mock registry: $\{registrationCount}\`);
                    } catch (registerError) {
                        window.pluginAPI.console.error('Error in register() function:', registerError.message);
                        window.pluginAPI.console.error('Stack:', registerError.stack);
                        throw registerError;
                    }
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
                    // Check if plugin is ready (has registered something or sent ready signal)
                    if (results && (results.ready || results.effects?.length > 0 || results.configs?.length > 0 || results.error)) {
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