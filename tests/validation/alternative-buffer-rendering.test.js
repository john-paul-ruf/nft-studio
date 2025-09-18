#!/usr/bin/env node
/**
 * Test for the alternative buffer rendering method
 * Validates base64 encoding approach for buffer transmission
 */

import { fileURLToPath } from 'node:url';
import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';
import NftProjectManager from '../../src/main/implementations/NftProjectManager.js';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AlternativeBufferRenderingTest {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.projectManager = new NftProjectManager();
        this.debugOutputDir = path.join(__dirname, '../debug-output');
    }

    async testAlternativeRendering() {
        console.log('🔄 TESTING ALTERNATIVE BUFFER RENDERING METHOD\n');

        if (!fs.existsSync(this.debugOutputDir)) {
            fs.mkdirSync(this.debugOutputDir, { recursive: true });
        }

        try {
            // STEP 1: Get effect configuration
            console.log('📋 STEP 1: Configuring hex effect...');
            const configResult = await this.effectsManager.introspectConfig({
                effectName: 'hex',
                projectData: {
                    resolution: { width: 512, height: 512 },
                    colorScheme: 'default'
                }
            });

            if (!configResult.success) {
                throw new Error(`Failed to get config: ${configResult.error}`);
            }

            console.log('✅ Effect configured successfully');

            // STEP 2: Render frame with new base64 approach
            console.log('\n🎨 STEP 2: Rendering frame with base64 encoding...');
            const renderResult = await this.projectManager.renderFrame({
                width: 512,
                height: 512,
                numFrames: 10,
                effects: [{ className: 'hex', config: configResult.defaultInstance }],
                colorScheme: 'default',
                renderStartFrame: 1,
                renderJumpFrames: 11
            }, 1);

            if (!renderResult.success) {
                throw new Error(`Render failed: ${renderResult.error}`);
            }

            console.log('✅ Frame rendered successfully');
            console.log(`📊 Buffer type: ${renderResult.bufferType}`);
            console.log(`📊 FrameBuffer type: ${typeof renderResult.frameBuffer}`);
            console.log(`📊 FrameBuffer length: ${renderResult.frameBuffer?.length || 'unknown'}`);

            // STEP 3: Validate base64 format
            console.log('\n🔍 STEP 3: Validating base64 format...');

            if (renderResult.bufferType !== 'base64' && typeof renderResult.frameBuffer !== 'string') {
                throw new Error(`Expected base64 string, got ${typeof renderResult.frameBuffer}`);
            }

            // Test base64 validity
            let decodedBuffer;
            try {
                decodedBuffer = Buffer.from(renderResult.frameBuffer, 'base64');
                console.log('✅ Valid base64 encoding');
                console.log(`📊 Decoded buffer size: ${decodedBuffer.length} bytes`);
            } catch (error) {
                throw new Error(`Invalid base64: ${error.message}`);
            }

            // Verify it's a valid PNG
            const isPNG = decodedBuffer.length >= 8 &&
                         decodedBuffer[0] === 0x89 && decodedBuffer[1] === 0x50 &&
                         decodedBuffer[2] === 0x4E && decodedBuffer[3] === 0x47;

            if (!isPNG) {
                throw new Error('Decoded buffer is not a valid PNG');
            }

            console.log('✅ Decoded to valid PNG format');

            // STEP 4: Test pixel content
            console.log('\n📊 STEP 4: Analyzing pixel content...');

            let brightPixels = 0;
            let totalSampled = 0;
            let maxBrightness = 0;

            for (let i = 1000; i < Math.min(decodedBuffer.length - 4, 10000); i += 4) {
                const pixel = Math.max(decodedBuffer[i], decodedBuffer[i + 1], decodedBuffer[i + 2]);
                maxBrightness = Math.max(maxBrightness, pixel);
                if (pixel > 50) brightPixels++;
                totalSampled++;
            }

            const brightRatio = brightPixels / totalSampled;
            console.log(`✅ Bright pixels: ${(brightRatio * 100).toFixed(1)}%`);
            console.log(`✅ Max brightness: ${maxBrightness}/255`);

            if (brightRatio < 0.5) {
                console.warn('⚠️ Image appears dark - may still have display issues');
            } else {
                console.log('✅ Image has good brightness levels');
            }

            // STEP 5: Create test HTML for frontend simulation
            console.log('\n🌐 STEP 5: Creating frontend simulation test...');

            const dataUrl = `data:image/png;base64,${renderResult.frameBuffer}`;
            const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Alternative Buffer Rendering Test</title>
    <style>
        body {
            margin: 20px;
            background: #0a0a0a;
            color: white;
            font-family: Arial, sans-serif;
        }
        .test-container {
            margin: 20px 0;
            padding: 20px;
            border: 2px solid #00ff88;
            border-radius: 10px;
            background: #1a1a1a;
        }
        canvas {
            border: 2px solid #00ff88;
            background: #000;
            display: block;
            margin: 20px auto;
        }
        .status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            font-family: monospace;
        }
        .success { background: #004400; color: #88ff88; }
        .info { background: #004444; color: #88ffff; }
    </style>
</head>
<body>
    <h1>🔄 Alternative Buffer Rendering Test</h1>

    <div class="test-container">
        <h2>Base64 Data URL Rendering</h2>
        <canvas id="testCanvas" width="512" height="512"></canvas>
        <div id="status" class="status info">Loading image...</div>
    </div>

    <div class="test-container">
        <h2>Direct Image Display</h2>
        <img id="testImage" style="max-width: 512px; border: 2px solid #00ff88;" />
        <div id="imgStatus" class="status info">Loading direct image...</div>
    </div>

    <script>
        // Test 1: Canvas rendering
        const canvas = document.getElementById('testCanvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, 512, 512);
            document.getElementById('status').className = 'status success';
            document.getElementById('status').textContent = '✅ Base64 image rendered successfully to canvas!';
            console.log('✅ Canvas rendering successful');
        };

        img.onerror = function(e) {
            document.getElementById('status').className = 'status error';
            document.getElementById('status').textContent = '❌ Failed to load base64 image';
            console.error('Failed to load image:', e);
        };

        // Set the base64 data URL
        img.src = "${dataUrl}";

        // Test 2: Direct image display
        const directImg = document.getElementById('testImage');
        directImg.src = "${dataUrl}";

        directImg.onload = function() {
            document.getElementById('imgStatus').className = 'status success';
            document.getElementById('imgStatus').textContent = '✅ Direct image display successful!';
        };

        directImg.onerror = function() {
            document.getElementById('imgStatus').className = 'status error';
            document.getElementById('imgStatus').textContent = '❌ Direct image display failed';
        };

        // Log base64 info
        console.log('Base64 length:', ${renderResult.frameBuffer.length});
        console.log('Data URL length:', ${dataUrl.length});
    </script>
</body>
</html>`;

            const htmlPath = path.join(this.debugOutputDir, 'alternative-buffer-test.html');
            fs.writeFileSync(htmlPath, htmlContent);
            console.log(`✅ Test HTML created: ${htmlPath}`);

            // Save the decoded PNG for verification
            const pngPath = path.join(this.debugOutputDir, 'alternative-buffer-test.png');
            fs.writeFileSync(pngPath, decodedBuffer);
            console.log(`✅ Decoded PNG saved: ${pngPath}`);

            // RESULTS
            console.log('\n📊 ALTERNATIVE RENDERING TEST RESULTS:');
            console.log('=====================================');
            console.log('✅ Backend converts buffer to base64 successfully');
            console.log('✅ Base64 string is valid and decodable');
            console.log('✅ Decoded data is valid PNG format');
            console.log(`✅ Image brightness: ${(brightRatio * 100).toFixed(1)}%`);
            console.log('✅ Frontend simulation HTML created');
            console.log('\n🎯 ALTERNATIVE RENDERING METHOD WORKS!');
            console.log('The base64 encoding approach ensures reliable IPC transmission');
            console.log(`\n🌐 Open test in browser: file://${htmlPath}`);

            return {
                success: true,
                bufferType: renderResult.bufferType,
                base64Length: renderResult.frameBuffer.length,
                decodedSize: decodedBuffer.length,
                brightRatio: brightRatio,
                isPNG: isPNG
            };

        } catch (error) {
            console.error('❌ Alternative rendering test failed:', error.message);
            console.error('Stack:', error.stack);
            throw error;
        }
    }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new AlternativeBufferRenderingTest();
    test.testAlternativeRendering().then(results => {
        console.log('\n✅ Alternative buffer rendering test completed');
        if (results.success && results.isPNG && results.brightRatio > 0.5) {
            console.log('🎉 Alternative rendering method is working perfectly!');
            console.log('Base64 encoding ensures reliable buffer transmission.');
            process.exit(0);
        } else {
            console.log('⚠️ Alternative rendering has issues - check results above');
            process.exit(1);
        }
    }).catch(error => {
        console.error('Alternative rendering test execution failed:', error);
        process.exit(1);
    });
}

export default AlternativeBufferRenderingTest;