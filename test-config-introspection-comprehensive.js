#!/usr/bin/env node
/**
 * Comprehensive test for config introspection
 * Ensures ALL effects can have their configs introspected without errors
 */

const { spawn } = require('child_process');
const { ipcMain, app, BrowserWindow } = require('electron');

// Mock Electron environment for testing
process.env.NODE_ENV = 'test';

console.log('🔧 Comprehensive Config Introspection Test...\n');

// Import the main process modules we need to test
const EffectRegistryService = require('./src/main/services/EffectRegistryService');
const NftEffectsManager = require('./src/main/implementations/NftEffectsManager');

class ConfigIntrospectionTester {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async testAllEffects() {
        console.log('📊 Starting comprehensive config introspection test...\n');

        try {
            // Get all effects
            const effectsResponse = await this.effectsManager.discoverEffects();
            if (!effectsResponse.success) {
                throw new Error('Failed to discover effects: ' + effectsResponse.error);
            }

            const allEffects = [];
            for (const [category, effects] of Object.entries(effectsResponse.effects)) {
                allEffects.push(...effects);
            }

            console.log(`Found ${allEffects.length} effects to test:\n`);

            // Test each effect
            for (const effect of allEffects) {
                await this.testSingleEffect(effect);
            }

            this.printResults();
            return this.results.failed === 0;

        } catch (error) {
            console.error('❌ Test setup failed:', error.message);
            return false;
        }
    }

    async testSingleEffect(effect) {
        this.results.total++;
        const effectName = effect.name;

        try {
            console.log(`Testing: ${effectName}...`);

            // Test config introspection
            const introspectionResult = await this.effectsManager.introspectConfig({
                effectName: effectName,
                projectData: { resolution: 'hd', isHoz: true }
            });

            if (!introspectionResult.success) {
                throw new Error(introspectionResult.error);
            }

            // Validate the result structure
            this.validateIntrospectionResult(introspectionResult, effectName);

            console.log(`  ✅ ${effectName} - PASS`);
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ ${effectName} - FAIL: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                effect: effectName,
                error: error.message,
                configClassName: effect.configClassName
            });
        }
    }

    validateIntrospectionResult(result, effectName) {
        // Validate required properties exist
        if (!result.hasOwnProperty('defaultInstance')) {
            throw new Error('Missing defaultInstance');
        }

        if (!result.hasOwnProperty('effectMetadata')) {
            throw new Error('Missing effectMetadata');
        }

        // Validate defaultInstance is an object
        if (typeof result.defaultInstance !== 'object') {
            throw new Error('defaultInstance is not an object');
        }

        // For debugging: log the effect structure
        if (result.effectMetadata.name === 'hex') {
            console.log('  📋 Debug hex effect:');
            console.log('    configClassName:', result.effectMetadata.configClassName);
            console.log('    defaultInstance keys:', Object.keys(result.defaultInstance));
        }
    }

    printResults() {
        console.log('\n📊 Test Results:');
        console.log('=================');
        console.log(`Total Effects Tested: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);

        if (this.results.failed > 0) {
            console.log('\n🚨 Failed Effects:');
            this.results.errors.forEach(error => {
                console.log(`  - ${error.effect}: ${error.error}`);
                console.log(`    Config Class: ${error.configClassName}`);
            });
        }

        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        console.log(`\n📈 Pass Rate: ${passRate}%`);

        if (this.results.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Config introspection is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please fix the issues above.');
        }
    }
}

// Run the test
async function runTest() {
    const tester = new ConfigIntrospectionTester();
    const success = await tester.testAllEffects();
    process.exit(success ? 0 : 1);
}

// Only run if this is the main module
if (require.main === module) {
    runTest().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = ConfigIntrospectionTester;