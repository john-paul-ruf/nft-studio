#!/usr/bin/env node
/**
 * Test runner for effect name-class mapping and rendering validation tests
 * Validates that the add effect button fix also fixes rendering issues
 */

import { execSync } from 'child_process';
import path from 'path';

function runTest(testPath) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Running: ${path.basename(testPath)}`);
    console.log(`${'='.repeat(80)}\n`);

    try {
        const output = execSync(`node ${testPath}`, {
            encoding: 'utf-8',
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        console.log(output);
        return { success: true, output };
    } catch (error) {
        console.log(error.stdout || '');
        console.log('\n❌ Test failed with error:');
        console.log(error.stderr || error.message);
        return { success: false, error: error.message, output: error.stdout };
    }
}

function main() {
    console.log('🚀 Running Effect Tests for Add Button Fix Validation\n');

    const tests = [
        'tests/integration/effect-name-class-mapping.test.js',
        'tests/integration/effect-rendering-validation.test.js',
        'tests/regression/add-button-to-render-flow.test.js'
    ];

    let passed = 0;
    let failed = 0;

    for (const testPath of tests) {
        const result = runTest(testPath);
        if (result.success) {
            passed++;
        } else {
            failed++;
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 FINAL RESULTS');
    console.log(`${'='.repeat(80)}`);
    console.log(`Tests run: ${tests.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed === 0) {
        console.log('\n🎉 ALL EFFECT TESTS PASSED!');
        console.log('\n✅ This confirms:');
        console.log('   - Add effect button fix is working');
        console.log('   - Effect name-class mapping is correct');
        console.log('   - No "Effect class not found" regression');
        console.log('   - Complete user flow works end-to-end');
    } else {
        console.log('\n💥 SOME TESTS FAILED!');
        console.log('\nThis indicates issues with:');
        console.log('   - Effect name-to-class mapping');
        console.log('   - Effect rendering pipeline');
        console.log('   - Add button to render flow');
    }

    process.exit(failed === 0 ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { runTest };