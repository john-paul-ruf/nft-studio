import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { createRequire } from 'module';
import SafeConsole from '../utils/SafeConsole.js';

const require = createRequire(import.meta.url);

// Lazy-load electron app to handle test environments where it's not available
let app = null;
const getElectronApp = () => {
    if (app === null) {
        try {
            const electronModule = require('electron');
            app = electronModule.app;
        } catch (error) {
            // Electron not available (ok for testing)
            app = false; // Mark as attempted
        }
    }
    return app || null;
};

/**
 * Registry Cache Service
 *
 * Purpose: Cache plugin metadata to avoid re-scanning on every startup.
 * This improves startup performance by avoiding expensive plugin discovery.
 *
 * 🔑 IMPORTANT: The cache tracks ONLY plugins, NOT core effects.
 * Core effects are stable in my-nft-gen and are loaded directly via PluginLoader.ensureEffectsLoaded().
 *
 * The cache tracks:
 * - Plugin metadata (name, path, timestamps)
 * - Checksums to detect changes
 *
 * Cache invalidation occurs when:
 * - Plugin installed/uninstalled
 * - Plugin files modified
 * - Cache version mismatch
 */
class RegistryCacheService {
    constructor(appDataPath = null) {
        // Support both explicit path and electron app
        const electronApp = getElectronApp();
        this.appDataPath = appDataPath || (electronApp && electronApp.getPath ? electronApp.getPath('userData') : '/tmp/nft-studio');
        this.cacheFilePath = path.join(this.appDataPath, 'registry-cache.json');
        this.cache = null;
        this.cacheVersion = '1.0.0';
    }

    /**
     * Load cache from disk
     * @returns {Promise<Object|null>} Cache data or null if not found/invalid
     */
    async loadCache() {
        try {
            const data = await fs.readFile(this.cacheFilePath, 'utf8');
            const parsed = JSON.parse(data);

            // Version check
            if (parsed.version !== this.cacheVersion) {
                SafeConsole.log(`⚠️ [RegistryCacheService] Cache version mismatch (${parsed.version} vs ${this.cacheVersion}), invalidating`);
                return null;
            }

            this.cache = parsed;
            SafeConsole.log('✅ [RegistryCacheService] Cache loaded successfully');
            return this.cache;
        } catch (error) {
            if (error.code === 'ENOENT') {
                SafeConsole.log('ℹ️ [RegistryCacheService] No cache file found (first run or cache deleted)');
            } else {
                SafeConsole.error('⚠️ [RegistryCacheService] Failed to load cache:', error.message);
            }
            return null;
        }
    }

    /**
     * Save current registry state to cache
     * @param {Object} registryData - Current registry state
     * @param {Array} registryData.plugins - Plugin metadata
     * @returns {Promise<void>}
     */
    async saveCache(registryData) {
        try {
            const cacheData = {
                version: this.cacheVersion,
                timestamp: new Date().toISOString(),
                plugins: registryData.plugins || [],
                checksum: this._calculateChecksum(registryData)
            };

            await fs.writeFile(
                this.cacheFilePath,
                JSON.stringify(cacheData, null, 2),
                'utf8'
            );

            this.cache = cacheData;
            SafeConsole.log('✅ [RegistryCacheService] Cache saved successfully');
        } catch (error) {
            SafeConsole.error('❌ [RegistryCacheService] Failed to save cache:', error);
            throw error;
        }
    }

    /**
     * Validate cache is still valid by comparing with current state
     * @param {Array} currentPlugins - Current plugin list from PluginManagerService
     * @returns {Promise<boolean>} True if cache is valid
     */
    async validateCache(currentPlugins = []) {
        if (!this.cache) {
            SafeConsole.log('ℹ️ [RegistryCacheService] No cache loaded, validation failed');
            return false;
        }

        try {
            // Check if plugins have changed
            const cachedPlugins = this.cache.plugins || [];

            // Quick count check
            if (currentPlugins.length !== cachedPlugins.length) {
                SafeConsole.log(`ℹ️ [RegistryCacheService] Plugin count mismatch (${currentPlugins.length} vs ${cachedPlugins.length})`);
                return false;
            }

            // Compare checksums
            const currentChecksum = this._calculatePluginChecksum(currentPlugins);
            const cachedChecksum = this._calculatePluginChecksum(cachedPlugins);

            if (currentChecksum !== cachedChecksum) {
                SafeConsole.log('ℹ️ [RegistryCacheService] Plugin checksum mismatch, cache invalid');
                return false;
            }

            SafeConsole.log('✅ [RegistryCacheService] Cache validation passed');
            return true;
        } catch (error) {
            SafeConsole.error('⚠️ [RegistryCacheService] Cache validation error:', error);
            return false;
        }
    }

    /**
     * Calculate checksum for plugins
     * @param {Array} plugins - Plugin array
     * @returns {string} MD5 checksum
     * @private
     */
    _calculatePluginChecksum(plugins) {
        if (!plugins || plugins.length === 0) {
            return 'empty';
        }

        // Sort and create stable string representation
        const sorted = plugins
            .map(p => `${p.name}:${p.path}:${p.updatedAt || p.addedAt || ''}`)
            .sort()
            .join('|');

        return crypto.createHash('md5').update(sorted).digest('hex');
    }

    /**
     * Calculate overall checksum for registry data
     * @param {Object} registryData - Registry data
     * @returns {string} MD5 checksum
     * @private
     */
    _calculateChecksum(registryData) {
        // Note: Only plugins are cached, core effects are always loaded from my-nft-gen
        const data = JSON.stringify({
            plugins: registryData.plugins || []
        });

        return crypto.createHash('md5').update(data).digest('hex');
    }

    /**
     * Invalidate cache (delete cache file)
     * Called when plugins are installed/uninstalled
     * @returns {Promise<void>}
     */
    async invalidateCache() {
        this.cache = null;
        try {
            await fs.unlink(this.cacheFilePath);
            SafeConsole.log('🗑️ [RegistryCacheService] Cache invalidated and deleted');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                SafeConsole.error('⚠️ [RegistryCacheService] Failed to delete cache:', error.message);
            }
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        if (!this.cache) {
            return {
                exists: false,
                timestamp: null,
                pluginCount: 0
            };
        }

        return {
            exists: true,
            timestamp: this.cache.timestamp,
            pluginCount: (this.cache.plugins || []).length,
            version: this.cache.version
        };
    }

    /**
     * Get cached plugins
     * @returns {Array} Cached plugin list
     */
    getCachedPlugins() {
        return this.cache?.plugins || [];
    }
}

export default RegistryCacheService;
