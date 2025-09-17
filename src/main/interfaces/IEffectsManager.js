/**
 * Interface for effects management
 * Defines the contract for effect operations
 */
class IEffectsManager {
    /**
     * Discover available effects
     * @returns {Promise<Object>} Effects discovery result
     */
    async discoverEffects() {
        throw new Error('Method not implemented');
    }

    /**
     * Get effect metadata
     * @param {Object} params - Effect parameters
     * @returns {Promise<Object>} Effect metadata
     */
    async getEffectMetadata(params) {
        throw new Error('Method not implemented');
    }

    /**
     * Get effect default configuration
     * @param {string} className - Effect class name
     * @returns {Promise<Object>} Default configuration
     */
    async getEffectDefaults(className) {
        throw new Error('Method not implemented');
    }

    /**
     * Get effect schema for UI generation
     * @param {string} className - Effect class name
     * @returns {Promise<Object>} Effect schema
     */
    async getEffectSchema(className) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate effect configuration
     * @param {Object} effectMetadata - Effect metadata
     * @returns {Promise<Object>} Validation result
     */
    async validateEffect(effectMetadata) {
        throw new Error('Method not implemented');
    }
}

module.exports = IEffectsManager;