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
     * @param {EffectRegistryService} effectRegistryService - Optional shared registry service instance
     * @returns {Promise<Array>} Array of LayerConfig instances
     */

    static async processEffects(effects, myNftGenPath, effectRegistryService) {
        const { LayerConfig } = await _loadModules();
        // CRITICAL: effectRegistryService is REQUIRED - no fallback allowed
        // Creating a new instance would trigger duplicate initialization cycles
        if (!effectRegistryService) {
            throw new Error('EffectProcessingService.processEffects() requires effectRegistryService parameter');
        }
        const registryService = effectRegistryService;
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
                const configInstance = await this.createConfigInstance(effect, myNftGenPath, registryService);

                // Process attached secondary effects - single source of truth
                const possibleSecondaryEffects = [];

                if (effect.secondaryEffects?.length > 0) {
                    SafeConsole.log(`🔗 Processing ${effect.secondaryEffects.length} secondary effects for ${effectName}`);
                    for (const secondaryEffect of effect.secondaryEffects) {
                        // Skip invisible secondary effects
                        if (secondaryEffect.visible === false) {
                            SafeConsole.log(`  ⏭️  Skipping invisible secondary effect: ${secondaryEffect.registryKey}`);
                            continue;
                        }
                        
                        const secondaryEffectName = secondaryEffect.registryKey;
                        const SecondaryEffectClass = EffectRegistry.getGlobal(secondaryEffectName);
                        if (SecondaryEffectClass) {
                            const secondaryConfigInstance = await this.createConfigInstance(secondaryEffect, myNftGenPath, registryService);

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
                        // Skip invisible keyframe effects
                        if (keyframeEffect.visible === false) {
                            SafeConsole.log(`  ⏭️  Skipping invisible keyframe effect: ${keyframeEffect.registryKey}`);
                            continue;
                        }
                        
                        const keyframeEffectName = keyframeEffect.registryKey;
                        const KeyframeEffectClass = EffectRegistry.getGlobal(keyframeEffectName);
                        if (KeyframeEffectClass) {
                            const keyframeConfigInstance = await this.createConfigInstance(keyframeEffect, myNftGenPath, registryService);

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
     * @param {EffectRegistryService} effectRegistryService - Optional shared registry service instance
     * @returns {Promise<Object>} Configuration instance
     */
    static async createConfigInstance(effect, myNftGenPath, effectRegistryService = null) {
        const { ConfigReconstructor } = await _loadModules();
        
        // Always preserve user config as fallback
        let userConfig = effect.config || {};
        
        // DEBUG: Log config before deserialization
        SafeConsole.log(`🔍 [EffectProcessingService] Config BEFORE deserialization for ${effect.registryKey}:`, {
            hasInnerColor: !!userConfig.innerColor,
            innerColorType: userConfig.innerColor?.constructor?.name || typeof userConfig.innerColor,
            innerColorHasType: !!userConfig.innerColor?.__type,
            innerColorValue: userConfig.innerColor
        });
        
        // CRITICAL: Deserialize config if it contains serialized class instances (from presets)
        // This handles configs that come from preset selection, which are serialized for IPC transmission
        SafeConsole.log(`🔍 [EffectProcessingService] Raw userConfig BEFORE deserialization for ${effect.registryKey}:`, JSON.stringify(userConfig, null, 2));
        // CRITICAL: Use provided registry service - never create a new instance
        if (!effectRegistryService) {
            throw new Error('EffectProcessingService requires effectRegistryService for deserialization');
        }
        userConfig = await effectRegistryService._deserializeConfig(userConfig);
        SafeConsole.log(`🔍 [EffectProcessingService] userConfig AFTER _deserializeConfig for ${effect.registryKey}:`, JSON.stringify(userConfig, null, 2));
        
        // DEBUG: Log config after deserialization
        SafeConsole.log(`🔍 [EffectProcessingService] Config AFTER deserialization for ${effect.registryKey}:`, {
            hasInnerColor: !!userConfig.innerColor,
            innerColorType: userConfig.innerColor?.constructor?.name || typeof userConfig.innerColor,
            innerColorHasGetColor: typeof userConfig.innerColor?.getColor === 'function',
            innerColorValue: userConfig.innerColor
        });

        // Check if config is already properly deserialized (has class instances with methods)
        const isAlreadyDeserialized = EffectProcessingService._hasClassInstances(userConfig);
        SafeConsole.log(`🔍 [EffectProcessingService] Config already deserialized: ${isAlreadyDeserialized}`);

        // For resumed projects, the config might be serialized (plain objects instead of method objects)
        // We need to re-hydrate it properly, but since we're in backend context,
        // we should use ConfigReconstructor directly instead of SettingsToProjectConverter
        // which requires window.api (frontend IPC)
        let hydratedConfig;
        try {
            // If config is already properly deserialized, skip ConfigReconstructor to avoid overwriting
            if (isAlreadyDeserialized) {
                SafeConsole.log(`✅ [EffectProcessingService] Using already deserialized config for ${effect.registryKey}`);
                hydratedConfig = userConfig;
            } else {
                // Try ConfigReconstructor first for proper config reconstruction from my-nft-gen
                const effectName = effect.registryKey;
                SafeConsole.log(`🔧 [EffectProcessingService] Calling ConfigReconstructor.reconstruct for ${effectName}`);
                SafeConsole.log(`🔧 [EffectProcessingService] userConfig before ConfigReconstructor:`, JSON.stringify(userConfig, null, 2));
                hydratedConfig = await ConfigReconstructor.reconstruct(effectName, userConfig);
                SafeConsole.log(`🔧 [EffectProcessingService] hydratedConfig after ConfigReconstructor:`, {
                    flareRingsSizeRange: hydratedConfig.flareRingsSizeRange,
                    flareRingsSizeRangeType: hydratedConfig.flareRingsSizeRange?.constructor?.name,
                    hasLowerFunction: typeof hydratedConfig.flareRingsSizeRange?.lower === 'function',
                    hasUpperFunction: typeof hydratedConfig.flareRingsSizeRange?.upper === 'function'
                });
            }

            // Check if ConfigReconstructor properly handled ColorPicker objects
            // If not, we need to manually reconstruct them
            hydratedConfig = await this.reconstructColorPickers(hydratedConfig, userConfig, effectName, effectRegistryService);

            // Check if ConfigReconstructor properly handled PercentageRange objects
            // If not, we need to manually reconstruct them (especially sequencePixelConstant)
            SafeConsole.log(`🔍 [EffectProcessingService] Before reconstructPercentageRanges for ${effectName}:`, JSON.stringify(hydratedConfig, null, 2));
            hydratedConfig = await this.reconstructPercentageRanges(hydratedConfig, userConfig, effectName, effectRegistryService);
            SafeConsole.log(`🔍 [EffectProcessingService] After reconstructPercentageRanges for ${effectName}:`, JSON.stringify(hydratedConfig, null, 2));
        } catch (reconstructionError) {

            // Log the failure details for debugging
            if (userConfig.innerColor) {
                SafeConsole.error(`❌ innerColor reconstruction failed for ${effect.registryKey}`);
                SafeConsole.error(`innerColor type: ${typeof userConfig.innerColor}`);
                SafeConsole.error(`innerColor getColor type: ${typeof userConfig.innerColor?.getColor}`);
                SafeConsole.error(`innerColor:`, JSON.stringify(userConfig.innerColor, null, 2));
            }

            // Try to manually reconstruct ColorPicker objects as fallback
            hydratedConfig = await this.reconstructColorPickers(userConfig, userConfig, effect.registryKey, effectRegistryService);
        }

        try {
            // CRITICAL: Use provided registry service - never create a new instance
            if (!effectRegistryService) {
                throw new Error('EffectProcessingService requires effectRegistryService for effect registration');
            }

            // Ensure effects are registered with configs linked
            await effectRegistryService.ensureCoreEffectsRegistered();

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
            const plugin = await effectRegistryService.getEffectWithConfig(effectName);

            if (!plugin) {
                // Try with the effect's _name_ property
                const EffectRegistry = await effectRegistryService.getEffectRegistry();
                const EffectClass = EffectRegistry.getGlobal(effectName);
                if (EffectClass && EffectClass._name_) {
                    const pluginByName = await effectRegistryService.getEffectWithConfig(EffectClass._name_);
                    if (pluginByName && pluginByName.configClass) {
                        SafeConsole.log(`✅ Found config class for ${effectName} via _name_: ${pluginByName.configClass.name}`);
                        
                        // Log what we're passing to the constructor
                        SafeConsole.log(`📦 [EffectProcessingService] Creating config instance with:`, {
                            effectName,
                            flareRingsSizeRange: hydratedConfig.flareRingsSizeRange,
                            flareRingsSizeRangeType: hydratedConfig.flareRingsSizeRange?.constructor?.name,
                            hasLowerFunction: typeof hydratedConfig.flareRingsSizeRange?.lower === 'function',
                            hasUpperFunction: typeof hydratedConfig.flareRingsSizeRange?.upper === 'function'
                        });
                        
                        // Create proper config instance using the linked config class
                        const configInstance = new pluginByName.configClass(hydratedConfig);
                        
                        // Log what the constructor produced
                        SafeConsole.log(`📋 [EffectProcessingService] Config instance created:`, {
                            effectName,
                            flareRingsSizeRange: configInstance.flareRingsSizeRange,
                            flareRingsSizeRangeType: configInstance.flareRingsSizeRange?.constructor?.name,
                            hasLowerFunction: typeof configInstance.flareRingsSizeRange?.lower === 'function',
                            hasUpperFunction: typeof configInstance.flareRingsSizeRange?.upper === 'function'
                        });
                        
                        return configInstance;
                    }
                }
                SafeConsole.warn(`Effect ${effectName} not found in plugin registry, using deserialized config`);
                return hydratedConfig;
            }

            if (!plugin.configClass) {
                SafeConsole.warn(`No config class linked for effect ${effectName}, using deserialized config`);
                return hydratedConfig;
            }

            SafeConsole.log(`✅ Found config class for ${effectName}: ${plugin.configClass.name}`);
            
            // Log what we're passing to the constructor
            SafeConsole.log(`📦 [EffectProcessingService] Creating config instance with:`, {
                effectName,
                hydratedConfig
            });
            
            // Create proper config instance using the linked config class
            // This ensures default values are populated when hydratedConfig is empty
            const configInstance = new plugin.configClass(hydratedConfig);
            
            // Log what the constructor produced
            SafeConsole.log(`📋 [EffectProcessingService] Config instance created:`, {
                effectName,
                configInstance
            });
            
            return configInstance;

        } catch (error) {
            SafeConsole.error('Error creating config instance:', error);
            SafeConsole.error('Stack:', error.stack);
            // Return deserialized config as fallback to prevent crashes
            return hydratedConfig;
        }
    }

    /**
     * Check if a config object has proper class instances (not plain objects)
     * @param {Object} config - Config object to check
     * @returns {boolean} True if config has class instances with methods
     */
    static _hasClassInstances(config) {
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Check for common class instances that should have methods
        for (const [key, value] of Object.entries(config)) {
            if (value && typeof value === 'object') {
                const constructorName = value.constructor?.name;
                
                // Check for ColorPicker instances
                if (constructorName === 'ColorPicker' && typeof value.getColor === 'function') {
                    return true;
                }
                
                // Check for Range instances
                if (constructorName === 'Range' && typeof value.getRandom === 'function') {
                    return true;
                }
                
                // Check for Point2D instances
                if (constructorName === 'Point2D' && (value.x !== undefined || value.y !== undefined)) {
                    return true;
                }
                
                // Check for PercentageRange instances
                if (constructorName === 'PercentageRange' && typeof value.getPixels === 'function') {
                    return true;
                }
                
                // Recursively check nested objects
                if (!Array.isArray(value) && EffectProcessingService._hasClassInstances(value)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Manually reconstruct ColorPicker objects in config using introspection
     * @param {Object} config - Config object that may have ColorPicker properties
     * @param {Object} originalConfig - Original config with serialized ColorPicker data
     * @param {string} effectName - Name of the effect for logging and introspection
     * @param {EffectRegistryService} effectRegistryService - Optional shared registry service instance
     * @returns {Promise<Object>} Config with reconstructed ColorPicker objects
     */
    static async reconstructColorPickers(config, originalConfig, effectName, effectRegistryService) {
        try {
            // Get the config class to introspect property types
            // CRITICAL: effectRegistryService is REQUIRED - never create a new instance
            if (!effectRegistryService) {
                throw new Error('EffectProcessingService.reconstructColorPickers() requires effectRegistryService parameter');
            }
            const plugin = await effectRegistryService.getEffectWithConfig(effectName);

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
     * @param {EffectRegistryService} effectRegistryService - Optional shared registry service instance
     * @returns {Promise<Object>} Config with reconstructed PercentageRange objects
     */
    static async reconstructPercentageRanges(config, originalConfig, effectName, effectRegistryService) {
        SafeConsole.log(`🔍 [reconstructPercentageRanges] Called for ${effectName} with config:`, JSON.stringify(config, null, 2));

        try {
            // Load required modules
            const { PercentageRange, PercentageShortestSide, PercentageLongestSide } = await _loadModules();

            // Get the config class to introspect property types
            // CRITICAL: effectRegistryService is REQUIRED - never create a new instance
            if (!effectRegistryService) {
                throw new Error('EffectProcessingService.reconstructPercentageRanges() requires effectRegistryService parameter');
            }
            const plugin = await effectRegistryService.getEffectWithConfig(effectName);

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
                SafeConsole.log(`🔍 Checking ${effectName}.${key} for PercentageRange reconstruction:`, {
                    valueType: typeof value,
                    valueConstructor: value?.constructor?.name,
                    hasLower: !!value?.lower,
                    hasUpper: !!value?.upper,
                    lowerType: typeof value?.lower,
                    upperType: typeof value?.upper,
                    needsReconstruction: needsPercentageRangeReconstruction(value, key)
                });
                
                if (needsPercentageRangeReconstruction(value, key)) {
                    SafeConsole.log(`🔧 Reconstructing PercentageRange for ${effectName}.${key} (detected via introspection)`);

                    // Get default values for this field
                    const defaults = await this.getPercentageRangeDefaults(key, effectName, effectRegistryService);

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

                    const lowerInstance = new lowerSideClass(lowerPercent);
                    const upperInstance = new upperSideClass(upperPercent);
                    config[key] = new PercentageRange(lowerInstance, upperInstance);

                    SafeConsole.log(`✅ Reconstructed PercentageRange for ${key}:`, {
                        lowerPercent,
                        lowerSide,
                        lowerClass: lowerInstance.constructor.name,
                        upperPercent,
                        upperSide,
                        upperClass: upperInstance.constructor.name,
                        resultLowerType: typeof config[key].lower,
                        resultUpperType: typeof config[key].upper
                    });
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
     * @param {EffectRegistryService} effectRegistryService - Optional shared registry service instance
     * @returns {Promise<Object>} Default values for the field
     */
    static async getPercentageRangeDefaults(fieldName, effectName, effectRegistryService = null) {
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
            const configDefaults = await this.getConfigClassDefaults(effectName, fieldName, effectRegistryService);
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
     * @param {EffectRegistryService} effectRegistryService - Optional shared registry service instance
     * @returns {Promise<Object|null>} Default values or null
     */
    static async getConfigClassDefaults(effectName, fieldName, effectRegistryService) {
        try {
            // CRITICAL: effectRegistryService is REQUIRED - never create a new instance
            if (!effectRegistryService) {
                throw new Error('EffectProcessingService.getConfigClassDefaults() requires effectRegistryService parameter');
            }
            
            // Get the plugin to find the correct registry key
            let plugin = await effectRegistryService.getEffectWithConfig(effectName);
            if (!plugin) {
                plugin = await effectRegistryService.getEffectWithConfig(effectName.toLowerCase());
            }
            
            if (!plugin || !plugin.effectClass) {
                SafeConsole.warn(`Could not find effect: ${effectName}`);
                return null;
            }

            const ConfigRegistry = await effectRegistryService.getConfigRegistry();
            
            // Use effectClass._name_ (internal registry key) to look up config
            const registryKey = plugin.effectClass._name_ || effectName;
            const configData = ConfigRegistry.getGlobal(registryKey);
            
            if (configData && configData.ConfigClass) {
                // Create a default instance
                const defaultConfig = new configData.ConfigClass({});
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
