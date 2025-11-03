import electronPkg from 'electron';
const { app, BrowserWindow, ipcMain } = electronPkg;
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import SafeConsole from '../utils/SafeConsole.js';
import Module from 'module';
import { ProcessedPluginDirCacheService } from './ProcessedPluginDirCacheService.js';

// Define __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Secure Plugin Loader
 *
 * Purpose: Loads plugins in the main process with import rewriting.
 * This service focuses on:
 * - Processing plugin directories (rewriting imports)
 * - Resolving package paths (my-nft-gen, etc.)
 * - Loading plugins in main process context
 * - Caching processed plugin directories
 *
 * Refactored in Phase 3 to remove:
 * - Isolated window approach (loadPlugin)
 * - Plugin preload script generation
 * - Redundant IPC handlers (now in dedicated IPC service)
 */
export class SecurePluginLoader {
    constructor(appDataPath = null) {
        this.processedPluginDirs = new Map(); // In-memory cache: pluginPath -> temp directory path
        this.importedPlugins = new Map(); // Cache: pluginUrl -> module (prevents re-registration)
        this.dirCacheService = new ProcessedPluginDirCacheService(appDataPath); // Persistent cache
    }

    /**
     * Initialize the loader (load persistent cache)
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            const cache = await this.dirCacheService.loadCache();
            if (cache) {
                // Populate in-memory map from persistent cache
                const mappings = this.dirCacheService.getAllMappings();
                for (const [sourceDir, processedDir] of Object.entries(mappings)) {
                    this.processedPluginDirs.set(sourceDir, processedDir);
                }
                SafeConsole.log(`✅ [SecurePluginLoader] Initialized with ${this.processedPluginDirs.size} cached plugin directories`);
            }
        } catch (error) {
            SafeConsole.log(`⚠️ [SecurePluginLoader] Could not load persistent cache: ${error.message}`);
        }
    }

    /**d
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
                    
                    // Check if package is INSIDE the ASAR archive itself
                    const asarPath = path.join(process.resourcesPath, 'app.asar', 'node_modules', packageName);
                    if (fsSync.existsSync(asarPath)) {
                        SafeConsole.log(`✅ [SecurePluginLoader] Found ${packageName} inside ASAR: ${asarPath}`);
                        return fsSync.realpathSync(asarPath);
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
                    
                    // Also check inside ASAR
                    const insideAsarPath = path.join(asarDir, 'node_modules', packageName);
                    if (fsSync.existsSync(insideAsarPath)) {
                        SafeConsole.log(`✅ [SecurePluginLoader] Found ${packageName} inside ASAR (via mainModule): ${insideAsarPath}`);
                        return fsSync.realpathSync(insideAsarPath);
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
     * Check if a path is inside an ASAR archive
     * @param {string} filePath - Path to check
     * @returns {boolean} True if path is inside ASAR
     */
    isInsideAsar(filePath) {
        return filePath && filePath.includes('.asar');
    }

    /**
     * Copy a directory recursively (for ASAR contents)
     * @param {string} src - Source directory
     * @param {string} dest - Destination directory
     * @returns {Promise<void>}
     */
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    /**
     * Link or copy a directory to destination (symlink if outside ASAR, copy if inside)
     * @param {string} src - Source path
     * @param {string} dest - Destination path
     * @param {boolean} isDir - Whether source is a directory
     * @returns {Promise<void>}
     */
    async linkOrCopy(src, dest, isDir = true) {
        // Check if source is inside ASAR
        if (this.isInsideAsar(src)) {
            SafeConsole.log(`  📋 Copying from ASAR (can't symlink): ${path.basename(src)}`);
            if (isDir) {
                await this.copyDirectory(src, dest);
            } else {
                await fs.mkdir(path.dirname(dest), { recursive: true });
                await fs.copyFile(src, dest);
            }
        } else {
            // Safe to symlink
            SafeConsole.log(`  📎 Symlinking: ${path.basename(src)}`);
            await fs.symlink(src, dest, isDir ? 'dir' : 'file');
        }
    }

