#!/usr/bin/env node
/**
 * Debug test specifically for fuzz-flare effect PercentageRange NaN issue
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class FuzzFlareDebugTest {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.projectData = {
            resolution: { width: 1920, height: 1080 },
            colorScheme: 'default',
            projectName: 'fuzz-flare-debug-test'
        };
    }

    async debugFuzzFlareEffect() {
        console.log('🔥 DEBUG: Testing fuzz-flare effect specifically for PercentageRange NaN...\n');

        try {
            // 1. Test config introspection
            console.log('1️⃣ Testing config introspection for fuzz-flare...');
            const introspectionResult = await this.effectsManager.introspectConfig({
                effectName: 'fuzz-flare',
                projectData: this.projectData
            });

            console.log('✅ Introspection success:', introspectionResult.success);

            if (introspectionResult.success) {
                console.log('📋 Default instance keys:', Object.keys(introspectionResult.defaultInstance || {}));
                console.log('📋 Full default instance:', JSON.stringify(introspectionResult.defaultInstance, null, 2));
            } else {
                console.log('❌ Introspection failed:', introspectionResult.error);
                return;
            }

            // 2. Test config field generation using backend logic
            console.log('\n2️⃣ Testing config field generation...');

            // Create backend-only introspection logic (no window.api dependency)
            const fields = this.introspectConfigFields(
                introspectionResult.defaultInstance,
                this.projectData
            );

            console.log(`✅ Generated ${fields.length} fields total`);

            // Filter out metadata fields
            const editableFields = fields.filter(field => !field.name.startsWith('__'));
            console.log(`📝 Editable fields: ${editableFields.length}`);

            // Look for PercentageRange fields specifically
            const percentageRangeFields = fields.filter(field => field.type === 'percentagerange');
            console.log(`📊 PercentageRange fields found: ${percentageRangeFields.length}`);

            percentageRangeFields.forEach(field => {
                console.log(`   - ${field.name}:`);
                console.log(`     └─ Default: ${JSON.stringify(field.default)}`);
                console.log(`     └─ Type: ${field.type}`);

                // Check for NaN values
                if (field.default && typeof field.default === 'object') {
                    if (field.default.lower === 'NaN' || field.default.upper === 'NaN' ||
                        isNaN(field.default.lower) || isNaN(field.default.upper)) {
                        console.log(`     🚨 NaN DETECTED in field ${field.name}!`);
                    }
                }
            });

            // Check raw config properties for PercentageRange objects
            console.log('\n3️⃣ Checking raw PercentageRange properties...');
            const rawConfig = introspectionResult.defaultInstance;
            for (const [key, value] of Object.entries(rawConfig || {})) {
                if (value && value.__className === 'PercentageRange') {
                    console.log(`📊 Found PercentageRange: ${key}`);
                    console.log(`   Raw value: ${JSON.stringify(value)}`);

                    // Check if it has function getters
                    if (typeof value.lower === 'function' && typeof value.upper === 'function') {
                        console.log('   Has function getters - calling them:');
                        try {
                            const lowerVal = value.lower();
                            const upperVal = value.upper();
                            console.log(`   lower(): ${lowerVal} (${typeof lowerVal})`);
                            console.log(`   upper(): ${upperVal} (${typeof upperVal})`);

                            if (isNaN(lowerVal) || isNaN(upperVal)) {
                                console.log('   🚨 Function getter returned NaN!');
                            }
                        } catch (error) {
                            console.log(`   ❌ Error calling function getters: ${error.message}`);
                        }
                    } else if (value.lower === '[Function]' || value.upper === '[Function]') {
                        console.log('   🔧 Serialized functions detected (IPC artifact)');
                    } else {
                        console.log(`   Direct values: lower=${value.lower}, upper=${value.upper}`);
                    }
                }
            }

            // 4. UI Rendering Analysis for PercentageRange fields
            console.log('\n4️⃣ UI Rendering Analysis for PercentageRange...');
            console.log('PercentageRange fields that should show in UI:');
            percentageRangeFields.forEach(field => {
                const displayInfo = {
                    name: field.name,
                    type: field.type,
                    label: field.label,
                    default: field.default,
                    hasNaN: false
                };

                // Check for NaN in the default values
                if (field.default && typeof field.default === 'object') {
                    if (isNaN(field.default.lower) || isNaN(field.default.upper) ||
                        field.default.lower === 'NaN' || field.default.upper === 'NaN') {
                        displayInfo.hasNaN = true;
                    }
                }

                console.log(`   ${field.name}: ${JSON.stringify(displayInfo)}`);
                if (displayInfo.hasNaN) {
                    console.log(`      🚨 THIS FIELD WILL SHOW NaN IN UI!`);
                }
            });

        } catch (error) {
            console.log('💥 Debug test failed:', error.message);
            console.log(error.stack);
        }
    }

    /**
     * Backend-only config introspection logic (adapted from frontend ConfigIntrospector)
     * @param {Object} configInstance - Config instance with properties
     * @param {Object} projectData - Project data for context
     * @returns {Array} Array of field definitions
     */
    introspectConfigFields(configInstance, projectData) {
        const fields = [];

        if (!configInstance || typeof configInstance !== 'object') {
            return fields;
        }

        // Iterate through all properties of the config instance
        for (const [name, value] of Object.entries(configInstance)) {
            // Skip metadata fields
            if (name.startsWith('__')) {
                continue;
            }

            const field = {
                name,
                label: this.generateLabel(name),
                default: value
            };

            // Determine field type based on value
            const type = typeof value;
            const className = value && value.__className;

            if (type === 'boolean') {
                field.type = 'boolean';
            } else if (type === 'number') {
                field.type = 'number';
                field.min = 0;
                field.max = name.toLowerCase().includes('opacity') ? 1 : 100;
                field.step = name.toLowerCase().includes('opacity') ? 0.01 : 1;
            } else if (type === 'string') {
                field.type = 'text';
            } else if (Array.isArray(value)) {
                field.type = 'json';
                field.label += ' (Array)';
            } else if (type === 'object' && value !== null) {
                // Handle known object types
                if (className) {
                    switch (className) {
                        case 'ColorPicker':
                            field.type = 'colorpicker';
                            field.bucketType = 'colorBucket';
                            break;
                        case 'Range':
                            field.type = 'range';
                            field.min = 1;
                            field.max = 100;
                            field.label += ' Range';
                            break;
                        case 'PercentageRange':
                            field.type = 'percentagerange';
                            field.label += ' Range';
                            console.log(`🔍 Processing PercentageRange field: ${name}`);
                            console.log(`   Original value: ${JSON.stringify(value)}`);

                            // Handle PercentageRange with function getters
                            if (value && typeof value.lower === 'function' && typeof value.upper === 'function') {
                                console.log('   Has function getters - calling them...');
                                try {
                                    const lowerResult = value.lower();
                                    const upperResult = value.upper();
                                    console.log(`   lower() = ${lowerResult}, upper() = ${upperResult}`);

                                    field.default = {
                                        lower: lowerResult,
                                        upper: upperResult
                                    };

                                    if (isNaN(lowerResult) || isNaN(upperResult)) {
                                        console.log('   🚨 Function returned NaN - using fallback defaults');
                                        field.default = { lower: 0.1, upper: 0.9 };
                                    }
                                } catch (e) {
                                    console.log(`   ❌ Function call failed: ${e.message} - using fallback defaults`);
                                    field.default = { lower: 0.1, upper: 0.9 };
                                }
                            } else if (value && (value.lower === '[Function]' || value.upper === '[Function]')) {
                                console.log('   Serialized functions detected - using fallback defaults');
                                field.default = { lower: 0.1, upper: 0.9 };
                            } else if (value && value.__className) {
                                console.log('   Using direct values from object');
                                const { __className, ...cleanValue } = value;
                                field.default = cleanValue;
                            } else {
                                console.log('   Using value as-is');
                                field.default = value;
                            }

                            console.log(`   Final field default: ${JSON.stringify(field.default)}`);
                            break;
                        case 'Point2D':
                            field.type = 'point2d';
                            field.label += ' Position';
                            break;
                        case 'DynamicRange':
                            field.type = 'dynamicrange';
                            field.label += ' Dynamic Range';
                            break;
                        default:
                            field.type = 'json';
                            field.label += ' (Object)';
                    }
                } else {
                    // Structure-based detection for objects without className
                    if (value.hasOwnProperty('x') && value.hasOwnProperty('y') &&
                        typeof value.x === 'number' && typeof value.y === 'number') {
                        field.type = 'point2d';
                        field.label += ' Position';
                    } else if (value.hasOwnProperty('lower') && value.hasOwnProperty('upper')) {
                        field.type = 'range';
                        field.min = 0;
                        field.max = name.includes('opacity') ? 1 : 100;
                        field.step = name.includes('opacity') ? 0.01 : 1;
                        field.label += ' Range';
                    } else {
                        field.type = 'json';
                        field.label += ' (Object)';
                    }
                }
            } else {
                field.type = 'json';
                field.label += ` (${type})`;
            }

            fields.push(field);
        }

        return fields;
    }

    /**
     * Generate a human-readable label from property name
     * @param {string} name - Property name
     * @returns {string} Human-readable label
     */
    generateLabel(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    async runDebugTests() {
        console.log('🚀 Running Fuzz-Flare Effect Debug Tests...\n');

        await this.debugFuzzFlareEffect();

        console.log('\n🏁 Debug tests complete!');
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const debugTest = new FuzzFlareDebugTest();
    debugTest.runDebugTests().catch(console.error);
}

export default FuzzFlareDebugTest;