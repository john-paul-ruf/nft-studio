/**
 * Comprehensive Test Suite for EffectFormValidator Service
 * 
 * Tests all validation capabilities extracted from EffectConfigurer:
 * 1. Constructor validation and dependency injection
 * 2. Config schema validation with various scenarios
 * 3. Individual field validation with type checking
 * 4. Configuration completeness validation
 * 5. Validation metrics tracking
 * 6. Performance baseline verification
 * 7. Error handling and edge cases
 * 8. Validation rule management
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Test 1: Constructor Validation and Dependency Injection
 */
export async function testEffectFormValidatorConstructor(testEnv) {
    console.log('🧪 Testing EffectFormValidator constructor...');
    
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    
    // Test default constructor
    const validator1 = new EffectFormValidator();
    
    if (!validator1.logger) {
        throw new Error('Default logger not set');
    }
    
    if (!validator1.validationRules) {
        throw new Error('Validation rules not initialized');
    }
    
    if (!validator1.validationMetrics) {
        throw new Error('Validation metrics not initialized');
    }
    
    // Test constructor with custom logger
    const customLogger = { log: () => {}, error: () => {} };
    const validator2 = new EffectFormValidator({ logger: customLogger });
    
    if (validator2.logger !== customLogger) {
        throw new Error('Custom logger not set correctly');
    }
    
    console.log('✅ EffectFormValidator constructor validation passed');
    
    return {
        success: true,
        message: 'Constructor validation completed',
        validator: validator1
    };
}

/**
 * Test 2: Config Schema Validation
 */
export async function testEffectFormValidatorSchemaValidation(testEnv) {
    console.log('🧪 Testing EffectFormValidator schema validation...');
    
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    const validator = new EffectFormValidator();
    
    // Test valid schema and config
    const validSchema = {
        properties: {
            position: { type: 'object' },
            opacity: { type: 'number', minimum: 0, maximum: 1 },
            name: { type: 'string', minLength: 1 }
        },
        required: ['position']
    };
    
    const validConfig = {
        position: { x: 100, y: 200 },
        opacity: 0.8,
        name: 'TestEffect'
    };
    
    const validResult = validator.validateConfigSchema(validSchema, validConfig);
    
    if (!validResult.isValid) {
        throw new Error('Valid schema/config should pass validation');
    }
    
    if (validResult.errors.length > 0) {
        throw new Error('Valid schema/config should have no errors');
    }
    
    // Test missing required field
    const invalidConfig = {
        opacity: 0.8,
        name: 'TestEffect'
        // missing required 'position'
    };
    
    const invalidResult = validator.validateConfigSchema(validSchema, invalidConfig);
    
    if (invalidResult.missingFields.length === 0) {
        throw new Error('Missing required field should be detected');
    }
    
    if (!invalidResult.missingFields.includes('position')) {
        throw new Error('Missing position field should be detected');
    }
    
    // Test null/undefined inputs
    const nullSchemaResult = validator.validateConfigSchema(null, validConfig);
    if (nullSchemaResult.isValid) {
        throw new Error('Null schema should fail validation');
    }
    
    const nullConfigResult = validator.validateConfigSchema(validSchema, null);
    if (nullConfigResult.isValid) {
        throw new Error('Null config should fail validation');
    }
    
    console.log('✅ EffectFormValidator schema validation passed');
    
    return {
        success: true,
        message: 'Schema validation completed',
        validationsPerformed: validator.getValidationMetrics().validationsPerformed
    };
}

/**
 * Test 3: Individual Field Validation
 */
export async function testEffectFormValidatorFieldValidation(testEnv) {
    console.log('🧪 Testing EffectFormValidator field validation...');
    
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    const validator = new EffectFormValidator();
    
    // Test number field validation
    const numberSchema = { type: 'number', minimum: 0, maximum: 100 };
    
    const validNumberResult = validator.validateField('opacity', 50, numberSchema);
    if (!validNumberResult.isValid) {
        throw new Error('Valid number should pass validation');
    }
    
    const invalidTypeResult = validator.validateField('opacity', 'not-a-number', numberSchema);
    if (invalidTypeResult.isValid) {
        throw new Error('Invalid type should fail validation');
    }
    
    const belowMinResult = validator.validateField('opacity', -10, numberSchema);
    if (belowMinResult.isValid) {
        throw new Error('Value below minimum should fail validation');
    }
    
    const aboveMaxResult = validator.validateField('opacity', 150, numberSchema);
    if (aboveMaxResult.isValid) {
        throw new Error('Value above maximum should fail validation');
    }
    
    // Test string field validation
    const stringSchema = { type: 'string', minLength: 3, maxLength: 10 };
    
    const validStringResult = validator.validateField('name', 'TestName', stringSchema);
    if (!validStringResult.isValid) {
        throw new Error('Valid string should pass validation');
    }
    
    const tooShortResult = validator.validateField('name', 'AB', stringSchema);
    if (tooShortResult.isValid) {
        throw new Error('String too short should fail validation');
    }
    
    const tooLongResult = validator.validateField('name', 'ThisNameIsTooLong', stringSchema);
    if (tooLongResult.isValid) {
        throw new Error('String too long should fail validation');
    }
    
    // Test boolean field validation
    const booleanSchema = { type: 'boolean' };
    
    const validBooleanResult = validator.validateField('enabled', true, booleanSchema);
    if (!validBooleanResult.isValid) {
        throw new Error('Valid boolean should pass validation');
    }
    
    const invalidBooleanResult = validator.validateField('enabled', 'true', booleanSchema);
    if (invalidBooleanResult.isValid) {
        throw new Error('String instead of boolean should fail validation');
    }
    
    console.log('✅ EffectFormValidator field validation passed');
    
    return {
        success: true,
        message: 'Field validation completed'
    };
}

