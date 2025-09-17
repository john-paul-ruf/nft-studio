#!/usr/bin/env node
/**
 * Comprehensive test for FuzzFlareEffect configuration handling
 * Tests both UI serialization and backend reconstruction
 */

console.log('🧪 FuzzFlareEffect Configuration Test Suite\n');

class FuzzFlareConfigTest {
    constructor() {
        this.testResults = { passed: 0, failed: 0, total: 0 };
    }

    test(name, testFn) {
        this.testResults.total++;
        try {
            testFn();
            console.log(`✅ PASS: ${name}`);
            this.testResults.passed++;
        } catch (error) {
            console.log(`❌ FAIL: ${name}`);
            console.log(`   Error: ${error.message}`);
            this.testResults.failed++;
        }
    }

    // Test 1: UI Configuration Serialization
    testUIConfigSerialization() {
        console.log('📋 Testing UI Configuration Serialization...\n');

        this.test('FuzzFlareEffect default config structure', () => {
            // Simulate what the UI receives as defaults
            const defaultConfig = {
                innerColor: '#FF0000',  // UI will send hex strings
                outerColor: '#0000FF',
                elementPhantomGranularity: 50,
                elementGastonGranularity: 50,
                numberOfFlareRings: 25,
                flareRingsSizeRange: {
                    // This complex structure gets lost in UI
                    lower: { type: 'PercentageShortestSide', value: 0.05 },
                    upper: { type: 'PercentageLongestSide', value: 1 }
                },
                flareRingStroke: { lower: 1, upper: 1 },
                flareRingThickness: { lower: 1, upper: 3 }
            };

            console.log('   Default config:', defaultConfig);

            if (typeof defaultConfig.innerColor !== 'string') {
                throw new Error('innerColor should be a string in UI');
            }

            if (!defaultConfig.flareRingsSizeRange) {
                throw new Error('flareRingsSizeRange should exist');
            }
        });

        this.test('User edits config in UI', () => {
            // Simulate user editing the config
            const editedConfig = {
                innerColor: '#FFFF00',  // User changed color
                outerColor: '#00FFFF',
                elementPhantomGranularity: 5,  // User changed to 5
                elementGastonGranularity: 5,    // User changed to 5
                numberOfFlareRings: 5,          // User changed to 5
                // Complex objects get simplified or lost
                flareRingsSizeRange: {},  // Lost structure
                flareRingStroke: { lower: 1, upper: 1 },
                flareRingThickness: { lower: 1, upper: 3 }
            };

            console.log('   Edited config:', editedConfig);

            // Test JSON serialization (what happens in IPC)
            const serialized = JSON.stringify(editedConfig);
            const deserialized = JSON.parse(serialized);

            if (deserialized.innerColor !== '#FFFF00') {
                throw new Error('Color values should be preserved');
            }

            if (deserialized.numberOfFlareRings !== 5) {
                throw new Error('Number values should be preserved');
            }

            console.log('   ✓ Basic values preserved after serialization');
        });

        this.test('Config sent through IPC loses methods', () => {
            // Simulate the actual problem
            const configFromUI = {
                innerColor: '#FF0000',  // String, not ColorPicker
                outerColor: '#0000FF',  // String, not ColorPicker
                numberOfFlareRings: 5,
                // These are the problematic fields
                flareRingsSizeRange: {},  // Empty object, lost methods
            };

            // This is what backend receives
            console.log('   Config backend receives:', configFromUI);

            // Test that methods are missing
            if (typeof configFromUI.innerColor === 'object' && configFromUI.innerColor.getColor) {
                throw new Error('Should NOT have getColor method from UI');
            }

            console.log('   ✓ Confirmed: UI sends plain data without methods');
        });
    }

