#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TestEnvironment from './setup/TestEnvironment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Unified Real Objects Test Runner
 * Handles single tests or full test suites with coverage reporting
 * NO MOCKS - only real objects and real behavior
 */
class RealTestRunner {
    constructor() {
        this.testResults = [];
        this.coverageData = {
            services: new Set(),
            methods: new Set(),
            files: new Set(),
            integrations: new Set()
        };
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.startTime = null;
        this.testCategories = new Map();
    }

    /**
     * Discover all test files in the tests directory
     * @returns {Promise<Array>} Array of test file paths
     */
    async discoverTests() {
        const testFiles = [];
        const testDirs = ['integration', 'system', 'unit'];
        
        for (const dir of testDirs) {
            const dirPath = path.join(__dirname, dir);
            try {
                const files = await fs.readdir(dirPath);
                for (const file of files) {
                    if (file.endsWith('.test.js')) {
                        testFiles.push({
                            path: path.join(dirPath, file),
                            category: dir,
                            name: file.replace('.test.js', '')
                        });
                    }
                }
            } catch (error) {
                // Directory doesn't exist, skip
            }
        }
        
        return testFiles;
    }

    /**
     * Load and execute a test file
     * @param {string} testFilePath - Path to test file
     * @returns {Promise<Array>} Array of test functions
     */
    async loadTestFile(testFilePath) {
        try {
            const testModule = await import(testFilePath);
            const testFunctions = [];
            
            // Extract all exported test functions
            for (const [name, fn] of Object.entries(testModule)) {
                if (typeof fn === 'function' && name.startsWith('test')) {
                    testFunctions.push({
                        name: name.replace(/^test/, '').replace(/([A-Z])/g, ' $1').trim(),
                        fn,
                        category: path.basename(path.dirname(testFilePath))
                    });
                }
            }
            
            return testFunctions;
        } catch (error) {
            console.error(`❌ Failed to load test file ${testFilePath}:`, error.message);
            return [];
        }
    }

    /**
     * Run a single test with real objects and coverage tracking
     * @param {Function} testFunction - Test function to execute
     * @param {string} testName - Name of the test
     * @param {string} category - Test category
     * @returns {Promise<Object>} Test result
     */
    async runTest(testFunction, testName, category = 'unknown') {
        console.log(`\n🧪 Running: ${testName} [${category}]`);
        
        const testStartTime = Date.now();
        let testEnv = null;
        let result = {
            name: testName,
            category,
            passed: false,
            duration: 0,
            error: null,
            cleanupVerified: false,
            coverage: {
                services: [],
                methods: [],
                files: []
            }
        };
        
        try {
            // Create fresh environment with real objects for each test
            testEnv = await new TestEnvironment().setup();
            
            // Track coverage during test execution
            const coverageTracker = this.createCoverageTracker(testEnv);
            
            // Run test with real objects
            await testFunction(testEnv);
            
            // Collect coverage data
            result.coverage = coverageTracker.getCoverage();
            this.updateGlobalCoverage(result.coverage);
            
            result.passed = true;
            result.duration = Date.now() - testStartTime;
            
            console.log(`✅ PASSED: ${testName} (${result.duration}ms)`);
            this.passedTests++;
            
        } catch (error) {
            result.passed = false;
            result.duration = Date.now() - testStartTime;
            result.error = error.message;
            result.stack = error.stack;
            
            console.error(`❌ FAILED: ${testName} (${result.duration}ms)`);
            console.error(`   Error: ${error.message}`);
            this.failedTests++;
            
        } finally {
            // Always clean up, even on failure
            if (testEnv) {
                await testEnv.cleanup();
                result.cleanupVerified = await testEnv.verifyCleanup();
                
                if (!result.cleanupVerified) {
                    console.warn(`⚠️ Cleanup verification failed for ${testName}`);
                }
            }
        }
        
        this.testResults.push(result);
        this.totalTests++;
        
        // Update category tracking
        if (!this.testCategories.has(category)) {
            this.testCategories.set(category, { passed: 0, failed: 0, total: 0 });
        }
        const categoryStats = this.testCategories.get(category);
        categoryStats.total++;
        if (result.passed) {
            categoryStats.passed++;
        } else {
            categoryStats.failed++;
        }
        
        return result;
    }

