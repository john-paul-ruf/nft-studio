/**
 * ResolutionMapper.test.js
 * REAL OBJECTS TESTING - Phase 2, Task 2
 * 
 * Tests the ResolutionMapper utility - single source of truth for resolution definitions
 * 
 * CRITICAL REQUIREMENT: ABSOLUTELY NO MOCKS
 * - ✅ Uses REAL ResolutionMapper class
 * - ✅ Tests REAL resolution data and calculations
 * - ✅ Tests REAL parsing and validation logic
 * - ❌ NO mocks, stubs, spies, or fake objects
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import ResolutionMapper from '../../src/utils/ResolutionMapper.js';

/**
 * Test helper to set up real ResolutionMapper
 */
async function setupResolutionMapperTest() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();
    
    return { testEnv, ResolutionMapper };
}

/**
 * Test helper for cleanup
 */
async function cleanupResolutionMapperTest(testEnv) {
    if (testEnv) {
        await testEnv.cleanup();
    }
}

/**
 * Test: Get dimensions with orientation swap
 * Tests the core getDimensions method with real resolution data
 */
async function testGetDimensionsWithOrientationSwap() {
    const { testEnv } = await setupResolutionMapperTest();
    
    try {
        // Test horizontal orientation (default)
        const horizontalHD = ResolutionMapper.getDimensions(1920, true);
        if (horizontalHD.w !== 1920 || horizontalHD.h !== 1080) {
            throw new Error(`Expected 1920x1080 horizontal, got ${horizontalHD.w}x${horizontalHD.h}`);
        }
        
        // Test vertical orientation (swap dimensions)
        const verticalHD = ResolutionMapper.getDimensions(1920, false);
        if (verticalHD.w !== 1080 || verticalHD.h !== 1920) {
            throw new Error(`Expected 1080x1920 vertical, got ${verticalHD.w}x${verticalHD.h}`);
        }
        
        // Test with 4K resolution
        const horizontal4K = ResolutionMapper.getDimensions(3840, true);
        if (horizontal4K.w !== 3840 || horizontal4K.h !== 2160) {
            throw new Error(`Expected 3840x2160 horizontal 4K, got ${horizontal4K.w}x${horizontal4K.h}`);
        }
        
        const vertical4K = ResolutionMapper.getDimensions(3840, false);
        if (vertical4K.w !== 2160 || vertical4K.h !== 3840) {
            throw new Error(`Expected 2160x3840 vertical 4K, got ${vertical4K.w}x${vertical4K.h}`);
        }
        
        console.log('✅ testGetDimensionsWithOrientationSwap - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testGetDimensionsWithOrientationSwap - FAILED:', error.message);
        return false;
    } finally {
        await cleanupResolutionMapperTest(testEnv);
    }
}

/**
 * Test: Parse string resolution (all formats)
 * Tests parsing of various string formats: "1080p", "1920x1080", etc.
 */
async function testParseStringResolutionAllFormats() {
    const { testEnv } = await setupResolutionMapperTest();
    
    try {
        // Test common "p" format
        const parsed1080p = ResolutionMapper.parseStringResolution('1080p');
        if (parsed1080p !== 1920) {
            throw new Error(`Expected 1920 for '1080p', got ${parsed1080p}`);
        }
        
        const parsed720p = ResolutionMapper.parseStringResolution('720p');
        if (parsed720p !== 1280) {
            throw new Error(`Expected 1280 for '720p', got ${parsed720p}`);
        }
        
        // Test WxH format
        const parsedWxH = ResolutionMapper.parseStringResolution('1920x1080');
        if (parsedWxH !== 1920) {
            throw new Error(`Expected 1920 for '1920x1080', got ${parsedWxH}`);
        }
        
        // Test reverse WxH format (should still work)
        const parsedReverse = ResolutionMapper.parseStringResolution('1080x1920');
        if (parsedReverse !== 1920) {
            throw new Error(`Expected 1920 for '1080x1920', got ${parsedReverse}`);
        }
        
        // Test named resolutions
        const parsedHD = ResolutionMapper.parseStringResolution('hd');
        if (parsedHD !== 1920) {
            throw new Error(`Expected 1920 for 'hd', got ${parsedHD}`);
        }
        
        const parsedFullHD = ResolutionMapper.parseStringResolution('fullhd');
        if (parsedFullHD !== 1920) {
            throw new Error(`Expected 1920 for 'fullhd', got ${parsedFullHD}`);
        }
        
        const parsed4K = ResolutionMapper.parseStringResolution('4k');
        if (parsed4K !== 3840) {
            throw new Error(`Expected 3840 for '4k', got ${parsed4K}`);
        }
        
        // Test case insensitivity
        const parsedUpperCase = ResolutionMapper.parseStringResolution('HD');
        if (parsedUpperCase !== 1920) {
            throw new Error(`Expected 1920 for 'HD', got ${parsedUpperCase}`);
        }
        
        // Test with whitespace
        const parsedWithSpaces = ResolutionMapper.parseStringResolution('  1080p  ');
        if (parsedWithSpaces !== 1920) {
            throw new Error(`Expected 1920 for '  1080p  ', got ${parsedWithSpaces}`);
        }
        
        console.log('✅ testParseStringResolutionAllFormats - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testParseStringResolutionAllFormats - FAILED:', error.message);
        return false;
    } finally {
        await cleanupResolutionMapperTest(testEnv);
    }
}

