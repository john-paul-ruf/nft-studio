#!/usr/bin/env node
/**
 * Test that mimics exactly what the UI is doing when the error occurs
 */

console.log('🖥️ Actual UI Render Test\n');

async function testActualUIRender() {
    try {
        const { default: NftProjectManager } = await import('../../src/main/implementations/NftProjectManager.js');

        // This is the exact config that would come from UI after editing FuzzFlareEffect
        const uiConfig = {
            artistName: 'Test Artist',
            projectName: 'Test',
            outputDirectory: '/tmp',
            targetResolution: 512,
            isHorizontal: false,
            numFrames: 1,
            effects: [
                {
                    className: 'fuzz-flare',
                    config: {
                        // This is what UI sends after user edits to 5 rings and 5 rays
                        innerColor: {
                            selectionType: 'color-bucket',
                            colorValue: '#ff8c00',
                            getColor: function() { return '#ff8c00'; },
                            __className: 'ColorPicker'
                        },
                        outerColor: {
                            selectionType: 'color-bucket',
                            colorValue: '#6495ed',
                            getColor: function() { return '#6495ed'; },
                            __className: 'ColorPicker'
                        },
                        numberOfFlareRings: {
                            lower: 5,
                            upper: 5,
                            __className: 'Range'
                        },
                        numberOfFlareRays: {
                            lower: 5,
                            upper: 5,
                            __className: 'Range'
                        },
                        // This is the problematic field - empty after edit
                        flareRingsSizeRange: {},

                        // Other fields that might be affected
                        elementPhantomGranularity: 5,
                        elementGastonGranularity: 5
                    },
                    type: 'primary'
                }
            ],
            colorScheme: 'neon-cyberpunk',
            width: 512,
            height: 512,
            renderStartFrame: 0,
            renderJumpFrames: 1
        };

        console.log('🎯 Testing exact UI config that causes the error...');
        console.log('Effect config:', JSON.stringify(uiConfig.effects[0].config, null, 2));

        const projectManager = new NftProjectManager();

        console.log('📞 Calling renderFrame...');
        const result = await projectManager.renderFrame(0, uiConfig);

        if (result.success) {
            console.log('✅ SUCCESS! FuzzFlareEffect edit issue is FIXED!');
            console.log(`Frame buffer size: ${result.frameBuffer.length} bytes`);
        } else {
            console.log('❌ FAILED:', result.error);
        }

    } catch (error) {
        console.log('❌ ERROR:', error.message);

        if (error.message.includes('flareRingsSizeRange.lower is not a function')) {
            console.log('💥 This is the exact UI error - flareRingsSizeRange methods missing');
        }

        console.log('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
}

testActualUIRender();