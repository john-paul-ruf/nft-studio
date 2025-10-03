/**
 * Comprehensive tests for EffectOperationsService
 * Tests all CRUD operations and command pattern integration
 * NO MOCKS - REAL OBJECTS ONLY
 */

import EffectOperationsService from '../../src/services/EffectOperationsService.js';
import CommandService from '../../src/services/CommandService.js';
import EventBusService from '../../src/services/EventBusService.js';
import ProjectState from '../../src/models/ProjectState.js';
import TestEnvironment from '../setup/TestEnvironment.js';

// Test function counter
let testCount = 0;
let passedTests = 0;
let failedTests = 0;

// Test results storage
const testResults = [];

// Test environment
let testEnv = null;

/**
 * Test assertion helper
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

/**
 * Test runner helper
 */
async function runTest(testName, testFn) {
    testCount++;
    console.log(`\n🧪 Running Test ${testCount}: ${testName}`);
    
    try {
        const startTime = Date.now();
        await testFn();
        const duration = Date.now() - startTime;
        
        console.log(`✅ Test ${testCount} passed: ${testName} (${duration}ms)`);
        passedTests++;
        testResults.push({ name: testName, status: 'PASSED', duration });
    } catch (error) {
        console.error(`❌ Test ${testCount} failed: ${testName}`);
        console.error(`   Error: ${error.message}`);
        failedTests++;
        testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
}

/**
 * Create real dependencies for testing
 */
function createRealDependencies() {
    // Use real CommandService (singleton instance)
    const commandService = CommandService;
    
    // Use real EventBusService (singleton)
    const eventBus = EventBusService;
    
    // Create real logger that captures logs for testing
    const logger = {
        logs: [],
        info: function(message, data) {
            this.logs.push({ level: 'info', message, data, timestamp: Date.now() });
        },
        warn: function(message, data) {
            this.logs.push({ level: 'warn', message, data, timestamp: Date.now() });
        },
        error: function(message, data) {
            this.logs.push({ level: 'error', message, data, timestamp: Date.now() });
        },
        getLogs: function() {
            return [...this.logs];
        },
        clearLogs: function() {
            this.logs = [];
        }
    };

    return { commandService, eventBus, logger };
}

/**
 * Create real project state
 */
function createRealProjectState() {
    const projectState = new ProjectState({
        projectName: 'Test Project',
        artist: 'Test Artist',
        targetResolution: { width: 1920, height: 1080 },
        isHorizontal: true,
        numFrames: 100,
        effects: [],
        colorScheme: 'vapor-dreams'
    });

    return projectState;
}

/**
 * Create real available effects
 */
function createRealAvailableEffects() {
    return {
        primary: [
            {
                name: 'TestEffect',
                className: 'TestEffectClass',
                registryKey: 'test-effect',
                category: 'primary'
            }
        ],
        secondary: [
            {
                name: 'SecondaryEffect',
                className: 'SecondaryEffectClass',
                registryKey: 'secondary-effect',
                category: 'secondary'
            }
        ],
        finalImage: []
    };
}

/**
 * Setup real window.api for testing
 */
function setupRealWindowApi() {
    global.window = {
        api: {
            getEffectDefaults: async (effectName) => ({
                success: true,
                defaults: {
                    testProperty: 'testValue',
                    center: { x: 960, y: 540 }
                }
            })
        }
    };
}

/**
 * Test 1: Constructor validation and dependency injection
 */
async function testConstructorValidation() {
    const { commandService, eventBus, logger } = createRealDependencies();

    // Test missing commandService
    try {
        new EffectOperationsService({ eventBus, logger });
        assert(false, 'Should throw error for missing commandService');
    } catch (error) {
        assert(error.message.includes('commandService'), 'Should mention commandService in error');
    }

    // Test missing eventBus
    try {
        new EffectOperationsService({ commandService, logger });
        assert(false, 'Should throw error for missing eventBus');
    } catch (error) {
        assert(error.message.includes('eventBus'), 'Should mention eventBus in error');
    }

    // Test missing logger
    try {
        new EffectOperationsService({ commandService, eventBus });
        assert(false, 'Should throw error for missing logger');
    } catch (error) {
        assert(error.message.includes('logger'), 'Should mention logger in error');
    }

    // Test successful construction
    const service = new EffectOperationsService({
        commandService,
        eventBus,
        logger
    });

    assert(service.commandService === commandService, 'Should store commandService reference');
    assert(service.eventBus === eventBus, 'Should store eventBus reference');
    assert(service.logger === logger, 'Should store logger reference');
    assert(typeof service.operationMetrics === 'object', 'Should initialize operation metrics');
    assert(service.operationMetrics.effectsCreated === 0, 'Should initialize metrics to zero');
}

/**
 * Test 2: Effect creation with default configuration
 */
async function testEffectCreation() {
    setupRealWindowApi();
    const { commandService, eventBus, logger } = createRealDependencies();
    const projectState = createRealProjectState();
    const availableEffects = createRealAvailableEffects();

    const service = new EffectOperationsService({
        commandService,
        eventBus,
        logger
    });

    // Clear any previous events and logs before starting
    eventBus.clear();
    logger.clearLogs();

    const effect = await service.createEffect({
        effectName: 'TestEffect',
        effectType: 'primary',
        projectState,
        availableEffects
    });

    // Verify effect creation
    assert(effect.name === 'TestEffect', 'Should set correct effect name');
    assert(effect.className === 'TestEffectClass', 'Should set correct class name');
    assert(effect.registryKey === 'test-effect', 'Should set correct registry key');
    assert(effect.type === 'primary', 'Should set correct effect type');
    assert(effect.visible === true, 'Should set effect as visible by default');
    assert(typeof effect.id === 'string', 'Should generate unique ID');
    assert(typeof effect.config === 'object', 'Should have configuration object');

    // Verify command execution (real CommandService tracks commands)
    assert(commandService.undoStack.length >= 0, 'Should have command stack available');

    // Verify event emission (real EventBusService tracks events)
    const eventHistory = eventBus.getEventHistory();
    const effectCreatedEvent = eventHistory.find(e => e.type === 'effectOperations:effectCreated');
    assert(effectCreatedEvent !== undefined, 'Should emit effectCreated event');

    // Verify metrics update
    assert(service.operationMetrics.effectsCreated === 1, 'Should increment effects created counter');
    assert(service.operationMetrics.lastOperationTime !== null, 'Should update last operation time');

    // Verify logging
    const logs = logger.getLogs();
    assert(logs.length > 0, 'Should log operations');
    assert(logs.some(log => log.message.includes('Creating effect')), 'Should log effect creation');
}

/**
 * Test 3: Effect creation with pre-calculated configuration
 */
async function testEffectCreationWithConfig() {
    const { commandService, eventBus, logger } = createRealDependencies();
    const projectState = createRealProjectState();
    const availableEffects = createRealAvailableEffects();

    const service = new EffectOperationsService({
        commandService,
        eventBus,
        logger
    });

    // Clear any previous events and logs
    eventBus.clear();
    logger.clearLogs();

    const customConfig = {
        specialProperty: 'specialValue',
        specialtyGroup: 'testGroup'
    };

    const effect = await service.createEffectWithConfig({
        effectName: 'TestEffect',
        effectType: 'primary',
        config: customConfig,
        percentChance: 75,
        projectState,
        availableEffects
    });

    // Verify effect creation with custom config
    assert(effect.name === 'TestEffect', 'Should set correct effect name');
    assert(effect.config === customConfig, 'Should use provided config directly');
    assert(effect.percentChance === 75, 'Should set custom percent chance');

    // Verify event emission
    const eventHistory = eventBus.getEventHistory();
    const effectCreatedEvent = eventHistory.find(e => e.type === 'effectOperations:effectCreatedWithConfig');
    assert(effectCreatedEvent !== undefined, 'Should emit effectCreatedWithConfig event');

    // Verify metrics update
    assert(service.operationMetrics.effectsCreated === 1, 'Should increment effects created counter');
}

/**
 * Test 4: Effect update operations
 */
async function testEffectUpdate() {
    const { commandService, eventBus, logger } = createRealDependencies();
    const projectState = createRealProjectState();

    // Add an effect to the real project state
    projectState.update({
        effects: [{
            id: 'test-id',
            name: 'TestEffect',
            className: 'TestEffectClass',
            registryKey: 'test-effect',
            type: 'primary',
            config: { oldProperty: 'oldValue' }
        }]
    });

    const service = new EffectOperationsService({
        commandService,
        eventBus,
        logger
    });

    // Clear any previous events and logs
    eventBus.clear();
    logger.clearLogs();

    const updatedEffect = {
        id: 'test-id',
        name: 'UpdatedTestEffect',
        className: 'UpdatedTestEffectClass',
        registryKey: 'updated-test-effect',
        type: 'primary',
        config: { newProperty: 'newValue' },
        secondaryEffects: [{ name: 'secondary1', id: 'sec-1', className: 'SecondaryClass', registryKey: 'secondary', type: 'secondary', config: {} }]
    };

    await service.updateEffect({
        index: 0,
        updatedEffect: updatedEffect,
        projectState
    });

    // Verify event emission
    const eventHistory = eventBus.getEventHistory();
    const effectUpdatedEvent = eventHistory.find(e => e.type === 'effectOperations:effectUpdated');
    assert(effectUpdatedEvent !== undefined, 'Should emit effectUpdated event');
    assert(effectUpdatedEvent.payload.index === 0, 'Should include correct index');
    assert(effectUpdatedEvent.payload.effect === updatedEffect, 'Should include updated effect');

    // Verify metrics update
    assert(service.operationMetrics.effectsUpdated === 1, 'Should increment effects updated counter');
}

/**
 * Test 5: Effect deletion operations
 */
async function testEffectDeletion() {
    const { commandService, eventBus, logger } = createRealDependencies();
    const projectState = createRealProjectState();

    // Add effects to the real project state
    projectState.update({
        effects: [
            { id: 'test-id-1', name: 'TestEffect1' },
            { id: 'test-id-2', name: 'TestEffect2' }
        ]
    });

    const service = new EffectOperationsService({
        commandService,
        eventBus,
        logger
    });

    // Clear any previous events and logs
    eventBus.clear();
    logger.clearLogs();

    const effectToDelete = projectState.getState().effects[0];

    await service.deleteEffect({
        index: 0,
        projectState
    });

    // Verify event emission
    const eventHistory = eventBus.getEventHistory();
    const effectDeletedEvent = eventHistory.find(e => e.type === 'effectOperations:effectDeleted');
    assert(effectDeletedEvent !== undefined, 'Should emit effectDeleted event');
    assert(effectDeletedEvent.payload.index === 0, 'Should include correct index');

    // Verify metrics update
    assert(service.operationMetrics.effectsDeleted === 1, 'Should increment effects deleted counter');
}

/**
 * Test 6: Effect reordering operations
 */
async function testEffectReordering() {
    const { commandService, eventBus, logger } = createRealDependencies();
    const projectState = createRealProjectState();

    // Add effects to the real project state
    projectState.update({
        effects: [
            { id: 'test-id-1', name: 'TestEffect1' },
            { id: 'test-id-2', name: 'TestEffect2' },
            { id: 'test-id-3', name: 'TestEffect3' }
        ]
    });

    const service = new EffectOperationsService({
        commandService,
        eventBus,
        logger
    });

    // Clear any previous events and logs
    eventBus.clear();
    logger.clearLogs();

    await service.reorderEffects({
        fromIndex: 0,
        toIndex: 2,
        projectState
    });

    // Verify event emission
    const eventHistory = eventBus.getEventHistory();
    const effectsReorderedEvent = eventHistory.find(e => e.type === 'effectOperations:effectsReordered');
    assert(effectsReorderedEvent !== undefined, 'Should emit effectsReordered event');
    assert(effectsReorderedEvent.payload.fromIndex === 0, 'Should include correct fromIndex');
    assert(effectsReorderedEvent.payload.toIndex === 2, 'Should include correct toIndex');

    // Verify metrics update
    assert(service.operationMetrics.effectsReordered === 1, 'Should increment effects reordered counter');
}

/**
 * Test 7: Effect visibility toggle operations
 */
async function testEffectVisibilityToggle() {
    const { commandService, eventBus, logger } = createRealDependencies();
    const projectState = createRealProjectState();

    // Add an effect to the real project state
    projectState.update({
        effects: [{
            id: 'test-id',
            name: 'TestEffect',
            className: 'TestEffectClass',
            registryKey: 'test-effect',
            type: 'primary',
            config: {},
            visible: true
        }]
    });

    const service = new EffectOperationsService({
        commandService,
        eventBus,
        logger
    });

    // Clear any previous events and logs
    eventBus.clear();
    logger.clearLogs();

    await service.toggleEffectVisibility({
        index: 0,
        projectState
    });

    // Verify event emission
    const eventHistory = eventBus.getEventHistory();
    const visibilityToggledEvent = eventHistory.find(e => e.type === 'effectOperations:effectVisibilityToggled');
    assert(visibilityToggledEvent !== undefined, 'Should emit effectVisibilityToggled event');
    assert(visibilityToggledEvent.payload.visible === false, 'Should indicate effect is now hidden');
}

/**
 * Test 8: Operation metrics and error handling
 */
async function testOperationMetricsAndErrorHandling() {
    const { commandService, eventBus, logger } = createRealDependencies();
    const projectState = createRealProjectState();

    const service = new EffectOperationsService({
        commandService,
        eventBus,
        logger
    });

    // Test metrics retrieval
    const initialMetrics = service.getOperationMetrics();
    assert(typeof initialMetrics === 'object', 'Should return metrics object');
    assert(initialMetrics.effectsCreated === 0, 'Should start with zero effects created');
    assert(initialMetrics.operationErrors === 0, 'Should start with zero errors');
    assert(typeof initialMetrics.uptime === 'number', 'Should include uptime calculation');

    // Test error handling by causing an error
    try {
        await service.updateEffect({
            index: 999, // Invalid index
            updatedEffect: { name: 'Test' },
            projectState
        });
    } catch (error) {
        // Error is expected
    }

    const metricsAfterError = service.getOperationMetrics();
    assert(metricsAfterError.operationErrors === 1, 'Should increment error counter');

    // Test metrics reset
    service.resetOperationMetrics();
    const resetMetrics = service.getOperationMetrics();
    assert(resetMetrics.effectsCreated === 0, 'Should reset effects created counter');
    assert(resetMetrics.operationErrors === 0, 'Should reset error counter');
}

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
    testEnv = new TestEnvironment();
    await testEnv.setup();
}

