/**
 * Interface for Effect Management Operations
 * 
 * This interface defines the contract for managing effects,
 * including discovery, registration, configuration, and application.
 * 
 * @interface IEffectManager
 */
export class IEffectManager {
    /**
     * Gets all available effects in the system
     * 
     * @returns {Promise<Array<Object>>} Array of available effect definitions
     */
    async getAvailableEffects() {
        throw new Error('IEffectManager.getAvailableEffects() must be implemented');
    }

    /**
     * Gets metadata for a specific effect
     * 
     * @param {string} effectId - Unique effect identifier
     * @returns {Promise<Object>} Effect metadata
     * @throws {EffectNotFoundError} When effect doesn't exist
     */
    async getEffectMetadata(effectId) {
        throw new Error('IEffectManager.getEffectMetadata() must be implemented');
    }

    /**
     * Gets default configuration for a specific effect
     * 
     * @param {string} effectId - Unique effect identifier
     * @returns {Promise<Object>} Default effect configuration
     * @throws {EffectNotFoundError} When effect doesn't exist
     */
    async getEffectDefaults(effectId) {
        throw new Error('IEffectManager.getEffectDefaults() must be implemented');
    }

    /**
     * Registers a new effect in the system
     * 
     * @param {Object} effectDefinition - Effect definition object
     * @returns {Promise<string>} Registered effect ID
     * @throws {EffectRegistrationError} When registration fails
     */
    async registerEffect(effectDefinition) {
        throw new Error('IEffectManager.registerEffect() must be implemented');
    }

    /**
     * Unregisters an effect from the system
     * 
     * @param {string} effectId - Unique effect identifier
     * @returns {Promise<boolean>} True if effect was unregistered
     */
    async unregisterEffect(effectId) {
        throw new Error('IEffectManager.unregisterEffect() must be implemented');
    }

    /**
     * Creates an effect instance with the given configuration
     * 
     * @param {string} effectId - Unique effect identifier
     * @param {Object} config - Effect configuration
     * @returns {Promise<Object>} Effect instance
     * @throws {EffectCreationError} When effect creation fails
     */
    async createEffectInstance(effectId, config) {
        throw new Error('IEffectManager.createEffectInstance() must be implemented');
    }

    /**
     * Applies an effect to the given input data
     * 
     * @param {Object} effectInstance - Effect instance to apply
     * @param {Object} inputData - Input data (image, frame, etc.)
     * @param {Object} [options] - Application options
     * @returns {Promise<Object>} Processed output data
     * @throws {EffectApplicationError} When effect application fails
     */
    async applyEffect(effectInstance, inputData, options = {}) {
        throw new Error('IEffectManager.applyEffect() must be implemented');
    }

    /**
     * Validates effect configuration
     * 
     * @param {string} effectId - Unique effect identifier
     * @param {Object} config - Configuration to validate
     * @returns {Promise<EffectValidationResult>} Validation result
     */
    async validateEffectConfig(effectId, config) {
        throw new Error('IEffectManager.validateEffectConfig() must be implemented');
    }

    /**
     * Gets effects by category
     * 
     * @param {string} category - Effect category
     * @returns {Promise<Array<Object>>} Array of effects in the category
     */
    async getEffectsByCategory(category) {
        throw new Error('IEffectManager.getEffectsByCategory() must be implemented');
    }

    /**
     * Gets all available effect categories
     * 
     * @returns {Promise<Array<string>>} Array of category names
     */
    async getEffectCategories() {
        throw new Error('IEffectManager.getEffectCategories() must be implemented');
    }

    /**
     * Searches for effects by name or description
     * 
     * @param {string} query - Search query
     * @returns {Promise<Array<Object>>} Array of matching effects
     */
    async searchEffects(query) {
        throw new Error('IEffectManager.searchEffects() must be implemented');
    }

    /**
     * Derives a CSS class name for an effect
     * 
     * @param {string} effectId - Unique effect identifier
     * @returns {string} CSS class name
     */
    deriveClassName(effectId) {
        throw new Error('IEffectManager.deriveClassName() must be implemented');
    }
}

/**
 * Effect validation result structure
 * @typedef {Object} EffectValidationResult
 * @property {boolean} isValid - Whether the configuration is valid
 * @property {Array<string>} errors - List of validation errors
 * @property {Array<string>} warnings - List of validation warnings
 * @property {Object} normalizedConfig - Normalized configuration with defaults applied
 */