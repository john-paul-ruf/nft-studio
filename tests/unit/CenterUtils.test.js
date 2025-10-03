/**
 * CenterUtils.test.js
 * REAL OBJECTS TESTING - Phase 2, Task 4
 * 
 * Tests the CenterUtils utility - complex center detection and position utilities
 * 
 * CRITICAL REQUIREMENT: ABSOLUTELY NO MOCKS
 * - ✅ Uses REAL CenterUtils class
 * - ✅ Tests REAL center detection across resolutions
 * - ✅ Tests REAL tolerance boundaries and decision logic
 * - ✅ Tests REAL proportional scaling with aspect ratio changes
 * - ❌ NO mocks, stubs, spies, or fake objects
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import { CenterUtils } from '../../src/utils/CenterUtils.js';

/**
 * Test helper to set up real CenterUtils test environment
 */
async function setupCenterUtilsTest() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();
    
    return { testEnv, CenterUtils };
}

/**
 * Test helper for cleanup
 */
async function cleanupCenterUtilsTest(testEnv) {
    if (testEnv) {
        await testEnv.cleanup();
    }
}

/**
 * Test: Center detection across common resolutions (1080p, 720p, 4K)
 * Tests accurate center detection for various standard resolutions
 */
async function testCenterDetectionAcrossResolutions() {
    const { testEnv } = await setupCenterUtilsTest();
    
    try {
        // Test 1080p center detection (1920x1080)
        const hd1080pCenter = CenterUtils.getCenterPosition(1920, 1080);
        if (hd1080pCenter.x !== 960 || hd1080pCenter.y !== 540) {
            throw new Error(`Expected 1080p center (960, 540), got (${hd1080pCenter.x}, ${hd1080pCenter.y})`);
        }
        
        // Test that the calculated center is detected as center
        const isHD1080pCenter = CenterUtils.isCenterPosition(960, 540, { width: 1920, height: 1080 });
        if (!isHD1080pCenter) {
            throw new Error('1080p center (960, 540) not detected as center');
        }
        
        // Test 720p center detection (1280x720)
        const hd720pCenter = CenterUtils.getCenterPosition(1280, 720);
        if (hd720pCenter.x !== 640 || hd720pCenter.y !== 360) {
            throw new Error(`Expected 720p center (640, 360), got (${hd720pCenter.x}, ${hd720pCenter.y})`);
        }
        
        const isHD720pCenter = CenterUtils.isCenterPosition(640, 360, { width: 1280, height: 720 });
        if (!isHD720pCenter) {
            throw new Error('720p center (640, 360) not detected as center');
        }
        
        // Test 4K center detection (3840x2160)
        const fourKCenter = CenterUtils.getCenterPosition(3840, 2160);
        if (fourKCenter.x !== 1920 || fourKCenter.y !== 1080) {
            throw new Error(`Expected 4K center (1920, 1080), got (${fourKCenter.x}, ${fourKCenter.y})`);
        }
        
        const is4KCenter = CenterUtils.isCenterPosition(1920, 1080, { width: 3840, height: 2160 });
        if (!is4KCenter) {
            throw new Error('4K center (1920, 1080) not detected as center');
        }
        
        // Test VGA center detection (640x480)
        const vgaCenter = CenterUtils.getCenterPosition(640, 480);
        if (vgaCenter.x !== 320 || vgaCenter.y !== 240) {
            throw new Error(`Expected VGA center (320, 240), got (${vgaCenter.x}, ${vgaCenter.y})`);
        }
        
        const isVGACenter = CenterUtils.isCenterPosition(320, 240, { width: 640, height: 480 });
        if (!isVGACenter) {
            throw new Error('VGA center (320, 240) not detected as center');
        }
        
        console.log('✅ testCenterDetectionAcrossResolutions - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testCenterDetectionAcrossResolutions - FAILED:', error.message);
        return false;
    } finally {
        await cleanupCenterUtilsTest(testEnv);
    }
}

/**
 * Test: Center detection with tolerance boundaries
 * Tests that positions within tolerance are detected as centers
 */