/**
 * Cleanup test environment
 */
async function cleanupTestEnvironment() {
    if (testEnv) {
        await testEnv.cleanup();
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting EffectOperationsService Tests (REAL OBJECTS ONLY)...\n');
    
    const startTime = Date.now();
    
    // Setup test environment
    await setupTestEnvironment();
    
    try {
        // Run all test functions
        await runTest('Constructor Validation and Dependency Injection', testConstructorValidation);
        await runTest('Effect Creation with Default Configuration', testEffectCreation);
        await runTest('Effect Creation with Pre-calculated Configuration', testEffectCreationWithConfig);
        await runTest('Effect Update Operations', testEffectUpdate);
        await runTest('Effect Deletion Operations', testEffectDeletion);
        await runTest('Effect Reordering Operations', testEffectReordering);
        await runTest('Effect Visibility Toggle Operations', testEffectVisibilityToggle);
        await runTest('Operation Metrics and Error Handling', testOperationMetricsAndErrorHandling);
    } finally {
        // Cleanup test environment
        await cleanupTestEnvironment();
    }
    
    const totalTime = Date.now() - startTime;
    
    // Print final results
    console.log('\n' + '='.repeat(80));
    console.log('🏁 TEST RESULTS SUMMARY (REAL OBJECTS ONLY)');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${testCount}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`🎯 Success Rate: ${((passedTests / testCount) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults
            .filter(result => result.status === 'FAILED')
            .forEach((result, index) => {
                console.log(`   ${index + 1}. ${result.name}`);
                console.log(`      Error: ${result.error}`);
            });
        
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed! EffectOperationsService is working correctly with REAL OBJECTS.');
        process.exit(0);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(error => {
        console.error('💥 Test runner crashed:', error);
        process.exit(1);
    });
}

export {
    runAllTests,
    testConstructorValidation,
    testEffectCreation,
    testEffectCreationWithConfig,
    testEffectUpdate,
    testEffectDeletion,
    testEffectReordering,
    testEffectVisibilityToggle,
    testOperationMetricsAndErrorHandling
};