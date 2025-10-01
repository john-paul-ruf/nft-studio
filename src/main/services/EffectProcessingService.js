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
            
            // Check if ConfigReconstructor properly handled PercentageRange objects
            // If not, we need to manually reconstruct them (especially sequencePixelConstant)
            SafeConsole.log(`🔧 About to reconstruct PercentageRange objects for ${effectName}`);
            hydratedConfig = await this.reconstructPercentageRanges(hydratedConfig, userConfig, effectName);
            SafeConsole.log(`✅ PercentageRange reconstruction completed for ${effectName}`);

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

    /**
     * Manually reconstruct PercentageRange objects in config
     * @param {Object} config - Config object that may have PercentageRange properties
     * @param {Object} originalConfig - Original config with serialized PercentageRange data
     * @param {string} effectName - Name of the effect for logging
     * @returns {Promise<Object>} Config with reconstructed PercentageRange objects
     */
    static async reconstructPercentageRanges(config, originalConfig, effectName) {
        try {
            const { PercentageRange } = await import('my-nft-gen/src/core/layer/configType/PercentageRange.js');
            const { PercentageShortestSide } = await import('my-nft-gen/src/core/layer/configType/PercentageShortestSide.js');
            const { PercentageLongestSide } = await import('my-nft-gen/src/core/layer/configType/PercentageLongestSide.js');

            // Helper function to check if an object looks like it should be a PercentageRange
            const needsPercentageRangeReconstruction = (obj, key) => {
                // Skip if it's already a proper PercentageRange with function properties
                if (obj && obj.constructor?.name === 'PercentageRange' && 
                    typeof obj.lower === 'function' && typeof obj.upper === 'function') {
                    return false;
                }
                
                // Check if it's an empty object for known PercentageRange fields (serialized as {})
                if (obj && typeof obj === 'object' && Object.keys(obj).length === 0) {
                    return this.isKnownPercentageRangeField(key);
                }
                
                // Check if it has lower/upper but they're not functions (partially serialized PercentageRange)
                if (obj && typeof obj === 'object' && 
                    obj.hasOwnProperty('lower') && obj.hasOwnProperty('upper') &&
                    typeof obj.lower !== 'function' && typeof obj.upper !== 'function') {
                    return true;
                }
                
                // Check if it's a plain Object that should be a PercentageRange based on field name
                if (obj && obj.constructor?.name === 'Object' && this.isKnownPercentageRangeField(key)) {
                    return true;
                }
                
                return false;
            };

            // Iterate through config properties
            for (const [key, value] of Object.entries(config)) {
                if (needsPercentageRangeReconstruction(value, key)) {
                    SafeConsole.log(`🔧 Reconstructing PercentageRange for ${effectName}.${key}`);
                    
                    // Get default values for this field
                    const defaults = await this.getPercentageRangeDefaults(key, effectName);
                    
                    // Use defaults for empty objects, or try to extract from serialized data
                    let lowerPercent = defaults.lowerPercent;
                    let upperPercent = defaults.upperPercent;
                    let lowerSide = defaults.lowerSide;
                    let upperSide = defaults.upperSide;
                    
                    // If the object has lower/upper properties, try to extract values
                    if (value.lower && typeof value.lower === 'object' && value.lower.percent !== undefined) {
                        lowerPercent = value.lower.percent;
                        lowerSide = value.lower.side || 'shortest';
                    }
                    
                    if (value.upper && typeof value.upper === 'object' && value.upper.percent !== undefined) {
                        upperPercent = value.upper.percent;
                        upperSide = value.upper.side || 'longest';
                    }
                    
                    // Create proper PercentageShortestSide or PercentageLongestSide instances
                    const lowerSideClass = lowerSide === 'shortest' ? PercentageShortestSide : PercentageLongestSide;
                    const upperSideClass = upperSide === 'shortest' ? PercentageShortestSide : PercentageLongestSide;
                    
                    config[key] = new PercentageRange(
                        new lowerSideClass(lowerPercent),
                        new upperSideClass(upperPercent)
                    );
                    
                    SafeConsole.log(`✅ Reconstructed PercentageRange for ${key}: ${lowerPercent} (${lowerSide}) - ${upperPercent} (${upperSide})`);
                }
            }
        } catch (error) {
            SafeConsole.warn(`Failed to reconstruct PercentageRange objects for ${effectName}:`, error.message);
        }

        return config;
    }

    /**
     * Check if a field name is known to be a PercentageRange field
     * @param {string} fieldName - Field name to check
     * @returns {boolean} True if field is known to be PercentageRange
     */
    static isKnownPercentageRangeField(fieldName) {
        const percentageRangeFields = [
            'flareRingsSizeRange',
            'flareRaysSizeRange',
            'flareOffset',
            'spiralRange',
            'circleRange',
            'hexRange',
            'sizeRange',
            'offsetRange',
            'sequencePixelConstant'  // Add the missing field that's causing the issue
        ];
        return percentageRangeFields.includes(fieldName);
    }

    /**
     * Get default values for specific PercentageRange fields
     * @param {string} fieldName - Field name
     * @param {string} effectName - Effect name for preferences lookup
     * @returns {Promise<Object>} Default values for the field
     */
    static async getPercentageRangeDefaults(fieldName, effectName) {
        try {
            // First priority: Check user preferences for saved defaults
            if (typeof window !== 'undefined' && window.api) {
                const { default: PreferencesService } = await import('../../services/PreferencesService.js');
                const userDefaults = await PreferencesService.getEffectDefaults(effectName);
                
                if (userDefaults && userDefaults[fieldName]) {
                    const userField = userDefaults[fieldName];
                    // Extract values from user's saved PercentageRange
                    if (userField.lower && userField.upper) {
                        return this.extractPercentageRangeDefaults(userField);
                    }
                }
            }
        } catch (error) {
            SafeConsole.warn(`Could not load user preferences for ${effectName}.${fieldName}:`, error.message);
        }

        try {
            // Second priority: Try to get defaults from the original config class
            const configDefaults = await this.getConfigClassDefaults(effectName, fieldName);
            if (configDefaults) {
                return configDefaults;
            }
        } catch (error) {
            SafeConsole.warn(`Could not load config class defaults for ${effectName}.${fieldName}:`, error.message);
        }

        // Third priority: Hardcoded fallback defaults
        return this.getHardcodedPercentageRangeDefaults(fieldName);
    }

    /**
     * Extract PercentageRange default values from a PercentageRange object
     * @param {Object} percentageRange - PercentageRange object or serialized data
     * @returns {Object} Extracted default values
     */
    static extractPercentageRangeDefaults(percentageRange) {
        // If it's a proper PercentageRange with functions
        if (typeof percentageRange.lower === 'function' && typeof percentageRange.upper === 'function') {
            // We can't easily extract the original percent values from functions
            // Fall back to hardcoded defaults
            return null;
        }

        // If it has serialized lower/upper data
        if (percentageRange.lower && percentageRange.upper) {
            return {
                lowerPercent: percentageRange.lower.percent || 0.1,
                upperPercent: percentageRange.upper.percent || 1.0,
                lowerSide: percentageRange.lower.side || 'shortest',
                upperSide: percentageRange.upper.side || 'longest'
            };
        }

        return null;
    }

    /**
     * Try to get defaults by instantiating the original config class
     * @param {string} effectName - Effect name
     * @param {string} fieldName - Field name
     * @returns {Promise<Object|null>} Default values or null
     */
    static async getConfigClassDefaults(effectName, fieldName) {
        try {
            const { default: EffectRegistryService } = await import('./EffectRegistryService.js');
            const registryService = new EffectRegistryService();
            const ConfigRegistry = await registryService.getConfigRegistry();
            
            const ConfigClass = ConfigRegistry.getGlobal(effectName);
            if (ConfigClass) {
                // Create a default instance
                const defaultConfig = new ConfigClass({});
                const fieldValue = defaultConfig[fieldName];
                
                if (fieldValue && fieldValue.constructor?.name === 'PercentageRange') {
                    // We have a proper PercentageRange, but we can't easily extract the values
                    // This is a limitation of the current architecture
                    SafeConsole.log(`Found PercentageRange for ${effectName}.${fieldName} but cannot extract values`);
                }
            }
        } catch (error) {
            SafeConsole.warn(`Could not instantiate config class for ${effectName}:`, error.message);
        }
        
        return null;
    }

    /**
     * Get hardcoded fallback defaults for PercentageRange fields
     * @param {string} fieldName - Field name
     * @returns {Object} Default values for the field
     */
    static getHardcodedPercentageRangeDefaults(fieldName) {
        const defaults = {
            'sequencePixelConstant': {
                lowerPercent: 0.001,
                upperPercent: 0.001,
                lowerSide: 'shortest',
                upperSide: 'shortest'
            },
            'flareRingsSizeRange': {
                lowerPercent: 0.05,
                upperPercent: 1.0,
                lowerSide: 'shortest',
                upperSide: 'longest'
            },
            'flareRaysSizeRange': {
                lowerPercent: 0.7,
                upperPercent: 1.0,
                lowerSide: 'longest',
                upperSide: 'longest'
            },
            'flareOffset': {
                lowerPercent: 0.1,
                upperPercent: 0.3,
                lowerSide: 'shortest',
                upperSide: 'shortest'
            },
            'spiralRange': {
                lowerPercent: 0.1,
                upperPercent: 0.8,
                lowerSide: 'shortest',
                upperSide: 'longest'
            },
            'circleRange': {
                lowerPercent: 0.1,
                upperPercent: 0.8,
                lowerSide: 'shortest',
                upperSide: 'longest'
            },
            'hexRange': {
                lowerPercent: 0.1,
                upperPercent: 0.8,
                lowerSide: 'shortest',
                upperSide: 'longest'
            },
            'sizeRange': {
                lowerPercent: 0.1,
                upperPercent: 1.0,
                lowerSide: 'shortest',
                upperSide: 'longest'
            },
            'offsetRange': {
                lowerPercent: 0.0,
                upperPercent: 0.5,
                lowerSide: 'shortest',
                upperSide: 'shortest'
            }
        };

        return defaults[fieldName] || {
            lowerPercent: 0.1,
            upperPercent: 1.0,
            lowerSide: 'shortest',
            upperSide: 'longest'
        };
    }
}

export default EffectProcessingService;
