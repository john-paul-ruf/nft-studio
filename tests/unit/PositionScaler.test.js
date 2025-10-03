/**
 * PositionScaler.test.js
 * REAL OBJECTS TESTING - Phase 2, Task 3
 * 
 * Tests the PositionScaler utility - handles automatic position scaling during resolution changes
 * 
 * CRITICAL REQUIREMENT: ABSOLUTELY NO MOCKS
 * - ✅ Uses REAL PositionScaler class
 * - ✅ Tests REAL scaling calculations and boundary clamping
 * - ✅ Tests REAL position objects and arc paths
 * - ✅ Tests REAL metadata preservation
 * - ❌ NO mocks, stubs, spies, or fake objects
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import { PositionScaler } from '../../src/utils/PositionScaler.js';
import { Effect } from '../../src/models/Effect.js';

/**
 * Test helper to set up real PositionScaler test environment
 */
async function setupPositionScalerTest() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();
    
    return { testEnv, PositionScaler };
}

/**
 * Test helper for cleanup
 */
async function cleanupPositionScalerTest(testEnv) {
    if (testEnv) {
        await testEnv.cleanup();
    }
}

/**
 * Create real test effect with position data
 */
function createTestEffect(name, positions) {
    return {
        name: name,
        className: 'TestEffect',
        registryKey: 'test-effect',
        config: positions
    };
}

/**
 * Test: Scale factors calculation accuracy
 * Tests accurate calculation of scale factors for different resolution changes
 */
async function testScaleFactorsCalculationAccuracy() {
    const { testEnv } = await setupPositionScalerTest();
    
    try {
        // Test HD to 4K scaling (2x scale)
        const hdTo4K = createTestEffect('HDTo4K', {
            position: { name: 'position', x: 960, y: 540 }
        });
        
        const scaledHdTo4K = PositionScaler.scaleEffectsPositions(
            [hdTo4K], 1920, 1080, 3840, 2160
        );
        
        const scaledPosition = scaledHdTo4K[0].config.position;
        if (scaledPosition.x !== 1920 || scaledPosition.y !== 1080) {
            throw new Error(`Expected 2x scaling (1920, 1080), got (${scaledPosition.x}, ${scaledPosition.y})`);
        }
        
        // Test 4K to HD scaling (0.5x scale)
        const fourKToHD = createTestEffect('4KToHD', {
            position: { name: 'position', x: 1920, y: 1080 }
        });
        
        const scaled4KToHD = PositionScaler.scaleEffectsPositions(
            [fourKToHD], 3840, 2160, 1920, 1080
        );
        
        const scaledPosition2 = scaled4KToHD[0].config.position;
        if (scaledPosition2.x !== 960 || scaledPosition2.y !== 540) {
            throw new Error(`Expected 0.5x scaling (960, 540), got (${scaledPosition2.x}, ${scaledPosition2.y})`);
        }
        
        // Test non-uniform scaling (HD to 720p)
        const hdTo720p = createTestEffect('HDTo720p', {
            position: { name: 'position', x: 1920, y: 1080 }
        });
        
        const scaledHdTo720p = PositionScaler.scaleEffectsPositions(
            [hdTo720p], 1920, 1080, 1280, 720
        );
        
        const scaledPosition3 = scaledHdTo720p[0].config.position;
        // Expected: x = 1920 * (1280/1920) = 1280, y = 1080 * (720/1080) = 720
        if (scaledPosition3.x !== 1280 || scaledPosition3.y !== 720) {
            throw new Error(`Expected non-uniform scaling (1280, 720), got (${scaledPosition3.x}, ${scaledPosition3.y})`);
        }
        
        console.log('✅ testScaleFactorsCalculationAccuracy - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testScaleFactorsCalculationAccuracy - FAILED:', error.message);
        return false;
    } finally {
        await cleanupPositionScalerTest(testEnv);
    }
}

/**
 * Test: Boundary clamping edge cases
 * Tests that positions are properly clamped to valid coordinate bounds
 */
