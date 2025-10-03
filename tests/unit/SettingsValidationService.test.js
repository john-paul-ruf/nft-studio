/**
 * SettingsValidationService Tests
 * 
 * Tests for settings validation service that validates settings file structure,
 * checks for required fields, and generates validation error messages.
 * 
 * REAL OBJECTS ONLY - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import SettingsValidationService from '../../src/services/SettingsValidationService.js';

/**
 * Test 1: Service initialization and method availability
 */
export async function testSettingsValidationServiceInitialization() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Verify service exists and has expected methods
        if (!SettingsValidationService) {
            throw new Error('SettingsValidationService should be defined');
        }
        if (typeof SettingsValidationService.validateSettingsFile !== 'function') {
            throw new Error('validateSettingsFile method should exist');
        }
        if (typeof SettingsValidationService.getConversionSummary !== 'function') {
            throw new Error('getConversionSummary method should exist');
        }

        console.log('✅ SettingsValidationService initialized with all expected methods');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 2: Valid settings file validation
 */
export async function testValidSettingsFileValidation() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const validSettings = {
            effects: [
                { type: 'blur', config: { intensity: 5 } },
                { type: 'glow', config: { radius: 10 } }
            ],
            config: {
                numberOfFrame: 100,
                _INVOKER_: 'Test Artist'
            },
            finalSize: {
                width: 1920,
                height: 1080
            },
            colorScheme: {
                name: 'test-scheme'
            }
        };

        const errors = SettingsValidationService.validateSettingsFile(validSettings);
        if (errors.length !== 0) {
            throw new Error(`Expected no errors, got: ${errors.join(', ')}`);
        }

        console.log('✅ Valid settings file validation passes without errors');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 3: Invalid settings object validation
 */
export async function testInvalidSettingsObjectValidation() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Test null settings
        const errors1 = SettingsValidationService.validateSettingsFile(null);
        if (!errors1.includes('Settings must be a valid object')) {
            throw new Error('Should return error for null settings');
        }

        // Test undefined settings
        const errors2 = SettingsValidationService.validateSettingsFile(undefined);
        if (!errors2.includes('Settings must be a valid object')) {
            throw new Error('Should return error for undefined settings');
        }

        // Test non-object settings
        const errors3 = SettingsValidationService.validateSettingsFile('invalid');
        if (!errors3.includes('Settings must be a valid object')) {
            throw new Error('Should return error for string settings');
        }

        const errors4 = SettingsValidationService.validateSettingsFile(42);
        if (!errors4.includes('Settings must be a valid object')) {
            throw new Error('Should return error for number settings');
        }

        console.log('✅ Invalid settings object validation returns correct errors');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 4: Missing effects arrays validation
 */
export async function testMissingEffectsArraysValidation() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const settingsWithoutEffects = {
            config: {
                numberOfFrame: 100
            },
            finalSize: {
                width: 1920,
                height: 1080
            }
        };

        const errors = SettingsValidationService.validateSettingsFile(settingsWithoutEffects);
        const hasEffectsError = errors.some(error => 
            error.includes('Settings must contain at least one effects array')
        );
        if (!hasEffectsError) {
            throw new Error('Should return error when no effects arrays are present');
        }

        console.log('✅ Missing effects arrays validation returns correct error');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 5: Various effects arrays validation
 */
export async function testVariousEffectsArraysValidation() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const effectArrayNames = [
            'effects', 'allPrimaryEffects', 'finalImageEffects', 'allFinalImageEffects',
            'additionalEffects', 'allAdditionalEffects', 'secondaryEffects', 'allSecondaryEffects',
            'keyFrameEffects', 'allKeyFrameEffects'
        ];

        for (const arrayName of effectArrayNames) {
            const settings = {
                [arrayName]: [{ type: 'test-effect' }],
                config: { numberOfFrame: 100 },
                finalSize: { width: 1920, height: 1080 }
            };

            const errors = SettingsValidationService.validateSettingsFile(settings);
            if (errors.length !== 0) {
                throw new Error(`${arrayName} should be accepted as valid effects array, got errors: ${errors.join(', ')}`);
            }
        }

        console.log('✅ Various effects arrays validation accepts all valid array types');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 6: Invalid array types validation
 */
export async function testInvalidArrayTypesValidation() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const settingsWithInvalidArrays = {
            effects: 'not-an-array',
            allPrimaryEffects: { invalid: 'object' },
            finalImageEffects: 42,
            config: { numberOfFrame: 100 },
            finalSize: { width: 1920, height: 1080 }
        };

        const errors = SettingsValidationService.validateSettingsFile(settingsWithInvalidArrays);
        
        if (!errors.some(error => error.includes('effects must be an array'))) {
            throw new Error('Should return error for invalid effects array');
        }
        if (!errors.some(error => error.includes('allPrimaryEffects must be an array'))) {
            throw new Error('Should return error for invalid allPrimaryEffects array');
        }
        if (!errors.some(error => error.includes('finalImageEffects must be an array'))) {
            throw new Error('Should return error for invalid finalImageEffects array');
        }

        console.log('✅ Invalid array types validation returns correct errors');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 7: Missing required objects validation
 */
