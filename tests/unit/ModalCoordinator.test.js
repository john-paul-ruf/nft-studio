/**
 * ModalCoordinator Test Suite
 * Tests modal state management and coordination functionality
 */

import ModalCoordinator from '../../src/services/ModalCoordinator.js';
import eventBusSingleton from '../../src/services/EventBusService.js';

// Test utilities - Wrapper for real EventBusService with tracking
class TestEventBus {
    constructor() {
        this.events = [];
        this.actualEventBus = eventBusSingleton;
        this.actualEventBus.isLoggingEnabled = false; // Disable logging for tests
    }

    emit(eventName, data, metadata) {
        this.events.push({ eventName, data, metadata, timestamp: Date.now() });
        return this.actualEventBus.emit(eventName, data, metadata);
    }

    subscribe(eventName, handler, options) {
        return this.actualEventBus.subscribe(eventName, handler, options);
    }

    getEvents() {
        return [...this.events];
    }

    clearEvents() {
        this.events = [];
    }
}

class TestLogger {
    constructor() {
        this.logs = [];
    }

    log(message, data) {
        this.logs.push({ level: 'log', message, data, timestamp: Date.now() });
    }

    info(message, data) {
        this.logs.push({ level: 'info', message, data, timestamp: Date.now() });
    }

    warn(message, data) {
        this.logs.push({ level: 'warn', message, data, timestamp: Date.now() });
    }

    error(message, data) {
        this.logs.push({ level: 'error', message, data, timestamp: Date.now() });
    }

    getLogs() {
        return [...this.logs];
    }

    clearLogs() {
        this.logs = [];
    }
}

// Test functions
function testConstructorValidation() {
    console.log('🧪 Testing ModalCoordinator constructor validation...');
    
    let testsPassed = 0;
    let totalTests = 3;

    try {
        // Test missing eventBus
        try {
            new ModalCoordinator(null, new TestLogger());
            console.log('❌ Should throw error for missing eventBus');
        } catch (error) {
            if (error.message.includes('eventBus')) {
                console.log('✅ Correctly throws error for missing eventBus');
                testsPassed++;
            }
        }

        // Test missing logger
        try {
            new ModalCoordinator(new TestEventBus(), null);
            console.log('❌ Should throw error for missing logger');
        } catch (error) {
            if (error.message.includes('logger')) {
                console.log('✅ Correctly throws error for missing logger');
                testsPassed++;
            }
        }

        // Test successful construction
        const eventBus = new TestEventBus();
        const logger = new TestLogger();
        const coordinator = new ModalCoordinator(eventBus, logger);
        
        if (coordinator.eventBus === eventBus && coordinator.logger === logger) {
            console.log('✅ Constructor initializes dependencies correctly');
            testsPassed++;
        }

    } catch (error) {
        console.log('❌ Constructor validation test failed:', error.message);
    }

    console.log(`📊 Constructor validation: ${testsPassed}/${totalTests} tests passed\n`);
    return testsPassed === totalTests;
}

function testSpecialtyModalOperations() {
    console.log('🧪 Testing specialty modal operations...');
    
    let testsPassed = 0;
    let totalTests = 6;

    try {
        const eventBus = new TestEventBus();
        const logger = new TestLogger();
        const coordinator = new ModalCoordinator(eventBus, logger);

        // Test opening specialty modal
        const openResult = coordinator.openSpecialtyModal({ data: { test: 'data' } });
        if (openResult === true) {
            console.log('✅ Specialty modal opens successfully');
            testsPassed++;
        }

        // Test modal state after opening
        const states = coordinator.getModalStates();
        if (states.specialty.isOpen === true && states.specialty.data.test === 'data') {
            console.log('✅ Specialty modal state updated correctly');
            testsPassed++;
        }

        // Test event emission on open
        const events = eventBus.getEvents();
        if (events.length === 1 && events[0].eventName === 'modal:specialty:opened') {
            console.log('✅ Specialty modal open event emitted');
            testsPassed++;
        }

        // Test preventing double open
        const doubleOpenResult = coordinator.openSpecialtyModal();
        if (doubleOpenResult === false) {
            console.log('✅ Prevents opening specialty modal when already open');
            testsPassed++;
        }

        // Test closing specialty modal
        const closeResult = coordinator.closeSpecialtyModal();
        if (closeResult === true) {
            console.log('✅ Specialty modal closes successfully');
            testsPassed++;
        }

        // Test modal state after closing
        const closedStates = coordinator.getModalStates();
        if (closedStates.specialty.isOpen === false && closedStates.specialty.data === null) {
            console.log('✅ Specialty modal state reset after closing');
            testsPassed++;
        }

    } catch (error) {
        console.log('❌ Specialty modal operations test failed:', error.message);
    }

    console.log(`📊 Specialty modal operations: ${testsPassed}/${totalTests} tests passed\n`);
    return testsPassed === totalTests;
}

