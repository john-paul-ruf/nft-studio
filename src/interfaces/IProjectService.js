/**
 * Interface for project-related operations in frontend
 * Defines the contract for project management
 */
class IProjectService {
    /**
     * Start a new project
     * @param {Object} projectConfig - Project configuration
     * @returns {Promise<Object>} Project creation result
     */
    async startNewProject(projectConfig) {
        throw new Error('Method not implemented');
    }

    /**
     * Resume an existing project
     * @param {string} settingsPath - Path to project settings
     * @returns {Promise<Object>} Project resume result
     */
    async resumeProject(settingsPath) {
        throw new Error('Method not implemented');
    }

    /**
     * Load user preferences
     * @returns {Promise<Object>} User preferences
     */
    async loadPreferences() {
        throw new Error('Method not implemented');
    }

    /**
     * Save user preferences
     * @param {Object} preferences - Preferences to save
     * @returns {Promise<boolean>} Success status
     */
    async savePreferences(preferences) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate project configuration
     * @param {Object} config - Project configuration
     * @returns {Object} Validation result
     */
    validateProjectConfig(config) {
        throw new Error('Method not implemented');
    }
}

export default IProjectService;