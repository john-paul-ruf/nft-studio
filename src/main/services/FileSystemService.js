const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

/**
 * Service responsible for file system operations only
 * Follows Single Responsibility Principle
 */
class FileSystemService {
    /**
     * Read file from filesystem
     * @param {string} filePath - Path to file
     * @returns {Promise<Object>} File read result
     */
    async readFile(filePath) {
        try {
            // If it's just a filename (like user-preferences.json), use app data directory
            if (!path.isAbsolute(filePath) && !filePath.includes(path.sep)) {
                filePath = path.join(app.getPath('userData'), filePath);
                console.log('📁 Reading file from userData:', filePath);
            }

            const content = await fs.readFile(filePath, 'utf8');
            return { success: true, content };
        } catch (error) {
            console.log('📁 File read failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Write file to filesystem
     * @param {string} filePath - Path to file
     * @param {string} content - File content
     * @returns {Promise<Object>} Write result
     */
    async writeFile(filePath, content) {
        try {
            // If it's just a filename (like user-preferences.json), use app data directory
            if (!path.isAbsolute(filePath) && !filePath.includes(path.sep)) {
                filePath = path.join(app.getPath('userData'), filePath);
                console.log('📁 Writing file to userData:', filePath);
            }

            await fs.writeFile(filePath, content, 'utf8');
            return { success: true };
        } catch (error) {
            console.log('📁 File write failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if file exists
     * @param {string} filePath - Path to file
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * List files in directory
     * @param {string} directoryPath - Path to directory
     * @param {RegExp} filter - Optional file filter regex
     * @returns {Promise<Array>} Array of file names
     */
    async listFiles(directoryPath, filter = null) {
        try {
            const files = await fs.readdir(directoryPath);
            return filter ? files.filter(file => filter.test(file)) : files;
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }

    /**
     * Create directory if it doesn't exist
     * @param {string} directoryPath - Path to directory
     * @returns {Promise<boolean>} True if successful
     */
    async ensureDirectory(directoryPath) {
        try {
            await fs.mkdir(directoryPath, { recursive: true });
            return true;
        } catch (error) {
            console.error('Error creating directory:', error);
            return false;
        }
    }
}

module.exports = FileSystemService;