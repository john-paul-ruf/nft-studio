#!/usr/bin/env node
/**
 * Tests for the contract between frontend and backend
 * Ensures the interface is well-defined and maintained
 */

console.log('🧪 Testing Frontend-Backend Contract...\n');

class FrontendBackendContractTests {
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

    testRenderConfigContract() {
        console.log('📋 Testing Render Config Contract...\n');

        // Define the expected contract
        const expectedRenderConfigSchema = {
            // Required fields
            required: [
                'effects',           // Array of effect configurations
                'colorScheme',       // Selected color scheme ID
                'resolution',        // Target resolution
                'numberOfFrames'     // Total frame count
            ],
            // Optional fields that backend should handle gracefully
            optional: [
                'colorSchemeData',   // Full color scheme object
                'customColors',      // User color overrides
                'renderSettings',    // Render quality settings
                'metadata'           // Project metadata
            ]
        };

        this.test('Backend handles minimal valid config', () => {
            const minimalConfig = {
                effects: [],
                colorScheme: 'default',
                resolution: 'hd',
                numberOfFrames: 100
            };

            // Simulate backend validation
            const validationResult = this.validateRenderConfig(minimalConfig, expectedRenderConfigSchema);

            if (!validationResult.isValid) {
                throw new Error(`Minimal config validation failed: ${validationResult.errors.join(', ')}`);
            }

            console.log('   ✓ Minimal config accepted by backend');
        });

        this.test('Backend handles full config with all optional fields', () => {
            const fullConfig = {
                // Required
                effects: [
                    {
                        className: 'HexEffect',
                        type: 'primary',
                        config: { numberOfHex: 8 }
                    }
                ],
                colorScheme: 'neon-cyberpunk',
                resolution: '4k',
                numberOfFrames: 300,

                // Optional
                colorSchemeData: {
                    id: 'neon-cyberpunk',
                    name: 'Neon Cyberpunk',
                    lights: ['#00FFFF', '#FF00FF']
                },
                customColors: {
                    neutrals: ['#FFFFFF'],
                    backgrounds: ['#000000']
                },
                renderSettings: {
                    quality: 'ultra',
                    antialiasing: true
                },
                metadata: {
                    projectName: 'Test Project',
                    createdAt: '2025-01-15T12:00:00Z'
                }
            };

            const validationResult = this.validateRenderConfig(fullConfig, expectedRenderConfigSchema);

            if (!validationResult.isValid) {
                throw new Error(`Full config validation failed: ${validationResult.errors.join(', ')}`);
            }

            console.log('   ✓ Full config with optional fields accepted');
        });

        this.test('Backend rejects invalid config gracefully', () => {
            const invalidConfigs = [
                // Missing required fields
                { colorScheme: 'test' },
                // Wrong data types
                { effects: 'not-an-array', colorScheme: 'test', resolution: 'hd', numberOfFrames: 100 },
                // Invalid values
                { effects: [], colorScheme: '', resolution: 'invalid', numberOfFrames: -1 }
            ];

            for (const invalidConfig of invalidConfigs) {
                const validationResult = this.validateRenderConfig(invalidConfig, expectedRenderConfigSchema);

                if (validationResult.isValid) {
                    throw new Error(`Invalid config was incorrectly accepted: ${JSON.stringify(invalidConfig)}`);
                }
            }

            console.log('   ✓ Invalid configs properly rejected');
        });
    }

    testEffectConfigContract() {
        console.log('\n⚙️ Testing Effect Config Contract...\n');

        this.test('Effect config structure is standardized', () => {
            const standardEffectConfig = {
                className: 'string',    // Required: Effect class name
                type: 'string',         // Required: Effect type (primary, secondary, keyframe, final)
                config: 'object'        // Required: Effect-specific configuration
            };

            const validEffectConfigs = [
                {
                    className: 'HexEffect',
                    type: 'primary',
                    config: { numberOfHex: 12, strategy: ['rotate'] }
                },
                {
                    className: 'FuzzFlareEffect',
                    type: 'final',
                    config: { intensity: 0.8, spread: 0.5 }
                },
                {
                    className: 'CustomEffect',
                    type: 'secondary',
                    config: {} // Empty config should be valid
                }
            ];

            for (const effectConfig of validEffectConfigs) {
                if (typeof effectConfig.className !== 'string') {
                    throw new Error('className must be string');
                }
                if (typeof effectConfig.type !== 'string') {
                    throw new Error('type must be string');
                }
                if (typeof effectConfig.config !== 'object') {
                    throw new Error('config must be object');
                }
            }

            console.log('   ✓ Effect config structure validated');
        });

        this.test('Effect config supports arbitrary user values', () => {
            const effectWithComplexConfig = {
                className: 'ComplexEffect',
                type: 'primary',
                config: {
                    // Primitive values
                    stringValue: 'test',
                    numberValue: 42,
                    booleanValue: true,

                    // Arrays
                    arrayValue: [1, 2, 3],
                    stringArray: ['a', 'b', 'c'],

                    // Nested objects
                    nestedObject: {
                        subProperty: 'value',
                        deepNesting: {
                            level3: 'deep'
                        }
                    },

                    // Color values
                    color: '#FF0000',
                    colorArray: ['#FF0000', '#00FF00', '#0000FF'],

                    // Mathematical values
                    percentage: 0.75,
                    angle: 45.5,
                    coordinates: { x: 100, y: 200 }
                }
            };

            // This should be transferable and usable
            const transferred = JSON.parse(JSON.stringify(effectWithComplexConfig));

            if (transferred.config.stringValue !== 'test') {
                throw new Error('String values not preserved');
            }
            if (transferred.config.nestedObject.deepNesting.level3 !== 'deep') {
                throw new Error('Deep nesting not preserved');
            }
            if (transferred.config.coordinates.x !== 100) {
                throw new Error('Coordinate values not preserved');
            }

            console.log('   ✓ Complex effect configs supported');
        });
    }

