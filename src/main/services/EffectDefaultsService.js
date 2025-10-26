/**
 * EffectDefaultsService
 * 
 * Extracted from NftEffectsManager as part of God Object Destruction Plan - Phase 6, Step 6.5
 * 
 * Responsibilities:
 * - Generate default configurations for effects
 * - Manage config class imports and mappings
 * - Handle dynamic config class loading
 * 
 * Single Responsibility: Effect default configuration generation
 */

class EffectDefaultsService {
    constructor(effectRegistryService, ipcSerializationService) {
        this.effectRegistryService = effectRegistryService;
        this.ipcSerializationService = ipcSerializationService;
    }

    /**
     * Get effect default configuration
     * @param {string} effectName - Effect name (not className)
     * @returns {Promise<Object>} Default configuration
     */
    async getEffectDefaults(effectName) {
        try {
            // Input validation
            if (!effectName || typeof effectName !== 'string') {
                throw new Error(`Invalid effectName: ${effectName}. Must be a non-empty string.`);
            }

            await this.effectRegistryService.ensureCoreEffectsRegistered();

            // Use modern plugin registry with linked config classes
            let plugin = await this.effectRegistryService.getEffectWithConfig(effectName);

            // If not found, try lowercase version as fallback
            if (!plugin && effectName !== effectName.toLowerCase()) {
                console.log(`🔍 Backend getEffectDefaults: Trying lowercase version "${effectName.toLowerCase()}"`);
                plugin = await this.effectRegistryService.getEffectWithConfig(effectName.toLowerCase());
            }

            if (!plugin) {
                throw new Error(`Effect not found: ${effectName}`);
            }

            if (!plugin.configClass) {
                throw new Error(`No config found for effect: ${effectName}. Effect _name_: ${plugin.effectClass._name_}. Every effect must have a config.`);
            }

            const ConfigClass = plugin.configClass;
            console.log(`✅ Found config for ${effectName}: ${ConfigClass.name}`);

            // Create a proper default instance instead of using static getDefaults
            // This ensures complex objects like PercentageRange have proper methods
            const defaultInstance = new ConfigClass({});

            // Serialize the default instance to get JSON-safe defaults
            const serializedDefaults = this.ipcSerializationService.deepSerializeForIPC(defaultInstance);

            console.log(`🎯 Generated defaults for ${effectName} (config key: ${plugin.effectClass._name_}):`, {
                totalProperties: Object.keys(serializedDefaults).length,
                hasRangeObjects: Object.values(serializedDefaults).some(v =>
                    v && typeof v === 'object' && v.hasOwnProperty('lower') && v.hasOwnProperty('upper')
                )
            });

            return serializedDefaults;
        } catch (error) {
            console.error('Error getting effect defaults:', error);
            throw error; // Re-throw to maintain fail-fast behavior
        }
    }

    /**
     * Get config class directly from registry (no dynamic imports needed)
     * The registry should already have configs linked by ConfigLinker
     * @param {string} effectName - Effect name
     * @returns {Promise<Function|null>} Config class or null
     */
    async getConfigFromRegistry(effectName) {
        try {
            // First try getting from the registry via effectRegistryService
            // This uses the linked configs which should be populated by ConfigLinker
            const plugin = await this.effectRegistryService.getEffectWithConfig(effectName);
            
            if (plugin && plugin.configClass) {
                return plugin.configClass;
            }

            return null;
        } catch (error) {
            console.warn(`⚠️ Failed to get config from registry for ${effectName}:`, error.message);
            return null;
        }
    }


}

// Export singleton instance
export default EffectDefaultsService;