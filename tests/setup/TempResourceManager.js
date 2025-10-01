import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Temporary Resource Manager
 * Manages creation and cleanup of temporary files and directories for testing
 * Ensures no test pollution and complete resource cleanup
 */
class TempResourceManager {
    constructor() {
        this.tempDirectories = [];
        this.tempFiles = [];
        this.createdResources = new Set();
        this.baseTestDir = path.join(os.tmpdir(), 'nft-studio-tests');
    }

    /**
     * Create temporary directory for test
     * @param {string} testId - Unique test identifier
     * @returns {Promise<string>} Path to created directory
     */
    async createTempDirectory(testId) {
        const tempDir = path.join(this.baseTestDir, testId);
        
        try {
            await fs.mkdir(tempDir, { recursive: true });
            this.tempDirectories.push(tempDir);
            this.createdResources.add(tempDir);
            
            console.log(`📁 Created test directory: ${tempDir}`);
            return tempDir;
            
        } catch (error) {
            console.error(`Failed to create temp directory ${tempDir}:`, error.message);
            throw error;
        }
    }

    /**
     * Create subdirectory within test directory
     * @param {string} dirName - Directory name
     * @returns {Promise<string>} Path to created subdirectory
     */
    async createTempSubDirectory(dirName) {
        if (this.tempDirectories.length === 0) {
            throw new Error('No base temp directory created. Call createTempDirectory first.');
        }
        
        const subDir = path.join(this.tempDirectories[0], dirName);
        
        try {
            await fs.mkdir(subDir, { recursive: true });
            this.createdResources.add(subDir);
            
            console.log(`📁 Created test subdirectory: ${subDir}`);
            return subDir;
            
        } catch (error) {
            console.error(`Failed to create subdirectory ${subDir}:`, error.message);
            throw error;
        }
    }

    /**
     * Create temporary file with content
     * @param {string} fileName - File name
     * @param {string} content - File content
     * @returns {Promise<string>} Path to created file
     */
    async createTempFile(fileName, content = '') {
        if (this.tempDirectories.length === 0) {
            throw new Error('No temp directory created. Call createTempDirectory first.');
        }
        
        const tempFile = path.join(this.tempDirectories[0], fileName);
        
        try {
            // Ensure directory exists
            const dir = path.dirname(tempFile);
            await fs.mkdir(dir, { recursive: true });
            
            // Write file
            await fs.writeFile(tempFile, content, 'utf8');
            this.tempFiles.push(tempFile);
            this.createdResources.add(tempFile);
            
            console.log(`📄 Created test file: ${tempFile}`);
            return tempFile;
            
        } catch (error) {
            console.error(`Failed to create temp file ${tempFile}:`, error.message);
            throw error;
        }
    }

    /**
     * Create test JSON file with object data
     * @param {string} fileName - File name (should end with .json)
     * @param {Object} data - Data to serialize as JSON
     * @returns {Promise<string>} Path to created file
     */
    async createTempJsonFile(fileName, data) {
        const content = JSON.stringify(data, null, 2);
        return this.createTempFile(fileName, content);
    }

    /**
     * Get list of all created resources
     * @returns {Array<string>} Array of resource paths
     */
    getCreatedResources() {
        return Array.from(this.createdResources);
    }

    /**
     * Check if resource exists
     * @param {string} resourcePath - Path to check
     * @returns {Promise<boolean>} True if resource exists
     */
    async resourceExists(resourcePath) {
        try {
            await fs.access(resourcePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Complete cleanup of all created resources
     * Removes all files and directories created during test
     */
    async cleanup() {
        console.log(`🧹 Starting cleanup of ${this.createdResources.size} resources`);
        
        const cleanupResults = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Sort resources by depth (deepest first) to avoid directory-not-empty errors
        const sortedResources = Array.from(this.createdResources).sort((a, b) => {
            const depthA = a.split(path.sep).length;
            const depthB = b.split(path.sep).length;
            return depthB - depthA; // Deepest first
        });

        for (const resource of sortedResources) {
            try {
                const exists = await this.resourceExists(resource);
                if (!exists) {
                    cleanupResults.success++;
                    continue;
                }

                const stats = await fs.stat(resource);
                
                if (stats.isDirectory()) {
                    await fs.rmdir(resource, { recursive: true });
                    console.log(`🗑️ Removed directory: ${resource}`);
                } else {
                    await fs.unlink(resource);
                    console.log(`🗑️ Removed file: ${resource}`);
                }
                
                cleanupResults.success++;
                
            } catch (error) {
                cleanupResults.failed++;
                cleanupResults.errors.push({ resource, error: error.message });
                console.warn(`⚠️ Failed to clean up ${resource}:`, error.message);
            }
        }

        // Clear tracking arrays
        this.tempDirectories = [];
        this.tempFiles = [];
        this.createdResources.clear();

        console.log(`✅ Cleanup complete: ${cleanupResults.success} success, ${cleanupResults.failed} failed`);
        
        if (cleanupResults.failed > 0) {
            console.warn('⚠️ Some resources could not be cleaned up:', cleanupResults.errors);
        }

        return cleanupResults;
    }

    /**
     * Verify that cleanup was successful
     * @returns {Promise<boolean>} True if all resources were cleaned up
     */
    async verifyCleanup() {
        if (this.createdResources.size > 0) {
            console.error(`❌ Cleanup verification failed: ${this.createdResources.size} resources still tracked`);
            return false;
        }

        // Check if base test directory is empty or doesn't exist
        try {
            const exists = await this.resourceExists(this.baseTestDir);
            if (exists) {
                const files = await fs.readdir(this.baseTestDir);
                if (files.length > 0) {
                    console.warn(`⚠️ Base test directory not empty: ${files.length} items remaining`);
                    return false;
                }
            }
        } catch (error) {
            console.warn('Could not verify base test directory cleanup:', error.message);
        }

        console.log('✅ Cleanup verification passed');
        return true;
    }

    /**
     * Emergency cleanup - removes entire test base directory
     * Use only when normal cleanup fails
     */
    async emergencyCleanup() {
        console.log('🚨 Performing emergency cleanup of entire test directory');
        
        try {
            const exists = await this.resourceExists(this.baseTestDir);
            if (exists) {
                await fs.rmdir(this.baseTestDir, { recursive: true });
                console.log(`🗑️ Emergency cleanup: removed ${this.baseTestDir}`);
            }
            
            // Clear all tracking
            this.tempDirectories = [];
            this.tempFiles = [];
            this.createdResources.clear();
            
            return true;
            
        } catch (error) {
            console.error('❌ Emergency cleanup failed:', error.message);
            return false;
        }
    }
}

export default TempResourceManager;