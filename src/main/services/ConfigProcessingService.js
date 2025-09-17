/**
 * Service responsible for configuration processing only
 * Follows Single Responsibility Principle
 */
class ConfigProcessingService {
    /**
     * Convert configuration values to proper types
     * @param {Object} config - Configuration object
     * @returns {Promise<Object>} Processed configuration
     */
    async convertConfigToProperTypes(config) {
        if (!config || typeof config !== 'object') return config;

        const result = {};

        for (const [key, value] of Object.entries(config)) {
            if (typeof value === 'string') {
                result[key] = this.convertStringValue(value);
            } else if (Array.isArray(value)) {
                result[key] = await Promise.all(
                    value.map(item => this.convertConfigToProperTypes(item))
                );
            } else if (value && typeof value === 'object') {
                result[key] = await this.convertConfigToProperTypes(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Convert string value to appropriate type
     * @param {string} value - String value
     * @returns {*} Converted value
     */
    convertStringValue(value) {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (!isNaN(value) && !isNaN(parseFloat(value))) {
            return parseFloat(value);
        }
        return value;
    }

    /**
     * Apply Point2D center override for configurations
     * @param {Object} config - Configuration object
     * @param {Object} projectData - Project data with resolution
     * @returns {Object} Processed configuration
     */
    applyPoint2DCenterOverride(config, projectData) {
        if (!config || !projectData) return config;

        const centerX = projectData.resolution ? projectData.resolution.width / 2 : 0;
        const centerY = projectData.resolution ? projectData.resolution.height / 2 : 0;

        return this.processObjectForCenterOverride(config, centerX, centerY);
    }

    /**
     * Process object for center override recursively
     * @param {*} obj - Object to process
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @returns {*} Processed object
     */
    processObjectForCenterOverride(obj, centerX, centerY) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.processObjectForCenterOverride(item, centerX, centerY));
        }

        // Check if this is a Point2D-like object
        if (obj.x !== undefined && obj.y !== undefined) {
            return this.processPoint2DValue(obj, centerX, centerY);
        }

        // Process all properties recursively
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = this.processObjectForCenterOverride(value, centerX, centerY);
        }
        return result;
    }

    /**
     * Process Point2D value for center override
     * @param {Object} point - Point object with x, y properties
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @returns {Object} Processed point
     */
    processPoint2DValue(point, centerX, centerY) {
        if (point.x === 'center' && typeof point.y === 'number') {
            return { x: centerX, y: point.y };
        } else if (point.y === 'center' && typeof point.x === 'number') {
            return { x: point.x, y: centerY };
        } else if (point.x === 'center' && point.y === 'center') {
            return { x: centerX, y: centerY };
        }
        return point;
    }

    /**
     * Validate configuration object
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result
     */
    validateConfig(config) {
        const errors = [];

        if (!config || typeof config !== 'object') {
            errors.push('Configuration must be an object');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = ConfigProcessingService;