import ISchemaGenerator from '../interfaces/ISchemaGenerator.js';
import PropertyTypeAnalyzer from '../services/PropertyTypeAnalyzer.js';
import LabelFormatter from '../services/LabelFormatter.js';

/**
 * Configuration schema generator implementation
 * Follows Open/Closed Principle - open for extension, closed for modification
 * Follows Dependency Inversion Principle - depends on abstractions
 */
class ConfigSchemaGenerator extends ISchemaGenerator {
    constructor(propertyAnalyzer = null, labelFormatter = null) {
        super();
        // Dependency injection following Dependency Inversion Principle
        this.propertyAnalyzer = propertyAnalyzer || new PropertyTypeAnalyzer();
        this.labelFormatter = labelFormatter || LabelFormatter;
    }

    /**
     * Generate schema from config class
     * @param {Function} ConfigClass - Configuration class constructor
     * @returns {Object} Generated schema
     */
    generateSchema(ConfigClass) {
        try {
            if (!ConfigClass || typeof ConfigClass !== 'function') {
                throw new Error('ConfigClass must be a constructor function');
            }

            // Create an instance with default values to analyze
            const defaultInstance = new ConfigClass({});

            const schema = {
                className: ConfigClass.name,
                fields: [],
                metadata: {
                    generatedAt: new Date().toISOString(),
                    version: '1.0.0'
                }
            };

            // Analyze each property of the default instance
            for (const [propertyName, value] of Object.entries(defaultInstance)) {
                const field = this.analyzeProperty(propertyName, value);
                if (field) {
                    schema.fields.push(field);
                }
            }

            // Sort fields by importance and name
            schema.fields.sort(this.compareFields.bind(this));

            return schema;
        } catch (error) {
            console.error(`Error generating schema for ${ConfigClass?.name || 'unknown'}:`, error);
            return {
                className: ConfigClass?.name || 'unknown',
                fields: [],
                error: error.message,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    version: '1.0.0'
                }
            };
        }
    }

    /**
     * Analyze property to determine field type
     * @param {string} propertyName - Property name
     * @param {*} value - Property value
     * @returns {Object|null} Field definition or null
     */
    analyzeProperty(propertyName, value) {
        try {
            const fieldConfig = this.propertyAnalyzer.getFieldConfig(propertyName, value);

            if (!fieldConfig) {
                return null;
            }

            // Create complete field definition
            const field = {
                name: fieldConfig.name,
                type: fieldConfig.type,
                inputType: fieldConfig.inputType,
                label: this.formatLabel(propertyName),
                defaultValue: fieldConfig.defaultValue,
                description: this.labelFormatter.generateDescription(propertyName, value),
                placeholder: this.labelFormatter.generatePlaceholder(propertyName, value),
                helpText: this.labelFormatter.formatHelpText(propertyName, value),
                validation: this.createValidationRules(fieldConfig),
                metadata: {
                    originalType: typeof value,
                    constructorName: value?.constructor?.name
                }
            };

            // Add type-specific properties
            this.addTypeSpecificProperties(field, fieldConfig);

            return field;
        } catch (error) {
            console.error(`Error analyzing property ${propertyName}:`, error);
            return null;
        }
    }

    /**
     * Format label from property name
     * @param {string} propertyName - Property name
     * @returns {string} Formatted label
     */
    formatLabel(propertyName) {
        return this.labelFormatter.formatLabel(propertyName);
    }

    /**
     * Create validation rules for field
     * @param {Object} fieldConfig - Field configuration
     * @returns {Object} Validation rules
     */
    createValidationRules(fieldConfig) {
        const rules = {};

        if (fieldConfig.type === 'number') {
            if (fieldConfig.min !== undefined) {
                rules.min = fieldConfig.min;
            }
            if (fieldConfig.max !== undefined) {
                rules.max = fieldConfig.max;
            }
        }

        if (fieldConfig.type === 'string') {
            if (fieldConfig.maxLength !== undefined) {
                rules.maxLength = fieldConfig.maxLength;
            }
        }

        if (fieldConfig.inputType === 'color') {
            rules.pattern = /^#[0-9A-F]{6}$/i;
            rules.patternMessage = 'Must be a valid hex color (e.g., #FF0000)';
        }

        return rules;
    }

    /**
     * Add type-specific properties to field
     * @param {Object} field - Field definition
     * @param {Object} fieldConfig - Field configuration
     */
    addTypeSpecificProperties(field, fieldConfig) {
        // Add numeric properties
        if (fieldConfig.inputType === 'number' || fieldConfig.inputType === 'range') {
            if (fieldConfig.min !== undefined) field.min = fieldConfig.min;
            if (fieldConfig.max !== undefined) field.max = fieldConfig.max;
            if (fieldConfig.step !== undefined) field.step = fieldConfig.step;
            if (fieldConfig.unit !== undefined) field.unit = fieldConfig.unit;
        }

        // Add array properties
        if (fieldConfig.inputType === 'array') {
            field.itemType = fieldConfig.itemType;
            field.canAddItems = true;
            field.canRemoveItems = true;
        }

        // Add point2d properties
        if (fieldConfig.inputType === 'point2d') {
            field.fields = fieldConfig.fields;
        }

        // Add range properties
        if (fieldConfig.hasMinMax) {
            field.hasMinMax = true;
            field.rangeType = 'minmax';
        }

        // Add field priority for sorting
        field.priority = this.getFieldPriority(field.name, field.type);
    }

    /**
     * Get field priority for sorting
     * @param {string} fieldName - Field name
     * @param {string} fieldType - Field type
     * @returns {number} Priority (lower = higher priority)
     */
    getFieldPriority(fieldName, fieldType) {
        const name = fieldName.toLowerCase();

        // High priority fields (shown first)
        if (name.includes('enable') || name.includes('active')) return 1;
        if (name.includes('name') || name.includes('title')) return 2;
        if (name.includes('size') || name.includes('scale')) return 3;
        if (name.includes('color') || name.includes('colour')) return 4;
        if (name.includes('position') || name.includes('location')) return 5;

        // Medium priority fields
        if (fieldType === 'boolean') return 6;
        if (fieldType === 'number') return 7;
        if (fieldType === 'string') return 8;

        // Low priority fields (shown last)
        if (name.includes('advanced') || name.includes('debug')) return 10;

        return 9; // Default priority
    }

    /**
     * Compare fields for sorting
     * @param {Object} a - First field
     * @param {Object} b - Second field
     * @returns {number} Comparison result
     */
    compareFields(a, b) {
        // Sort by priority first
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }

        // Then by name alphabetically
        return a.label.localeCompare(b.label);
    }

    /**
     * Generate schema from module path (fallback method)
     * @param {string} modulePath - Path to module
     * @returns {Promise<Object>} Generated schema
     */
    async generateSchemaFromModule(modulePath) {
        try {
            console.log(`Would dynamically load schema from: ${modulePath}`);
            return { fields: [] };
        } catch (error) {
            console.error(`Error loading config from ${modulePath}:`, error);
            return { fields: [] };
        }
    }
}

export default ConfigSchemaGenerator;