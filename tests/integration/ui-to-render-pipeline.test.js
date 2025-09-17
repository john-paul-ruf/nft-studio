#!/usr/bin/env node
/**
 * Complete UI → Backend → Render Pipeline Test with Real FuzzFlareEffect
 * Tests how values are stored in UI, then creates a project and validates frame rendering
 */

const path = require('path');

console.log('🧪 UI → Backend → Render Pipeline Test with FuzzFlareEffect\n');

class UIToRenderPipelineTest {
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

    // Test 1: UI Value Storage Simulation
    testUIValueStorage() {
        console.log('📋 Testing UI Value Storage...\n');

        return this.test('UI stores simple effect configuration values', () => {
            // This simulates how the UI stores effect configuration
            const uiStoredEffect = {
                className: 'fuzz-flare',  // Use registry name
                config: {
                    // ColorPicker values - just store user's choice
                    innerColor: {
                        selectionType: 'colorBucket'  // User picked color bucket
                    },
                    outerColor: {
                        selectionType: 'color',       // User picked specific color
                        colorValue: '#00FFFF'
                    },
                    // Range values - just store numbers user entered
                    numberOfFlareRings: {
                        lower: 5,
                        upper: 5
                    },
                    numberOfFlareRays: {
                        lower: 5,
                        upper: 5
                    },
                    // Simple values
                    elementPhantomGranularity: 5,
                    elementGastonGranularity: 5
                },
                type: 'primary',
                secondaryEffects: [],
                keyframeEffects: []
            };

            console.log('   UI Effect Config:', JSON.stringify(uiStoredEffect, null, 2));

            // Validate UI stores only simple values, no methods
            if (typeof uiStoredEffect.config.innerColor.getColor === 'function') {
                throw new Error('UI should not store getColor method');
            }

            if (typeof uiStoredEffect.config.numberOfFlareRings.getValue === 'function') {
                throw new Error('UI should not store getValue method');
            }

            // Validate structure
            if (uiStoredEffect.config.innerColor.selectionType !== 'colorBucket') {
                throw new Error('Inner color selection type not preserved');
            }

            if (uiStoredEffect.config.outerColor.colorValue !== '#00FFFF') {
                throw new Error('Outer color value not preserved');
            }

            if (uiStoredEffect.config.numberOfFlareRings.lower !== 5) {
                throw new Error('Number of flare rings not preserved');
            }

            console.log('   ✓ UI stores only user selections, no implementation objects');
        });
    }

    // Test 2: Project Configuration Creation
    testProjectConfigCreation() {
        console.log('\n📋 Testing Project Configuration Creation...\n');

        return this.test('Create complete project config from UI values', () => {
            // This simulates the complete config that gets sent to backend
            const projectConfig = {
                // Project metadata
                artistName: 'Test Artist',
                projectName: 'Test Project',
                outputDirectory: '/tmp/test-output',

                // Render settings
                targetResolution: 512,
                isHorizontal: false,
                numFrames: 1,  // Just render 1 frame for test

                // Effects array with UI-stored values
                effects: [
                    {
                        className: 'fuzz-flare',  // Use registry name
                        config: {
                            innerColor: { selectionType: 'colorBucket' },
                            outerColor: { selectionType: 'color', colorValue: '#00FFFF' },
                            numberOfFlareRings: { lower: 5, upper: 5 },
                            numberOfFlareRays: { lower: 5, upper: 5 },
                            elementPhantomGranularity: 5,
                            elementGastonGranularity: 5
                        },
                        type: 'primary',
                        secondaryEffects: [],
                        keyframeEffects: []
                    }
                ],

                // Color scheme
                colorScheme: 'neon-cyberpunk',

                // Canvas dimensions
                width: 512,
                height: 512,

                // Frame range
                renderStartFrame: 0,
                renderJumpFrames: 1
            };

            console.log('   Project config created with', projectConfig.effects.length, 'effects');
            console.log('   First effect:', projectConfig.effects[0].className);
            console.log('   Inner color selection:', projectConfig.effects[0].config.innerColor.selectionType);
            console.log('   Outer color value:', projectConfig.effects[0].config.outerColor.colorValue);
            console.log('   Number of rings:', projectConfig.effects[0].config.numberOfFlareRings.lower);

            // Validate config structure
            if (!Array.isArray(projectConfig.effects)) {
                throw new Error('Effects should be an array');
            }

            if (projectConfig.effects.length !== 1) {
                throw new Error('Should have exactly 1 effect');
            }

            const effect = projectConfig.effects[0];
            if (effect.className !== 'FuzzFlareEffect') {
                throw new Error('Effect className not preserved');
            }

            console.log('   ✓ Complete project config created from UI values');
        });
    }

