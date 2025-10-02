/**
 * EffectFormValidator
 * 
 * Handles validation logic for effect configuration forms.
 * Extracted from EffectConfigurer as part of god object decomposition.
 * 
 * Responsibilities:
 * - Validate configuration values
 * - Check required fields
 * - Validate field types and constraints
 * - Provide validation error messages
 */

/**
 * Validates an effect configuration against its schema
 * 
 * @param {Object} config - The configuration to validate
 * @param {Object} schema - The configuration schema
 * @returns {Object} Validation result with { isValid: boolean, errors: Array }
 */
export function validateEffectConfig(config, schema) {
    const errors = [];

    if (!schema || !schema.fields) {
        return { isValid: true, errors: [] };
    }

    // Validate each field in the schema
    for (const field of schema.fields) {
        const value = config[field.name];

        // Check required fields
        if (field.required && (value === undefined || value === null || value === '')) {
            errors.push({
                field: field.name,
                message: `${field.label || field.name} is required`
            });
            continue;
        }

        // Skip validation if field is not required and empty
        if (!field.required && (value === undefined || value === null || value === '')) {
            continue;
        }

        // Type-specific validation
        switch (field.type) {
            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    errors.push({
                        field: field.name,
                        message: `${field.label || field.name} must be a valid number`
                    });
                } else {
                    // Check min/max constraints
                    if (field.min !== undefined && value < field.min) {
                        errors.push({
                            field: field.name,
                            message: `${field.label || field.name} must be at least ${field.min}`
                        });
                    }
                    if (field.max !== undefined && value > field.max) {
                        errors.push({
                            field: field.name,
                            message: `${field.label || field.name} must be at most ${field.max}`
                        });
                    }
                }
                break;

            case 'string':
                if (typeof value !== 'string') {
                    errors.push({
                        field: field.name,
                        message: `${field.label || field.name} must be a string`
                    });
                } else {
                    // Check length constraints
                    if (field.minLength !== undefined && value.length < field.minLength) {
                        errors.push({
                            field: field.name,
                            message: `${field.label || field.name} must be at least ${field.minLength} characters`
                        });
                    }
                    if (field.maxLength !== undefined && value.length > field.maxLength) {
                        errors.push({
                            field: field.name,
                            message: `${field.label || field.name} must be at most ${field.maxLength} characters`
                        });
                    }
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push({
                        field: field.name,
                        message: `${field.label || field.name} must be a boolean`
                    });
                }
                break;

            case 'array':
                if (!Array.isArray(value)) {
                    errors.push({
                        field: field.name,
                        message: `${field.label || field.name} must be an array`
                    });
                }
                break;

            case 'object':
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    errors.push({
                        field: field.name,
                        message: `${field.label || field.name} must be an object`
                    });
                }
                break;
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates a single field value
 * 
 * @param {string} fieldName - The field name
 * @param {*} value - The field value
 * @param {Object} field - The field schema
 * @returns {Object} Validation result with { isValid: boolean, error: string|null }
 */
export function validateField(fieldName, value, field) {
    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
        return {
            isValid: false,
            error: `${field.label || fieldName} is required`
        };
    }

    // Skip if not required and empty
    if (!field.required && (value === undefined || value === null || value === '')) {
        return { isValid: true, error: null };
    }

    // Type-specific validation
    switch (field.type) {
        case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
                return {
                    isValid: false,
                    error: `${field.label || fieldName} must be a valid number`
                };
            }
            if (field.min !== undefined && value < field.min) {
                return {
                    isValid: false,
                    error: `${field.label || fieldName} must be at least ${field.min}`
                };
            }
            if (field.max !== undefined && value > field.max) {
                return {
                    isValid: false,
                    error: `${field.label || fieldName} must be at most ${field.max}`
                };
            }
            break;

        case 'string':
            if (typeof value !== 'string') {
                return {
                    isValid: false,
                    error: `${field.label || fieldName} must be a string`
                };
            }
            if (field.minLength !== undefined && value.length < field.minLength) {
                return {
                    isValid: false,
                    error: `${field.label || fieldName} must be at least ${field.minLength} characters`
                };
            }
            if (field.maxLength !== undefined && value.length > field.maxLength) {
                return {
                    isValid: false,
                    error: `${field.label || fieldName} must be at most ${field.maxLength} characters`
                };
            }
            break;

        case 'boolean':
            if (typeof value !== 'boolean') {
                return {
                    isValid: false,
                    error: `${field.label || fieldName} must be a boolean`
                };
            }
            break;

        case 'array':
            if (!Array.isArray(value)) {
                return {
                    isValid: false,
                    error: `${field.label || fieldName} must be an array`
                };
            }
            break;

        case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                return {
                    isValid: false,
                    error: `${field.label || fieldName} must be an object`
                };
            }
            break;
    }

    return { isValid: true, error: null };
}

export default {
    validateEffectConfig,
    validateField
};