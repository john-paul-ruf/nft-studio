#!/usr/bin/env node
/**
 * Additional edge case tests for color scheme implementation
 * Tests corner cases and error scenarios
 */

console.log('🔬 Color Scheme Edge Cases Test Suite\n');

class ColorSchemeEdgeCasesTest {
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

    async testColorSchemeDataStructure() {
        console.log('📋 Testing colorSchemeData Structure Edge Cases...\n');

        import NftProjectManagerClass from '../../src/main/implementations/NftProjectManager.js';
        const testInstance = Object.create(NftProjectManagerClass.prototype);

        // Test 1: colorSchemeData with extra fields (should work)
        await this.test('colorSchemeData with extra fields should work', async () => {
            const config = {
                colorSchemeData: {
                    name: 'Test Scheme',
                    colors: ['#FF0000', '#00FF00'],
                    lights: ['#FFFF00', '#FF00FF'],
                    neutrals: ['#FFFFFF', '#CCCCCC'],
                    backgrounds: ['#000000', '#111111'],
                    // Extra fields that should be ignored
                    extraField: 'should be ignored',
                    description: 'A test scheme',
                    category: 'test'
                }
            };

            const result = await testInstance.buildColorSchemeInfo(config);

            if (!result.colorScheme || !result.lights || !result.neutrals || !result.backgrounds) {
                throw new Error('Missing required result fields');
            }

            if (result.colorScheme.colorBucket.length !== 2) {
                throw new Error('ColorBucket should have 2 colors');
            }
        });

        // Test 2: Large arrays (should work)
        await this.test('Large color arrays should work', async () => {
            const largeColors = Array.from({length: 50}, (_, i) => `#${i.toString(16).padStart(6, '0')}`);
            const largeLights = Array.from({length: 30}, (_, i) => `#${(i + 100).toString(16).padStart(6, '0')}`);
            const largeNeutrals = Array.from({length: 20}, (_, i) => `#${(i + 200).toString(16).padStart(6, '0')}`);
            const largeBackgrounds = Array.from({length: 10}, (_, i) => `#${(i + 300).toString(16).padStart(6, '0')}`);

            const config = {
                colorSchemeData: {
                    name: 'Large Scheme',
                    colors: largeColors,
                    lights: largeLights,
                    neutrals: largeNeutrals,
                    backgrounds: largeBackgrounds
                }
            };

            const result = await testInstance.buildColorSchemeInfo(config);

            if (result.colorScheme.colorBucket.length !== 50) {
                throw new Error('ColorBucket should have 50 colors');
            }

            if (result.lights.length !== 30) {
                throw new Error('Lights should have 30 colors');
            }
        });

        // Test 3: Minimum valid arrays (1 color each)
        await this.test('Minimum valid arrays (1 color each) should work', async () => {
            const config = {
                colorSchemeData: {
                    name: 'Minimal Scheme',
                    colors: ['#FF0000'],
                    lights: ['#FFFF00'],
                    neutrals: ['#FFFFFF'],
                    backgrounds: ['#000000']
                }
            };

            const result = await testInstance.buildColorSchemeInfo(config);

            if (result.colorScheme.colorBucket.length !== 1) {
                throw new Error('ColorBucket should have 1 color');
            }

            if (result.colorScheme.colorBucket[0] !== '#FF0000') {
                throw new Error('ColorBucket should contain the provided color');
            }
        });

        // Test 4: Colors vs lights difference (colors used for colorBucket)
        await this.test('colors array used for colorBucket, not lights', async () => {
            const config = {
                colorSchemeData: {
                    name: 'Different Arrays Scheme',
                    colors: ['#COLORS1', '#COLORS2'],
                    lights: ['#LIGHTS1', '#LIGHTS2', '#LIGHTS3'],
                    neutrals: ['#NEUTRAL1'],
                    backgrounds: ['#BACKGROUND1']
                }
            };

            const result = await testInstance.buildColorSchemeInfo(config);

            // ColorBucket should use colors, not lights
            if (result.colorScheme.colorBucket.length !== 2) {
                throw new Error('ColorBucket should use colors array (2 items)');
            }

            if (result.colorScheme.colorBucket[0] !== '#COLORS1') {
                throw new Error('ColorBucket should use colors array values');
            }

            // Lights should be preserved separately
            if (result.lights.length !== 3) {
                throw new Error('Lights array should be preserved (3 items)');
            }

            if (result.lights[0] !== '#LIGHTS1') {
                throw new Error('Lights array should be preserved with original values');
            }
        });

        // Test 5: Whitespace handling
        await this.test('Color values with whitespace should be preserved', async () => {
            const config = {
                colorSchemeData: {
                    name: 'Whitespace Test',
                    colors: [' #FF0000 ', '#00FF00\t', '\n#0000FF'],
                    lights: ['#FFFF00 '],
                    neutrals: [' #FFFFFF'],
                    backgrounds: ['#000000\n']
                }
            };

            const result = await testInstance.buildColorSchemeInfo(config);

            // Values should be preserved as-is (no trimming)
            if (result.colorScheme.colorBucket[0] !== ' #FF0000 ') {
                throw new Error('Whitespace should be preserved in color values');
            }
        });
    }

