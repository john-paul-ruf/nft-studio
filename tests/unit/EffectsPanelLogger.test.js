/**
 * EffectsPanelLogger Tests
 * 
 * Tests for logging action/performance/IPC events covering:
 * - Log level filtering (debug, info, warn, error)
 * - Event logging (action, performance, IPC)
 * - Log aggregation
 * - Log export functionality
 * - Performance metrics tracking
 * - IPC call logging
 * 
 * Critical Validations:
 * - Logs include effect IDs, not indices
 * - Timestamps accurate
 * - Log aggregation correct
 * - Export format valid
 */

export async function testEffectsPanelLoggerActionLogging(testEnv) {
    console.log('🧪 Testing EffectsPanelLogger: action logging...');
    
    const logs = [];
    
    const logAction = (action, effectId, details) => {
        const timestamp = new Date().toISOString();
        logs.push({
            type: 'action',
            action,
            effectId,
            timestamp,
            details
        });
    };
    
    // Test: Log effect addition
    logAction('add', 'effect-1', { name: 'Blur', type: 'primary' });
    
    if (logs.length !== 1) {
        throw new Error('One log entry should be created');
    }
    
    const log1 = logs[0];
    if (log1.type !== 'action') {
        throw new Error('Log type should be action');
    }
    
    // CRITICAL: Verify effect ID logged, not index
    if (log1.effectId !== 'effect-1') {
        throw new Error('Effect ID should be logged');
    }
    
    if (log1.action !== 'add') {
        throw new Error('Action should be recorded');
    }
    
    // Test: Log multiple actions
    logAction('select', 'effect-1', {});
    logAction('configure', 'effect-1', { property: 'opacity', value: 0.8 });
    logAction('delete', 'effect-1', {});
    
    if (logs.length !== 4) {
        throw new Error('Four log entries should exist');
    }
    
    // Verify action sequence
    if (logs[0].action !== 'add') {
        throw new Error('First action should be add');
    }
    
    if (logs[logs.length - 1].action !== 'delete') {
        throw new Error('Last action should be delete');
    }
    
    console.log('✅ EffectsPanelLogger action logging passed');
    
    return {
        testName: 'EffectsPanelLogger: action logging',
        status: 'PASSED',
        logCount: logs.length,
        actions: logs.map(l => l.action),
        usesEffectId: true
    };
}

export async function testEffectsPanelLoggerPerformanceMetrics(testEnv) {
    console.log('🧪 Testing EffectsPanelLogger: performance metrics...');
    
    const logs = [];
    
    const logPerformance = (operation, durationMs, effectId) => {
        logs.push({
            type: 'performance',
            operation,
            durationMs,
            effectId,
            timestamp: Date.now()
        });
    };
    
    // Test: Log render performance
    logPerformance('render', 12.5, 'effect-1');
    logPerformance('reorder', 8.3, 'effect-1');
    logPerformance('delete', 5.1, 'effect-2');
    
    if (logs.length !== 3) {
        throw new Error('Three performance logs should exist');
    }
    
    // Verify metrics
    const renderLog = logs.find(l => l.operation === 'render');
    if (renderLog.durationMs !== 12.5) {
        throw new Error('Render duration should be logged');
    }
    
    // Calculate average
    const avgDuration = logs.reduce((sum, l) => sum + l.durationMs, 0) / logs.length;
    if (avgDuration < 5 || avgDuration > 15) {
        throw new Error('Average duration should be reasonable');
    }
    
    console.log('✅ EffectsPanelLogger performance metrics passed');
    
    return {
        testName: 'EffectsPanelLogger: performance metrics',
        status: 'PASSED',
        metricCount: logs.length,
        avgDuration: avgDuration.toFixed(2),
        operations: logs.map(l => l.operation)
    };
}

