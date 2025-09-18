/**
 * Interface for file operations in frontend
 * Defines the contract for file management
 */
class IFileService {
    /**
     * Select folder
     * @returns {Promise<Object>} Folder selection result
     */
    async selectFolder() {
        throw new Error('Method not implemented');
    }

    /**
     * Select file
     * @param {Object} options - File selection options
     * @returns {Promise<Object>} File selection result
     */
    async selectFile(options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Read file
     * @param {string} filePath - Path to file
     * @returns {Promise<Object>} File read result
     */
    async readFile(filePath) {
        throw new Error('Method not implemented');
    }

    /**
     * Write file
     * @param {string} filePath - Path to file
     * @param {string} content - File content
     * @returns {Promise<Object>} File write result
     */
    async writeFile(filePath, content) {
        throw new Error('Method not implemented');
    }

    /**
     * List completed frames
     * @param {string} projectDirectory - Project directory
     * @returns {Promise<Object>} Frames list result
     */
    async listCompletedFrames(projectDirectory) {
        throw new Error('Method not implemented');
    }
}

export default IFileService;