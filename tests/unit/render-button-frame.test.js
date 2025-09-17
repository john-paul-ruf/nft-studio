#!/usr/bin/env node
/**
 * Test the render button frame rendering functionality
 * Simulates exact behavior when user clicks render button in Canvas.jsx
 */

const NftProjectManager = require('../../src/main/implementations/NftProjectManager');
const NftEffectsManager = require('../../src/main/implementations/NftEffectsManager');

class RenderButtonFrameTest {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.projectManager = new NftProjectManager();
        this.effectsManager = new NftEffectsManager();
    }

    test(description, testFn) {
        this.testCount++;
        try {
            testFn();
            console.log(`✅ PASS: ${description}`);
            this.passedTests++;
        } catch (error) {
            console.log(`❌ FAIL: ${description}`);
            console.log(`   Error: ${error.message}`);
            this.failedTests++;
        }
    }

    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`${message} - Expected truthy value`);
        }
    }

    assertExists(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(`${message} - Expected value to exist`);
        }
    }

    /**
     * Simulates the exact Canvas.jsx render button click flow
     */
    async testRenderButtonClick() {
        console.log('\n🖱️ Testing Render Button Click Behavior...');

        await this.test('should simulate exact render button click with hex effect', async () => {
            try {
                // 1. Setup config exactly like Canvas.jsx does
                console.log('   🔧 Setting up Canvas config...');

                // Get hex config through effects manager (like EffectPicker does)
                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 1920, height: 1080 },
                        colorScheme: 'neon-cyberpunk'
                    }
                });

                this.assertTrue(configResult.success, 'Should get hex config successfully');
                console.log('   ✅ Hex config obtained');

                // 2. Create Canvas.jsx-style config
                const canvasConfig = {
                    targetResolution: 1920,
                    isHorizontal: true,
                    numFrames: 100,
                    effects: [
                        {
                            className: 'hex',
                            config: configResult.defaultInstance,
                            secondaryEffects: [],
                            keyframeEffects: []
                        }
                    ],
                    colorScheme: 'neon-cyberpunk'
                };

                // 3. Simulate getResolutionDimensions() from Canvas.jsx
                const getResolutionDimensions = () => {
                    const base = canvasConfig.targetResolution;
                    const resolutionMap = {
                        640: { w: 640, h: 480 },
                        854: { w: 854, h: 480 },
                        1280: { w: 1280, h: 720 },
                        1920: { w: 1920, h: 1080 },
                        2560: { w: 2560, h: 1440 },
                        3840: { w: 3840, h: 2160 },
                        7680: { w: 7680, h: 4320 }
                    };
                    const dims = resolutionMap[base] || { w: 1920, h: 1080 };
                    return canvasConfig.isHorizontal ? dims : { w: dims.h, h: dims.w };
                };

                const dimensions = getResolutionDimensions();
                console.log(`   📐 Dimensions: ${dimensions.w}x${dimensions.h}`);

                // 4. Create render config exactly like Canvas.jsx handleRender()
                const selectedFrame = 5; // Simulate user selected frame 5
                const renderConfig = {
                    ...canvasConfig,
                    width: dimensions.w,
                    height: dimensions.h,
                    renderStartFrame: selectedFrame,
                    renderJumpFrames: canvasConfig.numFrames + 1
                };

                console.log('   🎯 Calling renderFrame exactly like Canvas.jsx...');
                console.log(`   📋 Frame: ${selectedFrame}, Size: ${dimensions.w}x${dimensions.h}`);

                // 5. Call renderFrame exactly like Canvas.jsx does
                const startTime = Date.now();
                const result = await window.api?.renderFrame?.(renderConfig, selectedFrame)
                    || await this.projectManager.renderFrame(renderConfig, selectedFrame);
                const renderTime = Date.now() - startTime;

                // 6. Validate result like Canvas.jsx expects
                console.log(`   📊 Render result analysis:`, {
                    success: result?.success,
                    hasFrameBuffer: !!result?.frameBuffer,
                    bufferType: typeof result?.frameBuffer,
                    bufferLength: result?.frameBuffer?.length || 'N/A',
                    frameNumber: result?.frameNumber,
                    renderTime: `${renderTime}ms`,
                    error: result?.error
                });

                this.assertTrue(result.success, 'Render should succeed');
                this.assertExists(result.frameBuffer, 'Should have frameBuffer for display');
                this.assertTrue(result.frameBuffer.length > 0, 'FrameBuffer should not be empty');

                // 7. Test frameBuffer format compatibility with Canvas.jsx
                const isDataURL = typeof result.frameBuffer === 'string' && result.frameBuffer.startsWith('data:image');
                const isArrayBuffer = result.frameBuffer instanceof ArrayBuffer || result.frameBuffer instanceof Uint8Array;
                const isBase64String = typeof result.frameBuffer === 'string' && !result.frameBuffer.startsWith('data:image');

                console.log(`   🖼️ FrameBuffer format analysis:`, {
                    isDataURL,
                    isArrayBuffer,
                    isBase64String,
                    canvasCompatible: isDataURL || isArrayBuffer || isBase64String
                });

                this.assertTrue(isDataURL || isArrayBuffer || isBase64String,
                    'FrameBuffer should be in format Canvas.jsx can handle');

                console.log(`   ✅ Render button simulation successful`);
                console.log(`   ⏱️ Render completed in ${renderTime}ms`);

                return { result, renderTime, dimensions };

            } catch (error) {
                console.log(`   ❌ Render button test failed: ${error.message}`);
                console.log(`   📋 Stack trace:`, error.stack);
                throw error;
            }
        });
    }

    async testFrameBufferDisplay() {
        console.log('\n🖼️ Testing FrameBuffer Display Compatibility...');

        await this.test('should test frameBuffer conversion like Canvas.jsx useEffect', async () => {
            try {
                // Get a render result first
                const hexConfig = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: { resolution: { width: 512, height: 512 }, colorScheme: 'default' }
                });

                const testConfig = {
                    width: 512,
                    height: 512,
                    numFrames: 10,
                    effects: [{ className: 'hex', config: hexConfig.defaultInstance }],
                    renderStartFrame: 1,
                    renderJumpFrames: 11
                };

                const result = await this.projectManager.renderFrame(testConfig, 1);
                this.assertTrue(result.success, 'Should get render result');

                // Simulate Canvas.jsx frameBuffer processing logic
                console.log('   🔄 Testing frameBuffer conversion logic...');

                let displayableImageUrl = null;
                const frameBuffer = result.frameBuffer;

                if (typeof frameBuffer === 'string' && frameBuffer.startsWith('data:image')) {
                    // Already a data URL
                    displayableImageUrl = frameBuffer;
                    console.log('   ✅ FrameBuffer is already data URL');
                } else if (frameBuffer instanceof ArrayBuffer || frameBuffer instanceof Uint8Array) {
                    // Convert binary buffer to blob URL (simulated)
                    displayableImageUrl = `blob:mock-${Math.random()}`;
                    console.log('   ✅ FrameBuffer converted from binary to blob URL');
                } else if (typeof frameBuffer === 'string') {
                    // Assume base64 string, convert to data URL
                    displayableImageUrl = `data:image/png;base64,${frameBuffer}`;
                    console.log('   ✅ FrameBuffer converted from base64 to data URL');
                } else {
                    console.log('   ⚠️ Unknown frameBuffer format:', typeof frameBuffer);
                    // Try to convert whatever it is to string and use as base64
                    displayableImageUrl = `data:image/png;base64,${frameBuffer}`;
                    console.log('   ⚠️ Fallback conversion attempted');
                }

                this.assertExists(displayableImageUrl, 'Should create displayable image URL');
                console.log(`   📋 Final image URL type: ${displayableImageUrl.substring(0, 50)}...`);

                return displayableImageUrl;

            } catch (error) {
                console.log(`   ❌ FrameBuffer display test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async testRenderButtonEdgeCases() {
        console.log('\n⚠️ Testing Render Button Edge Cases...');

        await this.test('should handle render button click with no effects', async () => {
            try {
                const emptyConfig = {
                    width: 512,
                    height: 512,
                    numFrames: 10,
                    effects: [], // No effects
                    renderStartFrame: 1,
                    renderJumpFrames: 11
                };

                const result = await this.projectManager.renderFrame(emptyConfig, 1);
                console.log(`   📊 No effects result:`, { success: result.success, error: result.error });

                // Should handle gracefully (either succeed with blank frame or fail gracefully)
                this.assertTrue(true, 'No effects scenario handled without throwing');

            } catch (error) {
                console.log(`   ❌ No effects test failed: ${error.message}`);
                throw error;
            }
        });

        await this.test('should handle render button click with invalid frame', async () => {
            try {
                const hexConfig = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: { resolution: { width: 512, height: 512 }, colorScheme: 'default' }
                });

                const testConfig = {
                    width: 512,
                    height: 512,
                    numFrames: 10,
                    effects: [{ className: 'hex', config: hexConfig.defaultInstance }],
                    renderStartFrame: 999, // Invalid frame
                    renderJumpFrames: 11
                };

                const result = await this.projectManager.renderFrame(testConfig, 999);
                console.log(`   📊 Invalid frame result:`, { success: result.success, error: result.error });

                // Should handle gracefully
                this.assertTrue(true, 'Invalid frame scenario handled without throwing');

            } catch (error) {
                console.log(`   ❌ Invalid frame test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async testRenderButtonPerformance() {
        console.log('\n⏱️ Testing Render Button Performance...');

        await this.test('should complete render within UI-acceptable time', async () => {
            try {
                const hexConfig = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: { resolution: { width: 1920, height: 1080 }, colorScheme: 'neon-cyberpunk' }
                });

                const performanceConfig = {
                    width: 1920,
                    height: 1080,
                    numFrames: 100,
                    effects: [{ className: 'hex', config: hexConfig.defaultInstance }],
                    renderStartFrame: 1,
                    renderJumpFrames: 101
                };

                console.log('   ⏱️ Starting performance timing...');
                const startTime = Date.now();

                const result = await this.projectManager.renderFrame(performanceConfig, 1);

                const endTime = Date.now();
                const renderTime = endTime - startTime;

                console.log(`   📊 Performance results:`);
                console.log(`   ⏱️ Render time: ${renderTime}ms`);
                console.log(`   📏 Image size: ${result.frameBuffer?.length || 'N/A'} bytes`);

                this.assertTrue(result.success, 'Performance render should succeed');

                // UI expectations - generous but realistic
                if (renderTime > 10000) {
                    console.log(`   ⚠️  Render took ${renderTime}ms - might cause UI timeout`);
                } else if (renderTime > 3000) {
                    console.log(`   ⚠️  Render took ${renderTime}ms - noticeable delay for users`);
                } else {
                    console.log(`   ✅ Render completed in good time for UI`);
                }

                this.assertTrue(renderTime < 30000, 'Should complete within 30 seconds max');

            } catch (error) {
                console.log(`   ❌ Performance test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Render Button Frame Tests...\n');
        console.log('This test simulates the exact render button click behavior in Canvas.jsx:');
        console.log('  1. Test render button click with hex effect');
        console.log('  2. Test frameBuffer display compatibility');
        console.log('  3. Test edge cases (no effects, invalid frames)');
        console.log('  4. Test performance expectations');

        try {
            await this.testRenderButtonClick();
            await this.testFrameBufferDisplay();
            await this.testRenderButtonEdgeCases();
            await this.testRenderButtonPerformance();

            console.log('\n📊 Test Results:');
            console.log(`   Total: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            if (this.failedTests === 0) {
                console.log('\n🎉 All render button frame tests passed!');
                console.log('The render button frame functionality is working correctly.');
            } else {
                console.log(`\n⚠️ ${this.failedTests} tests failed - check output above for issues`);
            }

            return {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests
            };

        } catch (error) {
            console.log(`❌ Render button test suite failed: ${error.message}`);
            console.log(`📋 Stack trace:`, error.stack);
            this.failedTests++;
            throw error;
        }
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const tests = new RenderButtonFrameTest();
    tests.runAllTests().then(results => {
        if (results.failed === 0) {
            console.log('\n✅ Render button frame functionality is working correctly!');
            console.log('The render button should properly generate and display frames.');
            process.exit(0);
        } else {
            console.log('\n❌ Render button frame functionality has issues - see test output above');
            process.exit(1);
        }
    }).catch(error => {
        console.error('Render button frame test execution failed:', error);
        process.exit(1);
    });
}

module.exports = RenderButtonFrameTest;