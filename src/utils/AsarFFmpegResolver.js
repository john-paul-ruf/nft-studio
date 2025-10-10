import electron from 'electron';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

// Create require function for ES modules
const require = createRequire(import.meta.url);

// Handle electron import (CommonJS compatibility)
const app = electron?.app || electron;

/**
 * AsarFFmpegResolver - Resolves FFmpeg paths for ASAR-packaged Electron apps
 * 
 * Follows Dependency Inversion Principle:
 * - Provides FFmpegConfig instances with correct paths for production/development
 * - Abstracts away ASAR complexity from business logic
 * 
 * Benefits:
 * ✅ Production-ready: Handles ASAR unpacking automatically
 * ✅ Development-friendly: Falls back to ffmpeg-ffprobe-static in dev
 * ✅ Testable: Can be mocked for testing
 * ✅ Single Responsibility: Only handles FFmpeg path resolution
 */
class AsarFFmpegResolver {
    constructor() {
        this._cachedConfig = null;
        this._isProduction = null;
    }

    /**
     * Check if running in production (packaged) mode
     * @returns {boolean} True if running in packaged app
     */
    isProduction() {
        if (this._isProduction === null) {
            this._isProduction = app.isPackaged;
        }
        return this._isProduction;
    }

    /**
     * Get the base path for unpacked resources
     * @returns {string} Base path for unpacked resources
     */
    getUnpackedBasePath() {
        if (!this.isProduction()) {
            return process.cwd();
        }

        // In production, ASAR unpacked files are in app.asar.unpacked
        const appPath = app.getAppPath();
        
        // If already in .asar.unpacked, use it directly
        if (appPath.includes('.asar.unpacked')) {
            return appPath;
        }
        
        // Otherwise, construct the unpacked path
        if (appPath.includes('.asar')) {
            return appPath.replace('.asar', '.asar.unpacked');
        }
        
        return appPath;
    }

    /**
     * Get FFmpeg binary path for current environment
     * @returns {string} Path to ffmpeg binary
     */
    getFfmpegPath() {
        if (!this.isProduction()) {
            // Development: use ffmpeg-ffprobe-static from node_modules
            return this._getDevFFmpegPath();
        }

        // Production: use unpacked ffmpeg-ffprobe-static
        // Note: ffmpeg-ffprobe-static stores binaries in its root directory
        const unpackedBase = this.getUnpackedBasePath();
        const platform = process.platform;
        const binaryName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
        
        // electron-builder may hoist dependencies, so check both locations:
        // 1. Hoisted: node_modules/ffmpeg-ffprobe-static/ffmpeg
        // 2. Nested: node_modules/my-nft-gen/node_modules/ffmpeg-ffprobe-static/ffmpeg
        const hoistedPath = path.join(
            unpackedBase,
            'node_modules',
            'ffmpeg-ffprobe-static',
            binaryName
        );
        
        const nestedPath = path.join(
            unpackedBase,
            'node_modules',
            'my-nft-gen',
            'node_modules',
            'ffmpeg-ffprobe-static',
            binaryName
        );

        // Return the path that exists
        if (fs.existsSync(hoistedPath)) {
            return hoistedPath;
        } else if (fs.existsSync(nestedPath)) {
            return nestedPath;
        }
        
        // If neither exists, return hoisted path (will fail validation later with clear error)
        return hoistedPath;
    }

