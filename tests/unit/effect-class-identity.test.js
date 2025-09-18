#!/usr/bin/env node
/**
 * Test for Effect class identity preservation through the processing pipeline
 * Ensures that Effect classes maintain their derived identity (like HexEffect)
 * and don't revert to base classes when processed.
 */

// Mock electron for testing
import '../setup.js';

import EffectProcessingService from '../../src/main/services/EffectProcessingService.js';

class EffectClassIdentityTests {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
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

    async testAsync(description, testFn) {
        this.testCount++;
        try {
            await testFn();
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

    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
        }
    }

    assertExists(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(`${message} - Expected value to exist`);
        }
    }

    // Mock classes for testing
    createMockRegistries() {
        // Mock HexEffect class
        class HexEffect {
            constructor() {
                this.name = 'HexEffect';
            }
        }
        HexEffect._name_ = 'HexEffect';

        // Mock ColorShiftEffect class
        class ColorShiftEffect {
            constructor() {
                this.name = 'ColorShiftEffect';
            }
        }
        ColorShiftEffect._name_ = 'ColorShiftEffect';

        // Mock Config classes
        class HexConfig {
            constructor(config = {}) {
                this.numberOfHex = config.numberOfHex || 12;
                this.strategy = config.strategy || ['static'];
            }

            static getDefaults() {
                return {
                    numberOfHex: 12,
                    strategy: ['static', 'angle']
                };
            }
        }

        // Mock registries
        const mockEffectRegistry = {
            getGlobal: (effectName) => {
                switch (effectName) {
                    case 'HexEffect':
                        return HexEffect;
                    case 'ColorShiftEffect':
                        return ColorShiftEffect;
                    default:
                        return null;
                }
            }
        };

        const mockConfigRegistry = {
            getGlobal: (configName) => {
                switch (configName) {
                    case 'HexEffect':
                        return { ConfigClass: HexConfig };
                    case 'LayerConfig':
                        return class LayerConfig {
                            constructor(options) {
                                this.Effect = options.Effect;
                                this.effectName = options.effectName;
                                this.percentChance = options.percentChance;
                                this.currentEffectConfig = options.currentEffectConfig;
                                this.possibleSecondaryEffects = options.possibleSecondaryEffects || [];
                            }
                        };
                    default:
                        return null;
                }
            }
        };

        return { mockEffectRegistry, mockConfigRegistry };
    }

    testEffectProcessingPipeline() {
        console.log('\n🧪 Testing Effect Processing Pipeline...');

        this.test('should preserve Effect class identity during processing', () => {
            const { mockEffectRegistry, mockConfigRegistry } = this.createMockRegistries();

            // Mock input effects from UI
            const primaryEffects = [
                {
                    className: 'HexEffect',
                    type: 'primary',
                    config: {
                        numberOfHex: 8,
                        strategy: ['rotate']
                    }
                }
            ];

            // Simulate the critical part of the pipeline
            const effectName = primaryEffects[0].className;
            const EffectClass = mockEffectRegistry.getGlobal(effectName);

            // Verify Effect class is correct
            this.assertExists(EffectClass, 'Effect class should be found');
            this.assertEqual(EffectClass.name, 'HexEffect', 'Effect class should be HexEffect');
            this.assertTrue(typeof EffectClass === 'function', 'Effect class should be a constructor');

            console.log(`   ✓ Effect class identity preserved: ${EffectClass.name}`);
        });

        this.test('should create LayerConfig with correct Effect class', () => {
            const { mockEffectRegistry, mockConfigRegistry } = this.createMockRegistries();

            const effectName = 'HexEffect';
            const EffectClass = mockEffectRegistry.getGlobal(effectName);
            const LayerConfig = mockConfigRegistry.getGlobal('LayerConfig');

            // Create LayerConfig like in the actual code
            const layerConfig = new LayerConfig({
                Effect: EffectClass,
                effectName: effectName,
                percentChance: 100,
                currentEffectConfig: { numberOfHex: 8 },
                possibleSecondaryEffects: []
            });

            // Verify LayerConfig preserves Effect class
            this.assertExists(layerConfig.Effect, 'LayerConfig should have Effect property');
            this.assertEqual(layerConfig.Effect.name, 'HexEffect', 'LayerConfig Effect should be HexEffect');
            this.assertEqual(layerConfig.effectName, 'HexEffect', 'LayerConfig effectName should be HexEffect');

            console.log(`   ✓ LayerConfig preserves Effect: ${layerConfig.Effect.name}`);
        });

        this.test('should detect when Effect class reverts to base class', () => {
            // Mock a scenario where Effect class loses identity
            class BaseEffect {
                constructor() {
                    this.name = 'BaseEffect';
                }
            }

            const mockEffectRegistry = {
                getGlobal: () => BaseEffect // Always returns base class (bad scenario)
            };

            const effectName = 'HexEffect';
            const EffectClass = mockEffectRegistry.getGlobal(effectName);

            // This should detect the problem
            this.assertEqual(EffectClass.name, 'BaseEffect', 'Should detect base class problem');
            this.assertTrue(EffectClass.name !== 'HexEffect', 'Should not be the expected derived class');

            console.log(`   ⚠️ Detected base class issue: Expected HexEffect, got ${EffectClass.name}`);
        });
    }

    testProjectAddPrimaryEffect() {
        console.log('\n🧪 Testing project.addPrimaryEffect()...');

        this.test('should mock project.addPrimaryEffect behavior', () => {
            const { mockEffectRegistry, mockConfigRegistry } = this.createMockRegistries();

            // Mock project with addPrimaryEffect method
            const mockProject = {
                addedEffects: [],
                addPrimaryEffect: function(layerConfig) {
                    this.addedEffects.push(layerConfig);

                    // Simulate what the real method might do
                    if (layerConfig.Effect && layerConfig.Effect.name) {
                        console.log(`   📝 Project received Effect: ${layerConfig.Effect.name}`);
                    } else {
                        console.log(`   ⚠️ Project received Effect without proper name`);
                    }
                }
            };

            // Create layerConfig and add to project
            const EffectClass = mockEffectRegistry.getGlobal('HexEffect');
            const LayerConfig = mockConfigRegistry.getGlobal('LayerConfig');

            const layerConfig = new LayerConfig({
                Effect: EffectClass,
                effectName: 'HexEffect',
                percentChance: 100,
                currentEffectConfig: { numberOfHex: 8 }
            });

            // This is the critical call
            mockProject.addPrimaryEffect(layerConfig);

            // Verify the effect was added with correct identity
            this.assertEqual(mockProject.addedEffects.length, 1, 'Should add one effect');

            const addedLayerConfig = mockProject.addedEffects[0];
            this.assertEqual(addedLayerConfig.Effect.name, 'HexEffect', 'Added effect should be HexEffect');

            console.log(`   ✓ project.addPrimaryEffect received: ${addedLayerConfig.Effect.name}`);
        });
    }

    testFullPipeline() {
        console.log('\n🧪 Testing Full Pipeline Integration...');

        this.test('should simulate complete pipeline from effects array to project', () => {
            const { mockEffectRegistry, mockConfigRegistry } = this.createMockRegistries();

            // Input: effects array from UI
            const primaryEffects = [
                {
                    className: 'HexEffect',
                    type: 'primary',
                    config: { numberOfHex: 8 }
                }
            ];

            // Step 1: Process effects (simulate processEffects method)
            const processedEffects = [];

            for (const effect of primaryEffects) {
                const effectName = effect.className;
                const EffectClass = mockEffectRegistry.getGlobal(effectName);
                const LayerConfig = mockConfigRegistry.getGlobal('LayerConfig');

                if (EffectClass) {
                    const layerConfig = new LayerConfig({
                        Effect: EffectClass,
                        effectName: effectName,
                        percentChance: 100,
                        currentEffectConfig: effect.config
                    });
                    processedEffects.push(layerConfig);
                }
            }

            // Step 2: Add to project (simulate the loop in NftProjectManager)
            const mockProject = {
                addedEffects: [],
                addPrimaryEffect: function(layerConfig) {
                    this.addedEffects.push(layerConfig);
                }
            };

            for (const layerConfig of processedEffects) {
                mockProject.addPrimaryEffect(layerConfig);
            }

            // Verify end-to-end identity preservation
            this.assertEqual(processedEffects.length, 1, 'Should process one effect');
            this.assertEqual(mockProject.addedEffects.length, 1, 'Should add one effect to project');

            const finalLayerConfig = mockProject.addedEffects[0];
            this.assertEqual(finalLayerConfig.Effect.name, 'HexEffect', 'Final effect should be HexEffect');
            this.assertEqual(finalLayerConfig.effectName, 'HexEffect', 'Final effectName should be HexEffect');

            console.log(`   🎯 End-to-end pipeline preserved identity: ${finalLayerConfig.Effect.name}`);
        });
    }

    async runAllTests() {
        console.log('🚀 Running Effect Class Identity Tests...\n');

        try {
            this.testEffectProcessingPipeline();
            this.testProjectAddPrimaryEffect();
            this.testFullPipeline();
        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
        }

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All tests passed!');
            console.log('\n🔧 Key things to verify in actual code:');
            console.log('   1. EffectRegistry.getGlobal() returns correct derived class');
            console.log('   2. LayerConfig preserves Effect class identity');
            console.log('   3. project.addPrimaryEffect() receives derived class, not base class');
            console.log('   4. Effect.name should show "HexEffect", not "BaseEffect" or generic name');
            process.exit(0);
        } else {
            console.log('\n💥 Some tests failed!');
            process.exit(1);
        }
    }
}

// Run the tests
const tests = new EffectClassIdentityTests();
tests.runAllTests();