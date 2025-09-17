/**
 * Electron-specific implementation of file service
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class ElectronFileService {
    constructor() {
        // Use the exposed API from preload script
    }

    /**
     * Select folder
     * @returns {Promise<Object>} Folder selection result
     */
    async selectFolder() {
        try {
            const result = await window.api.selectFolder();
            return result;
        } catch (error) {
            console.error('Error selecting folder:', error);
            return { canceled: true };
        }
    }

    /**
     * Select directory (alias for selectFolder)
     * @returns {Promise<Object>} Directory selection result
     */
    async selectDirectory() {
        return await this.selectFolder();
    }

    /**
     * Select file
     * @param {Object} options - File selection options
     * @returns {Promise<Object>} File selection result
     */
    async selectFile(options = {}) {
        try {
            const result = await window.api.selectFile(options);
            return result;
        } catch (error) {
            console.error('Error selecting file:', error);
            return { canceled: true };
        }
    }

    /**
     * Read file
     * @param {string} filePath - Path to file
     * @returns {Promise<Object>} File read result
     */
    async readFile(filePath) {
        try {
            if (!filePath || typeof filePath !== 'string') {
                return {
                    success: false,
                    error: 'Invalid file path'
                };
            }

            const result = await window.api.readFile(filePath);
            return result;
        } catch (error) {
            console.error('Error reading file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Write file
     * @param {string} filePath - Path to file
     * @param {string} content - File content
     * @returns {Promise<Object>} File write result
     */
    async writeFile(filePath, content) {
        try {
            if (!filePath || typeof filePath !== 'string') {
                return {
                    success: false,
                    error: 'Invalid file path'
                };
            }

            if (content === undefined || content === null) {
                return {
                    success: false,
                    error: 'Content is required'
                };
            }

            const result = await window.api.writeFile(filePath, content);
            return result;
        } catch (error) {
            console.error('Error writing file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List completed frames
     * @param {string} projectDirectory - Project directory
     * @returns {Promise<Object>} Frames list result
     */
    async listCompletedFrames(projectDirectory) {
        try {
            if (!projectDirectory || typeof projectDirectory !== 'string') {
                return {
                    success: false,
                    error: 'Invalid project directory',
                    frames: [],
                    totalFrames: 0
                };
            }

            const result = await window.api.listCompletedFrames(projectDirectory);
            return result;
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
        try {
            if (!framePath || typeof framePath !== 'string') {
                return {
                    success: false,
                    error: 'Invalid frame path'
                };
            }

            const result = await window.api.readFrameImage(framePath);
            return result;
        } catch (error) {
            console.error('Error reading frame image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load project configuration from file
     * @param {string} filePath - Path to project file
     * @returns {Promise<Object>} Project load result
     */
    async loadProject(filePath) {
        try {
            const fileResult = await this.readFile(filePath);

            if (!fileResult.success) {
                return {
                    success: false,
                    error: fileResult.error
                };
            }

            const config = JSON.parse(fileResult.content);

            return {
                success: true,
                config
            };
        } catch (error) {
            console.error('Error loading project:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save project configuration to file
     * @param {string} filePath - Path to save project file
     * @param {Object} config - Project configuration
     * @returns {Promise<Object>} Save result
     */
    async saveProject(filePath, config) {
        try {
            if (!config || typeof config !== 'object') {
                return {
                    success: false,
                    error: 'Invalid project configuration'
                };
            }

            const content = JSON.stringify(config, null, 2);
            const result = await this.writeFile(filePath, content);

            return result;
        } catch (error) {
            console.error('Error saving project:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ElectronFileService;