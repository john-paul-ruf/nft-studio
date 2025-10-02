/**
 * Test: Orientation Scaling
 * Verifies that positions are automatically scaled when orientation changes
 */

import ProjectState from '../../src/models/ProjectState.js';

// Test: Orientation Scaling - Horizontal to Vertical
export function test_orientation_scaling_horizontal_to_vertical() {
    const projectState = new ProjectState();
    projectState.setTargetResolution(1920); // 1920x1080 horizontal
    projectState.setIsHorizontal(true);

    // Add an effect with a position
    const effect = {
        id: 'test-effect-1',
        name: 'TestEffect',
        registryKey: 'test-effect',
        className: 'TestEffect',
        config: {
            position: {
                name: 'position',
                x: 960,  // Center of 1920x1080 horizontal
                y: 540
            }
        },
        attachedEffects: {
            secondary: [],
            keyFrame: []
        }
    };

    projectState.addEffect(effect);

    // Verify initial dimensions
    const initialDims = projectState.getResolutionDimensions();
    if (initialDims.w !== 1920) throw new Error(`Expected width 1920, got ${initialDims.w}`);
    if (initialDims.h !== 1080) throw new Error(`Expected height 1080, got ${initialDims.h}`);

    // Verify initial position
    const initialEffects = projectState.getEffects();
    if (initialEffects[0].config.position.x !== 960) {
        throw new Error(`Expected initial x=960, got ${initialEffects[0].config.position.x}`);
    }
    if (initialEffects[0].config.position.y !== 540) {
        throw new Error(`Expected initial y=540, got ${initialEffects[0].config.position.y}`);
    }

    // Switch to vertical orientation
    projectState.setIsHorizontal(false);

    // Verify dimensions changed (swapped)
    const newDims = projectState.getResolutionDimensions();
    if (newDims.w !== 1080) throw new Error(`Expected width 1080 after swap, got ${newDims.w}`);
    if (newDims.h !== 1920) throw new Error(`Expected height 1920 after swap, got ${newDims.h}`);

    // Verify position was scaled
    const scaledEffects = projectState.getEffects();
    const scaledPosition = scaledEffects[0].config.position;

    // Calculate expected scaled position
    // Old: 1920x1080, New: 1080x1920
    // Scale factors: x = 1080/1920 = 0.5625, y = 1920/1080 = 1.7778
    const expectedX = Math.round(960 * (1080 / 1920)); // 540
    const expectedY = Math.round(540 * (1920 / 1080)); // 960

    if (scaledPosition.x !== expectedX) {
        throw new Error(`Expected scaled x=${expectedX}, got ${scaledPosition.x}`);
    }
    if (scaledPosition.y !== expectedY) {
        throw new Error(`Expected scaled y=${expectedY}, got ${scaledPosition.y}`);
    }
    if (scaledPosition.__autoScaled !== true) {
        throw new Error('Expected __autoScaled flag to be true');
    }

    console.log('✅ Horizontal to vertical scaling works correctly');
}

// Test: Orientation Scaling - Vertical to Horizontal
export function test_orientation_scaling_vertical_to_horizontal() {
    const projectState = new ProjectState();
    projectState.setTargetResolution(1920);
    projectState.setIsHorizontal(false); // Start vertical

    // Add an effect with a position
    const effect = {
        id: 'test-effect-2',
        name: 'TestEffect',
        registryKey: 'test-effect',
        className: 'TestEffect',
        config: {
            position: {
                name: 'position',
                x: 540,  // Center of 1080x1920 vertical
                y: 960
            }
        },
        attachedEffects: {
            secondary: [],
            keyFrame: []
        }
    };

    projectState.addEffect(effect);

    // Verify initial dimensions (vertical)
    const initialDims = projectState.getResolutionDimensions();
    if (initialDims.w !== 1080) throw new Error(`Expected width 1080, got ${initialDims.w}`);
    if (initialDims.h !== 1920) throw new Error(`Expected height 1920, got ${initialDims.h}`);

    // Switch to horizontal orientation
    projectState.setIsHorizontal(true);

    // Verify dimensions changed (swapped back)
    const newDims = projectState.getResolutionDimensions();
    if (newDims.w !== 1920) throw new Error(`Expected width 1920 after swap, got ${newDims.w}`);
    if (newDims.h !== 1080) throw new Error(`Expected height 1080 after swap, got ${newDims.h}`);

    // Verify position was scaled
    const scaledEffects = projectState.getEffects();
    const scaledPosition = scaledEffects[0].config.position;

    // Calculate expected scaled position
    // Old: 1080x1920, New: 1920x1080
    // Scale factors: x = 1920/1080 = 1.7778, y = 1080/1920 = 0.5625
    const expectedX = Math.round(540 * (1920 / 1080)); // 960
    const expectedY = Math.round(960 * (1080 / 1920)); // 540

    if (scaledPosition.x !== expectedX) {
        throw new Error(`Expected scaled x=${expectedX}, got ${scaledPosition.x}`);
    }
    if (scaledPosition.y !== expectedY) {
        throw new Error(`Expected scaled y=${expectedY}, got ${scaledPosition.y}`);
    }
    if (scaledPosition.__autoScaled !== true) {
        throw new Error('Expected __autoScaled flag to be true');
    }

    console.log('✅ Vertical to horizontal scaling works correctly');
}

