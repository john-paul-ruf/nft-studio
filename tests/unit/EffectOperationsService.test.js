/**
 * Comprehensive tests for EffectOperationsService
 * Tests all CRUD operations and command pattern integration
 */

import EffectOperationsService from '../../src/services/EffectOperationsService.js';

// Test function counter
let testCount = 0;
let passedTests = 0;
let failedTests = 0;

// Test results storage
const testResults = [];

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
 * Create mock dependencies for testing
 */
function createMockDependencies() {
    const mockCommandService = {
        execute: function(command) {
            this.lastCommand = command;
            this.commandHistory = this.commandHistory || [];
            this.commandHistory.push(command);
            
            // Simulate command execution
            if (command.execute && typeof command.execute === 'function') {
                command.execute();
            }
        },
        lastCommand: null,
        commandHistory: []
    };

    const mockEventBus = {
        emit: function(event, data) {
            this.lastEvent = { event, data };
            this.eventHistory = this.eventHistory || [];
            this.eventHistory.push({ event, data, timestamp: Date.now() });
        },
        lastEvent: null,
        eventHistory: []
    };

    const mockLogger = {
        info: function(message, data) {
            this.logs = this.logs || [];
            this.logs.push({ level: 'info', message, data, timestamp: Date.now() });
        },
        warn: function(message, data) {
            this.logs = this.logs || [];
            this.logs.push({ level: 'warn', message, data, timestamp: Date.now() });
        },
        error: function(message, data) {
            this.logs = this.logs || [];
            this.logs.push({ level: 'error', message, data, timestamp: Date.now() });
        },
        logs: []
    };

    return { mockCommandService, mockEventBus, mockLogger };
}

/**
 * Create mock project state
 */
function createMockProjectState() {
    const state = {
        effects: [],
        targetResolution: { width: 1920, height: 1080 },
        isHorizontal: true
    };

    return {
        getState: () => ({ ...state }),
        update: (updates) => {
            Object.assign(state, updates);
        },
        reorderSecondaryEffects: (parentIndex, fromIndex, toIndex) => {
            // Mock implementation for reordering secondary effects
            const effect = state.effects[parentIndex];
            if (effect && effect.secondaryEffects && effect.secondaryEffects.length > fromIndex) {
                const [movedEffect] = effect.secondaryEffects.splice(fromIndex, 1);
                effect.secondaryEffects.splice(toIndex, 0, movedEffect);
            }
        },
        reorderKeyframeEffects: (parentIndex, fromIndex, toIndex) => {
            // Mock implementation for reordering keyframe effects
            const effect = state.effects[parentIndex];
            if (effect && effect.keyframeEffects && effect.keyframeEffects.length > fromIndex) {
                const [movedEffect] = effect.keyframeEffects.splice(fromIndex, 1);
                effect.keyframeEffects.splice(toIndex, 0, movedEffect);
            }
        },
        state
    };
}

/**
 * Create mock available effects
 */