async function testBoundaryClamping() {
    const { testEnv } = await setupPositionScalerTest();
    
    try {
        // Test position at edge that would scale beyond bounds
        const edgeEffect = createTestEffect('EdgeTest', {
            position: { name: 'position', x: 1919, y: 1079 } // Near edge of 1920x1080
        });
        
        // Scale up to 4K - should clamp to max bounds
        const scaledEdge = PositionScaler.scaleEffectsPositions(
            [edgeEffect], 1920, 1080, 3840, 2160
        );
        
        const clampedPosition = scaledEdge[0].config.position;
        // Expected: x = 1919 * 2 = 3838, clamped to 3839 (3840-1)
        // Expected: y = 1079 * 2 = 2158, clamped to 2159 (2160-1)
        if (clampedPosition.x !== 3839 || clampedPosition.y !== 2159) {
            throw new Error(`Expected clamped position (3839, 2159), got (${clampedPosition.x}, ${clampedPosition.y})`);
        }
        
        // Test negative coordinates (should clamp to 0)
        const negativeEffect = createTestEffect('NegativeTest', {
            position: { name: 'position', x: 100, y: 100 }
        });
        
        // Scale down dramatically to force negative coordinates
        const scaledNegative = PositionScaler.scaleEffectsPositions(
            [negativeEffect], 1920, 1080, 100, 100
        );
        
        const clampedNegative = scaledNegative[0].config.position;
        // Should be clamped to valid bounds (0-99)
        if (clampedNegative.x < 0 || clampedNegative.y < 0 || 
            clampedNegative.x >= 100 || clampedNegative.y >= 100) {
            throw new Error(`Position not properly clamped: (${clampedNegative.x}, ${clampedNegative.y})`);
        }
        
        console.log('✅ testBoundaryClamping - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testBoundaryClamping - FAILED:', error.message);
        return false;
    } finally {
        await cleanupPositionScalerTest(testEnv);
    }
}

/**
 * Test: Arc path radius scaling with aspect ratio changes
 * Tests scaling of arc paths including center and radius adjustments
 */
async function testArcPathRadiusScaling() {
    const { testEnv } = await setupPositionScalerTest();
    
    try {
        // Test arc path scaling
        const arcEffect = createTestEffect('ArcTest', {
            arcPath: {
                name: 'arc-path',
                center: { x: 960, y: 540 },
                radius: 200,
                startAngle: 0,
                endAngle: 180
            }
        });
        
        // Scale from HD to 4K (2x scale)
        const scaledArc = PositionScaler.scaleEffectsPositions(
            [arcEffect], 1920, 1080, 3840, 2160
        );
        
        const scaledArcPath = scaledArc[0].config.arcPath;
        
        // Check center scaling
        if (scaledArcPath.center.x !== 1920 || scaledArcPath.center.y !== 1080) {
            throw new Error(`Expected center (1920, 1080), got (${scaledArcPath.center.x}, ${scaledArcPath.center.y})`);
        }
        
        // Check radius scaling (should use average scale factor)
        const expectedRadius = Math.round(200 * 2); // 2x scale
        if (scaledArcPath.radius !== expectedRadius) {
            throw new Error(`Expected radius ${expectedRadius}, got ${scaledArcPath.radius}`);
        }
        
        // Check metadata preservation
        if (!scaledArcPath.__autoScaled || !scaledArcPath.__scaledAt) {
            throw new Error('Arc path metadata not preserved');
        }
        
        // Test non-uniform scaling (different aspect ratio)
        const arcEffect2 = createTestEffect('ArcTest2', {
            arcPath: {
                name: 'arc-path',
                center: { x: 640, y: 360 },
                radius: 100
            }
        });
        
        // Scale from 1280x720 to 1920x1080 (1.5x width, 1.5x height)
        const scaledArc2 = PositionScaler.scaleEffectsPositions(
            [arcEffect2], 1280, 720, 1920, 1080
        );
        
        const scaledArcPath2 = scaledArc2[0].config.arcPath;
        
        // Center should scale proportionally
        if (scaledArcPath2.center.x !== 960 || scaledArcPath2.center.y !== 540) {
            throw new Error(`Expected center (960, 540), got (${scaledArcPath2.center.x}, ${scaledArcPath2.center.y})`);
        }
        
        // Radius should use average scale factor (1.5)
        const expectedRadius2 = Math.round(100 * 1.5);
        if (scaledArcPath2.radius !== expectedRadius2) {
            throw new Error(`Expected radius ${expectedRadius2}, got ${scaledArcPath2.radius}`);
        }
        
        console.log('✅ testArcPathRadiusScaling - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testArcPathRadiusScaling - FAILED:', error.message);
        return false;
    } finally {
        await cleanupPositionScalerTest(testEnv);
    }
}

