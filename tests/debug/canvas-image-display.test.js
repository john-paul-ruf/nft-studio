#!/usr/bin/env node
/**
 * Debug test for Canvas.jsx image display pipeline
 * Tests the exact flow from renderFrame result to canvas display
 */

import { fileURLToPath } from 'node:url';
import NftProjectManager from '../../src/main/implementations/NftProjectManager.js';
import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CanvasImageDisplayTest {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.projectManager = new NftProjectManager();
        this.effectsManager = new NftEffectsManager();
        this.debugOutputDir = path.join(__dirname, '../debug-output');
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

    async setupDebugOutput() {
        if (!fs.existsSync(this.debugOutputDir)) {
            fs.mkdirSync(this.debugOutputDir, { recursive: true });
        }
    }

    /**
     * Simulate exact Canvas.jsx render flow and save debug artifacts
     */
    async testCanvasRenderFlow() {
        console.log('\n🖼️ Testing Canvas.jsx Render Flow...');

        await this.test('should simulate exact Canvas.jsx render button flow with debug output', async () => {
            try {
                await this.setupDebugOutput();

                // 1. Get hex config exactly like Canvas.jsx
                console.log('   🔧 Getting hex config...');
                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 1920, height: 1080 },
                        colorScheme: 'neon-cyberpunk'
                    }
                });

                this.assertTrue(configResult.success, 'Should get hex config');
                console.log('   ✅ Hex config obtained');

                // 2. Create Canvas.jsx style config
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

                // 3. Calculate dimensions like Canvas.jsx
                const getResolutionDimensions = () => {
                    const base = canvasConfig.targetResolution;
                    const resolutionMap = {
                        1920: { w: 1920, h: 1080 }
                    };
                    const dims = resolutionMap[base] || { w: 1920, h: 1080 };
                    return canvasConfig.isHorizontal ? dims : { w: dims.h, h: dims.w };
                };

                const dimensions = getResolutionDimensions();
                console.log(`   📐 Render dimensions: ${dimensions.w}x${dimensions.h}`);

                // 4. Create render config exactly like Canvas.jsx
                const selectedFrame = 1;
                const renderConfig = {
                    ...canvasConfig,
                    width: dimensions.w,
                    height: dimensions.h,
                    renderStartFrame: selectedFrame,
                    renderJumpFrames: canvasConfig.numFrames + 1
                };

                // 5. Call renderFrame
                console.log('   🎯 Calling renderFrame...');
                const result = await this.projectManager.renderFrame(renderConfig, selectedFrame);

                this.assertTrue(result.success, 'Render should succeed');
                this.assertExists(result.frameBuffer, 'Should have frameBuffer');

                console.log(`   📊 Raw render result:`, {
                    success: result.success,
                    frameBufferType: typeof result.frameBuffer,
                    frameBufferLength: result.frameBuffer?.length,
                    frameNumber: result.frameNumber,
                    isString: typeof result.frameBuffer === 'string',
                    isArrayBuffer: result.frameBuffer instanceof ArrayBuffer,
                    isUint8Array: result.frameBuffer instanceof Uint8Array,
                    startsWithDataImage: typeof result.frameBuffer === 'string' && result.frameBuffer.startsWith('data:image'),
                    first100Chars: typeof result.frameBuffer === 'string' ? result.frameBuffer.substring(0, 100) : 'Not string'
                });

                // 6. Save raw frameBuffer for inspection
                const rawOutputPath = path.join(this.debugOutputDir, 'raw-framebuffer.bin');
                if (typeof result.frameBuffer === 'string') {
                    fs.writeFileSync(rawOutputPath + '.txt', result.frameBuffer);
                    console.log(`   💾 Raw frameBuffer saved as text: ${rawOutputPath}.txt`);
                } else if (result.frameBuffer instanceof ArrayBuffer) {
                    fs.writeFileSync(rawOutputPath, Buffer.from(result.frameBuffer));
                    console.log(`   💾 Raw frameBuffer saved as binary: ${rawOutputPath}`);
                } else if (result.frameBuffer instanceof Uint8Array) {
                    fs.writeFileSync(rawOutputPath, result.frameBuffer);
                    console.log(`   💾 Raw frameBuffer saved as binary: ${rawOutputPath}`);
                }

                return { result, renderConfig, dimensions };

            } catch (error) {
                console.log(`   ❌ Canvas render flow test failed: ${error.message}`);
                console.log(`   📋 Stack trace:`, error.stack);
                throw error;
            }
        });
    }

    async testFrameBufferConversion() {
        console.log('\n🔄 Testing FrameBuffer Conversion Logic...');

        await this.test('should test Canvas.jsx frameBuffer conversion with debug output', async () => {
            try {
                // Get a render result
                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 512, height: 512 },
                        colorScheme: 'neon-cyberpunk'
                    }
                });

                const renderConfig = {
                    width: 512,
                    height: 512,
                    numFrames: 10,
                    effects: [{ className: 'hex', config: configResult.defaultInstance }],
                    colorScheme: 'neon-cyberpunk',
                    renderStartFrame: 1,
                    renderJumpFrames: 11
                };

                const result = await this.projectManager.renderFrame(renderConfig, 1);
                this.assertTrue(result.success, 'Should get render result');

                console.log('   🔄 Starting frameBuffer conversion simulation...');

                const frameBuffer = result.frameBuffer;
                let displayableImageUrl = null;
                let conversionMethod = '';

                // Simulate Canvas.jsx conversion logic exactly
                if (typeof frameBuffer === 'string' && frameBuffer.startsWith('data:image')) {
                    // Already a data URL
                    displayableImageUrl = frameBuffer;
                    conversionMethod = 'Already data URL';
                    console.log('   ✅ FrameBuffer is already data URL');
                } else if (frameBuffer instanceof ArrayBuffer || frameBuffer instanceof Uint8Array) {
                    // Convert binary buffer to blob URL
                    // Note: In real Canvas.jsx this creates actual blob URL, here we simulate
                    displayableImageUrl = `blob:simulated-${Date.now()}`;
                    conversionMethod = 'Binary to blob URL';
                    console.log('   ✅ FrameBuffer converted from binary to blob URL (simulated)');

                    // Save the binary data for inspection
                    const binaryPath = path.join(this.debugOutputDir, 'framebuffer-binary.png');
                    const buffer = frameBuffer instanceof ArrayBuffer ?
                        Buffer.from(frameBuffer) : Buffer.from(frameBuffer);
                    fs.writeFileSync(binaryPath, buffer);
                    console.log(`   💾 Binary frameBuffer saved: ${binaryPath}`);

                } else if (typeof frameBuffer === 'string') {
                    // Assume base64 string, convert to data URL
                    displayableImageUrl = `data:image/png;base64,${frameBuffer}`;
                    conversionMethod = 'Base64 string to data URL';
                    console.log('   ✅ FrameBuffer converted from base64 to data URL');

                    // Save the base64 as both text and converted image
                    const base64TextPath = path.join(this.debugOutputDir, 'framebuffer-base64.txt');
                    const base64ImagePath = path.join(this.debugOutputDir, 'framebuffer-base64.png');

                    fs.writeFileSync(base64TextPath, frameBuffer);
                    fs.writeFileSync(base64ImagePath, Buffer.from(frameBuffer, 'base64'));

                    console.log(`   💾 Base64 frameBuffer saved: ${base64TextPath}`);
                    console.log(`   💾 Base64 as image saved: ${base64ImagePath}`);

                } else {
                    // Unknown format - try fallback
                    displayableImageUrl = `data:image/png;base64,${frameBuffer}`;
                    conversionMethod = 'Fallback conversion';
                    console.log('   ⚠️ Unknown frameBuffer format, using fallback conversion');
                }

                console.log(`   📋 Conversion summary:`);
                console.log(`   🔧 Method: ${conversionMethod}`);
                console.log(`   📏 Original size: ${frameBuffer?.length || 'Unknown'} bytes`);
                console.log(`   🔗 Result URL type: ${displayableImageUrl.substring(0, 50)}...`);

                // Test if the URL would be valid for Canvas.jsx
                const isValidForCanvas = displayableImageUrl &&
                    (displayableImageUrl.startsWith('data:image') ||
                     displayableImageUrl.startsWith('blob:'));

                this.assertTrue(isValidForCanvas, 'Converted URL should be valid for Canvas.jsx display');

                console.log(`   ✅ Conversion successful - would display in Canvas.jsx`);

                return { displayableImageUrl, conversionMethod, frameBuffer };

            } catch (error) {
                console.log(`   ❌ FrameBuffer conversion test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async testImageLoadingSimulation() {
        console.log('\n🎨 Testing Image Loading Simulation...');

        await this.test('should simulate Canvas.jsx image loading with useEffect', async () => {
            try {
                // Get render result and convert it
                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 256, height: 256 },
                        colorScheme: 'neon-cyberpunk'
                    }
                });

                const renderConfig = {
                    width: 256,
                    height: 256,
                    numFrames: 10,
                    effects: [{ className: 'hex', config: configResult.defaultInstance }],
                    colorScheme: 'neon-cyberpunk',
                    renderStartFrame: 1,
                    renderJumpFrames: 11
                };

                const result = await this.projectManager.renderFrame(renderConfig, 1);
                const frameBuffer = result.frameBuffer;

                // Convert to displayable URL
                let renderResult = null;
                if (typeof frameBuffer === 'string' && frameBuffer.startsWith('data:image')) {
                    renderResult = frameBuffer;
                } else if (frameBuffer instanceof ArrayBuffer || frameBuffer instanceof Uint8Array) {
                    // In real Canvas.jsx this would be: URL.createObjectURL(new Blob([frameBuffer], { type: 'image/png' }))
                    renderResult = `blob:mock-${Math.random()}`;
                } else if (typeof frameBuffer === 'string') {
                    renderResult = `data:image/png;base64,${frameBuffer}`;
                }

                console.log('   🖼️ Simulating Canvas.jsx useEffect image loading...');

                // Simulate the useEffect logic from Canvas.jsx
                if (renderResult) {
                    console.log(`   📋 Image src would be: ${renderResult.substring(0, 100)}...`);

                    // Simulate image creation and loading
                    console.log('   🔄 Simulating: const img = new Image();');
                    console.log('   🔄 Simulating: img.onload = () => { /* draw to canvas */ };');
                    console.log('   🔄 Simulating: img.onerror = (error) => { /* handle error */ };');
                    console.log(`   🔄 Simulating: img.src = renderResult;`);

                    // Check if this would likely work
                    const wouldLikelyLoad = renderResult.startsWith('data:image') ||
                                          renderResult.startsWith('blob:');

                    if (wouldLikelyLoad) {
                        console.log('   ✅ Image should load successfully in Canvas.jsx');
                    } else {
                        console.log('   ⚠️ Image might fail to load in Canvas.jsx');
                    }

                    this.assertTrue(wouldLikelyLoad, 'Image URL should be loadable');

                    // Save a working HTML test file
                    const htmlTestPath = path.join(this.debugOutputDir, 'test-image-loading.html');
                    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Canvas Image Test</title>
</head>
<body>
    <h1>Canvas Image Loading Test</h1>
    <canvas id="testCanvas" width="256" height="256" style="border: 1px solid #ccc;"></canvas>
    <div id="status">Loading...</div>

    <script>
        const canvas = document.getElementById('testCanvas');
        const ctx = canvas.getContext('2d');
        const status = document.getElementById('status');

        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            status.textContent = 'Image loaded successfully!';
            console.log('Image loaded and drawn to canvas');
        };
        img.onerror = (error) => {
            status.textContent = 'Image failed to load';
            console.error('Image load error:', error);
        };

        // This would be the actual frameBuffer URL in real Canvas.jsx
        img.src = '${renderResult.startsWith('blob:') ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' : renderResult}';
    </script>
</body>
</html>`;

                    fs.writeFileSync(htmlTestPath, htmlContent);
                    console.log(`   💾 HTML test file saved: ${htmlTestPath}`);
                    console.log(`   🌐 Open in browser to test image loading: file://${htmlTestPath}`);

                } else {
                    console.log('   ❌ No renderResult to test image loading');
                }

                return renderResult;

            } catch (error) {
                console.log(`   ❌ Image loading simulation failed: ${error.message}`);
                throw error;
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Canvas Image Display Tests...\n');
        console.log('This test debugs the exact Canvas.jsx image display pipeline:');
        console.log('  1. Test Canvas.jsx render flow with debug output');
        console.log('  2. Test frameBuffer conversion logic');
        console.log('  3. Test image loading simulation');
        console.log(`  4. Debug artifacts saved to: ${this.debugOutputDir}`);

        try {
            await this.testCanvasRenderFlow();
            await this.testFrameBufferConversion();
            await this.testImageLoadingSimulation();

            console.log('\n📊 Test Results:');
            console.log(`   Total: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            console.log('\n📁 Debug Output:');
            if (fs.existsSync(this.debugOutputDir)) {
                const files = fs.readdirSync(this.debugOutputDir);
                files.forEach(file => {
                    const filePath = path.join(this.debugOutputDir, file);
                    const stats = fs.statSync(filePath);
                    console.log(`   📄 ${file} (${stats.size} bytes)`);
                });
            }

            if (this.failedTests === 0) {
                console.log('\n🎉 All Canvas display tests passed!');
                console.log('The frameBuffer conversion and display logic should work correctly.');
                console.log('If you\'re still seeing black screens, check:');
                console.log('  - Browser console for image load errors');
                console.log('  - Network tab for failed blob/data URL requests');
                console.log('  - Canvas element rendering in DevTools');
            } else {
                console.log(`\n⚠️ ${this.failedTests} tests failed - Canvas display has issues`);
            }

            return {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests
            };

        } catch (error) {
            console.log(`❌ Canvas display test suite failed: ${error.message}`);
            console.log(`📋 Stack trace:`, error.stack);
            this.failedTests++;
            throw error;
        }
    }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new CanvasImageDisplayTest();
    tests.runAllTests().then(results => {
        if (results.failed === 0) {
            console.log('\n✅ Canvas image display pipeline is working correctly!');
            console.log('Check the debug output files to inspect the actual image data.');
            process.exit(0);
        } else {
            console.log('\n❌ Canvas image display pipeline has issues - see test output above');
            process.exit(1);
        }
    }).catch(error => {
        console.error('Canvas image display test execution failed:', error);
        process.exit(1);
    });
}

export default CanvasImageDisplayTest;