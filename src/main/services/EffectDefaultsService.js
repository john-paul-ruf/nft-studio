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
     * Dynamically import config class from my-nft-effects-core
     * @param {string} effectName - Effect name
     * @returns {Promise<Function|null>} Config class or null
     */
    async dynamicImportConfigClass(effectName) {
        try {
            // Create a mapping of known effect names to their config import paths
            const configMapping = await this.buildConfigMapping();

            if (configMapping[effectName]) {
                const configModule = await import(configMapping[effectName]);
                const configClassName = this.getConfigClassName(effectName);
                return configModule[configClassName];
            }

            return null;
        } catch (error) {
            console.warn(`⚠️  Failed to dynamically import config for ${effectName}:`, error.message);
            return null;
        }
    }

    /**
     * Build mapping of effect names to config import paths
     * @returns {Promise<Object>} Mapping object
     */
    async buildConfigMapping() {
        // Static mapping for known effects using the actual file path structure
        const basePath = './node_modules/my-nft-gen/../my-nft-effects-core/src/effects';
        return {
            'amp': `${basePath}/primaryEffects/amp/AmpConfig.js`,
            'fuzz-flare': `${basePath}/primaryEffects/fuzz-flare/FuzzFlareConfig.js`,
            'hex': `${basePath}/primaryEffects/hex/HexConfig.js`,
            'gates': `${basePath}/primaryEffects/gates/GatesConfig.js`,
            'layered-hex-now-with-fuzz': `${basePath}/primaryEffects/layeredHex/LayeredHexConfig.js`,
            'glow': `${basePath}/secondaryEffects/glow/GlowConfig.js`,
            'fade': `${basePath}/secondaryEffects/fade/FadeConfig.js`,
            'blur': `${basePath}/finalImageEffects/blur/BlurConfig.js`,
            'pixelate': `${basePath}/finalImageEffects/pixelate/PixelateConfig.js`
            // Add more mappings as needed
        };
    }

    /**
     * Get expected config class name from effect name
     * @param {string} effectName - Effect name
     * @returns {string} Config class name
     */
    getConfigClassName(effectName) {
        // Convert effect name to config class name (e.g., 'amp' -> 'AmpConfig')
        const words = effectName.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
        return words.join('') + 'Config';
    }
}

// Export singleton instance
export default EffectDefaultsService;