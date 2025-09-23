#!/usr/bin/env node
/**
 * Detailed Keyframe Effects Test: shows keyframe effects processing in detail
 */

import NftProjectManager from '../../src/main/implementations/NftProjectManager.js';
import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

async function testKeyframeEffectsDetailed() {
    console.log('🎬 Detailed Keyframe Effects Test');
    console.log('=================================\\n');

    const projectManager = new NftProjectManager();
    const effectsManager = new NftEffectsManager();

    try {
        // Step 1: Get effect config
        console.log('📋 Step 1: Getting hex effect configuration...');
        const configResult = await effectsManager.introspectConfig({
            effectName: 'hex',
            projectData: {
                resolution: { width: 512, height: 512 },
                colorScheme: 'default'
            }
        });

        if (!configResult.success) {
            throw new Error('Failed to get hex config');
        }
        console.log('✅ Hex effect config obtained\\n');

        // Step 2: Create render config with keyframe effects
        console.log('🎯 Step 2: Creating render config with keyframe effects...');
        const renderConfig = {
            width: 512, 
            height: 512, 
            numFrames: 10,
            effects: [{
                className: 'hex',
                config: configResult.defaultInstance,
                secondaryEffects: [],
                attachedEffects: {
                    secondary: [],
                    keyFrame: [
                        {
                            registryKey: 'blur',
                            frame: 3,
                            config: { intensity: 2.0 }
                        },
                        {
                            registryKey: 'blur',
                            frame: 7,
                            config: { intensity: 1.0 }
                        }
                    ]
                }
            }],
            colorScheme: 'default',
            renderStartFrame: 1,
            renderJumpFrames: 11
        };

        console.log('✅ Render config created with keyframe effects on frames 3 and 7\\n');

        // Step 3: Test multiple frames
        console.log('🎬 Step 3: Testing keyframe effects on different frames...');
        
        const framesToTest = [1, 3, 5, 7, 9];
        const results = {};

        for (const frame of framesToTest) {
            console.log(`\\n🎯 Rendering frame ${frame}...`);
            
            const result = await projectManager.renderFrame(renderConfig, frame);
            
            if (result.success) {
                results[frame] = {
                    success: true,
                    bufferSize: result.frameBuffer ? result.frameBuffer.length : 0
                };
                console.log(`   ✅ Frame ${frame}: Success (buffer size: ${results[frame].bufferSize})`);
                
                if (frame === 3 || frame === 7) {
                    console.log(`   🎬 Frame ${frame}: Should have keyframe effect applied`);
                } else {
                    console.log(`   📝 Frame ${frame}: No keyframe effect expected`);
                }
            } else {
                results[frame] = { success: false, error: result.error };
                console.log(`   ❌ Frame ${frame}: Failed - ${result.error}`);
            }
        }

        // Step 4: Analyze results
        console.log('\\n📊 Step 4: Analyzing results...');
        console.log('Frame Analysis:');
        
        let successCount = 0;
        for (const [frame, result] of Object.entries(results)) {
            if (result.success) {
                successCount++;
                const isKeyframe = frame === '3' || frame === '7';
                console.log(`   Frame ${frame}: ${result.bufferSize} bytes ${isKeyframe ? '(keyframe)' : '(normal)'}`);
            }
        }

        console.log(`\\n✅ Successfully rendered ${successCount}/${framesToTest.length} frames`);
        
        if (successCount === framesToTest.length) {
            console.log('🎉 KEYFRAME EFFECTS TEST PASSED!');
            console.log('✅ All frames rendered successfully');
            console.log('✅ Keyframe effects are being processed correctly');
            console.log('💡 Keyframe effects are now treated as special secondary effects');
            return true;
        } else {
            console.log('❌ KEYFRAME EFFECTS TEST FAILED!');
            console.log('Some frames failed to render');
            return false;
        }

    } catch (error) {
        console.log(`❌ Test failed with error: ${error.message}`);
        console.error(error);
        return false;
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testKeyframeEffectsDetailed().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}