    /**
     * Create coverage tracker for a test environment
     * @param {TestEnvironment} testEnv - Test environment
     * @returns {Object} Coverage tracker
     */
    createCoverageTracker(testEnv) {
        const coverage = {
            services: new Set(),
            methods: new Set(),
            files: new Set()
        };
        
        // Auto-track service usage by wrapping service methods
        const container = testEnv.getContainer();
        const serviceNames = ['fileSystemService', 'imageService', 'frameService', 
                             'effectRegistryService', 'configProcessingService', 'dialogService'];
        
        serviceNames.forEach(serviceName => {
            try {
                const service = container.resolve(serviceName);
                if (service) {
                    coverage.services.add(serviceName);
                    
                    // Track method calls - get methods from both prototype and instance
                    const allMethods = new Set();
                    
                    // Get methods from prototype
                    let proto = Object.getPrototypeOf(service);
                    while (proto && proto !== Object.prototype) {
                        Object.getOwnPropertyNames(proto).forEach(name => {
                            if (typeof service[name] === 'function' && name !== 'constructor') {
                                allMethods.add(name);
                            }
                        });
                        proto = Object.getPrototypeOf(proto);
                    }
                    
                    // Get methods from instance
                    Object.getOwnPropertyNames(service).forEach(name => {
                        if (typeof service[name] === 'function') {
                            allMethods.add(name);
                        }
                    });
                    
                    // Wrap methods for tracking
                    allMethods.forEach(methodName => {
                        const originalMethod = service[methodName];
                        if (typeof originalMethod === 'function') {
                            service[methodName] = function(...args) {
                                coverage.methods.add(`${serviceName}.${methodName}`);
                                return originalMethod.apply(this, args);
                            };
                        }
                    });
                }
            } catch (error) {
                // Service not available, skip
            }
        });
        
        return {
            trackService: (serviceName) => coverage.services.add(serviceName),
            trackMethod: (serviceName, methodName) => coverage.methods.add(`${serviceName}.${methodName}`),
            trackFile: (filePath) => coverage.files.add(filePath),
            getCoverage: () => ({
                services: Array.from(coverage.services),
                methods: Array.from(coverage.methods),
                files: Array.from(coverage.files)
            })
        };
    }

    /**
     * Update global coverage data
     * @param {Object} testCoverage - Coverage data from a test
     */
    updateGlobalCoverage(testCoverage) {
        testCoverage.services.forEach(s => this.coverageData.services.add(s));
        testCoverage.methods.forEach(m => this.coverageData.methods.add(m));
        testCoverage.files.forEach(f => this.coverageData.files.add(f));
    }

    /**
     * Run all tests or specific test pattern
     * @param {string} pattern - Test pattern to match (optional)
     * @returns {Promise<Object>} Test results with coverage
     */
    async runTests(pattern = null) {
        console.log('🚀 Real Objects Test Runner');
        console.log('📋 Discovering tests...\n');
        
        this.startTime = Date.now();
        
        const testFiles = await this.discoverTests();
        let testsToRun = [];
        
        if (pattern) {
            // Filter tests by pattern
            const filteredFiles = testFiles.filter(tf => 
                tf.name.includes(pattern) || 
                tf.category.includes(pattern) ||
                tf.path.includes(pattern)
            );
            
            if (filteredFiles.length === 0) {
                console.log(`❌ No tests found matching pattern: ${pattern}`);
                return this.generateReport();
            }
            
            console.log(`🎯 Running tests matching pattern: ${pattern}`);
            testFiles.splice(0, testFiles.length, ...filteredFiles);
        }
        
        // Load all test functions
        for (const testFile of testFiles) {
            const testFunctions = await this.loadTestFile(testFile.path);
            testsToRun.push(...testFunctions.map(tf => ({
                ...tf,
                file: testFile.path,
                category: testFile.category
            })));
        }
        
        if (testsToRun.length === 0) {
            console.log('❌ No test functions found');
            return this.generateReport();
        }
        
        console.log(`📊 Found ${testsToRun.length} tests in ${testFiles.length} files\n`);
        
        // Run all tests
        for (const test of testsToRun) {
            await this.runTest(test.fn, test.name, test.category);
        }
        
        return this.generateReport();
    }

