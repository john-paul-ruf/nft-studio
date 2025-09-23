import { predefinedColorSchemes } from '../data/colorSchemes.js';
import PreferencesService from './PreferencesService.js';

// Use the exposed API from preload script instead of direct electron access

/**
 * Service for managing color schemes (predefined and custom)
 */
class ColorSchemeService {
    static CUSTOM_SCHEMES_FILE = 'custom-color-schemes.json';

    /**
     * Get all available color schemes (predefined + custom)
     * @returns {Promise<Object>} All color schemes by ID
     */
    static async getAllColorSchemes() {
        try {
            const customSchemes = await this.loadCustomSchemes();
            return {
                ...predefinedColorSchemes,
                ...customSchemes
            };
        } catch (error) {
            console.error('Error loading color schemes:', error);
            return predefinedColorSchemes;
        }
    }

    /**
     * Get color schemes organized by category
     * @returns {Promise<Object>} Color schemes organized by category
     */
    static async getColorSchemesByCategory() {
        const allSchemes = await this.getAllColorSchemes();
        const favorites = await PreferencesService.getFavoriteColorSchemes();

        const categories = {
            '🔥 Cool Themes': [
                'neon-underground', 'mystic-ritual', 'street-canvas', 'bass-drop', 'vapor-dreams'
            ],
            'Cyberpunk & Neon': [
                'neon-cyberpunk', 'synthwave', 'electric-blue', 'matrix-code', 'holographic', 'neon-tokyo'
            ],
            'Warm & Fire': [
                'fire-ember', 'sunset-horizon', 'lava-flow', 'dragon-fire', 'summer-heat'
            ],
            'Cool & Ocean': [
                'ocean-depth', 'arctic-ice', 'tropical-reef', 'coral-reef-deep', 'winter-frost'
            ],
            'Tropical & Vibrant': [
                'caribbean-sunset', 'jungle-fever', 'mango-tango'
            ],
            'Nature & Earth': [
                'forest-mystique', 'autumn-leaves', 'desert-sand', 'elven-forest', 'harvest-moon', 'zen-garden', 'volcanic-ash', 'northern-lights', 'thunderstorm', 'sandstorm'
            ],
            'Cosmic & Space': [
                'cosmic-void', 'stellar-nebula', 'solar-flare', 'alien-world'
            ],
            'Gothic & Dark': [
                'gothic-cathedral', 'midnight-noir', 'blood-moon', 'shadow-realm'
            ],
            'Sci-Fi & Futuristic': [
                'chrome-finish'
            ],
            'Fantasy & Magic': [
                'unicorn-magic', 'wizard-tower'
            ],
            'Seasonal': [
                'spring-bloom'
            ],
            'Urban & Street': [
                'graffiti-wall', 'subway-tiles', 'rust-metal'
            ],
            'Vintage & Classic': [
                'art-deco', 'victorian-elegance', 'americana-classic', 'prohibition-era', 'retro-gaming', 'vintage-sepia'
            ],
            'Monochrome & Minimal': [
                'grayscale-elegance', 'high-contrast'
            ],
            'Pastel & Soft': [
                'pastel-dreams', 'soft-spring'
            ],
            'Abstract & Artistic': [
                'paint-splash', 'geometric-fusion', 'watercolor-dream', 'oil-painting'
            ],
            'Mystical & Spiritual': [
                'chakra-alignment', 'crystal-healing', 'tarot-mysticism'
            ],
            'Custom': []
        };

        // Add custom schemes to Custom category
        for (const [id, scheme] of Object.entries(allSchemes)) {
            if (!predefinedColorSchemes[id]) {
                categories['Custom'].push(id);
            }
        }

        // Convert to format with scheme objects
        const categorizedSchemes = {};

        // Add Favorites category at the top if there are any favorites
        if (favorites.length > 0) {
            categorizedSchemes['⭐ Favorites'] = favorites
                .map(id => allSchemes[id])
                .filter(scheme => scheme); // Filter out any missing schemes
        }

        for (const [category, schemeIds] of Object.entries(categories)) {
            categorizedSchemes[category] = schemeIds
                .map(id => allSchemes[id])
                .filter(scheme => scheme); // Filter out any missing schemes
        }

        return categorizedSchemes;
    }

    /**
     * Get a specific color scheme by ID
     * @param {string} schemeId - ID of the color scheme
     * @returns {Promise<Object|null>} Color scheme or null if not found
     */
    static async getColorScheme(schemeId) {
        const allSchemes = await this.getAllColorSchemes();
        return allSchemes[schemeId] || null;
    }

    /**
     * Save a custom color scheme
     * @param {Object} colorScheme - Color scheme object
     * @returns {Promise<boolean>} Success status
     */
    static async saveCustomScheme(colorScheme) {
        try {
            const customSchemes = await this.loadCustomSchemes();

            // Generate ID if not provided
            if (!colorScheme.id) {
                colorScheme.id = this.generateSchemeId(colorScheme.name);
            }

            customSchemes[colorScheme.id] = {
                ...colorScheme,
                isCustom: true,
                createdAt: new Date().toISOString()
            };

            await this.saveCustomSchemes(customSchemes);
            return true;

        } catch (error) {
            console.error('Error saving custom color scheme:', error);
            return false;
        }
    }

    /**
     * Delete a custom color scheme
     * @param {string} schemeId - ID of the scheme to delete
     * @returns {Promise<boolean>} Success status
     */
    static async deleteCustomScheme(schemeId) {
        try {
            // Don't allow deletion of predefined schemes
            if (predefinedColorSchemes[schemeId]) {
                return false;
            }

            const customSchemes = await this.loadCustomSchemes();
            delete customSchemes[schemeId];
            await this.saveCustomSchemes(customSchemes);
            return true;

        } catch (error) {
            console.error('Error deleting custom color scheme:', error);
            return false;
        }
    }

    /**
     * Load custom color schemes from file
     * @returns {Promise<Object>} Custom color schemes
     */
    static async loadCustomSchemes() {
        try {
            const result = await window.api.readFile(this.CUSTOM_SCHEMES_FILE);

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
     * @returns {Promise<void>}
     */
    static async saveCustomSchemes(customSchemes) {
        const result = await window.api.writeFile(this.CUSTOM_SCHEMES_FILE, JSON.stringify(customSchemes, null, 2));

        if (!result.success) {
            throw new Error(`Failed to save custom schemes: ${result.error}`);
        }
    }

    /**
     * Generate a unique ID for a color scheme
     * @param {string} name - Name of the color scheme
     * @returns {string} Generated ID
     */
    static generateSchemeId(name) {
        const baseId = name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-');

        const timestamp = Date.now().toString(36);
        return `custom-${baseId}-${timestamp}`;
    }

    /**
     * Validate a color scheme object
     * @param {Object} colorScheme - Color scheme to validate
     * @returns {Object} Validation result with success and errors
     */
    static validateColorScheme(colorScheme) {
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

export default ColorSchemeService;