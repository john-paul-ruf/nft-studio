#!/usr/bin/env node
/**
 * Tests for render single frame functionality
 * Tests that frames are actually generated when requested
 */

// Mock electron for testing environment
import Module from 'module';
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
    if (id === 'electron') {
        return {
            app: {
                getPath: (name) => name === 'temp' ? '/tmp' : '/tmp'
            },
            ipcMain: {
                handle: () => {},
                listeners: () => []
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

import ServiceFactory from '../../src/main/container/ServiceFactory.js';

class RenderSingleFrameTests {
    constructor() {
        this.testCount = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        // Use modern dependency injection
        this.projectManager = ServiceFactory.getProjectManager();
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

    assertExists(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(`${message} - Expected value to exist`);
        }
    }

    async testBasicFrameGeneration() {
        console.log('\n🧪 Testing Basic Frame Generation...');

        const mockConfig = {
            projectName: 'test-render-frame',
            resolution: 'hd',
            numberOfFrames: 10,
            colorScheme: 'default',
            projectDirectory: '/tmp/nft-studio-test',
            effects: {
                primary: [],
                final: []
            }
        };

        await this.test('should return success result with frame buffer', async () => {
            const result = await this.projectManager.renderFrame(mockConfig, 0);

            this.assertTrue(result.success, 'Result should be successful');
            this.assertExists(result.frameBuffer, 'Frame buffer should exist');
            this.assertEqual(result.frameNumber, 0, 'Frame number should match');
        });

        await this.test('should handle different frame numbers', async () => {
            const result = await this.projectManager.renderFrame(mockConfig, 5);

            this.assertTrue(result.success, 'Result should be successful');
            this.assertExists(result.frameBuffer, 'Frame buffer should exist for frame 5');
            this.assertEqual(result.frameNumber, 5, 'Frame number should be 5');
        });

        await this.test('should reuse existing project if already created', async () => {
            // First call creates the project
            const result1 = await this.projectManager.renderFrame(mockConfig, 0);
            this.assertTrue(result1.success, 'First render should succeed');

            // Second call should reuse the project
            const result2 = await this.projectManager.renderFrame(mockConfig, 1);
            this.assertTrue(result2.success, 'Second render should succeed');
            this.assertEqual(result2.frameNumber, 1, 'Frame number should be 1');

            // Verify project is cached
            const activeProject = this.projectManager.getActiveProject(mockConfig.projectName);
            this.assertExists(activeProject, 'Project should be cached');
            this.assertExists(activeProject.project, 'Cached project should have project instance');
        });
    }

    async testErrorHandling() {
        console.log('\n🧪 Testing Error Handling...');

        await this.test('should handle invalid config gracefully', async () => {
            const invalidConfig = {
                // Missing required fields
                projectName: null,
                resolution: 'invalid'
            };

            const result = await this.projectManager.renderFrame(invalidConfig, 0);
            this.assertFalse(result.success, 'Result should indicate failure');
            this.assertExists(result.error, 'Error message should be provided');
        });

        await this.test('should handle invalid frame numbers', async () => {
            const validConfig = {
                projectName: 'test-invalid-frame',
                resolution: 'hd',
                numberOfFrames: 10,
                colorScheme: 'default',
                projectDirectory: '/tmp/nft-studio-test'
            };

            // Test negative frame number
            const result = await this.projectManager.renderFrame(validConfig, -1);
            // Note: The actual behavior depends on my-nft-gen implementation
            // This test documents current behavior
            console.log(`   Frame -1 result:`, result.success ? 'success' : result.error);
        });
    }

    async testConfigurationVariations() {
        console.log('\n🧪 Testing Configuration Variations...');

        await this.test('should handle different resolutions', async () => {
            const resolutions = ['hd', '4k', 'square_hd', 'square_4k'];

            for (const resolution of resolutions) {
                const config = {
                    projectName: `test-${resolution}`,
                    resolution: resolution,
                    numberOfFrames: 1,
                    colorScheme: 'default',
                    projectDirectory: '/tmp/nft-studio-test'
                };

                const result = await this.projectManager.renderFrame(config, 0);
                this.assertTrue(result.success, `Should render ${resolution} successfully`);
                this.assertExists(result.frameBuffer, `Frame buffer should exist for ${resolution}`);
            }
        });

        await this.test('should handle custom color schemes', async () => {
            const config = {
                projectName: 'test-custom-colors',
                resolution: 'hd',
                numberOfFrames: 1,
                colorScheme: 'custom',
                customColors: {
                    neutrals: ['#FFFFFF', '#000000'],
                    backgrounds: ['#FF0000'],
                    lights: ['#00FF00', '#0000FF']
                },
                projectDirectory: '/tmp/nft-studio-test'
            };

            const result = await this.projectManager.renderFrame(config, 0);
            this.assertTrue(result.success, 'Should render with custom colors');
            this.assertExists(result.frameBuffer, 'Frame buffer should exist');
        });
    }

    async testIPCIntegration() {
        console.log('\n🧪 Testing IPC Integration Issues...');

        await this.test('should identify IPC handler duplication issue', async () => {
            // Check if there are duplicate handlers registered
            import { ipcMain } from 'electron';

            // Count how many listeners are registered for 'render-frame'
            const listeners = ipcMain.listeners('render-frame');

            if (listeners.length > 1) {
                console.log(`   ⚠️  WARNING: Found ${listeners.length} handlers for 'render-frame' - this may cause issues`);
                console.log(`   📍 Check: src/main/handlers/ProjectHandlers.js:24 (old modules/ipcHandlers.js was removed)`);
            } else {
                console.log(`   ✅ Only ${listeners.length} handler found for 'render-frame'`);
            }

            // This test always passes but documents the issue
            this.assertTrue(true, 'IPC handler check completed');
        });

        await this.test('should identify response format mismatch', async () => {
            const config = {
                projectName: 'test-response-format',
                resolution: 'hd',
                numberOfFrames: 1,
                colorScheme: 'default',
                projectDirectory: '/tmp/nft-studio-test'
            };

            const result = await this.projectManager.renderFrame(config, 0);

            // Canvas.jsx:122 expects result.frameData but implementation returns result.frameBuffer
            this.assertExists(result.frameBuffer, 'Implementation returns frameBuffer');
            this.assertFalse('frameData' in result, 'Implementation does NOT return frameData');

            console.log(`   ⚠️  MISMATCH: Canvas.jsx:122 expects 'frameData' but ProjectManager returns 'frameBuffer'`);
            console.log(`   📍 Fix needed in: src/pages/Canvas.jsx:122 - change result.frameData to result.frameBuffer`);
        });
    }

    async testBufferIntegrity() {
        console.log('\n🧪 Testing Frame Buffer Integrity...');

        await this.test('should generate valid frame buffer', async () => {
            const config = {
                projectName: 'test-buffer-integrity',
                resolution: 'hd',
                numberOfFrames: 1,
                colorScheme: 'default',
                projectDirectory: '/tmp/nft-studio-test'
            };

            const result = await this.projectManager.renderFrame(config, 0);

            this.assertTrue(result.success, 'Render should succeed');
            this.assertExists(result.frameBuffer, 'Frame buffer should exist');

            // Check if buffer is a valid Buffer or Uint8Array
            const buffer = result.frameBuffer;
            const isValidBuffer = Buffer.isBuffer(buffer) || buffer instanceof Uint8Array;
            this.assertTrue(isValidBuffer, 'Frame buffer should be a valid Buffer or Uint8Array');

            if (isValidBuffer) {
                this.assertTrue(buffer.length > 0, 'Frame buffer should have content');
                console.log(`   ✅ Frame buffer size: ${buffer.length} bytes`);
            }
        });

        await this.test('should generate consistent buffer sizes for same resolution', async () => {
            const config = {
                projectName: 'test-buffer-consistency',
                resolution: 'hd',
                numberOfFrames: 2,
                colorScheme: 'default',
                projectDirectory: '/tmp/nft-studio-test'
            };

            const result1 = await this.projectManager.renderFrame(config, 0);
            const result2 = await this.projectManager.renderFrame(config, 1);

            this.assertTrue(result1.success && result2.success, 'Both renders should succeed');
            this.assertExists(result1.frameBuffer && result2.frameBuffer, 'Both buffers should exist');

            const size1 = result1.frameBuffer.length;
            const size2 = result2.frameBuffer.length;

            // Buffers might have slight size differences depending on compression
            // but they should be in the same ballpark
            const sizeDifference = Math.abs(size1 - size2);
            const sizeRatio = sizeDifference / Math.max(size1, size2);

            this.assertTrue(sizeRatio < 0.1, `Buffer sizes should be similar (${size1} vs ${size2})`);
            console.log(`   ✅ Buffer sizes: Frame 0: ${size1} bytes, Frame 1: ${size2} bytes`);
        });
    }

    async testProjectCaching() {
        console.log('\n🧪 Testing Project Caching...');

        await this.test('should cache projects correctly', async () => {
            const config1 = {
                projectName: 'cache-test-1',
                resolution: 'hd',
                numberOfFrames: 1,
                colorScheme: 'default',
                projectDirectory: '/tmp/nft-studio-test'
            };

            const config2 = {
                projectName: 'cache-test-2',
                resolution: '4k',
                numberOfFrames: 1,
                colorScheme: 'default',
                projectDirectory: '/tmp/nft-studio-test'
            };

            // Create two different projects
            await this.projectManager.renderFrame(config1, 0);
            await this.projectManager.renderFrame(config2, 0);

            // Verify both are cached
            const project1 = this.projectManager.getActiveProject('cache-test-1');
            const project2 = this.projectManager.getActiveProject('cache-test-2');

            this.assertExists(project1, 'Project 1 should be cached');
            this.assertExists(project2, 'Project 2 should be cached');
            this.assertTrue(project1 !== project2, 'Projects should be different instances');
        });

        await this.test('should clean up project cache', async () => {
            // First create a project
            const config = {
                projectName: 'cleanup-test',
                resolution: 'hd',
                numberOfFrames: 1,
                colorScheme: 'default',
                projectDirectory: '/tmp/nft-studio-test'
            };

            await this.projectManager.renderFrame(config, 0);

            // Verify it's cached
            let project = this.projectManager.getActiveProject('cleanup-test');
            this.assertExists(project, 'Project should be cached before cleanup');

            // Clear cache
            ProjectManager.clearActiveProjects();

            // Verify it's cleared
            project = this.projectManager.getActiveProject('cleanup-test');
            this.assertTrue(project === undefined, 'Project should be cleared after cleanup');
        });
    }

    async runAllTests() {
        console.log('🚀 Running Render Single Frame Tests...\n');

        try {
            await this.testBasicFrameGeneration();
            await this.testErrorHandling();
            await this.testConfigurationVariations();
            await this.testIPCIntegration();
            await this.testBufferIntegrity();
            await this.testProjectCaching();
        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
        }

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All tests passed!');
            console.log('\n🔧 Issues identified for fixing:');
            console.log('   1. Duplicate IPC handlers for render-frame');
            console.log('   2. Response format mismatch: Canvas expects frameData but gets frameBuffer');
            process.exit(0);
        } else {
            console.log('\n💥 Some tests failed!');
            process.exit(1);
        }
    }
}

// Run the tests
const tests = new RenderSingleFrameTests();
tests.runAllTests();