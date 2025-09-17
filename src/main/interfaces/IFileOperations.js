/**
 * Interface for file operations
 * Defines the contract for file system interactions
 */
class IFileOperations {
    /**
     * Open folder selection dialog
     * @returns {Promise<Object>} Dialog result
     */
    async selectFolder() {
        throw new Error('Method not implemented');
    }

    /**
     * Open file selection dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<Object>} Dialog result
     */
    async selectFile(options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Read file from filesystem
     * @param {string} filePath - Path to file
     * @returns {Promise<Object>} File read result
     */
    async readFile(filePath) {
        throw new Error('Method not implemented');
    }

    /**
     * Write file to filesystem
     * @param {string} filePath - Path to file
     * @param {string} content - File content
     * @returns {Promise<Object>} Write result
     */
    async writeFile(filePath, content) {
        throw new Error('Method not implemented');
    }
}

module.exports = IFileOperations;