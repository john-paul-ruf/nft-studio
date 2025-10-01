/**
 * RegressionDetector - Detects performance regressions during refactoring
 * 
 * Monitors performance changes and alerts when refactoring introduces
 * performance regressions beyond acceptable thresholds.
 * 
 * REAL OBJECTS ONLY - Measures actual performance of real objects.
 */
class RegressionDetector {
    constructor(thresholds = {}) {
        this.thresholds = {
            // Default thresholds (percentage changes)
            executionTime: {
                warning: 15,    // 15% slower triggers warning
                critical: 30    // 30% slower triggers critical alert
            },
            memory: {
                warning: 20,    // 20% more memory triggers warning
                critical: 50    // 50% more memory triggers critical alert
            },
            ...thresholds
        };
        
        this.regressions = [];
        this.measurements = new Map();
    }

    /**
     * Analyze performance changes and detect regressions
     * @param {Object} baseline - Baseline performance metrics
     * @param {Object} current - Current performance metrics
     * @param {string} context - Context of the measurement (e.g., "after plugin extraction")
     * @returns {Object} Regression analysis results
     */
    analyzePerformance(baseline, current, context = 'performance analysis') {
        const analysis = {
            context,
            timestamp: new Date().toISOString(),
            overallStatus: 'PASS',
            regressions: [],
            improvements: [],
            warnings: [],
            summary: {
                totalChecks: 0,
                regressionCount: 0,
                warningCount: 0,
                improvementCount: 0
            }
        };

        // Analyze overall metrics
        if (baseline.overallMetrics && current.overallMetrics) {
            const overallAnalysis = this._analyzeMetricGroup(
                baseline.overallMetrics, 
                current.overallMetrics, 
                'Overall Performance'
            );
            this._mergeAnalysis(analysis, overallAnalysis);
        }

        // Analyze individual operations
        if (baseline.operations && current.operations) {
            for (const [operationName, baselineOp] of Object.entries(baseline.operations)) {
                const currentOp = current.operations[operationName];
                
                if (!currentOp) {
                    analysis.warnings.push({
                        type: 'MISSING_OPERATION',
                        operation: operationName,
                        message: `Operation ${operationName} not found in current measurements`
                    });
                    analysis.summary.warningCount++;
                    continue;
                }

                if (baselineOp.error || currentOp.error) {
                    analysis.warnings.push({
                        type: 'OPERATION_ERROR',
                        operation: operationName,
                        baselineError: baselineOp.error,
                        currentError: currentOp.error
                    });
                    analysis.summary.warningCount++;
                    continue;
                }

                const operationAnalysis = this._analyzeMetricGroup(
                    baselineOp, 
                    currentOp, 
                    `Operation: ${operationName}`
                );
                this._mergeAnalysis(analysis, operationAnalysis);
            }
        }

        // Determine overall status
        if (analysis.regressions.length > 0) {
            const criticalRegressions = analysis.regressions.filter(r => r.severity === 'CRITICAL');
            analysis.overallStatus = criticalRegressions.length > 0 ? 'CRITICAL' : 'WARNING';
        } else if (analysis.warnings.length > 0) {
            analysis.overallStatus = 'WARNING';
        } else {
            analysis.overallStatus = 'PASS';
        }

        // Store the analysis
        this.regressions.push(analysis);

        return analysis;
    }

    /**
     * Monitor continuous performance measurements
     * @param {string} measurementId - Unique identifier for the measurement series
     * @param {Object} metrics - Performance metrics
     * @param {Object} metadata - Additional metadata
     */
    recordMeasurement(measurementId, metrics, metadata = {}) {
        if (!this.measurements.has(measurementId)) {
            this.measurements.set(measurementId, []);
        }

        const measurement = {
            timestamp: new Date().toISOString(),
            metrics,
            metadata,
            id: `${measurementId}_${Date.now()}`
        };

        this.measurements.get(measurementId).push(measurement);

        // Keep only last 100 measurements per series
        const series = this.measurements.get(measurementId);
        if (series.length > 100) {
            series.splice(0, series.length - 100);
        }
    }

