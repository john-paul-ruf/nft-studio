/**
 * ConfigIntrospectionService
 * 
 * Extracted from NftEffectsManager as part of God Object Destruction Plan - Phase 6, Step 6.5
 * 
 * Responsibilities:
 * - Introspect config for dynamic UI generation
 * - Initialize ColorPicker objects with default colors
 * - Manage color schemes and default colors
 * - Walk object trees to initialize ColorPickers
 * 
 * Single Responsibility: Config introspection and initialization
 */

class ConfigIntrospectionService {
    constructor(effectRegistryService, ipcSerializationService) {
        this.effectRegistryService = effectRegistryService;
        this.ipcSerializationService = ipcSerializationService;
    }

    /**
     * Introspect config for dynamic UI generation
     * @param {Object} params - Parameters
     * @returns {Promise<Object>} Introspection result
     */
    async introspectConfig({ effectName, projectData }) {
        try {
            await this.effectRegistryService.ensureCoreEffectsRegistered();

            // Guard against undefined or null effectName
            if (!effectName || typeof effectName !== 'string') {
                console.error(`❌ Backend: Invalid effectName received:`, effectName);
                throw new Error(`Invalid effect name: ${effectName}`);
            }

            console.log(`🔍 Backend: Looking for effect "${effectName}"`);

            // Use modern plugin registry with linked config classes
            let plugin = await this.effectRegistryService.getEffectWithConfig(effectName);

            // If not found, try lowercase version as fallback
            if (!plugin && effectName !== effectName.toLowerCase()) {
                console.log(`🔍 Backend: Trying lowercase version "${effectName.toLowerCase()}"`);
                plugin = await this.effectRegistryService.getEffectWithConfig(effectName.toLowerCase());
            }

            if (!plugin) {
                // Get all available effects to help debug
                const allEffects = await this.effectRegistryService.getAllEffectsWithConfigs();
                const allNames = [
                    ...allEffects.primary.map(e => e.name),
                    ...allEffects.secondary.map(e => e.name),
                    ...allEffects.keyFrame.map(e => e.name),
                    ...allEffects.finalImage.map(e => e.name)
                ];
                console.log(`🔍 Available effect names:`, allNames);
                throw new Error(`Effect not found: ${effectName}. Available effects: ${allNames.join(', ')}`);
            }

            // Log what we got from the registry
            console.log(`✅ Backend: Found plugin for "${effectName}":`, {
                hasConfigClass: !!plugin.configClass,
                hasEffectClass: !!plugin.effectClass,
                configClassName: plugin.configClass?.name || 'N/A',
                effectClassName: plugin.effectClass?.name || 'N/A',
                pluginKeys: Object.keys(plugin || {})
            });
            
            // DEBUG: Log what properties are on the effectClass
            if (plugin.effectClass) {
                const effectClassProps = Object.getOwnPropertyNames(plugin.effectClass);
                const effectClassMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(plugin.effectClass) || {});
                console.log(`   DEBUG: effectClass properties (first 15):`, effectClassProps.slice(0, 15));
                console.log(`   DEBUG: effectClass ALL static properties:`, effectClassProps);
                console.log(`   DEBUG: effectClass has these static properties:`, {
                    hasConfigClass: !!plugin.effectClass.configClass,
                    hasConfig: !!plugin.effectClass.Config,
                    hasDefaultConfig: !!plugin.effectClass.defaultConfig,
                    hasGetConfigSchema: typeof plugin.effectClass.getConfigSchema === 'function'
                });
                
                // Try to find any property that looks like it could be a config
                const configLikeProps = effectClassProps.filter(p => 
                    p.toLowerCase().includes('config') || 
                    p.toLowerCase().includes('schema') ||
                    p.toLowerCase().includes('field')
                );
                console.log(`   DEBUG: Config-like properties on effectClass:`, configLikeProps);
                
                // 🔍 PRODUCTION DEBUG: Log the actual effectClass to see structure
                console.log(`   DEBUG: effectClass full object:`, plugin.effectClass);
                console.log(`   DEBUG: effectClass.prototype:`, Object.getPrototypeOf(plugin.effectClass));
            }

            // 🔒 CRITICAL FIX: Get config from ConfigRegistry using effectClass._name_ (the internal registry key)
            // Configs are registered separately and stored in ConfigRegistry
            let ConfigClass = plugin.configClass;
            
            if (!ConfigClass) {
                console.log(`⚠️ Backend: Config class not in plugin object, checking ConfigRegistry...`);
                try {
                    const ConfigRegistry = await this.effectRegistryService.getConfigRegistry();
                    
                    // IMPORTANT: Use effectClass._name_ (internal registry key), not effectName (display name)
                    const registryKey = plugin.effectClass._name_ || effectName;
                    console.log(`   ConfigRegistry lookup key: "${registryKey}" (from effectClass._name_)`);
                    
                    const configData = ConfigRegistry.getGlobal(registryKey);
                    
                    console.log(`   ConfigRegistry lookup for "${registryKey}":`, {
                        found: !!configData,
                        hasConfigClass: !!configData?.ConfigClass,
                        configKeys: configData ? Object.keys(configData) : []
                    });
                    
                    // DEBUG: Log all registered configs to help diagnose the issue
                    const allConfigs = ConfigRegistry.getGlobal();
                    console.log(`   DEBUG: All registered configs (first 20):`, allConfigs ? Object.keys(allConfigs).slice(0, 20) : 'empty');
                    
                    if (configData && configData.ConfigClass) {
                        ConfigClass = configData.ConfigClass;
                        console.log(`✅ Backend: Retrieved config class from ConfigRegistry using key "${registryKey}"`);
                    }
                } catch (registryError) {
                    console.warn(`⚠️ Backend: ConfigRegistry lookup failed:`, registryError.message);
                }
            }
            
            // Fallback: Try to get from effectClass properties
            if (!ConfigClass && plugin.effectClass) {
                console.warn(`⚠️ Backend: Config not in ConfigRegistry, attempting fallback from effectClass`);
                console.log(`   Checking plugin.effectClass for config...`, {
                    hasConfigClass: !!plugin.effectClass.configClass,
                    hasConfig: !!plugin.effectClass.Config,
                    effectClassKeys: Object.keys(plugin.effectClass || {})
                });
                
                // Try to get the config class from the effect's configClass property
                if (plugin.effectClass.configClass) {
                    ConfigClass = plugin.effectClass.configClass;
                    console.log(`✅ Backend: Retrieved config class from effect.configClass`);
                } else if (plugin.effectClass.Config) {
                    ConfigClass = plugin.effectClass.Config;
                    console.log(`✅ Backend: Retrieved config class from effect.Config`);
                }
                
                // NOTE: Dynamic import fallback disabled
                // In production (asar bundle), dynamic imports with relative paths don't work
                // The configs MUST be loaded during EffectRegistryService initialization
                // via ConfigLinker.linkEffectsWithConfigs() or the fallback _manuallyRestoreConfigs()
                if (!ConfigClass) {
                    console.log(`⚠️ Backend: Config not found. This indicates ConfigLinker failed during startup.`);
                    console.log(`   Ensure EffectRegistryService properly initializes the ConfigRegistry at app startup.`);
                }
            }
            
            if (!ConfigClass) {
                throw new Error(`Config not found for effect: ${effectName} (missing from both ConfigRegistry and effectClass)`);
            }

            const actualConfigClass = ConfigClass;

            // Create default instance with project data (always pass an object)
            let defaultInstance;
            try {
                defaultInstance = new actualConfigClass(projectData || {});
                console.log(`✅ Backend: Config instance created for ${effectName}, properties:`, Object.keys(defaultInstance || {}));
            } catch (error) {
                console.error(`Error creating config instance for ${effectName}:`, error);
                throw new Error(`Failed to create config for effect ${effectName}: ${error.message}`);
            }

            // FIX: Initialize ColorPicker objects with default colors from color scheme
            this.initializeColorPickers(defaultInstance, projectData);

            // Serialize the config instance for IPC safety using deep object cloning
            const serializedInstance = this.ipcSerializationService.deepSerializeForIPC(defaultInstance);
            console.log(`✅ Backend: Config serialized for ${effectName}, serialized properties:`, Object.keys(serializedInstance || {}));

            return {
                success: true,
                defaultInstance: serializedInstance,
                effectMetadata: this.ipcSerializationService.deepSerializeForIPC(plugin), // ensure plugin is also serialized
                hasConfig: true
            };
        } catch (error) {
            console.error('Error introspecting config:', error);
            return {
                success: false,
                error: error.message,
                schema: { fields: [] }
            };
        }
    }

    /**
     * Initialize ColorPicker objects with default colors from color scheme
     * This fixes the black screen issue caused by null colorValue
     * @param {Object} configInstance - Config instance to modify
     * @param {Object} projectData - Project data containing color scheme
     */
    initializeColorPickers(configInstance, projectData) {
        try {
            const colorScheme = projectData?.colorScheme || 'default';

            // Get default colors based on color scheme
            const defaultColors = this.getDefaultColorsForScheme(colorScheme);

            // Find and initialize all ColorPicker objects
            this.walkObjectAndInitializeColorPickers(configInstance, defaultColors);

        } catch (error) {
            console.warn('Failed to initialize color pickers:', error.message);
            // Don't throw - fallback to existing behavior
        }
    }

    /**
     * Convert effect name to config class name
     * Examples: "hex" -> "HexConfig", "blur-filter" -> "BlurFilterConfig", "redEye" -> "RedEyeConfig"
     * @param {string} effectName - Effect name
     * @returns {string} Config class name
     * @private
     */
    _getConfigClassName(effectName) {
        // Convert kebab-case and camelCase to PascalCase
        return effectName
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join('')
            .replace(/([a-z])([A-Z])/g, '$1$2')  // Handle existing camelCase
            + 'Config';
    }

    /**
     * Get default colors for a given color scheme
     * @param {string} colorScheme - Color scheme name
     * @returns {Object} Default colors object
     */
    getDefaultColorsForScheme(colorScheme) {
        // Define default color palettes for different schemes as hex strings
        const colorSchemes = {
            'default': {
                primary: '#6495ed',   // Cornflower blue
                secondary: '#ff8c00', // Dark orange
                accent: '#32cd32',    // Lime green
                neutral: '#808080'    // Gray
            },
            'neon-cyberpunk': {
                primary: '#00ffff',   // Cyan
                secondary: '#ff00ff', // Magenta
                accent: '#00ff00',    // Green
                neutral: '#40e0d0'    // Turquoise
            },
            'synthwave': {
                primary: '#ff1493',   // Deep pink
                secondary: '#8a2be2', // Blue violet
                accent: '#ff69b4',    // Hot pink
                neutral: '#483d8b'    // Dark slate blue
            },
            'bright': {
                primary: '#ff4500',   // Red orange
                secondary: '#ffd700', // Gold
                accent: '#32cd32',    // Lime green
                neutral: '#ffffff'    // White
            }
        };

        return colorSchemes[colorScheme] || colorSchemes['default'];
    }

    /**
     * Walk through object properties and initialize ColorPicker objects
     * @param {Object} obj - Object to walk through
     * @param {Object} defaultColors - Default colors to use
     * @param {Object} state - State object to maintain across recursive calls
     */
    walkObjectAndInitializeColorPickers(obj, defaultColors, state = { colorIndex: 0 }) {
        if (!obj || typeof obj !== 'object') return;

        // Get available colors
        const colors = Object.values(defaultColors);

        Object.keys(obj).forEach(key => {
            const value = obj[key];

            if (value && typeof value === 'object') {
                // Check if this is a ColorPicker object by looking for its characteristic properties
                const isColorPicker = value.hasOwnProperty('selectionType') &&
                                    value.hasOwnProperty('colorValue') &&
                                    value.hasOwnProperty('getColor') &&
                                    typeof value.getColor === 'function';

                if (isColorPicker && value.colorValue === null) {
                    // Assign a default color hex string
                    const defaultColor = colors[state.colorIndex % colors.length];
                    value.colorValue = defaultColor; // Direct hex string assignment

                    console.log(`🎨 Initialized ${key} ColorPicker with color ${defaultColor}`);
                    state.colorIndex++;
                } else {
                    // Recursively walk nested objects (skip if already processed as ColorPicker)
                    if (!isColorPicker) {
                        this.walkObjectAndInitializeColorPickers(value, defaultColors, state);
                    }
                }
            }
        });
    }
}

// Export singleton instance
export default ConfigIntrospectionService;