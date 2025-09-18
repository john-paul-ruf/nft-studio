#!/usr/bin/env node
/**
 * Debug test specifically for hex effect center property issue
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class HexEffectDebugTest {
    constructor() {
        this.effectsManager = new NftEffectsManager();
        this.projectData = {
            resolution: { width: 1920, height: 1080 },
            colorScheme: 'default',
            projectName: 'hex-debug-test'
        };
    }

    async debugHexEffect() {
        console.log('🔍 DEBUG: Testing hex effect specifically...\n');

        try {
            // 1. Test config introspection
            console.log('1️⃣ Testing config introspection for hex...');
            const introspectionResult = await this.effectsManager.introspectConfig({
                effectName: 'hex',
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

            // Look for center property specifically
            const centerField = fields.find(field => field.name === 'center');
            if (centerField) {
                console.log('✅ CENTER FIELD FOUND!');
                console.log('📍 Center field details:', JSON.stringify(centerField, null, 2));
            } else {
                console.log('❌ CENTER FIELD NOT FOUND!');
                console.log('🔍 Available field names:', fields.map(f => f.name));
            }

            // Check for any Point2D fields
            const point2dFields = fields.filter(field => field.type === 'point2d');
            console.log(`📍 Point2D fields found: ${point2dFields.length}`);
            point2dFields.forEach(field => {
                console.log(`   - ${field.name}: ${JSON.stringify(field.default)}`);
            });

            // Check raw config properties that might have x,y coordinates
            console.log('\n3️⃣ Checking for x,y coordinate properties...');
            const rawConfig = introspectionResult.defaultInstance;
            for (const [key, value] of Object.entries(rawConfig || {})) {
                if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
                    console.log(`📍 Found potential Point2D: ${key} =`, value);
                }
            }

            // 4. Check if this matches what the UI should show
            console.log('\n4️⃣ UI Rendering Analysis...');
            console.log('Fields that should show in UI:');
            editableFields.forEach(field => {
                const displayInfo = {
                    name: field.name,
                    type: field.type,
                    label: field.label,
                    hasDefault: field.default !== undefined,
                    defaultValue: field.default
                };
                console.log(`   ${field.name}: ${JSON.stringify(displayInfo)}`);
            });

            // 5. Test the actual effect defaults method
            console.log('\n5️⃣ Testing getEffectDefaults...');
            try {
                const defaults = await this.effectsManager.getEffectDefaults('hex');
                console.log('✅ Effect defaults retrieved');
                console.log('📋 Defaults keys:', Object.keys(defaults || {}));

                if (defaults && defaults.center) {
                    console.log('📍 Center in defaults:', defaults.center);
                }
            } catch (error) {
                console.log('⚠️  getEffectDefaults failed:', error.message);
            }

            // 6. Test schema generation
            console.log('\n6️⃣ Testing getEffectSchema...');
            try {
                const schema = await this.effectsManager.getEffectSchema('hex');
                console.log('✅ Schema retrieved');
                console.log('📋 Schema fields:', schema.fields?.length || 0);

                const centerSchemaField = schema.fields?.find(f => f.name === 'center');
                if (centerSchemaField) {
                    console.log('📍 Center in schema:', centerSchemaField);
                } else {
                    console.log('❌ Center not found in schema');
                }
            } catch (error) {
                console.log('⚠️  getEffectSchema failed:', error.message);
            }

        } catch (error) {
            console.log('💥 Debug test failed:', error.message);
            console.log(error.stack);
        }
    }

    async debugConfigIntrospectorDirectly() {
        console.log('\n🔧 DEBUG: Testing ConfigIntrospector directly...\n');

        try {
            // First get the raw config from the registry
            console.log('1️⃣ Getting config from registry...');
            await this.effectsManager.effectRegistryService.ensureCoreEffectsRegistered();
            const ConfigRegistry = await this.effectsManager.effectRegistryService.getConfigRegistry();

            const configData = ConfigRegistry.getGlobal('hex');
            if (!configData || !configData.ConfigClass) {
                console.log('❌ No config found for hex');
                return;
            }

            console.log('✅ Found config class for hex:', configData.ConfigClass.name);

            // Create a fresh instance
            console.log('\n2️⃣ Creating fresh config instance...');
            const ConfigClass = configData.ConfigClass;
            const freshInstance = new ConfigClass(this.projectData);

            console.log('📋 Fresh instance properties:', Object.keys(freshInstance));
            console.log('📋 Full fresh instance:', JSON.stringify(freshInstance, null, 2));

            // Check for center specifically
            if (freshInstance.center) {
                console.log('✅ CENTER FOUND in fresh instance!');
                console.log('📍 Center value:', freshInstance.center);
                console.log('📍 Center type:', typeof freshInstance.center);
                console.log('📍 Center constructor:', freshInstance.center.constructor.name);
            } else {
                console.log('❌ CENTER NOT FOUND in fresh instance');
            }

            // Run config introspection on the fresh instance
            console.log('\n3️⃣ Running config introspection on fresh instance...');

            const fields = this.introspectConfigFields(freshInstance, this.projectData);
            console.log(`📝 Generated ${fields.length} fields from fresh instance`);

            const centerField = fields.find(field => field.name === 'center');
            if (centerField) {
                console.log('✅ CENTER FIELD GENERATED!');
                console.log('📍 Center field:', JSON.stringify(centerField, null, 2));
            } else {
                console.log('❌ CENTER FIELD NOT GENERATED');
                console.log('🔍 Field names:', fields.map(f => f.name));
            }

        } catch (error) {
            console.log('💥 Direct config introspection failed:', error.message);
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
                            // Handle PercentageRange with function getters
                            if (value && typeof value.lower === 'function' && typeof value.upper === 'function') {
                                try {
                                    field.default = {
                                        lower: value.lower(),
                                        upper: value.upper()
                                    };
                                } catch (e) {
                                    field.default = { lower: 0.1, upper: 0.9 };
                                }
                            } else if (value && (value.lower === '[Function]' || value.upper === '[Function]')) {
                                field.default = { lower: 0.1, upper: 0.9 };
                            }
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
        console.log('🚀 Running Hex Effect Debug Tests...\n');

        await this.debugHexEffect();
        await this.debugConfigIntrospectorDirectly();

        console.log('\n🏁 Debug tests complete!');
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const debugTest = new HexEffectDebugTest();
    debugTest.runDebugTests().catch(console.error);
}

export default HexEffectDebugTest;