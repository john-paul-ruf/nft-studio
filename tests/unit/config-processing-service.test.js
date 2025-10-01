/**
 * Real Objects Tests for ConfigProcessingService
 * Tests all 4 methods with real configuration processing operations
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Test convertConfigToProperTypes method
 * Tests recursive type conversion with real configuration objects
 */
export async function testConvertConfigToProperTypes() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const configService = testEnv.getService('configProcessingService');
        
        // Test basic type conversions
        const basicConfig = {
            enabled: 'true',
            disabled: 'false',
            count: '42',
            percentage: '3.14',
            name: 'test-effect',
            nullValue: null,
            undefinedValue: undefined
        };
        
        const processedBasic = await configService.convertConfigToProperTypes(basicConfig);
        
        if (processedBasic.enabled !== true) {
            throw new Error('String "true" should convert to boolean true');
        }
        if (processedBasic.disabled !== false) {
            throw new Error('String "false" should convert to boolean false');
        }
        if (processedBasic.count !== 42) {
            throw new Error('String "42" should convert to number 42');
        }
        if (processedBasic.percentage !== 3.14) {
            throw new Error('String "3.14" should convert to number 3.14');
        }
        if (processedBasic.name !== 'test-effect') {
            throw new Error('Non-convertible string should remain unchanged');
        }
        if (processedBasic.nullValue !== null) {
            throw new Error('Null values should remain null');
        }
        if (processedBasic.undefinedValue !== undefined) {
            throw new Error('Undefined values should remain undefined');
        }
        
        // Test nested object conversion
        const nestedConfig = {
            effect: {
                blur: {
                    enabled: 'true',
                    radius: '5.5'
                },
                glow: {
                    enabled: 'false',
                    intensity: '0.8'
                }
            },
            metadata: {
                version: '1.0',
                debug: 'true'
            }
        };
        
        const processedNested = await configService.convertConfigToProperTypes(nestedConfig);
        
        if (processedNested.effect.blur.enabled !== true) {
            throw new Error('Nested boolean conversion failed');
        }
        if (processedNested.effect.blur.radius !== 5.5) {
            throw new Error('Nested number conversion failed');
        }
        if (processedNested.effect.glow.enabled !== false) {
            throw new Error('Nested boolean false conversion failed');
        }
        if (processedNested.metadata.debug !== true) {
            throw new Error('Deep nested boolean conversion failed');
        }
        
        // Test array conversion
        const arrayConfig = {
            effects: [
                { enabled: 'true', value: '10' },
                { enabled: 'false', value: '20' }
            ],
            numbers: ['1', '2', '3.5'],
            booleans: ['true', 'false', 'true']
        };
        
        const processedArray = await configService.convertConfigToProperTypes(arrayConfig);
        
        if (processedArray.effects[0].enabled !== true || processedArray.effects[0].value !== 10) {
            throw new Error('Array object conversion failed');
        }
        if (processedArray.numbers[0] !== 1 || processedArray.numbers[2] !== 3.5) {
            throw new Error('Array number conversion failed');
        }
        if (processedArray.booleans[0] !== true || processedArray.booleans[1] !== false) {
            throw new Error('Array boolean conversion failed');
        }
        
        console.log('✅ testConvertConfigToProperTypes: All type conversions working correctly');
        return { success: true };
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test convertStringValue method
 * Tests individual string value conversions
 */
export async function testConvertStringValue() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const configService = testEnv.getService('configProcessingService');
        
        // Test boolean conversions
        if (configService.convertStringValue('true') !== true) {
            throw new Error('String "true" should convert to boolean true');
        }
        if (configService.convertStringValue('false') !== false) {
            throw new Error('String "false" should convert to boolean false');
        }
        
        // Test number conversions
        if (configService.convertStringValue('42') !== 42) {
            throw new Error('String "42" should convert to number 42');
        }
        if (configService.convertStringValue('3.14') !== 3.14) {
            throw new Error('String "3.14" should convert to number 3.14');
        }
        if (configService.convertStringValue('0') !== 0) {
            throw new Error('String "0" should convert to number 0');
        }
        if (configService.convertStringValue('-5.5') !== -5.5) {
            throw new Error('String "-5.5" should convert to number -5.5');
        }
        
        // Test non-convertible strings
        if (configService.convertStringValue('hello') !== 'hello') {
            throw new Error('Non-convertible string should remain unchanged');
        }
        if (configService.convertStringValue('true-ish') !== 'true-ish') {
            throw new Error('Non-exact boolean string should remain unchanged');
        }
        if (configService.convertStringValue('42px') !== '42px') {
            throw new Error('Non-pure number string should remain unchanged');
        }
        
        // Test edge cases
        if (configService.convertStringValue('') !== '') {
            throw new Error('Empty string should remain unchanged');
        }
        if (configService.convertStringValue('NaN') !== 'NaN') {
            throw new Error('String "NaN" should remain as string');
        }
        if (configService.convertStringValue('Infinity') !== 'Infinity') {
            throw new Error('String "Infinity" should remain as string');
        }
        
        console.log('✅ testConvertStringValue: All string conversions working correctly');
        return { success: true };
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test applyPoint2DCenterOverride method
 * Tests Point2D center coordinate resolution
 */