    /**
     * Get FFprobe binary path for current environment
     * @returns {string} Path to ffprobe binary
     */
    getFfprobePath() {
        if (!this.isProduction()) {
            // Development: use ffmpeg-ffprobe-static from node_modules
            return this._getDevFFprobePath();
        }

        // Production: use unpacked ffmpeg-ffprobe-static
        // Note: ffmpeg-ffprobe-static stores binaries in its root directory
        const unpackedBase = this.getUnpackedBasePath();
        const platform = process.platform;
        const binaryName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
        
        // electron-builder may hoist dependencies, so check both locations:
        // 1. Hoisted: node_modules/ffmpeg-ffprobe-static/ffprobe
        // 2. Nested: node_modules/my-nft-gen/node_modules/ffmpeg-ffprobe-static/ffprobe
        const hoistedPath = path.join(
            unpackedBase,
            'node_modules',
            'ffmpeg-ffprobe-static',
            binaryName
        );
        
        const nestedPath = path.join(
            unpackedBase,
            'node_modules',
            'my-nft-gen',
            'node_modules',
            'ffmpeg-ffprobe-static',
            binaryName
        );

        // Return the path that exists
        if (fs.existsSync(hoistedPath)) {
            return hoistedPath;
        } else if (fs.existsSync(nestedPath)) {
            return nestedPath;
        }
        
        // If neither exists, return hoisted path (will fail validation later with clear error)
        return hoistedPath;
    }

    /**
     * Get FFmpegConfig instance for current environment
     * @returns {Promise<Object>} FFmpegConfig instance
     */
    async getFFmpegConfig() {
        console.log('[AsarFFmpegResolver] getFFmpegConfig() called');
        
        // Return cached config if available
        if (this._cachedConfig) {
            console.log('[AsarFFmpegResolver] Returning cached config:', this._cachedConfig);
            return this._cachedConfig;
        }

        console.log('[AsarFFmpegResolver] No cached config, creating new one...');
        console.log('[AsarFFmpegResolver] isProduction:', this.isProduction());
        
        // Import FFmpegConfig from my-nft-gen
        const { FFmpegConfig } = await import('my-nft-gen/src/core/config/FFmpegConfig.js');
        console.log('[AsarFFmpegResolver] FFmpegConfig imported:', FFmpegConfig);

        if (!this.isProduction()) {
            // Development: use default (ffmpeg-ffprobe-static)
            console.log('[AsarFFmpegResolver] Development mode - creating default config');
            this._cachedConfig = await FFmpegConfig.createDefault();
            console.log('[AsarFFmpegResolver] Default config created:', this._cachedConfig);
        } else {
            // Production: use ASAR unpacked paths
            console.log('[AsarFFmpegResolver] Production mode - using ASAR unpacked paths');
            const ffmpegPath = this.getFfmpegPath();
            const ffprobePath = this.getFfprobePath();
            console.log('[AsarFFmpegResolver] FFmpeg path:', ffmpegPath);
            console.log('[AsarFFmpegResolver] FFprobe path:', ffprobePath);

            // Verify paths exist and are files (not directories)
            if (!fs.existsSync(ffmpegPath)) {
                const diagnostics = this.getDiagnostics();
                console.error('[AsarFFmpegResolver] FFmpeg binary not found. Diagnostics:', diagnostics);
                throw new Error(`FFmpeg binary not found at: ${ffmpegPath}`);
            }
            
            const ffmpegStats = fs.statSync(ffmpegPath);
            if (!ffmpegStats.isFile()) {
                console.error(`[AsarFFmpegResolver] FFmpeg path is not a file: ${ffmpegPath}`);
                throw new Error(`FFmpeg path is not a file (is directory?): ${ffmpegPath}`);
            }
            
            if (!fs.existsSync(ffprobePath)) {
                const diagnostics = this.getDiagnostics();
                console.error('[AsarFFmpegResolver] FFprobe binary not found. Diagnostics:', diagnostics);
                throw new Error(`FFprobe binary not found at: ${ffprobePath}`);
            }
            
            const ffprobeStats = fs.statSync(ffprobePath);
            if (!ffprobeStats.isFile()) {
                console.error(`[AsarFFmpegResolver] FFprobe path is not a file: ${ffprobePath}`);
                throw new Error(`FFprobe path is not a file (is directory?): ${ffprobePath}`);
            }

            console.log(`[AsarFFmpegResolver] Using FFmpeg: ${ffmpegPath}`);
            console.log(`[AsarFFmpegResolver] Using FFprobe: ${ffprobePath}`);
            
            this._cachedConfig = FFmpegConfig.fromPaths(ffmpegPath, ffprobePath);
            console.log('[AsarFFmpegResolver] Production config created:', this._cachedConfig);
        }

        console.log('[AsarFFmpegResolver] Returning config:', this._cachedConfig);
        return this._cachedConfig;
    }

