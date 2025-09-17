#!/usr/bin/env node
/**
 * Test for PercentageRangeInput component to debug NaN issues
 */

const React = require('react');

// Mock React since we're testing in Node.js
const originalConsoleLog = console.log;
const capturedLogs = [];

// Capture console.log calls
console.log = (...args) => {
    capturedLogs.push(args);
    originalConsoleLog(...args);
};

class PercentageRangeInputTest {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
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

    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`${message} - Expected truthy value`);
        }
    }

    assertEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${message} - Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
        }
    }

    // Simulate the PercentageRangeInput logic
    simulatePercentageRangeInput(field, value) {
        // Reset captured logs for this test
        capturedLogs.length = 0;

        // Simulate the component's value processing logic
        let currentValue = value || field.default || {
            lower: { percent: 0.1, side: 'shortest' },
            upper: { percent: 0.9, side: 'longest' }
        };

        console.log(`🔍 PercentageRangeInput for ${field.name}:`, {
            value,
            fieldDefault: field.default,
            currentValue: JSON.stringify(currentValue)
        });

        // Convert legacy format if needed
        if (currentValue.min !== undefined || currentValue.max !== undefined) {
            currentValue = {
                lower: { percent: currentValue.min || currentValue.lower || 0.1, side: 'shortest' },
                upper: { percent: currentValue.max || currentValue.upper || 0.9, side: 'longest' }
            };
        }

        // Convert simple number format if needed (more robust check)
        if (typeof currentValue.lower === 'number' ||
            (currentValue.lower && typeof currentValue.lower.percent === 'undefined') ||
            currentValue.lower === '[Function]') {

            let lowerPercent, upperPercent;

            // Handle different input formats
            if (typeof currentValue.lower === 'number') {
                lowerPercent = currentValue.lower;
                upperPercent = currentValue.upper;
            } else if (currentValue.lower === '[Function]' || currentValue.upper === '[Function]') {
                // Use field-specific defaults for serialized functions
                const fieldDefaults = {
                    'flareOffset': { lower: 0.01, upper: 0.06 },
                    'flareRingsSizeRange': { lower: 0.05, upper: 1.0 },
                    'flareRaysSizeRange': { lower: 0.7, upper: 1.0 }
                };
                const defaults = fieldDefaults[field.name] || { lower: 0.1, upper: 0.9 };
                lowerPercent = defaults.lower;
                upperPercent = defaults.upper;
            } else {
                // Fallback for other cases
                lowerPercent = 0.1;
                upperPercent = 0.9;
            }

            currentValue = {
                lower: { percent: lowerPercent, side: 'shortest' },
                upper: { percent: upperPercent, side: 'longest' }
            };
        }

        // Convert [Object] format (when serialization fails) to enhanced format
        if (currentValue.lower && typeof currentValue.lower === 'object' &&
            currentValue.lower.toString() === '[object Object]' &&
            !currentValue.lower.percent) {
            // This is likely a failed serialization, use field-specific defaults
            const fieldDefaults = {
                'flareOffset': {
                    lower: { percent: 0.01, side: 'shortest' },
                    upper: { percent: 0.06, side: 'shortest' }
                },
                'flareRingsSizeRange': {
                    lower: { percent: 0.05, side: 'shortest' },
                    upper: { percent: 1.0, side: 'longest' }
                },
                'flareRaysSizeRange': {
                    lower: { percent: 0.7, side: 'longest' },
                    upper: { percent: 1.0, side: 'longest' }
                }
            };

            currentValue = fieldDefaults[field.name] || {
                lower: { percent: 0.1, side: 'shortest' },
                upper: { percent: 0.9, side: 'longest' }
            };
        }

        // Test the percentage calculations that were showing NaN
        const lowerPercent = Math.round((currentValue.lower?.percent || 0) * 100);
        const upperPercent = Math.round((currentValue.upper?.percent || 0) * 100);

        return {
            currentValue,
            lowerPercent,
            upperPercent,
            logs: [...capturedLogs]
        };
    }

    testBasicPercentageRangeFormat() {
        console.log('\n🔍 Testing Basic PercentageRange Format...');

        this.test('should handle proper format with percent and side', () => {
            const field = { name: 'testRange', default: { lower: { percent: 0.2, side: 'shortest' }, upper: { percent: 0.8, side: 'longest' } } };
            const result = this.simulatePercentageRangeInput(field, null);

            this.assertEqual(result.lowerPercent, 20, 'Lower percentage should be 20');
            this.assertEqual(result.upperPercent, 80, 'Upper percentage should be 80');
            this.assertTrue(!isNaN(result.lowerPercent), 'Lower percentage should not be NaN');
            this.assertTrue(!isNaN(result.upperPercent), 'Upper percentage should not be NaN');
        });

        this.test('should handle ConfigIntrospector format {lower: 0.1, upper: 0.9}', () => {
            const field = { name: 'testRange', default: { lower: 0.1, upper: 0.9 } };
            const result = this.simulatePercentageRangeInput(field, null);

            this.assertEqual(result.lowerPercent, 10, 'Lower percentage should be 10');
            this.assertEqual(result.upperPercent, 90, 'Upper percentage should be 90');
            this.assertTrue(!isNaN(result.lowerPercent), 'Lower percentage should not be NaN');
            this.assertTrue(!isNaN(result.upperPercent), 'Upper percentage should not be NaN');
        });

        this.test('should handle legacy {min, max} format', () => {
            const field = { name: 'testRange', default: { min: 0.25, max: 0.75 } };
            const result = this.simulatePercentageRangeInput(field, null);

            this.assertEqual(result.lowerPercent, 25, 'Lower percentage should be 25');
            this.assertEqual(result.upperPercent, 75, 'Upper percentage should be 75');
            this.assertTrue(!isNaN(result.lowerPercent), 'Lower percentage should not be NaN');
            this.assertTrue(!isNaN(result.upperPercent), 'Upper percentage should not be NaN');
        });
    }

    testFuzzFlareScenarios() {
        console.log('\n🔥 Testing Fuzz-Flare Specific Scenarios...');

        this.test('should handle flareRingsSizeRange with serialized functions', () => {
            const field = {
                name: 'flareRingsSizeRange',
                default: { lower: '[Function]', upper: '[Function]', __className: 'PercentageRange' }
            };
            const result = this.simulatePercentageRangeInput(field, null);

            this.assertEqual(result.lowerPercent, 5, 'Lower percentage should be 5 (field-specific default)');
            this.assertEqual(result.upperPercent, 100, 'Upper percentage should be 100 (field-specific default)');
            this.assertTrue(!isNaN(result.lowerPercent), 'Lower percentage should not be NaN');
            this.assertTrue(!isNaN(result.upperPercent), 'Upper percentage should not be NaN');
        });

        this.test('should handle flareOffset with serialized functions', () => {
            const field = {
                name: 'flareOffset',
                default: { lower: '[Function]', upper: '[Function]', __className: 'PercentageRange' }
            };
            const result = this.simulatePercentageRangeInput(field, null);

            this.assertEqual(result.lowerPercent, 1, 'Lower percentage should be 1 (field-specific default)');
            this.assertEqual(result.upperPercent, 6, 'Upper percentage should be 6 (field-specific default)');
            this.assertTrue(!isNaN(result.lowerPercent), 'Lower percentage should not be NaN');
            this.assertTrue(!isNaN(result.upperPercent), 'Upper percentage should not be NaN');
        });

        this.test('should handle flareRaysSizeRange with serialized functions', () => {
            const field = {
                name: 'flareRaysSizeRange',
                default: { lower: '[Function]', upper: '[Function]', __className: 'PercentageRange' }
            };
            const result = this.simulatePercentageRangeInput(field, null);

            this.assertEqual(result.lowerPercent, 70, 'Lower percentage should be 70 (field-specific default)');
            this.assertEqual(result.upperPercent, 100, 'Upper percentage should be 100 (field-specific default)');
            this.assertTrue(!isNaN(result.lowerPercent), 'Lower percentage should not be NaN');
            this.assertTrue(!isNaN(result.upperPercent), 'Upper percentage should not be NaN');
        });
    }

    testEdgeCases() {
        console.log('\n⚠️  Testing Edge Cases...');

        this.test('should handle undefined/null values gracefully', () => {
            const field = { name: 'testRange', default: null };
            const result = this.simulatePercentageRangeInput(field, undefined);

            this.assertEqual(result.lowerPercent, 10, 'Lower percentage should be 10 (fallback default)');
            this.assertEqual(result.upperPercent, 90, 'Upper percentage should be 90 (fallback default)');
            this.assertTrue(!isNaN(result.lowerPercent), 'Lower percentage should not be NaN');
            this.assertTrue(!isNaN(result.upperPercent), 'Upper percentage should not be NaN');
        });

        this.test('should handle malformed objects', () => {
            const field = { name: 'testRange', default: { lower: {}, upper: {} } };
            const result = this.simulatePercentageRangeInput(field, null);

            this.assertTrue(!isNaN(result.lowerPercent), 'Lower percentage should not be NaN');
            this.assertTrue(!isNaN(result.upperPercent), 'Upper percentage should not be NaN');
        });

        this.test('should handle objects without percent property', () => {
            const field = { name: 'testRange', default: { lower: { side: 'shortest' }, upper: { side: 'longest' } } };
            const result = this.simulatePercentageRangeInput(field, null);

            this.assertTrue(!isNaN(result.lowerPercent), 'Lower percentage should not be NaN');
            this.assertTrue(!isNaN(result.upperPercent), 'Upper percentage should not be NaN');
        });
    }

    testConsoleLogging() {
        console.log('\n📝 Testing Console Logging...');

        this.test('should log debug information for PercentageRange fields', () => {
            const field = { name: 'testRange', default: { lower: 0.3, upper: 0.7 } };
            const result = this.simulatePercentageRangeInput(field, null);

            this.assertTrue(result.logs.length > 0, 'Should have captured console logs');

            const debugLog = result.logs.find(log =>
                log[0].includes('🔍 PercentageRangeInput for testRange')
            );

            this.assertTrue(!!debugLog, 'Should have debug log for the field');
        });
    }

    runAllTests() {
        console.log('🧪 Running PercentageRangeInput Debug Tests...\n');

        this.testBasicPercentageRangeFormat();
        this.testFuzzFlareScenarios();
        this.testEdgeCases();
        this.testConsoleLogging();

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All PercentageRangeInput tests passed!');
        } else {
            console.log(`\n⚠️  ${this.failedTests} tests failed`);
        }

        // Restore original console.log
        console.log = originalConsoleLog;

        return {
            total: this.testCount,
            passed: this.passedTests,
            failed: this.failedTests
        };
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const tests = new PercentageRangeInputTest();
    const results = tests.runAllTests();
    process.exit(results.failed === 0 ? 0 : 1);
}

module.exports = PercentageRangeInputTest;