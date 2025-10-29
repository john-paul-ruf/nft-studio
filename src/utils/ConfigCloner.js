/**
 * ConfigCloner - Deep cloning utility for effect configurations
 * 
 * Prevents shared reference bugs where multiple effect instances
 * accidentally share the same array/object references in their configs.
 * 
 * This is critical for array properties like MultiStepDefinitionConfig arrays
 * that can be shared at the class level in the my-nft-gen library.
 */

export class ConfigCloner {
    /**
     * Deep clone a configuration object
     * Handles nested objects, arrays, and special types (Range, Position, etc.)
     * 
     * @param {Object} config - Configuration object to clone
     * @returns {Object} Deep cloned configuration
     */
    static deepCloneConfig(config) {
        if (!config || typeof config !== 'object') {
            return config;
        }

        // Use JSON stringify/parse for a safe deep clone
        // This handles most common cases and is performant
        try {
            // First, handle circular references and functions by filtering them
            return JSON.parse(JSON.stringify(config, (key, value) => {
                // Skip functions - they'll be lost in stringification anyway
                if (typeof value === 'function') {
                    return undefined;
                }
                return value;
            }));
        } catch (error) {
            // Fallback: manual recursive cloning for complex objects
            console.warn('⚠️ ConfigCloner: JSON.stringify/parse failed, using manual clone:', error);
            return this._manualDeepClone(config);
        }
    }

    /**
     * Manual deep clone for complex objects that can't be JSON stringified
     * @private
     */
    static _manualDeepClone(obj, seen = new WeakMap()) {
        // Handle null and non-objects
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        // Handle circular references
        if (seen.has(obj)) {
            return seen.get(obj);
        }

        // Handle Date
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        // Handle Array
        if (Array.isArray(obj)) {
            const clonedArray = [];
            seen.set(obj, clonedArray);
            for (let i = 0; i < obj.length; i++) {
                clonedArray[i] = this._manualDeepClone(obj[i], seen);
            }
            return clonedArray;
        }

        // Handle Object
        const clonedObj = {};
        seen.set(obj, clonedObj);
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = this._manualDeepClone(obj[key], seen);
            }
        }
        return clonedObj;
    }

    /**
     * Shallow merge with deep cloning of array/object values
     * Used to safely merge configs without shared references
     * 
     * @param {Object} base - Base configuration
     * @param {Object} patch - Patch configuration
     * @returns {Object} Merged configuration with cloned values
     */
    static mergeConfigsWithCloning(base, patch) {
        if (!base || typeof base !== 'object') {
            base = {};
        }
        if (!patch || typeof patch !== 'object') {
            // Still need to clone base to break shared references
            return this.cloneArraysInConfig(base);
        }

        const merged = {};

        // CRITICAL: Deep-clone arrays and objects from BASE to break shared references
        // Otherwise, array properties inherited from class-level defaults remain shared
        for (const [key, value] of Object.entries(base)) {
            if (value === null || value === undefined) {
                merged[key] = value;
            } else if (Array.isArray(value)) {
                merged[key] = this.deepCloneConfig(value);
            } else if (typeof value === 'object' && value.constructor === Object) {
                merged[key] = this.deepCloneConfig(value);
            } else {
                // Primitives and special objects (Range, Position, etc.) pass through
                merged[key] = value;
            }
        }

        // CRITICAL: Deep-clone arrays and objects from PATCH to ensure clean updates
        for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === undefined) {
                continue;
            }

            // Deep clone arrays and objects to prevent shared references
            if (Array.isArray(value)) {
                merged[key] = this.deepCloneConfig(value);
            } else if (typeof value === 'object' && value.constructor === Object) {
                merged[key] = this.deepCloneConfig(value);
            } else {
                // Primitives and special objects can be assigned directly
                merged[key] = value;
            }
        }

        return merged;
    }

    /**
     * Clone just the arrays in a config to break shared references
     * Lighter weight than full deep clone if you know arrays are the issue
     * 
     * @param {Object} config - Configuration object
     * @returns {Object} Config with all arrays cloned
     */
    static cloneArraysInConfig(config) {
        if (!config || typeof config !== 'object') {
            return config;
        }

        const cloned = {};

        for (const [key, value] of Object.entries(config)) {
            if (Array.isArray(value)) {
                // Deep clone arrays
                cloned[key] = this.deepCloneConfig(value);
            } else {
                cloned[key] = value;
            }
        }

        return cloned;
    }

    /**
     * Convenience alias for deepCloneConfig
     * @param {Object} config - Configuration object to clone
     * @returns {Object} Deep cloned configuration
     */
    static deepClone(config) {
        return this.deepCloneConfig(config);
    }
}

export default ConfigCloner;