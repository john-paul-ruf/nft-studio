/**
 * Service responsible for effect processing operations only
 * Follows Single Responsibility Principle
 */

import SafeConsole from '../utils/SafeConsole.js';
import EffectRegistryService from './EffectRegistryService.js';
import PreferencesService from '../../services/PreferencesService.js';

// Cache for dynamically imported modules
let _moduleCache = null;

async function _loadModules() {
    if (!_moduleCache) {
        const [
            { LayerConfig },
            { ConfigReconstructor },
            { ColorPicker },
            { PercentageRange },
            { PercentageShortestSide },
            { PercentageLongestSide }
        ] = await Promise.all([
            import('my-nft-gen/src/core/layer/LayerConfig.js'),
            import('my-nft-gen/src/core/ConfigReconstructor.js'),
            import('my-nft-gen/src/core/layer/configType/ColorPicker.js'),
            import('my-nft-gen/src/core/layer/configType/PercentageRange.js'),
            import('my-nft-gen/src/core/layer/configType/PercentageShortestSide.js'),
            import('my-nft-gen/src/core/layer/configType/PercentageLongestSide.js')
        ]);
        
        _moduleCache = {
            LayerConfig,
            ConfigReconstructor,
            ColorPicker,
            PercentageRange,
            PercentageShortestSide,
            PercentageLongestSide
        };
    }
    return _moduleCache;
}

class EffectProcessingService {
    /**
     * Process effects configuration into LayerConfig instances
     * @param {Array} effects - Array of effect configurations
     * @param {string} myNftGenPath - Path to my-nft-gen module
     * @returns {Promise<Array>} Array of LayerConfig instances
     */

