/**
 * Interface for effect-related operations in frontend
 * Defines the contract for effect management
 */
class IEffectService {
    /**
     * Discover available effects
     * @returns {Promise<Object>} Effects discovery result
     */
    async discoverEffects() {
        throw new Error('Method not implemented');
    }

    /**
     * Get effect defaults
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object>} Effect defaults
     */
    async getEffectDefaults(effectName) {
        throw new Error('Method not implemented');
    }

    /**
     * Get effect schema
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object>} Effect schema
     */
    async getEffectSchema(effectName) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate effect configuration
     * @param {Object} effectConfig - Effect configuration
     * @returns {Promise<Object>} Validation result
     */
    async validateEffect(effectConfig) {
        throw new Error('Method not implemented');
    }

    /**
     * Preview effect
     * @param {Object} previewConfig - Preview configuration
     * @returns {Promise<Object>} Preview result
     */
    async previewEffect(previewConfig) {
        throw new Error('Method not implemented');
    }
}

module.exports = IEffectService;