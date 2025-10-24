
// Static imports for core modules
import { app, BrowserWindow } from 'electron';
import { PluginManagerService } from '../../services/PluginManagerService.js';
import SecurePluginLoader from './SecurePluginLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import SafeConsole from "../utils/SafeConsole.js";
// Note: my-nft-gen modules are dynamically imported in _loadModules() to avoid path resolution issues in production

/**
 * Service responsible for effect registry operations only
 * Follows Single Responsibility Principle
 */
class EffectRegistryService {

    constructor() {
        this.coreEffectsRegistered = false;
        this.securePluginLoader = null;
        // Cache for dynamically imported modules
        this._moduleCache = {};
    }
    
    /**
     * Lazy load my-nft-gen modules to avoid circular dependencies
     */
    async _loadModules() {
        if (!this._moduleCache.loaded) {
            const [
                { PluginLoader },
                { ConfigLinker },
                { EnhancedEffectsRegistration },
                { PluginRegistry },
                { EffectCategories },
                { EffectRegistry },
                { ConfigRegistry },
                { PresetRegistry }
            ] = await Promise.all([
                import('my-nft-gen/src/core/plugins/PluginLoader.js'),
                import('my-nft-gen/src/core/registry/ConfigLinker.js'),
                import('my-nft-gen/src/core/registry/EnhancedEffectsRegistration.js'),
                import('my-nft-gen/src/core/registry/PluginRegistry.js'),
                import('my-nft-gen/src/core/registry/EffectCategories.js'),
                import('my-nft-gen/src/core/registry/EffectRegistry.js'),
                import('my-nft-gen/src/core/registry/ConfigRegistry.js'),
                import('my-nft-gen/src/core/registry/PresetRegistry.js')
            ]);
            
            this._moduleCache = {
                PluginLoader,
                ConfigLinker,
                EnhancedEffectsRegistration,
                PluginRegistry,
                EffectCategories,
                EffectRegistry,
                ConfigRegistry,
                PresetRegistry,
                loaded: true
            };
        }
        return this._moduleCache;
    }

    /**
     * Ensure core effects are registered only once using new enhanced registration with config linking
     * @returns {Promise<void>}
     */
    async ensureCoreEffectsRegistered() {
        if (!this.coreEffectsRegistered) {
            try {
                SafeConsole.log('🔄 [EffectRegistryService] Starting core effects registration...');
                
                // Load modules dynamically
                const { PluginLoader, ConfigLinker, EnhancedEffectsRegistration } = await this._loadModules();
                
                // CRITICAL: Pre-load base classes to avoid circular dependency issues
                // This ensures LayerEffect and other base classes are fully initialized
                // before any effects (core or plugin) try to extend them
                SafeConsole.log('🔄 [EffectRegistryService] Pre-loading base classes...');
                try {
                    // Import base classes in dependency order
                    await import('my-nft-gen/src/core/Settings.js');
                    await import('my-nft-gen/src/core/layer/Layer.js');
                    await import('my-nft-gen/src/core/layer/LayerEffect.js');
                    await import('my-nft-gen/src/core/factory/canvas/Canvas2dFactory.js');
                    await import('my-nft-gen/src/core/factory/layer/LayerFactory.js');
                    
                    // Add a small delay to ensure module initialization completes
                    await new Promise(resolve => setTimeout(resolve, 100));
                    SafeConsole.log('✅ [EffectRegistryService] Base classes pre-loaded');
                } catch (preloadError) {
                    SafeConsole.log('⚠️ [EffectRegistryService] Base class pre-load warning:', preloadError.message);
                    // Continue anyway - this is just a precaution
                }
                
                // Use the simpler PluginLoader approach that avoids validation issues
                // Ensure effects are loaded
                SafeConsole.log('🔄 [EffectRegistryService] Loading core effects...');
                
                // Try loading with retry logic for circular dependency issues
                let coreEffectsLoaded = false;
                let retryCount = 0;
                const maxRetries = 3;
                
                while (!coreEffectsLoaded && retryCount < maxRetries) {
                    try {
                        await PluginLoader.ensureEffectsLoaded();
                        coreEffectsLoaded = true;
                        SafeConsole.log('✅ [EffectRegistryService] Core effects loaded');
                    } catch (loadError) {
                        retryCount++;
                        if (loadError.message && loadError.message.includes('before initialization')) {
                            SafeConsole.log(`⚠️ [EffectRegistryService] Circular dependency detected (attempt ${retryCount}/${maxRetries})`);
                            if (retryCount < maxRetries) {
                                SafeConsole.log(`   💡 Waiting ${retryCount * 200}ms before retry...`);
                                await new Promise(resolve => setTimeout(resolve, retryCount * 200));
                            } else {
                                SafeConsole.log(`   ❌ Max retries reached, trying fallback method...`);
                                throw loadError;
                            }
                        } else {
                            throw loadError;
                        }
                    }
                }

                // Also try to link configs if possible
                try {
                    SafeConsole.log('🔄 [EffectRegistryService] Linking configs...');
                    await ConfigLinker.linkEffectsWithConfigs();
                    SafeConsole.log('✅ [EffectRegistryService] Configs linked');
                } catch (linkError) {
                    // Config linking is optional - effects will still work without it
                    SafeConsole.log('⚠️ [EffectRegistryService] Config linking skipped:', linkError.message);
                }

                this.coreEffectsRegistered = true;
                SafeConsole.log('✅ [EffectRegistryService] Core effects registration complete');
                
                // Load plugins AFTER core effects are fully registered to avoid circular dependencies
                SafeConsole.log('🔄 [EffectRegistryService] Loading user plugins...');
                await this.loadPluginsForUI();
                SafeConsole.log('✅ [EffectRegistryService] User plugins loaded');
                
                // Log registry state for debugging
                await this.logRegistryState();
            } catch (error) {
                SafeConsole.log('❌ [EffectRegistryService] Failed to register core effects:', error);

                // Try the original enhanced registration as a fallback
                try {
                    const { EnhancedEffectsRegistration } = await this._loadModules();
                    await EnhancedEffectsRegistration.registerEffectsFromPackage('my-nft-effects-core');

                    this.coreEffectsRegistered = true;
                    SafeConsole.log('✅ [EffectRegistryService] Core effects loaded using enhanced registration');
                } catch (fallbackError) {
                    SafeConsole.log('❌ [EffectRegistryService] All registration methods failed:', fallbackError);
                    throw error; // Re-throw original error
                }
            }
        }
    }
    
