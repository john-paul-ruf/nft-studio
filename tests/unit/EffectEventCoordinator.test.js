/**
 * Comprehensive Test Suite for EffectEventCoordinator Service
 * 
 * Tests all event coordination capabilities extracted from EffectConfigurer:
 * 1. Constructor validation and dependency injection
 * 2. Effect addition event coordination
 * 3. Effect attachment event coordination
 * 4. Configuration change event coordination
 * 5. Resolution change event coordination
 * 6. Event metrics tracking
 * 7. Callback compatibility and backward compatibility
 * 8. Performance baseline verification
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Test 1: Constructor Validation and Dependency Injection
 */
export async function testEffectEventCoordinatorConstructor(testEnv) {
    console.log('🧪 Testing EffectEventCoordinator constructor...');
    
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    
    // Test default constructor
    const coordinator1 = new EffectEventCoordinator();
    
    if (!coordinator1.logger) {
        throw new Error('Default logger not set');
    }
    
    if (!coordinator1.eventMetrics) {
        throw new Error('Event metrics not initialized');
    }
    
    if (!coordinator1.callbackRegistry) {
        throw new Error('Callback registry not initialized');
    }
    
    // Test constructor with dependencies
    const mockEventBus = { emit: () => {}, subscribe: () => {} };
    const customLogger = { log: () => {}, error: () => {} };
    
    const coordinator2 = new EffectEventCoordinator({ 
        eventBus: mockEventBus, 
        logger: customLogger 
    });
    
    if (coordinator2.eventBus !== mockEventBus) {
        throw new Error('Event bus not set correctly');
    }
    
    if (coordinator2.logger !== customLogger) {
        throw new Error('Custom logger not set correctly');
    }
    
    console.log('✅ EffectEventCoordinator constructor validation passed');
    
    return {
        success: true,
        message: 'Constructor validation completed',
        coordinator: coordinator1
    };
}

/**
 * Test 2: Effect Addition Event Coordination
 */
export async function testEffectEventCoordinatorAddition(testEnv) {
    console.log('🧪 Testing EffectEventCoordinator effect addition...');
    
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    
    let eventEmitted = false;
    let emittedData = null;
    
    const mockEventBus = {
        emit: (eventName, data, metadata) => {
            if (eventName === 'effectconfigurer:effect:add') {
                eventEmitted = true;
                emittedData = data;
            }
        }
    };
    
    const coordinator = new EffectEventCoordinator({ eventBus: mockEventBus });
    
    const testEffect = { name: 'TestEffect', registryKey: 'test-effect' };
    const testConfig = { opacity: 0.8 };
    
    let callbackCalled = false;
    const testCallback = (effect, config) => {
        callbackCalled = true;
        if (effect !== testEffect) {
            throw new Error('Callback should receive the same effect');
        }
        if (config !== testConfig) {
            throw new Error('Callback should receive the same config');
        }
    };
    
    // Test effect addition coordination
    coordinator.coordinateEffectAddition(testEffect, testConfig, testCallback);
    
    if (!eventEmitted) {
        throw new Error('Effect addition event should be emitted');
    }
    
    if (!callbackCalled) {
        throw new Error('Callback should be called');
    }
    
    if (!emittedData || emittedData.effect !== testEffect) {
        throw new Error('Event should contain the effect');
    }
    
    if (!emittedData.config || emittedData.config !== testConfig) {
        throw new Error('Event should contain the config');
    }
    
    // Test without callback
    eventEmitted = false;
    coordinator.coordinateEffectAddition(testEffect, testConfig);
    
    if (!eventEmitted) {
        throw new Error('Event should still be emitted without callback');
    }
    
    // Check metrics were updated
    const metrics = coordinator.getEventMetrics();
    if (metrics.effectsAdded === 0) {
        throw new Error('Effects added metric should be updated');
    }
    
    console.log('✅ EffectEventCoordinator effect addition passed');
    
    return {
        success: true,
        message: 'Effect addition coordination completed',
        effectsAdded: metrics.effectsAdded
    };
}

/**
 * Test 3: Effect Attachment Event Coordination
 */
