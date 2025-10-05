import ProjectPersistenceService from './ProjectPersistenceService.js';

/**
 * Service to manage ProjectState lifecycle and coordinate between
 * UI updates, persistence, and other state-dependent operations
 */
export default class ProjectStateManager {
    constructor() {
        this.projectState = null;
        this.persistenceService = null;
        this.updateCallbacks = new Set();
    }

    /**
     * Initialize the manager with a ProjectState instance
     * @param {ProjectState} projectState - The project state to manage
     * @param {string} outputDirectory - Directory for auto-saving (optional)
     */
    async initialize(projectState, outputDirectory = null) {
        this.projectState = projectState;

        // Set up persistence if output directory is provided
        if (outputDirectory) {
            this.persistenceService = new ProjectPersistenceService();
            await this.persistenceService.setCurrentProject(projectState, outputDirectory);
        }

        // Store the existing onUpdate callback (which includes persistence service callback)
        const existingOnUpdate = projectState.core.onUpdate;

        // Set up our own callback that chains with the existing one
        projectState.core.onUpdate = (newState) => {
            // First call the existing callback (persistence service auto-save)
            if (existingOnUpdate) {
                existingOnUpdate(newState);
            }

            // Then notify all our registered callbacks
            this.updateCallbacks.forEach((callback, index) => {
                try {
                    callback(newState);
                } catch (error) {
                    console.error('Error in ProjectState update callback:', error);
                }
            });
        };
    }

    /**
     * Register a callback to be called when the project state updates
     * @param {Function} callback - Callback to register
     */
    onUpdate(callback) {
        this.updateCallbacks.add(callback);

        // Return unsubscribe function
        return () => {
            this.updateCallbacks.delete(callback);
        };
    }

    /**
     * Get the managed project state
     * @returns {ProjectState|null}
     */
    getProjectState() {
        return this.projectState;
    }

    /**
     * Get the persistence service
     * @returns {ProjectPersistenceService|null}
     */
    getPersistenceService() {
        return this.persistenceService;
    }

    /**
     * Force save the current project
     * @returns {Promise<boolean>} Success status
     */
    async forceSave() {
        if (this.persistenceService) {
            return await this.persistenceService.forceSave();
        }
        return false;
    }

    /**
     * Update the project state (convenience method)
     * @param {Object} updates - Updates to apply
     */
    updateState(updates) {
        if (this.projectState) {
            this.projectState.update(updates);
        }
    }

    /**
     * Set up persistence for an existing project
     * @param {string} outputDirectory - Directory for auto-saving
     */
    async setupPersistence(outputDirectory) {
        if (this.projectState && !this.persistenceService) {
            this.persistenceService = new ProjectPersistenceService();
            await this.persistenceService.setCurrentProject(this.projectState, outputDirectory);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.updateCallbacks.clear();
        if (this.persistenceService) {
            this.persistenceService.clearProject();
        }
        this.projectState = null;
        this.persistenceService = null;
    }
}