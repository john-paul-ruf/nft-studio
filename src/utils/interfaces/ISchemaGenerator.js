/**
 * Interface for schema generation
 * Defines the contract for generating UI schemas from configuration classes
 */
class ISchemaGenerator {
    /**
     * Generate schema from config class
     * @param {Function} ConfigClass - Configuration class constructor
     * @returns {Object} Generated schema
     */
    generateSchema(ConfigClass) {
        throw new Error('Method not implemented');
    }

    /**
     * Analyze property to determine field type
     * @param {string} propertyName - Property name
     * @param {*} value - Property value
     * @returns {Object|null} Field definition or null
     */
    analyzeProperty(propertyName, value) {
        throw new Error('Method not implemented');
    }

    /**
     * Format label from property name
     * @param {string} propertyName - Property name
     * @returns {string} Formatted label
     */
    formatLabel(propertyName) {
        throw new Error('Method not implemented');
    }
}

export default ISchemaGenerator;