function createMockAvailableEffects() {
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
 * Mock window.api for testing
 */
function setupMockWindowApi() {
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
    const { mockCommandService, mockEventBus, mockLogger } = createMockDependencies();

    // Test missing commandService
    try {
        new EffectOperationsService({ eventBus: mockEventBus, logger: mockLogger });
        assert(false, 'Should throw error for missing commandService');
    } catch (error) {
        assert(error.message.includes('commandService'), 'Should mention commandService in error');
    }

    // Test missing eventBus
    try {
        new EffectOperationsService({ commandService: mockCommandService, logger: mockLogger });
        assert(false, 'Should throw error for missing eventBus');
    } catch (error) {
        assert(error.message.includes('eventBus'), 'Should mention eventBus in error');
    }

    // Test missing logger
    try {
        new EffectOperationsService({ commandService: mockCommandService, eventBus: mockEventBus });
        assert(false, 'Should throw error for missing logger');
    } catch (error) {
        assert(error.message.includes('logger'), 'Should mention logger in error');
    }

    // Test successful construction
    const service = new EffectOperationsService({
        commandService: mockCommandService,
        eventBus: mockEventBus,
        logger: mockLogger
    });

    assert(service.commandService === mockCommandService, 'Should store commandService reference');
    assert(service.eventBus === mockEventBus, 'Should store eventBus reference');
    assert(service.logger === mockLogger, 'Should store logger reference');
    assert(typeof service.operationMetrics === 'object', 'Should initialize operation metrics');
    assert(service.operationMetrics.effectsCreated === 0, 'Should initialize metrics to zero');
}

/**
 * Test 2: Effect creation with default configuration
 */
async function testEffectCreation() {
    setupMockWindowApi();
    const { mockCommandService, mockEventBus, mockLogger } = createMockDependencies();
    const mockProjectState = createMockProjectState();
    const mockAvailableEffects = createMockAvailableEffects();

    const service = new EffectOperationsService({
        commandService: mockCommandService,
        eventBus: mockEventBus,
        logger: mockLogger
    });

    const effect = await service.createEffect({
        effectName: 'TestEffect',
        effectType: 'primary',
        projectState: mockProjectState,
        availableEffects: mockAvailableEffects
    });

    // Verify effect creation
    assert(effect.name === 'TestEffect', 'Should set correct effect name');
    assert(effect.className === 'TestEffectClass', 'Should set correct class name');
    assert(effect.registryKey === 'test-effect', 'Should set correct registry key');
    assert(effect.type === 'primary', 'Should set correct effect type');
    assert(effect.visible === true, 'Should set effect as visible by default');
    assert(typeof effect.id === 'string', 'Should generate unique ID');
    assert(typeof effect.config === 'object', 'Should have configuration object');

    // Verify command execution
    assert(mockCommandService.lastCommand !== null, 'Should execute command');
    assert(mockCommandService.lastCommand.constructor.name === 'AddEffectCommand', 'Should use AddEffectCommand');

    // Verify event emission
    assert(mockEventBus.lastEvent !== null, 'Should emit event');
    assert(mockEventBus.lastEvent.event === 'effectOperations:effectCreated', 'Should emit correct event');
    assert(mockEventBus.lastEvent.data.effect === effect, 'Should include effect in event data');

    // Verify metrics update
    assert(service.operationMetrics.effectsCreated === 1, 'Should increment effects created counter');
    assert(service.operationMetrics.lastOperationTime !== null, 'Should update last operation time');

    // Verify logging
    assert(mockLogger.logs.length > 0, 'Should log operations');
    assert(mockLogger.logs.some(log => log.message.includes('Creating effect')), 'Should log effect creation');
}

/**
 * Test 3: Effect creation with pre-calculated configuration
 */
async function testEffectCreationWithConfig() {
    const { mockCommandService, mockEventBus, mockLogger } = createMockDependencies();
    const mockProjectState = createMockProjectState();
    const mockAvailableEffects = createMockAvailableEffects();

    const service = new EffectOperationsService({
        commandService: mockCommandService,
        eventBus: mockEventBus,
        logger: mockLogger
    });

    const customConfig = {
        specialProperty: 'specialValue',
        specialtyGroup: 'testGroup'
    };

    const effect = await service.createEffectWithConfig({
        effectName: 'TestEffect',
        effectType: 'primary',
        config: customConfig,
        percentChance: 75,
        projectState: mockProjectState,
        availableEffects: mockAvailableEffects
    });

    // Verify effect creation with custom config
    assert(effect.name === 'TestEffect', 'Should set correct effect name');
    assert(effect.config === customConfig, 'Should use provided config directly');
    assert(effect.percentChance === 75, 'Should set custom percent chance');

    // Verify event emission
    assert(mockEventBus.lastEvent.event === 'effectOperations:effectCreatedWithConfig', 'Should emit correct event');

    // Verify metrics update
    assert(service.operationMetrics.effectsCreated === 1, 'Should increment effects created counter');
}

/**
 * Test 4: Effect update operations
 */
async function testEffectUpdate() {
    const { mockCommandService, mockEventBus, mockLogger } = createMockDependencies();
    const mockProjectState = createMockProjectState();

    // Add an effect to the project state
    mockProjectState.state.effects = [{
        id: 'test-id',
        name: 'TestEffect',
        config: { oldProperty: 'oldValue' }
    }];

    const service = new EffectOperationsService({
        commandService: mockCommandService,
        eventBus: mockEventBus,
        logger: mockLogger
    });

    const updatedEffect = {
        id: 'test-id',
        name: 'UpdatedTestEffect',
        config: { newProperty: 'newValue' },
        secondaryEffects: [{ name: 'secondary1' }]
    };

    await service.updateEffect({
        index: 0,
        updatedEffect: updatedEffect,
        projectState: mockProjectState
    });

    // Verify command execution
    assert(mockCommandService.lastCommand !== null, 'Should execute command');
    assert(mockCommandService.lastCommand.constructor.name === 'UpdateEffectCommand', 'Should use UpdateEffectCommand');

    // Verify event emission
    assert(mockEventBus.lastEvent.event === 'effectOperations:effectUpdated', 'Should emit correct event');
    assert(mockEventBus.lastEvent.data.index === 0, 'Should include correct index');
    assert(mockEventBus.lastEvent.data.effect === updatedEffect, 'Should include updated effect');

    // Verify metrics update
    assert(service.operationMetrics.effectsUpdated === 1, 'Should increment effects updated counter');
}

/**
 * Test 5: Effect deletion operations
 */
async function testEffectDeletion() {
    const { mockCommandService, mockEventBus, mockLogger } = createMockDependencies();
    const mockProjectState = createMockProjectState();

    // Add effects to the project state
    mockProjectState.state.effects = [
        { id: 'test-id-1', name: 'TestEffect1' },
        { id: 'test-id-2', name: 'TestEffect2' }
    ];

    const service = new EffectOperationsService({
        commandService: mockCommandService,
        eventBus: mockEventBus,
        logger: mockLogger
    });

    const effectToDelete = mockProjectState.state.effects[0];

    await service.deleteEffect({
        index: 0,
        projectState: mockProjectState
    });

    // Verify command execution
    assert(mockCommandService.lastCommand !== null, 'Should execute command');
    assert(mockCommandService.lastCommand.constructor.name === 'DeleteEffectCommand', 'Should use DeleteEffectCommand');

    // Verify event emission
    assert(mockEventBus.lastEvent.event === 'effectOperations:effectDeleted', 'Should emit correct event');
    assert(mockEventBus.lastEvent.data.index === 0, 'Should include correct index');
    assert(mockEventBus.lastEvent.data.deletedEffect === effectToDelete, 'Should include deleted effect');

    // Verify metrics update
    assert(service.operationMetrics.effectsDeleted === 1, 'Should increment effects deleted counter');
}

/**
 * Test 6: Effect reordering operations
 */
async function testEffectReordering() {
    const { mockCommandService, mockEventBus, mockLogger } = createMockDependencies();
    const mockProjectState = createMockProjectState();

    // Add effects to the project state for reordering
    mockProjectState.state.effects = [
        { id: 'test-id-1', name: 'TestEffect1' },
        { id: 'test-id-2', name: 'TestEffect2' },
        { id: 'test-id-3', name: 'TestEffect3' }
    ];

    const service = new EffectOperationsService({
        commandService: mockCommandService,
        eventBus: mockEventBus,
        logger: mockLogger
    });

    await service.reorderEffects({
        fromIndex: 0,
        toIndex: 2,
        projectState: mockProjectState
    });

    // Verify command execution
    assert(mockCommandService.lastCommand !== null, 'Should execute command');
    assert(mockCommandService.lastCommand.constructor.name === 'ReorderEffectsCommand', 'Should use ReorderEffectsCommand');

    // Verify event emission
    assert(mockEventBus.lastEvent.event === 'effectOperations:effectsReordered', 'Should emit correct event');
    assert(mockEventBus.lastEvent.data.fromIndex === 0, 'Should include correct fromIndex');
    assert(mockEventBus.lastEvent.data.toIndex === 2, 'Should include correct toIndex');

    // Verify metrics update
    assert(service.operationMetrics.effectsReordered === 1, 'Should increment effects reordered counter');
}

/**
 * Test 7: Effect visibility toggle operations
 */
async function testEffectVisibilityToggle() {
    const { mockCommandService, mockEventBus, mockLogger } = createMockDependencies();
    const mockProjectState = createMockProjectState();

    // Add an effect to the project state
    mockProjectState.state.effects = [{
        id: 'test-id',
        name: 'TestEffect',
        visible: true
    }];

    const service = new EffectOperationsService({
        commandService: mockCommandService,
        eventBus: mockEventBus,
        logger: mockLogger
    });

    await service.toggleEffectVisibility({
        index: 0,
        projectState: mockProjectState
    });

    // Verify command execution
    assert(mockCommandService.lastCommand !== null, 'Should execute command');
    assert(mockCommandService.lastCommand.constructor.name === 'UpdateEffectCommand', 'Should use UpdateEffectCommand');
    assert(mockCommandService.lastCommand.description.includes('Hid'), 'Should set correct description for hiding');

    // Verify event emission
    assert(mockEventBus.lastEvent.event === 'effectOperations:effectVisibilityToggled', 'Should emit correct event');
    assert(mockEventBus.lastEvent.data.visible === false, 'Should indicate effect is now hidden');
}

/**
 * Test 8: Secondary and keyframe effect operations
 */
async function testSecondaryAndKeyframeEffects() {
    const { mockCommandService, mockEventBus, mockLogger } = createMockDependencies();
    const mockProjectState = createMockProjectState();

    // Add a parent effect to the project state
    mockProjectState.state.effects = [{
        id: 'parent-effect',
        name: 'ParentEffect',
        secondaryEffects: [],
        keyframeEffects: []
    }];

    const service = new EffectOperationsService({
        commandService: mockCommandService,
        eventBus: mockEventBus,
        logger: mockLogger
    });

    // Test secondary effect creation
    await service.createSecondaryEffect({
        parentIndex: 0,
        effectName: 'SecondaryEffect',
        config: { secondaryProperty: 'value' },
        projectState: mockProjectState
    });

    assert(mockCommandService.lastCommand.constructor.name === 'AddSecondaryEffectCommand', 'Should use AddSecondaryEffectCommand');
    assert(mockEventBus.lastEvent.event === 'effectOperations:secondaryEffectCreated', 'Should emit secondary effect created event');
    assert(service.operationMetrics.secondaryEffectsCreated === 1, 'Should increment secondary effects counter');

    // Test keyframe effect creation
    await service.createKeyframeEffect({
        parentIndex: 0,
        effectName: 'KeyframeEffect',
        frame: 10,
        config: { keyframeProperty: 'value' },
        projectState: mockProjectState
    });

    assert(mockCommandService.lastCommand.constructor.name === 'AddKeyframeEffectCommand', 'Should use AddKeyframeEffectCommand');
    assert(mockEventBus.lastEvent.event === 'effectOperations:keyframeEffectCreated', 'Should emit keyframe effect created event');
    assert(service.operationMetrics.keyframeEffectsCreated === 1, 'Should increment keyframe effects counter');

    // Test secondary effect deletion
    await service.deleteSecondaryEffect({
        parentIndex: 0,
        secondaryIndex: 0,
        projectState: mockProjectState
    });

    assert(mockCommandService.lastCommand.constructor.name === 'DeleteSecondaryEffectCommand', 'Should use DeleteSecondaryEffectCommand');
    assert(mockEventBus.lastEvent.event === 'effectOperations:secondaryEffectDeleted', 'Should emit secondary effect deleted event');

    // Test keyframe effect deletion
    await service.deleteKeyframeEffect({
        parentIndex: 0,
        keyframeIndex: 0,
        projectState: mockProjectState
    });

    assert(mockCommandService.lastCommand.constructor.name === 'DeleteKeyframeEffectCommand', 'Should use DeleteKeyframeEffectCommand');
    assert(mockEventBus.lastEvent.event === 'effectOperations:keyframeEffectDeleted', 'Should emit keyframe effect deleted event');

    // Add more secondary and keyframe effects for reordering tests
    await service.createSecondaryEffect({
        parentIndex: 0,
        effectName: 'SecondaryEffect2',
        config: { secondaryProperty2: 'value2' },
        projectState: mockProjectState
    });

    await service.createKeyframeEffect({
        parentIndex: 0,
        effectName: 'KeyframeEffect2',
        frame: 20,
        config: { keyframeProperty2: 'value2' },
        projectState: mockProjectState
    });

    // Test secondary effect reordering
    await service.reorderSecondaryEffects({
        parentIndex: 0,
        fromIndex: 0,
        toIndex: 1,
        projectState: mockProjectState
    });

    assert(mockCommandService.lastCommand.constructor.name === 'ReorderSecondaryEffectsCommand', 'Should use ReorderSecondaryEffectsCommand');
    assert(mockEventBus.lastEvent.event === 'effectOperations:secondaryEffectsReordered', 'Should emit secondary effects reordered event');

    // Test keyframe effect reordering
    await service.reorderKeyframeEffects({
        parentIndex: 0,
        fromIndex: 0,
        toIndex: 1,
        projectState: mockProjectState
    });

    assert(mockCommandService.lastCommand.constructor.name === 'ReorderKeyframeEffectsCommand', 'Should use ReorderKeyframeEffectsCommand');
    assert(mockEventBus.lastEvent.event === 'effectOperations:keyframeEffectsReordered', 'Should emit keyframe effects reordered event');
}

/**
 * Test 9: Operation metrics and error handling
 */
async function testOperationMetricsAndErrorHandling() {
    const { mockCommandService, mockEventBus, mockLogger } = createMockDependencies();
    const mockProjectState = createMockProjectState();

    const service = new EffectOperationsService({
        commandService: mockCommandService,
        eventBus: mockEventBus,
        logger: mockLogger
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
            projectState: mockProjectState
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
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting EffectOperationsService Tests...\n');
    
    const startTime = Date.now();
    
    // Run all test functions
    await runTest('Constructor Validation and Dependency Injection', testConstructorValidation);
    await runTest('Effect Creation with Default Configuration', testEffectCreation);
    await runTest('Effect Creation with Pre-calculated Configuration', testEffectCreationWithConfig);
    await runTest('Effect Update Operations', testEffectUpdate);
    await runTest('Effect Deletion Operations', testEffectDeletion);
    await runTest('Effect Reordering Operations', testEffectReordering);
    await runTest('Effect Visibility Toggle Operations', testEffectVisibilityToggle);
    await runTest('Secondary and Keyframe Effect Operations', testSecondaryAndKeyframeEffects);
    await runTest('Operation Metrics and Error Handling', testOperationMetricsAndErrorHandling);
    
    const totalTime = Date.now() - startTime;
    
    // Print final results
    console.log('\n' + '='.repeat(80));
    console.log('🏁 TEST RESULTS SUMMARY');
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
    }
    
    console.log('\n✅ PASSED TESTS:');
    testResults
        .filter(result => result.status === 'PASSED')
        .forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.name} (${result.duration}ms)`);
        });
    
    // Performance baseline verification
    console.log('\n⚡ PERFORMANCE BASELINES:');
    const avgTestTime = totalTime / testCount;
    console.log(`   Average Test Time: ${avgTestTime.toFixed(1)}ms (Target: <100ms) ${avgTestTime < 100 ? '✅' : '❌'}`);
    
    const constructorTest = testResults.find(r => r.name.includes('Constructor'));
    if (constructorTest && constructorTest.duration) {
        console.log(`   Constructor Time: ${constructorTest.duration}ms (Target: <50ms) ${constructorTest.duration < 50 ? '✅' : '❌'}`);
    }
    
    console.log('='.repeat(80));
    
    return {
        total: testCount,
        passed: passedTests,
        failed: failedTests,
        successRate: (passedTests / testCount) * 100,
        totalTime,
        avgTime: avgTestTime
    };
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests()
        .then(results => {
            if (results.failed === 0) {
                console.log('\n🎉 All tests passed! EffectOperationsService is working correctly.');
                process.exit(0);
            } else {
                console.log(`\n💥 ${results.failed} test(s) failed. Please check the implementation.`);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Test execution failed:', error);
            process.exit(1);
        });
}

export { runAllTests };