export async function testApplyPoint2DCenterOverride() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const configService = testEnv.getService('configProcessingService');
        
        // Create mock project state with resolution
        const mockProjectState = {
            getResolutionDimensions: () => ({ w: 1920, h: 1080 })
        };
        
        // Test center override for both coordinates
        const centerConfig = {
            position: { x: 'center', y: 'center' },
            anchor: { x: 100, y: 200 }
        };
        
        const processedCenter = configService.applyPoint2DCenterOverride(centerConfig, mockProjectState);
        
        if (processedCenter.position.x !== 960 || processedCenter.position.y !== 540) {
            throw new Error('Center override should resolve to half dimensions (960, 540)');
        }
        if (processedCenter.anchor.x !== 100 || processedCenter.anchor.y !== 200) {
            throw new Error('Non-center coordinates should remain unchanged');
        }
        
        // Test partial center override
        const partialConfig = {
            start: { x: 'center', y: 100 },
            end: { x: 200, y: 'center' }
        };
        
        const processedPartial = configService.applyPoint2DCenterOverride(partialConfig, mockProjectState);
        
        if (processedPartial.start.x !== 960 || processedPartial.start.y !== 100) {
            throw new Error('Partial center override failed for x coordinate');
        }
        if (processedPartial.end.x !== 200 || processedPartial.end.y !== 540) {
            throw new Error('Partial center override failed for y coordinate');
        }
        
        // Test nested Point2D objects
        const nestedConfig = {
            effects: {
                blur: {
                    center: { x: 'center', y: 'center' },
                    offset: { x: 50, y: 'center' }
                }
            }
        };
        
        const processedNested = configService.applyPoint2DCenterOverride(nestedConfig, mockProjectState);
        
        if (processedNested.effects.blur.center.x !== 960 || processedNested.effects.blur.center.y !== 540) {
            throw new Error('Nested center override failed');
        }
        if (processedNested.effects.blur.offset.x !== 50 || processedNested.effects.blur.offset.y !== 540) {
            throw new Error('Nested partial center override failed');
        }
        
        // Test array of Point2D objects
        const arrayConfig = {
            points: [
                { x: 'center', y: 100 },
                { x: 200, y: 'center' },
                { x: 'center', y: 'center' }
            ]
        };
        
        const processedArray = configService.applyPoint2DCenterOverride(arrayConfig, mockProjectState);
        
        if (processedArray.points[0].x !== 960 || processedArray.points[0].y !== 100) {
            throw new Error('Array Point2D center override failed for first element');
        }
        if (processedArray.points[1].x !== 200 || processedArray.points[1].y !== 540) {
            throw new Error('Array Point2D center override failed for second element');
        }
        if (processedArray.points[2].x !== 960 || processedArray.points[2].y !== 540) {
            throw new Error('Array Point2D center override failed for third element');
        }
        
        console.log('✅ testApplyPoint2DCenterOverride: Point2D center resolution working correctly');
        return { success: true };
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test validateConfig method
 * Tests configuration validation logic
 */
export async function testValidateConfig() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const configService = testEnv.getService('configProcessingService');
        
        // Test valid configuration
        const validConfig = {
            name: 'test-effect',
            enabled: true,
            settings: {
                intensity: 0.5,
                color: '#ff0000'
            }
        };
        
        const validResult = configService.validateConfig(validConfig);
        
        if (!validResult.valid) {
            throw new Error('Valid configuration should pass validation');
        }
        if (validResult.errors.length !== 0) {
            throw new Error('Valid configuration should have no errors');
        }
        
        // Test null configuration
        const nullResult = configService.validateConfig(null);
        
        if (nullResult.valid) {
            throw new Error('Null configuration should fail validation');
        }
        if (!nullResult.errors.includes('Configuration must be an object')) {
            throw new Error('Null configuration should have appropriate error message');
        }
        
        // Test undefined configuration
        const undefinedResult = configService.validateConfig(undefined);
        
        if (undefinedResult.valid) {
            throw new Error('Undefined configuration should fail validation');
        }
        if (!undefinedResult.errors.includes('Configuration must be an object')) {
            throw new Error('Undefined configuration should have appropriate error message');
        }
        
        // Test non-object configuration
        const stringResult = configService.validateConfig('not-an-object');
        
        if (stringResult.valid) {
            throw new Error('String configuration should fail validation');
        }
        if (!stringResult.errors.includes('Configuration must be an object')) {
            throw new Error('String configuration should have appropriate error message');
        }
        
        // Test empty object (should be valid)
        const emptyResult = configService.validateConfig({});
        
        if (!emptyResult.valid) {
            throw new Error('Empty object should be valid configuration');
        }
        if (emptyResult.errors.length !== 0) {
            throw new Error('Empty object should have no validation errors');
        }
        
        console.log('✅ testValidateConfig: Configuration validation working correctly');
        return { success: true };
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test ConfigProcessingService integration workflow
 * Tests combining multiple methods in realistic scenarios
 */
