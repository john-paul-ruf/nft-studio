#!/usr/bin/env node
/**
 * Comprehensive test runner for all color scheme tests
 * Runs all test suites and provides combined results
 */

console.log('🧪 Color Scheme Test Suite Runner\n');

async function runAllColorSchemeTests() {
    console.log('🚀 Running Complete Color Scheme Test Suite...\n');

    const testSuites = [
        {
            name: 'Fixed Implementation Tests',
            module: './fixed-color-scheme-implementation.test.js',
            description: 'Core backend validation and UI flow tests'
        },
        {
            name: 'Edge Cases Tests',
            module: './color-scheme-edge-cases.test.js',
            description: 'Edge cases and error handling tests'
        },
        {
            name: 'Canvas Integration Tests',
            module: './canvas-integration.test.js',
            description: 'Canvas.jsx logic and integration tests'
        },
        {
            name: 'Default Scheme Selection Tests',
            module: './default-scheme-selection.test.js',
            description: 'Default color scheme selection and fallback logic'
        },
        {
            name: 'Effect Configuration Fixes',
            module: './effect-configuration-fixes.test.js',
            description: 'Effect configuration and range object handling fixes'
        }
    ];

    const results = {
        totalSuites: testSuites.length,
        passedSuites: 0,
        failedSuites: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        suiteResults: []
    };

    for (const suite of testSuites) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📋 Running ${suite.name}`);
        console.log(`   ${suite.description}`);
        console.log(`${'='.repeat(60)}`);

        try {
            // Import and run the test suite
            const TestSuiteClass = require(suite.module);
            const testSuite = new TestSuiteClass();
            const success = await testSuite.runAllTests();

            const suiteResult = {
                name: suite.name,
                success: success,
                passed: testSuite.testResults.passed,
                failed: testSuite.testResults.failed,
                total: testSuite.testResults.total
            };

            results.suiteResults.push(suiteResult);
            results.totalTests += suiteResult.total;
            results.passedTests += suiteResult.passed;
            results.failedTests += suiteResult.failed;

            if (success) {
                results.passedSuites++;
                console.log(`\n✅ ${suite.name} PASSED`);
            } else {
                results.failedSuites++;
                console.log(`\n❌ ${suite.name} FAILED`);
            }

        } catch (error) {
            console.error(`\n💥 ${suite.name} CRASHED: ${error.message}`);
            results.failedSuites++;
            results.suiteResults.push({
                name: suite.name,
                success: false,
                passed: 0,
                failed: 1,
                total: 1,
                error: error.message
            });
            results.totalTests += 1;
            results.failedTests += 1;
        }
    }

    // Print comprehensive results
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 COMPREHENSIVE COLOR SCHEME TEST RESULTS');
    console.log(`${'='.repeat(80)}`);

    console.log('\n📋 Test Suite Summary:');
    for (const suite of results.suiteResults) {
        const status = suite.success ? '✅ PASS' : '❌ FAIL';
        const testInfo = suite.error ?
            `(CRASHED: ${suite.error})` :
            `(${suite.passed}/${suite.total} tests passed)`;
        console.log(`   ${status} ${suite.name} ${testInfo}`);
    }

    console.log('\n📊 Overall Statistics:');
    console.log(`   Test Suites: ${results.passedSuites}/${results.totalSuites} passed`);
    console.log(`   Total Tests: ${results.passedTests}/${results.totalTests} passed`);
    console.log(`   Success Rate: ${Math.round((results.passedTests / results.totalTests) * 100)}%`);

    if (results.failedSuites === 0 && results.failedTests === 0) {
        console.log('\n🎉 ALL COLOR SCHEME TESTS PASSED!');
        console.log('\n✨ Complete Implementation Verified:');
        console.log('   🔧 Backend Validation:');
        console.log('      ✅ Strict colorSchemeData validation (no defaults/fallbacks)');
        console.log('      ✅ Complete error handling for all missing/invalid fields');
        console.log('      ✅ ColorScheme object creation with proper structure');
        console.log('      ✅ colors vs lights separation working correctly');
        console.log('');
        console.log('   🖼️ Frontend Integration:');
        console.log('      ✅ Canvas.jsx fetches complete color scheme data');
        console.log('      ✅ Canvas.jsx creates proper colorSchemeData structure');
        console.log('      ✅ Canvas.jsx handles invalid schemes gracefully');
        console.log('      ✅ Canvas.jsx loads user default scheme on startup');
        console.log('      ✅ Complete UI->Backend data flow working');
        console.log('');
        console.log('   🔬 Edge Cases & Quality:');
        console.log('      ✅ Large color arrays handled correctly');
        console.log('      ✅ Minimum valid arrays work');
        console.log('      ✅ Extra fields ignored gracefully');
        console.log('      ✅ Whitespace preservation');
        console.log('      ✅ Consistent error messages');
        console.log('      ✅ ColorScheme object methods functional');
        console.log('');
        console.log('🚀 Implementation Summary:');
        console.log('   📱 UI: Sends complete colorSchemeData (no scheme IDs)');
        console.log('   🔧 Backend: Validates strictly, creates ColorScheme objects');
        console.log('   🎯 Effects: Get colors from ColorScheme.colorBucket');
        console.log('   ❌ NO predefined scheme lookups');
        console.log('   ❌ NO defaults or fallbacks');
        console.log('   ❌ NO hidden errors');
        console.log('');
        console.log('✅ READY FOR PRODUCTION - Complete validation, no hidden failures!');
        return true;
    } else {
        console.log('\n❌ COLOR SCHEME TESTS FAILED!');
        console.log(`\n🔍 Issues Found:`);
        console.log(`   Failed Suites: ${results.failedSuites}/${results.totalSuites}`);
        console.log(`   Failed Tests: ${results.failedTests}/${results.totalTests}`);
        console.log('\n🛠️ Review failed tests above and fix implementation issues.');
        return false;
    }
}

// Run all tests if called directly
if (require.main === module) {
    runAllColorSchemeTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = runAllColorSchemeTests;