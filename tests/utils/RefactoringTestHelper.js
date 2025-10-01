/**
 * RefactoringTestHelper - Specialized utilities for refactoring tests
 * 
 * Provides utilities specifically designed to support the god object
 * refactoring process with before/after comparisons and validation.
 * 
 * REAL OBJECTS ONLY - No mocks, just real object testing and validation.
 */
import TestDataBuilder from './TestDataBuilder.js';
import AssertionHelpers from './AssertionHelpers.js';

class RefactoringTestHelper {
    constructor() {
        this.dataBuilder = new TestDataBuilder();
        this.assertions = new AssertionHelpers();
        this.refactoringHistory = [];
        this.performanceBaselines = new Map();
    }

    /**
     * Create a refactoring test scenario
     * @param {string} scenarioName - Name of the scenario
     * @param {Object} config - Scenario configuration
     * @returns {Object} Test scenario
     */
    createRefactoringScenario(scenarioName, config = {}) {
        const scenario = {
            name: scenarioName,
            id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created: new Date().toISOString(),
            config: {
                // Default configuration
                validateBehavior: true,
                validatePerformance: true,
                validateInterface: true,
                trackMetrics: true,
                ...config
            },
            
            // Test data
            beforeState: null,
            afterState: null,
            
            // Test objects
            originalObject: null,
            refactoredObjects: [],
            
            // Validation results
            validationResults: {
                behavior: null,
                performance: null,
                interface: null
            },
            
            // Metrics
            metrics: {
                startTime: null,
                endTime: null,
                memoryUsage: null,
                testDuration: null
            }
        };
        
        this.refactoringHistory.push(scenario);
        return scenario;
    }

    /**
     * Set up before state for refactoring test
     * @param {Object} scenario - Test scenario
     * @param {Object} originalObject - Original god object
     * @param {Object} testData - Test data
     */
    setupBeforeState(scenario, originalObject, testData = null) {
        scenario.beforeState = {
            timestamp: new Date().toISOString(),
            object: this._captureObjectState(originalObject),
            testData: testData || this.dataBuilder.buildScenario('simple-project'),
            metrics: this._capturePerformanceMetrics()
        };
        
        scenario.originalObject = originalObject;
        scenario.metrics.startTime = Date.now();
    }

    /**
     * Set up after state for refactoring test
     * @param {Object} scenario - Test scenario
     * @param {Array} refactoredObjects - Array of refactored objects
     * @param {Object} testData - Test data after refactoring
     */
    setupAfterState(scenario, refactoredObjects, testData = null) {
        scenario.afterState = {
            timestamp: new Date().toISOString(),
            objects: refactoredObjects.map(obj => this._captureObjectState(obj)),
            testData: testData || scenario.beforeState.testData,
            metrics: this._capturePerformanceMetrics()
        };
        
        scenario.refactoredObjects = refactoredObjects;
        scenario.metrics.endTime = Date.now();
        scenario.metrics.testDuration = scenario.metrics.endTime - scenario.metrics.startTime;
    }

    /**
     * Validate that refactoring preserves behavior
     * @param {Object} scenario - Test scenario
     * @param {Array} testCases - Array of test cases to validate
     * @returns {Object} Validation results
     */
    async validateBehaviorPreservation(scenario, testCases = []) {
        const results = {
            passed: 0,
            failed: 0,
            errors: [],
            details: []
        };

        // Default test cases if none provided
        if (testCases.length === 0) {
            testCases = this._generateDefaultTestCases(scenario);
        }

        for (const testCase of testCases) {
            try {
                const originalResult = await this._executeTestCase(scenario.originalObject, testCase);
                const refactoredResult = await this._executeTestCaseOnRefactoredObjects(scenario.refactoredObjects, testCase);
                
                if (this._compareResults(originalResult, refactoredResult)) {
                    results.passed++;
                    results.details.push({
                        testCase: testCase.name,
                        status: 'PASSED',
                        originalResult,
                        refactoredResult
                    });
                } else {
                    results.failed++;
                    results.errors.push(`Behavior mismatch in test case: ${testCase.name}`);
                    results.details.push({
                        testCase: testCase.name,
                        status: 'FAILED',
                        originalResult,
                        refactoredResult,
                        reason: 'Results do not match'
                    });
                }
            } catch (error) {
                results.failed++;
                results.errors.push(`Error in test case ${testCase.name}: ${error.message}`);
                results.details.push({
                    testCase: testCase.name,
                    status: 'ERROR',
                    error: error.message
                });
            }
        }

        scenario.validationResults.behavior = results;
        return results;
    }