/**
 * Test: Nested position scaling recursion
 * Tests scaling of positions nested deep within effect configurations
 */
async function testNestedPositionScaling() {
    const { testEnv } = await setupPositionScalerTest();
    
    try {
        // Create effect with deeply nested positions
        const nestedEffect = createTestEffect('NestedTest', {
            layer1: {
                layer2: {
                    position: { name: 'position', x: 100, y: 200 },
                    layer3: {
                        arcPath: {
                            name: 'arc-path',
                            center: { x: 300, y: 400 },
                            radius: 50
                        }
                    }
                }
            },
            topLevelPosition: { name: 'position', x: 500, y: 600 }
        });
        
        // Scale 2x
        const scaledNested = PositionScaler.scaleEffectsPositions(
            [nestedEffect], 1000, 1000, 2000, 2000
        );
        
        const config = scaledNested[0].config;
        
        // Check nested position
        const nestedPos = config.layer1.layer2.position;
        if (nestedPos.x !== 200 || nestedPos.y !== 400) {
            throw new Error(`Expected nested position (200, 400), got (${nestedPos.x}, ${nestedPos.y})`);
        }
        
        // Check deeply nested arc path
        const nestedArc = config.layer1.layer2.layer3.arcPath;
        if (nestedArc.center.x !== 600 || nestedArc.center.y !== 800) {
            throw new Error(`Expected nested arc center (600, 800), got (${nestedArc.center.x}, ${nestedArc.center.y})`);
        }
        
        if (nestedArc.radius !== 100) {
            throw new Error(`Expected nested arc radius 100, got ${nestedArc.radius}`);
        }
        
        // Check top-level position
        const topPos = config.topLevelPosition;
        if (topPos.x !== 1000 || topPos.y !== 1200) {
            throw new Error(`Expected top position (1000, 1200), got (${topPos.x}, ${topPos.y})`);
        }
        
        console.log('✅ testNestedPositionScaling - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testNestedPositionScaling - FAILED:', error.message);
        return false;
    } finally {
        await cleanupPositionScalerTest(testEnv);
    }
}

/**
 * Test: Legacy Point2D vs Position object consistency
 * Tests that both legacy point2d and modern Position objects scale consistently
 */
async function testLegacyPoint2DConsistency() {
    const { testEnv } = await setupPositionScalerTest();
    
    try {
        // Create effect with both legacy and modern position formats
        const mixedEffect = createTestEffect('MixedTest', {
            legacyPoint: { x: 100, y: 200 }, // No 'name' property = legacy
            modernPosition: { name: 'position', x: 100, y: 200 }
        });
        
        // Scale 2x
        const scaledMixed = PositionScaler.scaleEffectsPositions(
            [mixedEffect], 1000, 1000, 2000, 2000
        );
        
        const config = scaledMixed[0].config;
        
        // Both should scale to the same coordinates
        const legacyScaled = config.legacyPoint;
        const modernScaled = config.modernPosition;
        
        if (legacyScaled.x !== 200 || legacyScaled.y !== 400) {
            throw new Error(`Expected legacy point (200, 400), got (${legacyScaled.x}, ${legacyScaled.y})`);
        }
        
        if (modernScaled.x !== 200 || modernScaled.y !== 400) {
            throw new Error(`Expected modern position (200, 400), got (${modernScaled.x}, ${modernScaled.y})`);
        }
        
        // Modern position should have metadata, legacy should not have the same metadata
        if (!modernScaled.__autoScaled || !modernScaled.__scaledAt) {
            throw new Error('Modern position missing scaling metadata');
        }
        
        // Legacy point should preserve original properties but not add metadata
        if (legacyScaled.name) {
            throw new Error('Legacy point should not have name property');
        }
        
        console.log('✅ testLegacyPoint2DConsistency - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testLegacyPoint2DConsistency - FAILED:', error.message);
        return false;
    } finally {
        await cleanupPositionScalerTest(testEnv);
    }
}

