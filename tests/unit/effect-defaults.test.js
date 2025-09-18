#!/usr/bin/env node
/**
 * Unit tests for getEffectDefaults IPC handler fix
 * Tests the response format fix for effects without configs
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class EffectDefaultsTests {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runAllTests() {
        console.log('🧪 Effect Defaults Response Format Tests\n');

        const tests = [
            () => this.testGetEffectDefaultsReturnFormat(),
            () => this.testIpcResponseFormat(),
            () => this.testEffectPickerCompatibility(),
            () => this.testErrorHandling()
        ];

        for (const test of tests) {
            await test();
        }

        this.printResults();
        return this.results.failed === 0;
    }

    async testGetEffectDefaultsReturnFormat() {
        this.results.total++;
        try {
            console.log('Testing getEffectDefaults return format...');

            // Test 1: Effect without config should throw error (fail fast)
            try {
                await this.effectsManager.getEffectDefaults('non-existent-effect');
                throw new Error('getEffectDefaults should throw for non-existent effect');
            } catch (error) {
                if (!error.message.includes('Effect not found')) {
                    throw new Error('getEffectDefaults should throw specific error for non-existent effect');
                }
            }

            // Test 2: Known effect WITH config should return defaults
            const fuzzFlareDefaults = await this.effectsManager.getEffectDefaults('fuzz-flare');
            if (!fuzzFlareDefaults || typeof fuzzFlareDefaults !== 'object') {
                throw new Error('getEffectDefaults should return object for fuzz-flare (effect with config)');
            }

            // Test 3: Effects with configs should return default objects
            const effectsWithConfigs = ['hex', 'amp', 'blink-on-blink-on-blink-redux', 'curved-red-eye'];
            for (const effectName of effectsWithConfigs) {
                const defaults = await this.effectsManager.getEffectDefaults(effectName);
                if (!defaults || typeof defaults !== 'object') {
                    throw new Error(`${effectName} should return defaults object since it has config`);
                }
            }

            console.log('  ✅ getEffectDefaults return format is correct');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ getEffectDefaults return format test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'getEffectDefaults Return Format',
                error: error.message
            });
        }
    }

    async testIpcResponseFormat() {
        this.results.total++;
        try {
            console.log('Testing IPC response format...');

            // Mock the IPC handler behavior that was fixed
            const mockIpcHandler = async (className) => {
                try {
                    const defaults = await this.effectsManager.getEffectDefaults(className);
                    return {
                        success: true,
                        defaults: defaults || {}
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message,
                        defaults: {}
                    };
                }
            };

            // Test 1: Effect WITH config should return success=true
            const result1 = await mockIpcHandler('fuzz-flare');
            if (!result1.hasOwnProperty('success')) {
                throw new Error('IPC response should have success property');
            }

            if (!result1.hasOwnProperty('defaults')) {
                throw new Error('IPC response should have defaults property');
            }

            if (!result1.success) {
                throw new Error('IPC response should have success=true for effects with config');
            }

            if (!result1.defaults || typeof result1.defaults !== 'object') {
                throw new Error('IPC response should include defaults object');
            }

            // Test 2: Non-existent effect should also return success=false (fail fast)
            const result2 = await mockIpcHandler('non-existent-effect-xyz');
            if (result2.success) {
                throw new Error('IPC response should fail for non-existent effects');
            }

            if (!result2.error || !result2.error.includes('Effect not found')) {
                throw new Error('IPC response should include error for non-existent effects');
            }

            // Test 3: Invalid input should be handled gracefully
            const result3 = await mockIpcHandler(null);
            if (!result3.hasOwnProperty('success') || !result3.hasOwnProperty('defaults')) {
                throw new Error('IPC response should handle null input gracefully');
            }

            console.log('  ✅ IPC response format is correct');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ IPC response format test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'IPC Response Format',
                error: error.message
            });
        }
    }

    async testEffectPickerCompatibility() {
        this.results.total++;
        try {
            console.log('Testing EffectPicker compatibility...');

            // Mock the EffectPicker handleEffectSelect behavior
            const mockEffectPickerBehavior = async (effect) => {
                try {
                    // Simulate the IPC call with the fixed format
                    const mockApiResponse = async (effectName) => {
                        const defaults = await this.effectsManager.getEffectDefaults(effectName);
                        return {
                            success: true,
                            defaults: defaults || {}
                        };
                    };

                    const response = await mockApiResponse(effect.name || effect.className);
                    const defaults = response.success ? response.defaults : {};

                    const newEffect = {
                        className: effect.name || effect.className,
                        config: defaults || {},
                        type: effect.category || 'primary',
                        secondaryEffects: [],
                        keyframeEffects: []
                    };

                    return { success: true, effect: newEffect };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            };

            // Test 1: Effect WITH config should work in EffectPicker
            const effect1 = { name: 'fuzz-flare', category: 'primary' };
            const result1 = await mockEffectPickerBehavior(effect1);

            if (!result1.success) {
                throw new Error('EffectPicker should handle effects with config: ' + result1.error);
            }

            if (!result1.effect || typeof result1.effect.config !== 'object') {
                throw new Error('EffectPicker should create valid effect object');
            }

            // Test 2: Multiple effects with configs should all work
            const testEffects = [
                { name: 'hex', category: 'primary' },
                { name: 'amp', category: 'primary' },
                { name: 'fuzz-flare', category: 'primary' }
            ];

            for (const effect of testEffects) {
                const result = await mockEffectPickerBehavior(effect);
                if (!result.success) {
                    throw new Error(`EffectPicker should handle ${effect.name}: ${result.error}`);
                }
            }

            console.log('  ✅ EffectPicker compatibility is maintained');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ EffectPicker compatibility test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'EffectPicker Compatibility',
                error: error.message
            });
        }
    }

    async testErrorHandling() {
        this.results.total++;
        try {
            console.log('Testing error handling improvements...');

            // Test 1: No errors should be thrown for effects with configs
            const effectsWithConfigs = ['hex', 'fuzz-flare', 'amp', 'blink-on-blink-on-blink-redux'];

            for (const effectName of effectsWithConfigs) {
                const result = await this.effectsManager.getEffectDefaults(effectName);
                // Should return populated object
                if (typeof result !== 'object' || result === null) {
                    throw new Error(`Should return object for ${effectName}`);
                }
                if (Object.keys(result).length === 0) {
                    throw new Error(`Should return non-empty defaults for ${effectName}`);
                }
            }

            // Test 2: Invalid inputs should throw appropriate errors
            const invalidInputs = [null, undefined, '', 123, {}];

            for (const input of invalidInputs) {
                try {
                    await this.effectsManager.getEffectDefaults(input);
                    throw new Error(`Should throw error for invalid input: ${input}`);
                } catch (error) {
                    // This is expected - invalid inputs should throw
                    if (!error.message.includes('Invalid effectName')) {
                        throw new Error(`Should throw specific validation error for ${input}`);
                    }
                }
            }

            // Test 3: Non-existent effects should throw appropriate errors
            try {
                await this.effectsManager.getEffectDefaults('non-existent-effect-xyz');
                throw new Error('Should throw error for non-existent effect');
            } catch (error) {
                if (!error.message.includes('Effect not found')) {
                    throw new Error('Should throw "Effect not found" error');
                }
            }

            console.log('  ✅ Error handling works correctly');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Error handling test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'Error Handling',
                error: error.message
            });
        }
    }

    printResults() {
        console.log('\n📊 Effect Defaults Test Results:');
        console.log('==================================');
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);

        if (this.results.failed > 0) {
            console.log('\n🚨 Failed Tests:');
            this.results.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.error}`);
            });
        }

        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        console.log(`\n📈 Pass Rate: ${passRate}%`);

        if (this.results.failed === 0) {
            console.log('\n🎉 ALL EFFECT DEFAULTS TESTS PASSED!');
            console.log('The IPC response format fix is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Effect defaults may have issues.');
        }
    }
}

// Run tests if this is the main module
async function runEffectDefaultsTests() {
    const tester = new EffectDefaultsTests();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runEffectDefaultsTests().catch(error => {
        console.error('❌ Effect defaults test runner failed:', error);
        process.exit(1);
    });
}

export default EffectDefaultsTests;