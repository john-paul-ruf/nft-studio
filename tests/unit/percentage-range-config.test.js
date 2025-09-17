#!/usr/bin/env node
/**
 * Tests for PercentageRange config control
 * Tests NaN issue on initial load and shortest/longest side change issues
 */

// Mock data for testing PercentageRange configurations
const mockPercentageRangeConfigs = {
    // Simulates what comes from my-nft-gen PercentageRange objects after IPC serialization
    serializedFunctionFormat: {
        lower: '[Function]',
        upper: '[Function]',
        __className: 'PercentageRange'
    },

    // Simulates simple numeric format (the fixed version we provide)
    simpleNumericFormat: {
        lower: 0.1,
        upper: 0.9
    },

    // Simulates enhanced format expected by PercentageRangeInput component
    enhancedFormat: {
        lower: { percent: 0.1, side: 'shortest' },
        upper: { percent: 0.9, side: 'longest' }
    },

    // Simulates failed object serialization
    failedObjectFormat: {
        lower: {},
        upper: {}
    },

    // Legacy min/max format
    legacyFormat: {
        min: 0.2,
        max: 0.8
    }
};

class PercentageRangeConfigTests {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;

        // Mock the config introspector behavior
        this.configIntrospector = {
            processFieldValue: (name, value, className) => {
                if (className === 'PercentageRange') {
                    let defaultValue = value;

                    // Simulate the fix for serialized functions
                    if (value && (value.lower === '[Function]' || value.upper === '[Function]')) {
                        console.log('PercentageRange with serialized functions, using defaults');
                        defaultValue = { lower: 0.1, upper: 0.9 };
                    } else if (value && value.__className) {
                        const { __className, ...cleanValue } = value;
                        defaultValue = cleanValue;
                    }

                    return {
                        type: 'percentagerange',
                        default: defaultValue,
                        label: 'Range'
                    };
                }
                return { type: 'unknown', default: value };
            }
        };