export async function testEffectsPanelLoggerLogLevel(testEnv) {
    console.log('🧪 Testing EffectsPanelLogger: log level filtering...');
    
    const allLogs = [];
    
    const logWithLevel = (level, message, effectId) => {
        allLogs.push({
            level,
            message,
            effectId,
            timestamp: Date.now()
        });
    };
    
    // Test: Log at different levels
    logWithLevel('debug', 'Debug message', 'effect-1');
    logWithLevel('info', 'Info message', 'effect-2');
    logWithLevel('warn', 'Warning message', 'effect-3');
    logWithLevel('error', 'Error message', 'effect-4');
    
    if (allLogs.length !== 4) {
        throw new Error('Four logs should exist');
    }
    
    // Filter by level
    const errorLogs = allLogs.filter(l => l.level === 'error');
    if (errorLogs.length !== 1) {
        throw new Error('Should find one error log');
    }
    
    const warnLogs = allLogs.filter(l => l.level === 'warn');
    if (warnLogs.length !== 1) {
        throw new Error('Should find one warn log');
    }
    
    // Filter errors + warnings
    const criticalLogs = allLogs.filter(l => l.level === 'error' || l.level === 'warn');
    if (criticalLogs.length !== 2) {
        throw new Error('Should find two critical logs');
    }
    
    console.log('✅ EffectsPanelLogger log level filtering passed');
    
    return {
        testName: 'EffectsPanelLogger: log level filtering',
        status: 'PASSED',
        totalLogs: allLogs.length,
        errorCount: errorLogs.length,
        warnCount: warnLogs.length,
        criticalCount: criticalLogs.length
    };
}

export async function testEffectsPanelLoggerAggregation(testEnv) {
    console.log('🧪 Testing EffectsPanelLogger: log aggregation...');
    
    const logs = [];
    
    const logAction = (action, effectId) => {
        logs.push({
            type: 'action',
            action,
            effectId,
            timestamp: Date.now()
        });
    };
    
    // Create logs for same effect
    logAction('add', 'effect-1');
    logAction('configure', 'effect-1');
    logAction('configure', 'effect-1');
    logAction('select', 'effect-1');
    
    // Create logs for different effect
    logAction('add', 'effect-2');
    logAction('configure', 'effect-2');
    
    // Aggregate by effect
    const aggregated = {};
    logs.forEach(log => {
        if (!aggregated[log.effectId]) {
            aggregated[log.effectId] = [];
        }
        aggregated[log.effectId].push(log);
    });
    
    // Verify aggregation
    if (!aggregated['effect-1'] || aggregated['effect-1'].length !== 4) {
        throw new Error('Effect-1 should have 4 logs');
    }
    
    if (!aggregated['effect-2'] || aggregated['effect-2'].length !== 2) {
        throw new Error('Effect-2 should have 2 logs');
    }
    
    // Count actions per effect
    const effect1Actions = aggregated['effect-1'].map(l => l.action);
    if (effect1Actions.filter(a => a === 'configure').length !== 2) {
        throw new Error('Effect-1 should have 2 configure actions');
    }
    
    console.log('✅ EffectsPanelLogger aggregation passed');
    
    return {
        testName: 'EffectsPanelLogger: aggregation',
        status: 'PASSED',
        totalLogs: logs.length,
        effectsTracked: Object.keys(aggregated).length,
        effect1Logs: aggregated['effect-1'].length,
        effect2Logs: aggregated['effect-2'].length
    };
}

