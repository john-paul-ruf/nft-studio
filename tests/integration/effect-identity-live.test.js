#!/usr/bin/env node
/**
 * Live test for Effect class identity preservation
 * This test runs against the actual implementation to verify
 * that Effect classes maintain their identity through the pipeline
 */

// Mock electron for testing
import '../setup.js';

import EffectProcessingService from '../../src/main/services/EffectProcessingService.js';

class EffectIdentityLiveTest {
    constructor() {
        this.results = [];
    }

    async testWithActualImplementation() {
        console.log('🔬 Running Live Effect Identity Test...\n');

        try {
            // First, initialize the registry system
            console.log('🔧 Initializing effect registry...');
            import EffectRegistryService from '../../src/main/services/EffectRegistryService.js';
            const registryService = new EffectRegistryService();
            await registryService.ensureCoreEffectsRegistered();

            // Check what effects are actually available
            console.log('📋 Checking available effects...');
            const allEffects = await registryService.getAllEffects();
            console.log('Available effects:', {
                primary: allEffects.primary.map(e => e.name),
                secondary: allEffects.secondary.map(e => e.name),
                keyFrame: allEffects.keyFrame.map(e => e.name),
                final: allEffects.final.map(e => e.name)
            });

            // Use the first available primary effect for testing
            const primaryEffects = allEffects.primary;
            if (primaryEffects.length === 0) {
                console.log('❌ No primary effects available - skipping test');
                return;
            }

            const firstEffect = primaryEffects[0];
            console.log(`🎯 Testing with effect: ${firstEffect.name}`);

            // Create test effects similar to what comes from UI
            const testEffects = [
                {
                    className: firstEffect.name,
                    type: 'primary',
                    config: {
                        // Use minimal config for testing
                    }
                }
            ];

            const myNftGenPath = '../my-nft-gen';

            console.log('📝 Input effects:', JSON.stringify(testEffects, null, 2));

            // Call the actual processEffects method
            const processedEffects = await EffectProcessingService.processEffects(testEffects, myNftGenPath);

            console.log('\n📊 Processing Results:');
            console.log(`   Number of processed effects: ${processedEffects.length}`);

            processedEffects.forEach((layerConfig, index) => {
                const result = {
                    index,
                    effectName: layerConfig.effectName,
                    effectClass: layerConfig.Effect?.name || 'no name',
                    effectConstructor: layerConfig.Effect?.constructor?.name || 'no constructor name',
                    hasEffect: !!layerConfig.Effect,
                    effectType: typeof layerConfig.Effect,
                    configExists: !!layerConfig.currentEffectConfig,
                    configKeys: layerConfig.currentEffectConfig ? Object.keys(layerConfig.currentEffectConfig) : []
                };

                this.results.push(result);

                console.log(`\n   LayerConfig ${index}:`);
                console.log(`     Effect Name: ${result.effectName}`);
                console.log(`     Effect Class Name: ${result.effectClass}`);
                console.log(`     Effect Constructor: ${result.effectConstructor}`);
                console.log(`     Effect Type: ${result.effectType}`);
                console.log(`     Has Config: ${result.configExists}`);
                if (result.configKeys.length > 0) {
                    console.log(`     Config Keys: ${result.configKeys.join(', ')}`);
                }

                // Check for identity preservation
                if (result.effectName === firstEffect.name) {
                    if (result.effectClass === firstEffect.name) {
                        console.log(`     ✅ PASS: Effect class identity preserved`);
                    } else {
                        console.log(`     ❌ FAIL: Effect class identity lost - expected ${firstEffect.name}, got ${result.effectClass}`);
                    }
                } else {
                    console.log(`     ⚠️  WARN: Unexpected effect name: ${result.effectName} (expected ${firstEffect.name})`);
                }
            });

            // Test the mock project.addPrimaryEffect scenario
            console.log('\n🏗️  Testing project.addPrimaryEffect simulation...');

            const mockProject = {
                addedEffects: [],
                addPrimaryEffect: function(layerConfig) {
                    this.addedEffects.push(layerConfig);

                    const effectInfo = {
                        effectName: layerConfig.effectName,
                        effectClassName: layerConfig.Effect?.name || 'unknown',
                        effectConstructorName: layerConfig.Effect?.constructor?.name || 'unknown'
                    };

                    console.log(`   📥 Project received LayerConfig:`, effectInfo);

                    if (effectInfo.effectClassName === firstEffect.name) {
                        console.log(`     ✅ SUCCESS: project.addPrimaryEffect received ${firstEffect.name}`);
                    } else {
                        console.log(`     ❌ PROBLEM: project.addPrimaryEffect received ${effectInfo.effectClassName} instead of ${firstEffect.name}`);
                    }
                }
            };

            // Simulate the actual loop from NftProjectManager
            console.log('\n🔄 Simulating NftProjectManager loop:');
            for (const layerConfig of processedEffects) {
                mockProject.addPrimaryEffect(layerConfig);
            }

            // Final analysis
            console.log('\n🎯 Final Analysis:');
            const successfulEffects = this.results.filter(r => r.effectClass === r.effectName);
            const failedEffects = this.results.filter(r => r.effectClass !== r.effectName);

            console.log(`   Successful identity preservation: ${successfulEffects.length}/${this.results.length}`);
            console.log(`   Failed identity preservation: ${failedEffects.length}/${this.results.length}`);

            if (failedEffects.length > 0) {
                console.log('\n❌ IDENTITY PRESERVATION FAILURES:');
                failedEffects.forEach(failure => {
                    console.log(`   Effect ${failure.index}: Expected ${failure.effectName}, got ${failure.effectClass}`);
                });
            }

            if (successfulEffects.length === this.results.length && this.results.length > 0) {
                console.log('\n🎉 All Effect identities successfully preserved through the pipeline!');
            } else {
                console.log('\n⚠️  Some Effect identities were not preserved - check the debug output above');
            }

        } catch (error) {
            console.error('\n💥 Test failed with error:', error);
            console.error('Stack:', error.stack);
        }
    }

    async run() {
        await this.testWithActualImplementation();
    }
}

// Run the live test
const liveTest = new EffectIdentityLiveTest();
liveTest.run().catch(error => {
    console.error('Live test crashed:', error);
    process.exit(1);
});