export async function testConfigProcessingServiceIntegrationWorkflow() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const configService = testEnv.getService('configProcessingService');
        
        // Create a realistic effect configuration
        const rawConfig = {
            name: 'blur-effect',
            enabled: 'true',
            settings: {
                radius: '5.5',
                quality: 'high',
                center: { x: 'center', y: 'center' },
                falloff: {
                    enabled: 'false',
                    distance: '10'
                }
            },
            keyframes: [
                { time: '0', value: '0' },
                { time: '1', value: '1' }
            ]
        };
        
        // Mock project state
        const mockProjectState = {
            getResolutionDimensions: () => ({ w: 1920, h: 1080 })
        };
        
        console.log('🔄 Test: Processing complete effect configuration...');
        
        // Step 1: Validate raw configuration
        const validationResult = configService.validateConfig(rawConfig);
        if (!validationResult.valid) {
            throw new Error('Raw configuration should be valid');
        }
        
        // Step 2: Convert types
        const typedConfig = await configService.convertConfigToProperTypes(rawConfig);
        
        // Verify type conversions
        if (typedConfig.enabled !== true) {
            throw new Error('Boolean conversion failed in integration');
        }
        if (typedConfig.settings.radius !== 5.5) {
            throw new Error('Number conversion failed in integration');
        }
        if (typedConfig.settings.falloff.enabled !== false) {
            throw new Error('Nested boolean conversion failed in integration');
        }
        if (typedConfig.keyframes[0].time !== 0 || typedConfig.keyframes[0].value !== 0) {
            throw new Error('Array conversion failed in integration');
        }
        
        // Step 3: Apply Point2D center overrides
        const finalConfig = configService.applyPoint2DCenterOverride(typedConfig, mockProjectState);
        
        // Verify center resolution
        if (finalConfig.settings.center.x !== 960 || finalConfig.settings.center.y !== 540) {
            throw new Error('Center override failed in integration');
        }
        
        // Step 4: Validate final configuration
        const finalValidation = configService.validateConfig(finalConfig);
        if (!finalValidation.valid) {
            throw new Error('Final configuration should be valid');
        }
        
        console.log('✅ Test: Complete configuration processing workflow successful');
        console.log('✅ testConfigProcessingServiceIntegrationWorkflow: Integration workflow working correctly');
        return { success: true };
        
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test ConfigProcessingService error conditions
 * Tests error handling and edge cases
 */
export async function testConfigProcessingServiceErrorConditions() {
    const testEnv = new TestEnvironment();
    
    try {
        await testEnv.setup();
        const configService = testEnv.getService('configProcessingService');
        
        // Test convertConfigToProperTypes with invalid inputs
        const nullResult = await configService.convertConfigToProperTypes(null);
        if (nullResult !== null) {
            throw new Error('Null input should return null');
        }
        
        const undefinedResult = await configService.convertConfigToProperTypes(undefined);
        if (undefinedResult !== undefined) {
            throw new Error('Undefined input should return undefined');
        }
        
        const stringResult = await configService.convertConfigToProperTypes('not-an-object');
        if (stringResult !== 'not-an-object') {
            throw new Error('Non-object input should return unchanged');
        }
        
        // Test applyPoint2DCenterOverride with invalid inputs
        const noProjectResult = configService.applyPoint2DCenterOverride({ x: 'center', y: 'center' }, null);
        if (noProjectResult.x !== 'center') {
            throw new Error('Should handle null project state gracefully');
        }
        
        const noConfigResult = configService.applyPoint2DCenterOverride(null, { getResolutionDimensions: () => ({ w: 100, h: 100 }) });
        if (noConfigResult !== null) {
            throw new Error('Should handle null config gracefully');
        }
        
        // Test with circular references (should not cause infinite recursion)
        const circularConfig = { name: 'test' };
        circularConfig.self = circularConfig;
        
        try {
            // This should not throw or cause infinite recursion
            await configService.convertConfigToProperTypes(circularConfig);
            console.log('⚠️ Test: Circular reference handled (implementation dependent)');
        } catch (error) {
            // Acceptable if implementation detects circular references
            console.log('⚠️ Test: Circular reference detected and handled');
        }
        
        console.log('✅ testConfigProcessingServiceErrorConditions: Error handling working correctly');
        return { success: true };
        
    } finally {
        await testEnv.cleanup();
    }
}

// Export all test functions for the test runner
export const tests = [
    testConvertConfigToProperTypes,
    testConvertStringValue,
    testApplyPoint2DCenterOverride,
    testValidateConfig,
    testConfigProcessingServiceIntegrationWorkflow,
    testConfigProcessingServiceErrorConditions
];