async function testCenterDetectionWithTolerance() {
    const { testEnv } = await setupCenterUtilsTest();
    
    try {
        const resolutionInfo = { width: 1920, height: 1080 };
        const exactCenter = { x: 960, y: 540 };
        
        // Test exact center
        const isExactCenter = CenterUtils.isCenterPosition(exactCenter.x, exactCenter.y, resolutionInfo);
        if (!isExactCenter) {
            throw new Error('Exact center not detected');
        }
        
        // Test within 1% tolerance (should be detected)
        const tolerance1Percent = 1920 * 0.01; // 19.2 pixels
        const withinTolerance = CenterUtils.isCenterPosition(
            exactCenter.x + Math.floor(tolerance1Percent / 2), 
            exactCenter.y + Math.floor(tolerance1Percent / 2), 
            resolutionInfo
        );
        if (!withinTolerance) {
            throw new Error('Position within 1% tolerance not detected as center');
        }
        
        // Test just outside tolerance (should not be detected)
        const outsideTolerance = CenterUtils.isCenterPosition(
            exactCenter.x + tolerance1Percent + 5, 
            exactCenter.y + tolerance1Percent + 5, 
            resolutionInfo
        );
        if (outsideTolerance) {
            throw new Error('Position outside tolerance incorrectly detected as center');
        }
        
        // Test fallback tolerance (5% for common resolutions)
        // Without current resolution context, should use 5% tolerance
        const fallbackTolerance = CenterUtils.isCenterPosition(960, 540); // No resolution context
        if (!fallbackTolerance) {
            throw new Error('Fallback center detection failed');
        }
        
        // Test edge case: position at edge of tolerance
        const edgeTolerance = 1920 * 0.01; // Exactly at 1% boundary
        const atEdge = CenterUtils.isCenterPosition(
            exactCenter.x + edgeTolerance, 
            exactCenter.y, 
            resolutionInfo
        );
        if (!atEdge) {
            throw new Error('Position at edge of tolerance not detected');
        }
        
        console.log('✅ testCenterDetectionWithTolerance - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testCenterDetectionWithTolerance - FAILED:', error.message);
        return false;
    } finally {
        await cleanupCenterUtilsTest(testEnv);
    }
}

/**
 * Test: Proportional scaling with aspect ratio changes
 * Tests scaling of field values when aspect ratios change
 */
async function testProportionalScalingWithAspectRatio() {
    const { testEnv } = await setupCenterUtilsTest();
    
    try {
        // Test scaling from 16:9 to 4:3 aspect ratio
        const oldResolution = { resolution: 1920, isHorizontal: true }; // 1920x1080 (16:9)
        const newResolution = { resolution: 1024, isHorizontal: true }; // 1024x768 (4:3)
        
        // Test Position object scaling
        const positionValue = { name: 'position', x: 960, y: 540 }; // Center of 1920x1080
        const scaledPosition = CenterUtils.scaleFieldValue(positionValue, oldResolution, newResolution);
        
        // Expected scaling: x = 960 * (1024/1920) = 512, y = 540 * (768/1080) = 384
        if (scaledPosition.x !== 512 || scaledPosition.y !== 384) {
            throw new Error(`Expected scaled position (512, 384), got (${scaledPosition.x}, ${scaledPosition.y})`);
        }
        
        if (!scaledPosition.__proportionallyScaled) {
            throw new Error('Proportional scaling metadata not added');
        }
        
        // Test legacy point2d scaling
        const legacyPoint = { x: 1920, y: 1080 }; // Bottom-right corner
        const scaledLegacy = CenterUtils.scaleFieldValue(legacyPoint, oldResolution, newResolution);
        
        // Expected: x = 1920 * (1024/1920) = 1024, but clamped to 1023 (max width - 1)
        // Expected: y = 1080 * (768/1080) = 768, but clamped to 767 (max height - 1)
        if (scaledLegacy.x !== 1023 || scaledLegacy.y !== 767) {
            throw new Error(`Expected clamped legacy point (1023, 767), got (${scaledLegacy.x}, ${scaledLegacy.y})`);
        }
        
        // Test ArcPath scaling with aspect ratio change
        const arcPath = {
            name: 'arc-path',
            center: { x: 960, y: 540 },
            radius: 200
        };
        const scaledArc = CenterUtils.scaleFieldValue(arcPath, oldResolution, newResolution);
        
        // Center should scale proportionally
        if (scaledArc.center.x !== 512 || scaledArc.center.y !== 384) {
            throw new Error(`Expected scaled arc center (512, 384), got (${scaledArc.center.x}, ${scaledArc.center.y})`);
        }
        
        // Radius should use average scale factor
        const scaleX = 1024 / 1920; // ~0.533
        const scaleY = 768 / 1080;  // ~0.711
        const avgScale = (scaleX + scaleY) / 2; // ~0.622
        const expectedRadius = Math.round(200 * avgScale); // ~124
        
        if (scaledArc.radius !== expectedRadius) {
            throw new Error(`Expected scaled radius ${expectedRadius}, got ${scaledArc.radius}`);
        }
        
        console.log('✅ testProportionalScalingWithAspectRatio - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testProportionalScalingWithAspectRatio - FAILED:', error.message);
        return false;
    } finally {
        await cleanupCenterUtilsTest(testEnv);
    }
}

