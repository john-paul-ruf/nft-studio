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

            if (!plugin.configClass) {
                throw new Error(`Config not found for effect: ${effectName}`);
            }

            const ConfigClass = plugin.configClass;

            // Create default instance with project data (always pass an object)
            let defaultInstance;
            try {
                defaultInstance = new ConfigClass(projectData || {});
            } catch (error) {
                console.error(`Error creating config instance for ${effectName}:`, error);
                throw new Error(`Failed to create config for effect ${effectName}: ${error.message}`);
            }

            // FIX: Initialize ColorPicker objects with default colors from color scheme
            this.initializeColorPickers(defaultInstance, projectData);

            // Serialize the config instance for IPC safety using deep object cloning
            const serializedInstance = this.ipcSerializationService.deepSerializeForIPC(defaultInstance);

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