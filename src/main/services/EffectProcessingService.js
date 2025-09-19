/**
 * Service responsible for effect processing operations only
 * Follows Single Responsibility Principle
 */
class EffectProcessingService {
    /**
     * Process effects configuration into LayerConfig instances
     * @param {Array} effects - Array of effect configurations
     * @param {string} myNftGenPath - Path to my-nft-gen module
     * @returns {Promise<Array>} Array of LayerConfig instances
     */
    static async processEffects(effects, myNftGenPath) {
        const { default: EffectRegistryService } = await import('./EffectRegistryService.js');
        const registryService = new EffectRegistryService();
        const EffectRegistry = await registryService.getEffectRegistry();
        const ConfigRegistry = await registryService.getConfigRegistry();

        // Import LayerConfig directly from my-nft-gen
        let LayerConfig;
        try {
            const LayerConfigModule = await import('my-nft-gen/src/core/layer/LayerConfig.js');
            LayerConfig = LayerConfigModule.LayerConfig || LayerConfigModule.default;

            if (!LayerConfig) {
                throw new Error('LayerConfig not found in module export');
            }
        } catch (error) {
            console.error('Failed to import LayerConfig:', error);
            throw new Error(`LayerConfig import failed: ${error.message}`);
        }

        const allPrimaryEffects = [];

        for (const effect of effects) {
            try {
                // Use registryKey only - no fallbacks to force proper key passing
                const effectName = effect.registryKey;

                // Get the actual Effect class from registry
                let registryData = EffectRegistry.getGlobal(effectName);
                let EffectClass = registryData;

                // Handle wrapped registry entries
                if (registryData && registryData.EffectClass) {
                    EffectClass = registryData.EffectClass;
                } else if (registryData && registryData[effectName]) {
                    EffectClass = registryData[effectName];
                }

                // If not found, try with lowercase name (case sensitivity fallback)
                if (!EffectClass && effectName) {
                    const lowerEffectName = effectName.toLowerCase();
                    console.log(`🔍 Effect class ${effectName} not found, trying lowercase: ${lowerEffectName}`);
                    registryData = EffectRegistry.getGlobal(lowerEffectName);
                    EffectClass = registryData;

                    // Handle wrapped registry entries for lowercase lookup
                    if (registryData && registryData.EffectClass) {
                        EffectClass = registryData.EffectClass;
                    } else if (registryData && registryData[lowerEffectName]) {
                        EffectClass = registryData[lowerEffectName];
                    }
                }

                if (!EffectClass) {
                    console.warn(`Effect class ${effectName} not found in registry (tried both '${effectName}' and '${effectName?.toLowerCase()}')`);
                    console.warn(`Registry data:`, registryData);
                    continue;
                }

                // Verify this is the correct derived class
                console.log(`✓ Found Effect class for ${effectName}:`, EffectClass.name || EffectClass.constructor?.name || 'unnamed');

                const configInstance = await this.createConfigInstance(effect, myNftGenPath);

                // Process attached secondary effects - handle both formats
                const possibleSecondaryEffects = [];
                const secondaryEffects = effect.secondaryEffects || effect.attachedEffects?.secondary || [];

                for (const secondaryEffect of secondaryEffects) {
                    const secondaryEffectName = secondaryEffect.registryKey;
                    const SecondaryEffectClass = EffectRegistry.getGlobal(secondaryEffectName);
                    if (SecondaryEffectClass) {
                        const secondaryConfigInstance = await this.createConfigInstance(secondaryEffect, myNftGenPath);

                        const secondaryLayerConfig = new LayerConfig({
                            name: secondaryEffectName,
                            effect: SecondaryEffectClass,
                            percentChance: 100,
                            currentEffectConfig: secondaryConfigInstance,
                        });
                        possibleSecondaryEffects.push(secondaryLayerConfig);
                    }
                }

                // Debug the Effect class before creating LayerConfig
                console.log(`🔍 Creating LayerConfig with Effect:`, {
                    effectName,
                    EffectClassName: EffectClass.name,
                    EffectConstructorName: EffectClass.constructor?.name,
                    isFunction: typeof EffectClass === 'function',
                    prototype: EffectClass.prototype?.constructor?.name
                });

                const layerConfig = new LayerConfig({
                    name: effectName,
                    effect: EffectClass,
                    percentChance: 100,
                    currentEffectConfig: configInstance,
                    possibleSecondaryEffects: possibleSecondaryEffects
                });

                // Debug the LayerConfig after creation
                console.log(`🎯 LayerConfig created:`, {
                    name: layerConfig.name,
                    effectClassName: layerConfig.Effect?.name || layerConfig.Effect?.constructor?.name || 'no effect class name',
                    hasEffect: !!layerConfig.Effect,
                    hasConfig: !!layerConfig.currentEffectConfig
                });
                allPrimaryEffects.push(layerConfig);

            } catch (error) {
                console.error(`Error processing effect ${effect.effectClass?.name}:`, error);
            }
        }

        return allPrimaryEffects;
    }

    /**
     * Create configuration instance for an effect
     * @param {Object} effect - Effect configuration
     * @param {string} myNftGenPath - Path to my-nft-gen module
     * @returns {Promise<Object>} Configuration instance
     */
    static async createConfigInstance(effect, myNftGenPath) {
        // Always preserve user config as fallback
        const userConfig = effect.config || {};

        try {
            const { default: EffectRegistryService } = await import('./EffectRegistryService.js');
            const registryService = new EffectRegistryService();

            // Ensure effects are registered with configs linked
            await registryService.ensureCoreEffectsRegistered();

            // Get effect name from registryKey first, then fallback to other formats
            const effectName = effect.registryKey || effect.className || effect.effectClass?.name;

            if (!effectName) {
                console.warn('No effect name found, using user config');
                return userConfig;
            }

            // Debug FuzzFlareEffect config
            if (effectName === 'FuzzFlareEffect' || effectName === 'fuzz-flare') {
                console.log('🔍 FuzzFlareEffect user config received:', JSON.stringify(userConfig, null, 2));
            }

            // Use the new plugin registry with linked config classes
            const plugin = await registryService.getEffectWithConfig(effectName);

            if (!plugin) {
                // Try with the effect's _name_ property
                const EffectRegistry = await registryService.getEffectRegistry();
                const EffectClass = EffectRegistry.getGlobal(effectName);
                if (EffectClass && EffectClass._name_) {
                    const pluginByName = await registryService.getEffectWithConfig(EffectClass._name_);
                    if (pluginByName && pluginByName.configClass) {
                        console.log(`✅ Found config class for ${effectName} via _name_: ${pluginByName.configClass.name}`);
                        // Create proper config instance using the linked config class
                        return new pluginByName.configClass(userConfig);
                    }
                }
                console.warn(`Effect ${effectName} not found in plugin registry, using user config`);
                return userConfig;
            }

            if (!plugin.configClass) {
                console.warn(`No config class linked for effect ${effectName}, using user config`);
                return userConfig;
            }

            console.log(`✅ Creating config instance for ${effectName} using ${plugin.configClass.name}`);

            // Don't reconstruct here - let my-nft-gen handle reconstruction after IPC
            // This avoids serialization issues where methods get converted to strings
            const configInstance = userConfig;

            return configInstance;

        } catch (error) {
            console.error('Error creating config instance:', error);
            console.error('Stack:', error.stack);
            // Return user config as fallback to prevent crashes
            return userConfig;
        }
    }
}

export default EffectProcessingService;
