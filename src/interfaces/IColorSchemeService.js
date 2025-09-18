/**
 * Interface for color scheme operations in frontend
 * Defines the contract for color scheme management
 */
class IColorSchemeService {
    /**
     * Get all color schemes
     * @returns {Promise<Object>} All color schemes
     */
    async getAllColorSchemes() {
        throw new Error('Method not implemented');
    }

    /**
     * Get color schemes by category
     * @returns {Promise<Object>} Color schemes organized by category
     */
    async getColorSchemesByCategory() {
        throw new Error('Method not implemented');
    }

    /**
     * Get specific color scheme
     * @param {string} schemeId - Color scheme ID
     * @returns {Promise<Object|null>} Color scheme or null
     */
    async getColorScheme(schemeId) {
        throw new Error('Method not implemented');
    }

    /**
     * Save custom color scheme
     * @param {Object} colorScheme - Color scheme to save
     * @returns {Promise<boolean>} Success status
     */
    async saveCustomScheme(colorScheme) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete custom color scheme
     * @param {string} schemeId - Color scheme ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteCustomScheme(schemeId) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate color scheme
     * @param {Object} colorScheme - Color scheme to validate
     * @returns {Object} Validation result
     */
    validateColorScheme(colorScheme) {
        throw new Error('Method not implemented');
    }
}

export default IColorSchemeService;