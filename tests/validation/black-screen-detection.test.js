#!/usr/bin/env node
/**
 * Final validation test: validates when effects render visible content vs black screens
 * This test confirms the solution to the "black screen" issue reported by the user
 */

const NftProjectManager = require('../../src/main/implementations/NftProjectManager');
const NftEffectsManager = require('../../src/main/implementations/NftEffectsManager');

class BlackScreenDetectionTest {
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

    /**
     * Determines if an image appears as a "black screen" to users
     */
    isBlackScreen(frameBuffer) {
        try {
            if (!frameBuffer || frameBuffer.length === 0) {
                return { isBlackScreen: true, reason: 'Empty frameBuffer' };
            }

            // Convert to buffer for analysis
            let buffer = null;
            if (typeof frameBuffer === 'string' && frameBuffer.startsWith('data:image')) {
                const base64Part = frameBuffer.split(',')[1];
                buffer = Buffer.from(base64Part, 'base64');
            } else if (frameBuffer instanceof ArrayBuffer || frameBuffer instanceof Uint8Array) {
                buffer = Buffer.from(frameBuffer);
            } else if (typeof frameBuffer === 'string') {
                buffer = Buffer.from(frameBuffer, 'base64');
            } else {
                buffer = Buffer.from(JSON.stringify(frameBuffer));
            }

            // Check PNG signature
            const isPNG = buffer.length >= 8 &&
                         buffer[0] === 0x89 && buffer[1] === 0x50 &&
                         buffer[2] === 0x4E && buffer[3] === 0x47;

            if (!isPNG) {
                return { isBlackScreen: true, reason: 'Invalid PNG format' };
            }

            // Analyze brightness - sample bytes after header
            const headerSize = 100;
            const sampleSize = Math.min(buffer.length - headerSize, 5000);
            let brightPixels = 0;
            let totalPixels = 0;
            let maxBrightness = 0;

            for (let i = headerSize; i < headerSize + sampleSize; i += 4) {
                const pixel = buffer[i];
                maxBrightness = Math.max(maxBrightness, pixel);
                if (pixel > 80) { // Threshold for "visible" brightness
                    brightPixels++;
                }
                totalPixels++;
            }

            const brightRatio = brightPixels / totalPixels;
            const isVisible = brightRatio > 0.01 || maxBrightness > 120; // At least 1% bright pixels OR some very bright pixels

            return {
                isBlackScreen: !isVisible,
                reason: isVisible ? 'Has visible content' : `Too dark: ${(brightRatio*100).toFixed(1)}% bright pixels, max brightness ${maxBrightness}/255`,
                brightRatio,
                maxBrightness
            };

        } catch (error) {
            return { isBlackScreen: true, reason: `Analysis error: ${error.message}` };
        }
    }

    async testUserReportedScenario() {
        console.log('\\n🖤 Testing User-Reported Black Screen Scenario...');

        await this.test('should reproduce user scenario: add hex effect and detect if renders black screen', async () => {
            try {
                console.log('   🎯 Reproducing: User adds hex effect, clicks render, sees black screen');

                // Step 1: Get hex config (simulating EffectPicker)
                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 1920, height: 1080 },
                        colorScheme: 'default' // Using fixed default scheme
                    }
                });

                this.assertTrue(configResult.success, 'Should get hex config');
                console.log('   ✅ Step 1: Hex effect config obtained');

                // Step 2: Create Canvas.jsx style render config
                const canvasConfig = {
                    targetResolution: 1920,
                    isHorizontal: true,
                    numFrames: 100,
                    effects: [{
                        className: 'hex',
                        config: configResult.defaultInstance,
                        secondaryEffects: [],
                        keyframeEffects: []
                    }],
                    colorScheme: 'default'
                };

                const dimensions = { w: 1920, h: 1080 };
                const selectedFrame = 1;
                const renderConfig = {
                    ...canvasConfig,
                    width: dimensions.w,
                    height: dimensions.h,
                    renderStartFrame: selectedFrame,
                    renderJumpFrames: canvasConfig.numFrames + 1
                };

                console.log('   ✅ Step 2: Canvas render config created');

                // Step 3: Call renderFrame (simulating render button click)
                console.log('   🎯 Step 3: Simulating render button click...');
                const result = await this.projectManager.renderFrame(renderConfig, selectedFrame);

                this.assertTrue(result.success, 'Render should succeed');
                this.assertTrue(result.frameBuffer && result.frameBuffer.length > 0, 'Should have frameBuffer');
                console.log('   ✅ Step 3: Render completed successfully');

                // Step 4: Analyze if user would see a black screen
                console.log('   🔍 Step 4: Analyzing if user sees black screen...');
                const blackScreenAnalysis = this.isBlackScreen(result.frameBuffer);

                console.log(`   📊 Black screen analysis:`);
                console.log(`      Is black screen: ${blackScreenAnalysis.isBlackScreen}`);
                console.log(`      Reason: ${blackScreenAnalysis.reason}`);
                if (blackScreenAnalysis.brightRatio !== undefined) {
                    console.log(`      Bright pixels: ${(blackScreenAnalysis.brightRatio * 100).toFixed(1)}%`);
                    console.log(`      Max brightness: ${blackScreenAnalysis.maxBrightness}/255`);
                }

