/**
 * Interface for Effect Validation Operations
 * 
 * This interface defines the contract for validating effects,
 * configurations, and effect chains for correctness and compatibility.
 * 
 * @interface IEffectValidator
 */
export class IEffectValidator {
    /**
     * Validates an effect definition structure
     * 
     * @param {Object} effectDefinition - Effect definition to validate
     * @returns {Promise<EffectDefinitionValidationResult>} Validation result
     */
    async validateEffectDefinition(effectDefinition) {
        throw new Error('IEffectValidator.validateEffectDefinition() must be implemented');
    }

    /**
     * Validates effect configuration against its schema
     * 
     * @param {string} effectId - Unique effect identifier
     * @param {Object} config - Configuration to validate
     * @returns {Promise<ConfigValidationResult>} Validation result
     */
    async validateConfiguration(effectId, config) {
        throw new Error('IEffectValidator.validateConfiguration() must be implemented');
    }

    /**
     * Validates a chain of effects for compatibility
     * 
     * @param {Array<Object>} effectChain - Array of effect instances
     * @returns {Promise<ChainValidationResult>} Validation result
     */
    async validateEffectChain(effectChain) {
        throw new Error('IEffectValidator.validateEffectChain() must be implemented');
    }

    /**
     * Validates input data compatibility with an effect
     * 
     * @param {string} effectId - Unique effect identifier
     * @param {Object} inputData - Input data to validate
     * @returns {Promise<InputValidationResult>} Validation result
     */
    async validateInputData(effectId, inputData) {
        throw new Error('IEffectValidator.validateInputData() must be implemented');
    }

    /**
     * Validates effect parameters for type and range correctness
     * 
     * @param {string} effectId - Unique effect identifier
     * @param {Object} parameters - Parameters to validate
     * @returns {Promise<ParameterValidationResult>} Validation result
     */
    async validateParameters(effectId, parameters) {
        throw new Error('IEffectValidator.validateParameters() must be implemented');
    }

    /**
     * Validates effect dependencies and requirements
     * 
     * @param {string} effectId - Unique effect identifier
     * @returns {Promise<DependencyValidationResult>} Validation result
     */
    async validateDependencies(effectId) {
        throw new Error('IEffectValidator.validateDependencies() must be implemented');
    }

    /**
     * Validates effect performance characteristics
     * 
     * @param {string} effectId - Unique effect identifier
     * @param {Object} config - Effect configuration
     * @param {Object} inputData - Input data for performance estimation
     * @returns {Promise<PerformanceValidationResult>} Validation result
     */
    async validatePerformance(effectId, config, inputData) {
        throw new Error('IEffectValidator.validatePerformance() must be implemented');
    }

    /**
     * Validates effect output format compatibility
     * 
     * @param {string} effectId - Unique effect identifier
     * @param {string} outputFormat - Desired output format
     * @returns {Promise<FormatValidationResult>} Validation result
     */
    async validateOutputFormat(effectId, outputFormat) {
        throw new Error('IEffectValidator.validateOutputFormat() must be implemented');
    }

    /**
     * Gets validation schema for an effect
     * 
     * @param {string} effectId - Unique effect identifier
     * @returns {Promise<Object>} JSON schema for effect validation
     */
    async getValidationSchema(effectId) {
        throw new Error('IEffectValidator.getValidationSchema() must be implemented');
    }

    /**
     * Validates effect version compatibility
     * 
     * @param {string} effectId - Unique effect identifier
     * @param {string} requiredVersion - Required version
     * @returns {Promise<VersionValidationResult>} Validation result
     */
    async validateVersion(effectId, requiredVersion) {
        throw new Error('IEffectValidator.validateVersion() must be implemented');
    }

