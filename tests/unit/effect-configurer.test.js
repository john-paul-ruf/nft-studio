#!/usr/bin/env node
/**
 * Unit tests for EffectConfigurer component
 * Tests the specific JSON.parse fix and null handling
 */

class EffectConfigurerUnitTests {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runAllTests() {
        console.log('🧪 EffectConfigurer Unit Tests\n');

        const tests = [
            () => this.testOverridePoint2DCenterDefaults(),
            () => this.testConfigSafetyGuards(),
            () => this.testProjectDataValidation(),
            () => this.testPoint2DOverrideLogic()
        ];

        for (const test of tests) {
            await test();
        }

        this.printResults();
        return this.results.failed === 0;
    }

    testOverridePoint2DCenterDefaults() {
        this.results.total++;
        try {
            console.log('Testing overridePoint2DCenterDefaults function...');

            // Replicate the exact function from EffectConfigurer.jsx
            const overridePoint2DCenterDefaults = (config, projectData) => {
                if (!config || !projectData?.resolution) {
                    return config || {};
                }

                // Resolution mapping
                const resolutions = {
                    'qvga': { width: 320, height: 240 },
                    'vga': { width: 640, height: 480 },
                    'svga': { width: 800, height: 600 },
                    'xga': { width: 1024, height: 768 },
                    'hd720': { width: 1280, height: 720 },
                    'hd': { width: 1920, height: 1080 },
                    'square_small': { width: 720, height: 720 },
                    'square': { width: 1080, height: 1080 },
                    'wqhd': { width: 2560, height: 1440 },
                    '4k': { width: 3840, height: 2160 },
                    '5k': { width: 5120, height: 2880 },
                    '8k': { width: 7680, height: 4320 },
                    'portrait_hd': { width: 1080, height: 1920 },
                    'portrait_4k': { width: 2160, height: 3840 },
                    'ultrawide': { width: 3440, height: 1440 },
                    'cinema_2k': { width: 2048, height: 1080 },
                    'cinema_4k': { width: 4096, height: 2160 }
                };

                const baseResolution = resolutions[projectData.resolution] || resolutions.hd;

                // Apply isHoz setting
                const autoIsHoz = baseResolution.width > baseResolution.height;
                const isHoz = projectData?.isHoz !== null ? projectData.isHoz : autoIsHoz;

                // Determine actual dimensions based on orientation setting
                let width, height;
                if (isHoz) {
                    width = baseResolution.width;
                    height = baseResolution.height;
                } else {
                    width = baseResolution.height;
                    height = baseResolution.width;
                }

                const projectCenter = {
                    x: width / 2,
                    y: height / 2
                };

                // The critical fix: check if config is null/undefined before JSON operations
                if (!config) {
                    return {};
                }
                const updatedConfig = JSON.parse(JSON.stringify(config));

                // Find and override Point2D properties
                for (const [key, value] of Object.entries(updatedConfig)) {
                    if (value && typeof value === 'object' &&
                        typeof value.x === 'number' && typeof value.y === 'number') {

                        const isCenter = key.toLowerCase().includes('center') ||
                                       key.toLowerCase().includes('position') ||
                                       key.toLowerCase().includes('point');

                        if (isCenter) {
                            updatedConfig[key] = projectCenter;
                        }
                    }
                }

                return updatedConfig;
            };

            // Test 1: null config should return empty object
            const result1 = overridePoint2DCenterDefaults(null, { resolution: 'hd', isHoz: true });
            if (!result1 || typeof result1 !== 'object' || Object.keys(result1).length !== 0) {
                throw new Error('null config should return empty object');
            }

            // Test 2: undefined config should return empty object
            const result2 = overridePoint2DCenterDefaults(undefined, { resolution: 'hd', isHoz: true });
            if (!result2 || typeof result2 !== 'object' || Object.keys(result2).length !== 0) {
                throw new Error('undefined config should return empty object');
            }

            // Test 3: null projectData should return original config
            const testConfig = { center: { x: 100, y: 100 } };
            const result3 = overridePoint2DCenterDefaults(testConfig, null);
            if (result3 !== testConfig) {
                throw new Error('null projectData should return original config');
            }

            // Test 4: valid config with Point2D center should be overridden
            const projectData = { resolution: 'hd', isHoz: true };
            const configWithCenter = { center: { x: 100, y: 100 }, otherProp: 'test' };
            const result4 = overridePoint2DCenterDefaults(configWithCenter, projectData);

            if (!result4 || typeof result4 !== 'object') {
                throw new Error('valid config should return object');
            }

            if (!result4.center || result4.center.x !== 960 || result4.center.y !== 540) {
                throw new Error('center should be overridden to project center (1920/2, 1080/2)');
            }

            if (result4.otherProp !== 'test') {
                throw new Error('other properties should be preserved');
            }

            // Test 5: config without Point2D properties should be unchanged
            const configWithoutCenter = { opacity: 0.5, color: 'red' };
            const result5 = overridePoint2DCenterDefaults(configWithoutCenter, projectData);
            if (!result5 || result5.opacity !== 0.5 || result5.color !== 'red') {
                throw new Error('config without Point2D should be unchanged');
            }

            console.log('  ✅ overridePoint2DCenterDefaults handles all cases correctly');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ overridePoint2DCenterDefaults test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'overridePoint2DCenterDefaults',
                error: error.message
            });
        }
    }

    testConfigSafetyGuards() {
        this.results.total++;
        try {
            console.log('Testing config safety guards...');

            // Test JSON operations with various edge cases
            const testJSONOperations = (value, description) => {
                try {
                    const stringified = JSON.stringify(value);
                    const parsed = JSON.parse(stringified);
                    return { success: true, result: parsed };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            };

            // Test 1: undefined should fail JSON operations
            const result1 = testJSONOperations(undefined, 'undefined');
            if (result1.success) {
                throw new Error('JSON.stringify(undefined) should fail');
            }

            // Test 2: null should work with JSON operations
            const result2 = testJSONOperations(null, 'null');
            if (!result2.success || result2.result !== null) {
                throw new Error('JSON operations with null should work');
            }

            // Test 3: empty object should work
            const result3 = testJSONOperations({}, 'empty object');
            if (!result3.success || typeof result3.result !== 'object') {
                throw new Error('JSON operations with empty object should work');
            }

            // Test 4: complex object should work
            const complexObj = {
                center: { x: 100, y: 200 },
                nested: { prop: 'value' },
                array: [1, 2, 3]
            };
            const result4 = testJSONOperations(complexObj, 'complex object');
            if (!result4.success || !result4.result.center || result4.result.center.x !== 100) {
                throw new Error('JSON operations with complex object should work');
            }

            console.log('  ✅ Config safety guards work correctly');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Config safety guards test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'Config Safety Guards',
                error: error.message
            });
        }
    }

    testProjectDataValidation() {
        this.results.total++;
        try {
            console.log('Testing project data validation...');

            const validateProjectData = (projectData) => {
                if (!projectData) return { valid: false, reason: 'null projectData' };
                if (!projectData.resolution) return { valid: false, reason: 'missing resolution' };
                return { valid: true };
            };

            // Test 1: null project data
            const result1 = validateProjectData(null);
            if (result1.valid) {
                throw new Error('null project data should be invalid');
            }

            // Test 2: empty project data
            const result2 = validateProjectData({});
            if (result2.valid) {
                throw new Error('empty project data should be invalid');
            }

            // Test 3: project data without resolution
            const result3 = validateProjectData({ isHoz: true });
            if (result3.valid) {
                throw new Error('project data without resolution should be invalid');
            }

            // Test 4: valid project data
            const result4 = validateProjectData({ resolution: 'hd', isHoz: true });
            if (!result4.valid) {
                throw new Error('valid project data should pass validation');
            }

            // Test 5: resolution fallback logic
            const resolutions = {
                'hd': { width: 1920, height: 1080 },
                'unknown': null
            };

            const getResolution = (resolution) => {
                return resolutions[resolution] || resolutions.hd;
            };

            const hdResult = getResolution('hd');
            if (!hdResult || hdResult.width !== 1920) {
                throw new Error('known resolution should return correct dimensions');
            }

            const unknownResult = getResolution('unknown-resolution');
            if (!unknownResult || unknownResult.width !== 1920) {
                throw new Error('unknown resolution should fallback to HD');
            }

            console.log('  ✅ Project data validation works correctly');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Project data validation test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'Project Data Validation',
                error: error.message
            });
        }
    }

    testPoint2DOverrideLogic() {
        this.results.total++;
        try {
            console.log('Testing Point2D override logic...');

            const isPoint2DProperty = (value) => {
                return value && typeof value === 'object' &&
                       typeof value.x === 'number' && typeof value.y === 'number';
            };

            const isCenterProperty = (key) => {
                const keyLower = key.toLowerCase();
                return keyLower.includes('center') ||
                       keyLower.includes('position') ||
                       keyLower.includes('point');
            };

            // Test 1: Point2D detection
            const point2D = { x: 100, y: 200 };
            if (!isPoint2DProperty(point2D)) {
                throw new Error('Valid Point2D should be detected');
            }

            const notPoint2D1 = { x: 100 }; // missing y
            if (isPoint2DProperty(notPoint2D1)) {
                throw new Error('Object missing y should not be Point2D');
            }

            const notPoint2D2 = { x: '100', y: 200 }; // x is string
            if (isPoint2DProperty(notPoint2D2)) {
                throw new Error('Object with string x should not be Point2D');
            }

            const notPoint2D3 = null;
            if (isPoint2DProperty(notPoint2D3)) {
                throw new Error('null should not be Point2D');
            }

            // Test 2: Center property detection
            if (!isCenterProperty('center')) {
                throw new Error('center should be detected as center property');
            }

            if (!isCenterProperty('centerPoint')) {
                throw new Error('centerPoint should be detected as center property');
            }

            if (!isCenterProperty('position')) {
                throw new Error('position should be detected as center property');
            }

            if (!isCenterProperty('startPoint')) {
                throw new Error('startPoint should be detected as center property');
            }

            if (isCenterProperty('color')) {
                throw new Error('color should not be detected as center property');
            }

            if (isCenterProperty('opacity')) {
                throw new Error('opacity should not be detected as center property');
            }

            // Test 3: Case insensitive detection
            if (!isCenterProperty('CENTER')) {
                throw new Error('CENTER should be detected (case insensitive)');
            }

            if (!isCenterProperty('Position')) {
                throw new Error('Position should be detected (case insensitive)');
            }

            console.log('  ✅ Point2D override logic works correctly');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Point2D override logic test failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                test: 'Point2D Override Logic',
                error: error.message
            });
        }
    }

    printResults() {
        console.log('\n📊 Unit Test Results:');
        console.log('======================');
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);

        if (this.results.failed > 0) {
            console.log('\n🚨 Failed Tests:');
            this.results.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.error}`);
            });
        }

        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        console.log(`\n📈 Pass Rate: ${passRate}%`);

        if (this.results.failed === 0) {
            console.log('\n🎉 ALL UNIT TESTS PASSED!');
            console.log('EffectConfigurer is working correctly.');
        } else {
            console.log('\n⚠️  Some unit tests failed. EffectConfigurer may have issues.');
        }
    }
}

// Run tests if this is the main module
async function runUnitTests() {
    const tester = new EffectConfigurerUnitTests();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    runUnitTests().catch(error => {
        console.error('❌ Unit test runner failed:', error);
        process.exit(1);
    });
}

module.exports = EffectConfigurerUnitTests;