/**
 * Test: Field value processing for all position types
 * Tests processing of different position types through the main entry point
 */
async function testFieldValueProcessingAllTypes() {
    const { testEnv } = await setupCenterUtilsTest();
    
    try {
        const resolutionInfo = { resolution: 1920, isHorizontal: true };
        
        // Test Position object processing
        const positionField = { name: 'position', x: 960, y: 540 }; // Center position
        const processedPosition = CenterUtils.processFieldValue('center', positionField, resolutionInfo);
        
        // Should detect as center and apply center override
        if (processedPosition.x !== 960 || processedPosition.y !== 540) {
            throw new Error(`Position processing failed: (${processedPosition.x}, ${processedPosition.y})`);
        }
        
        if (!processedPosition.__centerOverrideApplied) {
            throw new Error('Center override metadata not applied to position');
        }
        
        // Test legacy point2d processing
        const legacyPoint = { x: 960, y: 540 }; // Center, no name property
        const processedLegacy = CenterUtils.processFieldValue('center', legacyPoint, resolutionInfo);
        
        if (processedLegacy.x !== 960 || processedLegacy.y !== 540) {
            throw new Error(`Legacy point processing failed: (${processedLegacy.x}, ${processedLegacy.y})`);
        }
        
        if (!processedLegacy.__centerOverrideApplied) {
            throw new Error('Center override metadata not applied to legacy point');
        }
        
        // Test ArcPath processing
        const arcPath = {
            name: 'arc-path',
            center: { x: 960, y: 540 },
            radius: 100
        };
        const processedArc = CenterUtils.processFieldValue('centerArc', arcPath, resolutionInfo);
        
        if (processedArc.center.x !== 960 || processedArc.center.y !== 540) {
            throw new Error(`Arc path processing failed: (${processedArc.center.x}, ${processedArc.center.y})`);
        }
        
        if (!processedArc.__centerOverrideApplied) {
            throw new Error('Center override metadata not applied to arc path');
        }
        
        // Test non-center field (should return unchanged)
        const nonCenterField = { name: 'position', x: 100, y: 200 }; // Not center
        const processedNonCenter = CenterUtils.processFieldValue('randomField', nonCenterField, resolutionInfo);
        
        // Should return original value unchanged
        if (processedNonCenter.x !== 100 || processedNonCenter.y !== 200) {
            throw new Error('Non-center field was modified');
        }
        
        if (processedNonCenter.__centerOverrideApplied) {
            throw new Error('Center override incorrectly applied to non-center field');
        }
        
        console.log('✅ testFieldValueProcessingAllTypes - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testFieldValueProcessingAllTypes - FAILED:', error.message);
        return false;
    } finally {
        await cleanupCenterUtilsTest(testEnv);
    }
}

/**
 * Test: Arc path center scaling
 * Tests specific arc path center scaling behavior
 */