    /**
     * Calculate coverage percentages
     * @returns {Object} Coverage statistics
     */
    calculateCoverage() {
        // Define expected coverage targets
        const expectedServices = [
            'fileSystemService', 'imageService', 'frameService', 
            'effectRegistryService', 'configProcessingService', 'dialogService'
        ];
        
        const expectedMethods = [
            'fileSystemService.readFile', 'fileSystemService.writeFile', 'fileSystemService.fileExists',
            'frameService.processFrame', 'imageService.loadImage', 'effectRegistryService.getEffect'
        ];
        
        const servicesCovered = Array.from(this.coverageData.services);
        const methodsCovered = Array.from(this.coverageData.methods);
        const filesCovered = Array.from(this.coverageData.files);
        
        return {
            services: {
                covered: servicesCovered.length,
                total: expectedServices.length,
                percentage: Math.round((servicesCovered.length / expectedServices.length) * 100),
                list: servicesCovered,
                missing: expectedServices.filter(s => !servicesCovered.includes(s))
            },
            methods: {
                covered: methodsCovered.length,
                total: expectedMethods.length,
                percentage: Math.round((methodsCovered.length / expectedMethods.length) * 100),
                list: methodsCovered,
                missing: expectedMethods.filter(m => !methodsCovered.includes(m))
            },
            files: {
                covered: filesCovered.length,
                list: filesCovered
            },
            integrations: {
                tested: Array.from(this.coverageData.integrations).length
            }
        };
    }

    /**
     * Generate comprehensive test report with coverage
     * @returns {Object} Complete test report
     */
    generateReport() {
        const totalDuration = Date.now() - this.startTime;
        const successRate = this.totalTests > 0 ? (this.passedTests / this.totalTests * 100).toFixed(1) : 0;
        const coverage = this.calculateCoverage();
        
        const report = {
            summary: {
                total: this.totalTests,
                passed: this.passedTests,
                failed: this.failedTests,
                successRate: `${successRate}%`,
                totalDuration: `${totalDuration}ms`,
                averageDuration: this.totalTests > 0 ? `${Math.round(totalDuration / this.totalTests)}ms` : '0ms'
            },
            coverage,
            categories: Object.fromEntries(this.testCategories),
            tests: this.testResults,
            cleanupIssues: this.testResults.filter(t => !t.cleanupVerified).length
        };
        
        this.printReport(report);
        return report;
    }

