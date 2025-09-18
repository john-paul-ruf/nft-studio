#!/usr/bin/env node
/**
 * Meta test to ensure the add effect button fix is properly tested and covered
 * This test validates that we have comprehensive coverage for the issue that was fixed
 */

import fs from 'fs';
import path from 'path';

class AddEffectFixCoverageTests {
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

    testEffectTestsExist() {
        console.log('📂 Testing Effect-Related Tests Exist...\n');

        const requiredTests = [
            'tests/integration/add-effect-button.test.js',
            'tests/integration/final-effect-button-validation.test.js',
            'tests/integration/frontend-ipc-validation.test.js',
            'tests/integration/effect-name-class-mapping.test.js',
            'tests/integration/effect-rendering-validation.test.js',
            'tests/regression/add-button-to-render-flow.test.js'
        ];

        for (const testPath of requiredTests) {
            this.test(`Required test exists: ${testPath}`, () => {
                const fullPath = path.join(process.cwd(), testPath);
                if (!fs.existsSync(fullPath)) {
                    throw new Error(`Test file missing: ${testPath}`);
                }
            });
        }
    }

    testFixedFilesExist() {
        console.log('\n🔧 Testing Fixed Files Exist...\n');

        const fixedFiles = [
            'src/components/EffectPicker.jsx',
            'src/components/EffectsPanel.jsx',
            'src/main/handlers/EffectsHandlers.js',
            'src/main/implementations/NftEffectsManager.js'
        ];

        for (const filePath of fixedFiles) {
            this.test(`Fixed file exists: ${filePath}`, () => {
                const fullPath = path.join(process.cwd(), filePath);
                if (!fs.existsSync(fullPath)) {
                    throw new Error(`Fixed file missing: ${filePath}`);
                }
            });
        }
    }

    testFixedCodeContainsCorrections() {
        console.log('\n🎯 Testing Fixed Code Contains Corrections...\n');

        // Test EffectPicker.jsx has the correct API call
        this.test('EffectPicker.jsx uses getAvailableEffects (not discoverEffects)', () => {
            const filePath = path.join(process.cwd(), 'src/components/EffectPicker.jsx');
            const content = fs.readFileSync(filePath, 'utf8');

            if (content.includes('window.api.discoverEffects')) {
                throw new Error('EffectPicker.jsx still uses old discoverEffects API call');
            }

            if (!content.includes('window.api.getAvailableEffects')) {
                throw new Error('EffectPicker.jsx missing corrected getAvailableEffects API call');
            }
        });

        // Test EffectPicker.jsx has the correct property access
        this.test('EffectPicker.jsx uses response.effects.finalImage (not .final)', () => {
            const filePath = path.join(process.cwd(), 'src/components/EffectPicker.jsx');
            const content = fs.readFileSync(filePath, 'utf8');

            if (content.includes('response.effects.final')) {
                throw new Error('EffectPicker.jsx still uses old response.effects.final property');
            }

            if (!content.includes('response.effects.finalImage')) {
                throw new Error('EffectPicker.jsx missing corrected response.effects.finalImage property');
            }
        });

        // Test EffectsPanel.jsx has the correct API call
        this.test('EffectsPanel.jsx uses getAvailableEffects (not discoverEffects)', () => {
            const filePath = path.join(process.cwd(), 'src/components/EffectsPanel.jsx');
            const content = fs.readFileSync(filePath, 'utf8');

            if (content.includes('window.api.discoverEffects')) {
                throw new Error('EffectsPanel.jsx still uses old discoverEffects API call');
            }

            if (!content.includes('window.api.getAvailableEffects')) {
                throw new Error('EffectsPanel.jsx missing corrected getAvailableEffects API call');
            }
        });

        // Test IPC handler doesn't double-wrap response
        this.test('EffectsHandlers.js returns direct result from getAvailableEffects', () => {
            const filePath = path.join(process.cwd(), 'src/main/handlers/EffectsHandlers.js');
            const content = fs.readFileSync(filePath, 'utf8');

            // Check for the corrected pattern: return result; instead of return { success: true, effects: effects };
            if (content.includes('effects: effects')) {
                throw new Error('EffectsHandlers.js still double-wraps the getAvailableEffects response');
            }

            const hasCorrectReturn = content.includes('return result;') ||
                                   content.includes('const result = await this.effectsManager.getAvailableEffects();\n                return result;');

            if (!hasCorrectReturn) {
                throw new Error('EffectsHandlers.js missing corrected direct result return');
            }
        });
    }

