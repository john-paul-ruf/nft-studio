import EffectRegistryService from '../services/EffectRegistryService.js';
import ConfigProcessingService from '../services/ConfigProcessingService.js';

/**
 * NFT-specific implementation of effects management
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class NftEffectsManager {
    constructor(effectRegistryService = null, configProcessingService = null) {
        // Dependency injection following Dependency Inversion Principle
        this.effectRegistryService = effectRegistryService || new EffectRegistryService();
        this.configProcessingService = configProcessingService || new ConfigProcessingService();
    }

    /**
     * Derive class name from effect name (kebab-case to PascalCase)
     * @param {string} effectName - Effect name (e.g., "red-eye", "hex")
     * @returns {string} Class name (e.g., "RedEye", "Hex")
     */
    deriveClassName(effectName) {
        return effectName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }

    /**
     * Get available effects for dropdown menus (simplified version of discoverEffects)
     * @returns {Promise<Object>} Available effects by category
     */
    async getAvailableEffects() {
        try {
            const effects = await this.effectRegistryService.getAllEffectsWithConfigs();

            // Return primary, secondary, and finalImage effects for the dropdown
            return {
                primary: effects.primary.map(plugin => ({
                    name: plugin.name,
                    registryKey: plugin.name, // Preserve the original registry key
                    displayName: plugin.metadata?.displayName || plugin.name,
                    description: plugin.metadata?.description || '',
                    className: this.deriveClassName(plugin.name),
                    configClassName: plugin.configClass ? plugin.configClass.name : (this.deriveClassName(plugin.name) + 'Config')
                })),
                secondary: effects.secondary.map(plugin => ({
                    name: plugin.name,
                    registryKey: plugin.name, // Preserve the original registry key
                    displayName: plugin.metadata?.displayName || plugin.name,
                    description: plugin.metadata?.description || '',
                    className: this.deriveClassName(plugin.name),
                    configClassName: plugin.configClass ? plugin.configClass.name : (this.deriveClassName(plugin.name) + 'Config')
                })),
                finalImage: effects.finalImage.map(plugin => ({
                    name: plugin.name,
                    registryKey: plugin.name, // Preserve the original registry key
                    displayName: plugin.metadata?.displayName || plugin.name,
                    description: plugin.metadata?.description || '',
                    className: this.deriveClassName(plugin.name),
                    configClassName: plugin.configClass ? plugin.configClass.name : (this.deriveClassName(plugin.name) + 'Config')
                }))
            };
        } catch (error) {
            console.error('Error getting available effects:', error);
            throw error;
        }
    }

    /**
     * Discover available effects
     * @returns {Promise<Object>} Effects discovery result
     */
    async discoverEffects() {
        try {
            // Use modern plugin registry with linked config classes
            const effects = await this.effectRegistryService.getAllEffectsWithConfigs();

            // Debug: Log raw effects (can be removed in production)
            // console.log('Raw effects from registry:', effects);

            // Serialize effects to be IPC-safe (remove functions and complex objects)
            const serializedEffects = {};
            for (const [category, categoryEffects] of Object.entries(effects)) {
                serializedEffects[category] = categoryEffects.map(plugin => {
                    // The plugin registry returns plugins with linked config classes
                    const effectName = plugin.name;
                    const className = this.deriveClassName(effectName);
                    const configClassName = plugin.configClass ? plugin.configClass.name : (className + 'Config');

                    return {
                        name: effectName,
                        displayName: plugin.metadata?.displayName || effectName,
                        description: plugin.metadata?.description || '',
                        category: plugin.category,
                        className: className,
                        configClassName: configClassName
                    };
                });
            }

            return {
                success: true,
                effects: serializedEffects
            };
        } catch (error) {
            console.error('Error discovering effects:', error);
            return {
                success: false,
                error: error.message,
                effects: null
            };
        }
    }

    /**
     * Get effect metadata
     * @param {Object} params - Effect parameters
     * @returns {Promise<Object>} Effect metadata
     */
    async getEffectMetadata({ effectName, category }) {
        try {
            const effect = await this.effectRegistryService.getEffect(effectName);
            if (!effect) {
                throw new Error(`Effect not found: ${effectName}`);
            }
            return effect;
        } catch (error) {
            console.error('Error getting effect metadata:', error);
            throw error;
        }
    }

    /**
     * Get effect default configuration
     * @param {string} effectName - Effect name (not className)
     * @returns {Promise<Object>} Default configuration
     */
    async getEffectDefaults(effectName) {
        try {
            // Input validation
            if (!effectName || typeof effectName !== 'string') {
                throw new Error(`Invalid effectName: ${effectName}. Must be a non-empty string.`);
            }

            await this.effectRegistryService.ensureCoreEffectsRegistered();

            // Use modern plugin registry with linked config classes
            let plugin = await this.effectRegistryService.getEffectWithConfig(effectName);

            // If not found, try lowercase version as fallback
            if (!plugin && effectName !== effectName.toLowerCase()) {
                console.log(`🔍 Backend getEffectDefaults: Trying lowercase version "${effectName.toLowerCase()}"`);
                plugin = await this.effectRegistryService.getEffectWithConfig(effectName.toLowerCase());
            }

            if (!plugin) {
                throw new Error(`Effect not found: ${effectName}`);
            }

            if (!plugin.configClass) {
                throw new Error(`No config found for effect: ${effectName}. Effect _name_: ${plugin.effectClass._name_}. Every effect must have a config.`);
            }

            const ConfigClass = plugin.configClass;
            console.log(`✅ Found config for ${effectName}: ${ConfigClass.name}`);

            // Create a proper default instance instead of using static getDefaults
            // This ensures complex objects like PercentageRange have proper methods
            const defaultInstance = new ConfigClass({});

            // Serialize the default instance to get JSON-safe defaults
            const serializedDefaults = this.deepSerializeForIPC(defaultInstance);

            console.log(`🎯 Generated defaults for ${effectName} (config key: ${plugin.effectClass._name_}):`, {
                totalProperties: Object.keys(serializedDefaults).length,
                hasRangeObjects: Object.values(serializedDefaults).some(v =>
                    v && typeof v === 'object' && v.hasOwnProperty('lower') && v.hasOwnProperty('upper')
                )
            });

            return serializedDefaults;
        } catch (error) {
            console.error('Error getting effect defaults:', error);
            throw error; // Re-throw to maintain fail-fast behavior
        }
    }

    /**
     * Dynamically import config class from my-nft-effects-core
     * @param {string} effectName - Effect name
     * @returns {Promise<Function|null>} Config class or null
     */
    async dynamicImportConfigClass(effectName) {
        try {
            // Create a mapping of known effect names to their config import paths
            const configMapping = await this.buildConfigMapping();

            if (configMapping[effectName]) {
                const configModule = await import(configMapping[effectName]);
                const configClassName = this.getConfigClassName(effectName);
                return configModule[configClassName];
            }

            return null;
        } catch (error) {
            console.warn(`⚠️  Failed to dynamically import config for ${effectName}:`, error.message);
            return null;
        }
    }

    /**
     * Build mapping of effect names to config import paths
     * @returns {Promise<Object>} Mapping object
     */
    async buildConfigMapping() {
        // Static mapping for known effects using the actual file path structure
        const basePath = './node_modules/my-nft-gen/../my-nft-effects-core/src/effects';
        return {
            'amp': `${basePath}/primaryEffects/amp/AmpConfig.js`,
            'fuzz-flare': `${basePath}/primaryEffects/fuzz-flare/FuzzFlareConfig.js`,
            'hex': `${basePath}/primaryEffects/hex/HexConfig.js`,
            'gates': `${basePath}/primaryEffects/gates/GatesConfig.js`,
            'layered-hex-now-with-fuzz': `${basePath}/primaryEffects/layeredHex/LayeredHexConfig.js`,
            'glow': `${basePath}/secondaryEffects/glow/GlowConfig.js`,
            'fade': `${basePath}/secondaryEffects/fade/FadeConfig.js`,
            'blur': `${basePath}/finalImageEffects/blur/BlurConfig.js`,
            'pixelate': `${basePath}/finalImageEffects/pixelate/PixelateConfig.js`
            // Add more mappings as needed
        };
    }

    /**
     * Get expected config class name from effect name
     * @param {string} effectName - Effect name
     * @returns {string} Config class name
     */
    getConfigClassName(effectName) {
        // Convert effect name to config class name (e.g., 'amp' -> 'AmpConfig')
        const words = effectName.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
        return words.join('') + 'Config';
    }

    /**
     * Get effect schema for UI generation
     * @param {string} effectName - Effect name (not className)
     * @returns {Promise<Object>} Effect schema
     */
    async getEffectSchema(effectName) {
        try {
            const ConfigRegistry = await this.effectRegistryService.getConfigRegistry();
            const configData = ConfigRegistry.getGlobal(effectName);

            if (!configData || !configData.ConfigClass) {
                console.error(`No config found for effect: ${effectName}`);
                return { fields: [] };
            }

            const ConfigClass = configData.ConfigClass;

            if (typeof ConfigClass.getSchema === 'function') {
                return ConfigClass.getSchema();
            }

            // Fallback to schema generator
            const { generateSchema } = await import('../../utils/schemaGenerator.js');
            return generateSchema(ConfigClass);

        } catch (error) {
            console.error('Error getting effect schema for', effectName, ':', error);
            return { fields: [] };
        }
    }

    /**
     * Validate effect configuration
     * @param {Object} effectMetadata - Effect metadata
     * @returns {Promise<Object>} Validation result
     */
    async validateEffect(effectMetadata) {
        try {
            await this.effectRegistryService.ensureCoreEffectsRegistered();
            return {
                valid: true,
                errors: []
            };
        } catch (error) {
            console.error('Error validating effect:', error);
            return {
                valid: false,
                errors: [error.message]
            };
        }
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
            const serializedInstance = this.deepSerializeForIPC(defaultInstance);

            return {
                success: true,
                defaultInstance: serializedInstance,
                effectMetadata: this.deepSerializeForIPC(plugin), // ensure plugin is also serialized
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

    /**
     * Convert configuration to proper types
     * @param {Object} config - Configuration object
     * @returns {Promise<Object>} Processed configuration
     */
    async convertConfigToProperTypes(config) {
        return await this.configProcessingService.convertConfigToProperTypes(config);
    }

    /**
     * Apply Point2D center override
     * @param {Object} config - Configuration object
     * @param {Object} projectData - Project data
     * @returns {Object} Processed configuration
     */
    applyPoint2DCenterOverride(config, projectData) {
        return this.configProcessingService.applyPoint2DCenterOverride(config, projectData);
    }

    /**
     * Deep serialize object for IPC, handling circular references and non-serializable objects
     * @param {*} obj - Object to serialize
     * @param {WeakSet} visited - Set to track visited objects (for circular reference detection)
     * @returns {*} Serialized object safe for IPC
     */
    deepSerializeForIPC(obj, visited = new WeakSet()) {
        // Handle null and undefined
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle functions - convert to string representation (check before object type)
        if (typeof obj === 'function') {
            return '[Function]';
        }

        // Handle primitive types and BigInt
        if (typeof obj !== 'object') {
            if (typeof obj === 'bigint') {
                return obj.toString() + 'n';
            }
            if (typeof obj === 'symbol') {
                return obj.toString();
            }
            return obj;
        }

        // Handle circular references
        if (visited.has(obj)) {
            return '[Circular Reference]';
        }

        // Add to visited set
        visited.add(obj);

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepSerializeForIPC(item, visited));
        }

        // Handle Date objects
        if (obj instanceof Date) {
            return obj.toISOString();
        }

        // Handle RegExp objects
        if (obj instanceof RegExp) {
            return obj.toString();
        }

        // Handle Error objects
        if (obj instanceof Error) {
            return {
                name: obj.name,
                message: obj.message,
                stack: obj.stack
            };
        }

        // Handle Buffer objects
        if (typeof Buffer !== 'undefined' && obj instanceof Buffer) {
            return `[Buffer: ${obj.length} bytes]`;
        }

        // Handle Map and Set objects
        if (obj instanceof Map) {
            return `[Map: ${obj.size} entries]`;
        }

        if (obj instanceof Set) {
            return `[Set: ${obj.size} entries]`;
        }

        // Handle WeakMap and WeakSet
        if (obj instanceof WeakMap) {
            return '[WeakMap]';
        }

        if (obj instanceof WeakSet) {
            return '[WeakSet]';
        }

        // Handle plain objects and class instances
        const result = {};

        try {
            // Get all own properties including non-enumerable ones (like methods)
            const allKeys = [
                ...Object.getOwnPropertyNames(obj),
                ...Object.getOwnPropertySymbols(obj).map(s => s.toString())
            ];

            for (const key of allKeys) {
                // Skip constructor and prototype
                if (key === 'constructor' || key === 'prototype') {
                    continue;
                }

                try {
                    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
                    if (descriptor && descriptor.value !== undefined) {
                        result[key] = this.deepSerializeForIPC(descriptor.value, visited);
                    } else if (descriptor && (descriptor.get || descriptor.set)) {
                        // Handle getters/setters
                        result[key] = '[Getter/Setter]';
                    }
                } catch (error) {
                    // If a property can't be serialized, replace with error info
                    result[key] = `[Serialization Error: ${error.message}]`;
                }
            }

            // Preserve class name if available
            if (obj.constructor && obj.constructor.name !== 'Object') {
                result.__className = obj.constructor.name;
            } else {
                // Fallback: detect object type based on structure when constructor info is lost
                const detectedClassName = this.detectClassNameByStructure(obj);
                if (detectedClassName) {
                    result.__className = detectedClassName;
                }
            }

        } catch (error) {
            console.error('Error during deep serialization:', error);
            return '[Serialization Failed]';
        }

        return result;
    }

    /**
     * Detect object class name based on structure when constructor info is lost
     * @param {Object} obj - Object to analyze
     * @returns {string|null} Detected class name or null
     */
    detectClassNameByStructure(obj) {
        if (!obj || typeof obj !== 'object') {
            return null;
        }

        // Detect PercentageRange: has lower and upper properties with percent and side
        if (obj.hasOwnProperty('lower') && obj.hasOwnProperty('upper')) {
            const lower = obj.lower;
            const upper = obj.upper;

            // Check if lower and upper have percent/side structure (PercentageRange)
            if (lower && typeof lower === 'object' &&
                lower.hasOwnProperty('percent') && lower.hasOwnProperty('side') &&
                upper && typeof upper === 'object' &&
                upper.hasOwnProperty('percent') && upper.hasOwnProperty('side')) {
                return 'PercentageRange';
            }

            // Check if it's a regular Range (numeric lower/upper)
            if (typeof lower === 'number' && typeof upper === 'number') {
                return 'Range';
            }
        }

        // Detect PercentageShortestSide/PercentageLongestSide: has percent and side properties
        if (obj.hasOwnProperty('percent') && obj.hasOwnProperty('side')) {
            if (obj.side === 'shortest') {
                return 'PercentageShortestSide';
            } else if (obj.side === 'longest') {
                return 'PercentageLongestSide';
            }
        }

        // Detect Point2D: has x and y numeric properties
        if (obj.hasOwnProperty('x') && obj.hasOwnProperty('y') &&
            typeof obj.x === 'number' && typeof obj.y === 'number') {
            return 'Point2D';
        }

        // Detect ColorPicker: has selectionType and colorValue properties
        if (obj.hasOwnProperty('selectionType') && obj.hasOwnProperty('colorValue') &&
            (obj.hasOwnProperty('getColor') || typeof obj.getColor !== 'undefined')) {
            return 'ColorPicker';
        }

        // Detect DynamicRange: has bottom and top properties with Range structure
        if (obj.hasOwnProperty('bottom') && obj.hasOwnProperty('top')) {
            const bottom = obj.bottom;
            const top = obj.top;
            if (bottom && typeof bottom === 'object' &&
                bottom.hasOwnProperty('lower') && bottom.hasOwnProperty('upper') &&
                top && typeof top === 'object' &&
                top.hasOwnProperty('lower') && top.hasOwnProperty('upper')) {
                return 'DynamicRange';
            }
        }

        return null; // Unknown structure
    }

    /**
     * Deep deserialize object from IPC, reconstructing class instances based on __className metadata
     * @param {*} obj - Object to deserialize
     * @param {WeakSet} visited - Set to track visited objects (for circular reference detection)
     * @returns {*} Deserialized object with proper class instances
     */
    async deepDeserializeFromIPC(obj, visited = new WeakSet()) {
        // Handle null and undefined
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle primitive types
        if (typeof obj !== 'object') {
            return obj;
        }

        // Handle circular references
        if (visited.has(obj)) {
            return obj; // Return as-is for circular refs
        }

        // Add to visited set
        visited.add(obj);

        // Handle arrays
        if (Array.isArray(obj)) {
            const result = [];
            for (const item of obj) {
                result.push(await this.deepDeserializeFromIPC(item, visited));
            }
            return result;
        }

        // Handle objects with __className metadata
        if (obj.__className) {
            try {
                const reconstructedObj = await this.reconstructObjectFromClassName(obj);
                if (reconstructedObj !== null) {
                    return reconstructedObj;
                }
            } catch (error) {
                console.warn(`Failed to reconstruct object with className ${obj.__className}:`, error.message);
                // Fall through to default object handling
            }
        } else {
            // Fallback: try to detect and reconstruct objects without __className (legacy support)
            const detectedClassName = this.detectClassNameByStructure(obj);
            if (detectedClassName) {
                console.log(`🔄 Detected legacy object type: ${detectedClassName}, attempting reconstruction`);
                try {
                    const reconstructedObj = await this.reconstructObjectFromClassName({
                        __className: detectedClassName,
                        ...obj
                    });
                    if (reconstructedObj !== null) {
                        return reconstructedObj;
                    }
                } catch (error) {
                    console.warn(`Failed to reconstruct detected object type ${detectedClassName}:`, error.message);
                    // Fall through to default object handling
                }
            }
        }

        // Handle plain objects - recursively deserialize nested objects
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === '__className') {
                // Preserve className metadata
                result[key] = value;
            } else {
                result[key] = await this.deepDeserializeFromIPC(value, visited);
            }
        }

        return result;
    }

    /**
     * Reconstruct object from __className metadata
     * @param {Object} obj - Serialized object with __className
     * @returns {Promise<Object|null>} Reconstructed object or null if not reconstructible
     */
    async reconstructObjectFromClassName(obj) {
        const { __className, ...props } = obj;

        try {
            // Import the required classes from my-nft-gen
            const {
                PercentageRange,
                PercentageShortestSide,
                PercentageLongestSide,
                Range,
                DynamicRange,
                Point2D,
                ColorPicker
            } = await import('my-nft-gen');

            switch (__className) {
                case 'PercentageRange':
                    // Reconstruct PercentageRange with proper lower/upper instances
                    const lowerInstance = props.lower ? await this.reconstructObjectFromClassName({
                        __className: props.lower.__className || 'PercentageShortestSide',
                        ...props.lower
                    }) : new PercentageShortestSide(0.1);

                    const upperInstance = props.upper ? await this.reconstructObjectFromClassName({
                        __className: props.upper.__className || 'PercentageLongestSide',
                        ...props.upper
                    }) : new PercentageLongestSide(0.9);

                    return new PercentageRange(lowerInstance, upperInstance);

                case 'PercentageShortestSide':
                    return new PercentageShortestSide(props.percent || 0.5);

                case 'PercentageLongestSide':
                    return new PercentageLongestSide(props.percent || 0.5);

                case 'Range':
                    return new Range(props.lower || 0, props.upper || 1);

                case 'DynamicRange':
                    const bottomRange = props.bottom ? await this.reconstructObjectFromClassName({
                        __className: props.bottom.__className || 'Range',
                        ...props.bottom
                    }) : new Range(0, 1);

                    const topRange = props.top ? await this.reconstructObjectFromClassName({
                        __className: props.top.__className || 'Range',
                        ...props.top
                    }) : new Range(0, 1);

                    return new DynamicRange(bottomRange, topRange);

                case 'Point2D':
                    return new Point2D(props.x || 0, props.y || 0);

                case 'ColorPicker':
                    // Reconstruct ColorPicker with preserved properties
                    const colorPicker = new ColorPicker();
                    colorPicker.selectionType = props.selectionType || 'color-bucket';
                    colorPicker.colorValue = props.colorValue || null;
                    return colorPicker;

                default:
                    console.warn(`Unknown className for reconstruction: ${__className}`);
                    return null;
            }
        } catch (error) {
            console.error(`Error reconstructing object with className ${__className}:`, error);
            return null;
        }
    }
}

export default NftEffectsManager;