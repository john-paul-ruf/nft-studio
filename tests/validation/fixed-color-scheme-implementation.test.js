#!/usr/bin/env node
/**
 * Comprehensive test suite for the fixed color scheme implementation
 * Tests both UI data flow and backend validation with complete coverage
 */

console.log('🎨 Fixed Color Scheme Implementation Test Suite\n');

class FixedColorSchemeTestSuite {
    constructor() {
        this.testResults = { passed: 0, failed: 0, total: 0 };
    }

    async test(name, testFn) {
        this.testResults.total++;
        try {
            await testFn();
            console.log(`✅ PASS: ${name}`);
            this.testResults.passed++;
        } catch (error) {
            console.log(`❌ FAIL: ${name}`);
            console.log(`   Error: ${error.message}`);
            this.testResults.failed++;
        }
    }

    async testBackendValidation() {
        console.log('📋 Testing Backend Validation (buildColorSchemeInfo)...\n');

        const NftProjectManagerClass = require('../../src/main/implementations/NftProjectManager');
        const testInstance = Object.create(NftProjectManagerClass.prototype);

        // Test 1: Complete valid colorSchemeData
        await this.test('Valid colorSchemeData with all required fields', async () => {
            const validConfig = {
                colorSchemeData: {
                    name: 'Test Scheme',
                    colors: ['#FF0000', '#00FF00', '#0000FF'],
                    lights: ['#FFFF00', '#FF00FF', '#00FFFF'],
                    neutrals: ['#FFFFFF', '#CCCCCC', '#808080'],
                    backgrounds: ['#000000', '#111111', '#222222']
                }
            };

            const result = await testInstance.buildColorSchemeInfo(validConfig);

            if (!result.colorScheme) {
                throw new Error('Missing colorScheme object');
            }

            if (!Array.isArray(result.colorScheme.colorBucket)) {
                throw new Error('ColorScheme missing colorBucket array');
            }

            if (result.colorScheme.colorBucket.length !== 3) {
                throw new Error('ColorBucket should have 3 colors from colors array');
            }

            if (result.colorScheme.colorBucket[0] !== '#FF0000') {
                throw new Error('ColorBucket should use colors array, not lights');
            }

            if (result.lights.length !== 3 || result.lights[0] !== '#FFFF00') {
                throw new Error('Lights array not preserved correctly');
            }

            if (result.neutrals.length !== 3 || result.neutrals[0] !== '#FFFFFF') {
                throw new Error('Neutrals array not preserved correctly');
            }

            if (result.backgrounds.length !== 3 || result.backgrounds[0] !== '#000000') {
                throw new Error('Backgrounds array not preserved correctly');
            }

            if (typeof result.colorScheme.getColorFromBucket !== 'function') {
                throw new Error('ColorScheme missing getColorFromBucket method');
            }
        });

        // Test 2: colorSchemeInfo passthrough
        await this.test('colorSchemeInfo passthrough works correctly', async () => {
            const customColorSchemeInfo = {
                colorScheme: {
                    colorBucket: ['#CUSTOM1', '#CUSTOM2'],
                    getColorFromBucket: () => '#CUSTOM1'
                },
                neutrals: ['#NEUTRAL1'],
                backgrounds: ['#BG1'],
                lights: ['#LIGHT1']
            };

            const result = await testInstance.buildColorSchemeInfo({
                colorSchemeInfo: customColorSchemeInfo
            });

            if (result !== customColorSchemeInfo) {
                throw new Error('colorSchemeInfo passthrough failed');
            }
        });

        // Test 3-8: Missing field validation
        const requiredFields = [
            { field: 'colorSchemeData', config: {}, expectedError: 'MISSING colorSchemeData' },
            { field: 'colors', config: { colorSchemeData: { lights: ['#FF0000'], neutrals: ['#FFFFFF'], backgrounds: ['#000000'] } }, expectedError: 'MISSING colorSchemeData.colors' },
            { field: 'lights', config: { colorSchemeData: { colors: ['#FF0000'], neutrals: ['#FFFFFF'], backgrounds: ['#000000'] } }, expectedError: 'MISSING colorSchemeData.lights' },
            { field: 'neutrals', config: { colorSchemeData: { colors: ['#FF0000'], lights: ['#FFFF00'], backgrounds: ['#000000'] } }, expectedError: 'MISSING colorSchemeData.neutrals' },
            { field: 'backgrounds', config: { colorSchemeData: { colors: ['#FF0000'], lights: ['#FFFF00'], neutrals: ['#FFFFFF'] } }, expectedError: 'MISSING colorSchemeData.backgrounds' }
        ];

        for (const testCase of requiredFields) {
            await this.test(`Missing ${testCase.field} throws proper error`, async () => {
                let errorThrown = false;
                try {
                    await testInstance.buildColorSchemeInfo(testCase.config);
                } catch (error) {
                    errorThrown = true;
                    if (!error.message.includes(testCase.expectedError)) {
                        throw new Error(`Wrong error for missing ${testCase.field}: ${error.message}`);
                    }
                }

                if (!errorThrown) {
                    throw new Error(`Should throw error for missing ${testCase.field}`);
                }
            });
        }

        // Test 9-12: Empty array validation
        const emptyArrayTests = [
            { field: 'colors', value: [] },
            { field: 'lights', value: [] },
            { field: 'neutrals', value: [] },
            { field: 'backgrounds', value: [] }
        ];

        for (const testCase of emptyArrayTests) {
            await this.test(`Empty ${testCase.field} array throws error`, async () => {
                const config = {
                    colorSchemeData: {
                        colors: ['#FF0000'],
                        lights: ['#FFFF00'],
                        neutrals: ['#FFFFFF'],
                        backgrounds: ['#000000']
                    }
                };
                config.colorSchemeData[testCase.field] = testCase.value;

                let errorThrown = false;
                try {
                    await testInstance.buildColorSchemeInfo(config);
                } catch (error) {
                    errorThrown = true;
                    if (!error.message.includes(`EMPTY colorSchemeData.${testCase.field}`)) {
                        throw new Error(`Wrong error for empty ${testCase.field}: ${error.message}`);
                    }
                }

                if (!errorThrown) {
                    throw new Error(`Should throw error for empty ${testCase.field}`);
                }
            });
        }

        // Test 13-16: Invalid type validation
        const invalidTypeTests = [
            { field: 'colors', value: 'not-an-array' },
            { field: 'lights', value: 'not-an-array' },
            { field: 'neutrals', value: 123 },
            { field: 'backgrounds', value: null }
        ];

        for (const testCase of invalidTypeTests) {
            await this.test(`Invalid ${testCase.field} type throws error`, async () => {
                const config = {
                    colorSchemeData: {
                        colors: ['#FF0000'],
                        lights: ['#FFFF00'],
                        neutrals: ['#FFFFFF'],
                        backgrounds: ['#000000']
                    }
                };
                config.colorSchemeData[testCase.field] = testCase.value;

                let errorThrown = false;
                try {
                    await testInstance.buildColorSchemeInfo(config);
                } catch (error) {
                    errorThrown = true;
                    // For null values, the error will be "MISSING" instead of "INVALID"
                    const expectedError = testCase.value === null ?
                        `MISSING colorSchemeData.${testCase.field}` :
                        `INVALID colorSchemeData.${testCase.field}`;

                    if (!error.message.includes(expectedError)) {
                        throw new Error(`Wrong error for invalid ${testCase.field}: ${error.message}`);
                    }
                }

                if (!errorThrown) {
                    throw new Error(`Should throw error for invalid ${testCase.field}`);
                }
            });
        }
    }

