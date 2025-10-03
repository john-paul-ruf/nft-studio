/**
 * Tests for EventCaptureService persistent monitoring
 */

import TestEnvironment from '../setup/TestEnvironment.js';

// Helper to reset window.api mock
function resetWindowApiMock() {
    const handlers = {};
    
    global.window = {
        api: {
            startEventMonitoring: async (options) => {
                handlers.monitoringStarted = true;
                return { success: true, options };
            },
            stopEventMonitoring: async () => ({ success: true }),
            onWorkerEvent: (handler) => { 
                handlers.workerHandler = handler;
            },
            removeWorkerEventListener: () => { 
                delete handlers.workerHandler;
            },
            onEventBusMessage: (handler) => { 
                handlers.eventBusHandler = handler;
            },
            offEventBusMessage: (handler) => { 
                delete handlers.eventBusHandler;
            },
            _handlers: handlers
        }
    };
}

/**
 * Test 1: Background monitoring initialization
 */
export async function testPersistentMonitoringInitialization(testEnv) {
    console.log('🧪 Testing persistent monitoring initialization...');
    
    resetWindowApiMock();
    
    // Import service (will auto-initialize)
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 300));
    
    testEnv.assert(
        global.window.api._handlers.monitoringStarted === true,
        'Background monitoring should start automatically'
    );
    
    testEnv.assert(
        typeof global.window.api._handlers.workerHandler === 'function',
        'Worker event handler should be registered'
    );
    
    testEnv.assert(
        typeof global.window.api._handlers.eventBusHandler === 'function',
        'Event bus handler should be registered'
    );
    
    EventCaptureService.cleanup();
    console.log('✅ Persistent monitoring initialization test passed');
}

/**
 * Test 2: Event buffering
 */
export async function testEventBuffering(testEnv) {
    console.log('🧪 Testing event buffering...');
    
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    EventCaptureService.cleanup();
    await EventCaptureService.startPersistentMonitoring();
    
    // Simulate receiving an event
    const testEvent = {
        eventName: 'test.event',
        data: { test: 'data' },
        timestamp: new Date().toISOString()
    };
    
    const workerHandler = global.window.api._handlers.workerHandler;
    workerHandler(testEvent);
    
    const bufferedEvents = EventCaptureService.getBufferedEvents();
    
    testEnv.assert(
        bufferedEvents.length > 0,
        'Events should be buffered'
    );
    
    testEnv.assert(
        bufferedEvents[0].eventName === 'test.event',
        'Buffered event should match sent event'
    );
    
    EventCaptureService.cleanup();
    console.log('✅ Event buffering test passed');
}

/**
 * Test 3: Callback notifications
 */
export async function testCallbackNotifications(testEnv) {
    console.log('🧪 Testing callback notifications...');
    
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    EventCaptureService.cleanup();
    await EventCaptureService.startPersistentMonitoring();
    
    let callbackCalled = false;
    let receivedEvent = null;
    
    const callback = (eventData) => {
        callbackCalled = true;
        receivedEvent = eventData;
    };
    
    EventCaptureService.registerCallback(callback);
    
    // Simulate receiving an event
    const testEvent = {
        eventName: 'test.event',
        data: { test: 'data' }
    };
    
    const workerHandler = global.window.api._handlers.workerHandler;
    workerHandler(testEvent);
    
    testEnv.assert(
        callbackCalled === true,
        'Callback should be called when event arrives'
    );
    
    testEnv.assert(
        receivedEvent !== null && receivedEvent.eventName === 'test.event',
        'Callback should receive correct event data'
    );
    
    EventCaptureService.cleanup();
    console.log('✅ Callback notifications test passed');
}

/**
 * Test 4: Buffer size limit
 */
export async function testBufferSizeLimit(testEnv) {
    console.log('🧪 Testing buffer size limit...');
    
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    EventCaptureService.cleanup();
    await EventCaptureService.startPersistentMonitoring();
    
    const workerHandler = global.window.api._handlers.workerHandler;
    
    // Add more events than buffer size
    for (let i = 0; i < 1100; i++) {
        workerHandler({
            eventName: `test.event.${i}`,
            data: { index: i }
        });
    }
    
    const bufferedEvents = EventCaptureService.getBufferedEvents();
    
    testEnv.assert(
        bufferedEvents.length <= 1000,
        `Buffer should not exceed 1000 events (got ${bufferedEvents.length})`
    );
    
    EventCaptureService.cleanup();
    console.log('✅ Buffer size limit test passed');
}

/**
 * Test 5: Clear buffer
 */
export async function testClearBuffer(testEnv) {
    console.log('🧪 Testing clear buffer...');
    
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    EventCaptureService.cleanup();
    await EventCaptureService.startPersistentMonitoring();
    
    // Add some events
    const workerHandler = global.window.api._handlers.workerHandler;
    workerHandler({
        eventName: 'test.event',
        data: { test: 'data' }
    });
    
    testEnv.assert(
        EventCaptureService.getBufferedEvents().length > 0,
        'Buffer should have events before clearing'
    );
    
    // Clear buffer
    EventCaptureService.clearBuffer();
    
    testEnv.assert(
        EventCaptureService.getBufferedEvents().length === 0,
        'Buffer should be empty after clearing'
    );
    
    EventCaptureService.cleanup();
    console.log('✅ Clear buffer test passed');
}

/**
 * Test 6: Callback registration and unregistration
 */
export async function testCallbackRegistration(testEnv) {
    console.log('🧪 Testing callback registration/unregistration...');
    
    resetWindowApiMock();
    
    const EventCaptureService = (await import('../../src/services/EventCaptureService.js')).default;
    EventCaptureService.cleanup();
    await EventCaptureService.startPersistentMonitoring();
    
    let callCount = 0;
    const callback = () => { callCount++; };
    
    const unregister = EventCaptureService.registerCallback(callback);
    
    // Trigger event
    const workerHandler = global.window.api._handlers.workerHandler;
    workerHandler({
        eventName: 'test.event',
        data: { test: 'data' }
    });
    
    testEnv.assert(
        callCount === 1,
        'Callback should be called once'
    );
    
    // Unregister
    unregister();
    
    // Trigger another event
    workerHandler({
        eventName: 'test.event.2',
        data: { test: 'data2' }
    });
    
    testEnv.assert(
        callCount === 1,
        'Callback should not be called after unregistration'
    );
    
    EventCaptureService.cleanup();
    console.log('✅ Callback registration test passed');
}