const ConfigSchemaGenerator = require('./implementations/ConfigSchemaGenerator');
const PropertyTypeAnalyzer = require('./services/PropertyTypeAnalyzer');
const LabelFormatter = require('./services/LabelFormatter');

/**
 * Utils factory for creating utility instances
 * Implements Dependency Inversion Principle for utilities
 */
class UtilsFactory {
    constructor() {
        this.instances = new Map();
    }

    /**
     * Get schema generator instance
     * @returns {ConfigSchemaGenerator} Schema generator
     */
    getSchemaGenerator() {
        if (!this.instances.has('schemaGenerator')) {
            const propertyAnalyzer = this.getPropertyAnalyzer();
            const schemaGenerator = new ConfigSchemaGenerator(propertyAnalyzer, LabelFormatter);
            this.instances.set('schemaGenerator', schemaGenerator);
        }
        return this.instances.get('schemaGenerator');
    }

    /**
     * Get property analyzer instance
     * @returns {PropertyTypeAnalyzer} Property analyzer
     */
    getPropertyAnalyzer() {
        if (!this.instances.has('propertyAnalyzer')) {
            const propertyAnalyzer = new PropertyTypeAnalyzer();
            this.instances.set('propertyAnalyzer', propertyAnalyzer);
        }
        return this.instances.get('propertyAnalyzer');
    }

    /**
     * Get label formatter
     * @returns {LabelFormatter} Label formatter
     */
    getLabelFormatter() {
        return LabelFormatter;
    }

    /**
     * Create custom schema generator with dependencies
     * @param {IPropertyAnalyzer} propertyAnalyzer - Property analyzer
     * @param {Object} labelFormatter - Label formatter
     * @returns {ConfigSchemaGenerator} Custom schema generator
     */
    createSchemaGenerator(propertyAnalyzer = null, labelFormatter = null) {
        return new ConfigSchemaGenerator(
            propertyAnalyzer || this.getPropertyAnalyzer(),
            labelFormatter || LabelFormatter
        );
    }

    /**
     * Clear all cached instances
     */
    clearCache() {
        this.instances.clear();
    }
}

// Export singleton instance and legacy exports for backward compatibility
const utilsFactory = new UtilsFactory();

module.exports = {
    // New SOLID factory interface
    UtilsFactory,
    utilsFactory,

    // Legacy exports for backward compatibility
    SchemaGenerator: utilsFactory.getSchemaGenerator(),
    generateSchema: (configClass) => utilsFactory.getSchemaGenerator().generateSchema(configClass),

    // Direct access to services
    PropertyTypeAnalyzer,
    LabelFormatter,
    ConfigSchemaGenerator
};