function testBulkAddModalOperations() {
    console.log('🧪 Testing bulk add modal operations...');
    
    let testsPassed = 0;
    let totalTests = 7;

    try {
        const eventBus = new TestEventBus();
        const logger = new TestLogger();
        const coordinator = new ModalCoordinator(eventBus, logger);

        // Test opening bulk add modal with valid target index
        const openResult = coordinator.openBulkAddModal(5, { data: { test: 'bulk' } });
        if (openResult === true) {
            console.log('✅ Bulk add modal opens successfully');
            testsPassed++;
        }

        // Test modal state after opening
        const states = coordinator.getModalStates();
        if (states.bulkAdd.isOpen === true && states.bulkAdd.targetIndex === 5) {
            console.log('✅ Bulk add modal state updated correctly');
            testsPassed++;
        }

        // Test event emission on open
        const events = eventBus.getEvents();
        if (events.length === 1 && events[0].eventName === 'modal:bulkadd:opened') {
            console.log('✅ Bulk add modal open event emitted');
            testsPassed++;
        }

        // Test invalid target index
        coordinator.closeBulkAddModal(); // Close first
        const invalidResult = coordinator.openBulkAddModal(-1);
        if (invalidResult === false) {
            console.log('✅ Rejects invalid target index');
            testsPassed++;
        }

        // Reopen for closing tests
        coordinator.openBulkAddModal(3);

        // Test preventing double open
        const doubleOpenResult = coordinator.openBulkAddModal(7);
        if (doubleOpenResult === false) {
            console.log('✅ Prevents opening bulk add modal when already open');
            testsPassed++;
        }

        // Test closing bulk add modal
        const closeResult = coordinator.closeBulkAddModal();
        if (closeResult === true) {
            console.log('✅ Bulk add modal closes successfully');
            testsPassed++;
        }

        // Test modal state after closing
        const closedStates = coordinator.getModalStates();
        if (closedStates.bulkAdd.isOpen === false && closedStates.bulkAdd.targetIndex === null) {
            console.log('✅ Bulk add modal state reset after closing');
            testsPassed++;
        }

    } catch (error) {
        console.log('❌ Bulk add modal operations test failed:', error.message);
    }

    console.log(`📊 Bulk add modal operations: ${testsPassed}/${totalTests} tests passed\n`);
    return testsPassed === totalTests;
}

function testSpecialtyCreationHandling() {
    console.log('🧪 Testing specialty creation handling...');
    
    let testsPassed = 0;
    let totalTests = 5;

    try {
        const eventBus = new TestEventBus();
        const logger = new TestLogger();
        const coordinator = new ModalCoordinator(eventBus, logger);

        // Test valid specialty creation
        const validEffects = [
            { registryKey: 'TestEffect1', config: { param: 'value1' } },
            { registryKey: 'TestEffect2', config: { param: 'value2' } }
        ];

        coordinator.openSpecialtyModal(); // Open modal first
        const createResult = coordinator.handleSpecialtyCreation(validEffects);
        
        if (createResult === true) {
            console.log('✅ Handles valid specialty creation');
            testsPassed++;
        }

        // Test event emission for specialty creation
        const events = eventBus.getEvents();
        const specialtyEvents = events.filter(e => e.eventName === 'effectspanel:effect:addspecialty');
        if (specialtyEvents.length === 2) {
            console.log('✅ Emits correct number of specialty creation events');
            testsPassed++;
        }

        // Test modal closes after creation
        const states = coordinator.getModalStates();
        if (states.specialty.isOpen === false) {
            console.log('✅ Closes modal after specialty creation');
            testsPassed++;
        }

        // Test invalid specialty effects
        const invalidEffects = [{ invalidData: true }];
        coordinator.openSpecialtyModal(); // Reopen
        const invalidResult = coordinator.handleSpecialtyCreation(invalidEffects);
        
        if (invalidResult === false) {
            console.log('✅ Rejects invalid specialty effects');
            testsPassed++;
        }

        // Test empty effects array
        const emptyResult = coordinator.handleSpecialtyCreation([]);
        if (emptyResult === false) {
            console.log('✅ Rejects empty specialty effects array');
            testsPassed++;
        }

    } catch (error) {
        console.log('❌ Specialty creation handling test failed:', error.message);
    }

    console.log(`📊 Specialty creation handling: ${testsPassed}/${totalTests} tests passed\n`);
    return testsPassed === totalTests;
}

