
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
 * Send IPC message to renderer process
 * @param {string} channel - IPC channel name
 * @param {*} data - Data to send
 */
function sendToRenderer(channel, data) {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            windows.forEach(window => {
                try {
                    window.webContents.send(channel, data);
                } catch (err) {
                    SafeConsole.log(`⚠️ [EffectRegistryService] Failed to send IPC message to window: ${err.message}`);
                }
            });
        }
    } catch (error) {
        SafeConsole.log(`⚠️ [EffectRegistryService] Failed to send to renderer: ${error.message}`);
    }
}

/**
 * Service responsible for effect registry operations only
 * Follows Single Responsibility Principle
 */
class EffectRegistryService {

    constructor(applicationFactory = null) {
        this.coreEffectsRegistered = false;
        this.applicationFactory = applicationFactory;
        // Cache for dynamically imported modules
        this._moduleCache = {};
        // Track initialization promise to prevent concurrent executions
        this._initializationPromise = null;
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
     * Uses registry cache for faster startup when available
     * @returns {Promise<void>}
     */
    async ensureCoreEffectsRegistered() {
        console.log('📞 [EffectRegistryService] ensureCoreEffectsRegistered() called');
        
        // CRITICAL: Prevent concurrent executions by returning the same promise
        // if initialization is already in progress
        if (this._initializationPromise) {
            console.log('   ↩️ Already initializing, returning cached promise');
            return this._initializationPromise;
        }

        if (!this.coreEffectsRegistered) {
            console.log('   🔄 First call, starting initialization...');
            // Start the initialization and cache the promise
            this._initializationPromise = this._performInitialization().then(
                result => {
                    console.log('✅ [EffectRegistryService] _performInitialization() COMPLETED SUCCESSFULLY');
                    return result;
                },
                error => {
                    console.error('❌ [EffectRegistryService] _performInitialization() FAILED WITH ERROR:');
                    console.error('   Error message:', error?.message);
                    console.error('   Stack:', error?.stack);
                    throw error;
                }
            );
            try {
                await this._initializationPromise;
            } finally {
                // Don't clear the promise - keep it cached so subsequent calls return immediately
                // (they'll just await the same resolved promise)
            }
        }

        return this._initializationPromise;
    }

    /**
     * Perform the actual initialization
     * @private
     */
    async _performInitialization() {
        // CRITICAL: Log at the very start to ensure this is called
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🚀🚀🚀 [EffectRegistryService] STARTUP SEQUENCE BEGINNING 🚀🚀🚀');
        console.log('═══════════════════════════════════════════════════════════════');
        
        try {
            SafeConsole.log('🚀 [EffectRegistryService] STARTUP: _performInitialization() started');

            // Load modules dynamically
            const { PluginLoader, ConfigLinker, EnhancedEffectsRegistration } = await this._loadModules();
            
            // 🏗️ ARCHITECTURE: Core effects are ALWAYS loaded from my-nft-gen
            // This ensures effects are always available regardless of cache state.
            // Cache optimization only affects plugin discovery, not core effects or config linking.
            SafeConsole.log('🔄 [EffectRegistryService] Loading core effects from my-nft-gen...');
            
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

            // 🔗 CRITICAL: ConfigLinker ALWAYS runs to connect core effects to their config schemas
            // This is the single source of truth for effect editability
            // ConfigRegistry must be populated for effects to appear in the UI config panel
            let configsLinked = false;
            try {
                SafeConsole.log('🔄 [EffectRegistryService] Linking configs to core effects...');
                SafeConsole.log('   📊 Before ConfigLinker.linkEffectsWithConfigs():');
                
                // Check PluginRegistry to see what effects exist
                const { PluginRegistry, ConfigRegistry: ConfigRegistryBefore, EffectRegistry: EffectReg } = await this._loadModules();
                const pluginsBeforeLink = PluginRegistry.getAllPlugins ? PluginRegistry.getAllPlugins() : [];
                SafeConsole.log(`   📍 PluginRegistry has ${Array.isArray(pluginsBeforeLink) ? pluginsBeforeLink.length : 0} plugins loaded`);
                
                // 🔍 DIAGNOSTIC: Deep inspect PluginRegistry structure
                try {
                    const sampleEffect = Array.isArray(pluginsBeforeLink) ? pluginsBeforeLink[0] : null;
                    const sampleEffectName = sampleEffect?.name;
                    if (sampleEffect) {
                        SafeConsole.log(`   📍 Sample effect "${sampleEffectName}" structure:`, {
                            type: typeof sampleEffect,
                            hasEffectClass: !!sampleEffect?.effectClass,
                            hasConfigClass: !!sampleEffect?.configClass,
                            keys: Object.keys(sampleEffect || {}).slice(0, 10)
                        });
                        
                        if (sampleEffect?.effectClass) {
                            SafeConsole.log(`      ↳ EffectClass properties:`, {
                                name: sampleEffect.effectClass.name,
                                hasConfigClass: !!sampleEffect.effectClass.configClass,
                                hasConfig: !!sampleEffect.effectClass.Config,
                                staticProps: Object.getOwnPropertyNames(sampleEffect.effectClass).slice(0, 8)
                            });
                        }
                    }
                } catch (inspectErr) {
                    SafeConsole.log(`   ⚠️ Failed to inspect sample effect:`, inspectErr.message);
                }
                
                // Call ConfigLinker
                SafeConsole.log('   🔗 Calling ConfigLinker.linkEffectsWithConfigs()...');
                await ConfigLinker.linkEffectsWithConfigs();
                SafeConsole.log('   ✅ ConfigLinker.linkEffectsWithConfigs() completed without error');
                
                // Check ConfigRegistry AFTER linking
                SafeConsole.log('   📊 After ConfigLinker.linkEffectsWithConfigs():');
                const allConfigs = ConfigRegistryBefore.getAll ? ConfigRegistryBefore.getAll() : {};
                const configCount = Object.keys(allConfigs).length;
                SafeConsole.log(`   📍 ConfigRegistry now has ${configCount} configs`);
                if (configCount > 0) {
                    SafeConsole.log(`   📍 First 10 config names:`, Object.keys(allConfigs).slice(0, 10));
                } else {
                    // ConfigRegistry is still empty after ConfigLinker - this is a SILENT FAILURE
                    SafeConsole.log(`   ⚠️ SILENT FAILURE: ConfigLinker completed but ConfigRegistry is still empty!`);
                    
                    // Try to diagnose why - check if configs can be loaded from effects
                    SafeConsole.log('   🔍 Attempting direct config discovery from loaded effects...');
                    try {
                        // Try to get configs from effect classes directly
                        const effectCategories = await import('my-nft-gen/src/core/registry/EffectCategories.js').then(m => m.EffectCategories);
                        const categories = [effectCategories.PRIMARY, effectCategories.SECONDARY, effectCategories.KEY_FRAME, effectCategories.FINAL_IMAGE];
                        let foundConfigsInEffects = 0;
                        
                        for (const category of categories) {
                            const effects = EffectReg.getByCategoryGlobal(category);
                            if (Array.isArray(effects)) {
                                for (const effect of effects) {
                                    if (effect?.configClass) {
                                        foundConfigsInEffects++;
                                    }
                                }
                            } else if (effects && typeof effects === 'object') {
                                for (const [, effectClass] of Object.entries(effects)) {
                                    if (effectClass?.configClass) {
                                        foundConfigsInEffects++;
                                    }
                                }
                            }
                        }
                        SafeConsole.log(`      Found ${foundConfigsInEffects} effect classes with configClass attached`);
                    } catch (discoverErr) {
                        SafeConsole.log(`      Failed to discover configs in effects:`, discoverErr.message);
                    }
                }
                
                configsLinked = configCount > 0;
                SafeConsole.log(`✅ [EffectRegistryService] Configs linked (success=${configsLinked})`);
                
            } catch (linkError) {
                // 🚨 LOG AS ERROR - this indicates a production issue
                SafeConsole.log('❌ [EffectRegistryService] CRITICAL: Config linking failed:', linkError.message);
                SafeConsole.log('   Stack:', linkError.stack);
                SafeConsole.log('   Full error object:', JSON.stringify(linkError, null, 2));
                SafeConsole.log('   ⚠️ BEFORE calling _manuallyRestoreConfigs (Approach 1 - exception handler)');
                
                // Try manual fallback: directly access loaded plugins and register their configs
                try {
                    SafeConsole.log('   ⏳ About to call _manuallyRestoreConfigs()...');
                    await this._manuallyRestoreConfigs();
                    SafeConsole.log('✅ [EffectRegistryService] Configs manually restored (fallback)');
                } catch (fallbackError) {
                    SafeConsole.log('❌ [EffectRegistryService] Manual config restoration also failed:', fallbackError.message);
                    SafeConsole.log('   Stack:', fallbackError.stack);
                    SafeConsole.log('   Core effects will have limited editability - this indicates a build or deployment issue');
                }
            }
            
            // If ConfigLinker silently failed to populate ConfigRegistry, run manual restoration
            if (!configsLinked) {
                SafeConsole.log('⚠️ [EffectRegistryService] ConfigLinker did not populate ConfigRegistry, attempting manual restoration...');
                SafeConsole.log('   ⚠️ BEFORE calling _manuallyRestoreConfigs (Approach 2 - silent failure handler)');
                try {
                    SafeConsole.log('   ⏳ About to call _manuallyRestoreConfigs()...');
                    await this._manuallyRestoreConfigs();
                    SafeConsole.log('✅ [EffectRegistryService] Configs manually restored (as fallback for silent failure)');
                } catch (fallbackError) {
                    SafeConsole.log('❌ [EffectRegistryService] Manual config restoration also failed:', fallbackError.message);
                    SafeConsole.log('   Stack:', fallbackError.stack);
                }
            }

            this.coreEffectsRegistered = true;
            SafeConsole.log('✅ [EffectRegistryService] Core effects registration complete');

            // Save to cache for next startup (if applicationFactory is available)
            // NOTE: Don't await this - save in background to prevent blocking app startup
            if (this.applicationFactory) {
                // Fire and forget - save cache in background
                this._saveToCache().catch(err => {
                    SafeConsole.log('⚠️ [EffectRegistryService] Background cache save failed (non-critical):', err.message);
                });
            }

            // NOTE: Plugin loading is now ONLY handled by PluginLoaderOrchestrator at app startup
            // This ensures the architectural constraint: "plugins register ONLY at startup or via plugin manager"
            // The orchestrator is initialized by main.js before IPC handlers are registered
            SafeConsole.log('✅ [EffectRegistryService] Core effects ready. Plugins will be loaded by PluginLoaderOrchestrator at startup.');

            // DISABLED: Debug logging was causing startup hangs (even with Promise.race timeout)
            // The app doesn't need this for functionality—it's just diagnostic
            // await this.logRegistryState();
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
                // Mark as registered anyway to prevent infinite retries
                this.coreEffectsRegistered = true;
                throw error; // Re-throw original error
            }
        }
    }

