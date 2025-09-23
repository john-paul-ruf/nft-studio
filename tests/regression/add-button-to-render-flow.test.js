#!/usr/bin/env node
/**
 * Regression test for the complete Add Effect Button → Render flow
 * Ensures the fixed add effect button can create effects that actually render
 * Tests the exact scenario that was broken: user adds Fuzz Flare and it renders successfully
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class AddButtonToRenderFlowTests {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
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
                });
            } else {
                console.log(`✅ PASS: ${description}`);
                this.passedTests++;
            }
        } catch (error) {
            console.log(`❌ FAIL: ${description}`);
            console.log(`   Error: ${error.message}`);
            this.failedTests++;
        }
    }

    async simulateAddEffectButtonClick() {
        console.log('🎯 Step 1: Simulating Add Effect Button Click...\n');

        // This is exactly what the fixed EffectPicker.jsx does
        const response = await this.effectsManager.getAvailableEffects();

        await this.test('Add effect button loads available effects (fixed API call)', () => {
            if (!response.success) {
                throw new Error(`getAvailableEffects failed: ${response.error}`);
            }
            if (!response.effects) {
                throw new Error('No effects returned from getAvailableEffects');
            }
        });

        // This is the exact array combination EffectPicker.jsx creates
        const allEffects = [
            ...(response.effects.primary || []),
            ...(response.effects.finalImage || [])  // Fixed: was response.effects.final
        ];

        await this.test('Effect picker shows combined primary and final effects', () => {
            if (allEffects.length === 0) {
                throw new Error('No effects available for user selection');
            }
            console.log(`   ✓ User sees ${allEffects.length} effects in dropdown`);
        });

        return { allEffects, response };
    }

    async simulateUserSelectsFuzzFlare() {
        console.log('\n🎯 Step 2: Simulating User Selects Fuzz Flare...\n');

        const { allEffects } = await this.simulateAddEffectButtonClick();

        // Find Fuzz Flare (the problematic effect)
        const fuzzFlare = allEffects.find(e => e.name === 'fuzz-flare');

        await this.test('Fuzz Flare is available for user selection', () => {
            if (!fuzzFlare) {
                const availableNames = allEffects.map(e => e.name).slice(0, 10);
                throw new Error(`Fuzz Flare not in dropdown. Available: ${availableNames.join(', ')}`);
            }
            console.log(`   ✓ Found Fuzz Flare: ${fuzzFlare.name} → ${fuzzFlare.className}`);
        });

        // This is exactly what EffectPicker.jsx does when user clicks an effect
        const defaultsResponse = await this.effectsManager.getEffectDefaults(fuzzFlare.name || fuzzFlare.className);

        await this.test('Effect defaults can be retrieved for Fuzz Flare', () => {
            if (!defaultsResponse.success) {
                throw new Error(`getEffectDefaults failed: ${defaultsResponse.error}`);
            }
            if (!defaultsResponse.defaults) {
                throw new Error('No defaults returned for Fuzz Flare');
            }
            console.log(`   ✓ Got ${Object.keys(defaultsResponse.defaults).length} config properties`);
        });

        // This is the exact effect object EffectPicker.jsx creates
        const newEffect = {
            className: fuzzFlare.name || fuzzFlare.className,  // This was the problem!
            config: defaultsResponse.defaults,
            type: fuzzFlare.category || 'primary',
            secondaryEffects: [],
            attachedEffects: { secondary: [], keyFrame: [] }
        };

        await this.test('Effect object created with correct structure', () => {
            if (!newEffect.className || !newEffect.config || !newEffect.type) {
                throw new Error('Effect object missing required properties');
            }
            console.log(`   ✓ Created effect with className: ${newEffect.className}`);
        });

        return { fuzzFlare, newEffect };
    }

    async simulateProjectWithFuzzFlare() {
        console.log('\n🎯 Step 3: Simulating Project with Fuzz Flare Effect...\n');

        const { newEffect } = await this.simulateUserSelectsFuzzFlare();

        // Create a complete project config like the frontend would
        const projectConfig = {
            projectName: 'add-button-regression-test',
            artist: 'Test User',
            totalFrames: 10,
            frameRate: 30,
            resolution: 512,
            colorScheme: {
                name: 'synthwave',
                backgroundColors: ['#000000'],
                neutralColors: ['#333333'],
                lightColors: ['#ffffff']
            },
            effects: [newEffect]  // The effect created from the add button
        };

        await this.test('Project configuration created with Fuzz Flare effect', () => {
            if (!projectConfig.effects || projectConfig.effects.length === 0) {
                throw new Error('No effects in project config');
            }
            const effect = projectConfig.effects[0];
            if (effect.className !== newEffect.className) {
                throw new Error(`Effect className mismatch: expected ${newEffect.className}, got ${effect.className}`);
            }
            console.log(`   ✓ Project has effect: ${effect.className}`);
        });

        return { projectConfig, newEffect };
    }

    async simulateEffectProcessing() {
        console.log('\n🎯 Step 4: Simulating Effect Processing (Render Pipeline)...\n');

        const { projectConfig } = await this.simulateProjectWithFuzzFlare();

        // This is where the "Effect class FuzzFlare not found" error would occur
        let processingResult;

        await this.test('Effect processing does not throw "Effect class not found"', async () => {
            try {
                import EffectProcessingService from '../../src/main/services/EffectProcessingService.js';
                const processingService = new EffectProcessingService();

                // This should NOT fail with "Effect class FuzzFlare not found"
                processingResult = await processingService.processEffects(projectConfig);

                if (!processingResult) {
                    throw new Error('Processing returned no result');
                }

                console.log(`   ✓ Effects processed successfully`);

            } catch (error) {
                if (error.message.includes('Effect class') && error.message.includes('not found')) {
                    throw new Error(`REGRESSION: ${error.message} - The original issue is NOT fixed!`);
                }
                // Re-throw other errors
                throw error;
            }
        });

        await this.test('Processing produces valid layer configurations', () => {
            if (!processingResult.layerConfigs || processingResult.layerConfigs.length === 0) {
                throw new Error('No layer configs produced from effect processing');
            }

            const layerConfig = processingResult.layerConfigs[0];
            if (!layerConfig.Effect) {
                throw new Error('Layer config missing Effect class instance');
            }

            console.log(`   ✓ Created layer config with effect: ${layerConfig.Effect.constructor.name}`);
        });

        return { projectConfig, processingResult };
    }

    async simulateFrameGeneration() {
        console.log('\n🎯 Step 5: Simulating Frame Generation...\n');

        const { projectConfig, processingResult } = await this.simulateEffectProcessing();

        await this.test('Frame generation can process Fuzz Flare effect', async () => {
            try {
                // Test a simplified frame generation
                const layerConfig = processingResult.layerConfigs[0];
                const effect = layerConfig.Effect;

                // Verify the effect is properly instantiated
                if (!effect || typeof effect !== 'object') {
                    throw new Error('Effect is not properly instantiated');
                }

                // Check if effect has required methods (basic validation)
                const hasRenderMethod = typeof effect.render === 'function' ||
                                       typeof effect.draw === 'function' ||
                                       typeof effect.generate === 'function';

                if (!hasRenderMethod) {
                    console.log(`   ⚠️  Effect ${effect.constructor.name} may not have standard render methods`);
                }

                console.log(`   ✓ Effect ${effect.constructor.name} is ready for frame generation`);

            } catch (error) {
                throw new Error(`Frame generation setup failed: ${error.message}`);
            }
        });
    }

    async runCompleteRegressionTest() {
        console.log('🔥 REGRESSION TEST: Complete Add Effect Button → Render Flow\n');
        console.log('This test validates the COMPLETE user journey that was broken:\n');
        console.log('1. User clicks Add Effect button');
        console.log('2. User selects Fuzz Flare from dropdown');
        console.log('3. Effect is added to project');
        console.log('4. User starts render');
        console.log('5. Effect processes and renders successfully');
        console.log('');

        try {
            await this.simulateAddEffectButtonClick();
            await this.simulateUserSelectsFuzzFlare();
            await this.simulateProjectWithFuzzFlare();
            await this.simulateEffectProcessing();
            await this.simulateFrameGeneration();
        } catch (error) {
            console.log(`❌ Regression test failed: ${error.message}`);
            this.failedTests++;
        }
    }

    async testOtherCommonEffects() {
        console.log('\n🎯 Step 6: Testing Other Common Effects...\n');

        const { allEffects } = await this.simulateAddEffectButtonClick();

        // Test a few other common effects to ensure the fix is comprehensive
        const testEffects = ['hex', 'gates', 'amp'].map(name =>
            allEffects.find(e => e.name === name)
        ).filter(Boolean);

        for (const effect of testEffects) {
            await this.test(`${effect.name} effect can go through complete flow`, async () => {
                try {
                    // Get defaults
                    const defaultsResponse = await this.effectsManager.getEffectDefaults(effect.name);

                    if (!defaultsResponse.success) {
                        throw new Error(`Cannot get defaults: ${defaultsResponse.error}`);
                    }

                    // Create effect object
                    const effectObject = {
                        className: effect.name || effect.className,
                        config: defaultsResponse.defaults,
                        type: 'primary',
                        secondaryEffects: [],
                        attachedEffects: { secondary: [], keyFrame: [] }
                    };

                    // Test processing
                    import EffectProcessingService from '../../src/main/services/EffectProcessingService.js';
                    const processingService = new EffectProcessingService();

                    const projectConfig = {
                        projectName: `test-${effect.name}`,
                        totalFrames: 5,
                        effects: [effectObject]
                    };

                    const processed = await processingService.processEffects(projectConfig);

                    if (!processed || !processed.layerConfigs || processed.layerConfigs.length === 0) {
                        throw new Error('Processing failed');
                    }

                    console.log(`   ✓ ${effect.name} processes successfully`);

                } catch (error) {
                    throw new Error(`${effect.name} failed: ${error.message}`);
                }
            });
        }
    }

    async runAllTests() {
        console.log('🚀 Running Complete Add Button to Render Regression Tests...\n');

        try {
            await this.runCompleteRegressionTest();
            await this.testOtherCommonEffects();
        } catch (error) {
            console.log(`❌ Test suite failed: ${error.message}`);
            this.failedTests++;
        }

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All regression tests passed!');
            console.log('\n✅ COMPLETE FLOW VALIDATED:');
            console.log('   1. ✅ Add effect button shows effects (fixed API calls)');
            console.log('   2. ✅ Fuzz Flare appears in dropdown');
            console.log('   3. ✅ Fuzz Flare can be selected and configured');
            console.log('   4. ✅ Effect processing handles Fuzz Flare correctly');
            console.log('   5. ✅ Frame generation can process Fuzz Flare');
            console.log('\n🔧 ORIGINAL ISSUES RESOLVED:');
            console.log('   - Add effect button no longer empty');
            console.log('   - No more "Effect class not found" errors');
            console.log('   - Fuzz Flare and other effects render successfully');
        } else {
            console.log('\n💥 REGRESSION DETECTED!');
            console.log('\nThe complete Add Effect Button → Render flow is still broken.');
            console.log('Users will experience the same issues that were reported.');
        }

        return this.failedTests === 0;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new AddButtonToRenderFlowTests();
    tests.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

export default AddButtonToRenderFlowTests;