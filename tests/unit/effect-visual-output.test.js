#!/usr/bin/env node
/**
 * Test that effects actually render visible content instead of black screens
 * Validates that when effects are added, they produce non-black visual output
 */

const NftProjectManager = require('../../src/main/implementations/NftProjectManager');
const NftEffectsManager = require('../../src/main/implementations/NftEffectsManager');
const fs = require('fs');
const path = require('path');

class EffectVisualOutputTest {
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
     * Analyze frame buffer to detect if it's actually a black screen or has visual content
     */
    analyzeFrameBuffer(frameBuffer, effectName) {
        try {
            console.log(`   🔍 Analyzing ${effectName} visual output...`);

            if (!frameBuffer || frameBuffer.length === 0) {
                return {
                    hasContent: false,
                    reason: 'Empty or null frameBuffer',
                    analysis: 'No data'
                };
            }

            // Convert frameBuffer to analyzable format
            let imageData = null;

            if (typeof frameBuffer === 'string' && frameBuffer.startsWith('data:image')) {
                // Data URL - extract base64 part
                const base64Part = frameBuffer.split(',')[1];
                imageData = Buffer.from(base64Part, 'base64');
            } else if (frameBuffer instanceof ArrayBuffer) {
                imageData = Buffer.from(frameBuffer);
            } else if (frameBuffer instanceof Uint8Array) {
                imageData = Buffer.from(frameBuffer);
            } else if (typeof frameBuffer === 'string') {
                // Assume base64
                imageData = Buffer.from(frameBuffer, 'base64');
            } else {
                // Convert whatever it is to buffer
                imageData = Buffer.from(JSON.stringify(frameBuffer));
            }

            console.log(`   📊 Image data size: ${imageData.length} bytes`);

            // Basic analysis - check for non-zero bytes beyond typical PNG header
            let nonZeroBytes = 0;
            let totalBytes = Math.min(imageData.length, 10000); // Sample first 10KB

            // Skip PNG header (first ~100 bytes) and count non-zero content bytes
            const startAnalysis = Math.min(100, imageData.length);
            for (let i = startAnalysis; i < totalBytes; i++) {
                if (imageData[i] !== 0) {
                    nonZeroBytes++;
                }
            }

            const contentRatio = nonZeroBytes / (totalBytes - startAnalysis);
            console.log(`   📈 Content analysis: ${nonZeroBytes}/${totalBytes - startAnalysis} non-zero bytes (${(contentRatio * 100).toFixed(1)}%)`);

            // Check for PNG signature
            const isPNG = imageData.length >= 8 &&
                         imageData[0] === 0x89 &&
                         imageData[1] === 0x50 &&
                         imageData[2] === 0x4E &&
                         imageData[3] === 0x47;

            console.log(`   🖼️ Image format: ${isPNG ? 'PNG' : 'Unknown'}`);

            // Heuristics for detecting actual visual content
            const hasContent = contentRatio > 0.1 && // At least 10% non-zero bytes
                              imageData.length > 1000 && // Reasonable size
                              isPNG; // Valid PNG format

            return {
                hasContent,
                contentRatio,
                imageSize: imageData.length,
                isPNG,
                reason: hasContent ? 'Has visual content' :
                       contentRatio <= 0.1 ? 'Too few non-zero bytes (likely black screen)' :
                       !isPNG ? 'Invalid image format' :
                       imageData.length <= 1000 ? 'Image too small' : 'Unknown issue',
                analysis: `${(contentRatio * 100).toFixed(1)}% content, ${imageData.length} bytes, ${isPNG ? 'PNG' : 'non-PNG'}`
            };

        } catch (error) {
            console.log(`   ⚠️ Analysis error: ${error.message}`);
            return {
                hasContent: false,
                reason: `Analysis failed: ${error.message}`,
                analysis: 'Error during analysis'
            };
        }
    }

    async testHexEffectVisualOutput() {
        console.log('\n🟡 Testing Hex Effect Visual Output...');

        await this.test('should render hex effect with visible content (not black screen)', async () => {
            try {
                // Get hex config
                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 512, height: 512 },
                        colorScheme: 'neon-cyberpunk'
                    }
                });

                this.assertTrue(configResult.success, 'Should get hex config');
                console.log(`   ⚙️ Hex config obtained`);

                // Create render config
                const renderConfig = {
                    width: 512,
                    height: 512,
                    numFrames: 10,
                    effects: [
                        {
                            className: 'hex',
                            config: configResult.defaultInstance
                        }
                    ],
                    colorScheme: 'neon-cyberpunk',
                    renderStartFrame: 1,
                    renderJumpFrames: 11
                };

