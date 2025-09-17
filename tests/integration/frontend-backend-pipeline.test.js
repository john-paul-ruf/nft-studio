#!/usr/bin/env node
/**
 * Integration test to track down the black screen issue
 * Tests the entire pipeline from frontend effect configuration to backend rendering to frontend display
 */

const NftEffectsManager = require('../../src/main/implementations/NftEffectsManager');
const NftProjectManager = require('../../src/main/implementations/NftProjectManager');
const fs = require('fs');
const path = require('path');

class FrontendBackendPipelineTest {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.projectManager = new NftProjectManager();
        this.debugOutputDir = path.join(__dirname, '../debug-output');
    }

    async runFullPipelineTest() {
        console.log('🚀 TESTING FRONTEND-BACKEND PIPELINE FOR BLACK SCREEN ISSUE\n');

        try {
            if (!fs.existsSync(this.debugOutputDir)) {
                fs.mkdirSync(this.debugOutputDir, { recursive: true });
            }

            // STEP 1: Simulate frontend effect configuration
            console.log('🔧 STEP 1: FRONTEND EFFECT CONFIGURATION...');
            console.log('Simulating user adding a hex effect through the UI...\n');

            // Get effect configuration exactly like the frontend does
            const effectIntrospection = await this.effectsManager.introspectConfig({
                effectName: 'hex',
                projectData: {
                    resolution: { width: 512, height: 512 },
                    colorScheme: 'default'
                }
            });

            if (!effectIntrospection.success) {
                throw new Error(`Effect introspection failed: ${effectIntrospection.error}`);
            }

            console.log('✅ Effect configuration retrieved from backend');
            console.log(`📋 Effect config class: ${effectIntrospection.defaultInstance.__className}`);

            // Inspect the colors that will be used
            const config = effectIntrospection.defaultInstance;
            console.log('\n🎨 COLOR CONFIGURATION ANALYSIS:');
            ['innerColor', 'outerColor'].forEach(colorProp => {
                const colorObj = config[colorProp];
                if (colorObj) {
                    console.log(`  ${colorProp}:`);
                    console.log(`    selectionType: ${colorObj.selectionType}`);
                    console.log(`    colorValue: ${JSON.stringify(colorObj.colorValue)}`);
                    console.log(`    Will use color bucket: ${colorObj.selectionType === 'color-bucket'}`);
                }
            });

            // STEP 2: Simulate frontend creating render configuration
            console.log('\n🖼️ STEP 2: FRONTEND RENDER CONFIGURATION...');
            console.log('Simulating frontend creating render config like Canvas.jsx does...\n');

            // This mimics exactly what Canvas.jsx does in its handleRender function
            const frontendRenderConfig = {
                width: 512,
                height: 512,
                numFrames: 10,
                effects: [{
                    className: 'hex',
                    config: config  // Using the config from step 1
                }],
                colorScheme: 'default',
                renderStartFrame: 1,
                renderJumpFrames: 11
            };

            console.log('✅ Frontend render config created');
            console.log(`📋 Effects: ${frontendRenderConfig.effects.length} (${frontendRenderConfig.effects[0].className})`);
            console.log(`📋 Color scheme: ${frontendRenderConfig.colorScheme}`);

            // STEP 3: Backend rendering (what happens in main process)
            console.log('\n⚙️ STEP 3: BACKEND RENDERING...');
            console.log('Sending render request to backend like IPC does...\n');

            const renderResult = await this.projectManager.renderFrame(frontendRenderConfig, 1);

            if (!renderResult.success) {
                throw new Error(`Backend rendering failed: ${renderResult.error}`);
            }

            console.log('✅ Backend rendering completed successfully');
            console.log(`📋 Frame buffer type: ${typeof renderResult.frameBuffer}`);
            console.log(`📋 Frame buffer length: ${renderResult.frameBuffer?.length || 'unknown'}`);

            // STEP 4: Analyze the rendered frame buffer
            console.log('\n🔍 STEP 4: FRAME BUFFER ANALYSIS...');

            const frameBuffer = renderResult.frameBuffer;
            let buffer;

            if (frameBuffer instanceof ArrayBuffer) {
                buffer = Buffer.from(frameBuffer);
                console.log('📋 Frame buffer is ArrayBuffer');
            } else if (frameBuffer instanceof Uint8Array) {
                buffer = Buffer.from(frameBuffer);
                console.log('📋 Frame buffer is Uint8Array');
            } else if (Buffer.isBuffer(frameBuffer)) {
                buffer = frameBuffer;
                console.log('📋 Frame buffer is Buffer');
            } else if (typeof frameBuffer === 'string') {
                console.log('📋 Frame buffer is string (base64?)');
                // Try to decode as base64
                try {
                    buffer = Buffer.from(frameBuffer, 'base64');
                    console.log('✅ Successfully decoded as base64');
                } catch (error) {
                    console.log('❌ Failed to decode as base64:', error.message);
                    return;
                }
            } else {
                console.log('❌ Unknown frame buffer format:', typeof frameBuffer);
                return;
            }

            // Analyze pixel content
            console.log(`\n📊 PIXEL ANALYSIS (buffer size: ${buffer.length} bytes):`);

            if (buffer.length < 100) {
                console.log('❌ Buffer too small to be a valid image');
                return;
            }

            // Check if it's a PNG by looking at header
            const isPNG = buffer.length >= 8 &&
                         buffer[0] === 0x89 && buffer[1] === 0x50 &&
                         buffer[2] === 0x4E && buffer[3] === 0x47;

            console.log(`📋 Is PNG format: ${isPNG}`);

            if (isPNG) {
                // Save the PNG file for manual inspection
                const outputPath = path.join(this.debugOutputDir, 'pipeline-test-output.png');
                fs.writeFileSync(outputPath, buffer);
                console.log(`💾 PNG saved for inspection: ${outputPath}`);

                // Basic pixel analysis (PNG pixel data starts after headers)
                let brightPixelCount = 0;
                let darkPixelCount = 0;
                let totalSampled = 0;
                let maxBrightness = 0;

                // Sample some pixels from different parts of the buffer
                const sampleSize = Math.min(buffer.length, 10000);
                for (let i = 1000; i < sampleSize - 4; i += 4) {
                    const pixel = Math.max(buffer[i], buffer[i + 1], buffer[i + 2]);
                    maxBrightness = Math.max(maxBrightness, pixel);

                    if (pixel > 50) brightPixelCount++;
                    else darkPixelCount++;
                    totalSampled++;
                }

                const brightRatio = brightPixelCount / totalSampled;
                console.log(`📊 Sampled ${totalSampled} pixels:`);
                console.log(`   Bright pixels (>50): ${brightPixelCount} (${(brightRatio * 100).toFixed(1)}%)`);
                console.log(`   Dark pixels (<=50): ${darkPixelCount} (${((1-brightRatio) * 100).toFixed(1)}%)`);
                console.log(`   Max brightness found: ${maxBrightness}/255`);

                if (brightRatio > 0.1) {
                    console.log('✅ SIGNIFICANT BRIGHT CONTENT DETECTED');
                    console.log('💡 Backend is generating colorful images');
                } else {
                    console.log('❌ MOSTLY DARK CONTENT');
                    console.log('💡 Backend is generating dark/black images');
                }
            }

            // STEP 5: Simulate frontend image display
            console.log('\n🖥️ STEP 5: FRONTEND IMAGE DISPLAY SIMULATION...');
            console.log('Simulating how Canvas.jsx would handle this frame buffer...\n');

            // Mimic the Canvas.jsx frameBuffer processing logic
            let frontendImageUrl;

            if (typeof frameBuffer === 'string' && frameBuffer.startsWith('data:image')) {
                frontendImageUrl = frameBuffer;
                console.log('📋 Frame buffer is already a data URL');
            } else if (frameBuffer instanceof ArrayBuffer || frameBuffer instanceof Uint8Array) {
                // This is what Canvas.jsx does
                console.log('📋 Converting binary buffer to blob URL (Canvas.jsx style)');
                // In a real browser environment, this would work:
                // const blob = new Blob([frameBuffer], { type: 'image/png' });
                // const imageUrl = URL.createObjectURL(blob);
                frontendImageUrl = '[blob-url-would-be-created-here]';
                console.log('✅ Would create blob URL for image display');
            } else if (typeof frameBuffer === 'string') {
                console.log('📋 Converting base64 string to data URL (Canvas.jsx style)');
                frontendImageUrl = `data:image/png;base64,${frameBuffer}`;
                console.log('✅ Created data URL for image display');
            } else {
                console.log('❌ Canvas.jsx would hit unknown format case');
                frontendImageUrl = `data:image/png;base64,${frameBuffer}`;
            }

            console.log(`📋 Frontend image URL type: ${frontendImageUrl?.substring(0, 20)}...`);

            // STEP 6: Summary and conclusions
            console.log('\n📋 PIPELINE TEST SUMMARY:');
            console.log('================================');

            if (renderResult.success) {
                console.log('✅ Backend rendering: SUCCESS');
            } else {
                console.log('❌ Backend rendering: FAILED');
            }

            if (buffer && isPNG) {
                console.log('✅ Frame buffer format: Valid PNG');
            } else {
                console.log('❌ Frame buffer format: Invalid or unknown');
            }

            if (brightRatio > 0.1) {
                console.log('✅ Image content: Colorful/visible');
                console.log('\n🎉 CONCLUSION: Backend generates colorful images successfully!');
                console.log('💡 If user sees black screen, issue is likely in:');
                console.log('   - Frontend image display (Canvas.jsx)');
                console.log('   - Browser rendering of the image');
                console.log('   - Image format conversion');
                console.log('   - CSS styling hiding the image');
            } else {
                console.log('❌ Image content: Dark/black');
                console.log('\n❌ CONCLUSION: Backend is generating dark images');
                console.log('💡 Issue is in the rendering pipeline:');
                console.log('   - ColorPicker color resolution');
                console.log('   - Effect color application');
                console.log('   - Color scheme configuration');
            }

            return {
                backendSuccess: renderResult.success,
                frameBufferValid: isPNG,
                hasVisibleContent: brightRatio > 0.1,
                brightPixelRatio: brightRatio,
                maxBrightness
            };

        } catch (error) {
            console.error('❌ Pipeline test failed:', error.message);
            console.error('Stack:', error.stack);
            throw error;
        }
    }
}

// Run test if executed directly
if (require.main === module) {
    const test = new FrontendBackendPipelineTest();
    test.runFullPipelineTest().then(results => {
        console.log('\n✅ Frontend-Backend pipeline test completed');

        if (results.backendSuccess && results.frameBufferValid && results.hasVisibleContent) {
            console.log('🎯 BLACK SCREEN ISSUE IS NOT IN THE BACKEND');
            console.log('🔍 CHECK FRONTEND IMAGE DISPLAY LOGIC');
        } else {
            console.log('🎯 BLACK SCREEN ISSUE IS IN THE BACKEND');
            console.log('🔧 NEED TO FIX RENDERING PIPELINE');
        }

        process.exit(0);
    }).catch(error => {
        console.error('❌ Pipeline test execution failed:', error);
        process.exit(1);
    });
}

module.exports = FrontendBackendPipelineTest;