/**
 * Test: Closest resolution calculation
 * Tests finding the closest valid resolution to a target width
 */
async function testClosestResolutionCalculation() {
    const { testEnv } = await setupResolutionMapperTest();
    
    try {
        // Test exact match
        const exactMatch = ResolutionMapper.getClosestResolution(1920);
        if (exactMatch !== 1920) {
            throw new Error(`Expected 1920 for exact match, got ${exactMatch}`);
        }
        
        // Test close to HD (1920)
        const closeToHD = ResolutionMapper.getClosestResolution(1900);
        if (closeToHD !== 1920) {
            throw new Error(`Expected 1920 for 1900, got ${closeToHD}`);
        }
        
        // Test between resolutions (closer to lower)
        const betweenLower = ResolutionMapper.getClosestResolution(1500);
        if (betweenLower !== 1440) {
            throw new Error(`Expected 1440 for 1500, got ${betweenLower}`);
        }
        
        // Test between resolutions (closer to higher)
        const betweenHigher = ResolutionMapper.getClosestResolution(1700);
        if (betweenHigher !== 1680) {
            throw new Error(`Expected 1680 for 1700, got ${betweenHigher}`);
        }
        
        // Test very low value
        const veryLow = ResolutionMapper.getClosestResolution(100);
        if (veryLow !== 160) {
            throw new Error(`Expected 160 for 100, got ${veryLow}`);
        }
        
        // Test very high value
        const veryHigh = ResolutionMapper.getClosestResolution(10000);
        if (veryHigh !== 8192) {
            throw new Error(`Expected 8192 for 10000, got ${veryHigh}`);
        }
        
        console.log('✅ testClosestResolutionCalculation - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testClosestResolutionCalculation - FAILED:', error.message);
        return false;
    } finally {
        await cleanupResolutionMapperTest(testEnv);
    }
}

/**
 * Test: Invalid resolution error handling
 * Tests error handling for invalid resolution requests
 */
async function testInvalidResolutionErrorHandling() {
    const { testEnv } = await setupResolutionMapperTest();
    
    try {
        // Test invalid width throws error
        let errorThrown = false;
        try {
            ResolutionMapper.getDimensions(9999);
        } catch (error) {
            errorThrown = true;
            if (!error.message.includes('Resolution 9999 not found')) {
                throw new Error(`Expected specific error message, got: ${error.message}`);
            }
        }
        
        if (!errorThrown) {
            throw new Error('Expected error for invalid resolution 9999');
        }
        
        // Test invalid string resolution falls back to default
        const invalidString = ResolutionMapper.parseStringResolution('invalid_resolution');
        if (invalidString !== 1920) {
            throw new Error(`Expected fallback to 1920 for invalid string, got ${invalidString}`);
        }
        
        // Test null/undefined handling
        const nullResult = ResolutionMapper.parseStringResolution(null);
        if (nullResult !== 1920) {
            throw new Error(`Expected fallback to 1920 for null, got ${nullResult}`);
        }
        
        const undefinedResult = ResolutionMapper.parseStringResolution(undefined);
        if (undefinedResult !== 1920) {
            throw new Error(`Expected fallback to 1920 for undefined, got ${undefinedResult}`);
        }
        
        // Test empty string
        const emptyResult = ResolutionMapper.parseStringResolution('');
        if (emptyResult !== 1920) {
            throw new Error(`Expected fallback to 1920 for empty string, got ${emptyResult}`);
        }
        
        console.log('✅ testInvalidResolutionErrorHandling - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testInvalidResolutionErrorHandling - FAILED:', error.message);
        return false;
    } finally {
        await cleanupResolutionMapperTest(testEnv);
    }
}

