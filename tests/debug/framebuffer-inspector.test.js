#!/usr/bin/env node
/**
 * Inspector for frameBuffer content to debug black screen issue
 * Examines the exact frameBuffer data returned by renderFrame
 */

import { fileURLToPath } from 'node:url';
import NftProjectManager from '../../src/main/implementations/NftProjectManager.js';
import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FrameBufferInspector {
    constructor() {
        this.projectManager = new NftProjectManager();
        this.effectsManager = new NftEffectsManager();
        this.debugOutputDir = path.join(__dirname, '../debug-output');
    }

    async setupDebugOutput() {
        if (!fs.existsSync(this.debugOutputDir)) {
            fs.mkdirSync(this.debugOutputDir, { recursive: true });
        }
    }

    /**
     * Deep inspection of frameBuffer content
     */
    inspectFrameBuffer(frameBuffer, label = 'frameBuffer') {
        console.log(`\n🔍 DEEP INSPECTION: ${label}`);
        console.log('=' .repeat(60));

        // Type analysis
        console.log(`📋 Type: ${typeof frameBuffer}`);
        console.log(`📋 Constructor: ${frameBuffer?.constructor?.name || 'N/A'}`);
        console.log(`📋 Instance checks:`);
        console.log(`   - ArrayBuffer: ${frameBuffer instanceof ArrayBuffer}`);
        console.log(`   - Uint8Array: ${frameBuffer instanceof Uint8Array}`);
        console.log(`   - Buffer: ${Buffer.isBuffer(frameBuffer)}`);

        // Size analysis
        if (frameBuffer?.length !== undefined) {
            console.log(`📏 Size: ${frameBuffer.length} bytes`);
        } else if (frameBuffer?.byteLength !== undefined) {
            console.log(`📏 Size: ${frameBuffer.byteLength} bytes`);
        }

        // Content preview
        if (typeof frameBuffer === 'string') {
            console.log(`📝 String preview (first 200 chars):`);
            console.log(`   "${frameBuffer.substring(0, 200)}${frameBuffer.length > 200 ? '...' : ''}"`);

            if (frameBuffer.startsWith('data:image')) {
                console.log(`✅ Is data URL - should work in Canvas.jsx`);
                const parts = frameBuffer.split(',');
                if (parts.length >= 2) {
                    console.log(`📊 Data URL parts: ${parts[0]}, base64 data: ${parts[1].length} chars`);
                }
            } else {
                console.log(`⚠️ String but not data URL - might be base64`);
                // Check if it looks like base64
                const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
                const isLikelyBase64 = base64Pattern.test(frameBuffer.substring(0, 100));
                console.log(`📊 Looks like base64: ${isLikelyBase64}`);
            }
        } else if (frameBuffer instanceof ArrayBuffer || frameBuffer instanceof Uint8Array || Buffer.isBuffer(frameBuffer)) {
            // Binary data analysis
            const buffer = Buffer.isBuffer(frameBuffer) ? frameBuffer : Buffer.from(frameBuffer);
            console.log(`📊 Binary data analysis:`);
            console.log(`   - First 20 bytes: [${Array.from(buffer.slice(0, 20)).join(', ')}]`);

            // Check PNG signature
            const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
            const hasPngSignature = pngSignature.every((byte, i) => buffer[i] === byte);
            console.log(`🖼️ PNG signature: ${hasPngSignature ? '✅ Valid' : '❌ Invalid'}`);

            if (hasPngSignature) {
                console.log(`✅ Valid PNG data - should work after conversion`);

                // Analyze content density
                let nonZeroBytes = 0;
                const sampleSize = Math.min(buffer.length, 10000);
                for (let i = 100; i < sampleSize; i++) { // Skip header
                    if (buffer[i] !== 0) nonZeroBytes++;
                }
                const density = nonZeroBytes / (sampleSize - 100);
                console.log(`📈 Content density: ${(density * 100).toFixed(1)}% (${nonZeroBytes}/${sampleSize - 100} non-zero bytes)`);

                if (density < 0.1) {
                    console.log(`⚠️ Low content density - might be mostly black/transparent`);
                } else {
                    console.log(`✅ Good content density - should have visible content`);
                }
            }
        }

        return frameBuffer;
    }

    /**
     * Save frameBuffer to disk for manual inspection
     */
    saveFrameBuffer(frameBuffer, filename) {
        try {
            const filepath = path.join(this.debugOutputDir, filename);

            if (typeof frameBuffer === 'string') {
                if (frameBuffer.startsWith('data:image')) {
                    // Data URL - save as both text and decoded image
                    fs.writeFileSync(filepath + '.dataurl.txt', frameBuffer);
                    console.log(`💾 Data URL saved: ${filepath}.dataurl.txt`);

                    const base64Data = frameBuffer.split(',')[1];
                    if (base64Data) {
                        fs.writeFileSync(filepath + '.png', Buffer.from(base64Data, 'base64'));
                        console.log(`💾 Decoded image saved: ${filepath}.png`);
                    }
                } else {
                    // Assume base64
                    fs.writeFileSync(filepath + '.base64.txt', frameBuffer);
                    fs.writeFileSync(filepath + '.png', Buffer.from(frameBuffer, 'base64'));
                    console.log(`💾 Base64 saved: ${filepath}.base64.txt and ${filepath}.png`);
                }
            } else {
                // Binary data
                const buffer = Buffer.isBuffer(frameBuffer) ? frameBuffer : Buffer.from(frameBuffer);
                fs.writeFileSync(filepath + '.png', buffer);
                console.log(`💾 Binary data saved: ${filepath}.png`);
            }
        } catch (error) {
            console.log(`❌ Failed to save frameBuffer: ${error.message}`);
        }
    }

    /**
     * Test hex effect rendering with detailed inspection
     */
    async testHexRendering() {
        console.log('🟡 TESTING HEX EFFECT RENDERING');
        console.log('=' .repeat(60));

        try {
            await this.setupDebugOutput();

            // Get hex config
            console.log('⚙️ Getting hex config...');
            const configResult = await this.effectsManager.introspectConfig({
                effectName: 'hex',
                projectData: {
                    resolution: { width: 512, height: 512 },
                    colorScheme: 'neon-cyberpunk'
                }
            });

            if (!configResult.success) {
                throw new Error(`Config failed: ${configResult.error}`);
            }

            console.log('✅ Hex config obtained');

            // Create render config
            const renderConfig = {
                width: 512,
                height: 512,
                numFrames: 10,
                effects: [{
                    className: 'hex',
                    config: configResult.defaultInstance
                }],
                colorScheme: 'neon-cyberpunk',
                renderStartFrame: 1,
                renderJumpFrames: 11
            };

            console.log('🎯 Calling renderFrame...');
            const result = await this.projectManager.renderFrame(renderConfig, 1);

            if (!result.success) {
                throw new Error(`Render failed: ${result.error}`);
            }

            console.log('✅ Render successful');

            // Deep inspection of frameBuffer
            this.inspectFrameBuffer(result.frameBuffer, 'Hex Effect Result');

            // Save to disk
            this.saveFrameBuffer(result.frameBuffer, 'hex-framebuffer');

            // Test Canvas.jsx conversion logic
            console.log('\n🔄 TESTING CANVAS.JSX CONVERSION');
            console.log('=' .repeat(60));

            let canvasImageUrl = null;
            const frameBuffer = result.frameBuffer;

            if (typeof frameBuffer === 'string' && frameBuffer.startsWith('data:image')) {
                canvasImageUrl = frameBuffer;
                console.log('✅ Already data URL - direct usage');
            } else if (frameBuffer instanceof ArrayBuffer || frameBuffer instanceof Uint8Array) {
                // This is what Canvas.jsx should do:
                // URL.createObjectURL(new Blob([frameBuffer], { type: 'image/png' }))
                canvasImageUrl = 'blob:simulated';
                console.log('✅ Binary data - would create blob URL');
                console.log('📝 Canvas.jsx should use: URL.createObjectURL(new Blob([frameBuffer], { type: "image/png" }))');
            } else if (typeof frameBuffer === 'string') {
                canvasImageUrl = `data:image/png;base64,${frameBuffer}`;
                console.log('✅ Base64 string - converted to data URL');
            }

            console.log(`🔗 Final image URL: ${canvasImageUrl?.substring(0, 100)}...`);

            // Create test HTML file
            const htmlPath = path.join(this.debugOutputDir, 'test-framebuffer.html');
            let actualImageSrc = canvasImageUrl;

            // For blob URLs in test, use actual data
            if (canvasImageUrl === 'blob:simulated') {
                // Convert to data URL for HTML test
                if (frameBuffer instanceof ArrayBuffer || frameBuffer instanceof Uint8Array) {
                    const buffer = Buffer.from(frameBuffer);
                    const base64 = buffer.toString('base64');
                    actualImageSrc = `data:image/png;base64,${base64}`;
                }
            }

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>FrameBuffer Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #000; color: #fff; }
        .test-container { border: 2px solid #333; padding: 20px; margin: 20px 0; }
        canvas { border: 1px solid #666; margin: 10px; }
        img { border: 1px solid #666; margin: 10px; }
        .info { background: #222; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>FrameBuffer Display Test</h1>

    <div class="info">
        <h3>Test Info:</h3>
        <p>Original frameBuffer type: ${typeof frameBuffer}</p>
        <p>Original frameBuffer size: ${frameBuffer?.length || frameBuffer?.byteLength || 'unknown'} bytes</p>
        <p>Converted to: ${actualImageSrc?.substring(0, 50)}...</p>
    </div>

    <div class="test-container">
        <h3>Direct Image Display</h3>
        <img id="directImage" src="${actualImageSrc}" alt="Direct image" />
        <p id="directStatus">Loading direct image...</p>
    </div>

    <div class="test-container">
        <h3>Canvas Display (simulating Canvas.jsx)</h3>
        <canvas id="testCanvas" width="512" height="512"></canvas>
        <p id="canvasStatus">Loading canvas image...</p>
    </div>

    <script>
        // Test direct image
        const directImg = document.getElementById('directImage');
        const directStatus = document.getElementById('directStatus');

        directImg.onload = () => {
            directStatus.textContent = 'Direct image loaded successfully!';
            directStatus.style.color = 'green';
            console.log('Direct image loaded:', directImg.naturalWidth, 'x', directImg.naturalHeight);
        };

        directImg.onerror = (error) => {
            directStatus.textContent = 'Direct image failed to load';
            directStatus.style.color = 'red';
            console.error('Direct image error:', error);
        };

        // Test canvas (simulating Canvas.jsx)
        const canvas = document.getElementById('testCanvas');
        const ctx = canvas.getContext('2d');
        const canvasStatus = document.getElementById('canvasStatus');

        const canvasImg = new Image();
        canvasImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasImg, 0, 0);
            canvasStatus.textContent = 'Canvas image loaded and drawn successfully!';
            canvasStatus.style.color = 'green';
            console.log('Canvas image loaded and drawn:', canvasImg.naturalWidth, 'x', canvasImg.naturalHeight);
        };

        canvasImg.onerror = (error) => {
            canvasStatus.textContent = 'Canvas image failed to load';
            canvasStatus.style.color = 'red';
            console.error('Canvas image error:', error);
        };

        canvasImg.src = '${actualImageSrc}';
    </script>
</body>
</html>`;

            fs.writeFileSync(htmlPath, htmlContent);
            console.log(`🌐 Test HTML created: file://${htmlPath}`);
            console.log(`   Open this file in a browser to test image display`);

            return {
                success: true,
                frameBuffer: result.frameBuffer,
                canvasImageUrl,
                testFile: htmlPath
            };

        } catch (error) {
            console.log(`❌ Hex rendering test failed: ${error.message}`);
            console.log(`📋 Stack trace:`, error.stack);
            throw error;
        }
    }

    async run() {
        console.log('🔍 FRAMEBUFFER INSPECTOR');
        console.log('=' .repeat(60));
        console.log('This tool inspects the exact frameBuffer content to debug black screen issues.\n');

        try {
            const result = await this.testHexRendering();

            console.log('\n📊 SUMMARY');
            console.log('=' .repeat(60));
            console.log('✅ FrameBuffer inspection completed successfully');
            console.log(`📁 Debug files saved to: ${this.debugOutputDir}`);
            console.log(`🌐 Test HTML: ${result.testFile}`);

            console.log('\n🔍 NEXT STEPS:');
            console.log('1. Check the saved PNG files to verify visual content');
            console.log('2. Open the test HTML file in a browser');
            console.log('3. Check browser console for any image loading errors');
            console.log('4. Compare with actual Canvas.jsx behavior in the app');

            return true;

        } catch (error) {
            console.log(`❌ FrameBuffer inspection failed: ${error.message}`);
            return false;
        }
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const inspector = new FrameBufferInspector();
    inspector.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Inspector execution failed:', error);
        process.exit(1);
    });
}

export default FrameBufferInspector;