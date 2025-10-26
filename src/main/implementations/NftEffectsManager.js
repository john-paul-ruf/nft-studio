import EffectRegistryService from '../services/EffectRegistryService.js';
import ConfigProcessingService from '../services/ConfigProcessingService.js';
import EffectDiscoveryService from '../services/EffectDiscoveryService.js';
import EffectMetadataService from '../services/EffectMetadataService.js';
import EffectValidationService from '../services/EffectValidationService.js';
import EffectDefaultsService from '../services/EffectDefaultsService.js';
import ConfigIntrospectionService from '../services/ConfigIntrospectionService.js';
import EffectIPCSerializationService from '../services/EffectIPCSerializationService.js';

/**
 * NFT-specific implementation of effects management
 * Follows Open/Closed Principle - open for extension, closed for modification
 * 
 * Refactored as part of God Object Destruction Plan - Phase 6, Step 6.5
 * Original: 842 lines
 * Refactored: Uses 6 specialized services via facade pattern
 * 
 * Services:
 * - EffectDiscoveryService: Effect discovery and registry operations
 * - EffectMetadataService: Effect metadata retrieval
 * - EffectValidationService: Effect validation
 * - EffectDefaultsService: Default configuration generation
 * - ConfigIntrospectionService: Config introspection and initialization
 * - EffectIPCSerializationService: IPC serialization/deserialization
 */
class NftEffectsManager {
    constructor(effectRegistryService, configProcessingService) {
        // Dependency injection following Dependency Inversion Principle
        // CRITICAL: Both parameters are REQUIRED - no fallbacks allowed
        // Fallbacks would create multiple EffectRegistryService instances and cause initialization loops
        if (!effectRegistryService) {
            throw new Error('NftEffectsManager requires an effectRegistryService instance');
        }
        if (!configProcessingService) {
            throw new Error('NftEffectsManager requires a configProcessingService instance');
        }
        
        this.effectRegistryService = effectRegistryService;
        this.configProcessingService = configProcessingService;
        
        // Initialize service instances
        this.ipcSerializationService = new EffectIPCSerializationService();
        this.discoveryService = new EffectDiscoveryService(this.effectRegistryService);
        this.metadataService = new EffectMetadataService(this.effectRegistryService);
        this.validationService = new EffectValidationService(this.effectRegistryService);
        this.defaultsService = new EffectDefaultsService(this.effectRegistryService, this.ipcSerializationService);
        this.introspectionService = new ConfigIntrospectionService(this.effectRegistryService, this.ipcSerializationService);
    }

    // ============================================================================
    // Effect Discovery Methods
    // ============================================================================

    /**
     * Derive class name from effect name (kebab-case to PascalCase)
     * @param {string} effectName - Effect name (e.g., "red-eye", "hex")
     * @returns {string} Class name (e.g., "RedEye", "Hex")
     */
    deriveClassName(effectName) {
        return this.discoveryService.deriveClassName(effectName);
    }

    /**
     * Get available effects for dropdown menus (simplified version of discoverEffects)
     * @returns {Promise<Object>} Available effects by category
     */
    async getAvailableEffects() {
        return await this.discoveryService.getAvailableEffects();
    }

    /**
     * Discover available effects
     * @returns {Promise<Object>} Effects discovery result
     */
    async discoverEffects() {
        return await this.discoveryService.discoverEffects();
    }

    // ============================================================================
    // Effect Metadata Methods
    // ============================================================================

    /**
     * Get effect metadata
     * @param {Object} params - Effect parameters
     * @returns {Promise<Object>} Effect metadata
     */
    async getEffectMetadata({ effectName, category }) {
        return await this.metadataService.getEffectMetadata({ effectName, category });
    }

    /**
     * Get effect schema for UI generation
     * @param {string} effectName - Effect name (not className)
     * @returns {Promise<Object>} Effect schema
     */
    async getEffectSchema(effectName) {
        return await this.metadataService.getEffectSchema(effectName);
    }

    // ============================================================================
    // Effect Defaults Methods
    // ============================================================================

    /**
     * Get effect default configuration
     * @param {string} effectName - Effect name (not className)
     * @returns {Promise<Object>} Default configuration
     */
    async getEffectDefaults(effectName) {
        return await this.defaultsService.getEffectDefaults(effectName);
    }