/**
 * Test: Naturally portrait detection
 * Tests detection of naturally portrait-oriented resolutions
 */
async function testNaturallyPortraitDetection() {
    const { testEnv } = await setupResolutionMapperTest();
    
    try {
        // Test landscape resolutions (not naturally portrait)
        const hdResolution = ResolutionMapper.getByWidth(1920);
        const isHDPortrait = ResolutionMapper.isNaturallyPortrait(hdResolution);
        if (isHDPortrait) {
            throw new Error('HD (1920x1080) should not be naturally portrait');
        }
        
        const vgaResolution = ResolutionMapper.getByWidth(640);
        const isVGAPortrait = ResolutionMapper.isNaturallyPortrait(vgaResolution);
        if (isVGAPortrait) {
            throw new Error('VGA (640x480) should not be naturally portrait');
        }
        
        // Test mobile resolutions (naturally portrait)
        const mobileResolution = ResolutionMapper.getByWidth(360);
        const isMobilePortrait = ResolutionMapper.isNaturallyPortrait(mobileResolution);
        if (!isMobilePortrait) {
            throw new Error('Mobile (360x640) should be naturally portrait');
        }
        
        const iphoneResolution = ResolutionMapper.getByWidth(375);
        const isIPhonePortrait = ResolutionMapper.isNaturallyPortrait(iphoneResolution);
        if (!isIPhonePortrait) {
            throw new Error('iPhone (375x667) should be naturally portrait');
        }
        
        // Test null/undefined handling
        const nullResult = ResolutionMapper.isNaturallyPortrait(null);
        if (nullResult) {
            throw new Error('null should not be naturally portrait');
        }
        
        const undefinedResult = ResolutionMapper.isNaturallyPortrait(undefined);
        if (undefinedResult) {
            throw new Error('undefined should not be naturally portrait');
        }
        
        console.log('✅ testNaturallyPortraitDetection - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testNaturallyPortraitDetection - FAILED:', error.message);
        return false;
    } finally {
        await cleanupResolutionMapperTest(testEnv);
    }
}

/**
 * Test: Display name generation
 * Tests generation of human-readable display names
 */
async function testDisplayNameGeneration() {
    const { testEnv } = await setupResolutionMapperTest();
    
    try {
        // Test known resolutions
        const hdName = ResolutionMapper.getDisplayName(1920);
        if (hdName !== '1920x1080 (Full HD)') {
            throw new Error(`Expected '1920x1080 (Full HD)', got '${hdName}'`);
        }
        
        const vgaName = ResolutionMapper.getDisplayName(640);
        if (vgaName !== '640x480 (VGA)') {
            throw new Error(`Expected '640x480 (VGA)', got '${vgaName}'`);
        }
        
        const fourKName = ResolutionMapper.getDisplayName(3840);
        if (fourKName !== '3840x2160 (4K UHD)') {
            throw new Error(`Expected '3840x2160 (4K UHD)', got '${fourKName}'`);
        }
        
        // Test unknown resolution
        const unknownName = ResolutionMapper.getDisplayName(9999);
        if (unknownName !== '9999x? (Unknown)') {
            throw new Error(`Expected '9999x? (Unknown)', got '${unknownName}'`);
        }
        
        console.log('✅ testDisplayNameGeneration - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testDisplayNameGeneration - FAILED:', error.message);
        return false;
    } finally {
        await cleanupResolutionMapperTest(testEnv);
    }
}

/**
 * Test: Category filtering (Standard, HD, 4K, etc.)
 * Tests filtering resolutions by category
 */