async function testArcPathCenterScaling() {
    const { testEnv } = await setupCenterUtilsTest();
    
    try {
        // Test arc path with center at different positions
        const arcAtCenter = {
            name: 'arc-path',
            center: { x: 960, y: 540 }, // Center of 1920x1080
            radius: 150,
            startAngle: 0,
            endAngle: 360
        };
        
        const oldRes = { resolution: 1920, isHorizontal: true }; // 1920x1080
        const newRes = { resolution: 1280, isHorizontal: true }; // 1280x720
        
        const scaledArc = CenterUtils.scaleFieldValue(arcAtCenter, oldRes, newRes);
        
        // Expected center scaling: x = 960 * (1280/1920) = 640, y = 540 * (720/1080) = 360
        if (scaledArc.center.x !== 640 || scaledArc.center.y !== 360) {
            throw new Error(`Expected scaled arc center (640, 360), got (${scaledArc.center.x}, ${scaledArc.center.y})`);
        }
        
        // Test radius scaling with average scale factor
        const scaleX = 1280 / 1920; // 0.667
        const scaleY = 720 / 1080;  // 0.667
        const avgScale = (scaleX + scaleY) / 2; // 0.667
        const expectedRadius = Math.round(150 * avgScale); // 100
        
        if (scaledArc.radius !== expectedRadius) {
            throw new Error(`Expected scaled radius ${expectedRadius}, got ${scaledArc.radius}`);
        }
        
        // Test radius clamping (max radius = min(width, height) / 2)
        const largeRadiusArc = {
            name: 'arc-path',
            center: { x: 640, y: 360 },
            radius: 1000 // Very large radius
        };
        
        const scaledLargeArc = CenterUtils.scaleFieldValue(largeRadiusArc, oldRes, newRes);
        const maxRadius = Math.min(1280, 720) / 2; // 360
        
        if (scaledLargeArc.radius > maxRadius) {
            throw new Error(`Radius not properly clamped: ${scaledLargeArc.radius} > ${maxRadius}`);
        }
        
        // Test minimum radius clamping (should be at least 10)
        const tinyRadiusArc = {
            name: 'arc-path',
            center: { x: 960, y: 540 },
            radius: 1 // Very small radius
        };
        
        const scaledTinyArc = CenterUtils.scaleFieldValue(tinyRadiusArc, oldRes, newRes);
        
        if (scaledTinyArc.radius < 10) {
            throw new Error(`Radius not properly clamped to minimum: ${scaledTinyArc.radius} < 10`);
        }
        
        console.log('✅ testArcPathCenterScaling - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testArcPathCenterScaling - FAILED:', error.message);
        return false;
    } finally {
        await cleanupCenterUtilsTest(testEnv);
    }
}

/**
 * Test: Resolution dimensions parsing (all formats)
 * Tests parsing of various resolution format inputs
 */
async function testResolutionDimensionsParsing() {
    const { testEnv } = await setupCenterUtilsTest();
    
    try {
        // Test direct dimensions object
        const directDimensions = CenterUtils.getResolutionDimensions({ width: 1920, height: 1080 });
        if (directDimensions.width !== 1920 || directDimensions.height !== 1080) {
            throw new Error(`Direct dimensions parsing failed: ${directDimensions.width}x${directDimensions.height}`);
        }
        
        // Test resolution object with resolution property
        const resolutionObject = CenterUtils.getResolutionDimensions({ resolution: 1920, isHorizontal: true });
        if (resolutionObject.width !== 1920 || resolutionObject.height !== 1080) {
            throw new Error(`Resolution object parsing failed: ${resolutionObject.width}x${resolutionObject.height}`);
        }
        
        // Test string resolution
        const stringResolution = CenterUtils.getResolutionDimensions({ resolution: 'hd', isHorizontal: true });
        if (stringResolution.width !== 1920 || stringResolution.height !== 1080) {
            throw new Error(`String resolution parsing failed: ${stringResolution.width}x${stringResolution.height}`);
        }
        
        // Test numeric resolution directly
        const numericResolution = CenterUtils.getResolutionDimensions(1280);
        if (numericResolution.width !== 1280 || numericResolution.height !== 720) {
            throw new Error(`Numeric resolution parsing failed: ${numericResolution.width}x${numericResolution.height}`);
        }
        
        // Test orientation handling
        const verticalResolution = CenterUtils.getResolutionDimensions({ resolution: 1920, isHorizontal: false });
        if (verticalResolution.width !== 1080 || verticalResolution.height !== 1920) {
            throw new Error(`Vertical orientation parsing failed: ${verticalResolution.width}x${verticalResolution.height}`);
        }
        
        // Test fallback for invalid input
        const fallbackResolution = CenterUtils.getResolutionDimensions(null);
        if (fallbackResolution.width !== 1920 || fallbackResolution.height !== 1080) {
            throw new Error(`Fallback resolution parsing failed: ${fallbackResolution.width}x${fallbackResolution.height}`);
        }
        
        console.log('✅ testResolutionDimensionsParsing - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testResolutionDimensionsParsing - FAILED:', error.message);
        return false;
    } finally {
        await cleanupCenterUtilsTest(testEnv);
    }
}