    /**
     * Validate that refactoring maintains performance characteristics
     * @param {Object} scenario - Test scenario
     * @param {Object} thresholds - Performance thresholds
     * @returns {Object} Performance validation results
     */
    validatePerformance(scenario, thresholds = {}) {
        const defaultThresholds = {
            memoryIncrease: { max: 20 }, // Max 20% memory increase
            executionTime: { max: 150 }, // Max 150% of original time
            ...thresholds
        };

        const beforeMetrics = scenario.beforeState.metrics;
        const afterMetrics = scenario.afterState.metrics;
        
        const results = {
            passed: true,
            violations: [],
            metrics: {
                before: beforeMetrics,
                after: afterMetrics,
                changes: {}
            }
        };

        // Calculate changes
        for (const [metric, beforeValue] of Object.entries(beforeMetrics)) {
            if (afterMetrics[metric] !== undefined) {
                const change = ((afterMetrics[metric] - beforeValue) / beforeValue) * 100;
                results.metrics.changes[metric] = {
                    absolute: afterMetrics[metric] - beforeValue,
                    percentage: change
                };
            }
        }

        // Check thresholds
        for (const [metric, threshold] of Object.entries(defaultThresholds)) {
            const change = results.metrics.changes[metric];
            if (change) {
                if (threshold.max !== undefined && change.percentage > threshold.max) {
                    results.passed = false;
                    results.violations.push(`${metric} increased by ${change.percentage.toFixed(2)}%, exceeding threshold of ${threshold.max}%`);
                }
                
                if (threshold.min !== undefined && change.percentage < threshold.min) {
                    results.passed = false;
                    results.violations.push(`${metric} decreased by ${Math.abs(change.percentage).toFixed(2)}%, below threshold of ${threshold.min}%`);
                }
            }
        }

        scenario.validationResults.performance = results;
        return results;
    }

    /**
     * Validate that refactored objects implement expected interfaces
     * @param {Object} scenario - Test scenario
     * @param {Object} expectedInterfaces - Expected interface definitions
     * @returns {Object} Interface validation results
     */
    validateInterfaces(scenario, expectedInterfaces = {}) {
        const results = {
            passed: 0,
            failed: 0,
            errors: [],
            details: []
        };

        for (const [objectName, expectedInterface] of Object.entries(expectedInterfaces)) {
            const refactoredObject = scenario.refactoredObjects.find(obj => obj.constructor.name === objectName);
            
            if (!refactoredObject) {
                results.failed++;
                results.errors.push(`Expected refactored object '${objectName}' not found`);
                continue;
            }

            try {
                this.assertions.assertServiceInterface(refactoredObject, expectedInterface.methods || []);
                results.passed++;
                results.details.push({
                    object: objectName,
                    status: 'PASSED',
                    interface: expectedInterface
                });
            } catch (error) {
                results.failed++;
                results.errors.push(`Interface validation failed for '${objectName}': ${error.message}`);
                results.details.push({
                    object: objectName,
                    status: 'FAILED',
                    interface: expectedInterface,
                    error: error.message
                });
            }
        }

        scenario.validationResults.interface = results;
        return results;
    }

    /**
     * Generate a comprehensive refactoring report
     * @param {Object} scenario - Test scenario
     * @returns {Object} Comprehensive report
     */
    generateRefactoringReport(scenario) {
        const report = {
            scenario: {
                name: scenario.name,
                id: scenario.id,
                created: scenario.created,
                duration: scenario.metrics.testDuration
            },
            
            summary: {
                overallStatus: 'UNKNOWN',
                behaviorPreserved: scenario.validationResults.behavior?.passed > 0,
                performanceAcceptable: scenario.validationResults.performance?.passed,
                interfacesValid: scenario.validationResults.interface?.passed > 0
            },
            
            details: {
                behavior: scenario.validationResults.behavior,
                performance: scenario.validationResults.performance,
                interface: scenario.validationResults.interface
            },
            
            metrics: scenario.metrics,
            
            recommendations: []
        };

        // Determine overall status
        const allValidationsPassed = report.summary.behaviorPreserved && 
                                   report.summary.performanceAcceptable && 
                                   report.summary.interfacesValid;
        
        report.summary.overallStatus = allValidationsPassed ? 'PASSED' : 'FAILED';

        // Generate recommendations
        if (!report.summary.behaviorPreserved) {
            report.recommendations.push('Review behavior validation failures and ensure all functionality is preserved');
        }
        
        if (!report.summary.performanceAcceptable) {
            report.recommendations.push('Optimize refactored code to meet performance requirements');
        }
        
        if (!report.summary.interfacesValid) {
            report.recommendations.push('Ensure all refactored objects implement required interfaces');
        }

        return report;
    }

