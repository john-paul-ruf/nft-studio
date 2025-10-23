/**
 * EffectsPanelLogger Service - Phase 4.5.1
 * 
 * Comprehensive logging wrapper for the EffectsPanel refactoring.
 * Provides structured logging for user actions, performance metrics, IPC calls, and errors.
 * 
 * Features:
 * - Log level filtering (debug, info, warn, error)
 * - Aggregates logs for export (bug reports)
 * - Emits logging events via EventBusService
 * - Enables/disables logging dynamically
 * - Performance tracking with timestamps
 * 
 * @class EffectsPanelLogger
 */

export class EffectsPanelLogger {
    constructor({
        eventBusService = null,
        enableDebug = false,
        maxLogsStored = 500,
        exportFormat = 'json'
    } = {}) {
        this.eventBusService = eventBusService;
        this.enableDebug = enableDebug;
        this.maxLogsStored = maxLogsStored;
        this.exportFormat = exportFormat;

        // Log storage
        this.logs = [];
        this.logIndex = 0;

        // Log levels
        this.LOG_LEVELS = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
        };

        this.currentLevel = enableDebug ? this.LOG_LEVELS.DEBUG : this.LOG_LEVELS.INFO;

        // Performance tracking
        this.performanceMarkers = new Map();

        // Statistics
        this.stats = {
            totalActions: 0,
            actionsByType: {},
            totalIPCCalls: 0,
            totalErrors: 0,
            startTime: Date.now(),
        };
    }

    /**
     * Add a log entry
     * @private
     */
    _addLog(level, message, data = {}, context = {}) {
        const timestamp = Date.now();
        const logEntry = {
            id: this.logIndex++,
            level,
            levelName: Object.keys(this.LOG_LEVELS).find(k => this.LOG_LEVELS[k] === level),
            message,
            data,
            context,
            timestamp,
        };

        // Store log
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogsStored) {
            this.logs.shift();
        }

        // Console output in development
        if (process.env.NODE_ENV === 'development') {
            const consoleMethod = logEntry.levelName.toLowerCase() === 'debug' ? 'debug' :
                logEntry.levelName.toLowerCase() === 'info' ? 'info' :
                logEntry.levelName.toLowerCase() === 'warn' ? 'warn' : 'error';
            console[consoleMethod](`[EffectsPanel:${logEntry.levelName}] ${message}`, data);
        }

        // Emit event if event bus available
        if (this.eventBusService) {
            try {
                this.eventBusService.emit('effectspanel:log', logEntry);
            } catch (err) {
                console.error('Failed to emit log event:', err);
            }
        }

        return logEntry;
    }

    /**
     * Log a user action
     * @param {string} actionType - Type of action (e.g., 'effect:add', 'effect:delete')
     * @param {string} description - Human-readable description
     * @param {Object} metadata - Additional metadata
     */
    logAction(actionType, description, metadata = {}) {
        if (this.currentLevel > this.LOG_LEVELS.INFO) return;

        // Update statistics
        this.stats.totalActions++;
        this.stats.actionsByType[actionType] = (this.stats.actionsByType[actionType] || 0) + 1;

        return this._addLog(this.LOG_LEVELS.INFO, description, metadata, {
            type: 'action',
            actionType,
        });
    }

    /**
     * Log a performance metric
     * @param {string} metric - Metric name
     * @param {number} duration - Duration in milliseconds
     * @param {Object} metadata - Additional metadata
     */
    logPerformance(metric, duration, metadata = {}) {
        if (this.currentLevel > this.LOG_LEVELS.INFO) return;

        const isSlowOperation = duration > 100; // Flag if slower than 100ms
        const level = isSlowOperation ? this.LOG_LEVELS.WARN : this.LOG_LEVELS.INFO;

        return this._addLog(level, `Performance: ${metric}`, {
            metric,
            duration,
            isSlow: isSlowOperation,
            ...metadata
        }, {
            type: 'performance',
        });
    }

    /**
     * Start a performance marker
     * @param {string} markerName - Name of the marker
     */
    startPerformanceMarker(markerName) {
        this.performanceMarkers.set(markerName, Date.now());
    }

    /**
     * End a performance marker and log the result
     * @param {string} markerName - Name of the marker
     * @param {Object} metadata - Additional metadata
     */
    endPerformanceMarker(markerName, metadata = {}) {
        const startTime = this.performanceMarkers.get(markerName);
        if (!startTime) {
            console.warn(`Performance marker '${markerName}' not started`);
            return null;
        }

        const duration = Date.now() - startTime;
        this.performanceMarkers.delete(markerName);

        return this.logPerformance(markerName, duration, metadata);
    }

    /**
     * Log an IPC call
     * @param {string} channel - IPC channel name
     * @param {string} direction - 'send' or 'invoke'
     * @param {Object} payload - Request payload
     * @param {Object} response - Response data (optional)
     * @param {number} duration - Duration in milliseconds
     * @param {Error} error - Error if call failed (optional)
     */
    logIPCCall(channel, direction, payload, response = null, duration = 0, error = null) {
        if (this.currentLevel > this.LOG_LEVELS.INFO) return;

        this.stats.totalIPCCalls++;

        const level = error ? this.LOG_LEVELS.WARN : this.LOG_LEVELS.INFO;

        return this._addLog(level, `IPC: ${direction.toUpperCase()} ${channel}`, {
            channel,
            direction,
            payloadSize: JSON.stringify(payload).length,
            responseSize: response ? JSON.stringify(response).length : 0,
            duration,
            success: !error,
            errorMessage: error?.message,
        }, {
            type: 'ipc',
        });
    }

    /**
     * Log an error
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     */
    logError(message, error = null, context = {}) {
        this.stats.totalErrors++;

        return this._addLog(this.LOG_LEVELS.ERROR, message, {
            errorMessage: error?.message,
            errorStack: error?.stack,
            ...context
        }, {
            type: 'error',
        });
    }

    /**
     * Log a debug message
     * @param {string} message - Debug message
     * @param {Object} data - Additional data
     */
    logDebug(message, data = {}) {
        if (this.currentLevel > this.LOG_LEVELS.DEBUG) return;

        return this._addLog(this.LOG_LEVELS.DEBUG, message, data, {
            type: 'debug',
        });
    }

    /**
     * Set the current log level
     * @param {number|string} level - Log level (number or 'DEBUG', 'INFO', 'WARN', 'ERROR')
     */
    setLogLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = this.LOG_LEVELS[level.toUpperCase()] ?? this.LOG_LEVELS.INFO;
        } else if (typeof level === 'number') {
            this.currentLevel = level;
        }
    }

    /**
     * Enable/disable debug logging
     * @param {boolean} enable
     */
    setDebugEnabled(enable) {
        this.enableDebug = enable;
        this.currentLevel = enable ? this.LOG_LEVELS.DEBUG : this.LOG_LEVELS.INFO;
    }

    /**
     * Get all stored logs
     * @returns {Array}
     */
    getLogs() {
        return [...this.logs];
    }

    /**
     * Get logs filtered by level
     * @param {number|string} level - Log level
     * @returns {Array}
     */
    getLogsByLevel(level) {
        const levelNum = typeof level === 'string' ? this.LOG_LEVELS[level.toUpperCase()] : level;
        return this.logs.filter(log => log.level >= levelNum);
    }

    /**
     * Get logs filtered by type
     * @param {string} type - Log type (e.g., 'action', 'performance', 'ipc', 'error')
     * @returns {Array}
     */
    getLogsByType(type) {
        return this.logs.filter(log => log.context?.type === type);
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        this.logIndex = 0;
    }

    /**
     * Get statistics
     * @returns {Object}
     */
    getStatistics() {
        const uptime = Date.now() - this.stats.startTime;
        return {
            ...this.stats,
            uptime,
            totalLogs: this.logs.length,
            avgActionsPerMinute: (this.stats.totalActions / (uptime / 60000)).toFixed(2),
        };
    }

    /**
     * Export logs for debugging
     * @param {string} format - Export format ('json', 'csv', 'txt')
     * @returns {string}
     */
    exportLogs(format = this.exportFormat) {
        const stats = this.getStatistics();
        
        if (format === 'json') {
            return JSON.stringify({
                metadata: {
                    exportedAt: new Date().toISOString(),
                    statistics: stats,
                },
                logs: this.logs,
            }, null, 2);
        }

        if (format === 'csv') {
            const headers = ['ID', 'Timestamp', 'Level', 'Message', 'Type', 'Data'];
            const rows = this.logs.map(log => [
                log.id,
                new Date(log.timestamp).toISOString(),
                log.levelName,
                log.message,
                log.context?.type || 'unknown',
                JSON.stringify(log.data).replace(/"/g, '""'),
            ]);

            return [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
            ].join('\n');
        }

        if (format === 'txt') {
            return [
                `EffectsPanel Logs - ${new Date().toISOString()}`,
                `Statistics: ${JSON.stringify(stats)}`,
                '---',
                ...this.logs.map(log =>
                    `[${log.id}] ${log.levelName} (${new Date(log.timestamp).toISOString()}): ${log.message}\n` +
                    `    Data: ${JSON.stringify(log.data)}`
                ),
            ].join('\n');
        }

        throw new Error(`Unsupported export format: ${format}`);
    }
}

export default EffectsPanelLogger;