// Test: Nested Positions in Secondary Effects
export function test_orientation_scaling_nested_positions() {
    const projectState = new ProjectState();
    projectState.setTargetResolution(1920);
    projectState.setIsHorizontal(true);

    // Add an effect with secondary effects
    const effect = {
        id: 'test-effect-3',
        name: 'TestEffect',
        registryKey: 'test-effect',
        className: 'TestEffect',
        config: {
            position: {
                name: 'position',
                x: 960,
                y: 540
            }
        },
        attachedEffects: {
            secondary: [
                {
                    id: 'secondary-1',
                    name: 'SecondaryEffect',
                    registryKey: 'secondary-effect',
                    config: {
                        position: {
                            name: 'position',
                            x: 480,
                            y: 270
                        }
                    }
                }
            ],
            keyFrame: []
        }
    };

    projectState.addEffect(effect);

    // Switch orientation
    projectState.setIsHorizontal(false);

    // Verify both primary and secondary positions were scaled
    const scaledEffects = projectState.getEffects();
    const primaryPosition = scaledEffects[0].config.position;
    const secondaryPosition = scaledEffects[0].attachedEffects.secondary[0].config.position;

    // Primary position should be scaled
    const expectedPrimaryX = Math.round(960 * (1080 / 1920));
    const expectedPrimaryY = Math.round(540 * (1920 / 1080));
    if (primaryPosition.x !== expectedPrimaryX) {
        throw new Error(`Expected primary x=${expectedPrimaryX}, got ${primaryPosition.x}`);
    }
    if (primaryPosition.y !== expectedPrimaryY) {
        throw new Error(`Expected primary y=${expectedPrimaryY}, got ${primaryPosition.y}`);
    }

    // Secondary position should also be scaled
    const expectedSecondaryX = Math.round(480 * (1080 / 1920));
    const expectedSecondaryY = Math.round(270 * (1920 / 1080));
    if (secondaryPosition.x !== expectedSecondaryX) {
        throw new Error(`Expected secondary x=${expectedSecondaryX}, got ${secondaryPosition.x}`);
    }
    if (secondaryPosition.y !== expectedSecondaryY) {
        throw new Error(`Expected secondary y=${expectedSecondaryY}, got ${secondaryPosition.y}`);
    }

    console.log('✅ Nested positions in secondary effects scaled correctly');
}

// Test: Square Resolutions (No Scaling Needed)
export function test_orientation_scaling_square_resolution() {
    const projectState = new ProjectState();
    projectState.setTargetResolution(1080); // Square 1080x1080
    projectState.setIsHorizontal(true);

    const effect = {
        id: 'test-effect-4',
        name: 'TestEffect',
        registryKey: 'test-effect',
        className: 'TestEffect',
        config: {
            position: {
                name: 'position',
                x: 540,
                y: 540
            }
        },
        attachedEffects: {
            secondary: [],
            keyFrame: []
        }
    };

    projectState.addEffect(effect);

    // Switch orientation (should not change dimensions for square)
    projectState.setIsHorizontal(false);

    // Verify dimensions didn't change
    const dims = projectState.getResolutionDimensions();
    if (dims.w !== 1080) throw new Error(`Expected width 1080, got ${dims.w}`);
    if (dims.h !== 1080) throw new Error(`Expected height 1080, got ${dims.h}`);

    // Verify position didn't change (no scaling needed)
    const effects = projectState.getEffects();
    if (effects[0].config.position.x !== 540) {
        throw new Error(`Expected x=540 (unchanged), got ${effects[0].config.position.x}`);
    }
    if (effects[0].config.position.y !== 540) {
        throw new Error(`Expected y=540 (unchanged), got ${effects[0].config.position.y}`);
    }

    console.log('✅ Square resolution correctly skips scaling');
}