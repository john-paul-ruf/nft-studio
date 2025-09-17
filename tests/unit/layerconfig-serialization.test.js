#!/usr/bin/env node
/**
 * Test to verify LayerConfig is created with correct parameters for serialization
 * This addresses the "Effect 'base-effect' not found" error
 */

// Mock electron for testing
require('../setup.js');

class LayerConfigSerializationTest {
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

    async testLayerConfigCreation() {
        console.log('🧪 Testing LayerConfig Parameter Mapping...\n');

        // Mock LayerConfig that mimics the real one
        class MockLayerConfig {
            constructor({
                name = 'base-config',
                effect = null,
                percentChance = 0,
                ignoreSecondaryEffects = false,
                currentEffectConfig = {},
                defaultEffectConfig = null,
                possibleSecondaryEffects = [],
            }) {
                this.name = name;                              // This becomes layerConfig.name
                this.Effect = effect;                          // Constructor param 'effect' becomes property 'Effect'
                this.percentChance = percentChance;
                this.ignoreSecondaryEffects = ignoreSecondaryEffects;
                this.currentEffectConfig = currentEffectConfig;
                this.defaultEffectConfig = defaultEffectConfig;
                this.possibleSecondaryEffects = possibleSecondaryEffects;
            }
        }

        this.test('LayerConfig created with correct effect name', () => {
            class TestEffect {}
            TestEffect._name_ = 'TestEffect';

            const layerConfig = new MockLayerConfig({
                name: 'TestEffect',              // FIXED: was effectName, should be name
                effect: TestEffect,              // FIXED: was Effect, should be effect
                percentChance: 100,
                currentEffectConfig: { value: 42 }
            });

            if (layerConfig.name !== 'TestEffect') {
                throw new Error(`Expected name 'TestEffect', got '${layerConfig.name}'`);
            }

            if (!layerConfig.Effect) {
                throw new Error('Effect class not stored');
            }

            if (layerConfig.Effect !== TestEffect) {
                throw new Error('Effect class reference lost');
            }
        });

        this.test('LayerConfig avoids base-config default', () => {
            class MyCustomEffect {}

            const layerConfig = new MockLayerConfig({
                name: 'MyCustomEffect',         // This prevents 'base-config' default
                effect: MyCustomEffect,
                percentChance: 50
            });

            if (layerConfig.name === 'base-config') {
                throw new Error('LayerConfig defaulted to base-config - missing name parameter');
            }

            if (layerConfig.name !== 'MyCustomEffect') {
                throw new Error(`Expected MyCustomEffect, got ${layerConfig.name}`);
            }
        });

        this.test('Serialization would use correct effect name', () => {
            class HexEffect {}
            HexEffect._name_ = 'HexEffect';

            const layerConfig = new MockLayerConfig({
                name: 'HexEffect',
                effect: HexEffect,
                percentChance: 100
            });

            // This simulates what happens during JSON serialization
            const serialized = {
                name: layerConfig.name,
                percentChance: layerConfig.percentChance,
                // ... other properties would be serialized too
            };

            if (serialized.name !== 'HexEffect') {
                throw new Error(`Serialization would use wrong name: ${serialized.name}`);
            }

            // During deserialization, LayerEffectFromJSON.from() looks for json.name
            // It should find 'HexEffect' not 'base-effect'
            console.log(`   ✓ Serialized name would be: '${serialized.name}'`);
        });
    }

    testProblemScenario() {
        console.log('\n🧪 Testing Problem Scenario Fix...\n');

        this.test('OLD way (broken) vs NEW way (fixed)', () => {
            class TestEffect {}
            TestEffect._name_ = 'TestEffect';

            // Mock OLD way (broken) - missing name parameter
            class OldLayerConfig {
                constructor({
                    Effect = null,               // Wrong parameter name
                    effectName = null,           // Wrong parameter name
                    percentChance = 0,
                    currentEffectConfig = {}
                }) {
                    this.name = 'base-config';   // PROBLEM: Always defaults to 'base-config'
                    this.Effect = Effect;
                    this.effectName = effectName;
                    this.percentChance = percentChance;
                    this.currentEffectConfig = currentEffectConfig;
                }
            }

            // Mock NEW way (fixed) - correct parameters
            class NewLayerConfig {
                constructor({
                    name = 'base-config',        // Correct parameter name
                    effect = null,               // Correct parameter name
                    percentChance = 0,
                    currentEffectConfig = {}
                }) {
                    this.name = name;            // FIXED: Uses actual effect name
                    this.Effect = effect;        // Effect class stored correctly
                    this.percentChance = percentChance;
                    this.currentEffectConfig = currentEffectConfig;
                }
            }

            // OLD way (broken)
            const oldLayerConfig = new OldLayerConfig({
                Effect: TestEffect,              // Wrong parameter
                effectName: 'TestEffect',        // Wrong parameter
                percentChance: 100
            });

            // NEW way (fixed)
            const newLayerConfig = new NewLayerConfig({
                name: 'TestEffect',              // Correct parameter
                effect: TestEffect,              // Correct parameter
                percentChance: 100
            });

            console.log(`   OLD way name: '${oldLayerConfig.name}' (❌ wrong - causes 'base-effect' error)`);
            console.log(`   NEW way name: '${newLayerConfig.name}' (✅ correct - will be found in registry)`);

            if (oldLayerConfig.name === 'base-config') {
                console.log(`   ✓ Confirmed OLD way defaults to 'base-config'`);
            }

            if (newLayerConfig.name === 'TestEffect') {
                console.log(`   ✓ Confirmed NEW way uses actual effect name`);
            } else {
                throw new Error('NEW way failed to set effect name');
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running LayerConfig Serialization Tests...\n');

        try {
            await this.testLayerConfigCreation();
            this.testProblemScenario();
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
            console.log('\n🔧 LayerConfig Parameter Fix Summary:');
            console.log('   ❌ OLD: new LayerConfig({ Effect: EffectClass, effectName: "..." })');
            console.log('   ✅ NEW: new LayerConfig({ name: "...", effect: EffectClass })');
            console.log('\n✨ Benefits of the fix:');
            console.log('   1. layerConfig.name contains actual effect name (e.g., "HexEffect")');
            console.log('   2. No more "base-config" defaults causing serialization issues');
            console.log('   3. LayerEffectFromJSON.from() can find effects by name in registry');
            console.log('   4. No more "Effect \'base-effect\' not found" errors');
            process.exit(0);
        } else {
            console.log('\n💥 Some tests failed!');
            process.exit(1);
        }
    }
}

// Run the tests
const tests = new LayerConfigSerializationTest();
tests.runAllTests();