export async function testEffectEventCoordinatorAttachment(testEnv) {
    console.log('🧪 Testing EffectEventCoordinator effect attachment...');
    
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    
    let eventEmitted = false;
    let emittedData = null;
    
    const mockEventBus = {
        emit: (eventName, data, metadata) => {
            if (eventName === 'effectconfigurer:effect:attach') {
                eventEmitted = true;
                emittedData = data;
            }
        }
    };
    
    const coordinator = new EffectEventCoordinator({ eventBus: mockEventBus });
    
    const testEffect = { name: 'TestEffect', registryKey: 'test-effect' };
    const testConfig = { position: { x: 100, y: 200 } };
    const testProjectState = { targetResolution: 1920 };
    
    let callbackCalled = false;
    const testCallback = (effect, config, projectState) => {
        callbackCalled = true;
        if (effect !== testEffect) {
            throw new Error('Callback should receive the same effect');
        }
        if (config !== testConfig) {
            throw new Error('Callback should receive the same config');
        }
        if (projectState !== testProjectState) {
            throw new Error('Callback should receive the same project state');
        }
    };
    
    // Test effect attachment coordination
    coordinator.coordinateEffectAttachment(testEffect, testConfig, testProjectState, testCallback);
    
    if (!eventEmitted) {
        throw new Error('Effect attachment event should be emitted');
    }
    
    if (!callbackCalled) {
        throw new Error('Callback should be called');
    }
    
    if (!emittedData || emittedData.effect !== testEffect) {
        throw new Error('Event should contain the effect');
    }
    
    if (!emittedData.config || emittedData.config !== testConfig) {
        throw new Error('Event should contain the config');
    }
    
    if (!emittedData.projectState || emittedData.projectState !== testProjectState) {
        throw new Error('Event should contain the project state');
    }
    
    // Test error handling for null inputs
    try {
        coordinator.coordinateEffectAttachment(null, testConfig, testProjectState, testCallback);
        throw new Error('Should throw error for null effect');
    } catch (error) {
        if (!error.message.includes('required')) {
            throw new Error('Should throw specific error for null effect');
        }
    }
    
    // Check metrics were updated
    const metrics = coordinator.getEventMetrics();
    if (metrics.effectsAttached === 0) {
        throw new Error('Effects attached metric should be updated');
    }
    
    console.log('✅ EffectEventCoordinator effect attachment passed');
    
    return {
        success: true,
        message: 'Effect attachment coordination completed',
        effectsAttached: metrics.effectsAttached
    };
}

/**
 * Test 4: Configuration Change Event Coordination
 */
export async function testEffectEventCoordinatorConfigChange(testEnv) {
    console.log('🧪 Testing EffectEventCoordinator configuration change...');
    
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    
    let eventEmitted = false;
    let emittedData = null;
    
    const mockEventBus = {
        emit: (eventName, data, metadata) => {
            if (eventName === 'effectconfigurer:config:change') {
                eventEmitted = true;
                emittedData = data;
            }
        }
    };
    
    const coordinator = new EffectEventCoordinator({ eventBus: mockEventBus });
    
    const testConfig = { opacity: 0.5, size: { width: 100, height: 100 } };
    const testEffect = { name: 'TestEffect', registryKey: 'test-effect' };
    
    let callbackCalled = false;
    const testCallback = (config, effect) => {
        callbackCalled = true;
        if (config !== testConfig) {
            throw new Error('Callback should receive the same config');
        }
        if (effect !== testEffect) {
            throw new Error('Callback should receive the same effect');
        }
    };
    
    // Test configuration change coordination
    coordinator.coordinateConfigurationChange(testConfig, testEffect, testCallback);
    
    if (!eventEmitted) {
        throw new Error('Configuration change event should be emitted');
    }
    
    if (!callbackCalled) {
        throw new Error('Callback should be called');
    }
    
    if (!emittedData || emittedData.config !== testConfig) {
        throw new Error('Event should contain the config');
    }
    
    if (!emittedData.effect || emittedData.effect !== testEffect) {
        throw new Error('Event should contain the effect');
    }
    
    // Test with metadata
    eventEmitted = false;
    const testMetadata = { source: 'user-input', timestamp: Date.now() };
    coordinator.coordinateConfigurationChange(testConfig, testEffect, testCallback, testMetadata);
    
    if (!eventEmitted) {
        throw new Error('Event should be emitted with metadata');
    }
    
    // Check metrics were updated
    const metrics = coordinator.getEventMetrics();
    if (metrics.configurationChanges === 0) {
        throw new Error('Configuration changes metric should be updated');
    }
    
    console.log('✅ EffectEventCoordinator configuration change passed');
    
    return {
        success: true,
        message: 'Configuration change coordination completed',
        configurationChanges: metrics.configurationChanges
    };
}

/**
 * Test 5: Resolution Change Event Coordination
 */