    /**
     * Create a test case for behavior validation
     * @param {string} name - Test case name
     * @param {string} method - Method to test
     * @param {Array} args - Method arguments
     * @param {*} expectedResult - Expected result
     * @returns {Object} Test case
     */
    createTestCase(name, method, args = [], expectedResult = null) {
        return {
            name,
            method,
            args,
            expectedResult,
            id: `testcase_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        };
    }

    /**
     * Set performance baseline for comparison
     * @param {string} operation - Operation name
     * @param {Object} metrics - Performance metrics
     */
    setPerformanceBaseline(operation, metrics) {
        this.performanceBaselines.set(operation, {
            ...metrics,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get performance baseline
     * @param {string} operation - Operation name
     * @returns {Object|null} Baseline metrics
     */
    getPerformanceBaseline(operation) {
        return this.performanceBaselines.get(operation) || null;
    }

    /**
     * Compare two real objects for structural similarity
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @returns {Object} Comparison results
     */
    compareObjectStructures(obj1, obj2) {
        const structure1 = this._captureObjectState(obj1);
        const structure2 = this._captureObjectState(obj2);
        
        return {
            methodsMatch: this._arraysEqual(structure1.methods, structure2.methods),
            propertiesMatch: this._arraysEqual(structure1.properties, structure2.properties),
            typeMatch: structure1.type === structure2.type,
            details: {
                obj1: structure1,
                obj2: structure2,
                methodDifferences: this._arrayDifferences(structure1.methods, structure2.methods),
                propertyDifferences: this._arrayDifferences(structure1.properties, structure2.properties)
            }
        };
    }

    /**
     * Measure execution time of a real function
     * @param {Function} fn - Function to measure
     * @param {Array} args - Function arguments
     * @returns {Object} Execution results with timing
     */
    async measureExecutionTime(fn, args = []) {
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage();
        
        let result, error = null;
        
        try {
            result = await fn(...args);
        } catch (err) {
            error = err;
        }
        
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        return {
            result,
            error,
            executionTime: Number(endTime - startTime) / 1000000, // Convert to milliseconds
            memoryDelta: {
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Clean up test resources
     */
    cleanup() {
        this.assertions.clearFailureMessages();
        this.refactoringHistory = [];
        this.performanceBaselines.clear();
    }

    /**
     * Get refactoring history
     * @returns {Array} Array of refactoring scenarios
     */
    getRefactoringHistory() {
        return [...this.refactoringHistory];
    }

    /**
     * Capture object state for comparison
     * @private
     */
    _captureObjectState(obj) {
        return {
            type: obj.constructor.name,
            methods: Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).filter(name => typeof obj[name] === 'function'),
            properties: Object.keys(obj),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Capture performance metrics
     * @private
     */
    _capturePerformanceMetrics() {
        const memUsage = process.memoryUsage();
        return {
            memoryUsage: memUsage.heapUsed,
            memoryTotal: memUsage.heapTotal,
            cpuTime: process.cpuUsage(),
            timestamp: Date.now()
        };
    }

    /**
     * Generate default test cases based on scenario
     * @private
     */
    _generateDefaultTestCases(scenario) {
        const testCases = [];
        
        if (scenario.originalObject) {
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(scenario.originalObject))
                .filter(name => typeof scenario.originalObject[name] === 'function' && !name.startsWith('_'));
            
            methods.forEach(method => {
                testCases.push(this.createTestCase(
                    `Default test for ${method}`,
                    method,
                    [],
                    null
                ));
            });
        }
        
        return testCases;
    }

    /**
     * Execute test case on original object
     * @private
     */
    async _executeTestCase(obj, testCase) {
        try {
            const result = await obj[testCase.method](...testCase.args);
            return { success: true, result, error: null };
        } catch (error) {
            return { success: false, result: null, error: error.message };
        }
    }

    /**
     * Execute test case on refactored objects
     * @private
     */
    async _executeTestCaseOnRefactoredObjects(objects, testCase) {
        // Find the object that has the method
        const targetObject = objects.find(obj => typeof obj[testCase.method] === 'function');
        
        if (!targetObject) {
            return { success: false, result: null, error: `Method ${testCase.method} not found in refactored objects` };
        }
        
        return this._executeTestCase(targetObject, testCase);
    }

    /**
     * Compare test results
     * @private
     */
    _compareResults(original, refactored) {
        // If both failed, compare error messages
        if (!original.success && !refactored.success) {
            return original.error === refactored.error;
        }
        
        // If success status differs, they don't match
        if (original.success !== refactored.success) {
            return false;
        }
        
        // Compare results (deep comparison)
        return JSON.stringify(original.result) === JSON.stringify(refactored.result);
    }

    /**
     * Check if two arrays are equal
     * @private
     */
    _arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        return arr1.every(item => arr2.includes(item)) && arr2.every(item => arr1.includes(item));
    }

    /**
     * Find differences between two arrays
     * @private
     */
    _arrayDifferences(arr1, arr2) {
        return {
            inFirstOnly: arr1.filter(item => !arr2.includes(item)),
            inSecondOnly: arr2.filter(item => !arr1.includes(item))
        };
    }
}

export default RefactoringTestHelper;