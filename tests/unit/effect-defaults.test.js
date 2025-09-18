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
                if (!error.message.includes('No config found')) {
                    throw new Error('getEffectDefaults should throw specific error for non-existent effect');
                }
            }

            // Test 2: Known effect without config should throw error
            try {
                await this.effectsManager.getEffectDefaults('fuzz-flare');
                throw new Error('getEffectDefaults should throw for fuzz-flare (effect without config)');
            } catch (error) {
                if (!error.message.includes('No config found')) {
                    throw new Error('getEffectDefaults should throw specific error for fuzz-flare');
                }
            }

            // Test 3: Effects without configs should consistently throw errors
            const effectsWithoutConfigs = ['hex', 'amp', 'blink-on-blink-on-blink-redux', 'curved-red-eye'];
            for (const effectName of effectsWithoutConfigs) {
                try {
                    await this.effectsManager.getEffectDefaults(effectName);
                    throw new Error(`${effectName} should throw error if it has no config`);
                } catch (error) {
                    if (!error.message.includes('No config found')) {
                        throw new Error(`${effectName} should throw specific config error: ${error.message}`);
                    }
                    // This is expected - effect should fail if no config
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

            // Test 1: Effect without config should return success=false (fail fast)
            const result1 = await mockIpcHandler('fuzz-flare');
            if (!result1.hasOwnProperty('success')) {
                throw new Error('IPC response should have success property');
            }

            if (!result1.hasOwnProperty('defaults')) {
                throw new Error('IPC response should have defaults property');
            }

            if (result1.success) {
                throw new Error('IPC response should have success=false for effects without config');
            }

            if (!result1.error || !result1.error.includes('No config found')) {
                throw new Error('IPC response should include specific error message');
            }

            // Test 2: Non-existent effect should also return success=false (fail fast)
            const result2 = await mockIpcHandler('non-existent-effect-xyz');
            if (result2.success) {
                throw new Error('IPC response should fail for non-existent effects');
            }

            if (!result2.error || !result2.error.includes('No config found')) {
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

            // Test 1: Effect without config should work in EffectPicker
            const effect1 = { name: 'fuzz-flare', category: 'primary' };
            const result1 = await mockEffectPickerBehavior(effect1);

            if (!result1.success) {
                throw new Error('EffectPicker should handle effects without config: ' + result1.error);
            }

            if (!result1.effect || typeof result1.effect.config !== 'object') {
                throw new Error('EffectPicker should create valid effect object');
            }

            // Test 2: Multiple effects without configs should all work
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

            // Test 1: No errors should be thrown for effects without configs
            const effectsWithoutConfigs = ['hex', 'fuzz-flare', 'amp', 'blink-on-blink-on-blink-redux'];

            for (const effectName of effectsWithoutConfigs) {
                try {
                    const result = await this.effectsManager.getEffectDefaults(effectName);
                    // Should return empty object, not throw
                    if (typeof result !== 'object') {
                        throw new Error(`Should return object for ${effectName}`);
                    }
                } catch (error) {
                    throw new Error(`Should not throw for ${effectName}: ${error.message}`);
                }
            }

            // Test 2: Invalid inputs should be handled gracefully
            const invalidInputs = [null, undefined, '', 123, {}];

            for (const input of invalidInputs) {
                try {
                    const result = await this.effectsManager.getEffectDefaults(input);
                    // Should return empty object or handle gracefully
                    if (typeof result !== 'object') {
                        console.log(`Warning: Invalid input ${input} returned non-object`);
                    }
                } catch (error) {
                    // This is acceptable - invalid inputs may throw
                    console.log(`Note: Invalid input ${input} threw: ${error.message}`);
                }
            }

            // Test 3: Response format should always be consistent
            const result = await this.effectsManager.getEffectDefaults('any-effect-name');
            if (typeof result !== 'object' || result === null) {
                throw new Error('getEffectDefaults should always return object');
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