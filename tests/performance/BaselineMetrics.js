/**
 * BaselineMetrics - Captures and manages performance baselines
 * 
 * Records current performance metrics for god objects to establish
 * baselines before refactoring begins.
 * 
 * REAL OBJECTS ONLY - Measures actual performance of real objects.
 */
class BaselineMetrics {
    constructor() {
        this.baselines = new Map();
        this.measurements = new Map();
    }

    /**
     * Capture baseline metrics for a god object
     * @param {string} objectName - Name of the god object
     * @param {Object} objectInstance - Real instance of the god object
     * @param {Array} testOperations - Operations to measure
     * @returns {Promise<Object>} Baseline metrics
     */
    async captureBaseline(objectName, objectInstance, testOperations = []) {
        console.log(`📊 Capturing baseline metrics for ${objectName}...`);
        
        const baseline = {
            objectName,
            timestamp: new Date().toISOString(),
            systemInfo: this._getSystemInfo(),
            objectInfo: this._getObjectInfo(objectInstance),
            operations: {},
            overallMetrics: {}
        };

        // Capture overall object metrics
        baseline.overallMetrics = await this._measureObjectMetrics(objectInstance);

        // Measure specific operations if provided
        for (const operation of testOperations) {
            try {
                const operationMetrics = await this._measureOperation(objectInstance, operation);
                baseline.operations[operation.name] = operationMetrics;
                console.log(`  ✅ ${operation.name}: ${operationMetrics.executionTime.toFixed(2)}ms`);
            } catch (error) {
                console.log(`  ❌ ${operation.name}: ${error.message}`);
                baseline.operations[operation.name] = {
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        }

        // Store baseline
        this.baselines.set(objectName, baseline);
        
        console.log(`✅ Baseline captured for ${objectName}`);
        return baseline;
    }

    /**
     * Get stored baseline for an object
     * @param {string} objectName - Name of the object
     * @returns {Object|null} Baseline metrics or null if not found
     */
    getBaseline(objectName) {
        return this.baselines.get(objectName) || null;
    }

    /**
     * Compare current metrics against baseline
     * @param {string} objectName - Name of the object
     * @param {Object} currentMetrics - Current performance metrics
     * @returns {Object} Comparison results
     */
    compareToBaseline(objectName, currentMetrics) {
        const baseline = this.getBaseline(objectName);
        
        if (!baseline) {
            return {
                error: `No baseline found for ${objectName}`,
                comparison: null
            };
        }

        const comparison = {
            objectName,
            baselineTimestamp: baseline.timestamp,
            currentTimestamp: new Date().toISOString(),
            overallComparison: this._compareMetrics(baseline.overallMetrics, currentMetrics.overallMetrics || {}),
            operationComparisons: {},
            summary: {
                improved: 0,
                degraded: 0,
                unchanged: 0,
                errors: 0
            }
        };

        // Compare operations
        for (const [operationName, baselineOp] of Object.entries(baseline.operations)) {
            const currentOp = currentMetrics.operations?.[operationName];
            
            if (!currentOp) {
                comparison.operationComparisons[operationName] = {
                    status: 'MISSING',
                    message: 'Operation not found in current metrics'
                };
                comparison.summary.errors++;
                continue;
            }

            if (baselineOp.error || currentOp.error) {
                comparison.operationComparisons[operationName] = {
                    status: 'ERROR',
                    baseline: baselineOp,
                    current: currentOp
                };
                comparison.summary.errors++;
                continue;
            }

            const opComparison = this._compareMetrics(baselineOp, currentOp);
            comparison.operationComparisons[operationName] = opComparison;

            // Categorize the change
            if (opComparison.executionTime.percentageChange < -5) {
                comparison.summary.improved++;
            } else if (opComparison.executionTime.percentageChange > 5) {
                comparison.summary.degraded++;
            } else {
                comparison.summary.unchanged++;
            }
        }

        return { comparison, error: null };
    }

    /**
     * Generate performance report
     * @param {string} objectName - Name of the object
     * @returns {Object} Performance report
     */
    generateReport(objectName) {
        const baseline = this.getBaseline(objectName);
        
        if (!baseline) {
            return {
                error: `No baseline found for ${objectName}`,
                report: null
            };
        }

        const report = {
            objectName,
            baselineTimestamp: baseline.timestamp,
            systemInfo: baseline.systemInfo,
            objectInfo: baseline.objectInfo,
            
            summary: {
                totalOperations: Object.keys(baseline.operations).length,
                successfulOperations: Object.values(baseline.operations).filter(op => !op.error).length,
                failedOperations: Object.values(baseline.operations).filter(op => op.error).length
            },
            
            performanceProfile: {
                fastestOperation: null,
                slowestOperation: null,
                averageExecutionTime: 0,
                memoryProfile: baseline.overallMetrics
            },
            
            operations: baseline.operations
        };

        // Calculate performance profile
        const successfulOps = Object.entries(baseline.operations)
            .filter(([_, op]) => !op.error)
            .map(([name, op]) => ({ name, ...op }));

        if (successfulOps.length > 0) {
            const sortedByTime = successfulOps.sort((a, b) => a.executionTime - b.executionTime);
            report.performanceProfile.fastestOperation = sortedByTime[0];
            report.performanceProfile.slowestOperation = sortedByTime[sortedByTime.length - 1];
            report.performanceProfile.averageExecutionTime = 
                successfulOps.reduce((sum, op) => sum + op.executionTime, 0) / successfulOps.length;
        }

        return { report, error: null };
    }

    /**
     * Export all baselines to JSON
     * @returns {Object} All baseline data
     */
    exportBaselines() {
        const exported = {
            exportTimestamp: new Date().toISOString(),
            totalBaselines: this.baselines.size,
            baselines: {}
        };

        for (const [objectName, baseline] of this.baselines) {
            exported.baselines[objectName] = baseline;
        }

        return exported;
    }

    /**
     * Import baselines from JSON
     * @param {Object} baselineData - Exported baseline data
     */
    importBaselines(baselineData) {
        if (!baselineData.baselines) {
            throw new Error('Invalid baseline data format');
        }

        for (const [objectName, baseline] of Object.entries(baselineData.baselines)) {
            this.baselines.set(objectName, baseline);
        }

        console.log(`📊 Imported ${Object.keys(baselineData.baselines).length} baselines`);
    }

    /**
     * Clear all baselines
     */
    clearBaselines() {
        this.baselines.clear();
        this.measurements.clear();
        console.log('🧹 All baselines cleared');
    }

    /**
     * Get system information
     * @private
     */
    _getSystemInfo() {
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            memoryTotal: process.memoryUsage().heapTotal,
            cpuCount: require('os').cpus().length,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get object information
     * @private
     */
    _getObjectInfo(objectInstance) {
        return {
            type: objectInstance.constructor.name,
            methods: Object.getOwnPropertyNames(Object.getPrototypeOf(objectInstance))
                .filter(name => typeof objectInstance[name] === 'function'),
            properties: Object.keys(objectInstance),
            methodCount: Object.getOwnPropertyNames(Object.getPrototypeOf(objectInstance))
                .filter(name => typeof objectInstance[name] === 'function').length,
            propertyCount: Object.keys(objectInstance).length
        };
    }

    /**
     * Measure overall object metrics
     * @private
     */
    async _measureObjectMetrics(objectInstance) {
        const startMemory = process.memoryUsage();
        const startTime = process.hrtime.bigint();

        // Perform basic object operations
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(objectInstance))
            .filter(name => typeof objectInstance[name] === 'function');
        
        const properties = Object.keys(objectInstance);

        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();

        return {
            introspectionTime: Number(endTime - startTime) / 1000000, // Convert to milliseconds
            memoryFootprint: {
                heapUsed: endMemory.heapUsed,
                heapTotal: endMemory.heapTotal,
                external: endMemory.external
            },
            objectSize: {
                methodCount: methods.length,
                propertyCount: properties.length
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Measure a specific operation
     * @private
     */
    async _measureOperation(objectInstance, operation) {
        const startMemory = process.memoryUsage();
        const startTime = process.hrtime.bigint();

        let result, error = null;

        try {
            // Execute the operation
            if (typeof objectInstance[operation.method] === 'function') {
                result = await objectInstance[operation.method](...(operation.args || []));
            } else {
                throw new Error(`Method ${operation.method} not found`);
            }
        } catch (err) {
            error = err;
        }

        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();

        return {
            operationName: operation.name,
            method: operation.method,
            args: operation.args || [],
            executionTime: Number(endTime - startTime) / 1000000, // Convert to milliseconds
            memoryDelta: {
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal
            },
            result: error ? null : result,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Compare two metric objects
     * @private
     */
    _compareMetrics(baseline, current) {
        const comparison = {};

        // Compare execution time
        if (baseline.executionTime !== undefined && current.executionTime !== undefined) {
            const timeDiff = current.executionTime - baseline.executionTime;
            const timePercentage = (timeDiff / baseline.executionTime) * 100;
            
            comparison.executionTime = {
                baseline: baseline.executionTime,
                current: current.executionTime,
                absoluteChange: timeDiff,
                percentageChange: timePercentage,
                status: timePercentage > 5 ? 'DEGRADED' : timePercentage < -5 ? 'IMPROVED' : 'UNCHANGED'
            };
        }

        // Compare memory usage
        if (baseline.memoryDelta && current.memoryDelta) {
            const memDiff = current.memoryDelta.heapUsed - baseline.memoryDelta.heapUsed;
            const memPercentage = baseline.memoryDelta.heapUsed !== 0 
                ? (memDiff / baseline.memoryDelta.heapUsed) * 100 
                : 0;
            
            comparison.memory = {
                baseline: baseline.memoryDelta.heapUsed,
                current: current.memoryDelta.heapUsed,
                absoluteChange: memDiff,
                percentageChange: memPercentage,
                status: memPercentage > 10 ? 'DEGRADED' : memPercentage < -10 ? 'IMPROVED' : 'UNCHANGED'
            };
        }

        return comparison;
    }
}

export default BaselineMetrics;