    static async processEffects(effects, myNftGenPath) {
        const { LayerConfig } = await _loadModules();
        const registryService = new EffectRegistryService();
        const EffectRegistry = await registryService.getEffectRegistry();
        const ConfigRegistry = await registryService.getConfigRegistry();

        const allPrimaryEffects = [];

        for (const effect of effects) {
            try {
                // DEBUG: Log the effect structure to see if nested effects are present
                SafeConsole.log('🔍 EffectProcessingService.processEffects - Processing effect:', effect.name || effect.className);
                SafeConsole.log('🔍   - Has secondaryEffects?', effect.secondaryEffects?.length || 0);
                SafeConsole.log('🔍   - Has keyframeEffects?', effect.keyframeEffects?.length || 0);
                SafeConsole.log('🔍   - Effect object keys:', Object.keys(effect));
                
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
                    registryData = EffectRegistry.getGlobal(lowerEffectName);
                    EffectClass = registryData;

                    // Handle wrapped registry entries for lowercase lookup
                    if (registryData && registryData.EffectClass) {
                        EffectClass = registryData.EffectClass;
                    } else if (registryData && registryData[lowerEffectName]) {
                        EffectClass = registryData[lowerEffectName];
                    }
                }

                // Verify this is the correct derived class
                const configInstance = await this.createConfigInstance(effect, myNftGenPath);

                // Process attached secondary effects - single source of truth
                const possibleSecondaryEffects = [];

                if (effect.secondaryEffects?.length > 0) {
                    SafeConsole.log(`🔗 Processing ${effect.secondaryEffects.length} secondary effects for ${effectName}`);
                    for (const secondaryEffect of effect.secondaryEffects) {
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
                            SafeConsole.log(`  ✅ Added secondary effect: ${secondaryEffectName}`);
                        } else {
                            SafeConsole.warn(`  ⚠️ Secondary effect class not found: ${secondaryEffectName}`);
                        }
                    }
                }

                if (effect.keyframeEffects?.length > 0) {
                    SafeConsole.log(`🎬 Processing ${effect.keyframeEffects.length} keyframe effects for ${effectName}`);
                    // Process attached keyframe effects as special secondary effects
                    for (const keyframeEffect of effect.keyframeEffects) {
                        const keyframeEffectName = keyframeEffect.registryKey;
                        const KeyframeEffectClass = EffectRegistry.getGlobal(keyframeEffectName);
                        if (KeyframeEffectClass) {
                            const keyframeConfigInstance = await this.createConfigInstance(keyframeEffect, myNftGenPath);

                            const keyframeLayerConfig = new LayerConfig({
                                name: keyframeEffectName,
                                effect: KeyframeEffectClass,
                                percentChance: 100,
                                currentEffectConfig: keyframeConfigInstance,
                            });
                            possibleSecondaryEffects.push(keyframeLayerConfig);
                            SafeConsole.log(`  ✅ Added keyframe effect: ${keyframeEffectName}`);
                        } else {
                            SafeConsole.warn(`  ⚠️ Keyframe effect class not found: ${keyframeEffectName}`);
                        }
                    }
                }

                const layerConfig = new LayerConfig({
                    name: effectName,
                    effect: EffectClass,
                    percentChance: 100,
                    currentEffectConfig: configInstance,
                    possibleSecondaryEffects: possibleSecondaryEffects
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
        const { ConfigReconstructor } = await _loadModules();
        
        // Always preserve user config as fallback
        const userConfig = effect.config || {};

        // For resumed projects, the config might be serialized (plain objects instead of method objects)
        // We need to re-hydrate it properly, but since we're in backend context,
        // we should use ConfigReconstructor directly instead of SettingsToProjectConverter
        // which requires window.api (frontend IPC)
        let hydratedConfig;
        try {
            // Try ConfigReconstructor first for proper config reconstruction from my-nft-gen
            const effectName = effect.registryKey;
            hydratedConfig = await ConfigReconstructor.reconstruct(effectName, userConfig);

            // Check if ConfigReconstructor properly handled ColorPicker objects
            // If not, we need to manually reconstruct them
            hydratedConfig = await this.reconstructColorPickers(hydratedConfig, userConfig, effectName);

            // Check if ConfigReconstructor properly handled PercentageRange objects
            // If not, we need to manually reconstruct them (especially sequencePixelConstant)
            hydratedConfig = await this.reconstructPercentageRanges(hydratedConfig, userConfig, effectName);
        } catch (reconstructionError) {

            // Log the failure details for debugging
            if (userConfig.innerColor) {
                SafeConsole.error(`❌ innerColor reconstruction failed for ${effect.registryKey}`);
                SafeConsole.error(`innerColor type: ${typeof userConfig.innerColor}`);
                SafeConsole.error(`innerColor getColor type: ${typeof userConfig.innerColor?.getColor}`);
                SafeConsole.error(`innerColor:`, JSON.stringify(userConfig.innerColor, null, 2));
            }

            // Try to manually reconstruct ColorPicker objects as fallback
            hydratedConfig = await this.reconstructColorPickers(userConfig, userConfig, effect.registryKey);
        }

        try {
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
     * Manually reconstruct ColorPicker objects in config using introspection
     * @param {Object} config - Config object that may have ColorPicker properties
     * @param {Object} originalConfig - Original config with serialized ColorPicker data
     * @param {string} effectName - Name of the effect for logging and introspection
     * @returns {Promise<Object>} Config with reconstructed ColorPicker objects
     */
    static async reconstructColorPickers(config, originalConfig, effectName) {
        try {
            // Get the config class to introspect property types
            const registryService = new EffectRegistryService();
            const plugin = await registryService.getEffectWithConfig(effectName);

            // Create a type map from the default config instance
            const typeMap = new Map();
            if (plugin && plugin.configClass) {
                try {
                    // Create a default instance to inspect property types
                    const defaultInstance = new plugin.configClass();

                    // Build type map by inspecting the default instance
                    for (const [key, value] of Object.entries(defaultInstance)) {
                        if (value && value.constructor) {
                            typeMap.set(key, value.constructor.name);

                            // Also check nested objects for ColorPicker types
                            if (typeof value === 'object' && !Array.isArray(value)) {
                                for (const [nestedKey, nestedValue] of Object.entries(value)) {
                                    if (nestedValue && nestedValue.constructor) {
                                        typeMap.set(`${key}.${nestedKey}`, nestedValue.constructor.name);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    SafeConsole.warn(`Could not create default config instance for ${effectName}:`, error.message);
                }
            }

            // Helper function to check if an object needs ColorPicker reconstruction
            const needsColorPickerReconstruction = (obj, key) => {
                // Skip if it's already a proper ColorPicker instance
                if (obj && obj.constructor?.name === 'ColorPicker' && typeof obj.getColor === 'function') {
                    return false;
                }

                // Use type map to determine if this field should be a ColorPicker
                const expectedType = typeMap.get(key);
                if (expectedType === 'ColorPicker') {
                    // Check if current value is NOT a proper ColorPicker
                    if (!obj || obj.constructor?.name !== 'ColorPicker' || typeof obj.getColor !== 'function') {
                        return true;
                    }
                }

                return false;
            };

            const { ColorPicker } = await _loadModules();
            
            // Iterate through config properties
            for (const [key, value] of Object.entries(config)) {
                // Check if this property needs ColorPicker reconstruction
                if (needsColorPickerReconstruction(value, key)) {
                    // Get the original data to ensure we have the right values
                    const originalValue = originalConfig[key] || value;

                    // Reconstruct the ColorPicker instance
                    const selectionType = originalValue.selectionType || ColorPicker.SelectionType.colorBucket;
                    const colorValue = originalValue.colorValue || null;

                    config[key] = new ColorPicker(selectionType, colorValue);
                    SafeConsole.log(`🎨 Reconstructed ColorPicker for ${key}: ${selectionType} = ${colorValue || 'default'} (detected via introspection)`);
                }
                // Check nested objects (like color ranges)
                else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    // Recursively check nested objects
                    for (const [nestedKey, nestedValue] of Object.entries(value)) {
                        const nestedPath = `${key}.${nestedKey}`;
                        if (needsColorPickerReconstruction(nestedValue, nestedPath)) {
                            const originalNestedValue = originalConfig[key]?.[nestedKey] || nestedValue;
                            const selectionType = originalNestedValue.selectionType || ColorPicker.SelectionType.colorBucket;
                            const colorValue = originalNestedValue.colorValue || null;

                            value[nestedKey] = new ColorPicker(selectionType, colorValue);
                            SafeConsole.log(`🎨 Reconstructed nested ColorPicker for ${nestedPath}: ${selectionType} = ${colorValue || 'default'} (detected via introspection)`);
                        }
                    }
                }
            }
        } catch (error) {
            SafeConsole.warn(`Failed to reconstruct ColorPicker objects for ${effectName}:`, error.message);
        }

        return config;
    }

    /**
     * Manually reconstruct PercentageRange objects in config using introspection
     * @param {Object} config - Config object that may have PercentageRange properties
     * @param {Object} originalConfig - Original config with serialized PercentageRange data
     * @param {string} effectName - Name of the effect for logging
     * @returns {Promise<Object>} Config with reconstructed PercentageRange objects
     */
    static async reconstructPercentageRanges(config, originalConfig, effectName) {
        try {
            // Load required modules
            const { PercentageRange, PercentageShortestSide, PercentageLongestSide } = await _loadModules();
            
            // Get the config class to introspect property types
            const registryService = new EffectRegistryService();
            const plugin = await registryService.getEffectWithConfig(effectName);

            // Create a type map from the default config instance
            const typeMap = new Map();
            if (plugin && plugin.configClass) {
                try {
                    // Create a default instance to inspect property types
                    const defaultInstance = new plugin.configClass();

                    // Build type map by inspecting the default instance
                    for (const [key, value] of Object.entries(defaultInstance)) {
                        if (value && value.constructor) {
                            typeMap.set(key, value.constructor.name);
                            SafeConsole.log(`📋 Type map for ${effectName}.${key}: ${value.constructor.name}`);
                        }
                    }
                } catch (error) {
                    SafeConsole.warn(`Could not create default config instance for ${effectName}:`, error.message);
                }
            }

            // Helper function to check if an object needs PercentageRange reconstruction
            const needsPercentageRangeReconstruction = (obj, key) => {
                // Skip if it's already a proper PercentageRange with function properties
                if (obj && obj.constructor?.name === 'PercentageRange' &&
                    typeof obj.lower === 'function' && typeof obj.upper === 'function') {
                    return false;
                }

                // Use type map to determine if this field should be a PercentageRange
                const expectedType = typeMap.get(key);
                if (expectedType === 'PercentageRange') {
                    // Check if current value is NOT a proper PercentageRange
                    if (!obj || obj.constructor?.name !== 'PercentageRange' ||
                        typeof obj.lower !== 'function' || typeof obj.upper !== 'function') {
                        return true;
                    }
                }

                // Also check if the object structure looks like a serialized PercentageRange
                // This handles cases where the type map might not be available
                if (obj && typeof obj === 'object' && obj.lower && obj.upper) {
                    // Check if lower and upper have the percent/side structure
                    if (obj.lower.percent !== undefined && obj.lower.side !== undefined &&
                        obj.upper.percent !== undefined && obj.upper.side !== undefined) {
                        return true;
                    }
                }

                return false;
            };

            // Iterate through config properties
            for (const [key, value] of Object.entries(config)) {
                if (needsPercentageRangeReconstruction(value, key)) {
                    SafeConsole.log(`🔧 Reconstructing PercentageRange for ${effectName}.${key} (detected via introspection)`);

                    // Get default values for this field
                    const defaults = await this.getPercentageRangeDefaults(key, effectName);

                    // Use defaults for empty objects, or try to extract from serialized data
                    let lowerPercent = defaults.lowerPercent;
                    let upperPercent = defaults.upperPercent;
                    let lowerSide = defaults.lowerSide;
                    let upperSide = defaults.upperSide;

                    // If the object has lower/upper properties, try to extract values
                    if (value && value.lower && typeof value.lower === 'object' && value.lower.percent !== undefined) {
                        lowerPercent = value.lower.percent;
                        lowerSide = value.lower.side || 'shortest';
                    }

                    if (value && value.upper && typeof value.upper === 'object' && value.upper.percent !== undefined) {
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
     * Get default values for specific PercentageRange fields
     * @param {string} fieldName - Field name
     * @param {string} effectName - Effect name for preferences lookup
     * @returns {Promise<Object>} Default values for the field
     */
    static async getPercentageRangeDefaults(fieldName, effectName) {
        try {
            // First priority: Check user preferences for saved defaults
            if (typeof window !== 'undefined' && window.api) {
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
