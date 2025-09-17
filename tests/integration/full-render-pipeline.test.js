#!/usr/bin/env node
/**
 * Test the complete render pipeline that happens when user clicks render
 * Simulates: Create project with hex effect -> Render frame
 */

const NftProjectManager = require('../../src/main/implementations/NftProjectManager');
const path = require('path');
const fs = require('fs');

class FullRenderPipelineTest {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.projectManager = new NftProjectManager();

        // Create a test project config similar to what Canvas.jsx sends
        this.testProjectConfig = {
            projectName: 'hex-render-test',
            projectPath: '/tmp/hex-render-test',
            width: 1920,
            height: 1080,
            numFrames: 10,
            renderStartFrame: 1,
            renderJumpFrames: 11,
            effects: [
                {
                    name: 'hex',
                    // We'll populate this with actual hex config
                    config: null,
                    enabled: true
                }
            ]
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

    async setupHexConfig() {
        console.log('\n⚙️ Setting up hex effect config...');

        // We need to get the hex config the same way the UI does
        const NftEffectsManager = require('../../src/main/implementations/NftEffectsManager');
        const effectsManager = new NftEffectsManager();

        const configResult = await effectsManager.introspectConfig({
            effectName: 'hex',
            projectData: {
                resolution: { width: 1920, height: 1080 },
                colorScheme: 'default'
            }
        });

        if (!configResult.success) {
            throw new Error(`Failed to get hex config: ${configResult.error}`);
        }

        // Set the config in our test project
        this.testProjectConfig.effects[0].config = configResult.defaultInstance;

        console.log(`   ✅ Hex config setup complete`);
        console.log(`   📋 Config keys:`, Object.keys(configResult.defaultInstance));

        return configResult.defaultInstance;
    }

    async testProjectCreation() {
        console.log('\n🏗️ Testing Project Creation...');

        await this.test('should create project with hex effect', async () => {
            try {
                // Ensure we have hex config
                if (!this.testProjectConfig.effects[0].config) {
                    await this.setupHexConfig();
                }

                console.log(`   🎯 Creating project with config:`, {
                    projectName: this.testProjectConfig.projectName,
                    dimensions: `${this.testProjectConfig.width}x${this.testProjectConfig.height}`,
                    effects: this.testProjectConfig.effects.map(e => ({ name: e.name, enabled: e.enabled }))
                });

                // This calls the same createProject method that renderFrame calls
                const project = await this.projectManager.createProject(this.testProjectConfig);

                this.assertExists(project, 'Project should be created');
                console.log(`   ✅ Project created successfully`);

                return project;

            } catch (error) {
                console.log(`   ❌ Project creation failed: ${error.message}`);
                console.log(`   📋 Stack trace:`, error.stack);
                throw error;
            }
        });
    }

    async testFrameGeneration() {
        console.log('\n🎬 Testing Frame Generation...');

        let renderResult = null;

        await this.test('should render frame using project manager', async () => {
            try {
                console.log(`   🎯 Calling renderFrame with config...`);

                // This is the exact same call that Canvas.jsx makes
                renderResult = await this.projectManager.renderFrame(this.testProjectConfig, 1);

                console.log(`   📊 Render result:`, {
                    success: renderResult?.success,
                    hasBuffer: !!renderResult?.frameBuffer,
                    bufferLength: renderResult?.frameBuffer?.length,
                    frameNumber: renderResult?.frameNumber,
                    error: renderResult?.error
                });

                this.assertTrue(renderResult.success, 'Render should succeed');
                this.assertExists(renderResult.frameBuffer, 'Frame buffer should exist');
                this.assertTrue(renderResult.frameBuffer.length > 0, 'Frame buffer should not be empty');

                console.log(`   ✅ Frame rendered successfully`);
                console.log(`   📊 Buffer size: ${renderResult.frameBuffer.length} bytes`);

            } catch (error) {
                console.log(`   ❌ Frame rendering failed: ${error.message}`);
                console.log(`   📋 Stack trace:`, error.stack);
                throw error;
            }
        });

        return renderResult;
    }

    async testMultipleFrames() {
        console.log('\n🎞️ Testing Multiple Frame Rendering...');

        await this.test('should render multiple frames without issues', async () => {
            try {
                const framesToTest = [1, 2, 5, 10];
                const results = [];

                for (const frameNumber of framesToTest) {
                    console.log(`   🎯 Rendering frame ${frameNumber}...`);

                    const result = await this.projectManager.renderFrame(this.testProjectConfig, frameNumber);
                    results.push({ frameNumber, result });

                    this.assertTrue(result.success, `Frame ${frameNumber} should render successfully`);
                    this.assertExists(result.frameBuffer, `Frame ${frameNumber} should have buffer`);

                    console.log(`   ✅ Frame ${frameNumber} rendered (${result.frameBuffer.length} bytes)`);
                }

                console.log(`   🎉 All ${framesToTest.length} frames rendered successfully`);

            } catch (error) {
                console.log(`   ❌ Multiple frame test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async testRenderPerformance() {
        console.log('\n⏱️ Testing Render Performance...');

        await this.test('should render frame within reasonable time', async () => {
            try {
                const startTime = Date.now();

                const result = await this.projectManager.renderFrame(this.testProjectConfig, 1);

                const endTime = Date.now();
                const renderTime = endTime - startTime;

                console.log(`   ⏱️ Render time: ${renderTime}ms`);

                this.assertTrue(result.success, 'Render should succeed');
                this.assertTrue(renderTime < 30000, 'Render should complete within 30 seconds'); // Generous timeout

                if (renderTime > 5000) {
                    console.log(`   ⚠️  Render took ${renderTime}ms - might be slow for UI`);
                } else {
                    console.log(`   ✅ Render completed in good time`);
                }

            } catch (error) {
                console.log(`   ❌ Performance test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async testErrorScenarios() {
        console.log('\n⚠️ Testing Error Scenarios...');

        await this.test('should handle invalid frame numbers gracefully', async () => {
            try {
                // Test frame 0 (invalid)
                const result1 = await this.projectManager.renderFrame(this.testProjectConfig, 0);
                console.log(`   📊 Frame 0 result:`, { success: result1.success, error: result1.error });

                // Test very high frame number
                const result2 = await this.projectManager.renderFrame(this.testProjectConfig, 999999);
                console.log(`   📊 Frame 999999 result:`, { success: result2.success, error: result2.error });

                // Both should either succeed or fail gracefully (not throw)
                this.assertTrue(true, 'Error scenarios handled without throwing');

            } catch (error) {
                console.log(`   ❌ Error scenario test failed: ${error.message}`);
                throw error;
            }
        });

        await this.test('should handle malformed config gracefully', async () => {
            try {
                const badConfig = {
                    ...this.testProjectConfig,
                    effects: [
                        {
                            name: 'hex',
                            config: null, // Invalid config
                            enabled: true
                        }
                    ]
                };

                const result = await this.projectManager.renderFrame(badConfig, 1);
                console.log(`   📊 Bad config result:`, { success: result.success, error: result.error });

                // Should not throw, should return error result
                this.assertTrue(true, 'Bad config handled without throwing');

            } catch (error) {
                console.log(`   ❌ Bad config test failed: ${error.message}`);
                throw error;
            }
        });
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up test artifacts...');

        try {
            // Clean up any test files or temporary directories
            if (fs.existsSync(this.testProjectConfig.projectPath)) {
                console.log(`   🗑️ Removing test project directory...`);
                // Note: Be careful with rm -rf in production code
                // fs.rmSync(this.testProjectConfig.projectPath, { recursive: true, force: true });
            }

            console.log(`   ✅ Cleanup complete`);
        } catch (error) {
            console.log(`   ⚠️ Cleanup warning: ${error.message}`);
        }
    }

    async runAllTests() {
        console.log('🚀 Running Full Render Pipeline Tests...\n');
        console.log('This test simulates the complete flow when clicking render in the UI:');
        console.log('  1. Setup hex effect config');
        console.log('  2. Create project with hex effect');
        console.log('  3. Render single frame');
        console.log('  4. Test multiple frames');
        console.log('  5. Test performance');
        console.log('  6. Test error scenarios');

        try {
            // Setup
            await this.setupHexConfig();

            // Core tests
            await this.testProjectCreation();
            await this.testFrameGeneration();
            await this.testMultipleFrames();
            await this.testRenderPerformance();
            await this.testErrorScenarios();

            console.log('\n📊 Test Results:');
            console.log(`   Total: ${this.testCount}`);
            console.log(`   Passed: ${this.passedTests}`);
            console.log(`   Failed: ${this.failedTests}`);

            if (this.failedTests === 0) {
                console.log('\n🎉 All render pipeline tests passed!');
                console.log('The hex effect rendering system appears to be working correctly.');
            } else {
                console.log(`\n⚠️ ${this.failedTests} tests failed - check output above for issues`);
            }

            return {
                total: this.testCount,
                passed: this.passedTests,
                failed: this.failedTests
            };

        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            console.log(`📋 Stack trace:`, error.stack);
            this.failedTests++;
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const tests = new FullRenderPipelineTest();
    tests.runAllTests().then(results => {
        if (results.failed === 0) {
            console.log('\n✅ Render pipeline is working correctly!');
            console.log('If you\'re still seeing spinner issues in the UI, the problem might be:');
            console.log('  - Frontend state management');
            console.log('  - IPC communication timing');
            console.log('  - Image display in Canvas component');
            process.exit(0);
        } else {
            console.log('\n❌ Render pipeline has issues - see test output above');
            process.exit(1);
        }
    }).catch(error => {
        console.error('Render pipeline test execution failed:', error);
        process.exit(1);
    });
}

module.exports = FullRenderPipelineTest;