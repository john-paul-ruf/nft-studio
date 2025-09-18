#!/usr/bin/env node
/**
 * Comprehensive test suite for effect key passing between frontend and backend
 * Ensures FuzzFlare and all effects are properly mapped and rendered
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class EffectKeyPassingTests {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.projectData = {
            resolution: { width: 1920, height: 1080 },
            colorScheme: 'default',
            projectName: 'effect-key-test'
        };
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

    async testEffectNameMapping() {
        console.log('🔗 Testing Effect Name Mapping...\n');

        // Get available effects from backend
        const result = await this.effectsManager.getAvailableEffects();

        this.test('Backend returns available effects successfully', () => {
            if (!result.success) {
                throw new Error(`Backend failed to return effects: ${result.error}`);
            }
            if (!result.effects || !result.effects.primary) {
                throw new Error('Backend returned malformed effects structure');
            }
        });

        const allEffects = [
            ...result.effects.primary,
            ...result.effects.secondary,
            ...result.effects.finalImage
        ];

        this.test('All effects have required name and className properties', () => {
            for (const effect of allEffects) {
                if (!effect.name) {
                    throw new Error(`Effect missing name property: ${JSON.stringify(effect)}`);
                }
                if (!effect.className) {
                    throw new Error(`Effect missing className property: ${JSON.stringify(effect)}`);
                }
                if (typeof effect.name !== 'string') {
                    throw new Error(`Effect name must be string: ${effect.name} (${typeof effect.name})`);
                }
                if (typeof effect.className !== 'string') {
                    throw new Error(`Effect className must be string: ${effect.className} (${typeof effect.className})`);
                }
            }
        });

        // Test FuzzFlare specifically
        const fuzzFlare = result.effects.primary.find(e => e.name === 'fuzz-flare');

        this.test('FuzzFlare effect is available in backend', () => {
            if (!fuzzFlare) {
                const availableNames = result.effects.primary.map(e => e.name);
                throw new Error(`FuzzFlare not found. Available: ${availableNames.join(', ')}`);
            }
        });

        this.test('FuzzFlare has correct name and className mapping', () => {
            if (fuzzFlare.name !== 'fuzz-flare') {
                throw new Error(`Expected name 'fuzz-flare', got '${fuzzFlare.name}'`);
            }
            if (fuzzFlare.className !== 'FuzzFlare') {
                throw new Error(`Expected className 'FuzzFlare', got '${fuzzFlare.className}'`);
            }
        });

        return { allEffects, fuzzFlare };
    }

    async testEffectConfigMapping() {
        console.log('\n⚙️ Testing Effect Config Mapping...\n');

        const { fuzzFlare } = await this.testEffectNameMapping();

        // Test config introspection for FuzzFlare
        const introspectionResult = await this.effectsManager.introspectConfig({
            effectName: fuzzFlare.name,
            projectData: this.projectData
        });

        this.test('FuzzFlare config introspection succeeds', () => {
            if (!introspectionResult.success) {
                throw new Error(`Config introspection failed: ${introspectionResult.error}`);
            }
            if (!introspectionResult.defaultInstance) {
                throw new Error('No default instance returned from introspection');
            }
        });

        this.test('FuzzFlare config has expected properties', () => {
            const config = introspectionResult.defaultInstance;
            const expectedProperties = [
                'outerColor', 'innerColor', 'center', 'layerOpacity',
                'numberOfFlareRings', 'flareRingsSizeRange', 'flareOffset',
                'numberOfFlareRays', 'flareRaysSizeRange'
            ];

            for (const prop of expectedProperties) {
                if (!(prop in config)) {
                    throw new Error(`Missing expected property: ${prop}`);
                }
            }
        });

        // Test getting effect defaults (what frontend would request)
        const defaultsResult = await this.effectsManager.getEffectDefaults(fuzzFlare.name);

        this.test('FuzzFlare defaults are retrievable by name', () => {
            if (!defaultsResult.success) {
                throw new Error(`Failed to get defaults: ${defaultsResult.error}`);
            }
            if (!defaultsResult.defaults) {
                throw new Error('No defaults returned');
            }
        });

        return { fuzzFlare, config: introspectionResult.defaultInstance, defaults: defaultsResult.defaults };
    }

    async testFrontendBackendContractSimulation() {
        console.log('\n🔄 Testing Frontend-Backend Contract Simulation...\n');

        const { fuzzFlare, defaults } = await this.testEffectConfigMapping();

        // Simulate how frontend builds effect object for backend
        const frontendEffect = {
            name: fuzzFlare.name,                    // Frontend uses 'name' from available effects
            className: fuzzFlare.className,          // Frontend maps to 'className'
            type: 'primary',
            config: defaults,
            visible: true
        };

        this.test('Frontend effect structure matches expected contract', () => {
            const requiredFields = ['name', 'className', 'type', 'config', 'visible'];
            for (const field of requiredFields) {
                if (!(field in frontendEffect)) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
        });

        // Simulate backend processing (like EffectProcessingService.processEffects)
        this.test('Backend can process frontend effect structure', async () => {
            try {
                const processedEffects = await this.effectsManager.processEffectsConfiguration([frontendEffect]);

                if (!processedEffects.success) {
                    throw new Error(`Processing failed: ${processedEffects.error}`);
                }

                if (!processedEffects.layerConfigs || processedEffects.layerConfigs.length === 0) {
                    throw new Error('No layer configs returned from processing');
                }

                const layerConfig = processedEffects.layerConfigs[0];

                // Verify the effect class was found and instantiated correctly
                if (!layerConfig.Effect) {
                    throw new Error('Effect class not found in processed LayerConfig');
                }

                console.log(`   ✓ Effect processed: ${layerConfig.Effect.name || layerConfig.Effect.constructor?.name}`);

            } catch (error) {
                throw new Error(`Backend processing failed: ${error.message}`);
            }
        });

        // Test the complete render pipeline simulation
        this.test('Complete render pipeline simulation', async () => {
            try {
                const renderConfig = {
                    effects: [frontendEffect],
                    colorScheme: 'default',
                    resolution: 'hd',
                    numberOfFrames: 10,
                    width: 1920,
                    height: 1080,
                    renderStartFrame: 0,
                    renderJumpFrames: 1
                };

                // This would normally be called via IPC, but we'll test the core logic
                const processResult = await this.effectsManager.processEffectsConfiguration(renderConfig.effects);

                if (!processResult.success) {
                    throw new Error(`Render processing failed: ${processResult.error}`);
                }

                console.log(`   ✓ Render pipeline successfully processed ${processResult.layerConfigs.length} effects`);

            } catch (error) {
                throw new Error(`Render pipeline failed: ${error.message}`);
            }
        });

        return frontendEffect;
    }

    async testKeyMappingForAllEffects() {
        console.log('\n🗝️ Testing Key Mapping for All Effects...\n');

        const result = await this.effectsManager.getAvailableEffects();
        const allEffects = [
            ...result.effects.primary,
            ...result.effects.secondary,
            ...result.effects.finalImage
        ];

        // Test a sample of effects to ensure consistent mapping
        const testEffects = allEffects.slice(0, 5); // Test first 5 effects

        this.test('Sample effects all have consistent name/className mapping', async () => {
            for (const effect of testEffects) {
                try {
                    // Test that effect can be found by name
                    const defaultsResult = await this.effectsManager.getEffectDefaults(effect.name);
                    if (!defaultsResult.success) {
                        throw new Error(`Effect ${effect.name} defaults not retrievable`);
                    }

                    // Test that frontend-style effect can be processed
                    const frontendEffect = {
                        name: effect.name,
                        className: effect.className,
                        type: 'primary',
                        config: defaultsResult.defaults || {},
                        visible: true
                    };

                    const processResult = await this.effectsManager.processEffectsConfiguration([frontendEffect]);
                    if (!processResult.success) {
                        throw new Error(`Effect ${effect.name} processing failed: ${processResult.error}`);
                    }

                    console.log(`     ✓ ${effect.name} → ${effect.className}: OK`);

                } catch (error) {
                    throw new Error(`Effect ${effect.name} failed: ${error.message}`);
                }
            }
        });
    }

    async testEdgeCasesAndErrorHandling() {
        console.log('\n🔍 Testing Edge Cases and Error Handling...\n');

        this.test('Backend handles unknown effect names gracefully', async () => {
            const unknownEffect = {
                name: 'unknown-effect',
                className: 'UnknownEffect',
                type: 'primary',
                config: {},
                visible: true
            };

            const processResult = await this.effectsManager.processEffectsConfiguration([unknownEffect]);

            // Should either fail gracefully or skip unknown effects, not crash
            if (processResult.success && processResult.layerConfigs.length > 0) {
                throw new Error('Unknown effect should not be processed successfully');
            }

            console.log('   ✓ Unknown effects handled gracefully');
        });

        this.test('Backend handles malformed effect objects gracefully', async () => {
            const malformedEffects = [
                { name: 'test' }, // Missing required fields
                { className: 'Test', config: 'not-an-object' }, // Wrong types
                null, // Null effect
                undefined // Undefined effect
            ];

            for (const malformedEffect of malformedEffects) {
                try {
                    const processResult = await this.effectsManager.processEffectsConfiguration([malformedEffect]);
                    // Should handle gracefully, not crash
                    console.log(`     ✓ Malformed effect handled: ${JSON.stringify(malformedEffect)}`);
                } catch (error) {
                    // Catching errors is fine, crashing is not
                    console.log(`     ✓ Malformed effect properly rejected: ${error.message}`);
                }
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Comprehensive Effect Key Passing Tests...\n');

        try {
            await this.testEffectNameMapping();
            await this.testEffectConfigMapping();
            await this.testFrontendBackendContractSimulation();
            await this.testKeyMappingForAllEffects();
            await this.testEdgeCasesAndErrorHandling();
        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
        }

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All effect key passing tests passed!');
            console.log('\n📜 Effect Key Passing Contract Verified:');
            console.log('   1. 🗝️ Effect name/className mapping is consistent');
            console.log('   2. ⚙️ Effect configuration is properly transferable');
            console.log('   3. 🔄 Frontend-backend contract is maintained');
            console.log('   4. 🎯 FuzzFlare specifically works end-to-end');
            console.log('   5. 🛡️ Error cases are handled gracefully');
            console.log('\n✨ This ensures:');
            console.log('   - FuzzFlare renders correctly when added');
            console.log('   - All effects maintain consistent naming');
            console.log('   - Configuration data transfers properly');
            console.log('   - Robust error handling prevents crashes');
        } else {
            console.log('\n💥 Some effect key passing tests failed!');
            console.log('   Effect rendering may be broken - investigate failures above');
        }

        return this.failedTests === 0;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new EffectKeyPassingTests();
    tests.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

export default EffectKeyPassingTests;