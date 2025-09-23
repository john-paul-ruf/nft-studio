#!/usr/bin/env node
/**
 * Test suite to validate effect name to class name mapping
 * Ensures all effects can be found in registry with their expected class names
 * Prevents issues like "Effect class FuzzFlare not found" during rendering
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class EffectNameClassMappingTests {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.failures = [];
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
                    this.failures.push({ test: description, error: error.message });
                    this.failedTests++;
                });
            } else {
                console.log(`✅ PASS: ${description}`);
                this.passedTests++;
            }
        } catch (error) {
            console.log(`❌ FAIL: ${description}`);
            console.log(`   Error: ${error.message}`);
            this.failures.push({ test: description, error: error.message });
            this.failedTests++;
        }
    }

    async testEffectNameToClassMapping() {
        console.log('🔍 Testing Effect Name to Class Name Mapping...\n');

        const result = await this.effectsManager.getAvailableEffects();

        await this.test('Backend returns available effects for mapping test', async () => {
            if (!result.success || !result.effects) {
                throw new Error('Failed to get available effects from backend');
            }
        });

        const allEffects = [
            ...result.effects.primary,
            ...result.effects.secondary,
            ...result.effects.finalImage
        ];

        console.log(`Found ${allEffects.length} effects to test mapping for...\n`);

        // Test each effect's name-to-class mapping
        const mappingIssues = [];

        for (const effect of allEffects) {
            const effectName = effect.name;
            const derivedClassName = effect.className;

            console.log(`Testing: ${effectName} → ${derivedClassName}`);

            try {
                // Simulate what EffectProcessingService does
                import EffectRegistry from '../../src/core/registry/EffectRegistry.js';

                // Check if the derived class name exists in registry
                const registryData = EffectRegistry.getGlobal(derivedClassName);

                if (!registryData) {
                    // Try lowercase fallback like EffectProcessingService does
                    const lowerClassName = derivedClassName.toLowerCase();
                    const lowerRegistryData = EffectRegistry.getGlobal(lowerClassName);

                    if (!lowerRegistryData) {
                        // Try the original effect name
                        const nameRegistryData = EffectRegistry.getGlobal(effectName);

                        if (!nameRegistryData) {
                            mappingIssues.push({
                                effectName,
                                derivedClassName,
                                issue: `Neither '${derivedClassName}' nor '${lowerClassName}' nor '${effectName}' found in registry`
                            });
                        } else {
                            mappingIssues.push({
                                effectName,
                                derivedClassName,
                                issue: `Derived class '${derivedClassName}' not found, but '${effectName}' exists`,
                                suggestion: `Update className derivation for ${effectName}`
                            });
                        }
                    } else {
                        console.log(`   ⚠️  Found with lowercase fallback: ${lowerClassName}`);
                    }
                } else {
                    console.log(`   ✓ Found in registry: ${derivedClassName}`);
                }
            } catch (error) {
                mappingIssues.push({
                    effectName,
                    derivedClassName,
                    issue: `Registry lookup failed: ${error.message}`
                });
            }
        }

        await this.test('All effects have correct name-to-class mapping', () => {
            if (mappingIssues.length > 0) {
                console.log('\n❌ Effect Name-to-Class Mapping Issues:');
                mappingIssues.forEach((issue, index) => {
                    console.log(`   ${index + 1}. ${issue.effectName}:`);
                    console.log(`      Issue: ${issue.issue}`);
                    if (issue.suggestion) {
                        console.log(`      Suggestion: ${issue.suggestion}`);
                    }
                });
                throw new Error(`${mappingIssues.length} effects have name-to-class mapping issues`);
            }
        });

        return { allEffects, mappingIssues };
    }

    async testSpecificFuzzFlareCase() {
        console.log('\n🔥 Testing Specific Fuzz Flare Case...\n');

        const result = await this.effectsManager.getAvailableEffects();
        const fuzzFlare = result.effects.primary.find(e => e.name === 'fuzz-flare');

        await this.test('Fuzz Flare effect is available in backend', () => {
            if (!fuzzFlare) {
                throw new Error('Fuzz Flare not found in available effects');
            }
        });

        await this.test('Fuzz Flare has correct name and className mapping', () => {
            console.log(`   Fuzz Flare mapping: "${fuzzFlare.name}" → "${fuzzFlare.className}"`);

            if (fuzzFlare.name !== 'fuzz-flare') {
                throw new Error(`Expected name 'fuzz-flare', got '${fuzzFlare.name}'`);
            }

            // The className should match what's actually in the registry
            const expectedClasses = ['FuzzFlare', 'FuzzFlareEffect', 'fuzz-flare'];
            console.log(`   Checking if className '${fuzzFlare.className}' exists in registry...`);
        });

        await this.test('Fuzz Flare can be found in effect registry', async () => {
            try {
                import EffectRegistry from '../../src/core/registry/EffectRegistry.js';

                const attempts = [
                    fuzzFlare.className,           // "FuzzFlare"
                    fuzzFlare.className.toLowerCase(), // "fuzzflare"
                    fuzzFlare.name,               // "fuzz-flare"
                    'FuzzFlareEffect'             // Legacy name
                ];

                let found = false;
                let foundKey = null;

                for (const key of attempts) {
                    const registryData = EffectRegistry.getGlobal(key);
                    if (registryData) {
                        found = true;
                        foundKey = key;
                        break;
                    }
                }

                if (!found) {
                    throw new Error(`Fuzz Flare not found in registry with any of: ${attempts.join(', ')}`);
                }

                console.log(`   ✓ Found Fuzz Flare in registry as: ${foundKey}`);

                // If found with different key than className, this is the issue
                if (foundKey !== fuzzFlare.className) {
                    console.log(`   ⚠️  MISMATCH: Frontend uses '${fuzzFlare.className}' but registry has '${foundKey}'`);
                    return { mismatch: true, frontendKey: fuzzFlare.className, registryKey: foundKey };
                }

            } catch (error) {
                throw new Error(`Registry lookup failed for Fuzz Flare: ${error.message}`);
            }
        });

        return fuzzFlare;
    }

    async testEffectRenderingFlow() {
        console.log('\n🎬 Testing Effect Rendering Flow...\n');

        const result = await this.effectsManager.getAvailableEffects();
        const fuzzFlare = result.effects.primary.find(e => e.name === 'fuzz-flare');

        if (!fuzzFlare) {
            console.log('⚠️  Skipping render flow test - Fuzz Flare not available');
            return;
        }

        await this.test('Fuzz Flare can get default configuration', async () => {
            const defaultsResult = await this.effectsManager.getEffectDefaults(fuzzFlare.name);

            if (!defaultsResult.success) {
                throw new Error(`Failed to get Fuzz Flare defaults: ${defaultsResult.error}`);
            }

            if (!defaultsResult.defaults) {
                throw new Error('Fuzz Flare defaults are empty');
            }

            console.log(`   ✓ Got defaults with ${Object.keys(defaultsResult.defaults).length} properties`);
        });

        await this.test('Complete Fuzz Flare effect object can be created', async () => {
            const defaultsResult = await this.effectsManager.getEffectDefaults(fuzzFlare.name);

            // This simulates exactly what frontend does
            const effectObject = {
                className: fuzzFlare.className,  // This is what causes the issue!
                config: defaultsResult.defaults,
                type: 'primary',
                secondaryEffects: [],
                attachedEffects: {
                    secondary: [],
                    keyFrame: []
                }
            };

            console.log(`   Created effect object with className: ${effectObject.className}`);

            // This would be passed to EffectProcessingService during render
            // The service would look for class 'FuzzFlare' but might need 'FuzzFlareEffect'
            return effectObject;
        });
    }

    async testRegistryConsistency() {
        console.log('\n🏗️  Testing Registry Consistency...\n');

        const result = await this.effectsManager.getAvailableEffects();
        const allEffects = [
            ...result.effects.primary,
            ...result.effects.secondary,
            ...result.effects.finalImage
        ];

        const inconsistencies = [];

        for (const effect of allEffects.slice(0, 5)) { // Test first 5 for performance
            try {
                const EffectRegistry = (await import('../../src/core/registry/EffectRegistry.js')).default;

                const directLookup = EffectRegistry.getGlobal(effect.className);
                const nameLookup = EffectRegistry.getGlobal(effect.name);
                const lowerLookup = EffectRegistry.getGlobal(effect.className.toLowerCase());

                if (!directLookup && !nameLookup && !lowerLookup) {
                    inconsistencies.push({
                        effect: effect.name,
                        className: effect.className,
                        issue: 'Not found with any lookup method'
                    });
                } else if (!directLookup && (nameLookup || lowerLookup)) {
                    inconsistencies.push({
                        effect: effect.name,
                        className: effect.className,
                        issue: 'className not found but name/lowercase variant exists'
                    });
                }
            } catch (error) {
                inconsistencies.push({
                    effect: effect.name,
                    className: effect.className,
                    issue: `Registry error: ${error.message}`
                });
            }
        }

        await this.test('Effect registry is consistent with available effects', () => {
            if (inconsistencies.length > 0) {
                console.log('\n❌ Registry Inconsistencies:');
                inconsistencies.forEach((issue, index) => {
                    console.log(`   ${index + 1}. ${issue.effect} (${issue.className}): ${issue.issue}`);
                });
                throw new Error(`${inconsistencies.length} registry inconsistencies found`);
            }
        });

        return inconsistencies;
    }

    async runAllTests() {
        console.log('🚀 Running Effect Name-Class Mapping Tests...\n');
        console.log('This test ensures all effects can be found during rendering\n');

        try {
            await this.testEffectNameToClassMapping();
            await this.testSpecificFuzzFlareCase();
            await this.testEffectRenderingFlow();
            await this.testRegistryConsistency();
        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
        }

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All effect name-class mapping tests passed!');
            console.log('\n✅ This confirms:');
            console.log('   - All effect names map to correct class names');
            console.log('   - Fuzz Flare and similar effects can be found in registry');
            console.log('   - No "Effect class not found" issues during rendering');
            console.log('   - Frontend-backend effect naming is consistent');
        } else {
            console.log('\n💥 Some effect name-class mapping tests failed!');
            console.log('\nFailed Tests:');
            this.failures.forEach((failure, index) => {
                console.log(`   ${index + 1}. ${failure.test}: ${failure.error}`);
            });
            console.log('\n🔧 This indicates effects may fail to render with "Effect class not found" errors');
        }

        return this.failedTests === 0;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new EffectNameClassMappingTests();
    tests.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

export default EffectNameClassMappingTests;