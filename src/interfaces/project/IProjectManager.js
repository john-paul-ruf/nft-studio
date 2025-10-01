/**
 * Interface for Project Management Operations
 * 
 * This interface defines the contract for managing NFT projects,
 * including creation, loading, saving, and lifecycle management.
 * 
 * @interface IProjectManager
 */
export class IProjectManager {
    /**
     * Creates a new NFT project with the provided settings
     * 
     * @param {Object} settings - Project configuration settings
     * @param {string} settings.name - Project name
     * @param {string} settings.outputPath - Output directory path
     * @param {Object} settings.dimensions - Project dimensions
     * @param {Array} settings.effects - Initial effects configuration
     * @returns {Promise<Object>} Created project object
     * @throws {ValidationError} When settings are invalid
     * @throws {FileSystemError} When output path is inaccessible
     */
    async createProject(settings) {
        throw new Error('IProjectManager.createProject() must be implemented');
    }

    /**
     * Loads an existing project from the specified path
     * 
     * @param {string} projectPath - Path to the project file
     * @returns {Promise<Object>} Loaded project object
     * @throws {FileNotFoundError} When project file doesn't exist
     * @throws {ValidationError} When project file is corrupted
     */
    async loadProject(projectPath) {
        throw new Error('IProjectManager.loadProject() must be implemented');
    }

    /**
     * Saves the current project state to disk
     * 
     * @param {Object} project - Project object to save
     * @param {string} [savePath] - Optional custom save path
     * @returns {Promise<string>} Path where project was saved
     * @throws {FileSystemError} When save operation fails
     */
    async saveProject(project, savePath = null) {
        throw new Error('IProjectManager.saveProject() must be implemented');
    }

    /**
     * Validates project settings and structure
     * 
     * @param {Object} project - Project object to validate
     * @returns {Promise<ValidationResult>} Validation result with errors/warnings
     */
    async validateProject(project) {
        throw new Error('IProjectManager.validateProject() must be implemented');
    }

    /**
     * Gets the current project state
     * 
     * @returns {Object|null} Current project or null if none loaded
     */
    getCurrentProject() {
        throw new Error('IProjectManager.getCurrentProject() must be implemented');
    }

    /**
     * Closes the current project and cleans up resources
     * 
     * @returns {Promise<void>}
     */
    async closeProject() {
        throw new Error('IProjectManager.closeProject() must be implemented');
    }
}

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the project is valid
 * @property {Array<string>} errors - List of validation errors
 * @property {Array<string>} warnings - List of validation warnings
 */