    /**
     * Print comprehensive test report with coverage
     * @param {Object} report - Test report
     */
    printReport(report) {
        console.log('\n' + '='.repeat(80));
        console.log('📊 REAL OBJECTS TEST REPORT WITH COVERAGE');
        console.log('='.repeat(80));
        
        // Summary
        console.log(`\n📈 TEST SUMMARY:`);
        console.log(`   Total Tests: ${report.summary.total}`);
        console.log(`   Passed: ${report.summary.passed} ✅`);
        console.log(`   Failed: ${report.summary.failed} ❌`);
        console.log(`   Success Rate: ${report.summary.successRate}`);
        console.log(`   Total Duration: ${report.summary.totalDuration}`);
        console.log(`   Average Duration: ${report.summary.averageDuration}`);
        
        // Coverage Report
        console.log(`\n📊 COVERAGE REPORT:`);
        console.log(`   Services: ${report.coverage.services.covered}/${report.coverage.services.total} (${report.coverage.services.percentage}%)`);
        console.log(`   Methods: ${report.coverage.methods.covered}/${report.coverage.methods.total} (${report.coverage.methods.percentage}%)`);
        console.log(`   Files Touched: ${report.coverage.files.covered}`);
        console.log(`   Integrations: ${report.coverage.integrations.tested}`);
        
        // Coverage Details
        if (report.coverage.services.covered > 0) {
            console.log(`\n✅ SERVICES COVERED:`);
            report.coverage.services.list.forEach(service => {
                console.log(`   • ${service}`);
            });
        }
        
        if (report.coverage.services.missing.length > 0) {
            console.log(`\n⚠️ SERVICES NOT COVERED:`);
            report.coverage.services.missing.forEach(service => {
                console.log(`   • ${service}`);
            });
        }
        
        if (report.coverage.methods.covered > 0) {
            console.log(`\n✅ METHODS COVERED:`);
            report.coverage.methods.list.forEach(method => {
                console.log(`   • ${method}`);
            });
        }
        
        // Category Breakdown
        if (report.categories && Object.keys(report.categories).length > 0) {
            console.log(`\n📋 CATEGORY BREAKDOWN:`);
            for (const [category, stats] of Object.entries(report.categories)) {
                const categoryRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
                console.log(`   ${category}: ${stats.passed}/${stats.total} (${categoryRate}%) ✅`);
            }
        }
        
        // Cleanup Status
        if (report.cleanupIssues > 0) {
            console.log(`\n⚠️ CLEANUP ISSUES: ${report.cleanupIssues} tests had cleanup problems`);
        } else {
            console.log(`\n🧹 CLEANUP: All tests cleaned up successfully ✅`);
        }
        
        // Failed Tests Details
        const failedTests = report.tests.filter(t => !t.passed);
        if (failedTests.length > 0) {
            console.log(`\n❌ FAILED TESTS:`);
            failedTests.forEach(test => {
                console.log(`   • ${test.name} [${test.category}] - ${test.error}`);
            });
        }
        
        console.log('\n' + '='.repeat(80));
        
        if (report.summary.failed === 0) {
            console.log('🎉 ALL TESTS PASSED WITH REAL OBJECTS!');
            console.log(`📊 Coverage: ${report.coverage.services.percentage}% services, ${report.coverage.methods.percentage}% methods`);
        } else {
            console.log(`⚠️ ${report.summary.failed} TEST(S) FAILED`);
        }
        
        console.log('='.repeat(80));
    }

    /**
     * Verify global cleanup and generate cleanup report
     * @returns {Promise<boolean>} True if cleanup successful
     */
    async verifyGlobalCleanup() {
        console.log('\n🔍 Verifying global cleanup...');
        
        try {
            const { promises: fs } = await import('fs');
            const path = await import('path');
            const os = await import('os');
            
            const baseTestDir = path.default.join(os.default.tmpdir(), 'nft-studio-tests');
            
            try {
                await fs.access(baseTestDir);
                const files = await fs.readdir(baseTestDir);
                if (files.length > 0) {
                    console.warn(`⚠️ Global cleanup incomplete: ${files.length} items remain`);
                    console.warn(`   Remaining: ${files.join(', ')}`);
                    return false;
                }
            } catch {
                // Directory doesn't exist, which is good
            }
            
            console.log('✅ Global cleanup verified');
            return true;
            
        } catch (error) {
            console.error('❌ Global cleanup verification failed:', error.message);
            return false;
        }
    }
}

/**
 * Main execution function
 */
async function main() {
    const args = process.argv.slice(2);
    const pattern = args[0] || null;
    
    const runner = new RealTestRunner();
    
    try {
        const results = await runner.runTests(pattern);
        
        // Verify cleanup
        await runner.verifyGlobalCleanup();
        
        // Exit with appropriate code
        process.exit(results.summary.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('❌ Test runner error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default RealTestRunner;