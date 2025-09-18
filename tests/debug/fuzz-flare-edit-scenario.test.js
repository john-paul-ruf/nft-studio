#!/usr/bin/env node
/**
 * Test that reproduces the exact FuzzFlareEffect edit scenario causing the error
 * Tests adding effect, then editing it, then rendering
 */

console.log('🔧 FuzzFlareEffect Edit Scenario Test\n');

class FuzzFlareEditTest {
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
            console.log(`   Stack: ${error.stack?.split('\n').slice(0, 3).join('\n')}`);
            this.testResults.failed++;
        }
    }

    async testOriginalAddScenario() {
        console.log('📋 Testing Original Add Scenario (should work)...\n');

        return this.test('Initial FuzzFlareEffect add with defaults', async () => {
            const { default: EffectProcessingService } = await import('../../src/main/services/EffectProcessingService.js');

            // Step 1: User adds FuzzFlareEffect - uses complete default config
            const initialEffectConfig = {
                className: 'fuzz-flare',
                config: {
                    // Default config from backend has proper PercentageRange objects
                    // This simulates first add - backend provides defaults
                },
                type: 'primary'
            };

            console.log('   🎯 Step 1: Initial add with empty config (backend provides defaults)');

            const path = await import('path');
            const myNftGenPath = path.resolve(new URL('.', import.meta.url).pathname, '../../../my-nft-gen');
            const processedConfig = await EffectProcessingService.createConfigInstance(
                initialEffectConfig,
                myNftGenPath
            );

            console.log('   📊 Processed config structure:', {
                hasInnerColor: !!processedConfig.innerColor,
                hasOuterColor: !!processedConfig.outerColor,
                hasFlareRingsSizeRange: !!processedConfig.flareRingsSizeRange,
                flareRingsSizeRangeType: processedConfig.flareRingsSizeRange?.constructor?.name,
                hasLowerMethod: typeof processedConfig.flareRingsSizeRange?.lower === 'function',
                hasUpperMethod: typeof processedConfig.flareRingsSizeRange?.upper === 'function'
            });

            // Validate initial config has proper methods
            if (!processedConfig.flareRingsSizeRange) {
                throw new Error('Initial config missing flareRingsSizeRange');
            }

            if (typeof processedConfig.flareRingsSizeRange.lower !== 'function') {
                throw new Error('Initial flareRingsSizeRange.lower is not a function');
            }

            if (typeof processedConfig.flareRingsSizeRange.upper !== 'function') {
                throw new Error('Initial flareRingsSizeRange.upper is not a function');
            }

            console.log('   ✅ Initial add scenario works - proper PercentageRange methods');
        });
    }

    async testEditedConfigScenario() {
        console.log('\n📋 Testing Edited Config Scenario (currently failing)...\n');

        return this.test('FuzzFlareEffect after user edit (5 rings, 5 rays)', async () => {
            const { default: EffectProcessingService } = await import('../../src/main/services/EffectProcessingService.js');

            // Step 2: User edits the config in UI - UI stores simple values
            const editedEffectConfig = {
                className: 'fuzz-flare',
                config: {
                    // This is what UI stores after user edits
                    innerColor: { selectionType: 'colorBucket' },
                    outerColor: { selectionType: 'color', colorValue: '#00FFFF' },
                    numberOfFlareRings: { lower: 5, upper: 5 },     // User changed to 5
                    numberOfFlareRays: { lower: 5, upper: 5 },      // User changed to 5
                    elementPhantomGranularity: 5,                   // User changed to 5
                    elementGastonGranularity: 5,                    // User changed to 5

                    // Complex objects that UI doesn't modify - these get lost or corrupted
                    flareRingsSizeRange: {},  // This becomes empty or loses methods

                    // Other defaults that might be affected
                    center: { x: 540, y: 960 },
                    layerOpacity: 0.7
                },
                type: 'primary'
            };

            console.log('   🎯 Step 2: After user edit - simple values stored, complex objects lost');
            console.log('   📝 User config:', JSON.stringify(editedEffectConfig.config, null, 2));

            const path = await import('path');
            const myNftGenPath = path.resolve(new URL('.', import.meta.url).pathname, '../../../my-nft-gen');
            const processedConfig = await EffectProcessingService.createConfigInstance(
                editedEffectConfig,
                myNftGenPath
            );

            console.log('   📊 Processed edited config:', {
                hasInnerColor: !!processedConfig.innerColor,
                innerColorType: processedConfig.innerColor?.constructor?.name,
                hasGetColor: typeof processedConfig.innerColor?.getColor === 'function',

                hasOuterColor: !!processedConfig.outerColor,
                outerColorType: processedConfig.outerColor?.constructor?.name,

                hasFlareRingsSizeRange: !!processedConfig.flareRingsSizeRange,
                flareRingsSizeRangeType: processedConfig.flareRingsSizeRange?.constructor?.name,
                hasLowerMethod: typeof processedConfig.flareRingsSizeRange?.lower === 'function',
                hasUpperMethod: typeof processedConfig.flareRingsSizeRange?.upper === 'function',

                numberOfFlareRings: processedConfig.numberOfFlareRings,
                numberOfFlareRaysType: processedConfig.numberOfFlareRays?.constructor?.name
            });

            // Test ColorPicker reconstruction
            if (!processedConfig.innerColor) {
                throw new Error('Edited config missing innerColor');
            }

            if (typeof processedConfig.innerColor.getColor !== 'function') {
                throw new Error('Edited innerColor missing getColor method');
            }

            if (!processedConfig.outerColor) {
                throw new Error('Edited config missing outerColor');
            }

            if (typeof processedConfig.outerColor.getColor !== 'function') {
                throw new Error('Edited outerColor missing getColor method');
            }

            // Test PercentageRange reconstruction - this is what's failing!
            if (!processedConfig.flareRingsSizeRange) {
                throw new Error('Edited config missing flareRingsSizeRange');
            }

            if (typeof processedConfig.flareRingsSizeRange.lower !== 'function') {
                throw new Error('CRITICAL: Edited flareRingsSizeRange.lower is not a function - this causes the UI error!');
            }

            if (typeof processedConfig.flareRingsSizeRange.upper !== 'function') {
                throw new Error('CRITICAL: Edited flareRingsSizeRange.upper is not a function');
            }

            // Test that the methods actually work
            try {
                const testSize = 100;
                const lowerValue = processedConfig.flareRingsSizeRange.lower(testSize);
                const upperValue = processedConfig.flareRingsSizeRange.upper(testSize);

                console.log(`   🧪 Method test: lower(${testSize}) = ${lowerValue}, upper(${testSize}) = ${upperValue}`);

                if (typeof lowerValue !== 'number') {
                    throw new Error('flareRingsSizeRange.lower() should return a number');
                }

                if (typeof upperValue !== 'number') {
                    throw new Error('flareRingsSizeRange.upper() should return a number');
                }

            } catch (methodError) {
                throw new Error(`PercentageRange method calls failed: ${methodError.message}`);
            }

            // Test Range objects for numberOfFlareRings
            if (processedConfig.numberOfFlareRings?.lower !== 5) {
                throw new Error('User-edited numberOfFlareRings not preserved');
            }

            console.log('   ✅ Edit scenario works - all objects properly reconstructed');
        });
    }

    async testFullRenderScenario() {
        console.log('\n📋 Testing Full Render with Edited Config...\n');

        return this.test('Complete render pipeline with edited FuzzFlareEffect', async () => {
            const { default: NftProjectManager } = await import('../../src/main/implementations/NftProjectManager.js');

            // Full render config as sent by UI after user edits
            const renderConfig = {
                artistName: 'Test Artist',
                projectName: 'Edit Test',
                outputDirectory: '/tmp/test-output',
                targetResolution: 512,
                isHorizontal: false,
                numFrames: 1,
                effects: [
                    {
                        className: 'fuzz-flare',
                        config: {
                            // User-edited simple values
                            innerColor: { selectionType: 'colorBucket' },
                            outerColor: { selectionType: 'color', colorValue: '#00FFFF' },
                            numberOfFlareRings: { lower: 5, upper: 5 },
                            numberOfFlareRays: { lower: 5, upper: 5 },
                            elementPhantomGranularity: 5,
                            elementGastonGranularity: 5,

                            // Complex objects that UI might send as empty or corrupted
                            flareRingsSizeRange: {}
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

            console.log('   🎯 Testing complete render with edited config...');

            const projectManager = new NftProjectManager();
            const renderResult = await projectManager.renderFrame(0, renderConfig);

            if (!renderResult) {
                throw new Error('Render returned null');
            }

            if (!renderResult.success) {
                throw new Error(`Render failed: ${renderResult.error || 'Unknown error'}`);
            }

            if (!renderResult.frameBuffer || renderResult.frameBuffer.length === 0) {
                throw new Error('Render produced empty frame buffer');
            }

            console.log('   ✅ Full render successful!');
            console.log(`   Frame size: ${renderResult.frameBuffer.length} bytes`);
            console.log('   🎉 Edit → Render pipeline working correctly!');
        });
    }

    async runAllTests() {
        console.log('🚀 Running FuzzFlareEffect Edit Scenario Tests...\n');

        await this.testOriginalAddScenario();
        await this.testEditedConfigScenario();
        await this.testFullRenderScenario();

        console.log('\n📊 Edit Scenario Test Results:');
        console.log(`   Total: ${this.testResults.total}`);
        console.log(`   Passed: ${this.testResults.passed}`);
        console.log(`   Failed: ${this.testResults.failed}`);

        if (this.testResults.failed === 0) {
            console.log('\n🎉 ALL EDIT SCENARIO TESTS PASSED!');
            console.log('\n✨ The FuzzFlareEffect edit issue has been resolved:');
            console.log('   ✅ Initial add with defaults works');
            console.log('   ✅ User edits are properly processed');
            console.log('   ✅ Complex objects are reconstructed with methods');
            console.log('   ✅ Full render pipeline works after edit');
            console.log('\n🚀 Users can now edit FuzzFlareEffect config without errors!');
        } else {
            console.log('\n❌ Edit scenario tests failed!');
            console.log('\n🔍 This identifies the exact point where the edit scenario breaks:');

            if (this.testResults.passed === 1 && this.testResults.failed >= 1) {
                console.log('   ✅ Initial add works (backend defaults are fine)');
                console.log('   ❌ Edit processing fails (complex objects not reconstructed)');
                console.log('\n💡 Fix needed: EffectProcessingService must reconstruct PercentageRange from empty/corrupted user data');
            }
        }
    }
}

// Run the edit scenario test
const editTest = new FuzzFlareEditTest();
editTest.runAllTests().catch(error => {
    console.error('Edit scenario test failed:', error);
    process.exit(1);
});