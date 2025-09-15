const { ipcRenderer } = window.require('electron');

/**
 * Service for managing user preferences that persist between runs
 */
export class PreferencesService {
    static PREFERENCES_FILE = 'user-preferences.json';

    /**
     * Get all user preferences
     * @returns {Promise<Object>} User preferences
     */
    static async getPreferences() {
        try {
            const result = await ipcRenderer.invoke('read-file', this.PREFERENCES_FILE);

            if (result.success) {
                return JSON.parse(result.content);
            } else {
                // File doesn't exist yet, return default preferences
                return this.getDefaultPreferences();
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    /**
     * Get default preferences structure
     * @returns {Object} Default preferences
     */
    static getDefaultPreferences() {
        return {
            colorSchemes: {
                favorites: [], // Array of color scheme IDs
                defaultScheme: 'neon-cyberpunk' // Default color scheme ID
            },
            project: {
                lastProjectName: '', // Last used project name
                lastArtist: '', // Last used artist name
                lastResolution: 'hd', // Last used resolution
                lastProjectDirectory: '' // Last used project directory
            },
            lastModified: new Date().toISOString()
        };
    }

    /**
     * Save user preferences
     * @param {Object} preferences - Preferences to save
     * @returns {Promise<boolean>} Success status
     */
    static async savePreferences(preferences) {
        try {
            const updatedPreferences = {
                ...preferences,
                lastModified: new Date().toISOString()
            };

            const result = await ipcRenderer.invoke('write-file',
                this.PREFERENCES_FILE,
                JSON.stringify(updatedPreferences, null, 2)
            );

            return result.success;
        } catch (error) {
            console.error('Error saving preferences:', error);
            return false;
        }
    }

    /**
     * Get favorite color schemes
     * @returns {Promise<Array>} Array of favorite color scheme IDs
     */
    static async getFavoriteColorSchemes() {
        const preferences = await this.getPreferences();
        return preferences.colorSchemes?.favorites || [];
    }

    /**
     * Add a color scheme to favorites
     * @param {string} schemeId - Color scheme ID to add to favorites
     * @returns {Promise<boolean>} Success status
     */
    static async addFavoriteColorScheme(schemeId) {
        try {
            const preferences = await this.getPreferences();

            if (!preferences.colorSchemes) {
                preferences.colorSchemes = this.getDefaultPreferences().colorSchemes;
            }

            if (!preferences.colorSchemes.favorites.includes(schemeId)) {
                preferences.colorSchemes.favorites.push(schemeId);
                return await this.savePreferences(preferences);
            }

            return true; // Already in favorites
        } catch (error) {
            console.error('Error adding favorite color scheme:', error);
            return false;
        }
    }

    /**
     * Remove a color scheme from favorites
     * @param {string} schemeId - Color scheme ID to remove from favorites
     * @returns {Promise<boolean>} Success status
     */
    static async removeFavoriteColorScheme(schemeId) {
        try {
            const preferences = await this.getPreferences();

            if (!preferences.colorSchemes) {
                return true; // Nothing to remove
            }

            const index = preferences.colorSchemes.favorites.indexOf(schemeId);
            if (index > -1) {
                preferences.colorSchemes.favorites.splice(index, 1);
                return await this.savePreferences(preferences);
            }

            return true; // Not in favorites
        } catch (error) {
            console.error('Error removing favorite color scheme:', error);
            return false;
        }
    }

    /**
     * Check if a color scheme is favorited
     * @param {string} schemeId - Color scheme ID to check
     * @returns {Promise<boolean>} True if favorited
     */
    static async isColorSchemeFavorited(schemeId) {
        const favorites = await this.getFavoriteColorSchemes();
        return favorites.includes(schemeId);
    }

    /**
     * Get the default color scheme
     * @returns {Promise<string>} Default color scheme ID
     */
    static async getDefaultColorScheme() {
        const preferences = await this.getPreferences();
        return preferences.colorSchemes?.defaultScheme || 'neon-cyberpunk';
    }

    /**
     * Set the default color scheme
     * @param {string} schemeId - Color scheme ID to set as default
     * @returns {Promise<boolean>} Success status
     */
    static async setDefaultColorScheme(schemeId) {
        try {
            const preferences = await this.getPreferences();

            if (!preferences.colorSchemes) {
                preferences.colorSchemes = this.getDefaultPreferences().colorSchemes;
            }

            preferences.colorSchemes.defaultScheme = schemeId;
            return await this.savePreferences(preferences);
        } catch (error) {
            console.error('Error setting default color scheme:', error);
            return false;
        }
    }

    /**
     * Toggle favorite status of a color scheme
     * @param {string} schemeId - Color scheme ID to toggle
     * @returns {Promise<boolean>} New favorite status (true if now favorited)
     */
    static async toggleFavoriteColorScheme(schemeId) {
        const isFavorited = await this.isColorSchemeFavorited(schemeId);

        if (isFavorited) {
            await this.removeFavoriteColorScheme(schemeId);
            return false;
        } else {
            await this.addFavoriteColorScheme(schemeId);
            return true;
        }
    }

    /**
     * Get the last used project name
     * @returns {Promise<string>} Last project name
     */
    static async getLastProjectName() {
        const preferences = await this.getPreferences();
        return preferences.project?.lastProjectName || '';
    }

    /**
     * Get the last used artist name
     * @returns {Promise<string>} Last artist name
     */
    static async getLastArtist() {
        const preferences = await this.getPreferences();
        return preferences.project?.lastArtist || '';
    }

    /**
     * Save the last used project name and artist
     * @param {string} projectName - Project name to remember
     * @param {string} artist - Artist name to remember
     * @returns {Promise<boolean>} Success status
     */
    static async saveLastProjectInfo(projectName, artist, resolution = null, projectDirectory = null) {
        try {
            const preferences = await this.getPreferences();

            if (!preferences.project) {
                preferences.project = this.getDefaultPreferences().project;
            }

            preferences.project.lastProjectName = projectName || '';
            preferences.project.lastArtist = artist || '';

            if (resolution !== null) {
                preferences.project.lastResolution = resolution;
            }
            if (projectDirectory !== null) {
                preferences.project.lastProjectDirectory = projectDirectory;
            }

            return await this.savePreferences(preferences);
        } catch (error) {
            console.error('Error saving last project info:', error);
            return false;
        }
    }

    /**
     * Get all last project info
     * @returns {Promise<Object>} Object with lastProjectName, lastArtist, lastResolution, and lastProjectDirectory
     */
    static async getLastProjectInfo() {
        const preferences = await this.getPreferences();
        return {
            lastProjectName: preferences.project?.lastProjectName || '',
            lastArtist: preferences.project?.lastArtist || '',
            lastResolution: preferences.project?.lastResolution || 'hd',
            lastProjectDirectory: preferences.project?.lastProjectDirectory || ''
        };
    }
}

export default PreferencesService;