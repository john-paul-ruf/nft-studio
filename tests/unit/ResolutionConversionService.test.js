/**
 * ResolutionConversionService Tests
 * 
 * Tests resolution conversion from settings format to project format
 * and orientation determination logic.
 * 
 * REAL OBJECTS ONLY - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import ResolutionConversionService from '../../src/services/ResolutionConversionService.js';
import ResolutionMapper from '../../src/utils/ResolutionMapper.js';

/**
 * Test service initialization and method availability
 */
async function test_service_initialization_and_methods() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        // Verify service is available and has expected methods
        console.log('🧪 Testing ResolutionConversionService initialization...');
        
        if (!ResolutionConversionService) {
            throw new Error('ResolutionConversionService not available');
        }
        
        if (typeof ResolutionConversionService.convertResolution !== 'function') {
            throw new Error('convertResolution method not available');
        }
        
        if (typeof ResolutionConversionService.determineOrientation !== 'function') {
            throw new Error('determineOrientation method not available');
        }
        
        console.log('✅ ResolutionConversionService initialization test passed');
        return true;
        
    } catch (error) {
        console.error('❌ ResolutionConversionService initialization test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test resolution conversion with standard resolutions
 */
async function test_convert_standard_resolutions() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing standard resolution conversion...');
        
        // Test 1080p resolution
        const settings1080p = {
            finalSize: { width: 1920, height: 1080 }
        };
        
        const result1080p = ResolutionConversionService.convertResolution(settings1080p);
        if (result1080p !== 1920) {
            throw new Error(`Expected 1920 for 1080p, got ${result1080p}`);
        }
        
        // Test 720p resolution
        const settings720p = {
            finalSize: { width: 1280, height: 720 }
        };
        
        const result720p = ResolutionConversionService.convertResolution(settings720p);
        if (result720p !== 1280) {
            throw new Error(`Expected 1280 for 720p, got ${result720p}`);
        }
        
        // Test 4K resolution
        const settings4K = {
            finalSize: { width: 3840, height: 2160 }
        };
        
        const result4K = ResolutionConversionService.convertResolution(settings4K);
        if (result4K !== 3840) {
            throw new Error(`Expected 3840 for 4K, got ${result4K}`);
        }
        
        console.log('✅ Standard resolution conversion test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Standard resolution conversion test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test resolution conversion with explicit longest side
 */
async function test_convert_with_explicit_longest_side() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing resolution conversion with explicit longest side...');
        
        // Test with explicit longestSide in fileConfig
        const settingsWithFileConfig = {
            finalSize: { width: 1920, height: 1080 },
            fileConfig: {
                finalImageSize: {
                    longestSide: 1920,
                    shortestSide: 1080
                }
            }
        };
        
        const result1 = ResolutionConversionService.convertResolution(settingsWithFileConfig);
        if (result1 !== 1920) {
            throw new Error(`Expected 1920 with fileConfig longestSide, got ${result1}`);
        }
        
        // Test with longestSideInPixels
        const settingsWithLongestPixels = {
            finalSize: { width: 1280, height: 720 },
            longestSideInPixels: 1280
        };
        
        const result2 = ResolutionConversionService.convertResolution(settingsWithLongestPixels);
        if (result2 !== 1280) {
            throw new Error(`Expected 1280 with longestSideInPixels, got ${result2}`);
        }
        
        // Test with longestSide
        const settingsWithLongest = {
            finalSize: { width: 3840, height: 2160 },
            longestSide: 3840
        };
        
        const result3 = ResolutionConversionService.convertResolution(settingsWithLongest);
        if (result3 !== 3840) {
            throw new Error(`Expected 3840 with longestSide, got ${result3}`);
        }
        
        console.log('✅ Resolution conversion with explicit longest side test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Resolution conversion with explicit longest side test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test resolution conversion with custom resolutions
 */
async function test_convert_custom_resolutions() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing custom resolution conversion...');
        
        // Test custom resolution that should map to closest standard
        const customSettings = {
            finalSize: { width: 1900, height: 1000 }
        };
        
        const customResult = ResolutionConversionService.convertResolution(customSettings);
        // Should map to closest standard resolution (1920 for 1080p)
        if (customResult !== 1920) {
            throw new Error(`Expected 1920 for custom resolution, got ${customResult}`);
        }
        
        // Test very small custom resolution
        const smallSettings = {
            finalSize: { width: 500, height: 300 }
        };
        
        const smallResult = ResolutionConversionService.convertResolution(smallSettings);
        // Should map to a valid resolution key
        if (!smallResult || smallResult <= 0) {
            throw new Error(`Expected valid resolution key for small custom resolution, got ${smallResult}`);
        }
        
        console.log('✅ Custom resolution conversion test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Custom resolution conversion test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test orientation determination with explicit isHorizontal flag
 */
async function test_determine_orientation_explicit_flag() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing orientation determination with explicit flag...');
        
        // Test explicit horizontal flag
        const horizontalSettings = {
            finalSize: { width: 1920, height: 1080 },
            isHorizontal: true
        };
        
        const horizontalResult = ResolutionConversionService.determineOrientation(horizontalSettings);
        if (horizontalResult !== true) {
            throw new Error(`Expected true for explicit horizontal, got ${horizontalResult}`);
        }
        
        // Test explicit vertical flag
        const verticalSettings = {
            finalSize: { width: 1080, height: 1920 },
            isHorizontal: false
        };
        
        const verticalResult = ResolutionConversionService.determineOrientation(verticalSettings);
        if (verticalResult !== false) {
            throw new Error(`Expected false for explicit vertical, got ${verticalResult}`);
        }
        
        console.log('✅ Orientation determination with explicit flag test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Orientation determination with explicit flag test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test orientation determination with longest/shortest sides
 */
async function test_determine_orientation_longest_shortest() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing orientation determination with longest/shortest sides...');
        
        // Test horizontal with explicit longest/shortest
        const horizontalSettings = {
            finalSize: { width: 1920, height: 1080 },
            fileConfig: {
                finalImageSize: {
                    longestSide: 1920,
                    shortestSide: 1080
                }
            }
        };
        
        const horizontalResult = ResolutionConversionService.determineOrientation(horizontalSettings);
        if (horizontalResult !== true) {
            throw new Error(`Expected true for horizontal with longest/shortest, got ${horizontalResult}`);
        }
        
        // Test vertical with explicit longest/shortest
        const verticalSettings = {
            finalSize: { width: 1080, height: 1920 },
            fileConfig: {
                finalImageSize: {
                    longestSide: 1920,
                    shortestSide: 1080
                }
            }
        };
        
        const verticalResult = ResolutionConversionService.determineOrientation(verticalSettings);
        if (verticalResult !== false) {
            throw new Error(`Expected false for vertical with longest/shortest, got ${verticalResult}`);
        }
        
        // Test with longestSideInPixels and shortestSideInPixels
        const pixelsSettings = {
            finalSize: { width: 1280, height: 720 },
            longestSideInPixels: 1280,
            shortestSideInPixels: 720
        };
        
        const pixelsResult = ResolutionConversionService.determineOrientation(pixelsSettings);
        if (pixelsResult !== true) {
            throw new Error(`Expected true for horizontal with pixels sides, got ${pixelsResult}`);
        }
        
        console.log('✅ Orientation determination with longest/shortest sides test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Orientation determination with longest/shortest sides test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test error handling for invalid settings
 */
async function test_error_handling_invalid_settings() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing error handling for invalid settings...');
        
        // Test missing finalSize
        const noFinalSizeSettings = {};
        const defaultResult = ResolutionConversionService.convertResolution(noFinalSizeSettings);
        // Should return default resolution
        if (!defaultResult || defaultResult <= 0) {
            throw new Error(`Expected valid default resolution, got ${defaultResult}`);
        }
        
        // Test orientation with missing finalSize
        const orientationResult = ResolutionConversionService.determineOrientation(noFinalSizeSettings);
        if (orientationResult !== true) {
            throw new Error(`Expected true (default horizontal) for missing finalSize, got ${orientationResult}`);
        }
        
        // Test square resolution orientation
        const squareSettings = {
            finalSize: { width: 1080, height: 1080 }
        };
        
        const squareResult = ResolutionConversionService.determineOrientation(squareSettings);
        if (squareResult !== true) {
            throw new Error(`Expected true (default horizontal) for square resolution, got ${squareResult}`);
        }
        
        console.log('✅ Error handling for invalid settings test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Error handling for invalid settings test failed:', error.message);
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
    test_convert_standard_resolutions,
    test_convert_with_explicit_longest_side,
    test_convert_custom_resolutions,
    test_determine_orientation_explicit_flag,
    test_determine_orientation_longest_shortest,
    test_error_handling_invalid_settings
};