/**
 * Interface for property analysis
 * Defines the contract for analyzing object properties
 */
class IPropertyAnalyzer {
    /**
     * Analyze property type
     * @param {*} value - Property value
     * @returns {string} Property type
     */
    getPropertyType(value) {
        throw new Error('Method not implemented');
    }

    /**
     * Check if property should be excluded
     * @param {string} propertyName - Property name
     * @param {*} value - Property value
     * @returns {boolean} True if should be excluded
     */
    shouldExcludeProperty(propertyName, value) {
        throw new Error('Method not implemented');
    }

    /**
     * Get field configuration for property
     * @param {string} propertyName - Property name
     * @param {*} value - Property value
     * @returns {Object|null} Field configuration
     */
    getFieldConfig(propertyName, value) {
        throw new Error('Method not implemented');
    }
}

export default IPropertyAnalyzer;