function testBulkAddHandling() {
    console.log('🧪 Testing bulk add keyframes handling...');
    
    let testsPassed = 0;
    let totalTests = 5;

    try {
        const eventBus = new TestEventBus();
        const logger = new TestLogger();
        const coordinator = new ModalCoordinator(eventBus, logger);

        // Test valid bulk add
        const validKeyframes = [
            { registryKey: 'KeyframeEffect1', frame: 10, config: { param: 'value1' } },
            { registryKey: 'KeyframeEffect2', frame: 20, config: { param: 'value2' } }
        ];

        coordinator.openBulkAddModal(5); // Open modal with target index
        const bulkAddResult = coordinator.handleBulkAddKeyframes(validKeyframes);
        
        if (bulkAddResult === true) {
            console.log('✅ Handles valid bulk add keyframes');
            testsPassed++;
        }

        // Test event emission for bulk add
        const events = eventBus.getEvents();
        const keyframeEvents = events.filter(e => e.eventName === 'effectspanel:effect:addkeyframe');
        if (keyframeEvents.length === 2) {
            console.log('✅ Emits correct number of keyframe creation events');
            testsPassed++;
        }

        // Test modal closes after bulk add
        const states = coordinator.getModalStates();
        if (states.bulkAdd.isOpen === false) {
            console.log('✅ Closes modal after bulk add');
            testsPassed++;
        }

        // Test invalid keyframe effects
        const invalidKeyframes = [{ registryKey: 'Test', frame: -1 }]; // Invalid frame
        coordinator.openBulkAddModal(3); // Reopen
        const invalidResult = coordinator.handleBulkAddKeyframes(invalidKeyframes);
        
        if (invalidResult === false) {
            console.log('✅ Rejects invalid keyframe effects');
            testsPassed++;
        }

        // Test bulk add without target index
        coordinator.closeBulkAddModal();
        const noTargetResult = coordinator.handleBulkAddKeyframes(validKeyframes);
        if (noTargetResult === false) {
            console.log('✅ Rejects bulk add without target index');
            testsPassed++;
        }

    } catch (error) {
        console.log('❌ Bulk add handling test failed:', error.message);
    }

    console.log(`📊 Bulk add handling: ${testsPassed}/${totalTests} tests passed\n`);
    return testsPassed === totalTests;
}

function testStateManagement() {
    console.log('🧪 Testing state management...');
    
    let testsPassed = 0;
    let totalTests = 4;

    try {
        const eventBus = new TestEventBus();
        const logger = new TestLogger();
        const coordinator = new ModalCoordinator(eventBus, logger);

        // Test initial state
        const initialStates = coordinator.getModalStates();
        if (!coordinator.isAnyModalOpen() && 
            !initialStates.specialty.isOpen && 
            !initialStates.bulkAdd.isOpen) {
            console.log('✅ Initial state is correct');
            testsPassed++;
        }

        // Test state after opening specialty modal
        coordinator.openSpecialtyModal();
        if (coordinator.isAnyModalOpen()) {
            console.log('✅ Detects open modal correctly');
            testsPassed++;
        }

        // Test state after opening both modals (should prevent second)
        coordinator.openBulkAddModal(1);
        const bothStates = coordinator.getModalStates();
        if (bothStates.specialty.isOpen && !bothStates.bulkAdd.isOpen) {
            console.log('✅ Prevents multiple modals from being open');
            testsPassed++;
        }

        // Test reset functionality
        coordinator.reset();
        const resetStates = coordinator.getModalStates();
        if (!coordinator.isAnyModalOpen() && 
            !resetStates.specialty.isOpen && 
            !resetStates.bulkAdd.isOpen) {
            console.log('✅ Reset functionality works correctly');
            testsPassed++;
        }

    } catch (error) {
        console.log('❌ State management test failed:', error.message);
    }

    console.log(`📊 State management: ${testsPassed}/${totalTests} tests passed\n`);
    return testsPassed === totalTests;
}

