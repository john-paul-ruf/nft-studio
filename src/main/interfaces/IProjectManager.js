/**
 * Interface for project management
 * Defines the contract for NFT project operations
 */
class IProjectManager {
    /**
     * Start a new NFT project
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
     * Render a single frame
     * @param {Object} config - Project configuration
     * @param {number} frameNumber - Frame to render
     * @returns {Promise<Object>} Render result
     */
    async renderFrame(config, frameNumber) {
        throw new Error('Method not implemented');
    }
}

export default IProjectManager;