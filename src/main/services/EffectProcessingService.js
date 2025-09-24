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
                // Use effect directly - single source of truth format
                
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

                // Process attached secondary effects - single source of truth
                const possibleSecondaryEffects = [];
                const secondaryEffects = effect.attachedEffects?.secondary || [];

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

                // Process attached keyframe effects as special secondary effects
                const keyframeEffects = effect.attachedEffects?.keyFrame || [];

                for (const keyframeEffect of keyframeEffects) {
                    const keyframeEffectName = keyframeEffect.registryKey;
                    const KeyframeEffectClass = EffectRegistry.getGlobal(keyframeEffectName);
                    if (KeyframeEffectClass) {
                        const keyframeConfigInstance = await this.createConfigInstance(keyframeEffect, myNftGenPath);

                        // Create a wrapper class that handles frame timing for keyframe effects
                        class KeyframeEffectWrapper extends KeyframeEffectClass {
                            constructor(options) {
                                super(options);
                                this.keyframeFrame = keyframeEffect.frame || 0;
                                this.isKeyframeEffect = true;
                                this.originalName = keyframeEffectName;
                            }

                            async invoke(layer, currentFrame, totalFrames) {
                                // Only apply keyframe effect on its designated frame
                                if (currentFrame === this.keyframeFrame) {
                                    console.log(`🎬 Applying keyframe effect ${this.originalName} on frame ${currentFrame}`);
                                    return await super.invoke(layer, currentFrame, totalFrames);
                                }
                                // Skip keyframe effect on other frames
                                return;
                            }
                        }

                        const keyframeLayerConfig = new LayerConfig({
                            name: `keyframe_${keyframeEffectName}_frame_${keyframeEffect.frame || 0}`,
                            effect: KeyframeEffectWrapper,
                            percentChance: 100,
                            currentEffectConfig: keyframeConfigInstance,
                        });
                        
                        // Add keyframe effects to secondary effects so they get processed
                        possibleSecondaryEffects.push(keyframeLayerConfig);
                        console.log(`🎬 Processed keyframe effect: ${keyframeEffectName} for frame ${keyframeEffect.frame || 0} (added as secondary effect)`);
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
                    hasConfig: !!layerConfig.currentEffectConfig,
                    secondaryEffectsCount: possibleSecondaryEffects.length,
                    keyframeEffectsCount: keyframeEffects.length,
                    note: 'Keyframe effects are now included in secondaryEffectsCount'
                });
                allPrimaryEffects.push(layerConfig);

            } catch (error) {
                console.error(`Error processing effect ${migratedEffect.effectClass?.name}:`, error);
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

        // For resumed projects, the config might be serialized (plain objects instead of method objects)
        // We need to re-hydrate it properly using the same approach as SettingsToProjectConverter
        let hydratedConfig;
        try {
            const { default: SettingsToProjectConverter } = await import('../../utils/SettingsToProjectConverter.js');
            hydratedConfig = await SettingsToProjectConverter.convertEffectConfig(userConfig, effect.registryKey);
            console.log(`🔄 Config hydrated for ${effect.registryKey} using SettingsToProjectConverter`);
        } catch (hydrationError) {
            console.warn(`Failed to hydrate config for ${effect.registryKey}, trying ConfigReconstructor:`, hydrationError.message);

            // Fallback to ConfigReconstructor for proper config reconstruction from my-nft-gen
            try {
                const { ConfigReconstructor } = await import('my-nft-gen/src/core/ConfigReconstructor.js');
                const effectName = effect.registryKey;
                hydratedConfig = await ConfigReconstructor.reconstruct(effectName, userConfig);
                console.log(`🔄 Config reconstructed for ${effectName} using ConfigReconstructor fallback`);
            } catch (reconstructionError) {
                console.warn(`Failed to reconstruct config for ${effect.registryKey}:`, reconstructionError.message);
                hydratedConfig = userConfig; // Final fallback to original config
            }
        }

        try {
            const { default: EffectRegistryService } = await import('./EffectRegistryService.js');
            const registryService = new EffectRegistryService();

            // Ensure effects are registered with configs linked
            await registryService.ensureCoreEffectsRegistered();

            // Get effect name from registryKey only
            const effectName = effect.registryKey;

            if (!effectName) {
                console.warn('No effect name found, using hydrated config');
                return hydratedConfig;
            }

            // Debug FuzzFlareEffect config
            if (effectName === 'FuzzFlareEffect' || effectName === 'fuzz-flare') {
                console.log('🔍 FuzzFlareEffect hydrated config received:', JSON.stringify(hydratedConfig, null, 2));
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
                        return new pluginByName.configClass(hydratedConfig);
                    }
                }
                console.warn(`Effect ${effectName} not found in plugin registry, using deserialized config`);
                return hydratedConfig;
            }

            if (!plugin.configClass) {
                console.warn(`No config class linked for effect ${effectName}, using deserialized config`);
                return hydratedConfig;
            }

            console.log(`✅ Using reconstructed config for ${effectName} from ConfigReconstructor`);

            // ConfigReconstructor already returns a properly reconstructed instance
            return hydratedConfig;

        } catch (error) {
            console.error('Error creating config instance:', error);
            console.error('Stack:', error.stack);
            // Return deserialized config as fallback to prevent crashes
            return hydratedConfig;
        }
    }
}

export default EffectProcessingService;
