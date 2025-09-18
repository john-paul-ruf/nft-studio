#!/usr/bin/env node
/**
 * Diagnosis test for ColorPicker color bucket issue
 * This test checks if the color bucket system is working correctly
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';
import NftProjectManager from '../../src/main/implementations/NftProjectManager.js';

class ColorBucketDiagnosisTest {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.projectManager = new NftProjectManager();
    }

    async runDiagnosis() {
        console.log('🔍 DIAGNOSING COLORPICKER COLOR BUCKET SYSTEM\n');

        try {
            // Get hex config with current approach
            console.log('📋 1. GETTING HEX CONFIG...');
            const configResult = await this.effectsManager.introspectConfig({
                effectName: 'hex',
                projectData: {
                    resolution: { width: 512, height: 512 },
                    colorScheme: 'default'
                }
            });

            if (!configResult.success) {
                console.log('❌ Failed to get hex config:', configResult.error);
                return;
            }

            const config = configResult.defaultInstance;
            console.log('✅ Got hex config successfully\n');

            // Inspect ColorPicker properties
            console.log('🎨 2. INSPECTING COLORPICKER OBJECTS...');
            ['innerColor', 'outerColor'].forEach(colorProp => {
                const colorObj = config[colorProp];
                if (colorObj) {
                    console.log(`${colorProp}:`);
                    console.log(`  selectionType: ${colorObj.selectionType}`);
                    console.log(`  colorValue: ${JSON.stringify(colorObj.colorValue)}`);
                    console.log(`  getColor function: ${typeof colorObj.getColor}\n`);
                }
            });

            // Test actual rendering to see what colors are used
            console.log('🖼️ 3. TESTING ACTUAL RENDERING...');

            const renderConfig = {
                width: 512,
                height: 512,
                numFrames: 10,
                effects: [{
                    className: 'hex',
                    config: config
                }],
                colorScheme: 'default',
                renderStartFrame: 1,
                renderJumpFrames: 11
            };

            const renderResult = await this.projectManager.renderFrame(renderConfig, 1);

            if (renderResult.success) {
                console.log('✅ Render succeeded');

                // Analyze the frame buffer for color content
                const buffer = Buffer.from(renderResult.frameBuffer);
                let brightPixels = 0;
                let totalPixels = 0;
                let maxBrightness = 0;
                const colorMap = new Map();

                // Sample pixels to analyze colors
                for (let i = 0; i < Math.min(buffer.length - 4, 10000); i += 4) {
                    const r = buffer[i];
                    const g = buffer[i + 1];
                    const b = buffer[i + 2];
                    const brightness = Math.max(r, g, b);

                    maxBrightness = Math.max(maxBrightness, brightness);
                    if (brightness > 50) brightPixels++;
                    totalPixels++;

                    // Track unique colors
                    const colorKey = `${r},${g},${b}`;
                    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
                }

                const brightRatio = brightPixels / totalPixels;
                console.log(`📊 Render analysis:`);
                console.log(`  Bright pixels: ${(brightRatio * 100).toFixed(1)}%`);
                console.log(`  Max brightness: ${maxBrightness}/255`);
                console.log(`  Unique colors found: ${colorMap.size}`);

                // Show top colors
                const topColors = Array.from(colorMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                console.log(`  Top 5 colors:`);
                topColors.forEach(([color, count]) => {
                    console.log(`    RGB(${color}): ${count} pixels`);
                });

                if (brightRatio < 0.05 && maxBrightness < 50) {
                    console.log('❌ ISSUE CONFIRMED: Mostly black/dark pixels');
                } else {
                    console.log('✅ Colors are being rendered');
                }
            } else {
                console.log('❌ Render failed:', renderResult.error);
            }

            // Test what happens with manual color override
            console.log('\n🔧 4. TESTING MANUAL COLOR OVERRIDE...');

            // Clone config and override colors
            const fixedConfig = JSON.parse(JSON.stringify(config));

            if (fixedConfig.innerColor) {
                // Test 1: Change selectionType to 'color' and set colorValue
                fixedConfig.innerColor.selectionType = 'color';
                fixedConfig.innerColor.colorValue = '#ff0000'; // Red
                console.log('✅ Set innerColor to direct color mode with red');
            }

            if (fixedConfig.outerColor) {
                fixedConfig.outerColor.selectionType = 'color';
                fixedConfig.outerColor.colorValue = '#00ff00'; // Green
                console.log('✅ Set outerColor to direct color mode with green');
            }

            // Render with fixed config
            const fixedRenderConfig = {
                ...renderConfig,
                effects: [{
                    className: 'hex',
                    config: fixedConfig
                }]
            };

            const fixedRenderResult = await this.projectManager.renderFrame(fixedRenderConfig, 1);

            if (fixedRenderResult.success) {
                console.log('✅ Fixed render succeeded');

                const fixedBuffer = Buffer.from(fixedRenderResult.frameBuffer);
                let fixedBrightPixels = 0;
                let fixedTotalPixels = 0;
                let fixedMaxBrightness = 0;

                for (let i = 0; i < Math.min(fixedBuffer.length - 4, 10000); i += 4) {
                    const pixel = Math.max(fixedBuffer[i], fixedBuffer[i + 1], fixedBuffer[i + 2]);
                    fixedMaxBrightness = Math.max(fixedMaxBrightness, pixel);
                    if (pixel > 50) fixedBrightPixels++;
                    fixedTotalPixels++;
                }

                const fixedBrightRatio = fixedBrightPixels / fixedTotalPixels;
                console.log(`📊 Fixed render analysis:`);
                console.log(`  Bright pixels: ${(fixedBrightRatio * 100).toFixed(1)}%`);
                console.log(`  Max brightness: ${fixedMaxBrightness}/255`);

                if (fixedBrightRatio > brightRatio) {
                    console.log('🎉 MANUAL FIX IMPROVED VISIBILITY!');
                    console.log('💡 The issue is with the color bucket system');
                } else {
                    console.log('⚠️ Manual fix didn\'t improve much');
                }
            } else {
                console.log('❌ Fixed render failed:', fixedRenderResult.error);
            }

            console.log('\n💡 DIAGNOSIS SUMMARY:');
            console.log('=====================================');
            console.log('The black screen issue is likely caused by:');
            console.log('1. ColorPicker objects use selectionType: "color-bucket"');
            console.log('2. The color bucket in the ColorScheme is empty or undefined');
            console.log('3. getColorFromBucket() returns undefined');
            console.log('4. Effects render with no colors (black screen)');
            console.log('\n🔧 POTENTIAL SOLUTIONS:');
            console.log('A) Change ColorPicker selectionType to "color" + set colorValue');
            console.log('B) Populate the ColorScheme colorBucket with actual colors');
            console.log('C) Provide fallback colors when getColorFromBucket() returns undefined');

        } catch (error) {
            console.error('❌ Diagnosis failed:', error.message);
            console.error('Stack:', error.stack);
        }
    }
}

// Run diagnosis if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const diagnosis = new ColorBucketDiagnosisTest();
    diagnosis.runDiagnosis().then(() => {
        console.log('\n✅ Color bucket diagnosis completed');
    }).catch(error => {
        console.error('❌ Diagnosis execution failed:', error);
        process.exit(1);
    });
}

export default ColorBucketDiagnosisTest;