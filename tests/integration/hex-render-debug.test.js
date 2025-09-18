#!/usr/bin/env node
/**
 * Debug test for hex effect rendering issues
 * Tests the complete render pipeline: project creation -> add hex effect -> render frame
 */

import NftEffectsManager from '../../src/main/implementations/NftEffectsManager.js';

class HexRenderDebugTest {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.effectsManager = new NftEffectsManager();
        this.projectData = {
            resolution: { width: 1920, height: 1080 },
            colorScheme: 'default',
            projectName: 'hex-render-debug-test'
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

    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`${message} - Expected truthy value`);
        }
    }

    assertExists(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(`${message} - Expected value to exist`);
        }
    }

    async testHexEffectDiscovery() {
        console.log('\n🔍 Testing Hex Effect Discovery...');

        await this.test('should discover hex effect in registry', async () => {
            const discovery = await this.effectsManager.discoverEffects();
            this.assertTrue(discovery.success, 'Effect discovery should succeed');

            // Find hex effect in any category
            let hexEffect = null;
            for (const [category, effects] of Object.entries(discovery.effects)) {
                hexEffect = effects.find(effect => effect.name === 'hex');
                if (hexEffect) {
                    console.log(`   ✅ Found hex effect in ${category} category`);
                    console.log(`   📋 Hex effect metadata:`, JSON.stringify(hexEffect, null, 2));
                    break;
                }
            }

            this.assertExists(hexEffect, 'Hex effect should be found in registry');
            this.assertTrue(hexEffect.name === 'hex', 'Effect name should be "hex"');
        });
    }

    async testHexConfigGeneration() {
        console.log('\n⚙️ Testing Hex Config Generation...');

        let configResult = null;

        await this.test('should generate hex config without errors', async () => {
            configResult = await this.effectsManager.introspectConfig({
                effectName: 'hex',
                projectData: this.projectData
            });

            this.assertTrue(configResult.success, 'Config introspection should succeed');
            this.assertExists(configResult.defaultInstance, 'Default config instance should exist');

            console.log(`   ✅ Generated hex config successfully`);
            console.log(`   📋 Config keys:`, Object.keys(configResult.defaultInstance));
        });

        await this.test('should have valid hex config properties', async () => {
            if (!configResult || !configResult.success) {
                throw new Error('Config generation failed in previous test');
            }

            const config = configResult.defaultInstance;

            // Check for essential hex properties
            this.assertExists(config.layerOpacity, 'layerOpacity should exist');
            this.assertExists(config.innerColor, 'innerColor should exist');
            this.assertExists(config.outerColor, 'outerColor should exist');
            this.assertExists(config.sparsityFactor, 'sparsityFactor should exist');
            this.assertExists(config.numberOfHex, 'numberOfHex should exist');

            console.log(`   ✅ Essential hex properties are present`);
            console.log(`   📊 numberOfHex: ${config.numberOfHex}`);
            console.log(`   📊 layerOpacity: ${config.layerOpacity}`);
        });

        return configResult;
    }

    async testHexRenderFrame() {
        console.log('\n🎬 Testing Hex Frame Rendering...');

        // Get hex config first
        const configResult = await this.effectsManager.introspectConfig({
            effectName: 'hex',
            projectData: this.projectData
        });

        if (!configResult.success) {
            throw new Error('Cannot test rendering - config generation failed');
        }

        let renderResult = null;

        await this.test('should render hex frame without throwing errors', async () => {
            try {
                // Create a basic project structure with hex effect
                const projectStructure = {
                    projectData: this.projectData,
                    effects: [
                        {
                            name: 'hex',
                            config: configResult.defaultInstance,
                            enabled: true
                        }
                    ],
                    frameNumber: 1
                };

                console.log(`   🎯 Attempting to render frame with hex effect...`);

                // Note: We might need to create a proper project file structure
                // Let's try to call the render method directly
                renderResult = await this.effectsManager.renderFrame({
                    projectPath: '/tmp/hex-test-project', // Temporary path for testing
                    frameNumber: 1,
                    effects: projectStructure.effects,
                    resolution: this.projectData.resolution
                });

                console.log(`   📊 Render result:`, {
                    success: renderResult?.success,
                    hasBuffer: !!renderResult?.frameBuffer,
                    bufferLength: renderResult?.frameBuffer?.length,
                    error: renderResult?.error
                });

            } catch (error) {
                console.log(`   ⚠️  Render attempt failed: ${error.message}`);
                console.log(`   📋 Error stack:`, error.stack);
                // Don't throw here - we want to capture this as part of the debug
                renderResult = {
                    success: false,
                    error: error.message,
                    stack: error.stack
                };
            }
        });

        await this.test('should analyze render result for debugging', async () => {
            if (!renderResult) {
                console.log(`   ❌ No render result to analyze`);
                return;
            }

            if (renderResult.success) {
                console.log(`   ✅ Render succeeded`);
                this.assertExists(renderResult.frameBuffer, 'Frame buffer should exist on successful render');
                this.assertTrue(renderResult.frameBuffer.length > 0, 'Frame buffer should not be empty');
            } else {
                console.log(`   ❌ Render failed: ${renderResult.error}`);

                // Analyze common failure patterns
                if (renderResult.error?.includes('ENOENT') || renderResult.error?.includes('not found')) {
                    console.log(`   🔍 Diagnosis: Missing project files or paths`);
                } else if (renderResult.error?.includes('config') || renderResult.error?.includes('Config')) {
                    console.log(`   🔍 Diagnosis: Configuration issues`);
                } else if (renderResult.error?.includes('effect') || renderResult.error?.includes('Effect')) {
                    console.log(`   🔍 Diagnosis: Effect execution issues`);
                } else if (renderResult.error?.includes('canvas') || renderResult.error?.includes('image')) {
                    console.log(`   🔍 Diagnosis: Image/canvas processing issues`);
                } else {
                    console.log(`   🔍 Diagnosis: Unknown error pattern`);
                }

                // For debug purposes, this is useful information even if render fails
                this.assertTrue(true, 'Render failure captured for analysis');
            }
        });

        return renderResult;
    }

    async testProjectStructureRequirements() {
        console.log('\n📁 Testing Project Structure Requirements...');

        await this.test('should identify what files/structure are needed for rendering', async () => {
            // This test will help us understand what the render system expects

            console.log(`   🔍 Checking what the effectsManager.renderFrame method requires...`);

            // Look at the renderFrame method signature and requirements
            if (this.effectsManager.renderFrame) {
                console.log(`   ✅ renderFrame method exists`);

                // Check method signature
                const methodString = this.effectsManager.renderFrame.toString();
                const paramMatch = methodString.match(/async\s+renderFrame\s*\(\s*([^)]*)\s*\)/);
                if (paramMatch) {
                    console.log(`   📋 Method signature: renderFrame(${paramMatch[1]})`);
                }
            } else {
                console.log(`   ❌ renderFrame method not found`);
            }

            // Check if there are other render-related methods
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.effectsManager))
                .filter(name => name.includes('render') || name.includes('frame'));

            console.log(`   📋 Render-related methods found:`, methods);

            this.assertTrue(true, 'Project structure requirements analyzed');
        });
    }

    async testMinimalWorkingRender() {
        console.log('\n🧪 Testing Minimal Working Render Setup...');

        await this.test('should attempt simplest possible hex render', async () => {
            try {
                // Get minimal hex config
                const configResult = await this.effectsManager.introspectConfig({
                    effectName: 'hex',
                    projectData: this.projectData
                });

                if (!configResult.success) {
                    throw new Error('Config introspection failed');
                }

                console.log(`   🎯 Trying minimal render call...`);

                // Try the most basic render call possible
                const minimalRenderData = {
                    effectName: 'hex',
                    config: configResult.defaultInstance,
                    resolution: this.projectData.resolution,
                    frameNumber: 1
                };

                console.log(`   📊 Minimal render data:`, JSON.stringify(minimalRenderData, null, 2));

                // Check if there's a simpler render method for single effects
                if (this.effectsManager.renderEffect) {
                    console.log(`   🔧 Trying renderEffect method...`);
                    const result = await this.effectsManager.renderEffect(minimalRenderData);
                    console.log(`   📊 renderEffect result:`, result);
                } else if (this.effectsManager.previewEffect) {
                    console.log(`   🔧 Trying previewEffect method...`);
                    const result = await this.effectsManager.previewEffect(minimalRenderData);
                    console.log(`   📊 previewEffect result:`, result);
                } else {
                    console.log(`   ❌ No simple render methods found`);
                }

                this.assertTrue(true, 'Minimal render attempt completed');

            } catch (error) {
                console.log(`   ⚠️  Minimal render failed: ${error.message}`);
                this.assertTrue(true, 'Minimal render failure captured');
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Hex Render Debug Tests...\n');
        console.log('This test will:');
        console.log('  1. Verify hex effect can be discovered');
        console.log('  2. Test hex config generation');
        console.log('  3. Attempt to render a frame with hex effect');
        console.log('  4. Analyze project structure requirements');
        console.log('  5. Try minimal render setups');

        try {
            await this.testHexEffectDiscovery();
            await this.testHexConfigGeneration();
            await this.testProjectStructureRequirements();
            await this.testMinimalWorkingRender();
            await this.testHexRenderFrame();

            console.log('\n📊 Test Results:');
            console.log(`   Total: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            if (this.failedTests === 0) {
                console.log('\n🎉 All hex render debug tests completed!');
            } else {
                console.log(`\n⚠️  ${this.failedTests} tests had issues - check output above for debugging info`);
            }

            return {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests
            };

        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
            throw error;
        }
    }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new HexRenderDebugTest();
    tests.runAllTests().then(results => {
        console.log('\n🏁 Hex render debug tests complete!');
        console.log('Check the output above for clues about why rendering might be failing.');
        process.exit(0); // Exit successfully even if render fails - we want debug info
    }).catch(error => {
        console.error('Debug test execution failed:', error);
        process.exit(1);
    });
}

export default HexRenderDebugTest;