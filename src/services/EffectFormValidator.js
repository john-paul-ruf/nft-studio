/**
 * EffectFormValidator Service
 * 
 * Handles all form validation logic for effect configuration.
 * Extracted from EffectConfigurer to follow Single Responsibility Principle.
 * 
 * Responsibilities:
 * - Config schema validation
 * - Form field validation
 * - Default value validation
 * - Configuration completeness checks
 */

export class EffectFormValidator {
    constructor({ logger = console } = {}) {
        this.logger = logger;
        this.validationRules = new Map();
        this.validationMetrics = {
            validationsPerformed: 0,
            validationErrors: 0,
            validationTime: 0
        };
        
        // Performance baseline tracking
        this.performanceBaseline = {
            maxValidationTime: 50, // ms
            maxInstanceProperties: 15
        };
        
        this.logger.log('🔍 EffectFormValidator: Initialized with validation capabilities');
    }

    /**
     * Validate effect configuration schema
     * @param {Object} configSchema - The configuration schema to validate
     * @param {Object} effectConfig - The current effect configuration
     * @returns {Object} Validation result with errors and warnings
     */
    validateConfigSchema(configSchema, effectConfig) {
        const startTime = performance.now();
        this.validationMetrics.validationsPerformed++;
        
        try {
            const result = {
                isValid: true,
                errors: [],
                warnings: [],
                missingFields: [],
                invalidFields: []
            };

            if (!configSchema) {
                result.isValid = false;
                result.errors.push('Config schema is required');
                return result;
            }

            if (!effectConfig) {
                result.isValid = false;
                result.errors.push('Effect configuration is required');
                return result;
            }

            // Validate required fields
            if (configSchema.required) {
                for (const requiredField of configSchema.required) {
                    if (!(requiredField in effectConfig)) {
                        result.missingFields.push(requiredField);
                        result.warnings.push(`Missing required field: ${requiredField}`);
                    }
                }
            }

            // Validate field types and constraints
            if (configSchema.properties) {
                for (const [fieldName, fieldSchema] of Object.entries(configSchema.properties)) {
                    if (fieldName in effectConfig) {
                        const fieldValidation = this.validateField(fieldName, effectConfig[fieldName], fieldSchema);
                        if (!fieldValidation.isValid) {
                            result.invalidFields.push(fieldName);
                            result.errors.push(...fieldValidation.errors);
                        }
                    }
                }
            }

            result.isValid = result.errors.length === 0;
            
            const validationTime = performance.now() - startTime;
            this.validationMetrics.validationTime += validationTime;
            
            this.logger.log(`🔍 EffectFormValidator: Schema validation completed in ${validationTime.toFixed(2)}ms`, {
                isValid: result.isValid,
                errorCount: result.errors.length,
                warningCount: result.warnings.length
            });

            return result;
            
        } catch (error) {
            this.validationMetrics.validationErrors++;
            this.logger.error('❌ EffectFormValidator: Schema validation failed:', error);
            
            return {
                isValid: false,
                errors: [`Validation error: ${error.message}`],
                warnings: [],
                missingFields: [],
                invalidFields: []
            };
        }
    }

    /**
     * Validate individual form field
     * @param {string} fieldName - Name of the field
     * @param {*} fieldValue - Value to validate
     * @param {Object} fieldSchema - Schema for the field
     * @returns {Object} Field validation result
     */
    validateField(fieldName, fieldValue, fieldSchema) {
        const result = {
            isValid: true,
            errors: []
        };

        try {
            // Type validation
            if (fieldSchema.type) {
                const expectedType = fieldSchema.type;
                const actualType = typeof fieldValue;
                
                if (expectedType === 'number' && actualType !== 'number') {
                    result.isValid = false;
                    result.errors.push(`Field ${fieldName} must be a number, got ${actualType}`);
                } else if (expectedType === 'string' && actualType !== 'string') {
                    result.isValid = false;
                    result.errors.push(`Field ${fieldName} must be a string, got ${actualType}`);
                } else if (expectedType === 'boolean' && actualType !== 'boolean') {
                    result.isValid = false;
                    result.errors.push(`Field ${fieldName} must be a boolean, got ${actualType}`);
                }
            }

            // Range validation for numbers
            if (fieldSchema.minimum !== undefined && typeof fieldValue === 'number') {
                if (fieldValue < fieldSchema.minimum) {
                    result.isValid = false;
                    result.errors.push(`Field ${fieldName} must be >= ${fieldSchema.minimum}, got ${fieldValue}`);
                }
            }

            if (fieldSchema.maximum !== undefined && typeof fieldValue === 'number') {
                if (fieldValue > fieldSchema.maximum) {
                    result.isValid = false;
                    result.errors.push(`Field ${fieldName} must be <= ${fieldSchema.maximum}, got ${fieldValue}`);
                }
            }

            // String length validation
            if (fieldSchema.minLength !== undefined && typeof fieldValue === 'string') {
                if (fieldValue.length < fieldSchema.minLength) {
                    result.isValid = false;
                    result.errors.push(`Field ${fieldName} must be at least ${fieldSchema.minLength} characters`);
                }
            }

            if (fieldSchema.maxLength !== undefined && typeof fieldValue === 'string') {
                if (fieldValue.length > fieldSchema.maxLength) {
                    result.isValid = false;
                    result.errors.push(`Field ${fieldName} must be at most ${fieldSchema.maxLength} characters`);
                }
            }

            return result;
            
        } catch (error) {
            this.logger.error(`❌ EffectFormValidator: Field validation failed for ${fieldName}:`, error);
            return {
                isValid: false,
                errors: [`Field validation error: ${error.message}`]
            };
        }
    }