export async function testEffectEventCoordinatorResolutionChange(testEnv) {
    console.log('🧪 Testing EffectEventCoordinator resolution change...');
    
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    
    let eventEmitted = false;
    let emittedData = null;
    
    const mockEventBus = {
        emit: (eventName, data, metadata) => {
            if (eventName === 'effectconfigurer:resolution:change') {
                eventEmitted = true;
                emittedData = data;
            }
        }
    };
    
    const coordinator = new EffectEventCoordinator({ eventBus: mockEventBus });
    
    const oldResolution = 1080;
    const newResolution = 1920;
    const testProjectState = { targetResolution: newResolution, isHorizontal: true };
    
    let callbackCalled = false;
    const testCallback = (oldRes, newRes, projectState) => {
        callbackCalled = true;
        if (oldRes !== oldResolution) {
            throw new Error('Callback should receive the old resolution');
        }
        if (newRes !== newResolution) {
            throw new Error('Callback should receive the new resolution');
        }
        if (projectState !== testProjectState) {
            throw new Error('Callback should receive the project state');
        }
    };
    
    // Test resolution change coordination
    coordinator.coordinateResolutionChange(oldResolution, newResolution, testProjectState, testCallback);
    
    if (!eventEmitted) {
        throw new Error('Resolution change event should be emitted');
    }
    
    if (!callbackCalled) {
        throw new Error('Callback should be called');
    }
    
    if (!emittedData || emittedData.oldResolution !== oldResolution) {
        throw new Error('Event should contain the old resolution');
    }
    
    if (!emittedData.newResolution || emittedData.newResolution !== newResolution) {
        throw new Error('Event should contain the new resolution');
    }
    
    if (!emittedData.projectState || emittedData.projectState !== testProjectState) {
        throw new Error('Event should contain the project state');
    }
    
    // Test without callback
    eventEmitted = false;
    coordinator.coordinateResolutionChange(oldResolution, newResolution, testProjectState);
    
    if (!eventEmitted) {
        throw new Error('Event should still be emitted without callback');
    }
    
    // Check metrics were updated
    const metrics = coordinator.getEventMetrics();
    if (metrics.resolutionChanges === 0) {
        throw new Error('Resolution changes metric should be updated');
    }
    
    console.log('✅ EffectEventCoordinator resolution change passed');
    
    return {
        success: true,
        message: 'Resolution change coordination completed',
        resolutionChanges: metrics.resolutionChanges
    };
}

/**
 * Test 6: Event Metrics Tracking
 */
export async function testEffectEventCoordinatorMetrics(testEnv) {
    console.log('🧪 Testing EffectEventCoordinator metrics tracking...');
    
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    const coordinator = new EffectEventCoordinator();
    
    // Get initial metrics
    const initialMetrics = coordinator.getEventMetrics();
    
    const requiredMetricFields = [
        'effectsAdded',
        'effectsAttached',
        'configurationChanges',
        'resolutionChanges',
        'eventsEmitted',
        'callbacksExecuted',
        'averageEventTime',
        'eventHistory'
    ];
    
    for (const field of requiredMetricFields) {
        if (!(field in initialMetrics)) {
            throw new Error(`Missing metric field: ${field}`);
        }
    }
    
    if (initialMetrics.effectsAdded !== 0) {
        throw new Error('Initial effects added should be 0');
    }
    
    if (initialMetrics.eventsEmitted !== 0) {
        throw new Error('Initial events emitted should be 0');
    }
    
    // Perform some operations to update metrics
    const testEffect = { name: 'TestEffect' };
    const testConfig = { opacity: 0.8 };
    const testProjectState = { targetResolution: 1920 };
    
    coordinator.coordinateEffectAddition(testEffect, testConfig);
    coordinator.coordinateEffectAttachment(testEffect, testConfig, testProjectState);
    coordinator.coordinateConfigurationChange(testConfig, testEffect);
    coordinator.coordinateResolutionChange(1080, 1920, testProjectState);
    
    const afterMetrics = coordinator.getEventMetrics();
    
    if (afterMetrics.effectsAdded <= initialMetrics.effectsAdded) {
        throw new Error('Effects added should increase');
    }
    
    if (afterMetrics.eventsEmitted <= initialMetrics.eventsEmitted) {
        throw new Error('Events emitted should increase');
    }
    
    if (afterMetrics.eventHistory.length === 0) {
        throw new Error('Event history should contain events');
    }
    
    // Test metrics reset
    coordinator.resetMetrics();
    const resetMetrics = coordinator.getEventMetrics();
    
    if (resetMetrics.eventsEmitted !== 0) {
        throw new Error('Metrics should reset to 0');
    }
    
    console.log('✅ EffectEventCoordinator metrics tracking passed');
    
    return {
        success: true,
        message: 'Metrics tracking completed',
        finalMetrics: resetMetrics
    };
}

/**
 * Test 7: Callback Compatibility and Backward Compatibility
 */
