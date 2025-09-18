#!/usr/bin/env node
/**
 * Comprehensive Test Runner for NFT Studio
 * Actually executes test files and provides detailed reporting
 */

import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

class ComprehensiveTestRunner {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            suites: [],
            executionTime: 0
        };
        this.startTime = Date.now();
    }

    /**
     * Find all test files organized by category
     */
    findTestFiles() {
        const testCategories = {
            unit: [],
            integration: [],
            debug: [],
            validation: [],
            regression: [],
            comprehensive: [],
            summary: [],
            other: []
        };

        function scanDirectory(directory, category = 'other') {
            try {
                const items = fs.readdirSync(directory);

                for (const item of items) {
                    const fullPath = path.join(directory, item);
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory() && item !== 'node_modules') {
                        // Categorize based on directory name
                        const subCategory = testCategories.hasOwnProperty(item) ? item : category;
                        scanDirectory(fullPath, subCategory);
                    } else if (item.endsWith('.test.js')) {
                        if (!testCategories[category]) {
                            testCategories[category] = [];
                        }
                        testCategories[category].push({
                            path: fullPath,
                            name: path.basename(fullPath, '.test.js'),
                            category: category
                        });
                    }
                }
            } catch (error) {
                console.warn(`Warning: Could not scan directory ${directory}: ${error.message}`);
            }
        }

        scanDirectory('./tests');
        return testCategories;
    }

    /**
     * Execute a single test file
     */
    async executeTestFile(testFile) {
        return new Promise((resolve) => {
            const startTime = Date.now();

            console.log(`${colors.blue}➤${colors.reset} Running ${colors.bold}${testFile.name}${colors.reset} ${colors.dim}(${testFile.category})${colors.reset}`);

            try {
                // Execute the test file using Node.js
                const result = execSync(`node "${testFile.path}"`, {
                    encoding: 'utf8',
                    timeout: 30000, // 30 second timeout
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                const executionTime = Date.now() - startTime;

                // Analyze the output to determine if tests passed
                const output = result.toString();
                const success = this.analyzeTestOutput(output);

                const suite = {
                    name: testFile.name,
                    category: testFile.category,
                    file: testFile.path,
                    passed: success ? 1 : 0,
                    failed: success ? 0 : 1,
                    total: 1,
                    executionTime,
                    output: output,
                    error: null
                };

                if (success) {
                    console.log(`  ${colors.green}✓${colors.reset} Passed ${colors.dim}(${executionTime}ms)${colors.reset}`);
                    this.results.passed += 1;
                } else {
                    console.log(`  ${colors.red}✗${colors.reset} Failed ${colors.dim}(${executionTime}ms)${colors.reset}`);
                    this.results.failed += 1;
                }

                this.results.total += 1;
                this.results.suites.push(suite);
                resolve(suite);

            } catch (error) {
                const executionTime = Date.now() - startTime;

                console.log(`  ${colors.red}✗${colors.reset} Error ${colors.dim}(${executionTime}ms)${colors.reset}`);

                const suite = {
                    name: testFile.name,
                    category: testFile.category,
                    file: testFile.path,
                    passed: 0,
                    failed: 1,
                    total: 1,
                    executionTime,
                    output: error.stdout ? error.stdout.toString() : '',
                    error: error.stderr ? error.stderr.toString() : error.message
                };

                this.results.failed += 1;
                this.results.total += 1;
                this.results.suites.push(suite);
                resolve(suite);
            }
        });
    }

    /**
     * Analyze test output to determine success/failure
     */
    analyzeTestOutput(output) {
        // Look for common success patterns
        const successPatterns = [
            /all.*tests.*passed/i,
            /✅.*PASS/i,
            /✓.*passed/i,
            /0.*failed/i,
            /passed.*\d+.*failed.*0/i, // Generic format: passed X failed 0
            /test.*results.*passed.*\d+.*failed.*0/i,
            /🎉.*all.*tests.*passed/i, // Our comprehensive test success message
            /all.*effect.*key.*passing.*tests.*passed/i, // Specific to effect-key-passing test
            /Failed:\s*0/i, // "Failed: 0" format
            /Passed:\s*\d+/i, // "Passed: X" format (only if no failures detected)
            /Total:\s*\d+.*Passed:\s*\d+.*Failed:\s*0/i, // Our test format
            /Passed:\s*\d+.*Failed:\s*0/i // Simpler version of our test format
        ];

        // Look for common failure patterns (check these first as they're more definitive)
        const failurePatterns = [
            /❌.*FAIL/i,
            /✗.*failed/i,
            /💥.*failed/i, // Our comprehensive test failure message
            /test.*suite.*failed/i,
            /Failed:\s*[1-9]/i, // "Failed: 1" or higher (test results format)
            /test.*results.*failed.*[1-9]/i,
            /some.*tests.*failed/i,
            /\d+.*test.*failed/i // "X test failed" or similar
        ];

        // Check for failure patterns first (more specific)
        for (const pattern of failurePatterns) {
            if (pattern.test(output)) {
                return false;
            }
        }

        // Then check for success patterns
        for (const pattern of successPatterns) {
            if (pattern.test(output)) {
                return true;
            }
        }

        // Special case: if we see "Passed: X" with no failed count mentioned, it's likely a pass
        if (/Passed:\s*[1-9]/i.test(output) && !/Failed:\s*[1-9]/i.test(output)) {
            return true;
        }

        // If no clear patterns, assume failure to be safe
        return false;
    }

    /**
     * Run tests by category
     */
    async runTestCategory(categoryName, testFiles) {
        if (testFiles.length === 0) {
            return;
        }

        console.log(`\n${colors.bold}${colors.cyan}▶ ${categoryName.toUpperCase()} TESTS${colors.reset} ${colors.dim}(${testFiles.length} files)${colors.reset}`);
        console.log('─'.repeat(50));

        const categoryResults = [];

        for (const testFile of testFiles) {
            const result = await this.executeTestFile(testFile);
            categoryResults.push(result);

            // Small delay between tests to avoid overwhelming output
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const categoryPassed = categoryResults.filter(r => r.passed > 0).length;
        const categoryFailed = categoryResults.filter(r => r.failed > 0).length;

        console.log(`${colors.dim}Category summary: ${categoryPassed} passed, ${categoryFailed} failed${colors.reset}`);
    }

    /**
     * Print detailed results summary
     */
    printDetailedSummary() {
        this.results.executionTime = Date.now() - this.startTime;

        console.log('\n' + '═'.repeat(80));
        console.log(`${colors.bold}${colors.cyan}NFT STUDIO COMPREHENSIVE TEST RESULTS${colors.reset}`);
        console.log('═'.repeat(80));

        // Group results by category
        const categories = {};
        for (const suite of this.results.suites) {
            if (!categories[suite.category]) {
                categories[suite.category] = { passed: 0, failed: 0, total: 0, suites: [] };
            }
            categories[suite.category].passed += suite.passed;
            categories[suite.category].failed += suite.failed;
            categories[suite.category].total += suite.total;
            categories[suite.category].suites.push(suite);
        }

        // Print category summaries
        console.log(`\n${colors.bold}CATEGORY BREAKDOWN:${colors.reset}`);
        console.log('─'.repeat(80));

        Object.entries(categories).forEach(([category, stats]) => {
            const status = stats.failed === 0 ?
                `${colors.green}✓ PASS${colors.reset}` :
                `${colors.red}✗ FAIL${colors.reset}`;

            console.log(`${status} ${colors.bold}${category.toUpperCase()}${colors.reset}: ${stats.passed}/${stats.total} passed`);

            // Show failed tests for this category
            const failedSuites = stats.suites.filter(s => s.failed > 0);
            if (failedSuites.length > 0) {
                failedSuites.forEach(suite => {
                    console.log(`  ${colors.red}└─ ${suite.name}${colors.reset} ${colors.dim}(${suite.executionTime}ms)${colors.reset}`);
                    if (suite.error) {
                        console.log(`     ${colors.red}Error: ${suite.error.split('\n')[0]}${colors.reset}`);
                    }
                });
            }
        });

        // Overall summary
        console.log('\n' + '─'.repeat(80));
        console.log(`${colors.bold}OVERALL SUMMARY:${colors.reset}`);

        const passRate = this.results.total > 0 ?
            (this.results.passed / this.results.total * 100).toFixed(1) : 0;

        console.log(`Total Tests: ${colors.bold}${this.results.total}${colors.reset}`);
        console.log(`Passed: ${colors.green}${this.results.passed}${colors.reset}`);
        console.log(`Failed: ${colors.red}${this.results.failed}${colors.reset}`);
        console.log(`Pass Rate: ${colors.bold}${passRate}%${colors.reset}`);
        console.log(`Execution Time: ${colors.dim}${this.results.executionTime}ms${colors.reset}`);

        // Final status
        console.log('\n' + '═'.repeat(80));
        if (this.results.failed === 0) {
            console.log(`${colors.green}${colors.bold}🎉 ALL TESTS PASSED! 🎉${colors.reset}`);
        } else {
            console.log(`${colors.red}${colors.bold}❌ ${this.results.failed} TEST(S) FAILED${colors.reset}`);
        }
        console.log('═'.repeat(80));

        return this.results.failed === 0;
    }

    /**
     * Run all tests comprehensively
     */
    async runAll(options = {}) {
        console.log(`${colors.bold}${colors.cyan}NFT STUDIO COMPREHENSIVE TEST SUITE${colors.reset}`);
        console.log(`${colors.dim}Discovering and executing all test files...${colors.reset}\n`);

        const testCategories = this.findTestFiles();
        const totalFiles = Object.values(testCategories).reduce((sum, files) => sum + files.length, 0);

        if (totalFiles === 0) {
            console.log(`${colors.yellow}No test files found${colors.reset}`);
            return false;
        }

        console.log(`${colors.bold}Found ${totalFiles} test files across ${Object.keys(testCategories).filter(k => testCategories[k].length > 0).length} categories${colors.reset}`);

        // Run tests by category in logical order
        const categoryOrder = ['unit', 'integration', 'comprehensive', 'validation', 'regression', 'debug', 'summary', 'other'];

        for (const category of categoryOrder) {
            if (testCategories[category] && testCategories[category].length > 0) {
                await this.runTestCategory(category, testCategories[category]);

                // Break early if we have failures and fast-fail is enabled
                if (options.fastFail && this.results.failed > 0) {
                    console.log(`\n${colors.yellow}Fast-fail enabled, stopping execution due to failures${colors.reset}`);
                    break;
                }
            }
        }

        return this.printDetailedSummary();
    }

    /**
     * Run specific tests matching a pattern
     */
    async runPattern(pattern) {
        console.log(`${colors.bold}Running tests matching pattern: ${colors.cyan}${pattern}${colors.reset}\n`);

        const testCategories = this.findTestFiles();
        const matchingTests = [];

        Object.values(testCategories).forEach(files => {
            files.forEach(file => {
                if (file.name.includes(pattern) ||
                    file.path.includes(pattern) ||
                    file.category.includes(pattern)) {
                    matchingTests.push(file);
                }
            });
        });

        if (matchingTests.length === 0) {
            console.log(`${colors.yellow}No tests found matching pattern '${pattern}'${colors.reset}`);
            return false;
        }

        console.log(`${colors.bold}Found ${matchingTests.length} matching test(s)${colors.reset}\n`);

        for (const test of matchingTests) {
            await this.executeTestFile(test);
        }

        return this.printDetailedSummary();
    }

    /**
     * Quick health check - run critical tests only
     */
    async runHealthCheck() {
        console.log(`${colors.bold}${colors.cyan}NFT STUDIO HEALTH CHECK${colors.reset}`);
        console.log(`${colors.dim}Running critical tests only...${colors.reset}\n`);

        const criticalTests = [
            'effect-key-passing',
            'frontend-backend-contract',
            'effect-defaults',
            'effect-configurer'
        ];

        let anyRan = false;
        for (const testPattern of criticalTests) {
            const success = await this.runPattern(testPattern);
            anyRan = true;
            if (!success) break;
        }

        if (!anyRan) {
            console.log(`${colors.yellow}No critical tests found${colors.reset}`);
            return false;
        }

        return this.printDetailedSummary();
    }
}

// CLI Interface
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const runner = new ComprehensiveTestRunner();
    const args = process.argv.slice(2);

    async function main() {
        try {
            if (args.includes('--help') || args.includes('-h')) {
                console.log(`${colors.bold}NFT Studio Comprehensive Test Runner${colors.reset}

Usage:
  node comprehensive-runner.js [options] [pattern]

Options:
  --all              Run all tests (default)
  --health           Run critical tests only (health check)
  --fast-fail        Stop on first failure
  --pattern <name>   Run tests matching pattern
  --help, -h         Show this help

Examples:
  node comprehensive-runner.js                    # Run all tests
  node comprehensive-runner.js --health           # Health check
  node comprehensive-runner.js --pattern fuzz     # Run FuzzFlare tests
  node comprehensive-runner.js effect-key         # Run effect key tests
`);
                return;
            }

            const options = {
                fastFail: args.includes('--fast-fail')
            };

            if (args.includes('--health')) {
                const success = await runner.runHealthCheck();
                process.exit(success ? 0 : 1);
            } else if (args.includes('--pattern')) {
                const patternIndex = args.indexOf('--pattern');
                const pattern = args[patternIndex + 1];
                if (!pattern) {
                    console.error(`${colors.red}Error: --pattern requires a value${colors.reset}`);
                    process.exit(1);
                }
                const success = await runner.runPattern(pattern);
                process.exit(success ? 0 : 1);
            } else if (args.length > 0 && !args[0].startsWith('--')) {
                // Pattern provided directly
                const success = await runner.runPattern(args[0]);
                process.exit(success ? 0 : 1);
            } else {
                // Run all tests
                const success = await runner.runAll(options);
                process.exit(success ? 0 : 1);
            }
        } catch (error) {
            console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
            if (error.stack) {
                console.error(`${colors.dim}${error.stack}${colors.reset}`);
            }
            process.exit(1);
        }
    }

    main();
}

export { ComprehensiveTestRunner };