    /**
     * Rewrite imports for a specific npm package to use absolute paths
     * NOTE: my-nft-gen is NOT rewritten - it uses node_modules resolution
     * @param {string} code - Plugin code
     * @param {string} packageName - Package name to rewrite imports for
     * @returns {string} Modified code with absolute imports
     */
    rewritePackageImports(code, packageName) {
        // Check if code has any imports from this package
        if (!code.includes(packageName)) {
            return code;
        }
        
        // NEVER rewrite my-nft-gen imports - always use node_modules resolution
        // This is critical because:
        // 1. We set up proper node_modules symlinks in both plugin and temp directories
        // 2. Rewriting to file:// URLs breaks nested module resolution
        // 3. When LayerEffect.js imports from my-nft-gen, it needs node_modules context
        if (packageName === 'my-nft-gen') {
            SafeConsole.log(`🔒 [SecurePluginLoader] Skipping import rewriting for ${packageName} - using node_modules resolution`);
            return code; // Don't rewrite - keep bare imports
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

        // If package is inside ASAR, DON'T rewrite to absolute paths
        // Instead, keep bare imports and rely on node_modules resolution
        // This works because we copy ASAR contents to node_modules
        if (this.isInsideAsar(packagePath)) {
            SafeConsole.log(`✅ [SecurePluginLoader] Resolved ${packageName} to ASAR path: ${packagePath}`);
            SafeConsole.log(`🔒 [SecurePluginLoader] Skipping import rewriting (using node_modules resolution instead)`);
            return code; // Don't rewrite - keep bare imports
        }

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

            // Handle relative imports with single quotes: from './path' or from '../../path'
            code = code.replace(
                /from\s+'(\.\.?\/[^']+)'/g,
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

            // Handle relative imports with double quotes: from "./path" or from "../../path"
            code = code.replace(
                /from\s+"(\.\.?\/[^"]+)"/g,
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

            // Handle dynamic import() calls with single quotes: import('./path') or import('../../path')
            code = code.replace(
                /import\s*\(\s*'(\.\.?\/[^']+)'\s*\)/g,
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