    /**
     * Log the current state of the registry for debugging
     * @returns {Promise<void>}
     */
    async logRegistryState() {
        try {
            const { PluginRegistry, EffectCategories } = await this._loadModules();
            const primaryEffects = PluginRegistry.getByCategory(EffectCategories.PRIMARY);
            const secondaryEffects = PluginRegistry.getByCategory(EffectCategories.SECONDARY);
            const keyFrameEffects = PluginRegistry.getByCategory(EffectCategories.KEY_FRAME);
            const finalImageEffects = PluginRegistry.getByCategory(EffectCategories.FINAL_IMAGE);
            
            SafeConsole.log('📊 [EffectRegistryService] Current registry state:', {
                primary: primaryEffects.length,
                secondary: secondaryEffects.length,
                keyFrame: keyFrameEffects.length,
                finalImage: finalImageEffects.length
            });
            
            // Log the names of all effects
            SafeConsole.log('📊 [EffectRegistryService] Primary effects:', primaryEffects.map(p => p.name).join(', '));
            SafeConsole.log('📊 [EffectRegistryService] Secondary effects:', secondaryEffects.map(p => p.name).join(', '));
            SafeConsole.log('📊 [EffectRegistryService] Final image effects:', finalImageEffects.map(p => p.name).join(', '));
        } catch (error) {
            SafeConsole.log('❌ [EffectRegistryService] Failed to log registry state:', error);
        }
    }