    async testErrorMessages() {
        console.log('\n📋 Testing Error Message Quality...\n');

        import NftProjectManagerClass from '../../src/main/implementations/NftProjectManager.js';
        const testInstance = Object.create(NftProjectManagerClass.prototype);

        // Test 1: Detailed error messages
        await this.test('Error messages are descriptive and helpful', async () => {
            const testCases = [
                { config: {}, expectedSubstring: 'MISSING colorSchemeData' },
                { config: { colorSchemeData: {} }, expectedSubstring: 'MISSING colorSchemeData.colors' },
                { config: { colorSchemeData: { colors: 'not-array' } }, expectedSubstring: 'INVALID colorSchemeData.colors: must be array' },
                { config: { colorSchemeData: { colors: [] } }, expectedSubstring: 'EMPTY colorSchemeData.colors: must contain hex colors' }
            ];

            for (const testCase of testCases) {
                let errorThrown = false;
                let actualError = '';

                try {
                    await testInstance.buildColorSchemeInfo(testCase.config);
                } catch (error) {
                    errorThrown = true;
                    actualError = error.message;
                }

                if (!errorThrown) {
                    throw new Error(`Should have thrown error for config: ${JSON.stringify(testCase.config)}`);
                }

                if (!actualError.includes(testCase.expectedSubstring)) {
                    throw new Error(`Error message "${actualError}" should contain "${testCase.expectedSubstring}"`);
                }
            }
        });

        // Test 2: Error consistency
        await this.test('All field validation errors follow same pattern', async () => {
            const fields = ['colors', 'lights', 'neutrals', 'backgrounds'];
            const errorPatterns = {
                missing: 'MISSING colorSchemeData.{field}',
                invalid: 'INVALID colorSchemeData.{field}: must be array',
                empty: 'EMPTY colorSchemeData.{field}: must contain hex colors'
            };

            for (const field of fields) {
                // Test missing field - provide all other fields except the one being tested
                const missingConfig = {
                    colorSchemeData: {
                        colors: field === 'colors' ? undefined : ['#FF0000'],
                        lights: field === 'lights' ? undefined : ['#FFFF00'],
                        neutrals: field === 'neutrals' ? undefined : ['#FFFFFF'],
                        backgrounds: field === 'backgrounds' ? undefined : ['#000000']
                    }
                };
                delete missingConfig.colorSchemeData[field]; // Ensure field is truly missing

                try {
                    await testInstance.buildColorSchemeInfo(missingConfig);
                    throw new Error(`Should fail for missing ${field}`);
                } catch (error) {
                    const expectedPattern = errorPatterns.missing.replace('{field}', field);
                    if (!error.message.includes(expectedPattern)) {
                        throw new Error(`Missing ${field} error pattern incorrect: ${error.message}`);
                    }
                }

                // Test invalid type
                const invalidConfig = {
                    colorSchemeData: {
                        colors: ['#FF0000'],
                        lights: ['#FFFF00'],
                        neutrals: ['#FFFFFF'],
                        backgrounds: ['#000000']
                    }
                };
                invalidConfig.colorSchemeData[field] = 'not-an-array';

                try {
                    await testInstance.buildColorSchemeInfo(invalidConfig);
                    throw new Error(`Should fail for invalid ${field}`);
                } catch (error) {
                    const expectedPattern = errorPatterns.invalid.replace('{field}', field);
                    if (!error.message.includes(expectedPattern)) {
                        throw new Error(`Invalid ${field} error pattern incorrect: ${error.message}`);
                    }
                }

                // Test empty array
                const emptyConfig = {
                    colorSchemeData: {
                        colors: ['#FF0000'],
                        lights: ['#FFFF00'],
                        neutrals: ['#FFFFFF'],
                        backgrounds: ['#000000']
                    }
                };
                emptyConfig.colorSchemeData[field] = [];

                try {
                    await testInstance.buildColorSchemeInfo(emptyConfig);
                    throw new Error(`Should fail for empty ${field}`);
                } catch (error) {
                    const expectedPattern = errorPatterns.empty.replace('{field}', field);
                    if (!error.message.includes(expectedPattern)) {
                        throw new Error(`Empty ${field} error pattern incorrect: ${error.message}`);
                    }
                }
            }
        });
    }

