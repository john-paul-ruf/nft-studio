/**
 * Service responsible for effect processing operations only
 * Follows Single Responsibility Principle
 */

import SafeConsole from '../utils/SafeConsole.js'

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
            SafeConsole.error('Failed to import LayerConfig:', error);
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
                    SafeConsole.log(`🔍 Effect class ${effectName} not found, trying lowercase: ${lowerEffectName}`);
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
                    SafeConsole.warn(`Effect class ${effectName} not found in registry (tried both '${effectName}' and '${effectName?.toLowerCase()}')`);
                    SafeConsole.warn(`Registry data:`, registryData);
                    continue;
                }

                // Verify this is the correct derived class
                SafeConsole.log(`✓ Found Effect class for ${effectName}:`, EffectClass.name || EffectClass.constructor?.name || 'unnamed');

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
                                    SafeConsole.log(`🎬 Applying keyframe effect ${this.originalName} on frame ${currentFrame}`);
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
                        SafeConsole.log(`🎬 Processed keyframe effect: ${keyframeEffectName} for frame ${keyframeEffect.frame || 0} (added as secondary effect)`);
                    }
                }

                // Debug the Effect class before creating LayerConfig
                SafeConsole.log(`🔍 Creating LayerConfig with Effect:`, {
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
                SafeConsole.log(`🎯 LayerConfig created:`, {
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
                SafeConsole.error(`Error processing effect ${effect.registryKey}:`, error);
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
        // We need to re-hydrate it properly, but since we're in backend context,
        // we should use ConfigReconstructor directly instead of SettingsToProjectConverter
        // which requires window.api (frontend IPC)
        let hydratedConfig;
        try {
            // Try ConfigReconstructor first for proper config reconstruction from my-nft-gen
            const { ConfigReconstructor } = await import('my-nft-gen/src/core/ConfigReconstructor.js');
            const effectName = effect.registryKey;
            hydratedConfig = await ConfigReconstructor.reconstruct(effectName, userConfig);
            SafeConsole.log(`🔄 Config reconstructed for ${effectName} using ConfigReconstructor`);

            // Check if ConfigReconstructor properly handled ColorPicker objects
            // If not, we need to manually reconstruct them
            hydratedConfig = await this.reconstructColorPickers(hydratedConfig, userConfig);

            // Log innerColor reconstruction for debugging viewport issues
            if (hydratedConfig.innerColor) {
                SafeConsole.log(`✅ innerColor reconstruction succeeded for ${effectName}`);
                SafeConsole.log(`   innerColor type: ${hydratedConfig.innerColor.constructor?.name || 'unknown'}`);
                SafeConsole.log(`   innerColor getColor type: ${typeof hydratedConfig.innerColor.getColor}`);
                if (typeof hydratedConfig.innerColor.getColor === 'function') {
                    try {
                        // Test with mock settings that has getColorFromBucket method
                        const mockSettings = {
                            getColorFromBucket: () => '#000000',
                            getNeutralFromBucket: () => '#808080'
                        };
                        const colorValue = hydratedConfig.innerColor.getColor(mockSettings);
                        SafeConsole.log(`   innerColor value test: ${colorValue}`);
                    } catch (e) {
                        SafeConsole.log(`   innerColor getColor() test error: ${e.message}`);
                    }
                }
            }
        } catch (reconstructionError) {
            SafeConsole.warn(`Failed to reconstruct config for ${effect.registryKey}:`, reconstructionError.message);

            // Log the failure details for debugging
            if (userConfig.innerColor) {
                SafeConsole.error(`❌ innerColor reconstruction failed for ${effect.registryKey}`);
                SafeConsole.error(`innerColor type: ${typeof userConfig.innerColor}`);
                SafeConsole.error(`innerColor getColor type: ${typeof userConfig.innerColor?.getColor}`);
                SafeConsole.error(`innerColor:`, JSON.stringify(userConfig.innerColor, null, 2));
            }

            // Try to manually reconstruct ColorPicker objects as fallback
            hydratedConfig = await this.reconstructColorPickers(userConfig, userConfig);
        }

        try {
            const { default: EffectRegistryService } = await import('./EffectRegistryService.js');
            const registryService = new EffectRegistryService();

            // Ensure effects are registered with configs linked
            await registryService.ensureCoreEffectsRegistered();

            // Get effect name from registryKey only
            const effectName = effect.registryKey;

            if (!effectName) {
                SafeConsole.warn('No effect name found, using hydrated config');
                return hydratedConfig;
            }

            // Debug FuzzFlareEffect config
            if (effectName === 'FuzzFlareEffect' || effectName === 'fuzz-flare') {
                SafeConsole.log('🔍 FuzzFlareEffect hydrated config received:', JSON.stringify(hydratedConfig, null, 2));
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
                        SafeConsole.log(`✅ Found config class for ${effectName} via _name_: ${pluginByName.configClass.name}`);
                        // Create proper config instance using the linked config class
                        return new pluginByName.configClass(hydratedConfig);
                    }
                }
                SafeConsole.warn(`Effect ${effectName} not found in plugin registry, using deserialized config`);
                return hydratedConfig;
            }

            if (!plugin.configClass) {
                SafeConsole.warn(`No config class linked for effect ${effectName}, using deserialized config`);
                return hydratedConfig;
            }

            SafeConsole.log(`✅ Using reconstructed config for ${effectName} from ConfigReconstructor`);

            // ConfigReconstructor already returns a properly reconstructed instance
            return hydratedConfig;

        } catch (error) {
            SafeConsole.error('Error creating config instance:', error);
            SafeConsole.error('Stack:', error.stack);
            // Return deserialized config as fallback to prevent crashes
            return hydratedConfig;
        }
    }

    /**
     * Manually reconstruct ColorPicker objects in config
     * @param {Object} config - Config object that may have ColorPicker properties
     * @param {Object} originalConfig - Original config with serialized ColorPicker data
     * @returns {Promise<Object>} Config with reconstructed ColorPicker objects
     */
    static async reconstructColorPickers(config, originalConfig) {
        try {
            const { ColorPicker } = await import('my-nft-gen/src/core/layer/configType/ColorPicker.js');

            // Helper function to check if an object looks like serialized ColorPicker data
            const isColorPickerData = (obj) => {
                return obj && typeof obj === 'object' &&
                       (obj.selectionType !== undefined || obj.colorValue !== undefined) &&
                       typeof obj.getColor !== 'function'; // Not already a ColorPicker instance
            };

            // Iterate through config properties
            for (const [key, value] of Object.entries(config)) {
                // Check if this property looks like ColorPicker data
                if (isColorPickerData(value)) {
                    // Get the original data to ensure we have the right values
                    const originalValue = originalConfig[key] || value;

                    // Reconstruct the ColorPicker instance
                    const selectionType = originalValue.selectionType || ColorPicker.SelectionType.colorBucket;
                    const colorValue = originalValue.colorValue || null;

                    config[key] = new ColorPicker(selectionType, colorValue);
                    SafeConsole.log(`🎨 Reconstructed ColorPicker for ${key}: ${selectionType} = ${colorValue || 'default'}`);
                }
                // Check nested objects (like color ranges)
                else if (value && typeof value === 'object' && !Array.isArray(value) && typeof value.getColor !== 'function') {
                    // Recursively check nested objects
                    for (const [nestedKey, nestedValue] of Object.entries(value)) {
                        if (isColorPickerData(nestedValue)) {
                            const originalNestedValue = originalConfig[key]?.[nestedKey] || nestedValue;
                            const selectionType = originalNestedValue.selectionType || ColorPicker.SelectionType.colorBucket;
                            const colorValue = originalNestedValue.colorValue || null;

                            value[nestedKey] = new ColorPicker(selectionType, colorValue);
                            SafeConsole.log(`🎨 Reconstructed nested ColorPicker for ${key}.${nestedKey}: ${selectionType} = ${colorValue || 'default'}`);
                        }
                    }
                }
            }
        } catch (error) {
            SafeConsole.warn('Failed to reconstruct ColorPicker objects:', error.message);
        }

        return config;
    }
}

export default EffectProcessingService;