    /**
     * Get effect registry
     * @returns {Promise<Object>} Effect registry
     */
    async getEffectRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { EffectRegistry } = await this._loadModules();
        return EffectRegistry;
    }

    /**
     * Get config registry
     * @returns {Promise<Object>} Config registry
     */
    async getConfigRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { ConfigRegistry } = await this._loadModules();
        return ConfigRegistry;
    }

    /**
     * Get preset registry
     * @returns {Promise<Object>} Preset registry
     */
    async getPresetRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { PresetRegistry } = await this._loadModules();
        return PresetRegistry;
    }

    /**
     * Serialize a preset configuration for IPC transmission
     * Converts class instances to plain objects
     * @param {Object} preset - Preset object
     * @returns {Object} Serialized preset
     */
    _serializePreset(preset) {
        if (!preset) return null;
        
        // Create a deep copy and serialize the currentEffectConfig
        const serialized = {
            name: preset.name,
            effect: preset.effect,
            percentChance: preset.percentChance,
            currentEffectConfig: this._serializeConfig(preset.currentEffectConfig)
        };
        
        return serialized;
    }
    
    /**
     * Serialize a configuration object for IPC transmission
     * Converts class instances to plain objects with type information
     * @param {Object} config - Configuration object
     * @returns {Object} Serialized configuration
     */
    _serializeConfig(config) {
        if (!config || typeof config !== 'object') {
            return config;
        }
        
        const serialized = {};
        
        for (const [key, value] of Object.entries(config)) {
            if (value === null || value === undefined) {
                serialized[key] = value;
            } else if (typeof value === 'object' && value.constructor && value.constructor.name) {
                // Handle class instances - serialize them with type information
                const className = value.constructor.name;
                
                // For known types, extract their serializable properties
                if (className === 'ColorPicker') {
                    serialized[key] = {
                        __type: 'ColorPicker',
                        selectionType: value.selectionType,
                        colorValue: value.colorValue
                    };
                } else if (className === 'Range') {
                    serialized[key] = {
                        __type: 'Range',
                        lower: value.lower,
                        upper: value.upper
                    };
                } else if (className === 'DynamicRange') {
                    serialized[key] = {
                        __type: 'DynamicRange',
                        bottom: this._serializeConfig(value.bottom),
                        top: this._serializeConfig(value.top)
                    };
                } else if (className === 'Point2D') {
                    serialized[key] = {
                        __type: 'Point2D',
                        x: value.x,
                        y: value.y
                    };
                } else if (className === 'PercentageRange') {
                    // PercentageRange stores functions in lower/upper, not the original objects
                    // We need to extract the percent values by calling the functions
                    SafeConsole.log(`[Serialization] PercentageRange for key "${key}":`, {
                        originalValue: value,
                        lowerType: typeof value.lower,
                        upperType: typeof value.upper
                    });
                    
                    // Check if lower and upper are functions (they usually are in PercentageRange)
                    const lowerIsFunction = typeof value.lower === 'function';
                    const upperIsFunction = typeof value.upper === 'function';
                    
                    if (lowerIsFunction && upperIsFunction) {
                        // Extract percent values by calling functions with test size
                        // where shortestSide and longestSide are both 100
                        const testSize = { shortestSide: 100, longestSide: 100 };
                        try {
                            const lowerPixels = value.lower(testSize);
                            const upperPixels = value.upper(testSize);
                            const lowerPercent = lowerPixels / 100;
                            const upperPercent = upperPixels / 100;
                            
                            SafeConsole.log(`[Serialization] Extracted PercentageRange values for key "${key}":`, {
                                lowerPercent,
                                upperPercent
                            });
                            
                            // Determine side based on which function returned the value
                            // If lower and upper are the same, we can't determine the side reliably
                            // so we'll use 'shortest' for lower and 'longest' for upper as defaults
                            serialized[key] = {
                                __type: 'PercentageRange',
                                lower: {
                                    __type: 'PercentageShortestSide',
                                    percent: lowerPercent,
                                    side: 'shortest'
                                },
                                upper: {
                                    __type: 'PercentageLongestSide',
                                    percent: upperPercent,
                                    side: 'longest'
                                }
                            };
                        } catch (extractError) {
                            SafeConsole.log(`[Serialization] Failed to extract PercentageRange values:`, extractError);
                            // Fallback to null
                            serialized[key] = {
                                __type: 'PercentageRange',
                                lower: null,
                                upper: null,
                                _functionsDetected: true
                            };
                        }
                    } else {
                        // If they're not functions, serialize normally
                        const serializedLower = this._serializeConfig(value.lower);
                        const serializedUpper = this._serializeConfig(value.upper);
                        SafeConsole.log(`[Serialization] PercentageRange serialized for key "${key}":`, {
                            serializedLower,
                            serializedUpper
                        });
                        serialized[key] = {
                            __type: 'PercentageRange',
                            lower: serializedLower,
                            upper: serializedUpper
                        };
                    }
                } else if (className === 'PercentageShortestSide') {
                    // Extract all enumerable properties to ensure we get percent and side
                    const props = { ...value };
                    SafeConsole.log(`[Serialization] PercentageShortestSide for key "${key}":`, { 
                        originalValue: value, 
                        extractedProps: props,
                        percent: props.percent,
                        side: props.side
                    });
                    serialized[key] = {
                        __type: 'PercentageShortestSide',
                        percent: props.percent !== undefined ? props.percent : (props.value !== undefined ? props.value : 0.5),
                        side: props.side || 'shortest'
                    };
                } else if (className === 'PercentageLongestSide') {
                    // Extract all enumerable properties to ensure we get percent and side
                    const props = { ...value };
                    SafeConsole.log(`[Serialization] PercentageLongestSide for key "${key}":`, { 
                        originalValue: value, 
                        extractedProps: props,
                        percent: props.percent,
                        side: props.side
                    });
                    serialized[key] = {
                        __type: 'PercentageLongestSide',
                        percent: props.percent !== undefined ? props.percent : (props.value !== undefined ? props.value : 0.5),
                        side: props.side || 'longest'
                    };
                } else if (Array.isArray(value)) {
                    serialized[key] = value.map(item => this._serializeConfig(item));
                } else {
                    // For unknown types, try to serialize all enumerable properties
                    serialized[key] = {
                        __type: className,
                        ...Object.fromEntries(
                            Object.entries(value).filter(([k]) => !k.startsWith('_'))
                        )
                    };
                }
            } else if (Array.isArray(value)) {
                serialized[key] = value.map(item => this._serializeConfig(item));
            } else {
                serialized[key] = value;
            }
        }
        
        return serialized;
    }

    /**
     * Deserialize a configuration object from IPC transmission
     * Converts plain objects with __type metadata back into class instances
     * @param {Object} config - Serialized configuration object
     * @returns {Promise<Object>} Deserialized configuration with proper class instances
     */
    async _deserializeConfig(config) {
        if (!config || typeof config !== 'object') {
            return config;
        }

        // Handle arrays
        if (Array.isArray(config)) {
            const result = [];
            for (const item of config) {
                result.push(await this._deserializeConfig(item));
            }
            return result;
        }

        // Check if this object has a __type marker
        if (config.__type) {
            try {
                // Import the required classes from my-nft-gen with specific paths
                switch (config.__type) {
                    case 'ColorPicker': {
                        const { ColorPicker } = await import('my-nft-gen/src/core/layer/configType/ColorPicker.js');
                        // CRITICAL: Pass parameters to constructor, not set afterward
                        // The getColor method is defined in the constructor and captures the values
                        const selectionType = config.selectionType || 'color-bucket';
                        const colorValue = config.colorValue || null;
                        return new ColorPicker(selectionType, colorValue);
                    }

                    case 'Range': {
                        const { Range } = await import('my-nft-gen/src/core/layer/configType/Range.js');
                        return new Range(config.lower || 0, config.upper || 1);
                    }

                    case 'DynamicRange': {
                        const { DynamicRange } = await import('my-nft-gen/src/core/layer/configType/DynamicRange.js');
                        const bottom = await this._deserializeConfig(config.bottom);
                        const top = await this._deserializeConfig(config.top);
                        return new DynamicRange(bottom, top);
                    }

                    case 'Point2D': {
                        const { Point2D } = await import('my-nft-gen/src/core/layer/configType/Point2D.js');
                        return new Point2D(config.x || 0, config.y || 0);
                    }

                    case 'PercentageRange': {
                        const { PercentageRange } = await import('my-nft-gen/src/core/layer/configType/PercentageRange.js');
                        const lower = await this._deserializeConfig(config.lower);
                        const upper = await this._deserializeConfig(config.upper);
                        return new PercentageRange(lower, upper);
                    }

                    case 'PercentageShortestSide': {
                        const { PercentageShortestSide } = await import('my-nft-gen/src/core/layer/configType/PercentageShortestSide.js');
                        return new PercentageShortestSide(config.percent || 0.5);
                    }

                    case 'PercentageLongestSide': {
                        const { PercentageLongestSide } = await import('my-nft-gen/src/core/layer/configType/PercentageLongestSide.js');
                        return new PercentageLongestSide(config.percent || 0.5);
                    }

                    default:
                        SafeConsole.log(`⚠️ [EffectRegistryService] Unknown __type: ${config.__type}, returning as plain object`);
                        // Remove __type and return as plain object
                        const { __type, ...rest } = config;
                        return await this._deserializeConfig(rest);
                }
            } catch (error) {
                SafeConsole.log(`❌ [EffectRegistryService] Failed to deserialize ${config.__type}:`, error.message);
                SafeConsole.log(`   Stack:`, error.stack);
                // Return as plain object if deserialization fails
                const { __type, ...rest } = config;
                return rest;
            }
        }

        // Recursively deserialize nested objects
        const deserialized = {};
        for (const [key, value] of Object.entries(config)) {
            deserialized[key] = await this._deserializeConfig(value);
        }

        return deserialized;
    }

    /**
     * Get all presets for a specific effect
     * @param {string} effectName - Name of effect
     * @returns {Promise<Array|null>} Array of presets or null if none found
     */
    // Internal: read user presets map from user-preferences.json
    async _readUserPresetsMap() {
        try {
            const userDataPath = app.getPath('userData');
            const prefsPath = path.join(userDataPath, 'user-preferences.json');
            const content = await fs.readFile(prefsPath, 'utf8');
            const json = JSON.parse(content || '{}');
            return json.userPresets || {};
        } catch (e) {
            // File may not exist yet
            return {};
        }
    }

    // Internal: write user presets map back to user-preferences.json
    async _writeUserPresetsMap(updatedMap) {
        try {
            const userDataPath = app.getPath('userData');
            const prefsPath = path.join(userDataPath, 'user-preferences.json');
            let base = {};
            try {
                const content = await fs.readFile(prefsPath, 'utf8');
                base = JSON.parse(content || '{}');
            } catch {}
            base.userPresets = updatedMap;
            base.lastModified = new Date().toISOString();
            await fs.writeFile(prefsPath, JSON.stringify(base, null, 2), 'utf8');
            return true;
        } catch (e) {
            SafeConsole.log('❌ [EffectRegistryService] Failed to write user presets:', e.message);
            return false;
        }
    }

    async getPresetsForEffect(effectName) {
        const PresetReg = await this.getPresetRegistry();
        const builtInPresets = PresetReg.getGlobal(effectName) || [];

        // Serialize built-in presets and mark source
        const serializedBuiltIn = builtInPresets.map(p => ({
            ...this._serializePreset(p),
            metadata: { source: 'builtin' }
        }));

        // Load user presets for this effect
        const userMap = await this._readUserPresetsMap();
        const userForEffect = userMap[effectName] || {};
        const serializedUser = Object.entries(userForEffect).map(([name, config]) => ({
            name,
            percentChance: 100,
            currentEffectConfig: this._serializeConfig(config),
            metadata: { source: 'user' }
        }));

        const combined = [...serializedBuiltIn, ...serializedUser];
        // Ensure returned data is cloneable over IPC (plain JSON)
        const safeCombined = JSON.parse(JSON.stringify(combined));
        return safeCombined.length > 0 ? safeCombined : null;
    }

    /**
     * Get a specific preset by effect name and preset name
     * @param {string} effectName - Name of effect
     * @param {string} presetName - Name of preset
     * @returns {Promise<Object|null>} Preset object or null if not found
     */
    async getPreset(effectName, presetName) {
        // First, check user presets
        const userMap = await this._readUserPresetsMap();
        const userPresetConfig = userMap?.[effectName]?.[presetName] || null;
        if (userPresetConfig) {
            const obj = {
                name: presetName,
                effect: effectName,
                percentChance: 100,
                currentEffectConfig: this._serializeConfig(userPresetConfig),
                metadata: { source: 'user' }
            };
            return JSON.parse(JSON.stringify(obj));
        }

        // Fallback to built-in presets
        const PresetReg = await this.getPresetRegistry();
        const preset = PresetReg.getPresetGlobal(effectName, presetName);
        if (!preset) {
            return null;
        }
        const builtin = { ...this._serializePreset(preset), metadata: { source: 'builtin' } };
        const result = JSON.parse(JSON.stringify(builtin));
        
        // Log the final serialized preset for debugging
        SafeConsole.log(`[EffectRegistryService] Returning preset "${presetName}" for "${effectName}":`, {
            hasConfig: !!result.currentEffectConfig,
            configKeys: result.currentEffectConfig ? Object.keys(result.currentEffectConfig) : []
        });
        
        return result;
    }

    /**
     * Check if an effect has presets
     * @param {string} effectName - Name of effect
     * @returns {Promise<boolean>} True if effect has presets
     */
    async hasPresets(effectName) {
        const PresetReg = await this.getPresetRegistry();
        const hasBuiltIn = PresetReg.hasGlobal(effectName);
        const userMap = await this._readUserPresetsMap();
        const hasUser = !!userMap?.[effectName] && Object.keys(userMap[effectName]).length > 0;
        return hasBuiltIn || hasUser;
    }

    /**
     * Get preset names for an effect
     * @param {string} effectName - Name of effect
     * @returns {Promise<Array<string>>} Array of preset names
     */
    async getPresetNames(effectName) {
        const PresetReg = await this.getPresetRegistry();
        const builtIn = PresetReg.getPresetNamesGlobal(effectName) || [];
        const userMap = await this._readUserPresetsMap();
        const user = Object.keys(userMap?.[effectName] || {});
        return [...builtIn, ...user];
    }

    /**
     * Get all available effects by category
     * @returns {Promise<Object>} Effects by category
     */
    async getAllEffects() {
        const EffectReg = await this.getEffectRegistry();
        const { EffectCategories } = await this._loadModules();

        return {
            primary: EffectReg.getByCategoryGlobal(EffectCategories.PRIMARY),
            secondary: EffectReg.getByCategoryGlobal(EffectCategories.SECONDARY),
            keyFrame: EffectReg.getByCategoryGlobal(EffectCategories.KEY_FRAME),
            final: EffectReg.getByCategoryGlobal(EffectCategories.FINAL_IMAGE)
        };
    }

    /**
     * Get specific effect by name
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Effect or null if not found
     */
    async getEffect(effectName) {
        const EffectReg = await this.getEffectRegistry();
        return EffectReg.getGlobal(effectName);
    }

    /**
     * Get modern plugin registry with config linking
     * @returns {Promise<Object>} Plugin registry
     */
    async getPluginRegistry() {
        await this.ensureCoreEffectsRegistered();
        const { PluginRegistry } = await this._loadModules();
        return PluginRegistry;
    }

    /**
     * Get effect with its linked config class
     * @param {string} effectName - Name of effect
     * @returns {Promise<Object|null>} Plugin with effect and config class or null if not found
     */
    async getEffectWithConfig(effectName) {
        const PluginReg = await this.getPluginRegistry();
        return PluginReg.get(effectName);
    }

    /**
     * Get all effects with their config classes by category
     * @returns {Promise<Object>} Effects with configs by category
     */
    async getAllEffectsWithConfigs() {
        const PluginReg = await this.getPluginRegistry();
        const { EffectCategories } = await this._loadModules();

        const result = {
            primary: PluginReg.getByCategory(EffectCategories.PRIMARY),
            secondary: PluginReg.getByCategory(EffectCategories.SECONDARY),
            keyFrame: PluginReg.getByCategory(EffectCategories.KEY_FRAME),
            finalImage: PluginReg.getByCategory(EffectCategories.FINAL_IMAGE)
        };
        
        SafeConsole.log(`📊 [EffectRegistryService] getAllEffectsWithConfigs() returning:`, {
            primary: result.primary.length,
            secondary: result.secondary.length,
            keyFrame: result.keyFrame.length,
            finalImage: result.finalImage.length
        });
        
        return result;
    }

    /**
     * Get plugin registry statistics including config linking info
     * @returns {Promise<Object>} Registry statistics
     */
    async getRegistryStats() {
        const PluginReg = await this.getPluginRegistry();
        return PluginReg.getStats();
    }

    /**
     * Check if core effects are registered
     * @returns {boolean} True if registered
     */
    areCoreEffectsRegistered() {
        return this.coreEffectsRegistered;
    }

    /**
     * Debug method to check current registry state
     * @returns {Promise<Object>} Registry debug information
     */
    async debugRegistry() {
        try {
            const EffectReg = await this.getEffectRegistry();
            const { EffectCategories } = await this._loadModules();
            
            const debug = {
                primary: Object.keys(EffectReg.getByCategoryGlobal(EffectCategories.PRIMARY)),
                secondary: Object.keys(EffectReg.getByCategoryGlobal(EffectCategories.SECONDARY)),
                keyFrame: Object.keys(EffectReg.getByCategoryGlobal(EffectCategories.KEY_FRAME)),
                finalImage: Object.keys(EffectReg.getByCategoryGlobal(EffectCategories.FINAL_IMAGE))
            };
            
            return debug;
        } catch (error) {
            SafeConsole.error('❌ Failed to debug registry:', error);
            return { error: error.message };
        }
    }

    /**
     * Load plugins for UI display (called during initial effect registry setup)
     * @returns {Promise<void>}
     */
    async loadPluginsForUI() {
        try {
            // Load modules to ensure PluginLoader is available
            const { PluginLoader } = await this._loadModules();
            
            // Initialize secure plugin loader if not already done
            if (!this.securePluginLoader) {
                this.securePluginLoader = new SecurePluginLoader();
            }

            // Get enabled plugins
            const appDataPath = app.getPath('userData');
            const pluginManager = new PluginManagerService(appDataPath);
            await pluginManager.initialize();

            const pluginPaths = await pluginManager.loadPluginsForGeneration();

            SafeConsole.log(`📦 [EffectRegistryService] Found ${pluginPaths.length} plugin(s) to load`);
            SafeConsole.log(`📦 [EffectRegistryService] Running in ${app.isPackaged ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
            SafeConsole.log(`📦 [EffectRegistryService] app.isPackaged: ${app.isPackaged}, NODE_ENV: ${process.env.NODE_ENV}`);

            if (pluginPaths.length > 0) {
                SafeConsole.log('📦 [EffectRegistryService] Loading plugins for UI:', pluginPaths);

                for (const pluginInfo of pluginPaths) {
                    if (pluginInfo.success) {
                        try {
                            SafeConsole.log(`🔄 [EffectRegistryService] Loading plugin: ${pluginInfo.name} from ${pluginInfo.path}`);

                            // Use SecurePluginLoader for all plugins (handles import rewriting for my-nft-gen)
                            try {
                                SafeConsole.log(`🔄 [EffectRegistryService] Loading with SecurePluginLoader: ${pluginInfo.name}`);
                                SafeConsole.log(`   Plugin path: ${pluginInfo.path}`);
                                // Use loadPluginInMainProcess to load plugins with full Node.js module access
                                // This allows plugins to use my-nft-gen and native modules like 'sharp'
                                const result = await this.securePluginLoader.loadPluginInMainProcess(pluginInfo.path);
                                SafeConsole.log(`✅ [EffectRegistryService] Plugin loaded successfully: ${pluginInfo.name}`);
                                
                                // Register loaded effects with the actual EffectRegistry
                                if (result.success && result.effects && result.effects.length > 0) {
                                    SafeConsole.log(`📝 [EffectRegistryService] Registering ${result.effects.length} effect(s) from ${pluginInfo.name}`);
                                    
                                    try {
                                        // Get the real EffectRegistry to register effects
                                        const { EffectRegistry } = await this._loadModules();
                                        
                                        for (const effectData of result.effects) {
                                            try {
                                                SafeConsole.log(`   - Registering effect: ${effectData.name} (${effectData.category})`);
                                                
                                                // Use the actual effect class if available (from main process loader)
                                                // Otherwise, create a wrapper for isolated window results
                                                const EffectToRegister = effectData.effectClass || this.createSafeEffectWrapper(effectData);
                                                
                                                // Register with the actual registry using the static method
                                                EffectRegistry.registerGlobal(EffectToRegister, effectData.category, {
                                                    source: 'plugin',
                                                    pluginName: pluginInfo.name
                                                });
                                                
                                                SafeConsole.log(`   ✅ Effect registered: ${effectData.name}`);
                                            } catch (regError) {
                                                SafeConsole.log(`   ⚠️ Warning registering ${effectData.name}: ${regError.message}`);
                                            }
                                        }
                                    } catch (registryError) {
                                        SafeConsole.log(`⚠️ [EffectRegistryService] Could not register effects: ${registryError.message}`);
                                    }
                                } else if (!result.success) {
                                    SafeConsole.log(`⚠️ [EffectRegistryService] Plugin failed to load: ${result.error || 'Unknown error'}`);
                                } else {
                                    SafeConsole.log(`ℹ️ [EffectRegistryService] No effects returned from ${pluginInfo.name}`);
                                }
                            } catch (error) {
                                SafeConsole.log(`❌ [EffectRegistryService] Failed to load plugin: ${pluginInfo.name}`);
                                SafeConsole.log(`   Plugin path: ${pluginInfo.path}`);
                                SafeConsole.log(`   Error: ${error.message}`);
                                SafeConsole.log(`   `);
                                SafeConsole.log(`   💡 Troubleshooting:`);
                                SafeConsole.log(`   1. Ensure the plugin has a valid 'register' function exported`);
                                SafeConsole.log(`   2. Check that all dependencies (like my-nft-gen) are properly installed`);
                                SafeConsole.log(`   3. Verify the plugin's package.json has "type": "module"`);
                                SafeConsole.log(`   4. Make sure the plugin file is named 'plugin.js', 'index.js', or 'main.js'`);
                                SafeConsole.log(`   5. Check the logs above for SecurePluginLoader import rewriting issues`);
                                if (error.stack) {
                                    SafeConsole.log(`   Stack trace: ${error.stack}`);
                                }
                            }
                        } catch (error) {
                            SafeConsole.log(`❌ [EffectRegistryService] Failed to load plugin ${pluginInfo.name}:`, error);
                            SafeConsole.log(`   Plugin path: ${pluginInfo.path}`);
                            SafeConsole.log(`   Error: ${error.message}`);
                            if (error.stack) {
                                SafeConsole.log(`   Stack trace: ${error.stack}`);
                            }
                        }
                    }
                }

                SafeConsole.log(`✅ [EffectRegistryService] Finished loading ${pluginPaths.length} plugin(s)`);
            } else {
                SafeConsole.log('ℹ️ [EffectRegistryService] No plugins found to load');
            }
        } catch (error) {
            SafeConsole.log('❌ [EffectRegistryService] Failed to load plugins for UI:', error.message);
            SafeConsole.log('   Error details:', error.stack || error.toString());
            // Don't throw - this is optional for UI display
        }
    }

    /**
     * Create a safe wrapper for plugin effects
     * @param {Object} effectData - Effect data from sandbox
     * @returns {Class} Safe effect class
     */
    createSafeEffectWrapper(effectData) {
        class SafePluginEffect {
            constructor(...args) {
                this.effectData = effectData;
                this.args = args;
            }

            async apply(canvas, frame, config) {
                try {
                    // Execute effect code in a safe manner
                    // The actual effect logic was validated in the sandbox
                    SafeConsole.log(`🎨 Applying plugin effect: ${effectData.name}`);

                    // If we have the effect code, we can execute it
                    // Otherwise, this is a placeholder
                    if (effectData.effectCode) {
                        const effectFunc = new Function('canvas', 'frame', 'config', effectData.effectCode);
                        return await effectFunc.call(this, canvas, frame, config);
                    }

                    return canvas;
                } catch (error) {
                    SafeConsole.log(`❌ Plugin effect error in ${effectData.name}:`, error);
                    throw error;
                }
            }
        }

        // Set metadata for registry identification
        SafePluginEffect._name_ = effectData.name;
        SafePluginEffect._isPluginEffect_ = true;
        SafePluginEffect._metadata_ = {
            description: `Plugin effect: ${effectData.name}`,
            source: 'plugin'
        };

        return SafePluginEffect;
    }

    /**
     * Create a safe wrapper for plugin configs
     * @param {Object} configData - Config data from sandbox
     * @returns {Class} Safe config class
     */
    createSafeConfigWrapper(configData) {
        return class SafePluginConfig {
            constructor(...args) {
                this.configData = configData;
                this.args = args;
            }

            // Add config methods as needed
        };
    }

    /**
     * Cleanup resources when shutting down
     */
    async cleanup() {
        try {
            if (this.securePluginLoader) {
                SafeConsole.log('🧹 [EffectRegistryService] Cleaning up plugin loader...');
                this.securePluginLoader.cleanup();
                this.securePluginLoader = null;
            }
        } catch (error) {
            SafeConsole.log('❌ [EffectRegistryService] Cleanup error:', error);
        }
    }

    /**
     * Force refresh the effect registry (used after loading plugins)
     * This reloads the plugin registry to include newly loaded plugins
     * @param {boolean} skipPluginReload - Skip reloading plugins (used to prevent infinite loops)
     * @returns {Promise<void>}
     */
    async refreshRegistry(skipPluginReload = false) {
        try {
            SafeConsole.log('🔄 Refreshing effect registry...');

            // Load modules to ensure they're available
            const { EffectCategories, ConfigLinker } = await this._loadModules();

            // Only reload plugins if not explicitly skipped
            // This prevents infinite loops when refreshRegistry is called from plugin:loaded events
            if (!skipPluginReload) {
                // Reload plugins to ensure they're properly loaded
                await this.loadPluginsForUI();
            }

            // Force config linking again to pick up new plugins
            try {
                await ConfigLinker.linkEffectsWithConfigs();
                SafeConsole.log('✅ Config linking completed');
            } catch (linkError) {
                SafeConsole.log('⚠️ Config linking skipped:', linkError.message);
            }

            // Log current registry state for debugging
            const EffectReg = await this.getEffectRegistry();

            const primaryEffects = EffectReg.getByCategoryGlobal(EffectCategories.PRIMARY);
            SafeConsole.log('📊 Primary effects in registry:', Object.keys(primaryEffects));

            // Emit a single event to notify UI that effects should be reloaded
            // This is better than emitting multiple plugin:loaded events
            await this.emitEffectsRefreshedEvent();

            SafeConsole.log('✅ Effect registry refreshed');
        } catch (error) {
            SafeConsole.error('❌ Failed to refresh effect registry:', error);
            throw error;
        }
    }

    /**
     * Emit effects refreshed event to the renderer process
     */
    async emitEffectsRefreshedEvent() {
        try {
            const windows = BrowserWindow.getAllWindows();

            const event = {
                type: 'effects:refreshed',
                data: {
                    timestamp: new Date().toISOString()
                },
                timestamp: Date.now(),
                source: 'EffectRegistryService'
            };

            SafeConsole.log('📊 Emitting effects:refreshed event');

            windows.forEach(window => {
                window.webContents.send('eventbus-message', event);
            });
        } catch (error) {
            SafeConsole.error('Failed to emit effects refreshed event:', error);
        }
    }

}

export default EffectRegistryService;