    async testColorSchemeObjectBehavior() {
        console.log('\n📋 Testing ColorScheme Object Behavior...\n');

        import NftProjectManagerClass from '../../src/main/implementations/NftProjectManager.js';
        const testInstance = Object.create(NftProjectManagerClass.prototype);

        // Test 1: ColorScheme methods work correctly
        await this.test('ColorScheme object methods work correctly', async () => {
            const config = {
                colorSchemeData: {
                    name: 'Method Test Scheme',
                    colors: ['#FF0000', '#00FF00', '#0000FF'],
                    lights: ['#FFFF00', '#FF00FF'],
                    neutrals: ['#FFFFFF'],
                    backgrounds: ['#000000']
                }
            };

            const result = await testInstance.buildColorSchemeInfo(config);

            // Test getColorFromBucket method
            const color1 = result.colorScheme.getColorFromBucket();
            const color2 = result.colorScheme.getColorFromBucket();

            if (typeof color1 !== 'string' || !color1.startsWith('#')) {
                throw new Error('getColorFromBucket should return hex color string');
            }

            if (typeof color2 !== 'string' || !color2.startsWith('#')) {
                throw new Error('getColorFromBucket should return hex color string');
            }

            // Should return colors from the colorBucket (colors array)
            const validColors = ['#FF0000', '#00FF00', '#0000FF'];
            if (!validColors.includes(color1)) {
                throw new Error(`getColorFromBucket returned invalid color: ${color1}`);
            }

            if (!validColors.includes(color2)) {
                throw new Error(`getColorFromBucket returned invalid color: ${color2}`);
            }
        });

        // Test 2: ColorScheme object structure
        await this.test('ColorScheme object has correct structure', async () => {
            const config = {
                colorSchemeData: {
                    name: 'Structure Test',
                    colors: ['#FF0000', '#00FF00'],
                    lights: ['#FFFF00'],
                    neutrals: ['#FFFFFF'],
                    backgrounds: ['#000000']
                }
            };

            const result = await testInstance.buildColorSchemeInfo(config);

            // Check ColorScheme object properties
            if (!result.colorScheme.hasOwnProperty('colorBucket')) {
                throw new Error('ColorScheme missing colorBucket property');
            }

            if (!result.colorScheme.hasOwnProperty('colorSchemeInfo')) {
                throw new Error('ColorScheme missing colorSchemeInfo property');
            }

            if (result.colorScheme.colorSchemeInfo !== 'Structure Test') {
                throw new Error('ColorScheme colorSchemeInfo should match provided name');
            }

            if (!Array.isArray(result.colorScheme.colorBucket)) {
                throw new Error('ColorScheme colorBucket should be an array');
            }

            if (result.colorScheme.colorBucket.length !== 2) {
                throw new Error('ColorScheme colorBucket should contain colors array items');
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Color Scheme Edge Cases Test Suite...\n');

        await this.testColorSchemeDataStructure();
        await this.testErrorMessages();
        await this.testColorSchemeObjectBehavior();

        console.log('\n📊 Edge Cases Test Results:');
        console.log(`   Total: ${this.testResults.total}`);
        console.log(`   Passed: ${this.testResults.passed}`);
        console.log(`   Failed: ${this.testResults.failed}`);

        if (this.testResults.failed === 0) {
            console.log('\n🎉 ALL EDGE CASE TESTS PASSED!');
            console.log('\n✨ Edge Cases Verified:');
            console.log('   ✅ Large color arrays handled correctly');
            console.log('   ✅ Minimum valid arrays (1 color each) work');
            console.log('   ✅ Extra fields in colorSchemeData ignored gracefully');
            console.log('   ✅ colors vs lights separation working correctly');
            console.log('   ✅ Whitespace in color values preserved');
            console.log('   ✅ Error messages are descriptive and consistent');
            console.log('   ✅ ColorScheme object methods work correctly');
            console.log('   ✅ ColorScheme object structure is correct');
            console.log('\n🔬 Edge Case Coverage Complete!');
        } else {
            console.log('\n❌ EDGE CASE TESTS FAILED!');
            console.log('\n🔍 Edge cases found issues that need attention');
        }

        return this.testResults.failed === 0;
    }
}

// Run the edge cases test suite
if (import.meta.url === `file://${process.argv[1]}`) {
    const testSuite = new ColorSchemeEdgeCasesTest();
    testSuite.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Edge cases test suite failed:', error);
        process.exit(1);
    });
}

export default ColorSchemeEdgeCasesTest;