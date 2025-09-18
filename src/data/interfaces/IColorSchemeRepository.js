/**
 * Interface for color scheme data operations
 * Defines the contract for color scheme data access
 */
class IColorSchemeRepository {
    /**
     * Get all color schemes
     * @returns {Promise<Object>} All color schemes
     */
    async getAllColorSchemes() {
        throw new Error('Method not implemented');
    }

    /**
     * Get color scheme by ID
     * @param {string} schemeId - Color scheme ID
     * @returns {Promise<Object|null>} Color scheme or null
     */
    async getColorScheme(schemeId) {
        throw new Error('Method not implemented');
    }

    /**
     * Save color scheme
     * @param {Object} colorScheme - Color scheme to save
     * @returns {Promise<boolean>} Success status
     */
    async saveColorScheme(colorScheme) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete color scheme
     * @param {string} schemeId - Color scheme ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteColorScheme(schemeId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get predefined color schemes
     * @returns {Object} Predefined color schemes
     */
    getPredefinedColorSchemes() {
        throw new Error('Method not implemented');
    }
}

export default IColorSchemeRepository;