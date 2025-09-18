#!/usr/bin/env node
/**
 * Simple test for LayerConfig Effect class identity preservation
 * Tests the core issue without requiring full registry initialization
 */

// Mock electron for testing
import '../setup.js';

class SimpleLayerConfigTest {
    async run() {
        console.log('🧪 Testing LayerConfig Effect Class Identity...\n');

        try {
            // Import LayerConfig directly
            const { LayerConfig } = await import('my-nft-gen/src/core/layer/LayerConfig.js');
            console.log('✓ LayerConfig imported successfully');

            // Create a mock effect class with proper identity
            class MockHexEffect {
                constructor() {
                    this.name = 'MockHexEffect';
                }
            }
            MockHexEffect._name_ = 'MockHexEffect';

            console.log('✓ Mock effect class created:', MockHexEffect.name);

            // Test LayerConfig creation
            const layerConfig = new LayerConfig({
                Effect: MockHexEffect,
                effectName: 'MockHexEffect',
                percentChance: 100,
                currentEffectConfig: { test: 'value' },
                possibleSecondaryEffects: []
            });

            console.log('\n📊 LayerConfig Test Results:');
            console.log('  Effect in LayerConfig:', layerConfig.Effect?.name || 'undefined');
            console.log('  Effect constructor name:', layerConfig.Effect?.constructor?.name || 'undefined');
            console.log('  Effect _name_ property:', layerConfig.Effect?._name_ || 'undefined');
            console.log('  effectName property:', layerConfig.effectName);

            // Verify identity preservation
            if (layerConfig.Effect === MockHexEffect) {
                console.log('  ✅ PASS: Effect class reference preserved');
            } else {
                console.log('  ❌ FAIL: Effect class reference lost');
            }

            if (layerConfig.Effect?.name === 'MockHexEffect') {
                console.log('  ✅ PASS: Effect class name preserved');
            } else {
                console.log('  ❌ FAIL: Effect class name lost');
            }

            if (layerConfig.effectName === 'MockHexEffect') {
                console.log('  ✅ PASS: effectName property preserved');
            } else {
                console.log('  ❌ FAIL: effectName property lost');
            }

            // Test what happens in project.addPrimaryEffect scenario
            console.log('\n🏗️ Testing project.addPrimaryEffect scenario:');

            function mockAddPrimaryEffect(layerConfig) {
                const effectInfo = {
                    effectName: layerConfig.effectName,
                    effectClassName: layerConfig.Effect?.name || 'unknown',
                    effectConstructorName: layerConfig.Effect?.constructor?.name || 'unknown',
                    isFunction: typeof layerConfig.Effect === 'function'
                };

                console.log('  📥 Received LayerConfig:');
                console.log('    effectName:', effectInfo.effectName);
                console.log('    Effect.name:', effectInfo.effectClassName);
                console.log('    Effect.constructor.name:', effectInfo.effectConstructorName);
                console.log('    Effect is function:', effectInfo.isFunction);

                if (effectInfo.effectClassName === 'MockHexEffect') {
                    console.log('  ✅ SUCCESS: Correct derived class preserved');
                } else {
                    console.log('  ❌ PROBLEM: Derived class lost, got:', effectInfo.effectClassName);
                }

                return effectInfo;
            }

            const result = mockAddPrimaryEffect(layerConfig);

            console.log('\n🎯 Test Summary:');
            if (result.effectClassName === 'MockHexEffect') {
                console.log('✅ Effect class identity successfully preserved through LayerConfig');
            } else {
                console.log('❌ Effect class identity was lost');
            }

        } catch (error) {
            console.error('💥 Test failed with error:', error);
            console.error('Stack:', error.stack);
        }
    }
}

// Run the test
const test = new SimpleLayerConfigTest();
test.run().catch(error => {
    console.error('Test crashed:', error);
    process.exit(1);
});