    /**
     * Detect trends in measurement series
     * @param {string} measurementId - Measurement series ID
     * @param {number} windowSize - Number of recent measurements to analyze
     * @returns {Object} Trend analysis
     */
    detectTrends(measurementId, windowSize = 10) {
        const series = this.measurements.get(measurementId);
        
        if (!series || series.length < windowSize) {
            return {
                error: `Insufficient data for trend analysis. Need at least ${windowSize} measurements, have ${series?.length || 0}`,
                trend: null
            };
        }

        const recentMeasurements = series.slice(-windowSize);
        const trends = {
            measurementId,
            windowSize,
            timespan: {
                start: recentMeasurements[0].timestamp,
                end: recentMeasurements[recentMeasurements.length - 1].timestamp
            },
            executionTime: this._calculateTrend(recentMeasurements, 'executionTime'),
            memory: this._calculateTrend(recentMeasurements, 'memoryDelta.heapUsed'),
            overall: 'STABLE'
        };

        // Determine overall trend
        const significantTrends = [];
        if (Math.abs(trends.executionTime.slope) > 0.1) {
            significantTrends.push(trends.executionTime.direction);
        }
        if (Math.abs(trends.memory.slope) > 1000) { // 1KB threshold
            significantTrends.push(trends.memory.direction);
        }

        if (significantTrends.length > 0) {
            const degradingTrends = significantTrends.filter(t => t === 'INCREASING');
            trends.overall = degradingTrends.length > 0 ? 'DEGRADING' : 'IMPROVING';
        }

        return { trend: trends, error: null };
    }

    /**
     * Generate regression report
     * @param {string} context - Report context
     * @returns {Object} Comprehensive regression report
     */
    generateRegressionReport(context = 'Refactoring Analysis') {
        const report = {
            context,
            generatedAt: new Date().toISOString(),
            summary: {
                totalAnalyses: this.regressions.length,
                criticalRegressions: 0,
                warnings: 0,
                improvements: 0,
                overallStatus: 'UNKNOWN'
            },
            regressionHistory: this.regressions,
            recommendations: [],
            thresholds: this.thresholds
        };

        // Calculate summary statistics
        for (const analysis of this.regressions) {
            const criticalRegressions = analysis.regressions.filter(r => r.severity === 'CRITICAL');
            report.summary.criticalRegressions += criticalRegressions.length;
            report.summary.warnings += analysis.warnings.length;
            report.summary.improvements += analysis.improvements.length;
        }

        // Determine overall status
        if (report.summary.criticalRegressions > 0) {
            report.summary.overallStatus = 'CRITICAL';
            report.recommendations.push('Address critical performance regressions before proceeding');
        } else if (report.summary.warnings > 0) {
            report.summary.overallStatus = 'WARNING';
            report.recommendations.push('Review performance warnings and consider optimizations');
        } else {
            report.summary.overallStatus = 'PASS';
            report.recommendations.push('Performance is within acceptable thresholds');
        }

        // Add specific recommendations
        if (report.summary.improvements > 0) {
            report.recommendations.push('Document performance improvements for future reference');
        }

        return report;
    }

    /**
     * Set custom thresholds
     * @param {Object} newThresholds - New threshold configuration
     */
    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    /**
     * Get current thresholds
     * @returns {Object} Current threshold configuration
     */
    getThresholds() {
        return { ...this.thresholds };
    }

    /**
     * Clear all regression data
     */
    clearData() {
        this.regressions = [];
        this.measurements.clear();
    }

    /**
     * Export regression data
     * @returns {Object} Exportable regression data
     */
    exportData() {
        return {
            exportTimestamp: new Date().toISOString(),
            thresholds: this.thresholds,
            regressions: this.regressions,
            measurements: Object.fromEntries(this.measurements)
        };
    }

