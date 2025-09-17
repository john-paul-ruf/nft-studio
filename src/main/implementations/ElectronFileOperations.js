const DialogService = require('../services/DialogService');
const FileSystemService = require('../services/FileSystemService');
const FrameService = require('../services/FrameService');

/**
 * Electron-specific implementation of file operations
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class ElectronFileOperations {
    constructor(dialogService = null, fileSystemService = null, frameService = null) {
        // Dependency injection following Dependency Inversion Principle
        this.dialogService = dialogService || new DialogService();
        this.fileSystemService = fileSystemService || new FileSystemService();
        this.frameService = frameService || new FrameService();
    }

    /**
     * Open folder selection dialog
     * @returns {Promise<Object>} Dialog result
     */
    async selectFolder() {
        return await this.dialogService.showFolderDialog();
    }

    /**
     * Open directory selection dialog (alias for selectFolder)
     * @returns {Promise<Object>} Dialog result
     */
    async selectDirectory() {
        return await this.selectFolder();
    }

    /**
     * Open file selection dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<Object>} Dialog result
     */
    async selectFile(options = {}) {
        return await this.dialogService.showFileDialog(options);
    }

    /**
     * Read file from filesystem
     * @param {string} filePath - Path to file
     * @returns {Promise<Object>} File read result
     */
    async readFile(filePath) {
        return await this.fileSystemService.readFile(filePath);
    }

    /**
     * Write file to filesystem
     * @param {string} filePath - Path to file
     * @param {string} content - File content
     * @returns {Promise<Object>} Write result
     */
    async writeFile(filePath, content) {
        return await this.fileSystemService.writeFile(filePath, content);
    }

    /**
     * Read frame image as base64
     * @param {string} framePath - Path to frame image
     * @returns {Promise<Object>} Frame image result
     */
    async readFrameImage(framePath) {
        return await this.frameService.readFrameImage(framePath);
    }

    /**
     * List completed frames in project directory
     * @param {string} projectDirectory - Project directory path
     * @returns {Promise<Object>} Frames list result
     */
    async listCompletedFrames(projectDirectory) {
        return await this.frameService.listCompletedFrames(projectDirectory);
    }
}

module.exports = ElectronFileOperations;