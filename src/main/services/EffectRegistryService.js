/**
 * Service responsible for effect registry operations only
 * Follows Single Responsibility Principle
 */
class EffectRegistryService {
    constructor() {
        this.coreEffectsRegistered = false;
    }

    /**
     * Ensure core effects are registered only once using new enhanced registration with config linking
     * @returns {Promise<void>}
     */
    async ensureCoreEffectsRegistered() {
        if (!this.coreEffectsRegistered) {
            const { EnhancedEffectsRegistration } = await import('my-nft-gen/src/core/registry/EnhancedEffectsRegistration.js');
            const { ConfigLinker } = await import('my-nft-gen/src/core/registry/ConfigLinker.js');

            // Register effects
            await EnhancedEffectsRegistration.registerEffectsFromPackage('my-nft-effects-core');

            // Link with config classes
            await ConfigLinker.linkEffectsWithConfigs();

            this.coreEffectsRegistered = true;
        }
    }

    /**
     * Get effect registry
     * @returns {Promise<Object>} Effect registry
     */
    async getEffectRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { EffectRegistry } = await import('my-nft-gen/src/core/registry/EffectRegistry.js');
        return EffectRegistry;
    }

    /**
     * Get config registry
     * @returns {Promise<Object>} Config registry
     */
    async getConfigRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { ConfigRegistry } = await import('my-nft-gen/src/core/registry/ConfigRegistry.js');
        return ConfigRegistry;
    }

    /**
     * Get all available effects by category
     * @returns {Promise<Object>} Effects by category
     */
    async getAllEffects() {
        const EffectRegistry = await this.getEffectRegistry();
        const { EffectCategories } = await import('my-nft-gen/src/core/registry/EffectCategories.js');

        return {
            primary: EffectRegistry.getByCategoryGlobal(EffectCategories.PRIMARY),
            secondary: EffectRegistry.getByCategoryGlobal(EffectCategories.SECONDARY),
            keyFrame: EffectRegistry.getByCategoryGlobal(EffectCategories.KEY_FRAME),
            final: EffectRegistry.getByCategoryGlobal(EffectCategories.FINAL_IMAGE)
        };
    }

    /**
     * Get specific effect by name
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Effect or null if not found
     */
    async getEffect(effectName) {
        const EffectRegistry = await this.getEffectRegistry();
        return EffectRegistry.getGlobal(effectName);
    }

    /**
     * Get modern plugin registry with config linking
     * @returns {Promise<Object>} Plugin registry
     */
    async getPluginRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { PluginRegistry } = await import('my-nft-gen/src/core/registry/PluginRegistry.js');
        return PluginRegistry;
    }

    /**
     * Get effect with its linked config class
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Plugin with effect and config class or null if not found
     */
    async getEffectWithConfig(effectName) {
        const PluginRegistry = await this.getPluginRegistry();
        return PluginRegistry.get(effectName);
    }

    /**
     * Get all effects with their config classes by category
     * @returns {Promise<Object>} Effects with configs by category
     */
    async getAllEffectsWithConfigs() {
        const PluginRegistry = await this.getPluginRegistry();
        const { EffectCategories } = await import('my-nft-gen/src/core/registry/EffectCategories.js');

        return {
            primary: PluginRegistry.getByCategory(EffectCategories.PRIMARY),
            secondary: PluginRegistry.getByCategory(EffectCategories.SECONDARY),
            keyFrame: PluginRegistry.getByCategory(EffectCategories.KEY_FRAME),
            final: PluginRegistry.getByCategory(EffectCategories.FINAL_IMAGE)
        };
    }

    /**
     * Get plugin registry statistics including config linking info
     * @returns {Promise<Object>} Registry statistics
     */
    async getRegistryStats() {
        const PluginRegistry = await this.getPluginRegistry();
        return PluginRegistry.getStats();
    }

    /**
     * Check if core effects are registered
     * @returns {boolean} True if registered
     */
    areCoreEffectsRegistered() {
        return this.coreEffectsRegistered;
    }
}

module.exports = EffectRegistryService;