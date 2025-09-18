#!/usr/bin/env node
/**
 * Test to find a working bright color scheme that produces visible output
 */

import { fileURLToPath } from 'node:url';
import NftProjectManager from '../../src/main/implementations/NftProjectManager.js';
import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testBrightColors() {
    const projectManager = new NftProjectManager();
    const effectsManager = new NftEffectsManager();

    console.log('🌈 Testing Different Color Schemes for Brightness...\n');

    // Test different color schemes to find a bright one
    const testSchemes = [
        'default',
        'bright',
        'vibrant',
        'rainbow',
        'neon',
        'synthwave',
        'pastel',
        'high-contrast',
        'electric',
        'acid',
        'sunset'
    ];

    const debugDir = path.join(__dirname, '../debug-output');
    if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
    }

    for (const scheme of testSchemes) {
        try {
            console.log(`🎨 Testing "${scheme}" color scheme...`);

            // Get hex config with this color scheme
            const configResult = await effectsManager.introspectConfig({
                effectName: 'hex',
                projectData: {
                    resolution: { width: 512, height: 512 },
                    colorScheme: scheme
                }
            });

            if (!configResult.success) {
                console.log(`   ⚠️ Config failed for ${scheme}: ${configResult.error}`);
                continue;
            }

            // Render with this scheme
            const renderConfig = {
                width: 512,
                height: 512,
                numFrames: 10,
                effects: [{
                    className: 'hex',
                    config: configResult.defaultInstance
                }],
                colorScheme: scheme,
                renderStartFrame: 1,
                renderJumpFrames: 11
            };

            const result = await projectManager.renderFrame(renderConfig, 1);

            if (result.success && result.frameBuffer) {
                // Save the result
                const filename = `hex-${scheme}.png`;
                const filepath = path.join(debugDir, filename);

                let buffer = null;
                if (typeof result.frameBuffer === 'string' && result.frameBuffer.startsWith('data:image')) {
                    const base64Data = result.frameBuffer.split(',')[1];
                    buffer = Buffer.from(base64Data, 'base64');
                } else if (result.frameBuffer instanceof ArrayBuffer || result.frameBuffer instanceof Uint8Array) {
                    buffer = Buffer.from(result.frameBuffer);
                } else if (typeof result.frameBuffer === 'string') {
                    buffer = Buffer.from(result.frameBuffer, 'base64');
                }

                if (buffer) {
                    fs.writeFileSync(filepath, buffer);

                    // Quick brightness analysis
                    let totalBrightness = 0;
                    let sampleCount = 0;
                    const sampleSize = Math.min(buffer.length, 5000);

                    for (let i = 100; i < sampleSize; i += 10) { // Skip header, sample every 10th byte
                        totalBrightness += buffer[i];
                        sampleCount++;
                    }

                    const avgBrightness = totalBrightness / sampleCount;
                    const brightnessPercent = (avgBrightness / 255 * 100).toFixed(1);

                    console.log(`   💾 Saved: ${filename}`);
                    console.log(`   📊 Average brightness: ${avgBrightness.toFixed(1)}/255 (${brightnessPercent}%)`);

                    if (avgBrightness > 50) {
                        console.log(`   ✅ "${scheme}" appears bright enough!`);
                    } else if (avgBrightness > 20) {
                        console.log(`   ⚠️ "${scheme}" is moderately bright`);
                    } else {
                        console.log(`   ❌ "${scheme}" appears very dark`);
                    }
                }
            } else {
                console.log(`   ❌ Render failed for ${scheme}: ${result.error || 'Unknown error'}`);
            }

        } catch (error) {
            console.log(`   ❌ Error testing ${scheme}: ${error.message}`);
        }

        console.log(''); // Empty line for readability
    }

    console.log(`📁 All test images saved to: ${debugDir}`);
    console.log('🔍 Open the PNG files to visually compare brightness levels');

    // Also test with manual bright colors
    console.log('\n🔆 Testing with manually brightened hex config...');

    try {
        const configResult = await effectsManager.introspectConfig({
            effectName: 'hex',
            projectData: {
                resolution: { width: 512, height: 512 },
                colorScheme: 'default'
            }
        });

        if (configResult.success) {
            // Try to manually brighten the config
            const brightConfig = { ...configResult.defaultInstance };

            // Log current config to see what parameters exist
            console.log('   📋 Current hex config parameters:');
            Object.keys(brightConfig).forEach(key => {
                console.log(`      ${key}: ${JSON.stringify(brightConfig[key])}`);
            });

            // Try common brightness parameters
            if (brightConfig.intensity !== undefined) {
                brightConfig.intensity = 1.0;
                console.log('   🔆 Set intensity to 1.0');
            }
            if (brightConfig.brightness !== undefined) {
                brightConfig.brightness = 1.0;
                console.log('   🔆 Set brightness to 1.0');
            }
            if (brightConfig.opacity !== undefined) {
                brightConfig.opacity = 1.0;
                console.log('   🔆 Set opacity to 1.0');
            }
            if (brightConfig.alpha !== undefined) {
                brightConfig.alpha = 1.0;
                console.log('   🔆 Set alpha to 1.0');
            }

            // If there are color properties, try to brighten them
            Object.keys(brightConfig).forEach(key => {
                if (key.toLowerCase().includes('color') && Array.isArray(brightConfig[key])) {
                    // Brighten RGB values
                    brightConfig[key] = brightConfig[key].map(val => Math.min(255, val * 2));
                    console.log(`   🔆 Brightened ${key}: ${JSON.stringify(brightConfig[key])}`);
                }
            });

            const brightRenderConfig = {
                width: 512,
                height: 512,
                numFrames: 10,
                effects: [{
                    className: 'hex',
                    config: brightConfig
                }],
                colorScheme: 'default',
                renderStartFrame: 1,
                renderJumpFrames: 11
            };

            const brightResult = await projectManager.renderFrame(brightRenderConfig, 1);

            if (brightResult.success) {
                const filepath = path.join(debugDir, 'hex-manual-bright.png');
                const buffer = Buffer.from(brightResult.frameBuffer);
                fs.writeFileSync(filepath, buffer);
                console.log(`   💾 Manually brightened hex saved: hex-manual-bright.png`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Manual brightening failed: ${error.message}`);
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testBrightColors().then(() => {
        console.log('\n✅ Brightness testing completed!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Brightness testing failed:', error);
        process.exit(1);
    });
}

export default testBrightColors;