/**
 * Test: Should apply center logic decision tree
 * Tests the decision logic for when center should be applied
 */
async function testShouldApplyCenterDecisionTree() {
    const { testEnv } = await setupCenterUtilsTest();
    
    try {
        const resolutionInfo = { width: 1920, height: 1080 };
        
        // Test field name detection
        const centerFieldByName = CenterUtils.shouldApplyCenter('center', null, resolutionInfo);
        if (!centerFieldByName) {
            throw new Error('Field named "center" not detected as center field');
        }
        
        const centerFieldByNameVariant = CenterUtils.shouldApplyCenter('centerPosition', null, resolutionInfo);
        if (!centerFieldByNameVariant) {
            throw new Error('Field containing "center" not detected as center field');
        }
        
        // Test value-based detection (center position)
        const centerPositionValue = { name: 'position', x: 960, y: 540 }; // Center of 1920x1080
        const centerByValue = CenterUtils.shouldApplyCenter('someField', centerPositionValue, resolutionInfo);
        if (!centerByValue) {
            throw new Error('Center position value not detected as center field');
        }
        
        // Test non-center position
        const nonCenterValue = { name: 'position', x: 100, y: 200 }; // Not center
        const nonCenterByValue = CenterUtils.shouldApplyCenter('someField', nonCenterValue, resolutionInfo);
        if (nonCenterByValue) {
            throw new Error('Non-center position incorrectly detected as center field');
        }
        
        // Test legacy point2d center detection
        const legacyCenterPoint = { x: 960, y: 540 }; // Center, no name
        const legacyCenterDetected = CenterUtils.shouldApplyCenter('position', legacyCenterPoint, resolutionInfo);
        if (!legacyCenterDetected) {
            throw new Error('Legacy center point not detected as center field');
        }
        
        // Test arc path center detection
        const arcPathCenter = {
            name: 'arc-path',
            center: { x: 960, y: 540 },
            radius: 100
        };
        const arcCenterDetected = CenterUtils.shouldApplyCenter('arcField', arcPathCenter, resolutionInfo);
        if (!arcCenterDetected) {
            throw new Error('Arc path with center not detected as center field');
        }
        
        // Test non-position values
        const stringValue = 'not a position';
        const stringNotCenter = CenterUtils.shouldApplyCenter('center', stringValue, resolutionInfo);
        if (stringNotCenter) {
            throw new Error('String value incorrectly detected as center field');
        }
        
        const numberValue = 42;
        const numberNotCenter = CenterUtils.shouldApplyCenter('center', numberValue, resolutionInfo);
        if (numberNotCenter) {
            throw new Error('Number value incorrectly detected as center field');
        }
        
        console.log('✅ testShouldApplyCenterDecisionTree - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testShouldApplyCenterDecisionTree - FAILED:', error.message);
        return false;
    } finally {
        await cleanupCenterUtilsTest(testEnv);
    }
}

/**
 * Test: Edge cases (square resolutions, ultra-wide, portrait)
 * Tests center detection and scaling for unusual aspect ratios
 */
