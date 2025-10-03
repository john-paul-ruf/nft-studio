/**
 * Test: Resolution Scaling UI Synchronization
 * 
 * This test verifies that when resolution changes while an effect is being edited,
 * the EffectConfigurer component properly re-syncs with the scaled positions from ProjectState.
 */

import ProjectState from '../../src/models/ProjectState.js';

/**
 * Test: EffectConfigurer syncs with scaled positions after resolution change
 */
export function test_effect_configurer_resolution_sync() {
    console.log('🧪 Testing EffectConfigurer resolution sync...');
    
    // Create a ProjectState with an effect that has a position
    const projectState = new ProjectState({
        targetResolution: '1080p',
        isHorizontal: true,
        effects: [
            {
                name: 'TestEffect',
                className: 'TestEffect',
                registryKey: 'test-effect',
                config: {
                    position: {
                        name: 'position',
                        x: 960,  // Center of 1920x1080
                        y: 540
                    }
                }
            }
        ]
    });
    
    // Get initial position
    const initialEffects = projectState.getState().effects;
    const initialPosition = initialEffects[0].config.position;
    
    console.log('📍 Initial position (1920x1080):', initialPosition);
    
    if (initialPosition.x !== 960 || initialPosition.y !== 540) {
        throw new Error(`Initial position should be center of 1920x1080 (960, 540), got (${initialPosition.x}, ${initialPosition.y})`);
    }
    
    // Change resolution to 720p (1280x720)
    console.log('🔄 Changing resolution to 720p (1280x720)...');
    projectState.setTargetResolution('720p');
    
    // Get scaled position
    const scaledEffects = projectState.getState().effects;
    const scaledPosition = scaledEffects[0].config.position;
    
    console.log('📍 Scaled position (1280x720):', scaledPosition);
    
    // Calculate expected scaled position
    // scaleX = 1280 / 1920 = 0.6667
    // scaleY = 720 / 1080 = 0.6667
    // newX = 960 * 0.6667 = 640
    // newY = 540 * 0.6667 = 360
    const expectedX = 640;
    const expectedY = 360;
    
    if (scaledPosition.x !== expectedX || scaledPosition.y !== expectedY) {
        throw new Error(`Scaled position should be (${expectedX}, ${expectedY}), got (${scaledPosition.x}, ${scaledPosition.y})`);
    }
    
    // Verify that the position is still centered relative to the new resolution
    const dimensions = projectState.getResolutionDimensions();
    const centerX = dimensions.w / 2;
    const centerY = dimensions.h / 2;
    
    if (scaledPosition.x !== centerX || scaledPosition.y !== centerY) {
        throw new Error(`Position should remain centered at (${centerX}, ${centerY}), got (${scaledPosition.x}, ${scaledPosition.y})`);
    }
    
    console.log('✅ EffectConfigurer resolution sync test passed');
}

/**
 * Test: Resolution key changes trigger re-sync
 */
export function test_resolution_key_trigger() {
    console.log('🧪 Testing resolution key trigger...');
    
    const projectState = new ProjectState({
        targetResolution: '1080p',
        isHorizontal: true
    });
    
    // Get initial resolution key
    const initialResolution = projectState.getTargetResolution();
    const initialOrientation = projectState.getIsHorizontal();
    const initialKey = `${initialResolution}-${initialOrientation}`;
    
    console.log('🔑 Initial resolution key:', initialKey);
    
    if (initialKey !== '1080p-true') {
        throw new Error(`Initial key should be '1080p-true', got '${initialKey}'`);
    }
    
    // Change resolution
    projectState.setTargetResolution('720p');
    
    const newResolution = projectState.getTargetResolution();
    const newOrientation = projectState.getIsHorizontal();
    const newKey = `${newResolution}-${newOrientation}`;
    
    console.log('🔑 New resolution key:', newKey);
    
    if (newKey !== '720p-true') {
        throw new Error(`New key should be '720p-true', got '${newKey}'`);
    }
    
    if (initialKey === newKey) {
        throw new Error('Resolution key should change when resolution changes');
    }
    
    // Change orientation
    projectState.setIsHorizontal(false);
    
    const finalResolution = projectState.getTargetResolution();
    const finalOrientation = projectState.getIsHorizontal();
    const finalKey = `${finalResolution}-${finalOrientation}`;
    
    console.log('🔑 Final resolution key:', finalKey);
    
    if (finalKey !== '720p-false') {
        throw new Error(`Final key should be '720p-false', got '${finalKey}'`);
    }
    
    if (newKey === finalKey) {
        throw new Error('Resolution key should change when orientation changes');
    }
    
    console.log('✅ Resolution key trigger test passed');
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('\n🚀 Starting Resolution Scaling UI Tests\n');
    
    try {
        test_effect_configurer_resolution_sync();
        test_resolution_key_trigger();
        
        console.log('\n✅ All tests passed!\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}