    /**
     * Log the current state of the registry for debugging
     * With timeout protection to prevent startup stalls
     * @returns {Promise<void>}
     */
    async logRegistryState() {
        // Add timeout to prevent startup hangs from debug logging
        const timeoutPromise = new Promise(resolve => {
            setTimeout(() => {
                SafeConsole.log('⏱️ [EffectRegistryService] Registry state logging timed out (skipping to unblock startup)');
                resolve();
            }, 3000); // 3 second timeout
        });

        const loggingPromise = (async () => {
            try {
                const { PluginRegistry, EffectCategories } = await this._loadModules();
                
                // Wrap synchronous calls with try-catch to catch any hanging operations
                let primaryEffects, secondaryEffects, keyFrameEffects, finalImageEffects;
                
                try {
                    primaryEffects = PluginRegistry.getByCategory(EffectCategories.PRIMARY);
                    secondaryEffects = PluginRegistry.getByCategory(EffectCategories.SECONDARY);
                    keyFrameEffects = PluginRegistry.getByCategory(EffectCategories.KEY_FRAME);
                    finalImageEffects = PluginRegistry.getByCategory(EffectCategories.FINAL_IMAGE);
                } catch (syncError) {
                    SafeConsole.log('⚠️ [EffectRegistryService] Error reading registry categories:', syncError.message);
                    return;
                }
                
                SafeConsole.log('📊 [EffectRegistryService] Current registry state:', {
                    primary: primaryEffects ? primaryEffects.length : 0,
                    secondary: secondaryEffects ? secondaryEffects.length : 0,
                    keyFrame: keyFrameEffects ? keyFrameEffects.length : 0,
                    finalImage: finalImageEffects ? finalImageEffects.length : 0
                });
                
                // Log the names of all effects
                if (primaryEffects && Array.isArray(primaryEffects)) {
                    SafeConsole.log('📊 [EffectRegistryService] Primary effects:', primaryEffects.map(p => p.name).join(', '));
                }
                if (secondaryEffects && Array.isArray(secondaryEffects)) {
                    SafeConsole.log('📊 [EffectRegistryService] Secondary effects:', secondaryEffects.map(p => p.name).join(', '));
                }
                if (finalImageEffects && Array.isArray(finalImageEffects)) {
                    SafeConsole.log('📊 [EffectRegistryService] Final image effects:', finalImageEffects.map(p => p.name).join(', '));
                }
            } catch (error) {
                SafeConsole.log('❌ [EffectRegistryService] Failed to log registry state:', error.message);
            }
        })();

        // Race: whichever completes first (logging or timeout)
        return Promise.race([loggingPromise, timeoutPromise]);
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
     * NOTE: Does NOT re-register plugins - only returns the registry
     * Plugins are registered ONLY at app startup via PluginLoaderOrchestrator
     * @returns {Promise<Object>} Plugin registry
     */
    async getPluginRegistry() {
        // CRITICAL: Don't call ensureCoreEffectsRegistered() here
        // That method registers plugins, which should ONLY happen at app startup
        // Getting the registry during render should NOT trigger re-registration
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
     *
     * @deprecated As of Phase 3 refactor - use PluginLoaderOrchestrator instead
     * Kept for backward compatibility, delegates to orchestrator when available
     *
     * @returns {Promise<void>}
     */
    async loadPluginsForUI() {
        // DEPRECATED: This method should not be called directly
        // Plugin loading is now ONLY handled by PluginLoaderOrchestrator at app startup
        // This method exists only for backwards compatibility in tests
        
        SafeConsole.log('❌ [EffectRegistryService] loadPluginsForUI() is deprecated and should not be called');
        SafeConsole.log('   Plugins are loaded by PluginLoaderOrchestrator during app startup');
        
        throw new Error('EffectRegistryService.loadPluginsForUI() is deprecated. Plugins must be loaded via PluginLoaderOrchestrator.loadInstalledPlugins()');
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

            // NOTE: Plugin reloading is now ONLY handled by PluginLoaderOrchestrator
            // This method only refreshes the registry, not loads new plugins
            SafeConsole.log('⚠️ [EffectRegistryService] Registry refresh will NOT reload plugins');

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

    // ==================== CONFIG RESTORATION FALLBACK ====================

    /**
     * Manually restore configs when ConfigLinker fails
     * This is an enhanced fallback that:
     * 1. First tries to copy configs from my-nft-gen's ConfigRegistry (most direct approach)
     * 2. Then checks for configs attached to effect classes
     * 3. Finally attempts dynamic imports as last resort
     * This fixes the production issue where configs aren't attached during build
     * @returns {Promise<void>}
     * @private
     */
    async _manuallyRestoreConfigs() {
        let EffectRegistry, ConfigRegistry, EffectCategories;
        try {
            SafeConsole.log('   🔍 [EffectRegistryService] Starting enhanced manual config restoration...');
            
            // Load modules with better error logging
            try {
                const modules = await this._loadModules();
                EffectRegistry = modules.EffectRegistry;
                ConfigRegistry = modules.ConfigRegistry;
                EffectCategories = modules.EffectCategories;
                SafeConsole.log('   ✅ Modules loaded successfully');
            } catch (moduleLoadError) {
                SafeConsole.log('   ❌ Failed to load modules:', moduleLoadError.message);
                throw moduleLoadError;
            }
            
            let configsRegistered = 0;
            
            // Try approach 1: Copy configs from my-nft-gen's ConfigRegistry
            SafeConsole.log('   📋 Approach 1: Copying from my-nft-gen ConfigRegistry...');
            try {
                const nftGenConfigs = await this._copyConfigsFromNftGenRegistry();
                configsRegistered += nftGenConfigs;
                if (nftGenConfigs > 0) {
                    SafeConsole.log(`   ✅ Approach 1 successful: Copied ${nftGenConfigs} configs from my-nft-gen ConfigRegistry`);
                } else {
                    SafeConsole.log(`   ⚠️ Approach 1 returned 0 configs - my-nft-gen registry may be empty or inaccessible`);
                }
            } catch (err) {
                SafeConsole.log(`   ⚠️ Approach 1 failed: ${err.message}`);
            }
            
            // Try approach 2: Fall back to checking effect classes and dynamic imports
            if (configsRegistered === 0) {
                SafeConsole.log('   📌 Approach 2: Checking effect classes and attempting dynamic imports...');
                
                try {
                    // Get all loaded effects from the registry
                    const categories = [EffectCategories.PRIMARY, EffectCategories.SECONDARY, EffectCategories.KEY_FRAME, EffectCategories.FINAL_IMAGE];
                    let effectsChecked = 0;
                    
                    for (const category of categories) {
                        try {
                            const effects = EffectRegistry.getByCategoryGlobal(category);
                            SafeConsole.log(`   📂 Category "${category}": effects=`, typeof effects, Array.isArray(effects) ? effects.length : Object.keys(effects || {}).length);
                            
                            if (Array.isArray(effects)) {
                                for (const effect of effects) {
                                    effectsChecked++;
                                    if (effect && effect.constructor) {
                                        const effectClass = effect.constructor;
                                        const effectName = effectClass._name_ || effectClass.name;
                                        
                                        // Try path 1: Config already attached to effect
                                        let configClassName = effectClass.configClass || effectClass.Config;
                                        
                                        if (!configClassName) {
                                            // Try path 2: Dynamic import for core effects
                                            SafeConsole.log(`      🔄 Attempting dynamic import for ${effectName}...`);
                                            configClassName = await this._dynamicallyImportConfigForEffect(effectName);
                                        }
                                        
                                        if (configClassName) {
                                            try {
                                                ConfigRegistry.registerGlobal(effectName, {
                                                    ConfigClass: configClassName,
                                                    effectName: effectName
                                                });
                                                configsRegistered++;
                                                SafeConsole.log(`         ✅ Registered config for ${effectName}`);
                                            } catch (regError) {
                                                SafeConsole.log(`         ⚠️ Failed to register config for ${effectName}:`, regError.message);
                                            }
                                        } else {
                                            SafeConsole.log(`         ❌ No config found for ${effectName} (not in class, dynamic import failed)`);
                                        }
                                    }
                                }
                            } else if (effects && typeof effects === 'object') {
                                // Effects might be an object map instead of array
                                for (const [effectName, effectClass] of Object.entries(effects)) {
                                    effectsChecked++;
                                    
                                    // Try path 1: Config already attached to effect
                                    let configClassName = effectClass?.configClass;
                                    
                                    if (!configClassName) {
                                        // Try path 2: Dynamic import for core effects
                                        SafeConsole.log(`      🔄 Attempting dynamic import for ${effectName}...`);
                                        configClassName = await this._dynamicallyImportConfigForEffect(effectName);
                                    }
                                    
                                    if (configClassName) {
                                        try {
                                            ConfigRegistry.registerGlobal(effectName, {
                                                ConfigClass: configClassName,
                                                effectName: effectName
                                            });
                                            configsRegistered++;
                                            SafeConsole.log(`         ✅ Registered config for ${effectName}`);
                                        } catch (regError) {
                                            SafeConsole.log(`         ⚠️ Failed to register config for ${effectName}:`, regError.message);
                                        }
                                    } else {
                                        SafeConsole.log(`         ❌ No config found for ${effectName} (not in class, dynamic import failed)`);
                                    }
                                }
                            }
                        } catch (categoryError) {
                            SafeConsole.log(`   ⚠️ Error processing category ${category}:`, categoryError.message);
                        }
                    }
                    
                    SafeConsole.log(`   📦 Approach 2 registered ${configsRegistered} configs out of ${effectsChecked} effects checked`);
                } catch (approach2Error) {
                    SafeConsole.log(`   ❌ Approach 2 failed completely:`, approach2Error.message);
                }
            }
            
            SafeConsole.log(`   📊 [EffectRegistryService] Manual restoration complete: ${configsRegistered} configs registered`);
        } catch (error) {
            SafeConsole.log('❌ [EffectRegistryService] Manual config restoration encountered critical error:', error.message);
            SafeConsole.log('   Stack:', error.stack);
            throw error;
        }
    }

    /**
     * Copy configs from my-nft-gen's ConfigRegistry to our local ConfigRegistry
     * This is the most direct approach since my-nft-gen already has all configs loaded
     * @returns {Promise<number>} Number of configs successfully copied
     * @private
     */
    async _copyConfigsFromNftGenRegistry() {
        let nftGenConfigRegistry = null;
        try {
            SafeConsole.log(`      🔄 Attempting to import my-nft-gen's ConfigRegistry...`);
            
            // Import my-nft-gen's ConfigRegistry module
            const configRegistryModule = await import('my-nft-gen/src/core/registry/ConfigRegistry.js');
            SafeConsole.log(`      📦 ConfigRegistry module loaded, exports:`, Object.keys(configRegistryModule || {}));
            
            // Get the ConfigRegistry class
            nftGenConfigRegistry = configRegistryModule.ConfigRegistry;
            if (!nftGenConfigRegistry) {
                SafeConsole.log(`      ⚠️ No ConfigRegistry export found. Trying default export...`);
                nftGenConfigRegistry = configRegistryModule.default;
            }
            
            if (!nftGenConfigRegistry) {
                SafeConsole.log(`      ❌ ConfigRegistry not found in module exports`);
                return 0;
            }
            
            SafeConsole.log(`      ✅ ConfigRegistry class loaded, methods:`, Object.keys(nftGenConfigRegistry || {}).slice(0, 10));
            
            const { ConfigRegistry: LocalConfigRegistry } = await this._loadModules();
            
            // Get all configs from my-nft-gen
            let nftGenConfigs = {};
            
            // Try getAll() method first
            if (typeof nftGenConfigRegistry.getAll === 'function') {
                SafeConsole.log(`      🔍 Calling getAll() on nftGenConfigRegistry...`);
                nftGenConfigs = nftGenConfigRegistry.getAll();
                SafeConsole.log(`      📍 getAll() returned:`, {
                    type: typeof nftGenConfigs,
                    isObject: nftGenConfigs && typeof nftGenConfigs === 'object',
                    keys: Object.keys(nftGenConfigs || {}).length,
                    firstFive: Object.keys(nftGenConfigs || {}).slice(0, 5)
                });
            } else if (typeof nftGenConfigRegistry.getAllGlobal === 'function') {
                SafeConsole.log(`      🔍 Calling getAllGlobal() on nftGenConfigRegistry...`);
                nftGenConfigs = nftGenConfigRegistry.getAllGlobal();
                SafeConsole.log(`      📍 getAllGlobal() returned:`, {
                    type: typeof nftGenConfigs,
                    isObject: nftGenConfigs && typeof nftGenConfigs === 'object',
                    keys: Object.keys(nftGenConfigs || {}).length,
                    firstFive: Object.keys(nftGenConfigs || {}).slice(0, 5)
                });
            } else {
                SafeConsole.log(`      ⚠️ NftGenConfigRegistry has no getAll/getAllGlobal methods. Available methods:`, Object.getOwnPropertyNames(nftGenConfigRegistry).slice(0, 15));
                return 0;
            }
            
            if (!nftGenConfigs || Object.keys(nftGenConfigs).length === 0) {
                SafeConsole.log(`      ⚠️ NftGenConfigRegistry returned empty (null, undefined, or empty object)`);
                SafeConsole.log(`      📌 Attempting fallback: extracting configs directly from loaded effect classes...`);
                return await this._extractConfigsFromEffectClasses();
            }
            
            SafeConsole.log(`      📋 Copying ${Object.keys(nftGenConfigs).length} configs from my-nft-gen registry...`);
            
            // Copy each config from my-nft-gen's registry to our local registry
            let copiedCount = 0;
            const failedConfigs = [];
            
            for (const [effectName, configData] of Object.entries(nftGenConfigs)) {
                try {
                    LocalConfigRegistry.registerGlobal(effectName, configData);
                    copiedCount++;
                    SafeConsole.log(`         ✅ Copied config for ${effectName}`);
                } catch (copyError) {
                    failedConfigs.push(effectName);
                    SafeConsole.log(`         ⚠️ Failed to copy config for ${effectName}:`, copyError.message);
                }
            }
            
            SafeConsole.log(`      📊 Copy result: ${copiedCount} succeeded, ${failedConfigs.length} failed`);
            if (failedConfigs.length > 0 && failedConfigs.length <= 10) {
                SafeConsole.log(`         Failed configs: ${failedConfigs.join(', ')}`);
            }
            
            return copiedCount;
        } catch (error) {
            SafeConsole.log(`      💥 CRITICAL ERROR in _copyConfigsFromNftGenRegistry: ${error.message}`);
            SafeConsole.log(`         Stack trace:`, error.stack);
            throw new Error(`Failed to copy configs from my-nft-gen ConfigRegistry: ${error.message}`);
        }
    }

    /**
     * Dynamically import a config class for an effect
     * Converts effect name to config class name and imports from my-nft-gen
     * Example: "hex" -> "HexConfig" from my-nft-gen/src/core/configs/
     * @param {string} effectName - Name of the effect (e.g., "hex", "blur-filter")
     * @returns {Promise<Class|null>} Config class if found, null otherwise
     * @private
     */
    async _dynamicallyImportConfigForEffect(effectName) {
        try {
            // Convert effect name to config class name
            // "hex" -> "HexConfig", "blur-filter" -> "BlurFilterConfig"
            const configClassName = this._deriveConfigClassName(effectName);
            
            SafeConsole.log(`         📋 Derived config class name: ${configClassName}`);
            
            // Try to dynamically import the config from my-nft-gen
            const importPath = `my-nft-gen/src/core/configs/${configClassName}.js`;
            
            try {
                const module = await import(importPath);
                const ConfigClass = module[configClassName] || module.default;
                
                if (ConfigClass) {
                    SafeConsole.log(`         ✅ Successfully imported ${configClassName} from ${importPath}`);
                    return ConfigClass;
                } else {
                    SafeConsole.log(`         ⚠️ Imported module but no ${configClassName} export found`);
                }
            } catch (importError) {
                // This is expected for some edge cases, log at debug level
                SafeConsole.log(`         ℹ️ Could not import ${importPath}: ${importError.message}`);
            }
            
            // Try alternative paths
            const alternativePaths = [
                `my-nft-gen/src/core/configs/${configClassName}Config.js`,
                `my-nft-gen/lib/core/configs/${configClassName}.js`
            ];
            
            for (const altPath of alternativePaths) {
                try {
                    const module = await import(altPath);
                    const ConfigClass = module[configClassName] || Object.values(module)[0];
                    
                    if (ConfigClass && typeof ConfigClass === 'function') {
                        SafeConsole.log(`         ✅ Successfully imported from alternative path: ${altPath}`);
                        return ConfigClass;
                    }
                } catch (altError) {
                    // Continue to next alternative
                }
            }
            
            return null;
        } catch (error) {
            SafeConsole.log(`         ⚠️ Dynamic import failed for ${effectName}:`, error.message);
            return null;
        }
    }

    /**
     * Convert effect name to config class name
     * Examples: "hex" -> "HexConfig", "blur-filter" -> "BlurFilterConfig", "redEye" -> "RedEyeConfig"
     * @param {string} effectName - Effect name
     * @returns {string} Config class name
     * @private
     */
    _deriveConfigClassName(effectName) {
        // Handle kebab-case, snake_case, and camelCase
        const parts = effectName
            .split(/[-_\s]/)
            .filter(p => p.length > 0);
        
        return parts
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join('')
            + 'Config';
    }

    /**
     * Extract and register configs directly from loaded effect classes
     * This is the ultimate fallback when my-nft-gen's ConfigRegistry is empty
     * @returns {Promise<number>} Number of configs extracted and registered
     * @private
     */
    async _extractConfigsFromEffectClasses() {
        try {
            SafeConsole.log(`      🔍 Extracting configs directly from loaded effect classes...`);
            const { ConfigRegistry: LocalConfigRegistry, EffectRegistry, EffectCategories } = await this._loadModules();
            
            let configsExtracted = 0;
            const categories = [EffectCategories.PRIMARY, EffectCategories.SECONDARY, EffectCategories.KEY_FRAME, EffectCategories.FINAL_IMAGE];
            
            for (const category of categories) {
                try {
                    const effects = EffectRegistry.getByCategoryGlobal(category);
                    
                    if (Array.isArray(effects)) {
                        // Effects is an array
                        for (const effect of effects) {
                            if (effect && effect.constructor) {
                                const effectClass = effect.constructor;
                                const effectName = effectClass._name_ || effectClass.name;
                                
                                // Extract Config from the effect class
                                const ConfigClass = effectClass.Config || effectClass.configClass;
                                if (ConfigClass) {
                                    try {
                                        LocalConfigRegistry.registerGlobal(effectName, {
                                            ConfigClass,
                                            effectName
                                        });
                                        configsExtracted++;
                                        SafeConsole.log(`         ✅ Extracted config for ${effectName} from effect class`);
                                    } catch (regError) {
                                        SafeConsole.log(`         ⚠️ Failed to register extracted config for ${effectName}:`, regError.message);
                                    }
                                }
                            }
                        }
                    } else if (effects && typeof effects === 'object') {
                        // Effects is an object map
                        for (const [effectName, effectClass] of Object.entries(effects)) {
                            // Extract Config from the effect class
                            const ConfigClass = effectClass?.Config || effectClass?.configClass;
                            if (ConfigClass) {
                                try {
                                    LocalConfigRegistry.registerGlobal(effectName, {
                                        ConfigClass,
                                        effectName
                                    });
                                    configsExtracted++;
                                    SafeConsole.log(`         ✅ Extracted config for ${effectName} from effect class`);
                                } catch (regError) {
                                    SafeConsole.log(`         ⚠️ Failed to register extracted config for ${effectName}:`, regError.message);
                                }
                            }
                        }
                    }
                } catch (categoryError) {
                    SafeConsole.log(`      ⚠️ Error processing category ${category}:`, categoryError.message);
                }
            }
            
            SafeConsole.log(`      ✅ Config extraction complete: ${configsExtracted} configs extracted from effect classes`);
            return configsExtracted;
        } catch (error) {
            SafeConsole.log(`      ❌ Config extraction failed:`, error.message);
            return 0;
        }
    }

    // ==================== CACHE INTEGRATION METHODS ====================

    /**
     * Try to load effects from cache (fast path)
     * @returns {Promise<boolean>} True if cache was used successfully
     * @private
     */
    async _tryLoadFromCache() {
        try {
            const registryCacheService = this.applicationFactory.getRegistryCacheService();
            const cache = await registryCacheService.loadCache();

            if (!cache) {
                SafeConsole.log('ℹ️ [EffectRegistryService] No cache found, loading normally');
                return false;
            }

            // Get current plugins to validate cache
            const appDataPath = app.getPath('userData');
            const pluginManager = new PluginManagerService(appDataPath);
            await pluginManager.initialize();
            const currentPlugins = await pluginManager.getPlugins();

            // Validate cache is still valid
            const isValid = await registryCacheService.validateCache(currentPlugins);

            if (!isValid) {
                SafeConsole.log('ℹ️ [EffectRegistryService] Cache invalid (plugins changed), loading normally');
                await registryCacheService.invalidateCache();
                return false;
            }

            SafeConsole.log('✅ [EffectRegistryService] Loading effects from cache (fast path)');

            // Restore from cache (much faster than re-registering)
            await this._restoreFromCache(cache);

            SafeConsole.log('✅ [EffectRegistryService] Registry restored from cache');
            await this.logRegistryState();

            return true;
        } catch (error) {
            SafeConsole.error('⚠️ [EffectRegistryService] Cache load error:', error.message);
            return false;
        }
    }

    /**
     * Restore registry from cache
     * @param {Object} cache - Cache data
     * @returns {Promise<void>}
     * @private
     */
    async _restoreFromCache(cache) {
        // 🔑 CORE EFFECTS: Load from my-nft-gen directly
        // They're already there and stable, just ensure they're loaded
        const { PluginLoader } = await this._loadModules();
        SafeConsole.log('🚀 [EffectRegistryService] Loading core effects from my-nft-gen...');
        await PluginLoader.ensureEffectsLoaded();
        SafeConsole.log('✅ [EffectRegistryService] Core effects loaded - they already have configs attached in my-nft-gen');

        // 📦 PLUGINS: Note cached plugin metadata
        // The actual plugin loading is handled by PluginLoaderOrchestrator at app startup
        const pluginCount = (cache.plugins || []).length;
        SafeConsole.log(`📦 [EffectRegistryService] Cache indicates ${pluginCount} plugin(s) were previously installed`);
        SafeConsole.log('   ℹ️ Plugin loading will be handled by PluginLoaderOrchestrator at startup');
    }

    /**
     * Capture current registry state for caching
     * With timeout to prevent startup hangs
     * @returns {Promise<Object>} Registry state
     * @private
     */
    async _captureRegistryState() {
        // Timeout to prevent plugin manager initialization from blocking startup
        const capturePromise = (async () => {
            try {
                const { EffectRegistry, EffectCategories } = await this._loadModules();

                // Get all registered effects by category
                const primaryEffects = EffectRegistry.getByCategoryGlobal(EffectCategories.PRIMARY);
                const secondaryEffects = EffectRegistry.getByCategoryGlobal(EffectCategories.SECONDARY);
                const keyFrameEffects = EffectRegistry.getByCategoryGlobal(EffectCategories.KEY_FRAME);
                const finalImageEffects = EffectRegistry.getByCategoryGlobal(EffectCategories.FINAL_IMAGE);

                // Get plugin data - WITH TIMEOUT to prevent hangs
                const appDataPath = app.getPath('userData');
                const pluginManager = new PluginManagerService(appDataPath);
                
                // Add timeout to plugin manager initialization (max 2 seconds)
                const pluginInitPromise = new Promise((resolve) => {
                    setTimeout(() => {
                        SafeConsole.log('⏱️ [EffectRegistryService] Plugin manager initialization timed out, skipping plugin capture for cache');
                        resolve([]);
                    }, 2000);
                });
                
                const pluginInitWithTimeout = Promise.race([
                    pluginManager.initialize().then(() => pluginManager.getPlugins()),
                    pluginInitPromise
                ]);

                const plugins = await pluginInitWithTimeout;

                // 🔑 IMPORTANT: Cache ONLY plugins, NOT core effects
                // Core effects are stable in my-nft-gen and are loaded directly via PluginLoader.ensureEffectsLoaded()
                return {
                    plugins: Array.isArray(plugins) ? plugins : []
                };
            } catch (error) {
                SafeConsole.log('⚠️ [EffectRegistryService] Failed to capture registry state:', error.message);
                return {
                    plugins: []
                };
            }
        })();

        // Overall timeout for entire capture operation (3 seconds max)
        return Promise.race([
            capturePromise,
            new Promise(resolve => {
                setTimeout(() => {
                    SafeConsole.log('⏱️ [EffectRegistryService] Registry state capture timed out, returning empty state for cache');
                    resolve({
                        plugins: []
                    });
                }, 3000);
            })
        ]);
    }

    /**
     * Save current registry state to cache
     * @returns {Promise<void>}
     * @private
     */
    async _saveToCache() {
        try {
            const registryCacheService = this.applicationFactory.getRegistryCacheService();
            const registryData = await this._captureRegistryState();

            await registryCacheService.saveCache(registryData);

            const stats = registryCacheService.getCacheStats();
            // Note: Cache only contains plugins, core effects are loaded from my-nft-gen
            SafeConsole.log(`💾 [EffectRegistryService] Cache saved: ${stats.pluginCount} plugins`);
        } catch (error) {
            SafeConsole.error('⚠️ [EffectRegistryService] Failed to save cache:', error.message);
            // Don't throw - cache save failure is non-critical
        }
    }

}

export default EffectRegistryService;