export async function testEffectEventCoordinatorCompatibility(testEnv) {
    console.log('🧪 Testing EffectEventCoordinator callback compatibility...');
    
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    const coordinator = new EffectEventCoordinator();
    
    // Test callback registration and execution
    let callbackExecuted = false;
    const testCallback = () => {
        callbackExecuted = true;
    };
    
    const callbackId = coordinator.registerCallback('test-event', testCallback);
    
    if (typeof callbackId !== 'string') {
        throw new Error('Callback registration should return string ID');
    }
    
    // Test callback execution
    coordinator.executeCallback(callbackId);
    
    if (!callbackExecuted) {
        throw new Error('Registered callback should be executed');
    }
    
    // Test callback unregistration
    const unregistered = coordinator.unregisterCallback(callbackId);
    
    if (!unregistered) {
        throw new Error('Callback should be successfully unregistered');
    }
    
    // Test executing unregistered callback (should not throw)
    coordinator.executeCallback(callbackId); // Should be safe
    
    // Test multiple callback registration
    const callback1 = () => {};
    const callback2 = () => {};
    
    const id1 = coordinator.registerCallback('multi-test', callback1);
    const id2 = coordinator.registerCallback('multi-test', callback2);
    
    if (id1 === id2) {
        throw new Error('Different callbacks should get different IDs');
    }
    
    // Test callback registry size
    const registrySize = coordinator.getCallbackRegistrySize();
    
    if (typeof registrySize !== 'number') {
        throw new Error('Registry size should be a number');
    }
    
    if (registrySize < 2) {
        throw new Error('Registry should contain the registered callbacks');
    }
    
    // Test clearing all callbacks
    coordinator.clearCallbacks();
    
    const clearedSize = coordinator.getCallbackRegistrySize();
    if (clearedSize !== 0) {
        throw new Error('Registry should be empty after clearing');
    }
    
    console.log('✅ EffectEventCoordinator callback compatibility passed');
    
    return {
        success: true,
        message: 'Callback compatibility completed',
        registrySize: clearedSize
    };
}

/**
 * Test 8: Performance Baseline Verification
 */
export async function testEffectEventCoordinatorPerformance(testEnv) {
    console.log('🧪 Testing EffectEventCoordinator performance baseline...');
    
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    const coordinator = new EffectEventCoordinator();
    
    // Test performance baseline check
    const performanceCheck = coordinator.checkPerformanceBaseline();
    
    if (typeof performanceCheck.meetsBaseline !== 'boolean') {
        throw new Error('Performance baseline check should return boolean');
    }
    
    if (performanceCheck.instanceProperties > performanceCheck.maxInstanceProperties) {
        throw new Error(`Too many instance properties: ${performanceCheck.instanceProperties} > ${performanceCheck.maxInstanceProperties}`);
    }
    
    // Test event coordination performance
    const startTime = performance.now();
    
    const testEffect = { name: 'TestEffect' };
    const testConfig = { opacity: 0.8 };
    const testProjectState = { targetResolution: 1920 };
    
    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
        coordinator.coordinateEffectAddition(testEffect, testConfig);
        coordinator.coordinateConfigurationChange(testConfig, testEffect);
    }
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    if (processingTime > 100) { // 100ms baseline for 20 operations
        console.warn(`⚠️ Event coordination took ${processingTime.toFixed(2)}ms (baseline: 100ms)`);
    }
    
    // Test callback execution performance
    const callbackStartTime = performance.now();
    
    const fastCallback = () => {};
    const callbackId = coordinator.registerCallback('perf-test', fastCallback);
    
    for (let i = 0; i < 100; i++) {
        coordinator.executeCallback(callbackId);
    }
    
    const callbackEndTime = performance.now();
    const callbackTime = callbackEndTime - callbackStartTime;
    
    if (callbackTime > 50) { // 50ms baseline for 100 callback executions
        console.warn(`⚠️ Callback execution took ${callbackTime.toFixed(2)}ms (baseline: 50ms)`);
    }
    
    console.log('✅ EffectEventCoordinator performance baseline passed');
    
    return {
        success: true,
        message: 'Performance baseline verified',
        eventProcessingTime: processingTime.toFixed(2) + 'ms',
        callbackExecutionTime: callbackTime.toFixed(2) + 'ms',
        performanceCheck
    };
}

// Export all test functions
export const testFunctions = [
    testEffectEventCoordinatorConstructor,
    testEffectEventCoordinatorAddition,
    testEffectEventCoordinatorAttachment,
    testEffectEventCoordinatorConfigChange,
    testEffectEventCoordinatorResolutionChange,
    testEffectEventCoordinatorMetrics,
    testEffectEventCoordinatorCompatibility,
    testEffectEventCoordinatorPerformance
];

export const testInfo = {
    suiteName: 'EffectEventCoordinator Service Tests',
    totalTests: testFunctions.length,
    category: 'unit'
};