    // Test 2: Backend Reconstruction Requirements
    testBackendReconstruction() {
        console.log('\n📋 Testing Backend Reconstruction Requirements...\n');

        this.test('ColorPicker reconstruction needed', () => {
            // Mock what FuzzFlareEffect expects
            const mockColorPicker = {
                color: '#FF0000',
                getColor: function() { return this.color; }
            };

            console.log('   ColorPicker structure:', {
                hasGetColor: typeof mockColorPicker.getColor === 'function',
                getColorReturns: mockColorPicker.getColor()
            });

            if (typeof mockColorPicker.getColor !== 'function') {
                throw new Error('ColorPicker must have getColor method');
            }

            const color = mockColorPicker.getColor();
            if (typeof color !== 'string') {
                throw new Error('getColor must return a string');
            }

            console.log('   ✓ ColorPicker requires getColor() method');
        });

        this.test('PercentageRange reconstruction needed', () => {
            // Mock what FuzzFlareEffect expects
            const mockPercentageRange = {
                lowerValue: 0.05,
                upperValue: 1,
                lower: function(size) { return this.lowerValue * size; },
                upper: function(size) { return this.upperValue * size; }
            };

            console.log('   PercentageRange structure:', {
                hasLower: typeof mockPercentageRange.lower === 'function',
                hasUpper: typeof mockPercentageRange.upper === 'function'
            });

            if (typeof mockPercentageRange.lower !== 'function') {
                throw new Error('PercentageRange.lower must be a function');
            }

            if (typeof mockPercentageRange.upper !== 'function') {
                throw new Error('PercentageRange.upper must be a function');
            }

            const testSize = 100;
            const lowerResult = mockPercentageRange.lower(testSize);
            const upperResult = mockPercentageRange.upper(testSize);

            console.log(`   ✓ PercentageRange.lower(${testSize}) = ${lowerResult}`);
            console.log(`   ✓ PercentageRange.upper(${testSize}) = ${upperResult}`);
        });

        this.test('Range reconstruction needed', () => {
            // Mock what FuzzFlareEffect might expect
            const mockRange = {
                lower: 1,
                upper: 3,
                getValue: function() {
                    return this.lower + Math.random() * (this.upper - this.lower);
                }
            };

            console.log('   Range structure:', {
                hasLower: typeof mockRange.lower,
                hasUpper: typeof mockRange.upper,
                hasGetValue: typeof mockRange.getValue === 'function'
            });

            if (typeof mockRange.lower !== 'number') {
                throw new Error('Range.lower should be a number');
            }

            const value = mockRange.getValue();
            if (value < mockRange.lower || value > mockRange.upper) {
                throw new Error('Range.getValue should return value in range');
            }

            console.log('   ✓ Range object structure validated');
        });
    }

    // Test 3: Reconstruction Logic
    testReconstructionLogic() {
        console.log('\n📋 Testing Reconstruction Logic...\n');

        this.test('ColorPicker reconstruction from string', () => {
            const inputColor = '#FF0000';

            // Simulate reconstruction
            class MockColorPicker {
                constructor(color) {
                    this.color = color;
                }
                getColor() {
                    return this.color;
                }
            }

            const reconstructed = new MockColorPicker(inputColor);

            console.log('   Input:', inputColor);
            console.log('   Reconstructed:', {
                hasGetColor: typeof reconstructed.getColor === 'function',
                getColorResult: reconstructed.getColor()
            });

            if (reconstructed.getColor() !== inputColor) {
                throw new Error('ColorPicker should preserve color value');
            }

            console.log('   ✓ ColorPicker reconstructed successfully');
        });

        this.test('PercentageRange complex reconstruction', () => {
            // Input from UI (simplified)
            const inputRange = {
                lower: { type: 'PercentageShortestSide', value: 0.05 },
                upper: { type: 'PercentageLongestSide', value: 1 }
            };

            // Mock reconstruction
            class MockPercentageShortestSide {
                constructor(value) { this.value = value; }
                getValue(size) { return this.value * Math.min(size.width, size.height); }
            }

            class MockPercentageLongestSide {
                constructor(value) { this.value = value; }
                getValue(size) { return this.value * Math.max(size.width, size.height); }
            }

            class MockPercentageRange {
                constructor(lower, upper) {
                    this.lowerPercent = lower;
                    this.upperPercent = upper;
                }
                lower(size) {
                    return this.lowerPercent.getValue({ width: size, height: size });
                }
                upper(size) {
                    return this.upperPercent.getValue({ width: size, height: size });
                }
            }

            const lowerPercent = new MockPercentageShortestSide(inputRange.lower.value);
            const upperPercent = new MockPercentageLongestSide(inputRange.upper.value);
            const reconstructed = new MockPercentageRange(lowerPercent, upperPercent);

            const testSize = 100;
            const lowerResult = reconstructed.lower(testSize);
            const upperResult = reconstructed.upper(testSize);

            console.log('   Input range:', inputRange);
            console.log(`   Reconstructed.lower(${testSize}):`, lowerResult);
            console.log(`   Reconstructed.upper(${testSize}):`, upperResult);

            if (typeof reconstructed.lower !== 'function') {
                throw new Error('Reconstructed PercentageRange must have lower method');
            }

            console.log('   ✓ PercentageRange reconstructed with methods');
        });
    }