export async function testMissingRequiredObjectsValidation() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Test missing config
        const settingsWithoutConfig = {
            effects: [{ type: 'test-effect' }],
            finalSize: { width: 1920, height: 1080 }
        };

        const errors1 = SettingsValidationService.validateSettingsFile(settingsWithoutConfig);
        if (!errors1.some(error => error.includes('Settings must contain config object'))) {
            throw new Error('Should return error for missing config object');
        }

        // Test missing finalSize
        const settingsWithoutFinalSize = {
            effects: [{ type: 'test-effect' }],
            config: { numberOfFrame: 100 }
        };

        const errors2 = SettingsValidationService.validateSettingsFile(settingsWithoutFinalSize);
        if (!errors2.some(error => error.includes('Settings must contain finalSize object'))) {
            throw new Error('Should return error for missing finalSize object');
        }

        console.log('✅ Missing required objects validation returns correct errors');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 8: Multiple validation errors
 */
export async function testMultipleValidationErrors() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const invalidSettings = {
            effects: 'not-an-array',
            allPrimaryEffects: { invalid: 'object' }
            // Missing config and finalSize
        };

        const errors = SettingsValidationService.validateSettingsFile(invalidSettings);
        
        if (!errors.some(error => error.includes('effects must be an array'))) {
            throw new Error('Should include effects array error');
        }
        if (!errors.some(error => error.includes('allPrimaryEffects must be an array'))) {
            throw new Error('Should include allPrimaryEffects array error');
        }
        if (!errors.some(error => error.includes('Settings must contain config object'))) {
            throw new Error('Should include missing config error');
        }
        if (!errors.some(error => error.includes('Settings must contain finalSize object'))) {
            throw new Error('Should include missing finalSize error');
        }
        
        if (errors.length !== 4) {
            throw new Error(`Expected 4 errors, got ${errors.length}: ${errors.join(', ')}`);
        }

        console.log('✅ Multiple validation errors returned correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 9: Conversion summary for valid settings
 */
export async function testConversionSummaryForValidSettings() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const validSettings = {
            effects: [
                { type: 'blur', config: { intensity: 5 } },
                { type: 'glow', config: { radius: 10 } }
            ],
            config: {
                numberOfFrame: 250,
                _INVOKER_: 'Digital Artist',
                finalFileName: 'Test Project'
            },
            finalSize: {
                width: 1920,
                height: 1080
            },
            colorScheme: {
                name: 'vibrant-colors'
            }
        };

        const mockExtractProjectName = (settings) => settings.config?.finalFileName || 'Default Project';
        const result = SettingsValidationService.getConversionSummary(validSettings, mockExtractProjectName);

        if (!result.valid) {
            throw new Error('Result should be valid');
        }
        if (result.summary.projectName !== 'Test Project') {
            throw new Error(`Expected project name 'Test Project', got '${result.summary.projectName}'`);
        }
        if (result.summary.effectsCount !== 2) {
            throw new Error(`Expected effects count 2, got ${result.summary.effectsCount}`);
        }
        if (result.summary.numFrames !== 250) {
            throw new Error(`Expected num frames 250, got ${result.summary.numFrames}`);
        }
        if (result.summary.resolution !== '1920x1080') {
            throw new Error(`Expected resolution '1920x1080', got '${result.summary.resolution}'`);
        }
        if (result.summary.hasColorScheme !== true) {
            throw new Error(`Expected hasColorScheme true, got ${result.summary.hasColorScheme}`);
        }
        if (result.summary.artist !== 'Digital Artist') {
            throw new Error(`Expected artist 'Digital Artist', got '${result.summary.artist}'`);
        }

        console.log('✅ Conversion summary for valid settings works correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 10: Conversion summary for invalid settings
 */
export async function testConversionSummaryForInvalidSettings() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const invalidSettings = {
            // Missing required fields
        };

        const mockExtractProjectName = (settings) => 'Test Project';
        const result = SettingsValidationService.getConversionSummary(invalidSettings, mockExtractProjectName);

        if (result.valid !== false) {
            throw new Error('Result should be invalid');
        }
        if (!result.errors || result.errors.length === 0) {
            throw new Error('Result should have errors');
        }
        if (result.summary !== undefined) {
            throw new Error('Result should not have summary when invalid');
        }

        console.log('✅ Conversion summary for invalid settings returns errors correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 11: Conversion summary with alternative effects arrays
 */
export async function testConversionSummaryWithAlternativeArrays() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const settingsWithAllPrimaryEffects = {
            allPrimaryEffects: [
                { type: 'effect1' },
                { type: 'effect2' },
                { type: 'effect3' }
            ],
            config: {
                numberOfFrame: 150,
                _INVOKER_: 'Alternative Artist'
            },
            finalSize: {
                width: 1280,
                height: 720
            }
        };

        const mockExtractProjectName = (settings) => 'Alternative Project';
        const result = SettingsValidationService.getConversionSummary(settingsWithAllPrimaryEffects, mockExtractProjectName);

        if (!result.valid) {
            throw new Error('Result should be valid');
        }
        if (result.summary.projectName !== 'Alternative Project') {
            throw new Error(`Expected project name 'Alternative Project', got '${result.summary.projectName}'`);
        }
        if (result.summary.effectsCount !== 3) {
            throw new Error(`Expected effects count 3, got ${result.summary.effectsCount}`);
        }
        if (result.summary.numFrames !== 150) {
            throw new Error(`Expected num frames 150, got ${result.summary.numFrames}`);
        }
        if (result.summary.resolution !== '1280x720') {
            throw new Error(`Expected resolution '1280x720', got '${result.summary.resolution}'`);
        }
        if (result.summary.hasColorScheme !== false) {
            throw new Error(`Expected hasColorScheme false, got ${result.summary.hasColorScheme}`);
        }
        if (result.summary.artist !== 'Alternative Artist') {
            throw new Error(`Expected artist 'Alternative Artist', got '${result.summary.artist}'`);
        }

        console.log('✅ Conversion summary with alternative effects arrays works correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 12: Conversion summary with missing optional fields
 */
export async function testConversionSummaryWithDefaults() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        const minimalSettings = {
            effects: [{ type: 'single-effect' }],
            config: {},
            finalSize: {}
        };

        const mockExtractProjectName = (settings) => 'Minimal Project';
        const result = SettingsValidationService.getConversionSummary(minimalSettings, mockExtractProjectName);

        if (!result.valid) {
            throw new Error('Result should be valid');
        }
        if (result.summary.projectName !== 'Minimal Project') {
            throw new Error(`Expected project name 'Minimal Project', got '${result.summary.projectName}'`);
        }
        if (result.summary.effectsCount !== 1) {
            throw new Error(`Expected effects count 1, got ${result.summary.effectsCount}`);
        }
        if (result.summary.numFrames !== 100) {
            throw new Error(`Expected num frames 100 (default), got ${result.summary.numFrames}`);
        }
        if (result.summary.resolution !== '0x0') {
            throw new Error(`Expected resolution '0x0' (default), got '${result.summary.resolution}'`);
        }
        if (result.summary.hasColorScheme !== false) {
            throw new Error(`Expected hasColorScheme false, got ${result.summary.hasColorScheme}`);
        }
        if (result.summary.artist !== 'Unknown') {
            throw new Error(`Expected artist 'Unknown' (default), got '${result.summary.artist}'`);
        }

        console.log('✅ Conversion summary with defaults for missing optional fields works correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}

/**
 * Test 13: Edge cases and complex validation scenarios
 */
export async function testEdgeCasesAndComplexScenarios() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    try {
        // Test with empty arrays (should be valid)
        const settingsWithEmptyEffects = {
            effects: [],
            config: { numberOfFrame: 100 },
            finalSize: { width: 1920, height: 1080 }
        };

        const errors1 = SettingsValidationService.validateSettingsFile(settingsWithEmptyEffects);
        if (errors1.length !== 0) {
            throw new Error(`Empty effects array should be valid, got errors: ${errors1.join(', ')}`);
        }

        // Test with multiple valid arrays
        const settingsWithMultipleArrays = {
            effects: [{ type: 'effect1' }],
            allPrimaryEffects: [{ type: 'effect2' }],
            finalImageEffects: [{ type: 'effect3' }],
            config: { numberOfFrame: 100 },
            finalSize: { width: 1920, height: 1080 }
        };

        const errors2 = SettingsValidationService.validateSettingsFile(settingsWithMultipleArrays);
        if (errors2.length !== 0) {
            throw new Error(`Multiple valid arrays should be valid, got errors: ${errors2.join(', ')}`);
        }

        // Test conversion summary with multiple arrays (should use first available)
        const mockExtractProjectName = (settings) => 'Multi Array Project';
        const result = SettingsValidationService.getConversionSummary(settingsWithMultipleArrays, mockExtractProjectName);

        if (!result.valid) {
            throw new Error('Result should be valid');
        }
        if (result.summary.effectsCount !== 1) {
            throw new Error(`Expected effects count 1 (uses effects array first), got ${result.summary.effectsCount}`);
        }

        console.log('✅ Edge cases and complex validation scenarios work correctly');
        return { success: true };
    } finally {
        await testEnv.cleanup();
    }
}