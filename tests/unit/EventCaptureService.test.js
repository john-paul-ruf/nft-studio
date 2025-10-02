/**
 * EventCaptureService Tests
 * 
 * Comprehensive tests for EventCaptureService functionality
 */

import TestEnvironment from '../setup/TestEnvironment.js';

// Helper to reset window.api mock
function resetWindowApiMock() {
    global.window = {
        api: {
            startEventMonitoring: async (options) => ({ success: true, options }),
            stopEventMonitoring: async () => ({ success: true }),
            onWorkerEvent: (handler) => { global.window.api._workerHandler = handler; },
            removeWorkerEventListener: () => { delete global.window.api._workerHandler; },
            onEventBusMessage: (handler) => { global.window.api._eventBusHandler = handler; },
            offEventBusMessage: (handler) => { delete global.window.api._eventBusHandler; }
        }
    };
}

// Initialize mock
resetWindowApiMock();

/**
 * Test 1: Start and Stop Event Monitoring
 */
export async function testEventCaptureServiceMonitoring(testEnv) {
    console.log('🧪 Testing EventCaptureService monitoring...');
    
    // Reset mock before test
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    
    // Clean up any previous state
    EventCaptureService.cleanup();
    
    // Test start monitoring
    const startResult = await EventCaptureService.startMonitoring({
        enableDebug: true,
        captureAll: true
    });
    
    if (!startResult.success) {
        throw new Error('Failed to start monitoring');
    }
    
    if (!EventCaptureService.isActive()) {
        throw new Error('Monitoring should be active');
    }
    
    // Test stop monitoring
    const stopResult = await EventCaptureService.stopMonitoring();
    
    if (!stopResult.success) {
        throw new Error('Failed to stop monitoring');
    }
    
    if (EventCaptureService.isActive()) {
        throw new Error('Monitoring should be inactive');
    }
    
    console.log('✅ EventCaptureService monitoring test passed');
    
    return {
        testName: 'EventCaptureService Monitoring',
        assertions: 4,
        duration: 0
    };
}

/**
 * Test 2: Worker Event Subscription
 */
