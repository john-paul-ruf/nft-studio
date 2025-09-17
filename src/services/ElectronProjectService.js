// Since we're in the frontend, we'll create a simplified version without the interface dependency

/**
 * Electron-specific implementation of project service
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class ElectronProjectService {
    constructor() {
        // Use the exposed API from preload script
    }

    /**
     * Start a new project
     * @param {Object} projectConfig - Project configuration
     * @returns {Promise<Object>} Project creation result
     */
    async startNewProject(projectConfig) {
        try {
            const validation = this.validateProjectConfig(projectConfig);
            if (!validation.valid) {
                return {
                    success: false,
                    errors: validation.errors
                };
            }

            const result = await window.api.startNewProject(projectConfig);
            return result;
        } catch (error) {
            console.error('Error starting new project:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Resume an existing project
     * @param {string} settingsPath - Path to project settings
     * @returns {Promise<Object>} Project resume result
     */
    async resumeProject(settingsPath) {
        try {
            if (!settingsPath || typeof settingsPath !== 'string') {
                return {
                    success: false,
                    error: 'Invalid settings path'
                };
            }

            const result = await window.api.resumeProject(settingsPath);
            return result;
        } catch (error) {
            console.error('Error resuming project:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load user preferences
     * @returns {Promise<Object>} User preferences
     */
    async loadPreferences() {
        try {
            const PreferencesService = await import('./PreferencesService.js');
            return await PreferencesService.default.getPreferences();
        } catch (error) {
            console.error('Error loading preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    /**
     * Save user preferences
     * @param {Object} preferences - Preferences to save
     * @returns {Promise<boolean>} Success status
     */
    async savePreferences(preferences) {
        try {
            if (!preferences || typeof preferences !== 'object') {
                return false;
            }

            const PreferencesService = await import('./PreferencesService.js');
            return await PreferencesService.default.savePreferences(preferences);
        } catch (error) {
            console.error('Error saving preferences:', error);
            return false;
        }
    }

    /**
     * Validate project configuration
     * @param {Object} config - Project configuration
     * @returns {Object} Validation result
     */
    validateProjectConfig(config) {
        const errors = [];

        if (!config) {
            errors.push('Project configuration is required');
            return { valid: false, errors };
        }

        // Validate required fields
        if (!config.projectName || config.projectName.trim() === '') {
            errors.push('Project name is required');
        }

        if (!config.projectDirectory || config.projectDirectory.trim() === '') {
            errors.push('Project directory is required');
        }

        if (!config.resolution) {
            errors.push('Resolution is required');
        }

        if (!config.numberOfFrames || config.numberOfFrames < 1) {
            errors.push('Number of frames must be at least 1');
        }

        // Validate project name format
        if (config.projectName && !/^[a-zA-Z0-9\s\-_]+$/.test(config.projectName)) {
            errors.push('Project name contains invalid characters');
        }

        // Validate effects structure
        if (config.effects && typeof config.effects !== 'object') {
            errors.push('Effects must be an object');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get default preferences
     * @returns {Object} Default preferences
     */
    getDefaultPreferences() {
        return {
            colorSchemes: {
                favorites: [],
                defaultScheme: 'neon-cyberpunk'
            },
            project: {
                lastProjectName: '',
                lastArtist: '',
                lastResolution: 'hd',
                lastProjectDirectory: ''
            },
            lastModified: new Date().toISOString()
        };
    }

    /**
     * Render single frame
     * @param {Object} config - Project configuration
     * @param {number} frameNumber - Frame number to render
     * @returns {Promise<Object>} Render result
     */
    async renderFrame(config, frameNumber) {
        try {
            const result = await window.api.renderFrame(config, frameNumber);
            return result;
        } catch (error) {
            console.error('Error rendering frame:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ElectronProjectService;