    /**
     * Analyze a group of metrics
     * @private
     */
    _analyzeMetricGroup(baseline, current, groupName) {
        const analysis = {
            regressions: [],
            improvements: [],
            warnings: [],
            summary: { totalChecks: 0, regressionCount: 0, warningCount: 0, improvementCount: 0 }
        };

        // Analyze execution time
        if (baseline.executionTime !== undefined && current.executionTime !== undefined) {
            const timeAnalysis = this._analyzeMetric(
                baseline.executionTime,
                current.executionTime,
                this.thresholds.executionTime,
                `${groupName} - Execution Time`,
                'ms'
            );
            this._categorizeMetricAnalysis(analysis, timeAnalysis);
        }

        // Analyze memory usage
        const baselineMemory = baseline.memoryDelta?.heapUsed || baseline.memoryFootprint?.heapUsed;
        const currentMemory = current.memoryDelta?.heapUsed || current.memoryFootprint?.heapUsed;
        
        if (baselineMemory !== undefined && currentMemory !== undefined) {
            const memoryAnalysis = this._analyzeMetric(
                baselineMemory,
                currentMemory,
                this.thresholds.memory,
                `${groupName} - Memory Usage`,
                'bytes'
            );
            this._categorizeMetricAnalysis(analysis, memoryAnalysis);
        }

        return analysis;
    }

    /**
     * Analyze a single metric
     * @private
     */
    _analyzeMetric(baseline, current, threshold, metricName, unit) {
        const absoluteChange = current - baseline;
        const percentageChange = baseline !== 0 ? (absoluteChange / baseline) * 100 : 0;

        const analysis = {
            metric: metricName,
            baseline,
            current,
            absoluteChange,
            percentageChange,
            unit,
            status: 'UNCHANGED',
            severity: 'INFO'
        };

        // Determine status and severity
        if (percentageChange > threshold.critical) {
            analysis.status = 'REGRESSION';
            analysis.severity = 'CRITICAL';
        } else if (percentageChange > threshold.warning) {
            analysis.status = 'REGRESSION';
            analysis.severity = 'WARNING';
        } else if (percentageChange < -threshold.warning) {
            analysis.status = 'IMPROVEMENT';
            analysis.severity = 'INFO';
        }

        return analysis;
    }

    /**
     * Categorize metric analysis into appropriate buckets
     * @private
     */
    _categorizeMetricAnalysis(analysis, metricAnalysis) {
        analysis.summary.totalChecks++;

        if (metricAnalysis.status === 'REGRESSION') {
            analysis.regressions.push(metricAnalysis);
            analysis.summary.regressionCount++;
        } else if (metricAnalysis.status === 'IMPROVEMENT') {
            analysis.improvements.push(metricAnalysis);
            analysis.summary.improvementCount++;
        }

        if (metricAnalysis.severity === 'WARNING') {
            analysis.summary.warningCount++;
        }
    }

    /**
     * Merge analysis results
     * @private
     */
    _mergeAnalysis(target, source) {
        target.regressions.push(...source.regressions);
        target.improvements.push(...source.improvements);
        target.warnings.push(...source.warnings);
        
        target.summary.totalChecks += source.summary.totalChecks;
        target.summary.regressionCount += source.summary.regressionCount;
        target.summary.warningCount += source.summary.warningCount;
        target.summary.improvementCount += source.summary.improvementCount;
    }

    /**
     * Calculate trend for a metric over time
     * @private
     */
    _calculateTrend(measurements, metricPath) {
        const values = measurements.map(m => this._getNestedValue(m.metrics, metricPath)).filter(v => v !== undefined);
        
        if (values.length < 2) {
            return { slope: 0, direction: 'STABLE', confidence: 0 };
        }

        // Simple linear regression
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        return {
            slope,
            direction: slope > 0.1 ? 'INCREASING' : slope < -0.1 ? 'DECREASING' : 'STABLE',
            confidence: Math.min(Math.abs(slope) * 10, 1) // Simple confidence metric
        };
    }

    /**
     * Get nested value from object using dot notation
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}

export default RegressionDetector;