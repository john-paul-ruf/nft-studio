/**
 * ColorSchemeConversionService Tests
 * 
 * Tests color scheme extraction and conversion from settings format.
 * 
 * REAL OBJECTS ONLY - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import ColorSchemeConversionService from '../../src/services/ColorSchemeConversionService.js';

/**
 * Test service initialization and method availability
 */
async function test_service_initialization_and_methods() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        // Verify service is available and has expected methods
        console.log('🧪 Testing ColorSchemeConversionService initialization...');
        
        if (!ColorSchemeConversionService) {
            throw new Error('ColorSchemeConversionService not available');
        }
        
        if (typeof ColorSchemeConversionService.extractColorSchemeName !== 'function') {
            throw new Error('extractColorSchemeName method not available');
        }
        
        if (typeof ColorSchemeConversionService.convertColorSchemeData !== 'function') {
            throw new Error('convertColorSchemeData method not available');
        }
        
        console.log('✅ ColorSchemeConversionService initialization test passed');
        return true;
        
    } catch (error) {
        console.error('❌ ColorSchemeConversionService initialization test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test color scheme name extraction with various settings
 */
async function test_extract_color_scheme_name() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing color scheme name extraction...');
        
        // Test with vishuddha chakra info
        const vishuddhSettings = {
            colorScheme: {
                colorSchemeInfo: 'Vishuddha Chakra Colors'
            }
        };
        
        const vishuddhResult = ColorSchemeConversionService.extractColorSchemeName(vishuddhSettings);
        if (vishuddhResult !== 'vishuddha-chakra') {
            throw new Error(`Expected 'vishuddha-chakra', got '${vishuddhResult}'`);
        }
        
        // Test with generic chakra info
        const chakraSettings = {
            colorScheme: {
                colorSchemeInfo: 'Chakra Inspired Palette'
            }
        };
        
        const chakraResult = ColorSchemeConversionService.extractColorSchemeName(chakraSettings);
        if (chakraResult !== 'chakra-inspired') {
            throw new Error(`Expected 'chakra-inspired', got '${chakraResult}'`);
        }
        
        // Test with no color scheme info
        const noInfoSettings = {};
        
        const noInfoResult = ColorSchemeConversionService.extractColorSchemeName(noInfoSettings);
        if (noInfoResult !== 'custom-scheme') {
            throw new Error(`Expected 'custom-scheme', got '${noInfoResult}'`);
        }
        
        // Test with empty color scheme info
        const emptyInfoSettings = {
            colorScheme: {
                colorSchemeInfo: ''
            }
        };
        
        const emptyInfoResult = ColorSchemeConversionService.extractColorSchemeName(emptyInfoSettings);
        if (emptyInfoResult !== 'custom-scheme') {
            throw new Error(`Expected 'custom-scheme', got '${emptyInfoResult}'`);
        }
        
        console.log('✅ Color scheme name extraction test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Color scheme name extraction test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test color scheme data conversion with complete data
 */
async function test_convert_complete_color_scheme_data() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing complete color scheme data conversion...');
        
        const completeSettings = {
            colorScheme: {
                colorBucket: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
                neutrals: ['#808080', '#C0C0C0'],
                backgrounds: ['#000000', '#FFFFFF'],
                lights: ['#FFFFE0', '#F0F8FF'],
                colorSchemeInfo: 'Test Color Scheme'
            }
        };
        
        const result = ColorSchemeConversionService.convertColorSchemeData(completeSettings);
        
        if (!result) {
            throw new Error('Expected color scheme data, got null');
        }
        
        if (!Array.isArray(result.colors) || result.colors.length !== 4) {
            throw new Error(`Expected 4 colors, got ${result.colors?.length}`);
        }
        
        if (!Array.isArray(result.neutrals) || result.neutrals.length !== 2) {
            throw new Error(`Expected 2 neutrals, got ${result.neutrals?.length}`);
        }
        
        if (!Array.isArray(result.backgrounds) || result.backgrounds.length !== 2) {
            throw new Error(`Expected 2 backgrounds, got ${result.backgrounds?.length}`);
        }
        
        if (!Array.isArray(result.lights) || result.lights.length !== 2) {
            throw new Error(`Expected 2 lights, got ${result.lights?.length}`);
        }
        
        if (result.info !== 'Test Color Scheme') {
            throw new Error(`Expected 'Test Color Scheme', got '${result.info}'`);
        }
        
        if (result.source !== 'settings-conversion') {
            throw new Error(`Expected 'settings-conversion', got '${result.source}'`);
        }
        
        console.log('✅ Complete color scheme data conversion test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Complete color scheme data conversion test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test color scheme data conversion with fallback generation
 */
async function test_convert_with_fallback_generation() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing color scheme data conversion with fallback generation...');
        
        // Test with only colors - should generate fallbacks
        const colorsOnlySettings = {
            colorScheme: {
                colorBucket: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']
            }
        };
        
        const result = ColorSchemeConversionService.convertColorSchemeData(colorsOnlySettings);
        
        if (!result) {
            throw new Error('Expected color scheme data, got null');
        }
        
        if (!Array.isArray(result.colors) || result.colors.length !== 6) {
            throw new Error(`Expected 6 colors, got ${result.colors?.length}`);
        }
        
        // Should generate neutrals as subset of colors
        if (!Array.isArray(result.neutrals) || result.neutrals.length === 0) {
            throw new Error(`Expected generated neutrals, got ${result.neutrals?.length}`);
        }
        
        // Should generate backgrounds as subset of colors
        if (!Array.isArray(result.backgrounds) || result.backgrounds.length === 0) {
            throw new Error(`Expected generated backgrounds, got ${result.backgrounds?.length}`);
        }
        
        // Should use all colors as lights fallback
        if (!Array.isArray(result.lights) || result.lights.length !== 6) {
            throw new Error(`Expected 6 lights (fallback), got ${result.lights?.length}`);
        }
        
        // Test with colors from top-level settings
        const topLevelSettings = {
            colorScheme: {
                colorBucket: ['#FF0000', '#00FF00']
            },
            neutrals: ['#808080'],
            backgrounds: ['#000000'],
            lights: ['#FFFFFF']
        };
        
        const topLevelResult = ColorSchemeConversionService.convertColorSchemeData(topLevelSettings);
        
        if (!topLevelResult) {
            throw new Error('Expected color scheme data from top-level settings, got null');
        }
        
        if (topLevelResult.neutrals.length !== 1 || topLevelResult.neutrals[0] !== '#808080') {
            throw new Error('Expected top-level neutrals to be used');
        }
        
        console.log('✅ Color scheme data conversion with fallback generation test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Color scheme data conversion with fallback generation test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test error handling for invalid color scheme data
 */
async function test_error_handling_invalid_data() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing error handling for invalid color scheme data...');
        
        // Test with no color scheme
        const noColorSchemeSettings = {};
        
        const noSchemeResult = ColorSchemeConversionService.convertColorSchemeData(noColorSchemeSettings);
        if (noSchemeResult !== null) {
            throw new Error(`Expected null for no color scheme, got ${noSchemeResult}`);
        }
        
        // Test with empty color bucket
        const emptyColorsSettings = {
            colorScheme: {
                colorBucket: []
            }
        };
        
        const emptyColorsResult = ColorSchemeConversionService.convertColorSchemeData(emptyColorsSettings);
        if (emptyColorsResult !== null) {
            throw new Error(`Expected null for empty colors, got ${emptyColorsResult}`);
        }
        
        // Test with missing color bucket
        const missingBucketSettings = {
            colorScheme: {
                colorSchemeInfo: 'Test'
            }
        };
        
        const missingBucketResult = ColorSchemeConversionService.convertColorSchemeData(missingBucketSettings);
        if (missingBucketResult !== null) {
            throw new Error(`Expected null for missing color bucket, got ${missingBucketResult}`);
        }
        
        console.log('✅ Error handling for invalid color scheme data test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Error handling for invalid color scheme data test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test color scheme data structure validation
 */
async function test_color_scheme_data_structure() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing color scheme data structure validation...');
        
        const testSettings = {
            colorScheme: {
                colorBucket: ['#FF0000', '#00FF00', '#0000FF'],
                colorSchemeInfo: 'Structure Test'
            }
        };
        
        const result = ColorSchemeConversionService.convertColorSchemeData(testSettings);
        
        if (!result) {
            throw new Error('Expected color scheme data, got null');
        }
        
        // Verify all required properties exist
        const requiredProperties = ['colors', 'neutrals', 'backgrounds', 'lights', 'info', 'source'];
        for (const prop of requiredProperties) {
            if (!(prop in result)) {
                throw new Error(`Missing required property: ${prop}`);
            }
        }
        
        // Verify all color arrays are actually arrays
        const colorArrays = ['colors', 'neutrals', 'backgrounds', 'lights'];
        for (const arrayProp of colorArrays) {
            if (!Array.isArray(result[arrayProp])) {
                throw new Error(`Property ${arrayProp} should be an array`);
            }
        }
        
        // Verify info is a string
        if (typeof result.info !== 'string') {
            throw new Error('Property info should be a string');
        }
        
        // Verify source is correct
        if (result.source !== 'settings-conversion') {
            throw new Error(`Expected source 'settings-conversion', got '${result.source}'`);
        }
        
        console.log('✅ Color scheme data structure validation test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Color scheme data structure validation test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

// Export all test functions
export {
    test_service_initialization_and_methods,
    test_extract_color_scheme_name,
    test_convert_complete_color_scheme_data,
    test_convert_with_fallback_generation,
    test_error_handling_invalid_data,
    test_color_scheme_data_structure
};