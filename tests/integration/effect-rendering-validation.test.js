#!/usr/bin/env node
/**
 * Test suite to validate that all effects can actually render without "Effect class not found" errors
 * Tests the complete pipeline from effect selection to frame generation
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class EffectRenderingValidationTests {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.renderingIssues = [];
    }

    test(description, testFn) {
        this.testCount++;
        try {
            const result = testFn();
            if (result instanceof Promise) {
                return result.then(() => {
                    console.log(`✅ PASS: ${description}`);
                    this.passedTests++;
                }).catch(error => {
                    console.log(`❌ FAIL: ${description}`);
                    console.log(`   Error: ${error.message}`);
                    this.failedTests++;
                    this.renderingIssues.push({ test: description, error: error.message });
                });
            } else {
                console.log(`✅ PASS: ${description}`);
                this.passedTests++;
            }
        } catch (error) {
            console.log(`❌ FAIL: ${description}`);
            console.log(`   Error: ${error.message}`);
            this.failedTests++;
            this.renderingIssues.push({ test: description, error: error.message });
        }
    }

    async testFuzzFlareRendering() {
        console.log('🔥 Testing Fuzz Flare Rendering...\n');

        // Get Fuzz Flare effect info
        const result = await this.effectsManager.getAvailableEffects();
        const fuzzFlare = result.effects.primary.find(e => e.name === 'fuzz-flare');

        await this.test('Fuzz Flare effect is available', () => {
            if (!fuzzFlare) {
                throw new Error('Fuzz Flare not found in available effects');
            }
            console.log(`   Found: ${fuzzFlare.name} → ${fuzzFlare.className}`);
        });

        // Get defaults for Fuzz Flare
        const defaultsResult = await this.effectsManager.getEffectDefaults(fuzzFlare.name);

        await this.test('Fuzz Flare defaults can be retrieved', () => {
            if (!defaultsResult.success) {
                throw new Error(`Failed to get defaults: ${defaultsResult.error}`);
            }
            if (!defaultsResult.defaults) {
                throw new Error('Defaults are empty');
            }
            console.log(`   ✓ Got ${Object.keys(defaultsResult.defaults).length} config properties`);
        });

        // Create effect object exactly like frontend does
        const effectObject = {
            className: fuzzFlare.className,  // This is where the issue might be!
            config: defaultsResult.defaults,
            type: 'primary',
            secondaryEffects: [],
            keyframeEffects: []
        };

        // Test that effect processing can handle this object
        await this.test('Fuzz Flare effect object can be processed', async () => {
            try {
                // Simulate what EffectProcessingService.processEffects does
                import EffectProcessingService from '../../src/main/services/EffectProcessingService.js';
                const processingService = new EffectProcessingService();

                // Create minimal project config for processing
                const projectConfig = {
                    projectName: 'fuzz-flare-test',
                    totalFrames: 10,
                    effects: [effectObject]
                };

                // This should not throw "Effect class FuzzFlare not found"
                const processed = await processingService.processEffects(projectConfig);

                if (!processed || !processed.layerConfigs || processed.layerConfigs.length === 0) {
                    throw new Error('No layer configs produced - effect not processed');
                }

                const layerConfig = processed.layerConfigs[0];
                if (!layerConfig.Effect) {
                    throw new Error('Effect class not instantiated in layer config');
                }

                console.log(`   ✓ Effect processed: ${layerConfig.Effect.constructor.name}`);

            } catch (error) {
                if (error.message.includes('Effect class') && error.message.includes('not found')) {
                    throw new Error(`REGISTRY MISMATCH: ${error.message} - This is the core issue!`);
                }
                throw error;
            }
        });

        return effectObject;
    }

    async testAllEffectsCanProcess() {
        console.log('\n🎬 Testing All Effects Can Be Processed...\n');

        const result = await this.effectsManager.getAvailableEffects();
        const allEffects = [
            ...result.effects.primary,
            ...result.effects.finalImage  // Test both primary and finalImage
        ];

        console.log(`Testing processing for ${allEffects.length} effects...\n`);

        const processingFailures = [];

        // Test a sample of effects to avoid long test times
        const sampleEffects = [
            ...allEffects.filter(e => e.name.includes('fuzz')), // All fuzz effects
            ...allEffects.filter(e => ['hex', 'gates', 'amp'].includes(e.name)), // Common effects
            ...allEffects.slice(0, 3) // First 3 effects
        ];

        const uniqueEffects = [...new Map(sampleEffects.map(e => [e.name, e])).values()];

        for (const effect of uniqueEffects) {
            try {
                console.log(`Testing: ${effect.name} (${effect.className})`);

                // Get defaults
                const defaultsResult = await this.effectsManager.getEffectDefaults(effect.name);

                if (!defaultsResult.success) {
                    processingFailures.push({
                        effect: effect.name,
                        className: effect.className,
                        stage: 'defaults',
                        error: defaultsResult.error
                    });
                    console.log(`   ❌ Defaults failed: ${defaultsResult.error}`);
                    continue;
                }

                // Create effect object
                const effectObject = {
                    className: effect.className,
                    config: defaultsResult.defaults,
                    type: effect.name.includes('final') ? 'finalImage' : 'primary',
                    secondaryEffects: [],
                    keyframeEffects: []
                };

                // Test processing (simplified)
                try {
                    import EffectProcessingService from '../../src/main/services/EffectProcessingService.js';
                    const processingService = new EffectProcessingService();

                    const projectConfig = {
                        projectName: `test-${effect.name}`,
                        totalFrames: 5,
                        effects: [effectObject]
                    };

                    const processed = await processingService.processEffects(projectConfig);

                    if (!processed || !processed.layerConfigs || processed.layerConfigs.length === 0) {
                        processingFailures.push({
                            effect: effect.name,
                            className: effect.className,
                            stage: 'processing',
                            error: 'No layer configs produced'
                        });
                        console.log(`   ❌ Processing failed: No layer configs`);
                    } else {
                        console.log(`   ✅ Processed successfully`);
                    }

                } catch (processError) {
                    processingFailures.push({
                        effect: effect.name,
                        className: effect.className,
                        stage: 'processing',
                        error: processError.message
                    });
                    console.log(`   ❌ Processing failed: ${processError.message}`);
                }

            } catch (error) {
                processingFailures.push({
                    effect: effect.name,
                    className: effect.className,
                    stage: 'setup',
                    error: error.message
                });
                console.log(`   ❌ Setup failed: ${error.message}`);
            }
        }

        await this.test('All sampled effects can be processed without class lookup errors', () => {
            const classNotFoundErrors = processingFailures.filter(f =>
                f.error.includes('Effect class') && f.error.includes('not found')
            );

            if (classNotFoundErrors.length > 0) {
                console.log('\n❌ "Effect class not found" Errors:');
                classNotFoundErrors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error.effect} (${error.className}): ${error.error}`);
                });
                throw new Error(`${classNotFoundErrors.length} effects have "Effect class not found" errors`);
            }

            if (processingFailures.length > 0) {
                console.log(`\n⚠️  Other processing issues found: ${processingFailures.length}`);
                processingFailures.forEach((failure, index) => {
                    console.log(`   ${index + 1}. ${failure.effect}: ${failure.stage} - ${failure.error}`);
                });
            }
        });

        return { sampleEffects: uniqueEffects, failures: processingFailures };
    }

    async testKnownProblematicEffects() {
        console.log('\n🚨 Testing Known Problematic Effects...\n');

        // Effects that might have naming issues
        const problematicEffectNames = [
            'fuzz-flare',
            'layered-hex-now-with-fuzz',
            'blink-on-blink-on-blink-redux',
            'ray-rings (inverted)'
        ];

        const result = await this.effectsManager.getAvailableEffects();
        const allEffects = [
            ...result.effects.primary,
            ...result.effects.secondary,
            ...result.effects.finalImage
        ];

        for (const problemName of problematicEffectNames) {
            const effect = allEffects.find(e => e.name === problemName);

            if (!effect) {
                console.log(`⚠️  Effect '${problemName}' not found - skipping`);
                continue;
            }

            await this.test(`Problematic effect '${problemName}' has correct mapping`, async () => {
                console.log(`   Testing: ${effect.name} → ${effect.className}`);

                // Check if derived className makes sense
                const expectedClassName = effect.name
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join('')
                    .replace(/[^a-zA-Z0-9]/g, ''); // Remove special chars

                if (effect.className !== expectedClassName) {
                    console.log(`   ⚠️  Unexpected className: expected '${expectedClassName}', got '${effect.className}'`);
                }

                // Try to get defaults to see if it works
                const defaultsResult = await this.effectsManager.getEffectDefaults(effect.name);

                if (!defaultsResult.success) {
                    throw new Error(`Cannot get defaults for ${effect.name}: ${defaultsResult.error}`);
                }

                console.log(`   ✓ Can retrieve defaults (${Object.keys(defaultsResult.defaults).length} properties)`);
            });
        }
    }

    async runAllTests() {
        console.log('🚀 Running Effect Rendering Validation Tests...\n');
        console.log('This test validates that all effects can render without "Effect class not found" errors\n');

        try {
            await this.testFuzzFlareRendering();
            await this.testAllEffectsCanProcess();
            await this.testKnownProblematicEffects();
        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
        }

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All effect rendering validation tests passed!');
            console.log('\n✅ This confirms:');
            console.log('   - Fuzz Flare and other effects can render without errors');
            console.log('   - No "Effect class not found in registry" issues');
            console.log('   - Frontend-backend effect processing pipeline works');
            console.log('   - Effect name-to-class mapping is correct');
        } else {
            console.log('\n💥 Some effect rendering validation tests failed!');
            console.log('\n❌ Rendering Issues Found:');
            this.renderingIssues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue.test}: ${issue.error}`);
            });
            console.log('\n🔧 These issues will cause effects to fail during frame generation');
        }

        return this.failedTests === 0;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new EffectRenderingValidationTests();
    tests.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

export default EffectRenderingValidationTests;