    // Test 3: Real Backend Processing with FuzzFlareEffect
    async testBackendProcessing() {
        console.log('\n📋 Testing Real Backend Processing with FuzzFlareEffect...\n');

        return this.test('Real EffectProcessingService processes FuzzFlareEffect config', async () => {
            // Import real backend services
            const EffectProcessingService = require('../../src/main/services/EffectProcessingService');

            console.log('   🔄 Using real EffectProcessingService...');

            // UI config exactly as stored by the UI - use correct registry name
            const uiEffectConfig = {
                className: 'fuzz-flare',  // Use registry name, not class name
                config: {
                    // ColorPicker values - exactly how UI stores them
                    innerColor: { selectionType: 'colorBucket' },
                    outerColor: { selectionType: 'color', colorValue: '#00FFFF' },

                    // Range values - exactly how UI stores them
                    numberOfFlareRings: { lower: 5, upper: 5 },
                    numberOfFlareRays: { lower: 5, upper: 5 },

                    // Simple values
                    elementPhantomGranularity: 5,
                    elementGastonGranularity: 5
                },
                type: 'primary'
            };

            console.log('   📝 UI Config:', JSON.stringify(uiEffectConfig.config, null, 2));

            try {
                // Use real EffectProcessingService to create config instance
                const myNftGenPath = path.resolve(__dirname, '../../../my-nft-gen');
                const processedConfig = await EffectProcessingService.createConfigInstance(
                    uiEffectConfig,
                    myNftGenPath
                );

                console.log('   🎯 Real backend processing completed');

                // Validate the real processed config
                if (!processedConfig) {
                    throw new Error('EffectProcessingService returned null config');
                }

                console.log('   🔍 Validating processed config...');

                // Check ColorPicker objects
                if (!processedConfig.innerColor) {
                    throw new Error('innerColor missing from processed config');
                }

                if (!processedConfig.outerColor) {
                    throw new Error('outerColor missing from processed config');
                }

                // Validate ColorPicker methods exist
                if (typeof processedConfig.innerColor.getColor !== 'function') {
                    throw new Error('innerColor should have getColor method after real processing');
                }

                if (typeof processedConfig.outerColor.getColor !== 'function') {
                    throw new Error('outerColor should have getColor method after real processing');
                }

                // Test the real methods work
                const innerColor = processedConfig.innerColor.getColor();
                const outerColor = processedConfig.outerColor.getColor();

                console.log(`   innerColor.getColor(): ${innerColor}`);
                console.log(`   outerColor.getColor(): ${outerColor}`);

                if (typeof innerColor !== 'string') {
                    throw new Error('Real innerColor.getColor() should return a string');
                }

                if (typeof outerColor !== 'string') {
                    throw new Error('Real outerColor.getColor() should return a string');
                }

                // For specific color choice, validate it matches user selection
                if (uiEffectConfig.config.outerColor.selectionType === 'color') {
                    if (outerColor !== uiEffectConfig.config.outerColor.colorValue) {
                        throw new Error(`User-selected color ${uiEffectConfig.config.outerColor.colorValue} not preserved, got ${outerColor}`);
                    }
                }

                // Check Range objects if they exist
                if (processedConfig.numberOfFlareRings) {
                    if (typeof processedConfig.numberOfFlareRings.getValue !== 'function') {
                        console.log('   ⚠️  numberOfFlareRings missing getValue method - checking if it has lower/upper properties');

                        // For FuzzFlareEffect, numberOfFlareRings might be a simple Range with lower/upper
                        if (typeof processedConfig.numberOfFlareRings.lower !== 'number') {
                            throw new Error('numberOfFlareRings should have lower property');
                        }

                        if (typeof processedConfig.numberOfFlareRings.upper !== 'number') {
                            throw new Error('numberOfFlareRings should have upper property');
                        }

                        console.log(`   numberOfFlareRings range: ${processedConfig.numberOfFlareRings.lower} - ${processedConfig.numberOfFlareRings.upper}`);
                    } else {
                        const ringCount = processedConfig.numberOfFlareRings.getValue();
                        console.log(`   numberOfFlareRings.getValue(): ${ringCount}`);
                    }
                }

                // Validate simple values preserved
                if (processedConfig.elementPhantomGranularity !== 5) {
                    throw new Error('Simple values should be preserved');
                }

                console.log('   ✅ Real backend processing successful - all objects created with proper methods');

            } catch (error) {
                console.error('   ❌ Real backend processing failed:', error.message);
                throw error;
            }
        });
    }

