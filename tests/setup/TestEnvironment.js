import TestServiceFactory from './TestServiceFactory.js';
import TempResourceManager from './TempResourceManager.js';
import path from 'path';
import os from 'os';

/**
 * Real Objects Test Environment
 * Creates isolated environment with real services for testing
 * Ensures complete cleanup after each test
 */
class TestEnvironment {
    constructor() {
        this.serviceFactory = null;
        this.tempManager = new TempResourceManager();
        this.testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.testDirectory = null;
        this.originalProcessEnv = null;
    }

    /**
     * Setup isolated test environment with real services
     * @returns {Promise<TestEnvironment>} Configured test environment
     */
    async setup() {
        console.log(`🧪 Setting up real objects test environment: ${this.testId}`);
        
        // Create isolated temp directory for this test
        this.testDirectory = await this.tempManager.createTempDirectory(this.testId);
        
        // Backup original environment
        this.originalProcessEnv = { ...process.env };
        
        // Configure test-specific environment
        process.env.NODE_ENV = 'test';
        process.env.NFT_STUDIO_TEST_DATA_DIR = this.testDirectory;
        
        // Create test service factory with real objects (not mocks!)
        this.serviceFactory = new TestServiceFactory(this.testDirectory);
        
        // Configure services to use test directories
        await this.configureTestServices();
        
        console.log(`✅ Test environment ready: ${this.testDirectory}`);
        return this;
    }

    /**
     * Configure test services (already configured in TestServiceFactory)
     */
    async configureTestServices() {
        // Test services are already configured to use test directory
        // No additional configuration needed
    }

    /**
     * Get real FileSystemService configured for testing
     * @returns {FileSystemService} Real service instance
     */
    getFileSystemService() {
        return this.serviceFactory.getService('fileSystemService');
    }

    /**
     * Get real ProjectManager service
     * @returns {NftProjectManager} Real service instance
     */
    getProjectManager() {
        return this.serviceFactory.getProjectManager();
    }

    /**
     * Get real EffectsManager service
     * @returns {NftEffectsManager} Real service instance
     */
    getEffectsManager() {
        return this.serviceFactory.getEffectsManager();
    }

    /**
     * Get real FileOperations service
     * @returns {ElectronFileOperations} Real service instance
     */
    getFileOperations() {
        return this.serviceFactory.getFileOperations();
    }

    /**
     * Get any service by name
     * @param {string} serviceName - Service name
     * @returns {*} Real service instance
     */
    getService(serviceName) {
        return this.serviceFactory.getService(serviceName);
    }

    /**
     * Get the dependency container for advanced testing
     * @returns {DependencyContainer} Real container instance
     */
    getContainer() {
        return this.serviceFactory.getContainer();
    }

    /**
     * Get test directory path
     * @returns {string} Test directory path
     */
    getTestDirectory() {
        return this.testDirectory;
    }

    /**
     * Create a test file with content
     * @param {string} fileName - File name
     * @param {string} content - File content
     * @returns {Promise<string>} Full file path
     */
    async createTestFile(fileName, content = '') {
        return this.tempManager.createTempFile(fileName, content);
    }

    /**
     * Create a test directory
     * @param {string} dirName - Directory name
     * @returns {Promise<string>} Full directory path
     */
    async createTestDirectory(dirName) {
        return this.tempManager.createTempSubDirectory(dirName);
    }

    /**
     * Complete cleanup of all test resources
     * CRITICAL: Always call this in finally block
     */
    async cleanup() {
        console.log(`🧹 Cleaning up test environment: ${this.testId}`);
        
        try {
            // Clean up all temporary resources
            await this.tempManager.cleanup();
            
            // Reset service factory state
            if (this.serviceFactory) {
                this.serviceFactory.getContainer().clear();
            }
            
            // Restore original environment
            if (this.originalProcessEnv) {
                process.env = this.originalProcessEnv;
            }
            
            console.log(`✅ Test environment cleaned up: ${this.testId}`);
            
        } catch (error) {
            console.error(`⚠️ Cleanup error for ${this.testId}:`, error.message);
            // Don't throw - cleanup should be best effort
        }
    }

    /**
     * Verify cleanup was successful
     * @returns {Promise<boolean>} True if cleanup was complete
     */
    async verifyCleanup() {
        return this.tempManager.verifyCleanup();
    }
}

export default TestEnvironment;