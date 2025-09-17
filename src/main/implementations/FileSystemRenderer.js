const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

/**
 * File System based rendering approach
 * Saves frames to temp files and returns file:// URLs
 */
class FileSystemRenderer {
    constructor() {
        this.tempDir = path.join(app.getPath('temp'), 'nft-studio-frames');
        this.frameCache = new Map();
        this.ensureTempDir();
        this.cleanOldFrames(); // Clean up on startup
    }

    /**
     * Ensure temp directory exists
     */
    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Clean old frame files (older than 1 hour)
     */
    cleanOldFrames() {
        const ONE_HOUR = 60 * 60 * 1000;
        const now = Date.now();

        try {
            const files = fs.readdirSync(this.tempDir);
            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtime.getTime() > ONE_HOUR) {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned old frame: ${file}`);
                }
            }
        } catch (error) {
            console.warn('Failed to clean old frames:', error.message);
        }
    }

    /**
     * Save frame buffer to file and return path
     * @param {Buffer|Uint8Array|ArrayBuffer} frameBuffer - The frame data
     * @param {number} frameNumber - Frame number
     * @returns {Object} Result with file path
     */
    saveFrame(frameBuffer, frameNumber) {
        try {
            // Convert to Buffer if needed
            let buffer;
            if (Buffer.isBuffer(frameBuffer)) {
                buffer = frameBuffer;
            } else if (frameBuffer instanceof Uint8Array) {
                buffer = Buffer.from(frameBuffer);
            } else if (frameBuffer instanceof ArrayBuffer) {
                buffer = Buffer.from(frameBuffer);
            } else if (typeof frameBuffer === 'string') {
                // Assume base64
                buffer = Buffer.from(frameBuffer, 'base64');
            } else {
                throw new Error(`Unsupported frame buffer type: ${typeof frameBuffer}`);
            }

            // Generate unique filename
            const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
            const filename = `frame-${frameNumber}-${hash}-${Date.now()}.png`;
            const filePath = path.join(this.tempDir, filename);

            // Write to file
            fs.writeFileSync(filePath, buffer);

            // Cache the path
            this.frameCache.set(frameNumber, filePath);

            // Clean old frames periodically
            if (Math.random() < 0.1) { // 10% chance
                this.cleanOldFrames();
            }

            return {
                success: true,
                filePath: filePath,
                fileBuffer: buffer, // Send the actual buffer instead of file URL
                size: buffer.length,
                method: 'filesystem'
            };

        } catch (error) {
            console.error('Failed to save frame:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get cached frame path
     * @param {number} frameNumber - Frame number
     * @returns {string|null} File path or null
     */
    getCachedFrame(frameNumber) {
        const filePath = this.frameCache.get(frameNumber);
        if (filePath && fs.existsSync(filePath)) {
            return filePath;
        }
        this.frameCache.delete(frameNumber);
        return null;
    }

    /**
     * Clear all temp files
     */
    clearAll() {
        try {
            const files = fs.readdirSync(this.tempDir);
            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                fs.unlinkSync(filePath);
            }
            this.frameCache.clear();
            console.log('Cleared all frame files');
        } catch (error) {
            console.error('Failed to clear frames:', error);
        }
    }
}

module.exports = FileSystemRenderer;