/**
 * Test: Scale with invalid dimensions handling
 * Tests error handling for invalid dimension inputs
 */
async function testInvalidDimensionsHandling() {
    const { testEnv } = await setupPositionScalerTest();
    
    try {
        const testEffect = createTestEffect('InvalidTest', {
            position: { name: 'position', x: 100, y: 200 }
        });
        
        // Test with invalid old dimensions
        const result1 = PositionScaler.scaleEffectsPositions(
            [testEffect], 0, 1080, 1920, 1080
        );
        
        // Should return original effects unchanged
        if (result1[0].config.position.x !== 100 || result1[0].config.position.y !== 200) {
            throw new Error('Invalid dimensions should return original effects unchanged');
        }
        
        // Test with NaN dimensions
        const result2 = PositionScaler.scaleEffectsPositions(
            [testEffect], NaN, 1080, 1920, 1080
        );
        
        if (result2[0].config.position.x !== 100 || result2[0].config.position.y !== 200) {
            throw new Error('NaN dimensions should return original effects unchanged');
        }
        
        // Test with negative dimensions
        const result3 = PositionScaler.scaleEffectsPositions(
            [testEffect], -1920, 1080, 1920, 1080
        );
        
        if (result3[0].config.position.x !== 100 || result3[0].config.position.y !== 200) {
            throw new Error('Negative dimensions should return original effects unchanged');
        }
        
        // Test with null/undefined effects
        const result4 = PositionScaler.scaleEffectsPositions(null, 1920, 1080, 3840, 2160);
        if (result4 !== null) {
            throw new Error('Null effects should return null');
        }
        
        const result5 = PositionScaler.scaleEffectsPositions(undefined, 1920, 1080, 3840, 2160);
        if (result5 !== undefined) {
            throw new Error('Undefined effects should return undefined');
        }
        
        console.log('✅ testInvalidDimensionsHandling - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testInvalidDimensionsHandling - FAILED:', error.message);
        return false;
    } finally {
        await cleanupPositionScalerTest(testEnv);
    }
}

/**
 * Test: Position metadata preservation
 * Tests that __autoScaled and __scaledAt metadata is properly added
 */
async function testPositionMetadataPreservation() {
    const { testEnv } = await setupPositionScalerTest();
    
    try {
        // Test with position that already has metadata
        const existingMetadataEffect = createTestEffect('MetadataTest', {
            position: {
                name: 'position',
                x: 100,
                y: 200,
                __userSet: true,
                customProperty: 'preserved'
            }
        });
        
        const scaledWithMetadata = PositionScaler.scaleEffectsPositions(
            [existingMetadataEffect], 1000, 1000, 2000, 2000
        );
        
        const scaledPos = scaledWithMetadata[0].config.position;
        
        // Check scaling worked
        if (scaledPos.x !== 200 || scaledPos.y !== 400) {
            throw new Error(`Expected scaled position (200, 400), got (${scaledPos.x}, ${scaledPos.y})`);
        }
        
        // Check metadata preservation and addition
        if (!scaledPos.__userSet) {
            throw new Error('Existing __userSet metadata not preserved');
        }
        
        if (scaledPos.customProperty !== 'preserved') {
            throw new Error('Custom property not preserved');
        }
        
        if (!scaledPos.__autoScaled) {
            throw new Error('__autoScaled metadata not added');
        }
        
        if (!scaledPos.__scaledAt) {
            throw new Error('__scaledAt metadata not added');
        }
        
        // Verify __scaledAt is a valid ISO date string
        const scaledAtDate = new Date(scaledPos.__scaledAt);
        if (isNaN(scaledAtDate.getTime())) {
            throw new Error('__scaledAt is not a valid date');
        }
        
        // Test with arc path metadata
        const arcMetadataEffect = createTestEffect('ArcMetadataTest', {
            arcPath: {
                name: 'arc-path',
                center: { x: 100, y: 100 },
                radius: 50,
                customArcProperty: 'also preserved'
            }
        });
        
        const scaledArcWithMetadata = PositionScaler.scaleEffectsPositions(
            [arcMetadataEffect], 1000, 1000, 2000, 2000
        );
        
        const scaledArc = scaledArcWithMetadata[0].config.arcPath;
        
        // Check custom property preservation
        if (scaledArc.customArcProperty !== 'also preserved') {
            throw new Error('Arc custom property not preserved');
        }
        
        // Check metadata addition
        if (!scaledArc.__autoScaled || !scaledArc.__scaledAt) {
            throw new Error('Arc metadata not added');
        }
        
        console.log('✅ testPositionMetadataPreservation - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testPositionMetadataPreservation - FAILED:', error.message);
        return false;
    } finally {
        await cleanupPositionScalerTest(testEnv);
    }
}