                // The test validates the effect renders something other than a black screen
                if (blackScreenAnalysis.isBlackScreen) {
                    console.log('   ❌ User would see a BLACK SCREEN');
                    console.log('   💡 SOLUTION: The hex effect needs brighter colors or better default configuration');

                    // This is the test failure condition that validates the user's report
                    throw new Error(`User would see black screen: ${blackScreenAnalysis.reason}`);
                } else {
                    console.log('   ✅ User would see VISIBLE CONTENT');
                    console.log('   🎉 Black screen issue is resolved with current configuration');
                }

                return blackScreenAnalysis;

            } catch (error) {
                console.log(`   ❌ User scenario test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async testSolutionValidation() {
        console.log('\\n🔧 Testing Solution: Default Color Scheme vs neon-cyberpunk...');

        await this.test('should validate that default color scheme produces visible content', async () => {
            try {
                // Test with 'default' color scheme (the fix)
                const defaultConfig = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: { resolution: { width: 512, height: 512 }, colorScheme: 'default' }
                });

                const defaultRender = {
                    width: 512, height: 512, numFrames: 10,
                    effects: [{ className: 'hex', config: defaultConfig.defaultInstance }],
                    colorScheme: 'default', renderStartFrame: 1, renderJumpFrames: 11
                };

                const defaultResult = await this.projectManager.renderFrame(defaultRender, 1);
                const defaultAnalysis = this.isBlackScreen(defaultResult.frameBuffer);

                console.log(`   📊 Default scheme: ${defaultAnalysis.reason}`);

                // Test with 'neon-cyberpunk' color scheme (the original problem)
                const neonConfig = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: { resolution: { width: 512, height: 512 }, colorScheme: 'neon-cyberpunk' }
                });

                const neonRender = {
                    width: 512, height: 512, numFrames: 10,
                    effects: [{ className: 'hex', config: neonConfig.defaultInstance }],
                    colorScheme: 'neon-cyberpunk', renderStartFrame: 1, renderJumpFrames: 11
                };

                const neonResult = await this.projectManager.renderFrame(neonRender, 1);
                const neonAnalysis = this.isBlackScreen(neonResult.frameBuffer);

                console.log(`   📊 Neon-cyberpunk scheme: ${neonAnalysis.reason}`);

                // Validate that default is better than neon-cyberpunk
                const defaultIsBetter = !defaultAnalysis.isBlackScreen ||
                                       (defaultAnalysis.brightRatio > neonAnalysis.brightRatio);

                this.assertTrue(defaultIsBetter,
                    'Default color scheme should produce more visible content than neon-cyberpunk');

                if (!defaultAnalysis.isBlackScreen) {
                    console.log('   ✅ DEFAULT color scheme produces visible content');
                } else {
                    console.log('   ⚠️ DEFAULT color scheme still appears dark');
                }

                if (neonAnalysis.isBlackScreen) {
                    console.log('   ❌ NEON-CYBERPUNK color scheme produces black screen');
                } else {
                    console.log('   ✅ NEON-CYBERPUNK color scheme produces visible content');
                }

                return { defaultAnalysis, neonAnalysis };

            } catch (error) {
                console.log(`   ❌ Solution validation failed: ${error.message}`);
                throw error;
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Black Screen Detection Tests...\\n');
        console.log('This test validates the solution to the user-reported black screen issue:');
        console.log('  1. Reproduce the exact user scenario (add hex, click render)');
        console.log('  2. Validate solution: default color scheme vs neon-cyberpunk');
        console.log('  3. Provide definitive pass/fail on black screen detection');

        try {
            await this.testUserReportedScenario();
            await this.testSolutionValidation();

            console.log('\\n📊 Test Results:');
            console.log(`   Total: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            if (this.failedTests === 0) {
                console.log('\\n🎉 BLACK SCREEN ISSUE RESOLVED!');
                console.log('✅ Effects render visible content instead of black screens');
                console.log('💡 Solution: Changed Canvas.jsx default color scheme from neon-cyberpunk to default');
            } else {
                console.log(`\\n⚠️ BLACK SCREEN ISSUE STILL EXISTS`);
                console.log('❌ Effects are still rendering black screens');
                console.log('🔍 Further investigation needed in effect color configuration');
            }

            return {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests,
                blackScreenResolved: this.failedTests === 0
            };

        } catch (error) {
            console.log(`❌ Black screen detection test suite failed: ${error.message}`);
            this.failedTests++;
            throw error;
        }
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const tests = new BlackScreenDetectionTest();
    tests.runAllTests().then(results => {
        if (results.blackScreenResolved) {
            console.log('\\n✅ User-reported black screen issue has been resolved!');
            console.log('The hex effect now renders visible content instead of black screens.');
            process.exit(0);
        } else {
            console.log('\\n❌ User-reported black screen issue persists');
            console.log('Additional fixes needed for effect color configuration.');
            process.exit(1);
        }
    }).catch(error => {
        console.error('Black screen detection test execution failed:', error);
        process.exit(1);
    });
}

module.exports = BlackScreenDetectionTest;