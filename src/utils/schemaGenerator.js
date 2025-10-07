/**
 * Dynamic schema generator that introspects config classes to build UI forms
 */
import { safeConsoleError, safeConsoleLog } from './errorFormatter.js';

export class SchemaGenerator {
    /**
     * Generate a schema by analyzing a config class constructor and its default values
     * @param {Function} ConfigClass - The config class constructor
     * @returns {Object} Schema with field definitions for the UI
     */
    static generateSchema(ConfigClass) {
        try {
            // Create an instance with default values to analyze
            const defaultInstance = new ConfigClass({});

            const schema = {
                fields: []
            };

            // Analyze each property of the default instance
            for (const [propertyName, value] of Object.entries(defaultInstance)) {
                const field = this.analyzeProperty(propertyName, value);
                if (field) {
                    schema.fields.push(field);
                }
            }

            return schema;
        } catch (error) {
            safeConsoleError(`Error generating schema for ${ConfigClass.name}:`, error);
            return { fields: [] };
        }
    }

    /**
     * Analyze a property to determine its UI field type
     * @param {string} propertyName - Name of the property
     * @param {*} value - The default value
     * @returns {Object|null} Field definition or null if not supported
     */
    static analyzeProperty(propertyName, value) {
        if (value === null || value === undefined) {
            return null;
        }

        const field = {
            name: propertyName,
            label: this.formatLabel(propertyName)
        };

        // Analyze based on value type and structure
        if (typeof value === 'boolean') {
            field.type = 'boolean';
            field.default = value;
        }
        else if (typeof value === 'number') {
            if (propertyName.toLowerCase().includes('opacity') ||
                propertyName.toLowerCase().includes('percentage')) {
                field.type = 'percentage';
                field.default = value;
            } else {
                field.type = 'number';
                field.default = value;
                field.min = 0;
                field.max = this.guessMaxValue(propertyName, value);
            }
        }
        else if (typeof value === 'object' && value !== null) {
            // Check for specific object patterns
            if (this.isRangeObject(value)) {
                field.type = 'range';
                field.default = value;
                field.min = 0;
                field.max = this.guessMaxValue(propertyName, Math.max(value.lower || 0, value.upper || 0));
            }
            else if (this.isPoint2D(value)) {
                field.type = 'point2d';
                field.default = value;
            }
            else if (this.isColorPicker(value)) {
                field.type = 'colorpicker';
                field.bucketType = value.selectionType || 'colorBucket';
                field.default = value;
            }
            else if (this.isPercentageRange(value)) {
                safeConsoleLog(`🎯 Detected PercentageRange field: ${name}`, value);
                field.type = 'percentagerange';
                field.default = value;
            }
            else if (this.isDynamicRange(value)) {
                field.type = 'dynamicrange';
                field.default = value;
            }
            else if (Array.isArray(value)) {
                // Arrays are complex - show as JSON for now
                field.type = 'array';
                field.default = value;
            }
            else {
                // Generic object - show as JSON editor
                field.type = 'object';
                field.default = value;
            }
        }
        else if (typeof value === 'string') {
            field.type = 'text';
            field.default = value;
        }
        else {
            // Unsupported type
            return null;
        }

        return field;
    }

    /**
     * Check if object represents a Range (has lower/upper properties)
     */
    static isRangeObject(value) {
        return value &&
               typeof value === 'object' &&
               'lower' in value &&
               'upper' in value &&
               typeof value.lower === 'number' &&
               typeof value.upper === 'number';
    }

    /**
     * Check if object represents a Point2D (has x/y properties)
     */
    static isPoint2D(value) {
        return value &&
               typeof value === 'object' &&
               'x' in value &&
               'y' in value &&
               typeof value.x === 'number' &&
               typeof value.y === 'number';
    }

    /**
     * Check if object represents a ColorPicker (has selectionType property)
     */
    static isColorPicker(value) {
        return value &&
               typeof value === 'object' &&
               'selectionType' in value;
    }

    /**
     * Check if object represents a PercentageRange (has min/max percentage properties)
     */
    static isPercentageRange(value) {
        safeConsoleLog(`🔍 Checking isPercentageRange:`, value);
        if (!value || typeof value !== 'object') {
            safeConsoleLog(`❌ Not object:`, typeof value);
            return false;
        }

        // Legacy format: {min: number, max: number}
        if ('min' in value && 'max' in value) {
            return typeof value.min === 'number' &&
                   typeof value.max === 'number' &&
                   value.min >= 0 && value.min <= 1 &&
                   value.max >= 0 && value.max <= 1;
        }

        // Modern format: {lower: any, upper: any}
        if ('lower' in value && 'upper' in value) {
            // Enhanced format: {lower: {percent, side}, upper: {percent, side}}
            if (value.lower && typeof value.lower === 'object' &&
                value.upper && typeof value.upper === 'object' &&
                typeof value.lower.percent === 'number' &&
                typeof value.upper.percent === 'number') {
                return true;
            }

            // Simple format: {lower: number, upper: number}
            if (typeof value.lower === 'number' && typeof value.upper === 'number') {
                return true;
            }

            // Failed serialization format: {lower: [Object], upper: [Object]}
            // We'll treat this as PercentageRange and fix it in the component
            return true;
        }

        return false;
    }

    /**
     * Check if object represents a DynamicRange (has bottom/top with lower/upper)
     */
    static isDynamicRange(value) {
        return value &&
               typeof value === 'object' &&
               'bottom' in value &&
               'top' in value &&
               this.isRangeObject(value.bottom) &&
               this.isRangeObject(value.top);
    }

    /**
     * Convert camelCase property name to readable label
     */
    static formatLabel(propertyName) {
        return propertyName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Guess appropriate maximum value for numeric fields
     */
    static guessMaxValue(propertyName, currentValue) {
        const name = propertyName.toLowerCase();

        // Single-digit inputs that should use direct keyboard input (max <= 10)
        if (name.includes('stroke') || name.includes('thickness')) {
            return Math.min(10, Math.max(5, currentValue * 2));
        }
        if (name.includes('speed') && currentValue <= 5) {
            return Math.min(10, Math.max(5, currentValue * 2));
        }

        // Larger ranges that should keep sliders
        if (name.includes('number') || name.includes('count')) {
            return Math.max(100, currentValue * 4);
        }
        if (name.includes('size') || name.includes('radius')) {
            return Math.max(50, currentValue * 2);
        }
        if (name.includes('time') || name.includes('speed')) {
            return Math.max(20, currentValue * 3);
        }

        // Default reasonable maximum
        return Math.max(100, currentValue * 2);
    }

    /**
     * Load and introspect a config class from a module path
     * @param {string} modulePath - Path to the config module
     * @returns {Promise<Object>} Generated schema
     */
    static async generateSchemaFromModule(modulePath) {
        try {
            safeConsoleLog(`Would dynamically load schema from: ${modulePath}`);
            return { fields: [] };
        } catch (error) {
            safeConsoleError(`Error loading config from ${modulePath}:`, error);
            return { fields: [] };
        }
    }
}