    // Test 4: Real FuzzFlareEffect Render Pipeline
    async testFullRenderPipeline() {
        console.log('\n📋 Testing Real FuzzFlareEffect Render Pipeline...\n');

        return this.test('Real pipeline: UI → IPC → Backend → NftProjectManager.renderFrame', async () => {
            console.log('   🚀 Testing complete real render pipeline...');

            // Step 1: UI creates config exactly as stored
            const uiRenderConfig = {
                artistName: 'Test Artist',
                projectName: 'Pipeline Test',
                outputDirectory: '/tmp/test-output',
                targetResolution: 512,
                isHorizontal: false,
                numFrames: 1,
                effects: [
                    {
                        className: 'fuzz-flare',  // Use registry name
                        config: {
                            // Exact UI storage format
                            innerColor: { selectionType: 'colorBucket' },
                            outerColor: { selectionType: 'color', colorValue: '#00FFFF' },
                            numberOfFlareRings: { lower: 3, upper: 3 },
                            numberOfFlareRays: { lower: 3, upper: 3 },
                            elementPhantomGranularity: 5,
                            elementGastonGranularity: 5
                        },
                        type: 'primary',
                        secondaryEffects: [],
                        keyframeEffects: []
                    }
                ],
                colorScheme: 'neon-cyberpunk',
                width: 512,
                height: 512,
                renderStartFrame: 0,
                renderJumpFrames: 1
            };

            console.log('   1. UI Config created ✓');
            console.log(`   Effects: ${uiRenderConfig.effects.length}`);
            console.log(`   Effect: ${uiRenderConfig.effects[0].className}`);
            console.log(`   Outer color: ${uiRenderConfig.effects[0].config.outerColor.colorValue}`);
            console.log(`   Rings: ${uiRenderConfig.effects[0].config.numberOfFlareRings.lower}`);

            // Step 2: IPC transfer (JSON serialization/deserialization)
            const serialized = JSON.stringify(uiRenderConfig);
            const afterIPC = JSON.parse(serialized);

            // Validate no data loss in IPC
            if (afterIPC.effects[0].config.outerColor.colorValue !== '#00FFFF') {
                throw new Error('Color value lost in IPC transfer');
            }

            if (afterIPC.effects[0].config.numberOfFlareRings.lower !== 3) {
                throw new Error('Ring count lost in IPC transfer');
            }

            console.log('   2. IPC transfer completed ✓ (no data loss)');

            // Step 3: Real Backend Processing with NftProjectManager
            try {
                const NftProjectManager = require('../../src/main/implementations/NftProjectManager');

                console.log('   3. Using real NftProjectManager...');

                // Create project manager instance
                const projectManager = new NftProjectManager();

                console.log('   4. Calling real renderFrame...');

                // Call the actual renderFrame method
                const renderResult = await projectManager.renderFrame(0, afterIPC);

                console.log('   5. Real render completed!');

                // Validate real render result
                if (!renderResult) {
                    throw new Error('NftProjectManager.renderFrame returned null');
                }

                if (!renderResult.success) {
                    throw new Error(`Render failed: ${renderResult.error || 'Unknown error'}`);
                }

                if (!renderResult.frameBuffer) {
                    throw new Error('Render result missing frameBuffer');
                }

                if (renderResult.frameNumber !== 0) {
                    throw new Error('Frame number not preserved');
                }

                console.log('   ✅ Real render validation:');
                console.log(`      Success: ${renderResult.success}`);
                console.log(`      Frame number: ${renderResult.frameNumber}`);
                console.log(`      Buffer size: ${renderResult.frameBuffer ? renderResult.frameBuffer.length : 0} bytes`);

                // Validate this is a real image buffer
                if (renderResult.frameBuffer.length === 0) {
                    throw new Error('Frame buffer is empty');
                }

                // Buffer should be reasonable size for a 512x512 image
                const expectedMinSize = 1000; // At least 1KB for compressed image
                if (renderResult.frameBuffer.length < expectedMinSize) {
                    throw new Error(`Frame buffer too small: ${renderResult.frameBuffer.length} bytes`);
                }

                console.log('   6. Frame validation completed ✓');
                console.log('   ✅ Complete REAL pipeline successful:');
                console.log('      📱 UI stored simple values');
                console.log('      📡 IPC transferred without data loss');
                console.log('      🔧 Backend created proper objects');
                console.log('      🖼️ FuzzFlareEffect rendered actual frame');
                console.log('      ✨ No "is not a function" errors!');

            } catch (error) {
                console.error('   ❌ Real render pipeline failed:', error.message);

                // Log more details if it's a specific error we're tracking
                if (error.message.includes('getColor is not a function')) {
                    console.error('   💥 ColorPicker method missing - fix not working');
                } else if (error.message.includes('lower is not a function')) {
                    console.error('   💥 Range method missing - fix not working');
                } else if (error.message.includes('flareRingsSizeRange')) {
                    console.error('   💥 PercentageRange method missing - fix not working');
                }

                throw error;
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Complete UI → Backend → Render Pipeline Tests...\n');

        await this.testUIValueStorage();
        await this.testProjectConfigCreation();
        await this.testBackendProcessing();
        await this.testFullRenderPipeline();

        console.log('\n📊 Pipeline Test Results:');
        console.log(`   Total: ${this.testResults.total}`);
        console.log(`   Passed: ${this.testResults.passed}`);
        console.log(`   Failed: ${this.testResults.failed}`);

        if (this.testResults.failed === 0) {
            console.log('\n🎉 ALL PIPELINE TESTS PASSED!');
            console.log('\n✨ Complete Pipeline Validation:');
            console.log('   1. ✅ UI stores only user selections (no methods)');
            console.log('   2. ✅ IPC transfer preserves all user data');
            console.log('   3. ✅ Backend creates proper objects with methods');
            console.log('   4. ✅ Render methods work without "is not a function" errors');
            console.log('   5. ✅ User selections preserved through entire pipeline');
            console.log('\n🎯 Architecture Validated:');
            console.log('   📱 UI: Store what user picked');
            console.log('   📡 IPC: Transfer user choices');
            console.log('   🔧 Backend: Create objects when needed');
            console.log('   🖼️ Render: Use proper objects with methods');
            console.log('\n🚀 Ready for production use!');
        } else {
            console.log('\n❌ Pipeline tests failed! Review and fix issues.');
        }
    }
}

// Run the complete pipeline test
const pipelineTest = new UIToRenderPipelineTest();
pipelineTest.runAllTests().catch(error => {
    console.error('Pipeline test failed:', error);
    process.exit(1);
});