    /**
     * Validate configuration completeness for effect creation
     * @param {Object} effectConfig - Configuration to validate
     * @param {Object} configSchema - Schema to validate against
     * @returns {Object} Completeness validation result
     */
    validateConfigCompleteness(effectConfig, configSchema) {
        try {
            const result = {
                isComplete: true,
                readyForCreation: true,
                missingCriticalFields: [],
                recommendations: []
            };

            if (!effectConfig || Object.keys(effectConfig).length === 0) {
                result.isComplete = false;
                result.readyForCreation = false;
                result.recommendations.push('Configuration is empty - add some properties');
                return result;
            }

            // Check for critical fields that affect rendering
            const criticalFields = ['position', 'size', 'color', 'opacity'];
            for (const field of criticalFields) {
                if (configSchema?.properties?.[field] && !(field in effectConfig)) {
                    result.missingCriticalFields.push(field);
                    result.recommendations.push(`Consider adding ${field} for better control`);
                }
            }

            // Configuration is complete if it has at least one property
            result.isComplete = Object.keys(effectConfig).length > 0;
            result.readyForCreation = result.isComplete;

            this.logger.log('🔍 EffectFormValidator: Completeness validation completed', {
                isComplete: result.isComplete,
                readyForCreation: result.readyForCreation,
                configPropertyCount: Object.keys(effectConfig).length
            });

            return result;
            
        } catch (error) {
            this.logger.error('❌ EffectFormValidator: Completeness validation failed:', error);
            return {
                isComplete: false,
                readyForCreation: false,
                missingCriticalFields: [],
                recommendations: ['Validation error occurred']
            };
        }
    }

    /**
     * Get validation metrics for monitoring
     * @returns {Object} Current validation metrics
     */
    getValidationMetrics() {
        return {
            ...this.validationMetrics,
            averageValidationTime: this.validationMetrics.validationsPerformed > 0 
                ? this.validationMetrics.validationTime / this.validationMetrics.validationsPerformed 
                : 0,
            errorRate: this.validationMetrics.validationsPerformed > 0
                ? (this.validationMetrics.validationErrors / this.validationMetrics.validationsPerformed) * 100
                : 0
        };
    }

    /**
     * Reset validation metrics
     */
    resetMetrics() {
        this.validationMetrics = {
            validationsPerformed: 0,
            validationErrors: 0,
            validationTime: 0
        };
        this.logger.log('🔍 EffectFormValidator: Metrics reset');
    }

    /**
     * Check if service meets performance baselines
     * @returns {Object} Performance check result
     */
    checkPerformanceBaseline() {
        const metrics = this.getValidationMetrics();
        const instanceProperties = Object.keys(this).length;
        
        return {
            meetsBaseline: metrics.averageValidationTime <= this.performanceBaseline.maxValidationTime &&
                          instanceProperties <= this.performanceBaseline.maxInstanceProperties,
            averageValidationTime: metrics.averageValidationTime,
            maxValidationTime: this.performanceBaseline.maxValidationTime,
            instanceProperties,
            maxInstanceProperties: this.performanceBaseline.maxInstanceProperties
        };
    }
}

export default EffectFormValidator;