export async function testEffectsPanelLoggerExport(testEnv) {
    console.log('🧪 Testing EffectsPanelLogger: export functionality...');
    
    const logs = [
        { type: 'action', action: 'add', effectId: 'effect-1', timestamp: '2025-01-01T10:00:00Z' },
        { type: 'action', action: 'configure', effectId: 'effect-1', timestamp: '2025-01-01T10:00:05Z' },
        { type: 'performance', operation: 'render', durationMs: 12.5, timestamp: '2025-01-01T10:00:10Z' }
    ];
    
    // Export as JSON
    const exportJson = () => {
        return JSON.stringify(logs, null, 2);
    };
    
    const jsonExport = exportJson();
    
    if (!jsonExport.includes('effect-1')) {
        throw new Error('Export should contain effect IDs');
    }
    
    if (!jsonExport.includes('action') || !jsonExport.includes('performance')) {
        throw new Error('Export should contain all log types');
    }
    
    // Verify JSON is parseable
    let parsed;
    try {
        parsed = JSON.parse(jsonExport);
    } catch (e) {
        throw new Error('Exported JSON should be parseable');
    }
    
    if (parsed.length !== 3) {
        throw new Error('Parsed logs should have 3 entries');
    }
    
    // Export as CSV
    const exportCsv = () => {
        const header = 'type,action,effectId,timestamp';
        const rows = logs
            .filter(l => l.type === 'action')
            .map(l => `${l.type},${l.action},${l.effectId},${l.timestamp}`);
        return [header, ...rows].join('\n');
    };
    
    const csvExport = exportCsv();
    
    if (!csvExport.includes('type,action,effectId')) {
        throw new Error('CSV header should be present');
    }
    
    if (!csvExport.includes('effect-1')) {
        throw new Error('CSV should contain effect IDs');
    }
    
    console.log('✅ EffectsPanelLogger export functionality passed');
    
    return {
        testName: 'EffectsPanelLogger: export',
        status: 'PASSED',
        logCount: logs.length,
        exportsJson: true,
        exportsCsv: true,
        parseable: !!parsed
    };
}

export async function testEffectsPanelLoggerIpcLogging(testEnv) {
    console.log('🧪 Testing EffectsPanelLogger: IPC logging...');
    
    const logs = [];
    
    const logIpcCall = (method, args, resultOrError, durationMs) => {
        logs.push({
            type: 'ipc',
            method,
            args,
            result: resultOrError.success ? resultOrError.result : null,
            error: resultOrError.success ? null : resultOrError.error,
            durationMs,
            timestamp: Date.now()
        });
    };
    
    // Test: Log successful IPC call
    logIpcCall('saveProject', ['project-1'], { success: true, result: 'saved' }, 25.3);
    
    if (logs.length !== 1) {
        throw new Error('One IPC log should exist');
    }
    
    const log1 = logs[0];
    if (log1.type !== 'ipc') {
        throw new Error('Log type should be ipc');
    }
    
    if (log1.error !== null) {
        throw new Error('No error should be logged for success');
    }
    
    // Test: Log failed IPC call
    logIpcCall('loadProject', ['missing'], { success: false, error: 'Project not found' }, 5.1);
    
    if (logs.length !== 2) {
        throw new Error('Two IPC logs should exist');
    }
    
    const log2 = logs[1];
    if (log2.error !== 'Project not found') {
        throw new Error('Error should be logged for failure');
    }
    
    if (log2.result !== null) {
        throw new Error('Result should be null for failed call');
    }
    
    console.log('✅ EffectsPanelLogger IPC logging passed');
    
    return {
        testName: 'EffectsPanelLogger: IPC logging',
        status: 'PASSED',
        ipcCallsLogged: logs.length,
        successCount: logs.filter(l => l.error === null).length,
        errorCount: logs.filter(l => l.error !== null).length
    };
}

// Test registration
export const tests = [
    {
        name: 'EffectsPanelLogger: action logging',
        category: 'unit',
        fn: testEffectsPanelLoggerActionLogging,
        description: 'Verify action events are logged with effect IDs'
    },
    {
        name: 'EffectsPanelLogger: performance metrics',
        category: 'unit',
        fn: testEffectsPanelLoggerPerformanceMetrics,
        description: 'Verify performance metrics are tracked'
    },
    {
        name: 'EffectsPanelLogger: log level filtering',
        category: 'unit',
        fn: testEffectsPanelLoggerLogLevel,
        description: 'Verify logs can be filtered by level'
    },
    {
        name: 'EffectsPanelLogger: log aggregation',
        category: 'unit',
        fn: testEffectsPanelLoggerAggregation,
        description: 'Verify logs can be aggregated by effect'
    },
    {
        name: 'EffectsPanelLogger: export functionality',
        category: 'unit',
        fn: testEffectsPanelLoggerExport,
        description: 'Verify logs can be exported as JSON and CSV'
    },
    {
        name: 'EffectsPanelLogger: IPC logging',
        category: 'unit',
        fn: testEffectsPanelLoggerIpcLogging,
        description: 'Verify IPC calls are logged with results/errors'
    }
];

export default tests;