async function testCategoryFiltering() {
    const { testEnv } = await setupResolutionMapperTest();
    
    try {
        // Test HD category
        const hdResolutions = ResolutionMapper.getByCategory('HD');
        if (!Array.isArray(hdResolutions) || hdResolutions.length === 0) {
            throw new Error('HD category should return non-empty array');
        }
        
        // Verify HD category contains expected resolutions
        const hdWidths = hdResolutions.map(r => r.width);
        const expectedHDWidths = [1280, 1366, 1440, 1600, 1680, 1920];
        for (const expectedWidth of expectedHDWidths) {
            if (!hdWidths.includes(expectedWidth)) {
                throw new Error(`HD category missing width ${expectedWidth}`);
            }
        }
        
        // Test UHD category
        const uhdResolutions = ResolutionMapper.getByCategory('UHD');
        if (!Array.isArray(uhdResolutions) || uhdResolutions.length === 0) {
            throw new Error('UHD category should return non-empty array');
        }
        
        const uhdWidths = uhdResolutions.map(r => r.width);
        if (!uhdWidths.includes(3840) || !uhdWidths.includes(4096)) {
            throw new Error('UHD category should include 3840 and 4096');
        }
        
        // Test SD category
        const sdResolutions = ResolutionMapper.getByCategory('SD');
        if (!Array.isArray(sdResolutions) || sdResolutions.length === 0) {
            throw new Error('SD category should return non-empty array');
        }
        
        // Test non-existent category
        const nonExistentCategory = ResolutionMapper.getByCategory('NonExistent');
        if (!Array.isArray(nonExistentCategory) || nonExistentCategory.length !== 0) {
            throw new Error('Non-existent category should return empty array');
        }
        
        console.log('✅ testCategoryFiltering - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testCategoryFiltering - FAILED:', error.message);
        return false;
    } finally {
        await cleanupResolutionMapperTest(testEnv);
    }
}

/**
 * Test: Standard resolutions completeness validation
 * Tests that all expected standard resolutions are present
 */
async function testStandardResolutionsCompleteness() {
    const { testEnv } = await setupResolutionMapperTest();
    
    try {
        const standardResolutions = ResolutionMapper.getStandardResolutions();
        
        if (!Array.isArray(standardResolutions) || standardResolutions.length === 0) {
            throw new Error('Standard resolutions should return non-empty array');
        }
        
        // Expected standard widths based on the implementation
        const expectedWidths = [640, 854, 1280, 1920, 2560, 3840, 7680];
        
        if (standardResolutions.length !== expectedWidths.length) {
            throw new Error(`Expected ${expectedWidths.length} standard resolutions, got ${standardResolutions.length}`);
        }
        
        // Verify each expected width is present
        const actualWidths = standardResolutions.map(r => r.width);
        for (const expectedWidth of expectedWidths) {
            if (!actualWidths.includes(expectedWidth)) {
                throw new Error(`Standard resolutions missing width ${expectedWidth}`);
            }
        }
        
        // Verify each resolution has required properties
        for (const resolution of standardResolutions) {
            if (!resolution.width || !resolution.w || !resolution.h || !resolution.name || !resolution.category) {
                throw new Error(`Resolution missing required properties: ${JSON.stringify(resolution)}`);
            }
            
            if (resolution.width !== resolution.w) {
                throw new Error(`Width mismatch in resolution: width=${resolution.width}, w=${resolution.w}`);
            }
        }
        
        console.log('✅ testStandardResolutionsCompleteness - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testStandardResolutionsCompleteness - FAILED:', error.message);
        return false;
    } finally {
        await cleanupResolutionMapperTest(testEnv);
    }
}

/**
 * Test: Resolution validation
 * Tests the isValidResolution method
 */
async function testResolutionValidation() {
    const { testEnv } = await setupResolutionMapperTest();
    
    try {
        // Test valid resolutions
        const validResolutions = [160, 320, 640, 1280, 1920, 3840, 7680];
        for (const width of validResolutions) {
            const isValid = ResolutionMapper.isValidResolution(width);
            if (!isValid) {
                throw new Error(`Width ${width} should be valid`);
            }
        }
        
        // Test invalid resolutions
        const invalidResolutions = [100, 999, 5000, 9999];
        for (const width of invalidResolutions) {
            const isValid = ResolutionMapper.isValidResolution(width);
            if (isValid) {
                throw new Error(`Width ${width} should be invalid`);
            }
        }
        
        console.log('✅ testResolutionValidation - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testResolutionValidation - FAILED:', error.message);
        return false;
    } finally {
        await cleanupResolutionMapperTest(testEnv);
    }
}

// Export all test functions for the test runner
export {
    testGetDimensionsWithOrientationSwap,
    testParseStringResolutionAllFormats,
    testClosestResolutionCalculation,
    testInvalidResolutionErrorHandling,
    testNaturallyPortraitDetection,
    testDisplayNameGeneration,
    testCategoryFiltering,
    testStandardResolutionsCompleteness,
    testResolutionValidation
};