export async function testEventCaptureServiceWorkerEvents(testEnv) {
    console.log('🧪 Testing EventCaptureService worker events...');
    
    // Reset mock before test
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    EventCaptureService.cleanup();
    
    let callbackCalled = false;
    const callback = (event) => { callbackCalled = true; };
    
    const unsubscribe = EventCaptureService.subscribeToWorkerEvents(callback);
    
    if (typeof unsubscribe !== 'function') {
        throw new Error('Unsubscribe should be a function');
    }
    
    if (EventCaptureService.getListenerCount() !== 1) {
        throw new Error('Listener count should be 1');
    }
    
    // Cleanup
    unsubscribe();
    
    if (EventCaptureService.getListenerCount() !== 0) {
        throw new Error('Listener count should be 0 after unsubscribe');
    }
    
    console.log('✅ EventCaptureService worker events test passed');
    
    return {
        testName: 'EventCaptureService Worker Events',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 3: Event Bus Message Subscription
 */
export async function testEventCaptureServiceEventBusMessages(testEnv) {
    console.log('🧪 Testing EventCaptureService event bus messages...');
    
    // Reset mock before test
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    EventCaptureService.cleanup();
    
    const callback = (event) => {};
    const unsubscribe = EventCaptureService.subscribeToEventBusMessages(callback);
    
    if (typeof unsubscribe !== 'function') {
        throw new Error('Unsubscribe should be a function');
    }
    
    if (EventCaptureService.getListenerCount() !== 1) {
        throw new Error('Listener count should be 1');
    }
    
    // Cleanup
    unsubscribe();
    
    if (EventCaptureService.getListenerCount() !== 0) {
        throw new Error('Listener count should be 0 after unsubscribe');
    }
    
    console.log('✅ EventCaptureService event bus messages test passed');
    
    return {
        testName: 'EventCaptureService Event Bus Messages',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 4: Event Data Normalization
 */
export async function testEventCaptureServiceNormalization(testEnv) {
    console.log('🧪 Testing EventCaptureService normalization...');
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    
    const rawEvent = {
        eventName: 'frameCompleted',
        data: { frameNumber: 5, totalFrames: 100 },
        timestamp: '2025-02-01T12:00:00.000Z'
    };
    
    const normalized = EventCaptureService.normalizeEventData(rawEvent);
    
    if (normalized.eventName !== 'frameCompleted') {
        throw new Error('Event name not normalized correctly');
    }
    
    if (JSON.stringify(normalized.data) !== JSON.stringify({ frameNumber: 5, totalFrames: 100 })) {
        throw new Error('Event data not normalized correctly');
    }
    
    if (normalized.timestamp !== '2025-02-01T12:00:00.000Z') {
        throw new Error('Timestamp not normalized correctly');
    }
    
    console.log('✅ EventCaptureService normalization test passed');
    
    return {
        testName: 'EventCaptureService Normalization',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 5: Event Object Creation
 */
export async function testEventCaptureServiceEventObject(testEnv) {
    console.log('🧪 Testing EventCaptureService event object creation...');
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    
    const eventData = {
        eventName: 'frameCompleted',
        data: { frameNumber: 10 }
    };
    
    const detectCategory = (eventName, data) => 'FRAME';
    const eventObject = EventCaptureService.createEventObject(eventData, detectCategory);
    
    if (eventObject.type !== 'frameCompleted') {
        throw new Error('Event type not set correctly');
    }
    
    if (eventObject.category !== 'FRAME') {
        throw new Error('Event category not set correctly');
    }
    
    if (!eventObject.raw.includes('frameCompleted')) {
        throw new Error('Raw event data not set correctly');
    }
    
    console.log('✅ EventCaptureService event object creation test passed');
    
    return {
        testName: 'EventCaptureService Event Object Creation',
        assertions: 3,
        duration: 0
    };
}

/**
 * Test 6: Cleanup All Listeners
 */
export async function testEventCaptureServiceCleanup(testEnv) {
    console.log('🧪 Testing EventCaptureService cleanup...');
    
    // Reset mock before test
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    EventCaptureService.cleanup();
    
    // Subscribe to multiple events
    EventCaptureService.subscribeToWorkerEvents(() => {});
    EventCaptureService.subscribeToEventBusMessages(() => {});
    
    if (EventCaptureService.getListenerCount() !== 2) {
        throw new Error('Listener count should be 2');
    }
    
    // Cleanup
    EventCaptureService.cleanup();
    
    if (EventCaptureService.getListenerCount() !== 0) {
        throw new Error('Listener count should be 0 after cleanup');
    }
    
    console.log('✅ EventCaptureService cleanup test passed');
    
    return {
        testName: 'EventCaptureService Cleanup',
        assertions: 2,
        duration: 0
    };
}

/**
 * Test 7: Error Handling
 */
export async function testEventCaptureServiceErrorHandling(testEnv) {
    console.log('🧪 Testing EventCaptureService error handling...');
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    
    // Save original API
    const originalApi = global.window.api;
    
    // Test with missing window.api
    global.window.api = null;
    
    const result = await EventCaptureService.startMonitoring();
    
    if (result.success) {
        throw new Error('Should fail when window.api is not available');
    }
    
    if (!result.error.includes('window.api not available')) {
        throw new Error('Error message should mention window.api not available');
    }
    
    // Restore
    global.window.api = originalApi;
    
    console.log('✅ EventCaptureService error handling test passed');
    
    return {
        testName: 'EventCaptureService Error Handling',
        assertions: 2,
        duration: 0
    };
}

/**
 * Test 8: Listener Count Tracking
 */
export async function testEventCaptureServiceListenerCount(testEnv) {
    console.log('🧪 Testing EventCaptureService listener count...');
    
    // Reset mock before test
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    
    // Start with clean state
    EventCaptureService.cleanup();
    
    if (EventCaptureService.getListenerCount() !== 0) {
        throw new Error('Initial listener count should be 0');
    }
    
    // Add listeners
    const unsub1 = EventCaptureService.subscribeToWorkerEvents(() => {});
    if (EventCaptureService.getListenerCount() !== 1) {
        throw new Error('Listener count should be 1');
    }
    
    const unsub2 = EventCaptureService.subscribeToEventBusMessages(() => {});
    if (EventCaptureService.getListenerCount() !== 2) {
        throw new Error('Listener count should be 2');
    }
    
    // Remove one listener
    unsub1();
    if (EventCaptureService.getListenerCount() !== 1) {
        throw new Error('Listener count should be 1 after removing one');
    }
    
    // Remove second listener
    unsub2();
    if (EventCaptureService.getListenerCount() !== 0) {
        throw new Error('Listener count should be 0 after removing all');
    }
    
    console.log('✅ EventCaptureService listener count test passed');
    
    return {
        testName: 'EventCaptureService Listener Count',
        assertions: 5,
        duration: 0
    };
}