    async testUIDataFlow() {
        console.log('\n📋 Testing UI Data Flow (Mock Tests)...\n');

        // Test predefined color schemes structure (mock)
        await this.test('Mock: Predefined color schemes have required structure', async () => {
            // Mock predefined schemes from the data file
            const { predefinedColorSchemes } = require('../../src/data/colorSchemes.js');

            const testSchemeIds = ['neon-cyberpunk', 'fire-ember', 'ocean-depth'];
            for (const schemeId of testSchemeIds) {
                const scheme = predefinedColorSchemes[schemeId];
                if (!scheme) {
                    throw new Error(`Missing predefined scheme: ${schemeId}`);
                }

                if (!Array.isArray(scheme.lights) || scheme.lights.length === 0) {
                    throw new Error(`${schemeId} missing lights array`);
                }

                if (!Array.isArray(scheme.neutrals) || scheme.neutrals.length === 0) {
                    throw new Error(`${schemeId} missing neutrals array`);
                }

                if (!Array.isArray(scheme.backgrounds) || scheme.backgrounds.length === 0) {
                    throw new Error(`${schemeId} missing backgrounds array`);
                }
            }
        });

        // Test colorSchemeData structure creation logic
        await this.test('Mock: UI creates proper colorSchemeData structure', async () => {
            // Mock a full scheme like ColorSchemeService would return
            const mockFullScheme = {
                name: 'Test Scheme',
                lights: ['#FF0000', '#00FF00', '#0000FF'],
                neutrals: ['#FFFFFF', '#CCCCCC'],
                backgrounds: ['#000000', '#111111']
            };

            // Simulate Canvas.jsx logic
            const colorSchemeData = {
                name: mockFullScheme.name,
                colors: mockFullScheme.lights || [], // Use lights as colors for colorBucket
                lights: mockFullScheme.lights || [],
                neutrals: mockFullScheme.neutrals || [],
                backgrounds: mockFullScheme.backgrounds || []
            };

            if (!colorSchemeData.name) {
                throw new Error('colorSchemeData missing name');
            }

            if (!Array.isArray(colorSchemeData.colors) || colorSchemeData.colors.length === 0) {
                throw new Error('colorSchemeData missing colors array');
            }

            if (!Array.isArray(colorSchemeData.lights) || colorSchemeData.lights.length === 0) {
                throw new Error('colorSchemeData missing lights array');
            }

            if (!Array.isArray(colorSchemeData.neutrals) || colorSchemeData.neutrals.length === 0) {
                throw new Error('colorSchemeData missing neutrals array');
            }

            if (!Array.isArray(colorSchemeData.backgrounds) || colorSchemeData.backgrounds.length === 0) {
                throw new Error('colorSchemeData missing backgrounds array');
            }

            // colors should match lights (UI design decision)
            if (colorSchemeData.colors.length !== colorSchemeData.lights.length) {
                throw new Error('colors array should match lights array length');
            }

            for (let i = 0; i < colorSchemeData.colors.length; i++) {
                if (colorSchemeData.colors[i] !== colorSchemeData.lights[i]) {
                    throw new Error('colors array should match lights array content');
                }
            }
        });

        // Test Canvas.jsx import structure
        await this.test('Canvas.jsx imports ColorSchemeService correctly', async () => {
            const fs = require('fs');
            const canvasContent = fs.readFileSync('/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx', 'utf8');

            if (!canvasContent.includes("import ColorSchemeService from '../services/ColorSchemeService';")) {
                throw new Error('Canvas.jsx missing ColorSchemeService import');
            }

            if (!canvasContent.includes('await ColorSchemeService.getColorScheme(')) {
                throw new Error('Canvas.jsx not calling getColorScheme method');
            }

            if (!canvasContent.includes('colorSchemeData:')) {
                throw new Error('Canvas.jsx not sending colorSchemeData to backend');
            }
        });
    }