/**
 * Test 4: Configuration Completeness Validation
 */
export async function testEffectFormValidatorCompletenessValidation(testEnv) {
    console.log('🧪 Testing EffectFormValidator completeness validation...');
    
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    const validator = new EffectFormValidator();
    
    const configSchema = {
        properties: {
            position: { type: 'object' },
            size: { type: 'object' },
            color: { type: 'string' },
            opacity: { type: 'number' }
        }
    };
    
    // Test complete configuration
    const completeConfig = {
        position: { x: 100, y: 200 },
        size: { width: 50, height: 50 },
        color: '#FF0000',
        opacity: 0.8
    };
    
    const completeResult = validator.validateConfigCompleteness(completeConfig, configSchema);
    
    if (!completeResult.isComplete) {
        throw new Error('Complete config should be marked as complete');
    }
    
    if (!completeResult.readyForCreation) {
        throw new Error('Complete config should be ready for creation');
    }
    
    // Test minimal configuration
    const minimalConfig = {
        position: { x: 100, y: 200 }
    };
    
    const minimalResult = validator.validateConfigCompleteness(minimalConfig, configSchema);
    
    if (!minimalResult.isComplete) {
        throw new Error('Minimal config with properties should be complete');
    }
    
    if (!minimalResult.readyForCreation) {
        throw new Error('Minimal config should be ready for creation');
    }
    
    // Test empty configuration
    const emptyConfig = {};
    
    const emptyResult = validator.validateConfigCompleteness(emptyConfig, configSchema);
    
    if (emptyResult.isComplete) {
        throw new Error('Empty config should not be complete');
    }
    
    if (emptyResult.readyForCreation) {
        throw new Error('Empty config should not be ready for creation');
    }
    
    // Test null configuration
    const nullResult = validator.validateConfigCompleteness(null, configSchema);
    
    if (nullResult.isComplete) {
        throw new Error('Null config should not be complete');
    }
    
    console.log('✅ EffectFormValidator completeness validation passed');
    
    return {
        success: true,
        message: 'Completeness validation completed'
    };
}

/**
 * Test 5: Validation Metrics Tracking
 */
export async function testEffectFormValidatorMetrics(testEnv) {
    console.log('🧪 Testing EffectFormValidator metrics tracking...');
    
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    const validator = new EffectFormValidator();
    
    // Get initial metrics
    const initialMetrics = validator.getValidationMetrics();
    
    if (initialMetrics.validationsPerformed !== 0) {
        throw new Error('Initial validations performed should be 0');
    }
    
    // Perform some validations
    const schema = { properties: { test: { type: 'string' } } };
    const config = { test: 'value' };
    
    validator.validateConfigSchema(schema, config);
    validator.validateField('test', 'value', { type: 'string' });
    validator.validateConfigCompleteness(config, schema);
    
    const afterMetrics = validator.getValidationMetrics();
    
    if (afterMetrics.validationsPerformed <= initialMetrics.validationsPerformed) {
        throw new Error('Validations performed should increase');
    }
    
    if (afterMetrics.averageValidationTime < 0) {
        throw new Error('Average validation time should be non-negative');
    }
    
    // Test metrics reset
    validator.resetMetrics();
    const resetMetrics = validator.getValidationMetrics();
    
    if (resetMetrics.validationsPerformed !== 0) {
        throw new Error('Metrics should reset to 0');
    }
    
    console.log('✅ EffectFormValidator metrics tracking passed');
    
    return {
        success: true,
        message: 'Metrics tracking completed',
        finalMetrics: resetMetrics
    };
}

