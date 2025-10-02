/**
 * EffectMetadataService
 * 
 * Extracted from NftEffectsManager as part of God Object Destruction Plan - Phase 6, Step 6.5
 * 
 * Responsibilities:
 * - Retrieve effect metadata from registry
 * - Get effect schema for UI generation
 * 
 * Single Responsibility: Effect metadata retrieval
 */

class EffectMetadataService {
    constructor(effectRegistryService) {
        this.effectRegistryService = effectRegistryService;
    }

    /**
     * Get effect metadata
     * @param {Object} params - Effect parameters
     * @returns {Promise<Object>} Effect metadata
     */
    async getEffectMetadata({ effectName, category }) {
        try {
            const effect = await this.effectRegistryService.getEffect(effectName);
            if (!effect) {
                throw new Error(`Effect not found: ${effectName}`);
            }
            return effect;
        } catch (error) {
            console.error('Error getting effect metadata:', error);
            throw error;
        }
    }

    /**
     * Get effect schema for UI generation
     * @param {string} effectName - Effect name (not className)
     * @returns {Promise<Object>} Effect schema
     */
    async getEffectSchema(effectName) {
        try {
            const ConfigRegistry = await this.effectRegistryService.getConfigRegistry();
            const configData = ConfigRegistry.getGlobal(effectName);

            if (!configData || !configData.ConfigClass) {
                console.error(`No config found for effect: ${effectName}`);
                return { fields: [] };
            }

            const ConfigClass = configData.ConfigClass;

            if (typeof ConfigClass.getSchema === 'function') {
                return ConfigClass.getSchema();
            }

            // Fallback to schema generator
            const { generateSchema } = await import('../../utils/schemaGenerator.js');
            return generateSchema(ConfigClass);

        } catch (error) {
            console.error('Error getting effect schema for', effectName, ':', error);
            return { fields: [] };
        }
    }
}

// Export singleton instance
export default EffectMetadataService;