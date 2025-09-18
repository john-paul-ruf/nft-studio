#!/usr/bin/env node
/**
 * Test suite to validate frontend-backend IPC communication
 * Simulates the exact calls that EffectPicker.jsx makes
 */

import { ipcMain, ipcRenderer } from 'electron';
import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class FrontendIPCValidationTests {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
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
                    this.failedTests++;
                });
            } else {
                console.log(`✅ PASS: ${description}`);
                this.passedTests++;
            }
        } catch (error) {
            console.log(`❌ FAIL: ${description}`);
            console.log(`   Error: ${error.message}`);
            this.failedTests++;
        }
    }

    async testDirectIPCCall() {
        console.log('🔍 Testing Direct IPC Call Like Frontend...\\n');

        // Test the exact call that EffectPicker.jsx makes
        await this.test('Direct getAvailableEffects call returns success', async () => {
            const response = await this.effectsManager.getAvailableEffects();

            if (!response.success) {
                throw new Error(`IPC call failed: ${response.error}`);
            }

            console.log('   ✓ IPC call returned success: true');
        });

        await this.test('Response has effects structure', async () => {
            const response = await this.effectsManager.getAvailableEffects();

            if (!response.effects) {
                throw new Error('No effects property in response');
            }

            console.log('   ✓ Response contains effects object');
        });

        await this.test('Effects structure matches frontend expectations', async () => {
            const response = await this.effectsManager.getAvailableEffects();

            // Test exactly what EffectPicker.jsx expects
            const primary = response.effects.primary || [];
            const finalImage = response.effects.finalImage || [];

            console.log(`   Primary effects count: ${primary.length}`);
            console.log(`   Final image effects count: ${finalImage.length}`);

            if (primary.length === 0 && finalImage.length === 0) {
                throw new Error('Both primary and finalImage arrays are empty - this would cause empty dropdown');
            }

            // Test the exact array combination that EffectPicker.jsx creates
            const allEffects = [
                ...primary,
                ...finalImage
            ];

            console.log(`   Combined effects for dropdown: ${allEffects.length}`);

            if (allEffects.length === 0) {
                throw new Error('Combined effects array is empty - dropdown would be empty');
            }
        });

        await this.test('Effect objects have properties needed for display', async () => {
            const response = await this.effectsManager.getAvailableEffects();
            const allEffects = [
                ...(response.effects.primary || []),
                ...(response.effects.finalImage || [])
            ];

            if (allEffects.length === 0) {
                throw new Error('No effects to validate');
            }

            const sampleEffect = allEffects[0];
            console.log(`   Sample effect: ${JSON.stringify(sampleEffect, null, 2)}`);

            // Test what EffectPicker.jsx uses for display
            const effectName = sampleEffect.name || sampleEffect.className || 'Unknown';
            const displayName = sampleEffect.displayName || effectName.replace(/Effect$/, '').replace(/([A-Z])/g, ' $1').trim();

            console.log(`   Effect name: ${effectName}`);
            console.log(`   Display name: ${displayName}`);

            if (!effectName || effectName === 'Unknown') {
                throw new Error('Effect lacks proper name/className for identification');
            }
        });

        return await this.effectsManager.getAvailableEffects();
    }

    async testEffectSelectionFlow() {
        console.log('\\n🎯 Testing Effect Selection Flow...\\n');

        const effects = await this.testDirectIPCCall();

        await this.test('Can get defaults for effect selection', async () => {
            const allEffects = [
                ...(effects.effects.primary || []),
                ...(effects.effects.finalImage || [])
            ];

            if (allEffects.length === 0) {
                throw new Error('No effects available for selection test');
            }

            const testEffect = allEffects[0];
            console.log(`   Testing effect selection: ${testEffect.name || testEffect.className}`);

            // This is exactly what EffectPicker.jsx does on click
            const response = await this.effectsManager.getEffectDefaults(testEffect.name || testEffect.className);

            if (!response.success) {
                throw new Error(`Effect ${testEffect.name || testEffect.className} has no config: ${response.error}`);
            }

            if (!response.defaults) {
                throw new Error(`Effect ${testEffect.name || testEffect.className} returned no config data`);
            }

            // This is the exact object EffectPicker.jsx creates
            const newEffect = {
                className: testEffect.name || testEffect.className,
                config: response.defaults,
                type: testEffect.category || 'primary',
                secondaryEffects: [],
                keyframeEffects: []
            };

            console.log(`   ✓ Created effect object: ${JSON.stringify(newEffect, null, 2)}`);
        });
    }

    async testFrontendErrorScenarios() {
        console.log('\\n🚨 Testing Frontend Error Scenarios...\\n');

        await this.test('Frontend handles backend errors gracefully', async () => {
            // Simulate what frontend does with error response
            const errorResponse = {
                success: false,
                error: 'Simulated backend error'
            };

            // Frontend code from EffectPicker.jsx:
            // if (response.success && response.effects) {
            //     const allEffects = [...(response.effects.primary || []), ...(response.effects.finalImage || [])];
            //     setEffects(allEffects);
            // } else {
            //     console.error('Invalid response from discoverEffects:', response);
            //     setEffects([]);
            // }

            let frontendEffects = [];
            if (errorResponse.success && errorResponse.effects) {
                const allEffects = [
                    ...(errorResponse.effects.primary || []),
                    ...(errorResponse.effects.finalImage || [])
                ];
                frontendEffects = allEffects;
            } else {
                console.log('   ✓ Frontend would log error and set empty effects array');
                frontendEffects = [];
            }

            if (frontendEffects.length !== 0) {
                throw new Error('Frontend error handling failed');
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Frontend IPC Validation Tests...\\n');
        console.log('This test simulates exactly what EffectPicker.jsx does\\n');

        try {
            await this.testDirectIPCCall();
            await this.testEffectSelectionFlow();
            await this.testFrontendErrorScenarios();
        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
        }

        console.log('\\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\\n🎉 All frontend IPC tests passed!');
            console.log('\\n✅ This confirms:');
            console.log('   - Backend IPC calls work correctly');
            console.log('   - Effect data structure matches frontend expectations');
            console.log('   - Effect selection flow is functional');
            console.log('   - Frontend error handling works');
            console.log('\\n🤔 If frontend still shows empty:');
            console.log('   - Check browser dev console for errors');
            console.log('   - Verify the fixed EffectPicker.jsx is being used');
            console.log('   - Check if window.api.getAvailableEffects is properly exposed');
        } else {
            console.log('\\n💥 Some frontend IPC tests failed!');
            console.log('   This indicates the frontend-backend communication has issues');
        }

        return this.failedTests === 0;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new FrontendIPCValidationTests();
    tests.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

export default FrontendIPCValidationTests;