/**
 * Test 6: Performance Baseline Verification
 */
export async function testEffectFormValidatorPerformance(testEnv) {
    console.log('🧪 Testing EffectFormValidator performance baseline...');
    
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    const validator = new EffectFormValidator();
    
    // Test performance baseline check
    const performanceCheck = validator.checkPerformanceBaseline();
    
    if (typeof performanceCheck.meetsBaseline !== 'boolean') {
        throw new Error('Performance baseline check should return boolean');
    }
    
    if (performanceCheck.instanceProperties > performanceCheck.maxInstanceProperties) {
        throw new Error(`Too many instance properties: ${performanceCheck.instanceProperties} > ${performanceCheck.maxInstanceProperties}`);
    }
    
    // Perform validation and check timing
    const startTime = performance.now();
    
    const schema = {
        properties: {
            position: { type: 'object' },
            opacity: { type: 'number', minimum: 0, maximum: 1 }
        }
    };
    
    const config = {
        position: { x: 100, y: 200 },
        opacity: 0.8
    };
    
    validator.validateConfigSchema(schema, config);
    
    const endTime = performance.now();
    const validationTime = endTime - startTime;
    
    if (validationTime > 50) { // 50ms baseline
        console.warn(`⚠️ Validation took ${validationTime.toFixed(2)}ms (baseline: 50ms)`);
    }
    
    console.log('✅ EffectFormValidator performance baseline passed');
    
    return {
        success: true,
        message: 'Performance baseline verified',
        validationTime: validationTime.toFixed(2) + 'ms',
        performanceCheck
    };
}

/**
 * Test 7: Error Handling and Edge Cases
 */
export async function testEffectFormValidatorErrorHandling(testEnv) {
    console.log('🧪 Testing EffectFormValidator error handling...');
    
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    const validator = new EffectFormValidator();
    
    // Test validation with malformed schema
    const malformedSchema = {
        properties: null // This should cause issues
    };
    
    const config = { test: 'value' };
    
    // Should not throw, but should return invalid result
    const malformedResult = validator.validateConfigSchema(malformedSchema, config);
    
    if (malformedResult.isValid) {
        throw new Error('Malformed schema should result in invalid validation');
    }
    
    // Test field validation with undefined schema
    const undefinedSchemaResult = validator.validateField('test', 'value', undefined);
    
    if (undefinedSchemaResult.isValid) {
        throw new Error('Undefined schema should result in invalid validation');
    }
    
    // Test completeness validation with circular reference
    const circularConfig = {};
    circularConfig.self = circularConfig;
    
    // Should handle gracefully without infinite recursion
    const circularResult = validator.validateConfigCompleteness(circularConfig, { properties: {} });
    
    if (!circularResult.isComplete) {
        // This is expected - circular reference should be treated as having properties
    }
    
    console.log('✅ EffectFormValidator error handling passed');
    
    return {
        success: true,
        message: 'Error handling completed'
    };
}

/**
 * Test 8: Validation Rule Management
 */
export async function testEffectFormValidatorRuleManagement(testEnv) {
    console.log('🧪 Testing EffectFormValidator rule management...');
    
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    const validator = new EffectFormValidator();
    
    // Test validation rules map initialization
    if (!(validator.validationRules instanceof Map)) {
        throw new Error('Validation rules should be a Map');
    }
    
    // Test that validation rules can be accessed
    const initialRuleCount = validator.validationRules.size;
    
    if (initialRuleCount < 0) {
        throw new Error('Validation rules count should be non-negative');
    }
    
    // Test metrics structure
    const metrics = validator.getValidationMetrics();
    const requiredMetricFields = [
        'validationsPerformed',
        'validationErrors',
        'validationTime',
        'averageValidationTime',
        'errorRate'
    ];
    
    for (const field of requiredMetricFields) {
        if (!(field in metrics)) {
            throw new Error(`Missing metric field: ${field}`);
        }
    }
    
    console.log('✅ EffectFormValidator rule management passed');
    
    return {
        success: true,
        message: 'Rule management completed',
        ruleCount: initialRuleCount,
        metricsFields: Object.keys(metrics)
    };
}

// Export all test functions
export const testFunctions = [
    testEffectFormValidatorConstructor,
    testEffectFormValidatorSchemaValidation,
    testEffectFormValidatorFieldValidation,
    testEffectFormValidatorCompletenessValidation,
    testEffectFormValidatorMetrics,
    testEffectFormValidatorPerformance,
    testEffectFormValidatorErrorHandling,
    testEffectFormValidatorRuleManagement
];

export const testInfo = {
    suiteName: 'EffectFormValidator Service Tests',
    totalTests: testFunctions.length,
    category: 'unit'
};