            // Handle dynamic import() calls with double quotes: import("./path") or import("../../path")
            code = code.replace(
                /import\s*\(\s*"(\.\.?\/[^"]+)"\s*\)/g,
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
                        // This ensures imports like './src/effects/...' and '../../base/...' work correctly and resolve to the rewritten files
                        // Handle relative imports with single quotes: from './path' or from '../../path'
                        code = code.replace(
                            /from\s+'(\.\.?\/[^']+)'/g,
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
                        
                        // Handle relative imports with double quotes: from "./path" or from "../../path"
                        code = code.replace(
                            /from\s+"(\.\.?\/[^"]+)"/g,
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
                        
                        // Handle dynamic imports with single quotes: import('./path') or import('../../path')
                        code = code.replace(
                            /import\s*\(\s*'(\.\.?\/[^']+)'\s*\)/g,
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
                        
                        // Handle dynamic imports with double quotes: import("./path") or import("../../path")
                        code = code.replace(
                            /import\s*\(\s*"(\.\.?\/[^"]+)"\s*\)/g,
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
     * Resolve app node_modules path, handling ASAR packaging
     * @returns {string|null} Path to app's node_modules or null if not found
     */
    resolveAppNodeModulesPath() {
        try {
            // First, try direct calculation from file location
            const appRoot = path.dirname(path.dirname(path.dirname(path.dirname(__filename)))); // Go up from src/main/services
            const appNodeModules = path.join(appRoot, 'node_modules');
            if (fsSync.existsSync(appNodeModules)) {
                SafeConsole.log(`✅ [SecurePluginLoader] Found node_modules via direct path: ${appNodeModules}`);
                return appNodeModules;
            }
            
            // Try process.cwd()
            const cwdNodeModules = path.join(process.cwd(), 'node_modules');
            if (fsSync.existsSync(cwdNodeModules)) {
                SafeConsole.log(`✅ [SecurePluginLoader] Found node_modules at cwd: ${cwdNodeModules}`);
                return cwdNodeModules;
            }
            
            // Handle ASAR packaging - check process.resourcesPath and ASAR unpacked
            try {
                if (process.resourcesPath) {
                    // Check ASAR unpacked first
                    const asarUnpackedNodeModules = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules');
                    if (fsSync.existsSync(asarUnpackedNodeModules)) {
                        SafeConsole.log(`✅ [SecurePluginLoader] Found node_modules in ASAR unpacked: ${asarUnpackedNodeModules}`);
                        return asarUnpackedNodeModules;
                    }
                    
                    // Check inside ASAR archive (may work via Node's ASAR support)
                    const asarNodeModules = path.join(process.resourcesPath, 'app.asar', 'node_modules');
                    if (fsSync.existsSync(asarNodeModules)) {
                        SafeConsole.log(`✅ [SecurePluginLoader] Found node_modules inside ASAR: ${asarNodeModules}`);
                        return asarNodeModules;
                    }
                }
            } catch (e) {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Error checking ASAR resources: ${e.message}`);
            }
            
            // Last resort: app.getAppPath()
            try {
                const appPath = app.getAppPath();
                const appPathNodeModules = path.join(appPath, 'node_modules');
                if (fsSync.existsSync(appPathNodeModules)) {
                    SafeConsole.log(`✅ [SecurePluginLoader] Found node_modules at app path: ${appPathNodeModules}`);
                    return appPathNodeModules;
                }
            } catch (e) {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Could not resolve via app.getAppPath(): ${e.message}`);
            }
            
            SafeConsole.log(`❌ [SecurePluginLoader] Could not resolve app node_modules path`);
            return null;
        } catch (error) {
            SafeConsole.log(`❌ [SecurePluginLoader] Error resolving app node_modules: ${error.message}`);
            return null;
        }
    }

    /**
     * Load a plugin directly in the main process (Node.js context)
     * This allows plugins to use Node.js modules like my-nft-gen with native dependencies (sharp, etc.)
     * @param {string} pluginPath - Path to plugin file
     * @returns {Promise<Object>} Plugin load result
     */
    async loadPluginInMainProcess(pluginPath, progressCallback = null) {
        try {
            SafeConsole.log(`🔒 [SecurePluginLoader] Loading plugin in main process: ${pluginPath}`);
            
            // Report progress
            const reportProgress = (phase, message, percent) => {
                if (progressCallback) {
                    progressCallback(phase, message, percent);
                }
            };
            
            // Get the app's root node_modules path for module resolution
            // This allows plugins to resolve my-nft-gen and other app dependencies
            // Note: pluginPath can be either a directory (plugin root) or a file
            const pluginStats = await fs.lstat(pluginPath).catch(() => null);
            const pluginDir = pluginStats && pluginStats.isDirectory() ? pluginPath : path.dirname(pluginPath);
            const pluginNodeModules = path.join(pluginDir, 'node_modules');
            
            SafeConsole.log(`🔒 [SecurePluginLoader] Plugin directory: ${pluginDir}`);
            
            reportProgress('setup-node-modules', 'Setting up plugin node_modules...', 5);
            
            // Resolve app node_modules with ASAR support
            const finalAppNodeModules = this.resolveAppNodeModulesPath();
            
            if (!finalAppNodeModules) {
                SafeConsole.log(`❌ [SecurePluginLoader] CRITICAL: Could not resolve app node_modules in any location`);
                SafeConsole.log(`   Plugin may fail to load dependencies`);
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
                
                reportProgress('symlink', 'Symlinking dependencies...', 15);
                
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
                                await this.linkOrCopy(appFile, pluginFile, entry.isDirectory());
                                symlinkCount++;
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
                                
                                // Only link/copy if not already present
                                const exists = await fs.lstat(pluginNestedPkg).catch(() => null);
                                if (!exists) {
                                    const isDir = (await fs.lstat(appNestedPkg)).isDirectory();
                                    await this.linkOrCopy(appNestedPkg, pluginNestedPkg, isDir);
                                    nestedCount++;
                                }
                            }
                            SafeConsole.log(`✅ [SecurePluginLoader] Linked/Copied ${nestedCount} nested dependencies (including sharp)`);
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
                            await this.linkOrCopy(appPkg, pluginPkg, appPkgStats.isDirectory());
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

            // Check if we've already processed this plugin directory
            let tempPluginDir = this.processedPluginDirs.get(pluginDir);
            const pluginTimestamp = Date.now();

            if (tempPluginDir) {
                SafeConsole.log(`🔒 [SecurePluginLoader] Using cached processed plugin directory: ${tempPluginDir}`);
                reportProgress('process-directory', 'Using cached processed plugin...', 35);
            } else {
                reportProgress('process-directory', 'Processing plugin directory with import rewrites...', 25);
                tempPluginDir = path.join(app.getPath('userData'), `plugin-processed-${pluginTimestamp}`);

                SafeConsole.log(`🔒 [SecurePluginLoader] Creating temporary processed plugin directory: ${tempPluginDir}`);
                await fs.mkdir(tempPluginDir, { recursive: true });

                // Process all files in the plugin directory, rewriting imports in each one
                await this.processPluginDirectory(pluginDir, tempPluginDir);
                SafeConsole.log(`✅ [SecurePluginLoader] Processed plugin directory with rewritten imports`);

                reportProgress('process-directory', 'Caching processed plugin directory...', 35);
                
                // Cache the processed directory for future use (both in-memory and persistent)
                this.processedPluginDirs.set(pluginDir, tempPluginDir);
                await this.dirCacheService.recordMapping(pluginDir, tempPluginDir);
                SafeConsole.log(`✅ [SecurePluginLoader] Cached processed directory for plugin: ${pluginDir}`);
            }
            
            // Set up node_modules in the temp directory so plugins can resolve dependencies
            // This mirrors the symlink setup we did for the original plugin directory
            try {
                reportProgress('symlink', 'Setting up temp node_modules...', 40);
                const tempNodeModules = path.join(tempPluginDir, 'node_modules');
                await fs.mkdir(tempNodeModules, { recursive: true });
                SafeConsole.log(`🔒 [SecurePluginLoader] Setting up node_modules in temp directory`);
                
                // Link or copy my-nft-gen itself (copy if in ASAR)
                const myNftGenPath = this.resolveMyNftGenPath();
                if (myNftGenPath) {
                    const tempMyNftGen = path.join(tempNodeModules, 'my-nft-gen');
                    const existsCheck = await fs.lstat(tempMyNftGen).catch(() => null);
                    if (!existsCheck) {
                        await this.linkOrCopy(myNftGenPath, tempMyNftGen, true);
                        SafeConsole.log(`✅ [SecurePluginLoader] Linked/Copied my-nft-gen in temp node_modules`);
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
                                    await this.linkOrCopy(appNestedPkg, tempNestedPkg, isDir);
                                    nestedCount++;
                                    if (pkg === 'sharp') {
                                        SafeConsole.log(`✅ [SecurePluginLoader] Linked/Copied 'sharp' in temp`);
                                    }
                                }
                            }
                            SafeConsole.log(`✅ [SecurePluginLoader] Linked/Copied ${nestedCount} nested dependencies in temp (including sharp)`);
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
                            await this.linkOrCopy(appPkg, tempPkg, appPkgStats.isDirectory());
                            symlinkCount++;
                            if (pkg === 'sharp') {
                                SafeConsole.log(`✅ [SecurePluginLoader] Linked/Copied 'sharp' from app to temp`);
                            }
                        }
                    }
                    
                    SafeConsole.log(`✅ [SecurePluginLoader] Linked/Copied ${symlinkCount} app packages to temp node_modules`);
                } catch (symlinkError) {
                    SafeConsole.log(`⚠️ [SecurePluginLoader] Could not symlink all packages to temp: ${symlinkError.message}`);
                }
            } catch (tempSetupError) {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Could not setup temp node_modules: ${tempSetupError.message}`);
                SafeConsole.log(`   Will attempt import anyway, but dependency resolution might fail`);
            }
            
            // Now import from the temporary processed directory
            // The entry point filename has been renamed to .mjs during processing
            // First, determine the actual entry point file
            let entryPointFile = null;
            
            // If pluginPath is a directory, try to find the entry point from package.json
            // Otherwise, use its basename
            if (pluginStats && pluginStats.isDirectory()) {
                // It's a directory, try to find the entry point from package.json
                const packageJsonPath = path.join(pluginPath, 'package.json');
                try {
                    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
                    const packageJson = JSON.parse(packageContent);
                    let mainFile = packageJson.main || packageJson.exports;
                    
                    // Handle different exports formats
                    if (typeof mainFile === 'object') {
                        mainFile = mainFile['.'] || mainFile['./index.js'] || mainFile['./index.mjs'];
                    }
                    
                    entryPointFile = mainFile ? path.basename(mainFile) : 'index.js';
                } catch (error) {
                    SafeConsole.log(`⚠️ [SecurePluginLoader] Could not read package.json, defaulting to index.js`);
                    entryPointFile = 'index.js';
                }
            } else {
                // It's a file path, use its basename
                entryPointFile = path.basename(pluginPath);
            }
            
            // Convert to .mjs if needed
            if (!entryPointFile.endsWith('.mjs')) {
                entryPointFile = entryPointFile.replace(/\.js$/, '.mjs');
                // If it's index.js, make it index.mjs
                if (entryPointFile === 'index.js') {
                    entryPointFile = 'index.mjs';
                }
            }
            
            const rewrittenPluginPath = path.join(tempPluginDir, entryPointFile);
            SafeConsole.log(`🔒 [SecurePluginLoader] Entry point file: ${entryPointFile}`);
            SafeConsole.log(`🔒 [SecurePluginLoader] Rewritten plugin path: ${rewrittenPluginPath}`);
            
            // Verify the file exists
            const rewrittenStats = await fs.lstat(rewrittenPluginPath).catch(() => null);
            if (!rewrittenStats) {
                SafeConsole.log(`⚠️ [SecurePluginLoader] Entry point file not found: ${rewrittenPluginPath}`);
                const tempFiles = await fs.readdir(tempPluginDir).catch(() => []);
                SafeConsole.log(`   Temp plugin dir exists: ${(await fs.lstat(tempPluginDir).catch(() => null)) ? 'YES' : 'NO'}`);
                SafeConsole.log(`   Files in temp plugin dir (${tempPluginDir}):`, tempFiles);
                SafeConsole.log(`   Looking for original entry point: ${entryPointFile} (converted to .mjs)`);
                SafeConsole.log(`   Original pluginPath was: ${pluginPath}`);
                SafeConsole.log(`   Original pluginStats isDirectory: ${pluginStats?.isDirectory()}`);
                throw new Error(`Plugin entry point not found: ${entryPointFile} (looked in ${rewrittenPluginPath})`);
            }
            
            // Convert to URL for ES module import
            const pluginUrl = pathToFileURL(rewrittenPluginPath).href;
            SafeConsole.log(`🔒 [SecurePluginLoader] Plugin URL: ${pluginUrl}`);
            
            reportProgress('import', 'Importing plugin module...', 50);
            
            // CRITICAL: Check if we've already imported this plugin
            // Re-importing with different cache-bust params causes register() to be called again
            let pluginModule = this.importedPlugins.get(pluginUrl);
            if (pluginModule) {
                SafeConsole.log(`🔒 [SecurePluginLoader] Using cached plugin module (prevents re-registration)`);
                reportProgress('import', 'Using cached plugin module...', 60);
            } else {
                // Dynamically import the rewritten plugin module in the main process
                // All imports in this file AND all its dependencies now have absolute paths
                // NOTE: We do NOT use cache-bust query params here - they cause register() to be called repeatedly
                pluginModule = await import(pluginUrl);
                // Cache the imported module to prevent re-registration on future loads
                this.importedPlugins.set(pluginUrl, pluginModule);
                SafeConsole.log(`🔒 [SecurePluginLoader] Cached plugin module for future use`);
                reportProgress('import', 'Plugin module imported', 65);
            }
            
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
                reportProgress('import', 'Registering plugin effects...', 70);
                try {
                    // Try 3-argument form (EffectRegistry, ConfigRegistry, PositionRegistry) first
                    await pluginModule.register(mockEffectRegistry, mockConfigRegistry, mockPositionRegistry);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Plugin register() function completed successfully`);
                    SafeConsole.log(`🔒 [SecurePluginLoader] Total effects captured: ${registeredEffects.length}`);
                    
                    reportProgress('import', `Successfully registered ${registeredEffects.length} effects`, 80);
                    reportProgress('import', `Finalizing file system operations...`, 85);
                    
                    // Allow a brief moment for any pending file system operations to settle
                    // This ensures symlinks and writes are fully committed before continuing
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    reportProgress('import', `Plugin loading complete`, 90);
                    
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
}

export default SecurePluginLoader;