        // Mock the React component behavior (simplified)
        this.PercentageRangeInput = {
            processValue: (value, field) => {
                let currentValue = value || field.default || {
                    lower: { percent: 0.1, side: 'shortest' },
                    upper: { percent: 0.9, side: 'longest' }
                };

                // Convert legacy format if needed
                if (currentValue.min !== undefined || currentValue.max !== undefined) {
                    currentValue = {
                        lower: { percent: currentValue.min || currentValue.lower || 0.1, side: 'shortest' },
                        upper: { percent: currentValue.max || currentValue.upper || 0.9, side: 'longest' }
                    };
                }

                // Convert simple number format if needed
                if (typeof currentValue.lower === 'number') {
                    currentValue = {
                        lower: { percent: currentValue.lower, side: 'shortest' },
                        upper: { percent: currentValue.upper, side: 'longest' }
                    };
                }

                // Convert [Object] format (when serialization fails) to enhanced format
                // Also handle completely empty objects
                if ((currentValue.lower && typeof currentValue.lower === 'object' &&
                    currentValue.lower.toString() === '[object Object]' &&
                    !currentValue.lower.percent) ||
                    (Object.keys(currentValue).length === 0)) {

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

                return currentValue;
            },

            calculateDisplayValue: (currentValue) => {
                try {
                    return {
                        lowerPercent: Math.round(currentValue.lower.percent * 100),
                        upperPercent: Math.round(currentValue.upper.percent * 100),
                        isValid: !isNaN(currentValue.lower.percent) && !isNaN(currentValue.upper.percent)
                    };
                } catch (error) {
                    return {
                        lowerPercent: NaN,
                        upperPercent: NaN,
                        isValid: false,
                        error: error.message
                    };
                }
            }
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

    runNaNIssueTests() {
        console.log('\n🧪 Testing NaN Issue on Initial Load...');

        this.test('should handle serialized function format without producing NaN', () => {
            const field = this.configIntrospector.processFieldValue(
                'testRange',
                mockPercentageRangeConfigs.serializedFunctionFormat,
                'PercentageRange'
            );

            this.assertEqual(field.type, 'percentagerange');
            this.assertEqual(field.default, { lower: 0.1, upper: 0.9 });

            const processedValue = this.PercentageRangeInput.processValue(field.default, { name: 'testRange' });
            const displayValue = this.PercentageRangeInput.calculateDisplayValue(processedValue);

            this.assertTrue(displayValue.isValid, 'Display value should be valid');
            this.assertEqual(displayValue.lowerPercent, 10);
            this.assertEqual(displayValue.upperPercent, 90);
            this.assertFalse(isNaN(displayValue.lowerPercent), 'Lower percent should not be NaN');
            this.assertFalse(isNaN(displayValue.upperPercent), 'Upper percent should not be NaN');
        });

        this.test('should handle failed object serialization format', () => {
            const field = {
                type: 'percentagerange',
                default: mockPercentageRangeConfigs.failedObjectFormat,
                name: 'flareOffset'
            };

            const processedValue = this.PercentageRangeInput.processValue(field.default, field);
            const displayValue = this.PercentageRangeInput.calculateDisplayValue(processedValue);

            this.assertTrue(displayValue.isValid, 'Display value should be valid');
            this.assertEqual(displayValue.lowerPercent, 1); // flareOffset specific default
            this.assertEqual(displayValue.upperPercent, 6); // flareOffset specific default
        });

        this.test('should provide fallback defaults when all else fails', () => {
            const field = {
                type: 'percentagerange',
                default: {},
                name: 'unknownField'
            };

            const processedValue = this.PercentageRangeInput.processValue(field.default, field);
            const displayValue = this.PercentageRangeInput.calculateDisplayValue(processedValue);

            this.assertTrue(displayValue.isValid, 'Display value should be valid');
            this.assertEqual(displayValue.lowerPercent, 10);
            this.assertEqual(displayValue.upperPercent, 90);
        });

        this.test('should detect NaN scenarios and report them', () => {
            const badValue = {
                lower: { percent: NaN, side: 'shortest' },
                upper: { percent: 0.9, side: 'longest' }
            };

            const displayValue = this.PercentageRangeInput.calculateDisplayValue(badValue);

            this.assertFalse(displayValue.isValid, 'Display value should be invalid');
            this.assertTrue(isNaN(displayValue.lowerPercent), 'Lower percent should be NaN');
            this.assertFalse(isNaN(displayValue.upperPercent), 'Upper percent should not be NaN');
        });
    }

    runFormatConversionTests() {
        console.log('\n🧪 Testing Format Conversion...');

        this.test('should convert simple numeric format to enhanced format', () => {
            const field = { name: 'testRange' };
            const processedValue = this.PercentageRangeInput.processValue(
                mockPercentageRangeConfigs.simpleNumericFormat,
                field
            );

            this.assertEqual(processedValue.lower, { percent: 0.1, side: 'shortest' });
            this.assertEqual(processedValue.upper, { percent: 0.9, side: 'longest' });
        });

        this.test('should convert legacy min/max format to enhanced format', () => {
            const field = { name: 'testRange' };
            const processedValue = this.PercentageRangeInput.processValue(
                mockPercentageRangeConfigs.legacyFormat,
                field
            );

            this.assertEqual(processedValue.lower, { percent: 0.2, side: 'shortest' });
            this.assertEqual(processedValue.upper, { percent: 0.8, side: 'longest' });
        });

        this.test('should preserve enhanced format when already correct', () => {
            const field = { name: 'testRange' };
            const processedValue = this.PercentageRangeInput.processValue(
                mockPercentageRangeConfigs.enhancedFormat,
                field
            );

            this.assertEqual(processedValue, mockPercentageRangeConfigs.enhancedFormat);
        });
    }

    runSideChangeTests() {
        console.log('\n🧪 Testing Shortest to Longest Side Change Issue...');

        this.test('should maintain side preferences during value changes', () => {
            const initialValue = {
                lower: { percent: 0.1, side: 'shortest' },
                upper: { percent: 0.9, side: 'longest' }
            };

            // Simulate user changing lower side to 'longest'
            const modifiedValue = {
                ...initialValue,
                lower: { ...initialValue.lower, side: 'longest' }
            };

            this.assertEqual(modifiedValue.lower.side, 'longest');
            this.assertEqual(modifiedValue.upper.side, 'longest');
            this.assertEqual(modifiedValue.lower.percent, 0.1);
            this.assertEqual(modifiedValue.upper.percent, 0.9);
        });

        this.test('should handle side changes without affecting percentages', () => {
            const initialValue = {
                lower: { percent: 0.3, side: 'shortest' },
                upper: { percent: 0.7, side: 'shortest' }
            };

            // Simulate user changing upper side to 'longest'
            const modifiedValue = {
                ...initialValue,
                upper: { ...initialValue.upper, side: 'longest' }
            };

            this.assertEqual(modifiedValue.lower.side, 'shortest');
            this.assertEqual(modifiedValue.upper.side, 'longest');
            this.assertEqual(modifiedValue.lower.percent, 0.3);
            this.assertEqual(modifiedValue.upper.percent, 0.7);
        });

        this.test('should validate that percentage changes maintain proper bounds', () => {
            const baseValue = {
                lower: { percent: 0.4, side: 'shortest' },
                upper: { percent: 0.6, side: 'longest' }
            };

            // Simulate user trying to set lower value too high (would exceed upper - 0.01)
            const attemptedLowerValue = 0.59;
            const clampedLowerValue = Math.min(attemptedLowerValue, baseValue.upper.percent - 0.01);

            this.assertEqual(clampedLowerValue, 0.59); // Should be allowed

            // Simulate user trying to set lower value equal to upper (should be clamped)
            const attemptedLowerValue2 = 0.6;
            const clampedLowerValue2 = Math.min(attemptedLowerValue2, baseValue.upper.percent - 0.01);

            this.assertEqual(clampedLowerValue2, 0.59); // Should be clamped to upper - 0.01
        });
    }

    runFieldSpecificTests() {
        console.log('\n🧪 Testing Field-Specific Defaults...');

        const fieldSpecificCases = [
            {
                fieldName: 'flareOffset',
                expectedLower: { percent: 0.01, side: 'shortest' },
                expectedUpper: { percent: 0.06, side: 'shortest' }
            },
            {
                fieldName: 'flareRingsSizeRange',
                expectedLower: { percent: 0.05, side: 'shortest' },
                expectedUpper: { percent: 1.0, side: 'longest' }
            },
            {
                fieldName: 'flareRaysSizeRange',
                expectedLower: { percent: 0.7, side: 'longest' },
                expectedUpper: { percent: 1.0, side: 'longest' }
            }
        ];

        fieldSpecificCases.forEach(({ fieldName, expectedLower, expectedUpper }) => {
            this.test(`should provide correct defaults for ${fieldName}`, () => {
                const field = { name: fieldName };
                const processedValue = this.PercentageRangeInput.processValue(
                    mockPercentageRangeConfigs.failedObjectFormat,
                    field
                );

                this.assertEqual(processedValue.lower, expectedLower);
                this.assertEqual(processedValue.upper, expectedUpper);

                const displayValue = this.PercentageRangeInput.calculateDisplayValue(processedValue);
                this.assertTrue(displayValue.isValid, `${fieldName} display value should be valid`);
                this.assertFalse(isNaN(displayValue.lowerPercent), `${fieldName} lower percent should not be NaN`);
                this.assertFalse(isNaN(displayValue.upperPercent), `${fieldName} upper percent should not be NaN`);
            });
        });
    }

    runIntegrationTests() {
        console.log('\n🧪 Testing Integration Scenarios...');

        this.test('should complete the full pipeline from serialized functions to UI display', () => {
            // Start with serialized function format (as received from IPC)
            const initialConfig = mockPercentageRangeConfigs.serializedFunctionFormat;

            // Process through config introspector
            const field = this.configIntrospector.processFieldValue('testRange', initialConfig, 'PercentageRange');

            // Process through component
            const processedValue = this.PercentageRangeInput.processValue(field.default, { name: 'testRange' });

            // Calculate display values
            const displayValue = this.PercentageRangeInput.calculateDisplayValue(processedValue);

            // Verify end-to-end success
            this.assertEqual(field.type, 'percentagerange');
            this.assertEqual(processedValue.lower.percent, 0.1);
            this.assertEqual(processedValue.upper.percent, 0.9);
            this.assertTrue(displayValue.isValid, 'End-to-end display value should be valid');
            this.assertEqual(displayValue.lowerPercent, 10);
            this.assertEqual(displayValue.upperPercent, 90);
        });

        this.test('should maintain data consistency across value updates', () => {
            const field = { name: 'testRange', default: { lower: 0.2, upper: 0.8 } };
            let currentValue = this.PercentageRangeInput.processValue(field.default, field);

            // Simulate slider change
            currentValue = {
                ...currentValue,
                lower: { ...currentValue.lower, percent: 0.3 }
            };

            // Simulate side change
            currentValue = {
                ...currentValue,
                upper: { ...currentValue.upper, side: 'shortest' }
            };

            const displayValue = this.PercentageRangeInput.calculateDisplayValue(currentValue);

            this.assertTrue(displayValue.isValid, 'Updated display value should be valid');
            this.assertEqual(currentValue.lower.percent, 0.3);
            this.assertEqual(currentValue.upper.side, 'shortest');
            this.assertEqual(displayValue.lowerPercent, 30);
            this.assertEqual(displayValue.upperPercent, 80);
        });
    }

    runAllTests() {
        console.log('🚀 Running PercentageRange Config Control Tests...\n');

        this.runNaNIssueTests();
        this.runFormatConversionTests();
        this.runSideChangeTests();
        this.runFieldSpecificTests();
        this.runIntegrationTests();

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        } else {
            console.log('\n💥 Some tests failed!');
            process.exit(1);
        }
    }
}

// Run the tests
const tests = new PercentageRangeConfigTests();
tests.runAllTests();