function testValidationAndMetrics() {
    console.log('🧪 Testing validation and metrics...');
    
    let testsPassed = 0;
    let totalTests = 6;

    try {
        const eventBus = new TestEventBus();
        const logger = new TestLogger();
        const coordinator = new ModalCoordinator(eventBus, logger);

        // Test specialty effect validation
        const validSpecialty = { registryKey: 'TestEffect', config: { param: 'value' } };
        const invalidSpecialty = { invalidData: true };
        
        if (coordinator.validateSpecialtyEffect(validSpecialty) === true) {
            console.log('✅ Validates valid specialty effect');
            testsPassed++;
        }

        if (coordinator.validateSpecialtyEffect(invalidSpecialty) === false) {
            console.log('✅ Rejects invalid specialty effect');
            testsPassed++;
        }

        // Test keyframe effect validation
        const validKeyframe = { registryKey: 'KeyframeEffect', frame: 10, config: { param: 'value' } };
        const invalidKeyframe = { registryKey: 'Test', frame: -1 };
        
        if (coordinator.validateKeyframeEffect(validKeyframe) === true) {
            console.log('✅ Validates valid keyframe effect');
            testsPassed++;
        }

        if (coordinator.validateKeyframeEffect(invalidKeyframe) === false) {
            console.log('✅ Rejects invalid keyframe effect');
            testsPassed++;
        }

        // Test metrics tracking
        coordinator.openSpecialtyModal();
        coordinator.closeSpecialtyModal();
        coordinator.openBulkAddModal(1);
        coordinator.closeBulkAddModal();
        
        const metrics = coordinator.getMetrics();
        if (metrics.modalsOpened === 2 && metrics.modalsClosed === 2) {
            console.log('✅ Tracks modal open/close metrics');
            testsPassed++;
        }

        // Test metrics include timing data
        if (typeof metrics.averageOpenTime === 'number' && metrics.averageOpenTime >= 0) {
            console.log('✅ Tracks modal timing metrics');
            testsPassed++;
        }

    } catch (error) {
        console.log('❌ Validation and metrics test failed:', error.message);
    }

    console.log(`📊 Validation and metrics: ${testsPassed}/${totalTests} tests passed\n`);
    return testsPassed === totalTests;
}

function testPerformanceBaselines() {
    console.log('🧪 Testing performance baselines...');
    
    let testsPassed = 0;
    let totalTests = 3;

    try {
        const eventBus = new TestEventBus();
        const logger = new TestLogger();

        // Test constructor performance
        const constructorStart = performance.now();
        const coordinator = new ModalCoordinator(eventBus, logger);
        const constructorTime = performance.now() - constructorStart;

        if (constructorTime < 100) { // Should be under 100ms
            console.log(`✅ Constructor performance: ${constructorTime.toFixed(2)}ms`);
            testsPassed++;
        } else {
            console.log(`❌ Constructor too slow: ${constructorTime.toFixed(2)}ms`);
        }

        // Test modal operations performance
        const operationsStart = performance.now();
        coordinator.openSpecialtyModal();
        coordinator.closeSpecialtyModal();
        coordinator.openBulkAddModal(1);
        coordinator.closeBulkAddModal();
        const operationsTime = performance.now() - operationsStart;

        if (operationsTime < 50) { // Should be under 50ms
            console.log(`✅ Modal operations performance: ${operationsTime.toFixed(2)}ms`);
            testsPassed++;
        } else {
            console.log(`❌ Modal operations too slow: ${operationsTime.toFixed(2)}ms`);
        }

        // Test instance properties count (complexity check)
        const propertyCount = Object.keys(coordinator).length;
        if (propertyCount < 15) { // Should have reasonable number of properties
            console.log(`✅ Instance complexity: ${propertyCount} properties`);
            testsPassed++;
        } else {
            console.log(`❌ Too many instance properties: ${propertyCount}`);
        }

    } catch (error) {
        console.log('❌ Performance baselines test failed:', error.message);
    }

    console.log(`📊 Performance baselines: ${testsPassed}/${totalTests} tests passed\n`);
    return testsPassed === totalTests;
}

// Main test runner
function runAllTests() {
    console.log('🚀 Starting ModalCoordinator Test Suite...\n');
    
    const results = [
        testConstructorValidation(),
        testSpecialtyModalOperations(),
        testBulkAddModalOperations(),
        testSpecialtyCreationHandling(),
        testBulkAddHandling(),
        testStateManagement(),
        testValidationAndMetrics(),
        testPerformanceBaselines()
    ];
    
    const passed = results.filter(Boolean).length;
    const total = results.length;
    
    console.log('📋 ModalCoordinator Test Results Summary:');
    console.log(`✅ Passed: ${passed}/${total} test functions`);
    console.log(`❌ Failed: ${total - passed}/${total} test functions`);
    
    if (passed === total) {
        console.log('🎉 All ModalCoordinator tests passed! Service is ready for integration.');
    } else {
        console.log('⚠️  Some ModalCoordinator tests failed. Please review the issues above.');
    }
    
    return passed === total;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { runAllTests };