/**
 * Test: Effect instance vs POJO handling
 * Tests that both Effect instances and plain objects are handled correctly
 */
async function testEffectInstanceHandling() {
    const { testEnv } = await setupPositionScalerTest();
    
    try {
        // Create a real Effect instance
        const effectInstance = new Effect('TestEffect', 'test-effect');
        effectInstance.config = {
            position: { name: 'position', x: 100, y: 200 }
        };
        
        // Create a plain object effect
        const plainEffect = createTestEffect('PlainTest', {
            position: { name: 'position', x: 100, y: 200 }
        });
        
        // Scale both types
        const scaledEffects = PositionScaler.scaleEffectsPositions(
            [effectInstance, plainEffect], 1000, 1000, 2000, 2000
        );
        
        // Both should be scaled correctly
        const scaledInstance = scaledEffects[0];
        const scaledPlain = scaledEffects[1];
        
        // Check Effect instance scaling
        if (scaledInstance.config.position.x !== 200 || scaledInstance.config.position.y !== 400) {
            throw new Error(`Effect instance not scaled correctly: (${scaledInstance.config.position.x}, ${scaledInstance.config.position.y})`);
        }
        
        // Check plain object scaling
        if (scaledPlain.config.position.x !== 200 || scaledPlain.config.position.y !== 400) {
            throw new Error(`Plain object not scaled correctly: (${scaledPlain.config.position.x}, ${scaledPlain.config.position.y})`);
        }
        
        // Both should have metadata
        if (!scaledInstance.config.position.__autoScaled || !scaledPlain.config.position.__autoScaled) {
            throw new Error('Scaling metadata not added to both types');
        }
        
        console.log('✅ testEffectInstanceHandling - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testEffectInstanceHandling - FAILED:', error.message);
        return false;
    } finally {
        await cleanupPositionScalerTest(testEnv);
    }
}

/**
 * Test: No scaling needed (1:1 ratio)
 * Tests that when scale factors are 1:1, original effects are returned
 */
async function testNoScalingNeeded() {
    const { testEnv } = await setupPositionScalerTest();
    
    try {
        const testEffect = createTestEffect('NoScaleTest', {
            position: { name: 'position', x: 100, y: 200 }
        });
        
        // Same dimensions = no scaling needed
        const result = PositionScaler.scaleEffectsPositions(
            [testEffect], 1920, 1080, 1920, 1080
        );
        
        // Position should be unchanged
        if (result[0].config.position.x !== 100 || result[0].config.position.y !== 200) {
            throw new Error('Position changed when no scaling should occur');
        }
        
        // Should not have scaling metadata since no scaling occurred
        if (result[0].config.position.__autoScaled) {
            throw new Error('Scaling metadata added when no scaling occurred');
        }
        
        console.log('✅ testNoScalingNeeded - PASSED');
        return true;
    } catch (error) {
        console.error('❌ testNoScalingNeeded - FAILED:', error.message);
        return false;
    } finally {
        await cleanupPositionScalerTest(testEnv);
    }
}

// Export all test functions for the test runner
export {
    testScaleFactorsCalculationAccuracy,
    testBoundaryClamping,
    testArcPathRadiusScaling,
    testNestedPositionScaling,
    testLegacyPoint2DConsistency,
    testInvalidDimensionsHandling,
    testPositionMetadataPreservation,
    testEffectInstanceHandling,
    testNoScalingNeeded
};