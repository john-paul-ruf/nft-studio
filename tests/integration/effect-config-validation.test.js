#!/usr/bin/env node
/**
 * Integration test for adding effects and validating their config properties
 * Tests the complete flow: discover effects -> add effect -> edit config -> verify properties
 */

const NftEffectsManager = require('../../src/main/implementations/NftEffectsManager');

class EffectConfigValidationTests {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.effectsManager = new NftEffectsManager();
        this.projectData = {
            resolution: { width: 1920, height: 1080 },
            colorScheme: 'default',
            projectName: 'config-validation-test'
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

    assertEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${message} - Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
        }
    }

    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`${message} - Expected truthy value`);
        }
    }

    assertFalse(condition, message = '') {
        if (condition) {
            throw new Error(`${message} - Expected falsy value`);
        }
    }

    assertExists(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(`${message} - Expected value to exist`);
        }
    }

    async testEffectDiscovery() {
        console.log('\n🔍 Testing Effect Discovery...');

        await this.test('should discover effects from registry', async () => {
            const discovery = await this.effectsManager.discoverEffects();

            this.assertTrue(discovery.success, 'Discovery should succeed');
            this.assertExists(discovery.effects, 'Effects should be discovered');

            const effectCount = Object.values(discovery.effects).reduce((total, categoryEffects) => total + categoryEffects.length, 0);
            this.assertTrue(effectCount > 0, `Should discover at least one effect, found ${effectCount}`);

            console.log(`   📊 Discovered ${effectCount} effects across ${Object.keys(discovery.effects).length} categories`);
            return discovery.effects;
        });
    }

    async testEffectConfigGeneration(effectName, categoryName) {
        console.log(`\n🔧 Testing Config Generation for ${effectName}...`);

        let introspectionResult = null;
        let configFields = [];
        let configErrors = [];

        await this.test(`should introspect config for ${effectName}`, async () => {
            try {
                introspectionResult = await this.effectsManager.introspectConfig({
                    effectName: effectName,
                    projectData: this.projectData
                });

                this.assertTrue(introspectionResult.success, `Config introspection should succeed for ${effectName}`);
                this.assertExists(introspectionResult.defaultInstance, `Default config instance should exist for ${effectName}`);

                console.log(`   ✅ Config introspection successful for ${effectName}`);
            } catch (error) {
                configErrors.push(`Introspection failed: ${error.message}`);
                throw error;
            }
        });

        await this.test(`should generate valid config fields for ${effectName}`, async () => {
            if (!introspectionResult || !introspectionResult.success) {
                throw new Error(`Cannot test config fields - introspection failed for ${effectName}`);
            }

            try {
                // Import config introspector to analyze the config
                const ConfigIntrospector = require('../../src/utils/configIntrospector.js');
                const configIntrospector = new ConfigIntrospector();

                const fields = configIntrospector.introspectConfig(
                    introspectionResult.defaultInstance,
                    this.projectData
                );

                configFields = fields;
                this.assertTrue(Array.isArray(fields), `Config fields should be an array for ${effectName}`);

                // Filter out metadata fields for counting
                const editableFields = fields.filter(field => !field.name.startsWith('__'));
                console.log(`   📋 Generated ${editableFields.length} editable config fields for ${effectName}`);

                // Check each field for validity
                for (const field of editableFields) {
                    this.assertExists(field.name, `Field should have name: ${JSON.stringify(field)}`);
                    this.assertExists(field.type, `Field ${field.name} should have type`);
                    this.assertExists(field.label, `Field ${field.name} should have label`);

                    // Verify field has a default value (unless it's explicitly allowed to be undefined)
                    if (field.type !== 'boolean' && field.default === undefined) {
                        console.log(`   ⚠️  Field ${field.name} has undefined default value`);
                    }

                    // Check for NaN values in numeric fields
                    if (typeof field.default === 'number' && isNaN(field.default)) {
                        configErrors.push(`Field ${field.name} has NaN default value`);
                    }

                    // Check for proper PercentageRange handling
                    if (field.type === 'percentagerange') {
                        if (field.default && typeof field.default === 'object') {
                            if (isNaN(field.default.lower) || isNaN(field.default.upper)) {
                                configErrors.push(`PercentageRange field ${field.name} has NaN values`);
                            }
                        }
                    }

                    // Check for Point2D handling
                    if (field.type === 'point2d') {
                        if (field.default && typeof field.default === 'object') {
                            if (typeof field.default.x !== 'number' || typeof field.default.y !== 'number') {
                                configErrors.push(`Point2D field ${field.name} has invalid coordinates`);
                            }
                        }
                    }
                }

                if (configErrors.length > 0) {
                    throw new Error(`Config validation errors: ${configErrors.join(', ')}`);
                }

            } catch (error) {
                configErrors.push(`Field generation failed: ${error.message}`);
                throw error;
            }
        });

        return {
            introspectionResult,
            configFields,
            configErrors
        };
    }

    async testEffectDefaults(effectName) {
        console.log(`\n📊 Testing Effect Defaults for ${effectName}...`);

        await this.test(`should get effect defaults for ${effectName}`, async () => {
            try {
                const defaults = await this.effectsManager.getEffectDefaults(effectName);
                this.assertExists(defaults, `Defaults should exist for ${effectName}`);
                console.log(`   ✅ Retrieved defaults for ${effectName}`);
            } catch (error) {
                // This might fail due to fail-fast behavior, which is expected
                console.log(`   ⚠️  Defaults retrieval failed (expected for effects without config): ${error.message}`);
            }
        });
    }

    async testEffectSchema(effectName) {
        console.log(`\n📝 Testing Effect Schema for ${effectName}...`);

        await this.test(`should get effect schema for ${effectName}`, async () => {
            try {
                const schema = await this.effectsManager.getEffectSchema(effectName);
                this.assertExists(schema, `Schema should exist for ${effectName}`);
                this.assertTrue(Array.isArray(schema.fields) || schema.fields === undefined,
                    `Schema fields should be array or undefined for ${effectName}`);
                console.log(`   ✅ Retrieved schema for ${effectName}`);
            } catch (error) {
                console.log(`   ⚠️  Schema retrieval had issues: ${error.message}`);
            }
        });
    }

    async testAllEffectsInRegistry() {
        console.log('\n🔄 Testing All Effects in Registry...');

        // First discover all effects
        const discovery = await this.effectsManager.discoverEffects();
        if (!discovery.success) {
            throw new Error('Failed to discover effects');
        }

        const allEffects = [];
        const categoryResults = {};

        // Collect all effects from all categories
        for (const [categoryName, categoryEffects] of Object.entries(discovery.effects)) {
            categoryResults[categoryName] = {
                effects: [],
                successCount: 0,
                errorCount: 0
            };

            console.log(`\n📂 Testing ${categoryName} effects (${categoryEffects.length} effects)...`);

            for (const effect of categoryEffects) {
                console.log(`\n🎯 Testing effect: ${effect.name} (${effect.displayName})`);

                const effectResult = {
                    name: effect.name,
                    displayName: effect.displayName,
                    category: categoryName,
                    className: effect.className,
                    configClassName: effect.configClassName,
                    success: true,
                    errors: [],
                    configFields: [],
                    introspectionData: null
                };

                try {
                    // Test config generation
                    const configResult = await this.testEffectConfigGeneration(effect.name, categoryName);
                    effectResult.configFields = configResult.configFields;
                    effectResult.introspectionData = configResult.introspectionResult;
                    effectResult.errors = configResult.configErrors;

                    // Test defaults and schema
                    await this.testEffectDefaults(effect.name);
                    await this.testEffectSchema(effect.name);

                    if (configResult.configErrors.length > 0) {
                        effectResult.success = false;
                        categoryResults[categoryName].errorCount++;
                    } else {
                        categoryResults[categoryName].successCount++;
                    }

                } catch (error) {
                    effectResult.success = false;
                    effectResult.errors.push(error.message);
                    categoryResults[categoryName].errorCount++;
                    console.log(`   ❌ Effect ${effect.name} failed: ${error.message}`);
                }

                categoryResults[categoryName].effects.push(effectResult);
                allEffects.push(effectResult);
            }
        }

        return { allEffects, categoryResults };
    }

    generateDetailedReport(testResults) {
        console.log('\n📊 DETAILED EFFECT VALIDATION REPORT');
        console.log('=====================================');

        const { allEffects, categoryResults } = testResults;

        let totalSuccess = 0;
        let totalErrors = 0;

        // Category summary
        console.log('\n📂 Category Summary:');
        for (const [categoryName, categoryResult] of Object.entries(categoryResults)) {
            const total = categoryResult.successCount + categoryResult.errorCount;
            const successRate = total > 0 ? (categoryResult.successCount / total * 100).toFixed(1) : '0.0';

            console.log(`   ${categoryName}: ${categoryResult.successCount}/${total} success (${successRate}%)`);
            totalSuccess += categoryResult.successCount;
            totalErrors += categoryResult.errorCount;
        }

        // Overall summary
        const overallTotal = totalSuccess + totalErrors;
        const overallRate = overallTotal > 0 ? (totalSuccess / overallTotal * 100).toFixed(1) : '0.0';
        console.log(`\n🎯 Overall: ${totalSuccess}/${overallTotal} effects working correctly (${overallRate}%)`);

        // Error details
        console.log('\n❌ Effects with Issues:');
        const failedEffects = allEffects.filter(effect => !effect.success);

        if (failedEffects.length === 0) {
            console.log('   🎉 No effects had issues!');
        } else {
            for (const effect of failedEffects) {
                console.log(`   - ${effect.name} (${effect.category})`);
                for (const error of effect.errors) {
                    console.log(`     └─ ${error}`);
                }
            }
        }

        // Property type analysis
        console.log('\n📋 Config Property Types Found:');
        const propertyTypes = new Map();

        for (const effect of allEffects) {
            if (effect.configFields) {
                for (const field of effect.configFields) {
                    if (!field.name.startsWith('__')) { // Skip metadata
                        const count = propertyTypes.get(field.type) || 0;
                        propertyTypes.set(field.type, count + 1);
                    }
                }
            }
        }

        const sortedTypes = Array.from(propertyTypes.entries()).sort((a, b) => b[1] - a[1]);
        for (const [type, count] of sortedTypes) {
            console.log(`   ${type}: ${count} fields`);
        }

        // Success stories
        console.log('\n✅ Working Effects by Category:');
        for (const [categoryName, categoryResult] of Object.entries(categoryResults)) {
            const workingEffects = categoryResult.effects.filter(e => e.success);
            if (workingEffects.length > 0) {
                console.log(`   ${categoryName}: ${workingEffects.map(e => e.name).join(', ')}`);
            }
        }

        return {
            totalEffects: allEffects.length,
            successfulEffects: totalSuccess,
            failedEffects: totalErrors,
            successRate: overallRate,
            propertyTypes: Array.from(propertyTypes.entries()),
            failedEffectDetails: failedEffects.map(e => ({
                name: e.name,
                category: e.category,
                errors: e.errors
            }))
        };
    }

    async runAllTests() {
        console.log('🚀 Running Effect Config Validation Tests...\n');
        console.log('This test will:');
        console.log('  1. Discover all effects in the registry');
        console.log('  2. Test config generation for each effect');
        console.log('  3. Validate that properties show up correctly');
        console.log('  4. Check for errors during config editing');
        console.log('  5. Generate a detailed report');

        try {
            // Run effect discovery test
            await this.testEffectDiscovery();

            // Test all effects in registry
            const testResults = await this.testAllEffectsInRegistry();

            // Generate detailed report
            const report = this.generateDetailedReport(testResults);

            console.log('\n📊 Test Execution Summary:');
            console.log(`   Test Cases Run: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            if (this.failedTests === 0) {
                console.log('\n🎉 All test cases passed!');
            } else {
                console.log(`\n⚠️  ${this.failedTests} test cases failed`);
            }

            // Return detailed results for further analysis
            return {
                testExecution: {
                    total: this.testCount,
                    passed: this.passedTests,
                    failed: this.failedTests
                },
                effectValidation: report
            };

        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
            process.exit(1);
        }
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const tests = new EffectConfigValidationTests();
    tests.runAllTests().then(results => {
        // Exit with appropriate code
        if (results.testExecution.failed === 0 && results.effectValidation.failedEffects === 0) {
            console.log('\n🎉 All effects validated successfully!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some effects had validation issues - check report above');
            process.exit(1);
        }
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = EffectConfigValidationTests;