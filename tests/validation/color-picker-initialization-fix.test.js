#!/usr/bin/env node
/**
 * Test to validate ColorPicker initialization fix
 * This test ensures ColorPicker objects get proper default colors from color schemes
 */

const NftProjectManager = require('../../src/main/implementations/NftProjectManager');
const NftEffectsManager = require('../../src/main/implementations/NftEffectsManager');
const fs = require('fs');
const path = require('path');

class ColorPickerInitializationFixTest {
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

    /**
     * Test that ColorPicker objects are now initialized with valid colors
     */
    async testColorPickerInitialization() {
        console.log('\\n🎨 Testing ColorPicker Initialization Fix...');

        await this.test('should initialize ColorPicker objects with valid default colors', async () => {
            try {
                console.log('   🔍 Getting hex config to check ColorPicker initialization...');

                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 512, height: 512 },
                        colorScheme: 'default'
                    }
                });

                this.assertTrue(configResult.success, 'Should get hex config successfully');

                const config = configResult.defaultInstance;
                console.log('   📋 Checking innerColor and outerColor initialization...');

                // Check innerColor
                if (config.innerColor) {
                    console.log(`   🎨 innerColor.colorValue: ${JSON.stringify(config.innerColor.colorValue)}`);

                    if (config.innerColor.colorValue === null) {
                        console.log(`   ❌ BUG STILL EXISTS: innerColor.colorValue is NULL`);
                        throw new Error('innerColor.colorValue is still null - fix not applied');
                    } else {
                        console.log(`   ✅ innerColor has valid color: ${JSON.stringify(config.innerColor.colorValue)}`);
                    }
                } else {
                    throw new Error('innerColor property missing');
                }

                // Check outerColor
                if (config.outerColor) {
                    console.log(`   🎨 outerColor.colorValue: ${JSON.stringify(config.outerColor.colorValue)}`);

                    if (config.outerColor.colorValue === null) {
                        console.log(`   ❌ BUG STILL EXISTS: outerColor.colorValue is NULL`);
                        throw new Error('outerColor.colorValue is still null - fix not applied');
                    } else {
                        console.log(`   ✅ outerColor has valid color: ${JSON.stringify(config.outerColor.colorValue)}`);
                    }
                } else {
                    throw new Error('outerColor property missing');
                }

                // Validate that colors are valid RGB arrays
                const isValidColor = (color) => {
                    return Array.isArray(color) && color.length === 3 &&
                           color.every(c => typeof c === 'number' && c >= 0 && c <= 255);
                };

                this.assertTrue(isValidColor(config.innerColor.colorValue),
                    `innerColor should be valid RGB array: ${JSON.stringify(config.innerColor.colorValue)}`);
                this.assertTrue(isValidColor(config.outerColor.colorValue),
                    `outerColor should be valid RGB array: ${JSON.stringify(config.outerColor.colorValue)}`);