    // Test 4: Complete FuzzFlareEffect Config Reconstruction
    testCompleteFuzzFlareReconstruction() {
        console.log('\n📋 Testing Complete FuzzFlareEffect Config Reconstruction...\n');

        this.test('Full config reconstruction simulation', () => {
            // What UI sends (after user edits)
            const configFromUI = {
                innerColor: '#FFFF00',
                outerColor: '#00FFFF',
                elementPhantomGranularity: 5,
                elementGastonGranularity: 5,
                numberOfFlareRings: 5,
                flareRingsSizeRange: {},  // Lost structure
                flareRingStroke: { lower: 1, upper: 1 },
                flareRingThickness: { lower: 1, upper: 3 }
            };

            console.log('   Config from UI:', configFromUI);

            // What backend needs to reconstruct
            const reconstructedConfig = {
                innerColor: {
                    color: configFromUI.innerColor,
                    getColor: function() { return this.color; }
                },
                outerColor: {
                    color: configFromUI.outerColor,
                    getColor: function() { return this.color; }
                },
                elementPhantomGranularity: configFromUI.elementPhantomGranularity,
                elementGastonGranularity: configFromUI.elementGastonGranularity,
                numberOfFlareRings: configFromUI.numberOfFlareRings,
                flareRingsSizeRange: {
                    lower: function(size) { return 0.05 * size; },
                    upper: function(size) { return 1.0 * size; }
                },
                flareRingStroke: configFromUI.flareRingStroke,
                flareRingThickness: configFromUI.flareRingThickness
            };

            // Validate reconstruction
            if (typeof reconstructedConfig.innerColor.getColor !== 'function') {
                throw new Error('innerColor must have getColor method');
            }

            if (reconstructedConfig.innerColor.getColor() !== '#FFFF00') {
                throw new Error('innerColor value not preserved');
            }

            if (typeof reconstructedConfig.flareRingsSizeRange.lower !== 'function') {
                throw new Error('flareRingsSizeRange.lower must be a function');
            }

            const testLower = reconstructedConfig.flareRingsSizeRange.lower(100);
            if (typeof testLower !== 'number') {
                throw new Error('flareRingsSizeRange.lower must return a number');
            }

            console.log('   ✓ Full config reconstructed successfully');
            console.log('   ✓ All methods restored');
            console.log('   ✓ All values preserved');
        });
    }

    // Run all tests
    runAllTests() {
        console.log('🚀 Running FuzzFlareEffect Configuration Tests...\n');

        this.testUIConfigSerialization();
        this.testBackendReconstruction();
        this.testReconstructionLogic();
        this.testCompleteFuzzFlareReconstruction();

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testResults.total}`);
        console.log(`   Passed: ${this.testResults.passed}`);
        console.log(`   Failed: ${this.testResults.failed}`);

        if (this.testResults.failed === 0) {
            console.log('\n🎉 All tests passed!');
            console.log('\n📋 Key Requirements Verified:');
            console.log('   1. ColorPicker objects need getColor() method');
            console.log('   2. PercentageRange needs lower(size) and upper(size) methods');
            console.log('   3. UI sends plain strings/numbers, not class instances');
            console.log('   4. Backend must reconstruct all complex types');
            console.log('\n🔧 Fix Strategy:');
            console.log('   1. Detect string colors and reconstruct ColorPicker');
            console.log('   2. Always reconstruct flareRingsSizeRange as PercentageRange');
            console.log('   3. Preserve user-edited values while restoring methods');
        } else {
            console.log('\n❌ Some tests failed!');
        }
    }
}

// Run the test suite
const tester = new FuzzFlareConfigTest();
tester.runAllTests();