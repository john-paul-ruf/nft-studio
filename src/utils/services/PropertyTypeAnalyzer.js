import IPropertyAnalyzer from '../interfaces/IPropertyAnalyzer.js';

/**
 * Service for analyzing property types
 * Follows Single Responsibility Principle - only handles property type analysis
 */
class PropertyTypeAnalyzer extends IPropertyAnalyzer {
    /**
     * Get property type
     * @param {*} value - Property value
     * @returns {string} Property type
     */
    getPropertyType(value) {
        if (value === null || value === undefined) {
            return 'null';
        }

        if (Array.isArray(value)) {
            return 'array';
        }

        if (typeof value === 'object') {
            return this.getObjectType(value);
        }

        return typeof value;
    }

    /**
     * Get specific object type
     * @param {Object} value - Object value
     * @returns {string} Object type
     */
    getObjectType(value) {
        if (value.constructor?.name) {
            const constructorName = value.constructor.name;

            // Check for specific config types
            if (constructorName.includes('Percentage')) {
                return 'percentage';
            }
            if (constructorName.includes('Color')) {
                return 'color';
            }
            if (constructorName.includes('Point')) {
                return 'point';
            }
            if (constructorName.includes('Range')) {
                return 'range';
            }

            return constructorName.toLowerCase();
        }

        // Check for Point2D-like objects
        if (value.x !== undefined && value.y !== undefined) {
            return 'point2d';
        }

        // Check for range-like objects
        if ((value.min !== undefined && value.max !== undefined) ||
            (value.lower !== undefined && value.upper !== undefined)) {
            return 'range';
        }

        return 'object';
    }

    /**
     * Check if property should be excluded
     * @param {string} propertyName - Property name
     * @param {*} value - Property value
     * @returns {boolean} True if should be excluded
     */
    shouldExcludeProperty(propertyName, value) {
        // Exclude null/undefined values
        if (value === null || value === undefined) {
            return true;
        }

        // Exclude private properties (starting with _)
        if (propertyName.startsWith('_')) {
            return true;
        }

        // Exclude functions
        if (typeof value === 'function') {
            return true;
        }

        // Exclude internal properties
        const internalProperties = [
            'constructor',
            '__proto__',
            'toString',
            'valueOf'
        ];

        return internalProperties.includes(propertyName);
    }

    /**
     * Get field configuration for property
     * @param {string} propertyName - Property name
     * @param {*} value - Property value
     * @returns {Object|null} Field configuration
     */
    getFieldConfig(propertyName, value) {
        if (this.shouldExcludeProperty(propertyName, value)) {
            return null;
        }

        const type = this.getPropertyType(value);
        const config = {
            name: propertyName,
            type: type,
            defaultValue: value
        };

        // Add type-specific configuration
        switch (type) {
            case 'number':
                config.inputType = 'number';
                config.min = this.inferNumericMin(propertyName, value);
                config.max = this.inferNumericMax(propertyName, value);
                config.step = this.inferNumericStep(propertyName, value);
                break;

            case 'boolean':
                config.inputType = 'checkbox';
                break;

            case 'string':
                config.inputType = 'text';
                config.maxLength = this.inferStringMaxLength(propertyName);
                break;

            case 'percentage':
                config.inputType = 'range';
                config.min = 0;
                config.max = 100;
                config.step = 1;
                config.unit = '%';
                break;

            case 'color':
                config.inputType = 'color';
                break;

            case 'point2d':
                config.inputType = 'point2d';
                config.fields = [
                    { name: 'x', type: 'number' },
                    { name: 'y', type: 'number' }
                ];
                break;

            case 'range':
                config.inputType = 'range';
                config.hasMinMax = true;
                break;

            case 'array':
                config.inputType = 'array';
                config.itemType = this.inferArrayItemType(value);
                break;

            default:
                config.inputType = 'text';
                break;
        }

        return config;
    }

    /**
     * Infer numeric minimum value
     * @param {string} propertyName - Property name
     * @param {number} value - Current value
     * @returns {number} Inferred minimum
     */
    inferNumericMin(propertyName, value) {
        const name = propertyName.toLowerCase();

        if (name.includes('percent') || name.includes('opacity') || name.includes('alpha')) {
            return 0;
        }
        if (name.includes('count') || name.includes('number') || name.includes('size')) {
            return 0;
        }

        // Default to reasonable range around current value
        return Math.min(0, value - Math.abs(value));
    }

    /**
     * Infer numeric maximum value
     * @param {string} propertyName - Property name
     * @param {number} value - Current value
     * @returns {number} Inferred maximum
     */
    inferNumericMax(propertyName, value) {
        const name = propertyName.toLowerCase();

        if (name.includes('percent') || name.includes('opacity') || name.includes('alpha')) {
            return 100;
        }

        // Default to reasonable range around current value
        return Math.max(100, value + Math.abs(value) + 100);
    }

    /**
     * Infer numeric step value
     * @param {string} propertyName - Property name
     * @param {number} value - Current value
     * @returns {number} Inferred step
     */
    inferNumericStep(propertyName, value) {
        const name = propertyName.toLowerCase();

        if (name.includes('percent') || name.includes('opacity') || name.includes('alpha')) {
            return 1;
        }

        // Use smaller steps for small values
        if (Math.abs(value) < 1) {
            return 0.1;
        }
        if (Math.abs(value) < 10) {
            return 0.5;
        }

        return 1;
    }

    /**
     * Infer string maximum length
     * @param {string} propertyName - Property name
     * @returns {number} Inferred max length
     */
    inferStringMaxLength(propertyName) {
        const name = propertyName.toLowerCase();

        if (name.includes('name') || name.includes('title')) {
            return 100;
        }
        if (name.includes('description') || name.includes('text')) {
            return 500;
        }

        return 255;
    }

    /**
     * Infer array item type
     * @param {Array} arrayValue - Array value
     * @returns {string} Item type
     */
    inferArrayItemType(arrayValue) {
        if (arrayValue.length === 0) {
            return 'string';
        }

        const firstItem = arrayValue[0];
        return this.getPropertyType(firstItem);
    }
}

export default PropertyTypeAnalyzer;