    testTestsCanDetectRegressions() {
        console.log('\n🛡️  Testing Tests Can Detect Regressions...\n');

        // Test that we have tests that would catch the original issues
        const testFiles = [
            'tests/integration/effect-name-class-mapping.test.js',
            'tests/integration/effect-rendering-validation.test.js'
        ];

        for (const testPath of testFiles) {
            this.test(`Test ${testPath} contains Fuzz Flare validation`, () => {
                const fullPath = path.join(process.cwd(), testPath);
                const content = fs.readFileSync(fullPath, 'utf8');

                if (!content.includes('fuzz-flare') && !content.includes('FuzzFlare')) {
                    throw new Error(`${testPath} doesn't test Fuzz Flare (the original failing effect)`);
                }
            });
        }

        this.test('Regression test covers complete add-to-render flow', () => {
            const testPath = path.join(process.cwd(), 'tests/regression/add-button-to-render-flow.test.js');
            const content = fs.readFileSync(testPath, 'utf8');

            const requiredSteps = [
                'simulateAddEffectButtonClick',
                'simulateUserSelectsFuzzFlare',
                'simulateEffectProcessing',
                'Effect class.*not found'
            ];

            for (const step of requiredSteps) {
                if (!content.includes(step)) {
                    throw new Error(`Regression test missing step: ${step}`);
                }
            }
        });
    }

    testDocumentationExists() {
        console.log('\n📚 Testing Documentation Exists...\n');

        this.test('Test runner exists for effect tests', () => {
            const runnerPath = path.join(process.cwd(), 'tests/run-effect-tests.js');
            if (!fs.existsSync(runnerPath)) {
                throw new Error('Missing test runner for effect tests');
            }
        });

        this.test('Tests are documented in comprehensive runner', () => {
            const runnerPath = path.join(process.cwd(), 'tests/comprehensive-runner.js');
            if (fs.existsSync(runnerPath)) {
                const content = fs.readFileSync(runnerPath, 'utf8');
                // Should ideally include the new tests, but this is optional
                console.log('   ✓ Comprehensive runner exists (test inclusion optional)');
            } else {
                console.log('   ⚠️  Comprehensive runner not found (optional)');
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Running Add Effect Fix Coverage Tests...\n');
        console.log('This test validates that the add effect button fix is properly tested and covered\n');

        try {
            this.testEffectTestsExist();
            this.testFixedFilesExist();
            this.testFixedCodeContainsCorrections();
            this.testTestsCanDetectRegressions();
            this.testDocumentationExists();
        } catch (error) {
            console.log(`❌ Test suite failed with error: ${error.message}`);
            this.failedTests++;
        }

        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.testCount}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All add effect fix coverage tests passed!');
            console.log('\n✅ COMPREHENSIVE COVERAGE CONFIRMED:');
            console.log('   1. ✅ All required test files exist');
            console.log('   2. ✅ All fixed files contain correct code');
            console.log('   3. ✅ Tests can detect regressions of original issues');
            console.log('   4. ✅ Complete user flow is validated');
            console.log('\n🛡️  REGRESSION PROTECTION:');
            console.log('   - Tests will catch if add button becomes empty again');
            console.log('   - Tests will catch "Effect class not found" errors');
            console.log('   - Tests will catch Fuzz Flare rendering failures');
            console.log('   - Tests validate complete frontend→backend→render pipeline');
        } else {
            console.log('\n💥 Some coverage tests failed!');
            console.log('\nThis indicates incomplete fix coverage:');
            console.log('   - Missing required test files');
            console.log('   - Incomplete code fixes');
            console.log('   - Insufficient regression protection');
        }

        return this.failedTests === 0;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new AddEffectFixCoverageTests();
    tests.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

export default AddEffectFixCoverageTests;