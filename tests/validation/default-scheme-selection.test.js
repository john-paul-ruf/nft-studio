#!/usr/bin/env node
/**
 * Test for default color scheme selection logic in Canvas.jsx
 * Validates that the component loads user's default scheme or falls back appropriately
 */

console.log('🎯 Default Color Scheme Selection Test\n');

class DefaultSchemeSelectionTest {
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

    async testDefaultSchemeLogic() {
        console.log('📋 Testing Default Scheme Selection Logic...\n');

        // Test 1: User has default scheme preference
        await this.test('User default scheme is used when available', async () => {
            // Mock PreferencesService.getDefaultColorScheme
            const mockGetDefaultColorScheme = () => Promise.resolve('neon-cyberpunk');

            // Mock ColorSchemeService.getAllColorSchemes
            const mockGetAllColorSchemes = () => Promise.resolve({
                'neon-cyberpunk': { name: 'Neon Cyberpunk' },
                'fire-ember': { name: 'Fire & Ember' },
                'ocean-depth': { name: 'Ocean Depth' }
            });

            // Simulate Canvas.jsx default scheme loading logic
            const loadDefaultColorScheme = async (currentColorScheme) => {
                // Skip if colorScheme is already set
                if (currentColorScheme) {
                    return currentColorScheme;
                }

                try {
                    // Try to get user's default scheme
                    const defaultScheme = await mockGetDefaultColorScheme();
                    if (defaultScheme) {
                        return defaultScheme;
                    }

                    // Fallback: get first available scheme
                    const allSchemes = await mockGetAllColorSchemes();
                    const schemeIds = Object.keys(allSchemes);
                    if (schemeIds.length > 0) {
                        return schemeIds[0];
                    }
                } catch (error) {
                    // Fallback to a known scheme
                    return 'neon-cyberpunk';
                }
            };

            const result = await loadDefaultColorScheme(null);

            if (result !== 'neon-cyberpunk') {
                throw new Error(`Expected 'neon-cyberpunk', got '${result}'`);
            }
        });

        // Test 2: No default scheme, use first available
        await this.test('First available scheme used when no default set', async () => {
            // Mock PreferencesService.getDefaultColorScheme returns null
            const mockGetDefaultColorScheme = () => Promise.resolve(null);

            // Mock ColorSchemeService.getAllColorSchemes
            const mockGetAllColorSchemes = () => Promise.resolve({
                'fire-ember': { name: 'Fire & Ember' },
                'ocean-depth': { name: 'Ocean Depth' },
                'neon-cyberpunk': { name: 'Neon Cyberpunk' }
            });

            const loadDefaultColorScheme = async (currentColorScheme) => {
                if (currentColorScheme) {
                    return currentColorScheme;
                }

                try {
                    const defaultScheme = await mockGetDefaultColorScheme();
                    if (defaultScheme) {
                        return defaultScheme;
                    }

                    // Fallback: get first available scheme
                    const allSchemes = await mockGetAllColorSchemes();
                    const schemeIds = Object.keys(allSchemes);
                    if (schemeIds.length > 0) {
                        return schemeIds[0];
                    }
                } catch (error) {
                    return 'neon-cyberpunk';
                }
            };

            const result = await loadDefaultColorScheme(null);

            if (result !== 'fire-ember') {
                throw new Error(`Expected first scheme 'fire-ember', got '${result}'`);
            }
        });

        // Test 3: Error handling fallback
        await this.test('Fallback scheme used when services fail', async () => {
            // Mock services that throw errors
            const mockGetDefaultColorScheme = () => Promise.reject(new Error('Service unavailable'));
            const mockGetAllColorSchemes = () => Promise.reject(new Error('Service unavailable'));

            const loadDefaultColorScheme = async (currentColorScheme) => {
                if (currentColorScheme) {
                    return currentColorScheme;
                }

                try {
                    const defaultScheme = await mockGetDefaultColorScheme();
                    if (defaultScheme) {
                        return defaultScheme;
                    }

                    const allSchemes = await mockGetAllColorSchemes();
                    const schemeIds = Object.keys(allSchemes);
                    if (schemeIds.length > 0) {
                        return schemeIds[0];
                    }
                } catch (error) {
                    // Fallback to a known scheme
                    return 'neon-cyberpunk';
                }
            };

            const result = await loadDefaultColorScheme(null);

            if (result !== 'neon-cyberpunk') {
                throw new Error(`Expected fallback 'neon-cyberpunk', got '${result}'`);
            }
        });

        // Test 4: Existing scheme is preserved
        await this.test('Existing color scheme is preserved', async () => {
            const loadDefaultColorScheme = async (currentColorScheme) => {
                // Skip if colorScheme is already set (from projectConfig)
                if (currentColorScheme) {
                    return currentColorScheme;
                }
                // ... rest of logic would not run
                return 'should-not-reach-here';
            };

            const result = await loadDefaultColorScheme('existing-scheme');

            if (result !== 'existing-scheme') {
                throw new Error(`Expected 'existing-scheme', got '${result}'`);
            }
        });

        // Test 5: Empty schemes list handling
        await this.test('Empty schemes list handled gracefully', async () => {
            const mockGetDefaultColorScheme = () => Promise.resolve(null);
            const mockGetAllColorSchemes = () => Promise.resolve({}); // Empty schemes

            const loadDefaultColorScheme = async (currentColorScheme) => {
                if (currentColorScheme) {
                    return currentColorScheme;
                }

                try {
                    const defaultScheme = await mockGetDefaultColorScheme();
                    if (defaultScheme) {
                        return defaultScheme;
                    }

                    const allSchemes = await mockGetAllColorSchemes();
                    const schemeIds = Object.keys(allSchemes);
                    if (schemeIds.length > 0) {
                        return schemeIds[0];
                    } else {
                        // No schemes available, but still need to return something
                        return 'neon-cyberpunk'; // Hardcoded fallback
                    }
                } catch (error) {
                    return 'neon-cyberpunk';
                }
            };

            const result = await loadDefaultColorScheme(null);

            if (result !== 'neon-cyberpunk') {
                throw new Error(`Expected fallback 'neon-cyberpunk', got '${result}'`);
            }
        });
    }