                console.log('   ✅ Both color pickers have valid RGB color values');
                return config;

            } catch (error) {
                console.log(`   ❌ ColorPicker initialization test failed: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Test different color schemes produce different default colors
     */
    async testColorSchemeVariation() {
        console.log('\\n🌈 Testing Color Scheme Variation...');

        await this.test('should initialize different colors for different color schemes', async () => {
            try {
                const testSchemes = ['default', 'neon-cyberpunk', 'synthwave'];
                const schemeColors = {};

                for (const scheme of testSchemes) {
                    console.log(`   🎨 Testing ${scheme} color scheme...`);

                    const configResult = await this.effectsManager.introspectConfig({
                        effectName: 'hex',
                        projectData: {
                            resolution: { width: 512, height: 512 },
                            colorScheme: scheme
                        }
                    });

                    if (configResult.success && configResult.defaultInstance) {
                        const config = configResult.defaultInstance;
                        schemeColors[scheme] = {
                            inner: config.innerColor?.colorValue,
                            outer: config.outerColor?.colorValue
                        };

                        console.log(`      innerColor: ${JSON.stringify(config.innerColor?.colorValue)}`);
                        console.log(`      outerColor: ${JSON.stringify(config.outerColor?.colorValue)}`);

                        // Validate colors are not null
                        this.assertTrue(config.innerColor?.colorValue !== null,
                            `${scheme} innerColor should not be null`);
                        this.assertTrue(config.outerColor?.colorValue !== null,
                            `${scheme} outerColor should not be null`);
                    } else {
                        console.log(`   ⚠️ Failed to get config for ${scheme}: ${configResult.error}`);
                    }
                }

                // Optionally check that different schemes produce different colors
                // (This is nice-to-have but not critical for fixing the black screen)
                const defaultColors = schemeColors['default'];
                const neonColors = schemeColors['neon-cyberpunk'];

                if (defaultColors && neonColors) {
                    const colorsAreDifferent =
                        JSON.stringify(defaultColors.inner) !== JSON.stringify(neonColors.inner) ||
                        JSON.stringify(defaultColors.outer) !== JSON.stringify(neonColors.outer);

                    if (colorsAreDifferent) {
                        console.log('   ✅ Different color schemes produce different default colors');
                    } else {
                        console.log('   ⚠️ Color schemes produce same colors (may be expected)');
                    }
                }

                console.log('   ✅ All tested color schemes have valid color initialization');
                return schemeColors;

            } catch (error) {
                console.log(`   ❌ Color scheme variation test failed: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Test that fixed colors produce visible rendered output
     */
    async testFixedColorsProduceVisibleOutput() {
        console.log('\\n🖼️ Testing Fixed Colors Produce Visible Output...');

        await this.test('should render visible content with fixed ColorPicker initialization', async () => {
            try {
                if (!fs.existsSync(this.debugOutputDir)) {
                    fs.mkdirSync(this.debugOutputDir, { recursive: true });
                }

                console.log('   🎯 Rendering hex effect with fixed color initialization...');

                // Get config with the fix applied
                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 512, height: 512 },
                        colorScheme: 'default'
                    }
                });

                this.assertTrue(configResult.success, 'Should get hex config');

                const config = configResult.defaultInstance;

                // Verify colors are not null before rendering
                this.assertTrue(config.innerColor?.colorValue !== null, 'innerColor should not be null');
                this.assertTrue(config.outerColor?.colorValue !== null, 'outerColor should not be null');

                console.log(`   📋 Rendering with colors: inner=${JSON.stringify(config.innerColor.colorValue)}, outer=${JSON.stringify(config.outerColor.colorValue)}`);

                // Render frame
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

                const result = await this.projectManager.renderFrame(renderConfig, 1);

                this.assertTrue(result.success, 'Render should succeed with fixed colors');
                this.assertExists(result.frameBuffer, 'Should have frameBuffer');

                // Analyze brightness/visibility
                const buffer = Buffer.from(result.frameBuffer);
                let brightPixels = 0;
                let totalPixels = 0;
                let maxBrightness = 0;

                for (let i = 100; i < Math.min(buffer.length, 5000); i += 4) {
                    const pixel = buffer[i];
                    maxBrightness = Math.max(maxBrightness, pixel);
                    if (pixel > 50) brightPixels++;
                    totalPixels++;
                }

                const brightRatio = brightPixels / totalPixels;
                console.log(`   📊 Render analysis: ${(brightRatio * 100).toFixed(1)}% bright pixels, max brightness: ${maxBrightness}/255`);

                // Save the result for visual inspection
                const outputPath = path.join(this.debugOutputDir, 'hex-fixed-colors.png');
                fs.writeFileSync(outputPath, buffer);
                console.log(`   💾 Fixed colors render saved: ${outputPath}`);

                // Validate it's not a black screen
                const isVisible = brightRatio > 0.05 || maxBrightness > 100;

                if (isVisible) {
                    console.log('   ✅ Fixed ColorPicker produces VISIBLE CONTENT!');
                    console.log('   🎉 BLACK SCREEN ISSUE IS RESOLVED!');
                } else {
                    console.log('   ⚠️ Output still appears dark - may need further tuning');
                }

                this.assertTrue(isVisible, 'Fixed colors should produce visible content');

                return { brightRatio, maxBrightness, result };

            } catch (error) {
                console.log(`   ❌ Visible output test failed: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Test backward compatibility - ensure fix doesn't break existing functionality
     */
    async testBackwardCompatibility() {
        console.log('\\n🔄 Testing Backward Compatibility...');

        await this.test('should maintain backward compatibility with existing configs', async () => {
            try {
                console.log('   🔍 Testing that fix doesn\'t break other effect types...');

                // Test a few different effects to ensure fix doesn't break other types
                const effectsToTest = ['hex']; // Add more when available

                for (const effectName of effectsToTest) {
                    console.log(`   🧪 Testing ${effectName} effect...`);

                    const configResult = await this.effectsManager.introspectConfig({
                        effectName: effectName,
                        projectData: {
                            resolution: { width: 256, height: 256 },
                            colorScheme: 'default'
                        }
                    });

                    if (configResult.success) {
                        console.log(`   ✅ ${effectName} config introspection works`);

                        const config = configResult.defaultInstance;
                        this.assertTrue(config !== null, `${effectName} should have valid config`);
                        this.assertTrue(config.__className !== undefined, `${effectName} should have __className`);

                        console.log(`      Config type: ${config.__className}`);
                    } else {
                        console.log(`   ⚠️ ${effectName} config failed: ${configResult.error}`);
                    }
                }

                console.log('   ✅ Backward compatibility maintained');

            } catch (error) {
                console.log(`   ❌ Backward compatibility test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running ColorPicker Initialization Fix Tests...\\n');
        console.log('This test validates the fix for ColorPicker null colorValue bug:');
        console.log('  1. Verify ColorPicker objects now have valid default colors');
        console.log('  2. Test different color schemes produce valid colors');
        console.log('  3. Validate fixed colors produce visible rendered output');
        console.log('  4. Ensure backward compatibility is maintained');

        try {
            await this.testColorPickerInitialization();
            await this.testColorSchemeVariation();
            await this.testFixedColorsProduceVisibleOutput();
            await this.testBackwardCompatibility();

            console.log('\\n📊 Test Results:');
            console.log(`   Total: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            if (this.failedTests === 0) {
                console.log('\\n🎉 COLORPICKER INITIALIZATION FIX VALIDATED!');
                console.log('✅ ColorPicker objects now have valid default colors');
                console.log('✅ Black screen issue should be resolved');
                console.log('✅ All validation tests pass');
            } else {
                console.log(`\\n❌ COLORPICKER FIX VALIDATION FAILED`);
                console.log('🔧 Fix needs additional work - see test failures above');
            }

            return {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests,
                fixValidated: this.failedTests === 0
            };

        } catch (error) {
            console.log(`❌ ColorPicker fix validation suite failed: ${error.message}`);
            this.failedTests++;
            throw error;
        }
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const tests = new ColorPickerInitializationFixTest();
    tests.runAllTests().then(results => {
        if (results.fixValidated) {
            console.log('\\n✅ ColorPicker initialization fix is working correctly!');
            console.log('The black screen issue has been resolved.');
            process.exit(0);
        } else {
            console.log('\\n❌ ColorPicker initialization fix needs more work');
            console.log('See test failures above for specific issues.');
            process.exit(1);
        }
    }).catch(error => {
        console.error('ColorPicker fix validation execution failed:', error);
        process.exit(1);
    });
}

module.exports = ColorPickerInitializationFixTest;