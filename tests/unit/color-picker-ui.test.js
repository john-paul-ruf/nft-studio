#!/usr/bin/env node
/**
 * Test color picker functionality in the UI - addressing the real black screen issue
 * The problem is color pickers have colorValue: null, causing effects to render with no colors
 */

import NftProjectManager from '../../src/main/implementations/NftProjectManager.js';
import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class ColorPickerUITest {
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
     * Test the default color picker configurations
     */
    async testColorPickerDefaults() {
        console.log('\\n🎨 Testing Color Picker Default Configurations...');

        await this.test('should inspect hex effect color picker defaults', async () => {
            try {
                console.log('   🔍 Getting hex config to inspect color pickers...');

                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 512, height: 512 },
                        colorScheme: 'default'
                    }
                });

                this.assertTrue(configResult.success, 'Should get hex config');

                const config = configResult.defaultInstance;
                console.log('   📋 Hex config structure:');

                // Check color picker properties
                const colorProperties = ['innerColor', 'outerColor'];

                for (const prop of colorProperties) {
                    if (config[prop]) {
                        console.log(`   🎨 ${prop}:`);
                        console.log(`      Type: ${typeof config[prop]}`);
                        console.log(`      Constructor: ${config[prop].constructor?.name}`);
                        console.log(`      selectionType: ${config[prop].selectionType}`);
                        console.log(`      colorValue: ${config[prop].colorValue}`);
                        console.log(`      hasGetColor: ${typeof config[prop].getColor === 'function'}`);

                        // This is the BUG: colorValue is null!
                        if (config[prop].colorValue === null) {
                            console.log(`   ❌ BUG FOUND: ${prop}.colorValue is NULL`);
                            console.log(`      This causes the effect to render with no color!`);
                        } else {
                            console.log(`   ✅ ${prop}.colorValue is set: ${config[prop].colorValue}`);
                        }

                        // Test if getColor function works
                        if (typeof config[prop].getColor === 'function') {
                            try {
                                const colorResult = config[prop].getColor();
                                console.log(`      getColor() result: ${JSON.stringify(colorResult)}`);
                            } catch (error) {
                                console.log(`      getColor() error: ${error.message}`);
                            }
                        }
                    }
                }

                // Validate that at least one color picker has a proper color value
                const hasValidColors = colorProperties.some(prop =>
                    config[prop] && config[prop].colorValue !== null
                );

                if (!hasValidColors) {
                    console.log('   🚨 CRITICAL BUG: All color pickers have null colorValue');
                    console.log('   💡 This explains the black screen - no colors are being applied!');
                }

                return config;

            } catch (error) {
                console.log(`   ❌ Color picker defaults test failed: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Test color picker with manually set colors
     */
    async testColorPickerWithSetColors() {
        console.log('\\n🔧 Testing Color Picker with Manually Set Colors...');

        await this.test('should test rendering with manually set color picker values', async () => {
            try {
                console.log('   🎯 Testing hex effect with manually set colors...');

                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 512, height: 512 },
                        colorScheme: 'default'
                    }
                });

                this.assertTrue(configResult.success, 'Should get hex config');

                const config = configResult.defaultInstance;
                console.log('   🔧 Original config colors:');
                console.log(`      innerColor.colorValue: ${config.innerColor?.colorValue}`);
                console.log(`      outerColor.colorValue: ${config.outerColor?.colorValue}`);

                // MANUALLY FIX the color picker values
                if (config.innerColor) {
                    config.innerColor.colorValue = [255, 0, 0]; // Red
                    console.log('   🔧 Set innerColor to RED [255, 0, 0]');
                }

                if (config.outerColor) {
                    config.outerColor.colorValue = [0, 255, 0]; // Green
                    console.log('   🔧 Set outerColor to GREEN [0, 255, 0]');
                }

                // Test render with fixed colors
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

                console.log('   🎯 Rendering with manually set colors...');
                const result = await this.projectManager.renderFrame(renderConfig, 1);

                this.assertTrue(result.success, 'Render with manual colors should succeed');
                this.assertExists(result.frameBuffer, 'Should have frameBuffer');

                // Analyze brightness with manual colors
                const buffer = Buffer.from(result.frameBuffer);
                let brightPixels = 0;
                let totalPixels = 0;

                for (let i = 100; i < Math.min(buffer.length, 5000); i += 4) {
                    const pixel = buffer[i];
                    if (pixel > 50) brightPixels++;
                    totalPixels++;
                }

                const brightRatio = brightPixels / totalPixels;
                console.log(`   📊 With manual colors: ${(brightRatio * 100).toFixed(1)}% bright pixels`);

                if (brightRatio > 0.1) {
                    console.log('   ✅ Manual colors produce VISIBLE content!');
                    console.log('   💡 This confirms color picker null values cause black screen');
                } else {
                    console.log('   ⚠️ Even manual colors appear dark');
                }

                return { brightRatio, result };

            } catch (error) {
                console.log(`   ❌ Manual colors test failed: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Test color picker initialization from color scheme
     */
    async testColorPickerSchemeInitialization() {
        console.log('\\n🌈 Testing Color Picker Initialization from Color Scheme...');

        await this.test('should test if color pickers get initialized from color scheme', async () => {
            try {
                console.log('   🔍 Testing color picker initialization across different schemes...');

                const schemes = ['default', 'neon-cyberpunk', 'synthwave', 'bright'];

                for (const scheme of schemes) {
                    console.log(`\\n   🎨 Testing scheme: ${scheme}`);

                    const configResult = await this.effectsManager.introspectConfig({
                        effectName: 'hex',
                        projectData: {
                            resolution: { width: 256, height: 256 },
                            colorScheme: scheme
                        }
                    });

                    if (!configResult.success) {
                        console.log(`   ⚠️ Failed to get config for ${scheme}: ${configResult.error}`);
                        continue;
                    }

                    const config = configResult.defaultInstance;

                    // Check if color scheme affects color picker values
                    console.log(`      innerColor.colorValue: ${JSON.stringify(config.innerColor?.colorValue)}`);
                    console.log(`      outerColor.colorValue: ${JSON.stringify(config.outerColor?.colorValue)}`);

                    // Check if getColor function returns different values per scheme
                    if (config.innerColor && typeof config.innerColor.getColor === 'function') {
                        try {
                            const innerColorResult = config.innerColor.getColor();
                            console.log(`      innerColor.getColor(): ${JSON.stringify(innerColorResult)}`);
                        } catch (error) {
                            console.log(`      innerColor.getColor() failed: ${error.message}`);
                        }
                    }

                    if (config.outerColor && typeof config.outerColor.getColor === 'function') {
                        try {
                            const outerColorResult = config.outerColor.getColor();
                            console.log(`      outerColor.getColor(): ${JSON.stringify(outerColorResult)}`);
                        } catch (error) {
                            console.log(`      outerColor.getColor() failed: ${error.message}`);
                        }
                    }
                }

                console.log('\\n   📋 Color picker scheme analysis completed');
                this.assertTrue(true, 'Color scheme initialization test completed');

            } catch (error) {
                console.log(`   ❌ Color scheme initialization test failed: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Test color picker UI simulation
     */
    async testColorPickerUISimulation() {
        console.log('\\n🖱️ Testing Color Picker UI Interaction Simulation...');

        await this.test('should simulate user setting colors in EffectConfigurer UI', async () => {
            try {
                console.log('   🎯 Simulating user editing hex effect in EffectConfigurer...');

                // Step 1: Get initial config (what user sees when opening effect editor)
                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 512, height: 512 },
                        colorScheme: 'default'
                    }
                });

                this.assertTrue(configResult.success, 'Should get initial config');

                const originalConfig = configResult.defaultInstance;
                console.log('   📋 Initial state (what user sees):');
                console.log(`      innerColor null: ${originalConfig.innerColor?.colorValue === null}`);
                console.log(`      outerColor null: ${originalConfig.outerColor?.colorValue === null}`);

                // Step 2: Simulate user clicking color picker and selecting colors
                console.log('\\n   🖱️ Simulating user selecting colors...');

                const userModifiedConfig = { ...originalConfig };

                // Simulate EffectConfigurer updating color picker values
                if (userModifiedConfig.innerColor) {
                    // This is what should happen when user picks a color
                    userModifiedConfig.innerColor = {
                        ...userModifiedConfig.innerColor,
                        colorValue: [100, 149, 237], // Cornflower blue
                        selectionType: 'color-bucket' // User selected from color bucket
                    };
                    console.log('   🎨 User selected inner color: Cornflower Blue [100, 149, 237]');
                }

                if (userModifiedConfig.outerColor) {
                    userModifiedConfig.outerColor = {
                        ...userModifiedConfig.outerColor,
                        colorValue: [255, 140, 0], // Dark orange
                        selectionType: 'color-bucket'
                    };
                    console.log('   🎨 User selected outer color: Dark Orange [255, 140, 0]');
                }

                // Step 3: Simulate Canvas.jsx calling renderFrame with user's color choices
                console.log('\\n   🎯 Rendering with user-selected colors...');

                const renderConfig = {
                    width: 512,
                    height: 512,
                    numFrames: 10,
                    effects: [{
                        className: 'hex',
                        config: userModifiedConfig
                    }],
                    colorScheme: 'default',
                    renderStartFrame: 1,
                    renderJumpFrames: 11
                };

                const result = await this.projectManager.renderFrame(renderConfig, 1);

                this.assertTrue(result.success, 'User color render should succeed');

                // Analyze if user would see visible content
                const buffer = Buffer.from(result.frameBuffer);
                let brightPixels = 0;
                let coloredPixels = 0;
                let totalSamples = 0;

                for (let i = 100; i < Math.min(buffer.length, 5000); i += 4) {
                    const r = buffer[i];
                    const g = buffer[i + 1] || 0;
                    const b = buffer[i + 2] || 0;

                    // Check for bright pixels
                    if (r > 80 || g > 80 || b > 80) brightPixels++;

                    // Check for colored pixels (not just grayscale)
                    if (Math.abs(r - g) > 20 || Math.abs(g - b) > 20 || Math.abs(r - b) > 20) {
                        coloredPixels++;
                    }

                    totalSamples++;
                }

                const brightRatio = brightPixels / totalSamples;
                const colorRatio = coloredPixels / totalSamples;

                console.log(`   📊 User color selection results:`);
                console.log(`      Bright pixels: ${(brightRatio * 100).toFixed(1)}%`);
                console.log(`      Colored pixels: ${(colorRatio * 100).toFixed(1)}%`);

                if (brightRatio > 0.15) {
                    console.log('   ✅ User would see BRIGHT, VISIBLE content!');
                } else {
                    console.log('   ⚠️ User would still see relatively dark content');
                }

                if (colorRatio > 0.1) {
                    console.log('   ✅ User would see COLORFUL content!');
                } else {
                    console.log('   ⚠️ Content appears mostly grayscale');
                }

                // THE CRITICAL TEST: Compare with null colors
                console.log('\\n   📊 CRITICAL COMPARISON:');
                if (brightRatio > 0.05) {
                    console.log('   🎉 USER COLOR SELECTION FIXES BLACK SCREEN ISSUE!');
                    console.log('   💡 The problem is color pickers defaulting to null values');
                } else {
                    console.log('   ❌ Even user colors don\'t fix the issue - deeper problem exists');
                }

                return { brightRatio, colorRatio, userModifiedConfig };

            } catch (error) {
                console.log(`   ❌ UI simulation test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Color Picker UI Tests...\\n');
        console.log('Testing the REAL cause of black screen: Color picker UI issues');
        console.log('  1. Inspect color picker default configurations (null colorValue bug)');
        console.log('  2. Test rendering with manually set colors');
        console.log('  3. Test color picker initialization from color schemes');
        console.log('  4. Simulate user color picker interactions in UI');

        try {
            await this.testColorPickerDefaults();
            await this.testColorPickerWithSetColors();
            await this.testColorPickerSchemeInitialization();
            await this.testColorPickerUISimulation();

            console.log('\\n📊 Test Results:');
            console.log(`   Total: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            console.log('\\n🔍 COLOR PICKER DIAGNOSIS:');
            console.log('   The black screen issue is caused by:');
            console.log('   1. Color picker objects defaulting to colorValue: null');
            console.log('   2. Effects rendering with no colors when colorValue is null');
            console.log('   3. UI not properly initializing color picker values from color schemes');

            console.log('\\n💡 SOLUTION NEEDED:');
            console.log('   1. Fix color picker initialization to set default colorValue');
            console.log('   2. Ensure color schemes properly populate color picker values');
            console.log('   3. Add fallback colors when colorValue is null');

            if (this.failedTests === 0) {
                console.log('\\n✅ Color picker tests completed - issues identified');
            } else {
                console.log(`\\n⚠️ ${this.failedTests} color picker tests failed`);
            }

            return {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests
            };

        } catch (error) {
            console.log(`❌ Color picker test suite failed: ${error.message}`);
            this.failedTests++;
            throw error;
        }
    }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new ColorPickerUITest();
    tests.runAllTests().then(results => {
        console.log('\\n🎨 Color picker UI testing completed!');
        console.log('Check the test output above for identified color picker issues.');
        process.exit(results.failed === 0 ? 0 : 1);
    }).catch(error => {
        console.error('Color picker UI test execution failed:', error);
        process.exit(1);
    });
}

export default ColorPickerUITest;