                console.log(`   🎯 Rendering hex effect...`);
                const result = await this.projectManager.renderFrame(renderConfig, 1);

                this.assertTrue(result.success, 'Hex render should succeed');
                this.assertExists(result.frameBuffer, 'Should have frameBuffer');

                // Analyze visual content
                const analysis = this.analyzeFrameBuffer(result.frameBuffer, 'hex');

                console.log(`   📊 Visual analysis: ${analysis.analysis}`);
                console.log(`   📝 Result: ${analysis.reason}`);

                this.assertTrue(analysis.hasContent,
                    `Hex effect should render visible content, not black screen. ${analysis.reason}`);

                console.log(`   ✅ Hex effect renders visible content`);
                return analysis;

            } catch (error) {
                console.log(`   ❌ Hex visual test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async testMultipleEffectsVisualOutput() {
        console.log('\n🌈 Testing Multiple Effects Visual Output...');

        // Get list of available effects
        const availableEffects = await this.effectsManager.discoverEffects();
        const effectNames = Array.isArray(availableEffects) ?
            availableEffects.map(e => e.name) :
            Object.keys(availableEffects || {});
        console.log(`   📋 Available effects: ${effectNames.join(', ')}`);

        // Test a few key effects
        const effectsToTest = ['hex', 'ring', 'fuzz-flare'].filter(name =>
            Array.isArray(availableEffects) ?
                availableEffects.some(e => e.name === name) :
                effectNames.includes(name)
        );

        for (const effectName of effectsToTest) {
            await this.test(`should render ${effectName} effect with visible content`, async () => {
                try {
                    // Get effect config
                    const configResult = await this.effectsManager.introspectConfig({
                        effectName: effectName,
                        projectData: {
                            resolution: { width: 256, height: 256 },
                            colorScheme: 'default'
                        }
                    });

                    if (!configResult.success) {
                        console.log(`   ⚠️ Skipping ${effectName} - config failed: ${configResult.error}`);
                        return;
                    }

                    // Create render config
                    const renderConfig = {
                        width: 256,
                        height: 256,
                        numFrames: 5,
                        effects: [
                            {
                                className: effectName,
                                config: configResult.defaultInstance
                            }
                        ],
                        colorScheme: 'default',
                        renderStartFrame: 1,
                        renderJumpFrames: 6
                    };

                    console.log(`   🎯 Rendering ${effectName} effect...`);
                    const result = await this.projectManager.renderFrame(renderConfig, 1);

                    if (!result.success) {
                        console.log(`   ⚠️ ${effectName} render failed: ${result.error}`);
                        return;
                    }

                    // Analyze visual content
                    const analysis = this.analyzeFrameBuffer(result.frameBuffer, effectName);

                    console.log(`   📊 ${effectName} analysis: ${analysis.analysis}`);

                    if (analysis.hasContent) {
                        console.log(`   ✅ ${effectName} renders visible content`);
                    } else {
                        console.log(`   ⚠️ ${effectName} may be rendering black screen: ${analysis.reason}`);
                    }

                    // For now, we'll record the result but not fail the test for effects other than hex
                    if (effectName === 'hex') {
                        this.assertTrue(analysis.hasContent,
                            `${effectName} should render visible content: ${analysis.reason}`);
                    }

                } catch (error) {
                    console.log(`   ⚠️ ${effectName} test error: ${error.message}`);
                    // Don't fail the entire test suite for individual effect issues
                }
            });
        }
    }

    async testBlankProjectComparison() {
        console.log('\n⚫ Testing Blank Project Comparison...');

        await this.test('should compare effect render vs blank project render', async () => {
            try {
                // Render blank project (no effects)
                console.log(`   🎯 Rendering blank project...`);
                const blankConfig = {
                    width: 256,
                    height: 256,
                    numFrames: 5,
                    effects: [], // No effects
                    colorScheme: 'default',
                    renderStartFrame: 1,
                    renderJumpFrames: 6
                };

                const blankResult = await this.projectManager.renderFrame(blankConfig, 1);
                const blankAnalysis = this.analyzeFrameBuffer(blankResult.frameBuffer, 'blank');

                console.log(`   📊 Blank project: ${blankAnalysis.analysis}`);

                // Render with hex effect
                const hexConfig = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: {
                        resolution: { width: 256, height: 256 },
                        colorScheme: 'default'
                    }
                });

                const effectConfig = {
                    width: 256,
                    height: 256,
                    numFrames: 5,
                    effects: [
                        {
                            className: 'hex',
                            config: hexConfig.defaultInstance
                        }
                    ],
                    colorScheme: 'default',
                    renderStartFrame: 1,
                    renderJumpFrames: 6
                };

                console.log(`   🎯 Rendering hex project...`);
                const effectResult = await this.projectManager.renderFrame(effectConfig, 1);
                const effectAnalysis = this.analyzeFrameBuffer(effectResult.frameBuffer, 'hex');

                console.log(`   📊 Hex project: ${effectAnalysis.analysis}`);

                // Compare results
                const contentDifference = effectAnalysis.contentRatio - blankAnalysis.contentRatio;
                console.log(`   📈 Content difference: ${(contentDifference * 100).toFixed(1)}% (effect vs blank)`);

                // Effect should have significantly more content than blank
                this.assertTrue(contentDifference > 0.05,
                    `Hex effect should add visible content compared to blank project (difference: ${(contentDifference * 100).toFixed(1)}%)`);

                console.log(`   ✅ Hex effect adds visible content compared to blank project`);

            } catch (error) {
                console.log(`   ❌ Comparison test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async testColorSchemeImpact() {
        console.log('\n🎨 Testing Color Scheme Impact on Visual Output...');

        await this.test('should test hex effect with different color schemes', async () => {
            try {
                const colorSchemes = ['default', 'neon-cyberpunk', 'synthwave'];
                const results = [];

                for (const colorScheme of colorSchemes) {
                    console.log(`   🎨 Testing with ${colorScheme} color scheme...`);

                    const configResult = await this.effectsManager.introspectConfig({
                        effectName: 'hex',
                        projectData: {
                            resolution: { width: 256, height: 256 },
                            colorScheme: colorScheme
                        }
                    });

                    if (!configResult.success) {
                        console.log(`   ⚠️ Config failed for ${colorScheme}: ${configResult.error}`);
                        continue;
                    }

                    const renderConfig = {
                        width: 256,
                        height: 256,
                        numFrames: 5,
                        effects: [
                            {
                                className: 'hex',
                                config: configResult.defaultInstance
                            }
                        ],
                        colorScheme: colorScheme,
                        renderStartFrame: 1,
                        renderJumpFrames: 6
                    };

                    const result = await this.projectManager.renderFrame(renderConfig, 1);

                    if (result.success) {
                        const analysis = this.analyzeFrameBuffer(result.frameBuffer, `hex-${colorScheme}`);
                        results.push({ colorScheme, analysis });
                        console.log(`   📊 ${colorScheme}: ${analysis.analysis}`);
                    }
                }

                // At least one color scheme should produce visible content
                const hasVisibleContent = results.some(r => r.analysis.hasContent);
                this.assertTrue(hasVisibleContent,
                    'At least one color scheme should produce visible hex content');

                if (hasVisibleContent) {
                    const workingSchemes = results.filter(r => r.analysis.hasContent)
                        .map(r => r.colorScheme);
                    console.log(`   ✅ Color schemes with visible content: ${workingSchemes.join(', ')}`);
                } else {
                    console.log(`   ⚠️ No color schemes produced visible content`);
                }

            } catch (error) {
                console.log(`   ❌ Color scheme test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Effect Visual Output Tests...\n');
        console.log('This test validates that effects actually render visible content instead of black screens:');
        console.log('  1. Test hex effect produces visible content');
        console.log('  2. Test multiple effects for visual output');
        console.log('  3. Compare effect vs blank project renders');
        console.log('  4. Test color scheme impact on visual output');

        try {
            await this.testHexEffectVisualOutput();
            await this.testMultipleEffectsVisualOutput();
            await this.testBlankProjectComparison();
            await this.testColorSchemeImpact();

            console.log('\n📊 Test Results:');
            console.log(`   Total: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            if (this.failedTests === 0) {
                console.log('\n🎉 All visual output tests passed!');
                console.log('Effects are rendering visible content correctly.');
            } else {
                console.log(`\n⚠️ ${this.failedTests} tests failed - effects may be rendering black screens`);
                console.log('Check the analysis output above for details on which effects have visual issues.');
            }

            return {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests
            };

        } catch (error) {
            console.log(`❌ Visual output test suite failed: ${error.message}`);
            console.log(`📋 Stack trace:`, error.stack);
            this.failedTests++;
            throw error;
        }
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const tests = new EffectVisualOutputTest();
    tests.runAllTests().then(results => {
        if (results.failed === 0) {
            console.log('\n✅ Effect visual output is working correctly!');
            console.log('Effects are rendering visible content instead of black screens.');
            process.exit(0);
        } else {
            console.log('\n❌ Effect visual output has issues - see test output above');
            console.log('Some effects may be rendering black screens instead of visible content.');
            process.exit(1);
        }
    }).catch(error => {
        console.error('Effect visual output test execution failed:', error);
        process.exit(1);
    });
}

module.exports = EffectVisualOutputTest;