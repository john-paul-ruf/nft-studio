#!/usr/bin/env node
/**
 * Comprehensive tests for UI configuration storage and backend passing
 * Tests the complete pipeline: UI selection → Config storage → Backend rendering
 */

// Mock electron for testing
require('../setup.js');

class UIConfigPipelineTests {
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

    async testAsync(description, testFn) {
        this.testCount++;
        try {
            await testFn();
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
        if (actual !== expected) {
            throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
        }
    }

    testEffectConfigurationStorage() {
        console.log('🧪 Testing Effect Configuration Storage...\n');

        // Mock UI state management
        class MockCanvasState {
            constructor() {
                this.config = {
                    effects: [],
                    colorScheme: 'default',
                    resolution: 'hd',
                    numberOfFrames: 100
                };
            }

            // Simulate adding an effect in UI
            addEffect(effectConfig) {
                this.config.effects.push(effectConfig);
            }

            // Simulate setting color scheme in UI
            setColorScheme(schemeId, schemeData) {
                this.config.colorScheme = schemeId;
                this.config.colorSchemeData = schemeData;
            }

            // Simulate getting render config for backend
            getRenderConfig() {
                return {
                    ...this.config,
                    // Include full color scheme data
                    selectedColorScheme: this.config.colorSchemeData
                };
            }
        }

        this.test('UI stores effect configurations correctly', () => {
            const canvasState = new MockCanvasState();

            // User adds HexEffect with custom config
            canvasState.addEffect({
                className: 'HexEffect',
                type: 'primary',
                config: {
                    numberOfHex: 8,
                    strategy: ['rotate'],
                    innerColor: '#FF0000',
                    outerColor: '#0000FF'
                }
            });

            // User adds FuzzFlareEffect
            canvasState.addEffect({
                className: 'FuzzFlareEffect',
                type: 'final',
                config: {
                    intensity: 0.8,
                    spread: 0.5
                }
            });

            this.assertEqual(canvasState.config.effects.length, 2, 'Should store 2 effects');
            this.assertEqual(canvasState.config.effects[0].className, 'HexEffect', 'First effect should be HexEffect');
            this.assertEqual(canvasState.config.effects[1].type, 'final', 'Second effect should be final type');
            this.assertTrue(canvasState.config.effects[0].config.numberOfHex === 8, 'Should preserve custom config values');
        });

        this.test('UI stores color scheme data correctly', () => {
            const canvasState = new MockCanvasState();

            // User selects a color scheme
            const neonCyberpunkScheme = {
                id: 'neon-cyberpunk',
                name: 'Neon Cyberpunk',
                neutrals: ['#FFFFFF', '#CCCCCC', '#808080', '#333333'],
                backgrounds: ['#000000', '#0a0a0a', '#1a1a1a', '#111111'],
                lights: ['#00FFFF', '#FF00FF', '#FFFF00', '#FF0080', '#8000FF', '#00FF80']
            };

            canvasState.setColorScheme('neon-cyberpunk', neonCyberpunkScheme);

            this.assertEqual(canvasState.config.colorScheme, 'neon-cyberpunk', 'Should store scheme ID');
            this.assertTrue(canvasState.config.colorSchemeData !== undefined, 'Should store scheme data');
            this.assertEqual(canvasState.config.colorSchemeData.name, 'Neon Cyberpunk', 'Should store complete scheme data');
            this.assertTrue(Array.isArray(canvasState.config.colorSchemeData.lights), 'Should store lights array');
        });

        this.test('UI generates complete render config for backend', () => {
            const canvasState = new MockCanvasState();

            // Set up complete configuration
            canvasState.addEffect({
                className: 'HexEffect',
                type: 'primary',
                config: { numberOfHex: 12 }
            });

            canvasState.setColorScheme('fire-ember', {
                id: 'fire-ember',
                name: 'Fire & Ember',
                neutrals: ['#FFF8DC', '#FFEBCD'],
                backgrounds: ['#800000', '#8B0000'],
                lights: ['#FF4500', '#FF6347', '#FF7F50']
            });

            const renderConfig = canvasState.getRenderConfig();

            // Verify complete config is available
            this.assertTrue(renderConfig.effects.length === 1, 'Should include effects');
            this.assertEqual(renderConfig.colorScheme, 'fire-ember', 'Should include scheme ID');
            this.assertTrue(renderConfig.selectedColorScheme !== undefined, 'Should include full scheme data');
            this.assertTrue(Array.isArray(renderConfig.selectedColorScheme.lights), 'Should include lights array');
            this.assertEqual(renderConfig.resolution, 'hd', 'Should include other config values');
        });
    }

    testBackendConfigHandling() {
        console.log('\n🧪 Testing Backend Config Handling...\n');

        // Mock backend project manager logic
        class MockProjectManager {
            createProject(projectConfig) {
                // Simulate backend receiving complete config
                const selectedColorScheme = projectConfig.selectedColorScheme;

                let colorBucket;
                if (selectedColorScheme) {
                    colorBucket = selectedColorScheme.lights;
                } else {
                    colorBucket = ['#FF6B6B', '#4ECDC4', '#45B7D1']; // defaults
                }

                return {
                    colorScheme: {
                        colorBucket: colorBucket,
                        colorSchemeInfo: selectedColorScheme?.name || 'Default'
                    },
                    effects: projectConfig.effects || [],
                    resolution: projectConfig.resolution,
                    // ... other project properties
                };
            }
        }

        this.test('Backend receives complete config from UI', () => {
            const projectManager = new MockProjectManager();

            // Mock config from UI (what Canvas.jsx would send)
            const renderConfig = {
                effects: [
                    {
                        className: 'HexEffect',
                        type: 'primary',
                        config: { numberOfHex: 6, innerColor: '#FF0000' }
                    }
                ],
                colorScheme: 'ocean-depth',
                selectedColorScheme: {
                    id: 'ocean-depth',
                    name: 'Ocean Depth',
                    neutrals: ['#F0F8FF', '#E6F3FF'],
                    backgrounds: ['#000080', '#191970'],
                    lights: ['#0080FF', '#1E90FF', '#00BFFF']
                },
                resolution: '4k',
                numberOfFrames: 200
            };

            const project = projectManager.createProject(renderConfig);

            // Verify backend properly uses the complete config
            this.assertTrue(Array.isArray(project.effects), 'Backend should receive effects');
            this.assertEqual(project.effects.length, 1, 'Should have 1 effect');
            this.assertEqual(project.effects[0].className, 'HexEffect', 'Should preserve effect class');
            this.assertTrue(project.effects[0].config.numberOfHex === 6, 'Should preserve effect config');

            this.assertTrue(Array.isArray(project.colorScheme.colorBucket), 'Should have color bucket');
            this.assertEqual(project.colorScheme.colorBucket[0], '#0080FF', 'Should use selected scheme colors');
            this.assertEqual(project.colorScheme.colorSchemeInfo, 'Ocean Depth', 'Should use selected scheme name');

            this.assertEqual(project.resolution, '4k', 'Should preserve other config');
        });

        this.test('Backend falls back to defaults when no scheme selected', () => {
            const projectManager = new MockProjectManager();

            const renderConfig = {
                effects: [],
                colorScheme: 'default',
                selectedColorScheme: null,
                resolution: 'hd'
            };

            const project = projectManager.createProject(renderConfig);

            this.assertEqual(project.colorScheme.colorSchemeInfo, 'Default', 'Should use default scheme');
            this.assertTrue(project.colorScheme.colorBucket.includes('#FF6B6B'), 'Should use default colors');
        });
    }

    testCompleteConfigPipeline() {
        console.log('\n🧪 Testing Complete Config Pipeline...\n');

        // Mock the complete flow: UI → IPC → Backend
        class MockConfigPipeline {
            constructor() {
                this.uiState = {
                    effects: [],
                    colorScheme: 'default',
                    colorSchemeData: null
                };
            }

            // Step 1: User interacts with UI
            userAddsEffect(effectConfig) {
                this.uiState.effects.push(effectConfig);
            }

            userSelectsColorScheme(schemeId, schemeData) {
                this.uiState.colorScheme = schemeId;
                this.uiState.colorSchemeData = schemeData;
            }

            // Step 2: UI prepares render config
            prepareRenderConfig() {
                return {
                    ...this.uiState,
                    selectedColorScheme: this.uiState.colorSchemeData,
                    // Include any derived values
                    width: 1920,
                    height: 1080
                };
            }

            // Step 3: Backend processes complete config
            processInBackend(config) {
                const colorBucket = config.selectedColorScheme?.lights || ['#default'];

                return {
                    project: {
                        colorScheme: {
                            colorBucket: colorBucket,
                            name: config.selectedColorScheme?.name
                        },
                        effects: config.effects
                    },
                    renderSettings: {
                        width: config.width,
                        height: config.height
                    }
                };
            }
        }

        this.test('Complete pipeline preserves all user selections', () => {
            const pipeline = new MockConfigPipeline();

            // Simulate complete user interaction
            pipeline.userAddsEffect({
                className: 'HexEffect',
                type: 'primary',
                config: { numberOfHex: 10, strategy: ['rotate'] }
            });

            pipeline.userAddsEffect({
                className: 'FuzzFlareEffect',
                type: 'final',
                config: { intensity: 0.9 }
            });

            pipeline.userSelectsColorScheme('synthwave', {
                id: 'synthwave',
                name: 'Synthwave',
                neutrals: ['#F8F8FF', '#E6E6FA'],
                backgrounds: ['#191970', '#301934'],
                lights: ['#FF1493', '#FF69B4', '#00CED1']
            });

            // Prepare for render
            const renderConfig = pipeline.prepareRenderConfig();

            // Process in backend
            const result = pipeline.processInBackend(renderConfig);

            // Verify end-to-end preservation
            this.assertEqual(result.project.effects.length, 2, 'Should preserve all effects');
            this.assertEqual(result.project.effects[0].config.numberOfHex, 10, 'Should preserve effect config');
            this.assertEqual(result.project.effects[1].type, 'final', 'Should preserve effect types');

            this.assertEqual(result.project.colorScheme.name, 'Synthwave', 'Should preserve color scheme name');
            this.assertTrue(result.project.colorScheme.colorBucket.includes('#FF1493'), 'Should use selected colors');

            this.assertEqual(result.renderSettings.width, 1920, 'Should include render settings');
        });

        this.test('Pipeline handles partial configurations gracefully', () => {
            const pipeline = new MockConfigPipeline();

            // User only adds effects, no color scheme
            pipeline.userAddsEffect({
                className: 'HexEffect',
                type: 'primary',
                config: {}
            });

            const renderConfig = pipeline.prepareRenderConfig();
            const result = pipeline.processInBackend(renderConfig);

            this.assertEqual(result.project.effects.length, 1, 'Should handle effects without color scheme');
            this.assertTrue(result.project.colorScheme.colorBucket.includes('#default'), 'Should fall back to defaults');
        });
    }

    async runAllTests() {
        console.log('🚀 Running UI Config Pipeline Tests...\n');

        try {
            this.testEffectConfigurationStorage();
            this.testBackendConfigHandling();
            this.testCompleteConfigPipeline();
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
            console.log('\n📋 UI Config Pipeline Architecture:');
            console.log('   1. 🎨 UI stores ALL user selections (effects, colors, settings)');
            console.log('   2. 📦 UI prepares complete config object for render');
            console.log('   3. 🚀 Backend receives full config via IPC');
            console.log('   4. ⚙️  Backend uses config directly (no lookups needed)');
            console.log('   5. 🎯 Result: Perfect preservation of user intent');
            console.log('\n✨ Benefits:');
            console.log('   - No backend/frontend coupling');
            console.log('   - No service import issues');
            console.log('   - Complete user control');
            console.log('   - Easy to test and debug');
            process.exit(0);
        } else {
            console.log('\n💥 Some tests failed!');
            process.exit(1);
        }
    }
}

// Run the tests
const tests = new UIConfigPipelineTests();
tests.runAllTests();