    /**
     * Performs comprehensive validation of an effect setup
     * 
     * @param {Object} effectSetup - Complete effect setup to validate
     * @param {string} effectSetup.effectId - Effect identifier
     * @param {Object} effectSetup.config - Effect configuration
     * @param {Object} effectSetup.inputData - Input data
     * @param {Array<Object>} [effectSetup.chain] - Effect chain context
     * @returns {Promise<ComprehensiveValidationResult>} Complete validation result
     */
    async validateEffectSetup(effectSetup) {
        throw new Error('IEffectValidator.validateEffectSetup() must be implemented');
    }
}

/**
 * Effect definition validation result structure
 * @typedef {Object} EffectDefinitionValidationResult
 * @property {boolean} isValid - Whether the definition is valid
 * @property {Array<string>} errors - List of definition errors
 * @property {Array<string>} warnings - List of definition warnings
 * @property {Object} metadata - Extracted metadata from definition
 */

/**
 * Configuration validation result structure
 * @typedef {Object} ConfigValidationResult
 * @property {boolean} isValid - Whether the configuration is valid
 * @property {Array<string>} errors - List of configuration errors
 * @property {Array<string>} warnings - List of configuration warnings
 * @property {Object} normalizedConfig - Configuration with defaults applied
 * @property {Array<string>} missingRequired - List of missing required parameters
 */

/**
 * Effect chain validation result structure
 * @typedef {Object} ChainValidationResult
 * @property {boolean} isValid - Whether the chain is valid
 * @property {Array<string>} errors - List of chain errors
 * @property {Array<string>} warnings - List of chain warnings
 * @property {Array<Object>} conflicts - List of effect conflicts
 * @property {Array<string>} optimizations - Suggested optimizations
 */

/**
 * Input validation result structure
 * @typedef {Object} InputValidationResult
 * @property {boolean} isValid - Whether the input is valid
 * @property {Array<string>} errors - List of input errors
 * @property {Array<string>} warnings - List of input warnings
 * @property {Object} requirements - Input requirements for the effect
 */

/**
 * Parameter validation result structure
 * @typedef {Object} ParameterValidationResult
 * @property {boolean} isValid - Whether parameters are valid
 * @property {Array<string>} errors - List of parameter errors
 * @property {Array<string>} warnings - List of parameter warnings
 * @property {Object} validatedParameters - Parameters with type coercion applied
 */

/**
 * Dependency validation result structure
 * @typedef {Object} DependencyValidationResult
 * @property {boolean} isValid - Whether dependencies are satisfied
 * @property {Array<string>} errors - List of dependency errors
 * @property {Array<string>} warnings - List of dependency warnings
 * @property {Array<string>} missingDependencies - List of missing dependencies
 */

/**
 * Performance validation result structure
 * @typedef {Object} PerformanceValidationResult
 * @property {boolean} isAcceptable - Whether performance is acceptable
 * @property {Array<string>} warnings - List of performance warnings
 * @property {Object} estimates - Performance estimates
 * @property {Array<string>} optimizations - Suggested optimizations
 */

/**
 * Format validation result structure
 * @typedef {Object} FormatValidationResult
 * @property {boolean} isSupported - Whether format is supported
 * @property {Array<string>} errors - List of format errors
 * @property {Array<string>} warnings - List of format warnings
 * @property {Array<string>} supportedFormats - List of supported formats
 */

/**
 * Version validation result structure
 * @typedef {Object} VersionValidationResult
 * @property {boolean} isCompatible - Whether version is compatible
 * @property {Array<string>} errors - List of version errors
 * @property {Array<string>} warnings - List of version warnings
 * @property {string} currentVersion - Current effect version
 * @property {string} requiredVersion - Required version
 */

/**
 * Comprehensive validation result structure
 * @typedef {Object} ComprehensiveValidationResult
 * @property {boolean} isValid - Whether the entire setup is valid
 * @property {Array<string>} errors - List of all errors
 * @property {Array<string>} warnings - List of all warnings
 * @property {Object} validationDetails - Detailed validation results by category
 * @property {Array<string>} recommendations - List of recommendations
 */