async function testEdgeCasesSquareUltrawidePortrait() {
    const { testEnv } = await setupCenterUtilsTest();
    
    try {
        // Test square resolution (1:1 aspect ratio)
        const squareCenter = CenterUtils.getCenterPosition(1080, 1080);
        if (squareCenter.x !== 540 || squareCenter.y !== 540) {
            throw new Error(`Square center calculation failed: (${squareCenter.x}, ${squareCenter.y})`);
        }
        
        const isSquareCenter = CenterUtils.isCenterPosition(540, 540, { width: 1080, height: 1080 });
        if (!isSquareCenter) {
            throw new Error('Square center not detected');
        }
        
        // Test ultra-wide resolution (21:9 aspect ratio)
        const ultrawideWidth = 3440;
        const ultrawideHeight = 1440;
        const ultrawideCenter = CenterUtils.getCenterPosition(ultrawideWidth, ultrawideHeight);
        if (ultrawideCenter.x !== 1720 || ultrawideCenter.y !== 720) {
            throw new Error(`Ultra-wide center calculation failed: (${ultrawideCenter.x}, ${ultrawideCenter.y})`);
        }
        
        const isUltrawideCenter = CenterUtils.isCenterPosition(1720, 720, { width: ultrawideWidth, height: ultrawideHeight });
        if (!isUltrawideCenter) {
            throw new Error('Ultra-wide center not detected');
        }
        
        // Test portrait resolution (9:16 aspect ratio)
        const portraitWidth = 1080;
        const portraitHeight = 1920;
        const portraitCenter = CenterUtils.getCenterPosition(portraitWidth, portraitHeight);
        if (portraitCenter.x !== 540 || portraitCenter.y !== 960) {
            throw new Error(`Portrait center calculation failed: (${portraitCenter.x}, ${portraitCenter.y})`);
        }
        
        const isPortraitCenter = CenterUtils.isCenterPosition(540, 960, { width: portraitWidth, height: portraitHeight });
        if (!isPortraitCenter) {
            throw new Error('Portrait center not detected');
        }
        
        // Test scaling between different aspect ratios
        const squareToUltrawide = CenterUtils.scaleFieldValue(
            { name: 'position', x: 540, y: 540 }, // Square center
            { width: 1080, height: 1080 },       // Square resolution
            { width: 3440, height: 1440 }        // Ultra-wide resolution
        );
        
        // Expected: x = 540 * (3440/1080) = 1720, y = 540 * (1440/1080) = 720
        if (squareToUltrawide.x !== 1720 || squareToUltrawide.y !== 720) {
            throw new Error(`Square to ultra-wide scaling failed: (${squareToUltrawide.x}, ${squareToUltrawide.y})`);
        }
        
        // Test extreme aspect ratio (very wide)
        const extremeWideCenter = CenterUtils.getCenterPosition(5120, 1080);
        if (extremeWideCenter.x !== 2560 || extremeWideCenter.y !== 540) {
            throw new Error(`Extreme wide center calculation failed: (${extremeWideCenter.x}, ${extremeWideCenter.y})`);
        }
        
        console.log('✅ testEdgeCasesSquareUltrawidePortrait - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testEdgeCasesSquareUltrawidePortrait - FAILED:', error.message);
        return false;
    } finally {
        await cleanupCenterUtilsTest(testEnv);
    }
}

/**
 * Test: Config object processing
 * Tests processing of entire configuration objects with nested centers
 */
async function testConfigObjectProcessing() {
    const { testEnv } = await setupCenterUtilsTest();
    
    try {
        const resolutionInfo = { resolution: 1920, isHorizontal: true };
        
        // Test complex config with nested center fields
        const complexConfig = {
            center: { name: 'position', x: 960, y: 540 }, // Should be detected as center
            nonCenter: { name: 'position', x: 100, y: 200 }, // Should not be modified
            nested: {
                centerPosition: { x: 960, y: 540 }, // Legacy format, should be detected
                regularField: 'some value'
            },
            arcCenter: {
                name: 'arc-path',
                center: { x: 960, y: 540 },
                radius: 100
            }
        };
        
        const processedConfig = CenterUtils.detectAndApplyCenter(complexConfig, resolutionInfo);
        
        // Check that center field was processed
        if (!processedConfig.center.__centerOverrideApplied) {
            throw new Error('Center field not processed');
        }
        
        // Check that non-center field was not modified
        if (processedConfig.nonCenter.__centerOverrideApplied) {
            throw new Error('Non-center field incorrectly processed');
        }
        
        // Check nested center processing
        if (!processedConfig.nested.centerPosition.__centerOverrideApplied) {
            throw new Error('Nested center field not processed');
        }
        
        // Check arc path center processing
        if (!processedConfig.arcCenter.__centerOverrideApplied) {
            throw new Error('Arc path center not processed');
        }
        
        // Check that regular fields are preserved
        if (processedConfig.nested.regularField !== 'some value') {
            throw new Error('Regular field not preserved');
        }
        
        console.log('✅ testConfigObjectProcessing - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testConfigObjectProcessing - FAILED:', error.message);
        return false;
    } finally {
        await cleanupCenterUtilsTest(testEnv);
    }
}

// Export all test functions for the test runner
export {
    testCenterDetectionAcrossResolutions,
    testCenterDetectionWithTolerance,
    testProportionalScalingWithAspectRatio,
    testFieldValueProcessingAllTypes,
    testArcPathCenterScaling,
    testResolutionDimensionsParsing,
    testShouldApplyCenterDecisionTree,
    testEdgeCasesSquareUltrawidePortrait,
    testConfigObjectProcessing
};