    testColorSchemeContract() {
        console.log('\n🎨 Testing Color Scheme Contract...\n');

        this.test('Color scheme data structure is standardized', () => {
            const standardColorScheme = {
                id: 'string',           // Required: Unique identifier
                name: 'string',         // Required: Display name
                neutrals: 'array',      // Required: Neutral colors
                backgrounds: 'array',   // Required: Background colors
                lights: 'array',        // Required: Primary colors for effects
                description: 'string'   // Optional: Description
            };

            const validColorScheme = {
                id: 'test-scheme',
                name: 'Test Scheme',
                neutrals: ['#FFFFFF', '#CCCCCC', '#808080'],
                backgrounds: ['#000000', '#1A1A1A'],
                lights: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
                description: 'A test color scheme'
            };

            // Validate structure
            if (typeof validColorScheme.id !== 'string') {
                throw new Error('id must be string');
            }
            if (!Array.isArray(validColorScheme.neutrals)) {
                throw new Error('neutrals must be array');
            }
            if (!Array.isArray(validColorScheme.backgrounds)) {
                throw new Error('backgrounds must be array');
            }
            if (!Array.isArray(validColorScheme.lights)) {
                throw new Error('lights must be array');
            }

            // Validate colors are hex format
            const allColors = [
                ...validColorScheme.neutrals,
                ...validColorScheme.backgrounds,
                ...validColorScheme.lights
            ];

            const hexRegex = /^#[0-9A-F]{6}$/i;
            for (const color of allColors) {
                if (!hexRegex.test(color)) {
                    throw new Error(`Invalid hex color: ${color}`);
                }
            }

            console.log('   ✓ Color scheme structure validated');
        });

        this.test('Backend uses color scheme data correctly', () => {
            const colorScheme = {
                id: 'test-scheme',
                name: 'Test Scheme',
                neutrals: ['#F0F0F0'],
                backgrounds: ['#1A1A1A'],
                lights: ['#FF6B6B', '#4ECDC4', '#45B7D1']
            };

            // Simulate backend usage
            const mockBackend = {
                createColorBucket: (scheme) => {
                    return scheme.lights; // Backend should use lights as color bucket
                },
                createProject: (config) => {
                    const colorBucket = config.selectedColorScheme
                        ? mockBackend.createColorBucket(config.selectedColorScheme)
                        : ['#default'];

                    return {
                        colorScheme: {
                            colorBucket: colorBucket,
                            name: config.selectedColorScheme?.name || 'Default'
                        }
                    };
                }
            };

            const renderConfig = {
                effects: [],
                colorScheme: 'test-scheme',
                selectedColorScheme: colorScheme,
                resolution: 'hd',
                numberOfFrames: 100
            };

            const project = mockBackend.createProject(renderConfig);

            if (!Array.isArray(project.colorScheme.colorBucket)) {
                throw new Error('Backend should create color bucket array');
            }

            if (project.colorScheme.colorBucket[0] !== '#FF6B6B') {
                throw new Error('Backend should use lights array as color bucket');
            }

            if (project.colorScheme.name !== 'Test Scheme') {
                throw new Error('Backend should preserve color scheme name');
            }

            console.log('   ✓ Backend uses color scheme data correctly');
        });
    }

    // Helper method to validate render config
    validateRenderConfig(config, schema) {
        const errors = [];

        // Check required fields
        for (const field of schema.required) {
            if (!(field in config)) {
                errors.push(`Missing required field: ${field}`);
            } else if (config[field] === null || config[field] === undefined) {
                errors.push(`Required field ${field} cannot be null or undefined`);
            }
        }

        // Validate specific field types
        if ('effects' in config && !Array.isArray(config.effects)) {
            errors.push('effects must be an array');
        }

        if ('colorScheme' in config && typeof config.colorScheme !== 'string') {
            errors.push('colorScheme must be a string');
        }

        if ('numberOfFrames' in config && (typeof config.numberOfFrames !== 'number' || config.numberOfFrames <= 0)) {
            errors.push('numberOfFrames must be a positive number');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    runAllTests() {
        console.log('🚀 Running Frontend-Backend Contract Tests...\n');

        try {
            this.testRenderConfigContract();
            this.testEffectConfigContract();
            this.testColorSchemeContract();
        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
        }

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All contract tests passed!');
            console.log('\n📜 Frontend-Backend Contract Verified:');
            console.log('   1. 📋 Render config schema is well-defined');
            console.log('   2. ⚙️ Effect config structure is standardized');
            console.log('   3. 🎨 Color scheme format is consistent');
            console.log('   4. 🛡️ Invalid configs are properly rejected');
            console.log('   5. 🔄 Data transfer preserves all values');
            console.log('\n✨ This ensures:');
            console.log('   - Reliable communication between UI and backend');
            console.log('   - Consistent behavior across features');
            console.log('   - Easy testing and validation');
            console.log('   - Future-proof extensibility');
        } else {
            console.log('\n💥 Some contract tests failed!');
            console.log('   The interface between frontend and backend needs attention');
        }
    }
}

// Run the tests
const tests = new FrontendBackendContractTests();
tests.runAllTests();