import path from 'path';
import fs from 'fs/promises';
import SafeConsole from '../utils/SafeConsole.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lazy-load electron app to handle test environments
let app = null;
const getElectronApp = () => {
    if (app === null) {
        try {
            const electronModule = require('electron');
            app = electronModule.app;
        } catch (error) {
            app = false;
        }
    }
    return app || null;
};

/**
 * Processed Plugin Directory Cache Service
 *
 * Purpose: Track the mapping of plugin directories to their processed (temp) directories
 * across app restarts, preventing redundant processing and temp directory creation.
 *
 * This service maintains a persistent cache of:
 * - Plugin source path -> Processed temp directory path
 * - Creation timestamp for cleanup purposes
 * - Hash of plugin source to detect when plugin has changed
 *
 * This solves the issue where every app restart created new temp plugin directories
 * instead of reusing previously processed ones.
 *
 * Cache file: {userData}/processed-plugin-dirs-cache.json
 *
 * Strategy:
 * - When a plugin is processed, record the mapping with a content hash
 * - On next app load, check if mapping exists and if hash still matches
 * - If hash doesn't match, plugin has changed, create new processed dir
 * - If hash matches, reuse the existing processed dir
 */
class ProcessedPluginDirCacheService {
    constructor(appDataPath = null) {
        const electronApp = getElectronApp();
        this.appDataPath = appDataPath || (electronApp && electronApp.getPath ? electronApp.getPath('userData') : '/tmp/nft-studio');
        this.cacheFilePath = path.join(this.appDataPath, 'processed-plugin-dirs-cache.json');
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
                SafeConsole.log(`⚠️ [ProcessedPluginDirCache] Cache version mismatch, invalidating`);
                return null;
            }

            this.cache = parsed;
            SafeConsole.log(`✅ [ProcessedPluginDirCache] Loaded cache with ${Object.keys(parsed.mappings || {}).length} entries`);
            return this.cache;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                SafeConsole.log(`ℹ️ [ProcessedPluginDirCache] No cache file found (first run)`);
            } else {
                SafeConsole.log(`⚠️ [ProcessedPluginDirCache] Failed to load cache: ${error.message}`);
            }
            return null;
        }
    }

    /**
     * Get the processed directory for a plugin if it exists and is still valid
     * @param {string} pluginSourcePath - Original plugin source path
     * @param {string} currentHash - Hash of current plugin source (optional for validation)
     * @returns {string|null} Processed directory path if valid and exists, null otherwise
     */
    async getProcessedDir(pluginSourcePath, currentHash = null) {
        if (!this.cache) {
            return null;
        }

        const normalized = this._normalizePath(pluginSourcePath);
        const entry = this.cache.mappings?.[normalized];

        if (!entry) {
            return null; // No cached entry for this plugin
        }

        // If current hash is provided, validate that plugin hasn't changed
        if (currentHash && entry.sourceHash && entry.sourceHash !== currentHash) {
            SafeConsole.log(`🔄 [ProcessedPluginDirCache] Plugin source changed (hash mismatch), need to reprocess`);
            return null;
        }

        // Check if the processed directory still exists
        try {
            await fs.access(entry.processedDir);
            SafeConsole.log(`✅ [ProcessedPluginDirCache] Reusing cached processed directory: ${entry.processedDir}`);
            return entry.processedDir;
        } catch (error) {
            SafeConsole.log(`⚠️ [ProcessedPluginDirCache] Cached processed directory no longer exists: ${entry.processedDir}`);
            return null;
        }
    }

    /**
     * Record a new processed plugin directory mapping
     * @param {string} pluginSourcePath - Original plugin source path
     * @param {string} processedDir - Path to the processed (temp) directory
     * @param {string} sourceHash - Optional hash of plugin source for change detection
     * @returns {Promise<void>}
     */
    async recordMapping(pluginSourcePath, processedDir, sourceHash = null) {
        if (!this.cache) {
            this.cache = {
                version: this.cacheVersion,
                timestamp: new Date().toISOString(),
                mappings: {}
            };
        }

        const normalized = this._normalizePath(pluginSourcePath);
        this.cache.mappings[normalized] = {
            sourceDir: pluginSourcePath,
            processedDir: processedDir,
            sourceHash: sourceHash,
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString()
        };

        await this._saveCache();
        SafeConsole.log(`✅ [ProcessedPluginDirCache] Recorded mapping: ${normalized} -> ${processedDir}`);
    }

    /**
     * Remove a mapping (e.g., when plugin is uninstalled)
     * @param {string} pluginSourcePath - Plugin source path to remove
     * @returns {Promise<void>}
     */
    async removeMapping(pluginSourcePath) {
        if (!this.cache?.mappings) {
            return;
        }

        const normalized = this._normalizePath(pluginSourcePath);
        if (normalized in this.cache.mappings) {
            delete this.cache.mappings[normalized];
            await this._saveCache();
            SafeConsole.log(`✅ [ProcessedPluginDirCache] Removed mapping for: ${normalized}`);
        }
    }

    /**
     * Get all cached mappings
     * @returns {Object} Object mapping plugin paths to their processed directories
     */
    getAllMappings() {
        if (!this.cache?.mappings) {
            return {};
        }

        return Object.values(this.cache.mappings).reduce((acc, entry) => {
            acc[entry.sourceDir] = entry.processedDir;
            return acc;
        }, {});
    }

    /**
     * Clean up orphaned entries (processed dirs that no longer exist)
     * @returns {Promise<Object>} Object with counts of removed entries
     */
    async cleanupOrphanedEntries() {
        if (!this.cache?.mappings) {
            return { total: 0, removed: 0 };
        }

        let removed = 0;
        const mappings = this.cache.mappings;
        const entriesToRemove = [];

        for (const [key, entry] of Object.entries(mappings)) {
            try {
                await fs.access(entry.processedDir);
            } catch (error) {
                entriesToRemove.push(key);
                removed++;
            }
        }

        for (const key of entriesToRemove) {
            delete this.cache.mappings[key];
        }

        if (removed > 0) {
            await this._saveCache();
            SafeConsole.log(`🧹 [ProcessedPluginDirCache] Cleaned up ${removed} orphaned entries`);
        }

        return {
            total: Object.keys(mappings).length,
            removed: removed
        };
    }

    /**
     * Invalidate entire cache (used when plugin system changes)
     * @returns {Promise<void>}
     */
    async invalidateCache() {
        this.cache = null;
        try {
            await fs.unlink(this.cacheFilePath);
            SafeConsole.log(`🧹 [ProcessedPluginDirCache] Cache invalidated and deleted`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                SafeConsole.log(`⚠️ [ProcessedPluginDirCache] Error deleting cache: ${error.message}`);
            }
        }
    }

    /**
     * Save cache to disk
     * @private
     */
    async _saveCache() {
        try {
            if (!this.cache) {
                return;
            }

            this.cache.timestamp = new Date().toISOString();
            await fs.mkdir(this.appDataPath, { recursive: true });
            await fs.writeFile(
                this.cacheFilePath,
                JSON.stringify(this.cache, null, 2),
                'utf8'
            );
        } catch (error) {
            SafeConsole.error(`❌ [ProcessedPluginDirCache] Failed to save cache: ${error.message}`);
        }
    }

    /**
     * Normalize path for consistent caching
     * @private
     */
    _normalizePath(pluginPath) {
        // Use real path for consistency, handle symlinks
        try {
            return path.resolve(pluginPath);
        } catch (error) {
            return pluginPath;
        }
    }
}

export { ProcessedPluginDirCacheService };