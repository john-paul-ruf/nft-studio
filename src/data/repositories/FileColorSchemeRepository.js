const IColorSchemeRepository = require('../interfaces/IColorSchemeRepository');

/**
 * File-based color scheme repository implementation
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class FileColorSchemeRepository extends IColorSchemeRepository {
    constructor(fileService, predefinedSchemes = null) {
        super();
        this.fileService = fileService;
        this.predefinedSchemes = predefinedSchemes || this.getDefaultPredefinedSchemes();
        this.CUSTOM_SCHEMES_FILE = 'custom-color-schemes.json';
    }

    /**
     * Get all color schemes (predefined + custom)
     * @returns {Promise<Object>} All color schemes
     */
    async getAllColorSchemes() {
        try {
            const customSchemes = await this.loadCustomSchemes();
            return {
                ...this.predefinedSchemes,
                ...customSchemes
            };
        } catch (error) {
            console.error('Error loading color schemes:', error);
            return this.predefinedSchemes;
        }
    }

    /**
     * Get color scheme by ID
     * @param {string} schemeId - Color scheme ID
     * @returns {Promise<Object|null>} Color scheme or null
     */
    async getColorScheme(schemeId) {
        const allSchemes = await this.getAllColorSchemes();
        return allSchemes[schemeId] || null;
    }

    /**
     * Save color scheme
     * @param {Object} colorScheme - Color scheme to save
     * @returns {Promise<boolean>} Success status
     */
    async saveColorScheme(colorScheme) {
        try {
            // Don't allow overwriting predefined schemes
            if (this.predefinedSchemes[colorScheme.id]) {
                console.warn(`Cannot overwrite predefined color scheme: ${colorScheme.id}`);
                return false;
            }

            const customSchemes = await this.loadCustomSchemes();

            // Generate ID if not provided
            if (!colorScheme.id) {
                colorScheme.id = this.generateSchemeId(colorScheme.name);
            }

            customSchemes[colorScheme.id] = {
                ...colorScheme,
                isCustom: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            return await this.saveCustomSchemes(customSchemes);
        } catch (error) {
            console.error('Error saving color scheme:', error);
            return false;
        }
    }

    /**
     * Delete color scheme
     * @param {string} schemeId - Color scheme ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteColorScheme(schemeId) {
        try {
            // Don't allow deletion of predefined schemes
            if (this.predefinedSchemes[schemeId]) {
                console.warn(`Cannot delete predefined color scheme: ${schemeId}`);
                return false;
            }

            const customSchemes = await this.loadCustomSchemes();

            if (!customSchemes[schemeId]) {
                console.warn(`Color scheme not found: ${schemeId}`);
                return false;
            }

            delete customSchemes[schemeId];
            return await this.saveCustomSchemes(customSchemes);
        } catch (error) {
            console.error('Error deleting color scheme:', error);
            return false;
        }
    }

    /**
     * Get predefined color schemes
     * @returns {Object} Predefined color schemes
     */
    getPredefinedColorSchemes() {
        return { ...this.predefinedSchemes };
    }

    /**
     * Load custom color schemes from file
     * @returns {Promise<Object>} Custom color schemes
     */
    async loadCustomSchemes() {
        try {
            const result = await this.fileService.readFile(this.CUSTOM_SCHEMES_FILE);

            if (result.success) {
                return JSON.parse(result.content);
            } else {
                // File doesn't exist yet, return empty object
                return {};
            }
        } catch (error) {
            console.error('Error loading custom schemes:', error);
            return {};
        }
    }

    /**
     * Save custom color schemes to file
     * @param {Object} customSchemes - Custom schemes to save
     * @returns {Promise<boolean>} Success status
     */
    async saveCustomSchemes(customSchemes) {
        try {
            const result = await this.fileService.writeFile(
                this.CUSTOM_SCHEMES_FILE,
                JSON.stringify(customSchemes, null, 2)
            );
            return result.success;
        } catch (error) {
            console.error('Error saving custom schemes:', error);
            return false;
        }
    }

    /**
     * Generate unique ID for a color scheme
     * @param {string} name - Name of the color scheme
     * @returns {string} Generated ID
     */
    generateSchemeId(name) {
        const baseId = name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-');

        const timestamp = Date.now().toString(36);
        return `custom-${baseId}-${timestamp}`;
    }

    /**
     * Get default predefined color schemes
     * @returns {Object} Default predefined schemes
     */
    getDefaultPredefinedSchemes() {
        return {
            'neon-cyberpunk': {
                id: 'neon-cyberpunk',
                name: 'Neon Cyberpunk',
                neutrals: ['#FFFFFF', '#F0F0F0', '#E0E0E0'],
                backgrounds: ['#000000', '#0A0A0A', '#1A1A1A'],
                lights: ['#FF0080', '#00FF80', '#8000FF', '#FF8000', '#0080FF', '#FF0040']
            },
            'ocean-depth': {
                id: 'ocean-depth',
                name: 'Ocean Depth',
                neutrals: ['#F0F8FF', '#E6F3FF', '#CCE6FF'],
                backgrounds: ['#001133', '#002244', '#003366'],
                lights: ['#00CCFF', '#0099CC', '#0066AA', '#004488', '#66DDFF', '#3399CC']
            },
            'fire-ember': {
                id: 'fire-ember',
                name: 'Fire Ember',
                neutrals: ['#FFF8F0', '#FFEECC', '#FFE4AA'],
                backgrounds: ['#330000', '#440000', '#660000'],
                lights: ['#FF4400', '#FF6600', '#FF8800', '#FFAA00', '#FFCC00', '#FF2200']
            }
        };
    }

    /**
     * Validate color scheme object
     * @param {Object} colorScheme - Color scheme to validate
     * @returns {Object} Validation result
     */
    validateColorScheme(colorScheme) {
        const errors = [];

        if (!colorScheme.name || typeof colorScheme.name !== 'string') {
            errors.push('Name is required and must be a string');
        }

        if (!colorScheme.neutrals || !Array.isArray(colorScheme.neutrals) || colorScheme.neutrals.length === 0) {
            errors.push('Neutrals must be an array with at least one color');
        }

        if (!colorScheme.backgrounds || !Array.isArray(colorScheme.backgrounds) || colorScheme.backgrounds.length === 0) {
            errors.push('Backgrounds must be an array with at least one color');
        }

        if (!colorScheme.lights || !Array.isArray(colorScheme.lights) || colorScheme.lights.length === 0) {
            errors.push('Lights must be an array with at least one color');
        }

        // Validate color format
        const colorRegex = /^#[0-9A-F]{6}$/i;
        const allColors = [
            ...(colorScheme.neutrals || []),
            ...(colorScheme.backgrounds || []),
            ...(colorScheme.lights || [])
        ];

        for (const color of allColors) {
            if (!colorRegex.test(color)) {
                errors.push(`Invalid color format: ${color}. Must be hex format like #FF0000`);
            }
        }

        return {
            success: errors.length === 0,
            errors
        };
    }
}

module.exports = FileColorSchemeRepository;