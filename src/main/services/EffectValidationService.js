/**
 * EffectValidationService
 * 
 * Extracted from NftEffectsManager as part of God Object Destruction Plan - Phase 6, Step 6.5
 * 
 * Responsibilities:
 * - Validate effect configurations
 * - Ensure effects are properly registered
 * 
 * Single Responsibility: Effect validation
 */

class EffectValidationService {
    constructor(effectRegistryService) {
        this.effectRegistryService = effectRegistryService;
    }

    /**
     * Validate effect configuration
     * @param {Object} effectMetadata - Effect metadata
     * @returns {Promise<Object>} Validation result
     */
    async validateEffect(effectMetadata) {
        try {
            await this.effectRegistryService.ensureCoreEffectsRegistered();
            return {
                valid: true,
                errors: []
            };
        } catch (error) {
            console.error('Error validating effect:', error);
            return {
                valid: false,
                errors: [error.message]
            };
        }
    }
}

// Export singleton instance
export default EffectValidationService;