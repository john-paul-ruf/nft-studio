const path = require('path');
const FileSystemService = require('./FileSystemService');
const ImageService = require('./ImageService');

/**
 * Service responsible for frame-related operations only
 * Follows Single Responsibility Principle
 */
class FrameService {
    constructor(fileSystemService = null, imageService = null) {
        // Dependency injection following Dependency Inversion Principle
        this.fileSystemService = fileSystemService || new FileSystemService();
        this.imageService = imageService || new ImageService();
    }

    /**
     * List completed frames in a project directory
     * @param {string} projectDirectory - Project directory path
     * @returns {Promise<Object>} Frames list result
     */
    async listCompletedFrames(projectDirectory) {
        try {
            const framesDir = path.join(projectDirectory, 'frames');

            // Check if frames directory exists
            if (!(await this.fileSystemService.fileExists(framesDir))) {
                return {
                    success: true,
                    frames: [],
                    totalFrames: 0
                };
            }

            // Get image files only
            const imageFilter = /\.(png|jpg|jpeg|gif|webp|bmp)$/i;
            const files = await this.fileSystemService.listFiles(framesDir, imageFilter);

            // Sort files by frame number
            const frameFiles = files.sort((a, b) => {
                const numA = this.imageService.extractFrameNumber(a);
                const numB = this.imageService.extractFrameNumber(b);
                return numA - numB;
            });

            // Create frame objects
            const frames = frameFiles.map(file => ({
                filename: file,
                path: path.join(framesDir, file),
                frameNumber: this.imageService.extractFrameNumber(file)
            }));

            return {
                success: true,
                frames,
                totalFrames: frames.length,
                framesDirectory: framesDir
            };
        } catch (error) {
            console.error('Error listing completed frames:', error);
            return {
                success: false,
                error: error.message,
                frames: [],
                totalFrames: 0
            };
        }
    }

    /**
     * Read frame image as base64
     * @param {string} framePath - Path to frame image
     * @returns {Promise<Object>} Frame image result
     */
    async readFrameImage(framePath) {
        if (!this.imageService.isValidImageExtension(framePath)) {
            return {
                success: false,
                error: 'Invalid image file extension'
            };
        }

        return await this.imageService.readImageAsBase64(framePath);
    }

    /**
     * Validate frame directory structure
     * @param {string} projectDirectory - Project directory path
     * @returns {Promise<Object>} Validation result
     */
    async validateFrameDirectory(projectDirectory) {
        const framesDir = path.join(projectDirectory, 'frames');
        const exists = await this.fileSystemService.fileExists(framesDir);

        return {
            valid: exists,
            framesDirectory: framesDir,
            exists
        };
    }
}

module.exports = FrameService;