    /**
     * Dynamically import config class from my-nft-effects-core
     * @param {string} effectName - Effect name
     * @returns {Promise<Function|null>} Config class or null
     */
    async dynamicImportConfigClass(effectName) {
        return await this.defaultsService.dynamicImportConfigClass(effectName);
    }

    /**
     * Build mapping of effect names to config import paths
     * @returns {Promise<Object>} Mapping object
     */
    async buildConfigMapping() {
        return await this.defaultsService.buildConfigMapping();
    }

    /**
     * Get expected config class name from effect name
     * @param {string} effectName - Effect name
     * @returns {string} Config class name
     */
    getConfigClassName(effectName) {
        return this.defaultsService.getConfigClassName(effectName);
    }

    // ============================================================================
    // Effect Validation Methods
    // ============================================================================

    /**
     * Validate effect configuration
     * @param {Object} effectMetadata - Effect metadata
     * @returns {Promise<Object>} Validation result
     */
    async validateEffect(effectMetadata) {
        return await this.validationService.validateEffect(effectMetadata);
    }

    // ============================================================================
    // Config Introspection Methods
    // ============================================================================

    /**
     * Introspect config for dynamic UI generation
     * @param {Object} params - Parameters
     * @returns {Promise<Object>} Introspection result
     */
    async introspectConfig({ effectName, projectData }) {
        return await this.introspectionService.introspectConfig({ effectName, projectData });
    }

    /**
     * Initialize ColorPicker objects with default colors from color scheme
     * This fixes the black screen issue caused by null colorValue
     * @param {Object} configInstance - Config instance to modify
     * @param {Object} projectData - Project data containing color scheme
     */
    initializeColorPickers(configInstance, projectData) {
        return this.introspectionService.initializeColorPickers(configInstance, projectData);
    }

    /**
     * Get default colors for a given color scheme
     * @param {string} colorScheme - Color scheme name
     * @returns {Object} Default colors object
     */
    getDefaultColorsForScheme(colorScheme) {
        return this.introspectionService.getDefaultColorsForScheme(colorScheme);
    }

    /**
     * Walk through object properties and initialize ColorPicker objects
     * @param {Object} obj - Object to walk through
     * @param {Object} defaultColors - Default colors to use
     * @param {Object} state - State object to maintain across recursive calls
     */
    walkObjectAndInitializeColorPickers(obj, defaultColors, state = { colorIndex: 0 }) {
        return this.introspectionService.walkObjectAndInitializeColorPickers(obj, defaultColors, state);
    }

    // ============================================================================
    // Config Processing Methods
    // ============================================================================

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

    // ============================================================================
    // IPC Serialization Methods
    // ============================================================================

    /**
     * Deep serialize object for IPC, handling circular references and non-serializable objects
     * @param {*} obj - Object to serialize
     * @param {WeakSet} visited - Set to track visited objects (for circular reference detection)
     * @returns {*} Serialized object safe for IPC
     */
    deepSerializeForIPC(obj, visited = new WeakSet()) {
        return this.ipcSerializationService.deepSerializeForIPC(obj, visited);
    }

    /**
     * Detect object class name based on structure when constructor info is lost
     * @param {Object} obj - Object to analyze
     * @returns {string|null} Detected class name or null
     */
    detectClassNameByStructure(obj) {
        return this.ipcSerializationService.detectClassNameByStructure(obj);
    }

    /**
     * Deep deserialize object from IPC, reconstructing class instances based on __className metadata
     * @param {*} obj - Object to deserialize
     * @param {WeakSet} visited - Set to track visited objects (for circular reference detection)
     * @returns {*} Deserialized object with proper class instances
     */
    async deepDeserializeFromIPC(obj, visited = new WeakSet()) {
        return await this.ipcSerializationService.deepDeserializeFromIPC(obj, visited);
    }

    /**
     * Reconstruct object from __className metadata
     * @param {Object} obj - Serialized object with __className
     * @returns {Promise<Object|null>} Reconstructed object or null if not reconstructible
     */
    async reconstructObjectFromClassName(obj) {
        return await this.ipcSerializationService.reconstructObjectFromClassName(obj);
    }
}

export default NftEffectsManager;