    /**
     * Get development FFmpeg path
     * @returns {string} Path to ffmpeg in development
     * @private
     */
    _getDevFFmpegPath() {
        try {
            // In development, use ffmpeg-ffprobe-static from my-nft-gen
            // Since my-nft-gen is a file: dependency, we can access its node_modules
            const myNftGenPath = path.dirname(require.resolve('my-nft-gen'));
            const ffmpegStaticPath = path.join(myNftGenPath, 'node_modules', 'ffmpeg-ffprobe-static');
            const platform = process.platform;
            const ffmpegPath = path.join(ffmpegStaticPath, platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
            
            if (fs.existsSync(ffmpegPath)) {
                return ffmpegPath;
            }
            
            // Fallback to system ffmpeg
            console.warn(`[AsarFFmpegResolver] FFmpeg not found at ${ffmpegPath}, falling back to system ffmpeg`);
            return 'ffmpeg';
        } catch (error) {
            // Fallback to system ffmpeg
            console.warn(`[AsarFFmpegResolver] Error resolving FFmpeg path: ${error.message}, falling back to system ffmpeg`);
            return 'ffmpeg';
        }
    }

    /**
     * Get development FFprobe path
     * @returns {string} Path to ffprobe in development
     * @private
     */
    _getDevFFprobePath() {
        try {
            // In development, use ffmpeg-ffprobe-static from my-nft-gen
            // Since my-nft-gen is a file: dependency, we can access its node_modules
            const myNftGenPath = path.dirname(require.resolve('my-nft-gen'));
            const ffmpegStaticPath = path.join(myNftGenPath, 'node_modules', 'ffmpeg-ffprobe-static');
            const platform = process.platform;
            const ffprobePath = path.join(ffmpegStaticPath, platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
            
            if (fs.existsSync(ffprobePath)) {
                return ffprobePath;
            }
            
            // Fallback to system ffprobe
            console.warn(`[AsarFFmpegResolver] FFprobe not found at ${ffprobePath}, falling back to system ffprobe`);
            return 'ffprobe';
        } catch (error) {
            // Fallback to system ffprobe
            console.warn(`[AsarFFmpegResolver] Error resolving FFprobe path: ${error.message}, falling back to system ffprobe`);
            return 'ffprobe';
        }
    }

    /**
     * Clear cached configuration (useful for testing)
     */
    clearCache() {
        this._cachedConfig = null;
        this._isProduction = null;
    }

    /**
     * Get diagnostic information about FFmpeg paths
     * @returns {Object} Diagnostic information
     */
    getDiagnostics() {
        return {
            isProduction: this.isProduction(),
            appPath: app.getAppPath(),
            unpackedBasePath: this.getUnpackedBasePath(),
            ffmpegPath: this.getFfmpegPath(),
            ffprobePath: this.getFfprobePath(),
            ffmpegExists: fs.existsSync(this.getFfmpegPath()),
            ffprobeExists: fs.existsSync(this.getFfprobePath()),
            platform: process.platform,
            arch: process.arch
        };
    }

    /**
     * Get singleton instance
     * @returns {AsarFFmpegResolver} Singleton instance
     */
    static getInstance() {
        if (!AsarFFmpegResolver._instance) {
            AsarFFmpegResolver._instance = new AsarFFmpegResolver();
        }
        return AsarFFmpegResolver._instance;
    }
}

// Static instance holder
AsarFFmpegResolver._instance = null;

// Export singleton instance as default and class for testing
export default AsarFFmpegResolver.getInstance();
export { AsarFFmpegResolver };