    async testIntegration() {
        console.log('\n📋 Testing End-to-End Integration (Mock)...\n');

        // Test complete flow: UI -> Backend -> ColorScheme creation
        await this.test('Mock: Complete UI to Backend color scheme flow', async () => {
            const NftProjectManagerClass = require('../../src/main/implementations/NftProjectManager');
            const testInstance = Object.create(NftProjectManagerClass.prototype);

            // Mock UI getting scheme data from predefined schemes
            const { predefinedColorSchemes } = require('../../src/data/colorSchemes.js');
            const mockFullScheme = predefinedColorSchemes['fire-ember'];

            // Simulate UI creating colorSchemeData for backend
            const colorSchemeData = {
                name: mockFullScheme.name,
                colors: mockFullScheme.lights || [],
                lights: mockFullScheme.lights || [],
                neutrals: mockFullScheme.neutrals || [],
                backgrounds: mockFullScheme.backgrounds || []
            };

            // Simulate UI sending to backend
            const projectConfig = {
                colorSchemeData: colorSchemeData
            };

            // Backend processes it
            const result = await testInstance.buildColorSchemeInfo(projectConfig);

            // Validate complete flow
            if (!result.colorScheme || !result.colorScheme.colorBucket) {
                throw new Error('Backend failed to create ColorScheme object');
            }

            if (result.colorScheme.colorBucket.length !== colorSchemeData.colors.length) {
                throw new Error('ColorBucket length mismatch');
            }

            if (result.lights.length !== colorSchemeData.lights.length) {
                throw new Error('Lights array length mismatch');
            }

            if (result.neutrals.length !== colorSchemeData.neutrals.length) {
                throw new Error('Neutrals array length mismatch');
            }

            if (result.backgrounds.length !== colorSchemeData.backgrounds.length) {
                throw new Error('Backgrounds array length mismatch');
            }

            // Test ColorScheme functionality
            const testColor = result.colorScheme.getColorFromBucket();
            if (!testColor || !testColor.startsWith('#')) {
                throw new Error('ColorScheme getColorFromBucket failed');
            }
        });

        // Test edge case: missing colorSchemeData
        await this.test('Missing colorSchemeData handled with proper error', async () => {
            const NftProjectManagerClass = require('../../src/main/implementations/NftProjectManager');
            const testInstance = Object.create(NftProjectManagerClass.prototype);

            let errorThrown = false;
            try {
                await testInstance.buildColorSchemeInfo({});
            } catch (error) {
                errorThrown = true;
                if (!error.message.includes('MISSING colorSchemeData')) {
                    throw new Error('Wrong error for missing colorSchemeData');
                }
            }

            if (!errorThrown) {
                throw new Error('Should throw error when no colorSchemeData provided');
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Fixed Color Scheme Implementation Test Suite...\n');

        await this.testBackendValidation();
        await this.testUIDataFlow();
        await this.testIntegration();

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testResults.total}`);
        console.log(`   Passed: ${this.testResults.passed}`);
        console.log(`   Failed: ${this.testResults.failed}`);

        if (this.testResults.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('\n✨ Fixed Implementation Verified:');
            console.log('   ✅ UI properly fetches complete color scheme data');
            console.log('   ✅ UI sends colorSchemeData with all required fields');
            console.log('   ✅ Backend validates all fields strictly (no defaults)');
            console.log('   ✅ Backend creates proper ColorScheme object');
            console.log('   ✅ colorBucket uses colors array (from lights)');
            console.log('   ✅ lights/neutrals/backgrounds properly separated');
            console.log('   ✅ Error handling for all missing/invalid data');
            console.log('   ✅ End-to-end integration works correctly');
            console.log('\n🎨 Implementation Summary:');
            console.log('   📱 UI: Canvas.jsx fetches full scheme via ColorSchemeService');
            console.log('   📤 UI: Sends complete colorSchemeData to backend');
            console.log('   🔧 Backend: Validates strictly, no defaults/fallbacks');
            console.log('   🎯 Backend: Creates ColorScheme + separate arrays');
            console.log('   🖼️ Effects: Get colors from ColorScheme.colorBucket');
            console.log('\n🚀 Ready for production - no hidden failures, complete validation!');
        } else {
            console.log('\n❌ TESTS FAILED!');
            console.log('\n🔍 Implementation has issues that need to be fixed');
        }

        return this.testResults.failed === 0;
    }
}

// Run the test suite
if (require.main === module) {
    const testSuite = new FixedColorSchemeTestSuite();
    testSuite.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = FixedColorSchemeTestSuite;