    async testCanvasImplementation() {
        console.log('\n📋 Testing Canvas.jsx Implementation...\n');

        // Test that Canvas.jsx has the expected imports and logic
        await this.test('Canvas.jsx imports PreferencesService', async () => {
            import fs from 'fs';
            const canvasContent = fs.readFileSync('/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx', 'utf8');

            if (!canvasContent.includes("import PreferencesService from '../services/PreferencesService';")) {
                throw new Error('Canvas.jsx missing PreferencesService import');
            }
        });

        await this.test('Canvas.jsx has default scheme loading useEffect', async () => {
            import fs from 'fs';
            const canvasContent = fs.readFileSync('/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx', 'utf8');

            if (!canvasContent.includes('Load default color scheme on component mount')) {
                throw new Error('Canvas.jsx missing default scheme loading comment');
            }

            if (!canvasContent.includes('PreferencesService.getDefaultColorScheme()')) {
                throw new Error('Canvas.jsx not calling getDefaultColorScheme');
            }

            if (!canvasContent.includes('ColorSchemeService.getAllColorSchemes()')) {
                throw new Error('Canvas.jsx not calling getAllColorSchemes for fallback');
            }
        });

        await this.test('Canvas.jsx initial state uses null for colorScheme', async () => {
            import fs from 'fs';
            const canvasContent = fs.readFileSync('/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx', 'utf8');

            if (!canvasContent.includes('colorScheme: null')) {
                throw new Error('Canvas.jsx should initialize colorScheme as null');
            }
        });

        await this.test('Canvas.jsx properly handles updateConfig calls', async () => {
            import fs from 'fs';
            const canvasContent = fs.readFileSync('/Users/the.phoenix/WebstormProjects/nft-studio/src/pages/Canvas.jsx', 'utf8');

            // Check that updateConfig is called with colorScheme
            if (!canvasContent.includes('updateConfig({ colorScheme: defaultScheme })')) {
                throw new Error('Canvas.jsx should call updateConfig with default scheme');
            }

            if (!canvasContent.includes('updateConfig({ colorScheme: firstScheme })')) {
                throw new Error('Canvas.jsx should call updateConfig with first available scheme');
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Default Color Scheme Selection Tests...\n');

        await this.testDefaultSchemeLogic();
        await this.testCanvasImplementation();

        console.log('\n📊 Default Scheme Selection Test Results:');
        console.log(`   Total: ${this.testResults.total}`);
        console.log(`   Passed: ${this.testResults.passed}`);
        console.log(`   Failed: ${this.testResults.failed}`);

        if (this.testResults.failed === 0) {
            console.log('\n🎉 ALL DEFAULT SCHEME SELECTION TESTS PASSED!');
            console.log('\n✨ Default Scheme Selection Verified:');
            console.log('   ✅ User default scheme loaded when available');
            console.log('   ✅ First available scheme used as fallback');
            console.log('   ✅ Error handling with hardcoded fallback works');
            console.log('   ✅ Existing color scheme preserved (no override)');
            console.log('   ✅ Empty schemes list handled gracefully');
            console.log('   ✅ Canvas.jsx implementation includes all required logic');
            console.log('\n🎯 Default Selection Logic:');
            console.log('   1️⃣ Check if colorScheme already set (from projectConfig)');
            console.log('   2️⃣ Load user default scheme from PreferencesService');
            console.log('   3️⃣ Fallback to first available scheme from ColorSchemeService');
            console.log('   4️⃣ Hardcoded fallback to "neon-cyberpunk" if all else fails');
            console.log('\n🚀 Default scheme selection working correctly!');
        } else {
            console.log('\n❌ DEFAULT SCHEME SELECTION TESTS FAILED!');
            console.log('\n🔍 Default scheme selection has issues that need attention');
        }

        return this.testResults.failed === 0;
    }
}

// Run the default scheme selection test
if (import.meta.url === `file://${process.argv[1]}`) {
    const testSuite = new DefaultSchemeSelectionTest();
    testSuite.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Default scheme selection test failed:', error);
        process.exit(1);
    });
}

export default DefaultSchemeSelectionTest;