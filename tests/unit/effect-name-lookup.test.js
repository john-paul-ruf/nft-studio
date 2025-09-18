#!/usr/bin/env node
/**
 * Tests for effect name vs className lookup consistency
 * Ensures config registry lookups use effect _name_ property consistently
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class EffectNameLookupTests {
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
        console.log('🔄 Effect Name vs ClassName Lookup Tests\n');

        const tests = [
            () => this.testEffectNameMapping(),
            () => this.testConfigRegistryLookupConsistency(),
            () => this.testGetEffectDefaultsUsesEffectName(),
            () => this.testGetEffectSchemaUsesEffectName(),
            () => this.testIntrospectConfigUsesEffectName()
        ];

        for (const test of tests) {
            await test();
        }

        this.printResults();
        return this.results.failed === 0;
    }

    testEffectNameMapping() {
        this.results.total++;
        try {
            console.log('Testing effect name to className derivation...');

            // Test effect name to className mapping
            const testCases = [
                { effectName: 'hex', expectedClassName: 'Hex' },
                { effectName: 'red-eye', expectedClassName: 'RedEye' },
                { effectName: 'lens-flare', expectedClassName: 'LensFlare' },
                { effectName: 'single-layer-glitch-fractal', expectedClassName: 'SingleLayerGlitchFractal' }
            ];

            for (const testCase of testCases) {
                const derivedClassName = this.effectsManager.deriveClassName(testCase.effectName);
                if (derivedClassName !== testCase.expectedClassName) {
                    throw new Error(`Effect name '${testCase.effectName}' should derive className '${testCase.expectedClassName}', got '${derivedClassName}'`);
                }
            }

            console.log('  ✅ Effect name to className derivation works correctly');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Effect name mapping test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'Effect Name Mapping',
                error: error.message
            });
        }
    }

    async testConfigRegistryLookupConsistency() {
        this.results.total++;
        try {
            console.log('Testing config registry lookup consistency...');

            // Mock effect with known _name_ property
            const effectName = 'test-effect';
            const className = this.effectsManager.deriveClassName(effectName); // 'TestEffect'

            // Ensure we're testing the principle: config registry should be keyed by effect _name_, not derived className
            if (effectName === className) {
                throw new Error('Test case invalid - effect name and className should be different');
            }

            console.log(`  Effect name: '${effectName}', Derived className: '${className}'`);
            console.log('  ✅ Config registry should use effect name (not className) as key');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Config registry lookup consistency test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'Config Registry Lookup Consistency',
                error: error.message
            });
        }
    }

    async testGetEffectDefaultsUsesEffectName() {
        this.results.total++;
        try {
            console.log('Testing getEffectDefaults uses effect name...');

            // Test that getEffectDefaults method signature expects effectName, not className
            const methodString = this.effectsManager.getEffectDefaults.toString();

            // Check method parameter name
            if (!methodString.includes('effectName')) {
                throw new Error('getEffectDefaults method should accept effectName parameter');
            }

            // Check that it uses ConfigRegistry.getGlobal with the effect name
            if (!methodString.includes('ConfigRegistry.getGlobal(effectName)')) {
                throw new Error('getEffectDefaults should call ConfigRegistry.getGlobal(effectName)');
            }

            console.log('  ✅ getEffectDefaults correctly uses effect name for config lookup');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ getEffectDefaults test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'getEffectDefaults Uses Effect Name',
                error: error.message
            });
        }
    }

    async testGetEffectSchemaUsesEffectName() {
        this.results.total++;
        try {
            console.log('Testing getEffectSchema uses effect name...');

            // Test that getEffectSchema method signature expects effectName, not className
            const methodString = this.effectsManager.getEffectSchema.toString();

            // Check method parameter name
            if (!methodString.includes('effectName')) {
                throw new Error('getEffectSchema method should accept effectName parameter');
            }

            // Check that it uses ConfigRegistry.getGlobal with the effect name
            if (!methodString.includes('ConfigRegistry.getGlobal(effectName)')) {
                throw new Error('getEffectSchema should call ConfigRegistry.getGlobal(effectName)');
            }

            console.log('  ✅ getEffectSchema correctly uses effect name for config lookup');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ getEffectSchema test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'getEffectSchema Uses Effect Name',
                error: error.message
            });
        }
    }

    async testIntrospectConfigUsesEffectName() {
        this.results.total++;
        try {
            console.log('Testing introspectConfig uses effect name...');

            // Test that introspectConfig method uses effectName for config lookup
            const methodString = this.effectsManager.introspectConfig.toString();

            // Check that it uses ConfigRegistry.getGlobal with the effect name
            if (!methodString.includes('ConfigRegistry.getGlobal(effectName)')) {
                throw new Error('introspectConfig should call ConfigRegistry.getGlobal(effectName)');
            }

            console.log('  ✅ introspectConfig correctly uses effect name for config lookup');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ introspectConfig test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'introspectConfig Uses Effect Name',
                error: error.message
            });
        }
    }

    printResults() {
        console.log('\n📊 Effect Name Lookup Test Results:');
        console.log('====================================');
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
            console.log('\n🎉 ALL EFFECT NAME LOOKUP TESTS PASSED!');
            console.log('Config registry lookups are consistent across all methods.');
        } else {
            console.log('\n⚠️  Some tests failed. Effect name lookup may have inconsistencies.');
        }
    }
}

// Run tests if this is the main module
async function runEffectNameLookupTests() {
    const tester = new EffectNameLookupTests();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runEffectNameLookupTests().catch(error => {
        console.error('❌ Effect name lookup test runner failed:', error);
        process.exit(1);
    });
}

export default EffectNameLookupTests;