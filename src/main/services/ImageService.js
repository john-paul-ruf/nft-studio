import { promises as fs } from 'fs';
import path from 'path';
import SafeConsole from '../utils/SafeConsole.js';

/**
 * Service responsible for image operations only
 * Follows Single Responsibility Principle
 */
class ImageService {
    /**
     * Read image file as base64
     * @param {string} imagePath - Path to image
     * @returns {Promise<Object>} Image read result
     */
    async readImageAsBase64(imagePath) {
        try {
            const fullPath = path.resolve(imagePath);
            const imageBuffer = await fs.readFile(fullPath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = this.getMimeTypeFromPath(fullPath);

            return {
                success: true,
                data: `data:${mimeType};base64,${base64Image}`
            };
        } catch (error) {
            SafeConsole.error('Error reading image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get MIME type from file extension
     * @param {string} filePath - Path to file
     * @returns {string} MIME type
     */
    getMimeTypeFromPath(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Validate image file extension
     * @param {string} filePath - Path to file
     * @returns {boolean} True if valid image extension
     */
    isValidImageExtension(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
        return validExtensions.includes(ext);
    }

    /**
     * Extract frame number from filename
     * @param {string} filename - Image filename
     * @returns {number} Frame number or 0 if not found
     */
    extractFrameNumber(filename) {
        const match = filename.match(/(\d+)/);
        return match ? parseInt(match[0]) : 0;
    }
}

export default ImageService;