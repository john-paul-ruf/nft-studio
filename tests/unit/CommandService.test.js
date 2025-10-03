/**
 * CommandService Tests - REAL OBJECTS ONLY (NO MOCKS)
 * Tests the single source of truth for all user actions with undo/redo
 * 
 * CRITICAL: This test file uses REAL CommandService instance and REAL commands
 * NO MOCKS, NO STUBS, NO SPIES - Only real objects and real behavior
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import CommandService, { Command } from '../../src/services/CommandService.js';
import EventBusService from '../../src/services/EventBusService.js';

/**
 * Test Command Implementation - REAL command for testing
 */
class TestCommand extends Command {
    constructor(type, value, description) {
        const executeAction = () => {
            this.executed = true;
            this.executionCount = (this.executionCount || 0) + 1;
            this.lastExecutedAt = Date.now();
            return { success: true, value };
        };
        
        const undoAction = () => {
            this.undone = true;
            this.undoCount = (this.undoCount || 0) + 1;
            this.lastUndoneAt = Date.now();
            return { success: true, undone: value };
        };
        
        super(type, executeAction, undoAction, description);
        this.value = value;
        this.isEffectCommand = true; // Mark as effect command for undo/redo tracking
        this.executed = false;
        this.undone = false;
        this.executionCount = 0;
        this.undoCount = 0;
    }
}

/**
 * Non-Effect Test Command - REAL command that should not be tracked
 */
class NonEffectCommand extends Command {
    constructor(type, value) {
        const executeAction = () => {
            this.executed = true;
            return { success: true, value };
        };
        
        super(type, executeAction, null, `Non-effect: ${type}`);
        this.value = value;
        this.isEffectCommand = false; // Mark as non-effect command
        this.executed = false;
    }
}

/**
 * Failing Command - REAL command that throws errors for testing error handling
 */
class FailingCommand extends Command {
    constructor(type, shouldFailOnExecute = true, shouldFailOnUndo = false) {
        const executeAction = () => {
            if (shouldFailOnExecute) {
                throw new Error(`Execute failed for ${type}`);
            }
            this.executed = true;
            return { success: true };
        };
        
        const undoAction = () => {
            if (shouldFailOnUndo) {
                throw new Error(`Undo failed for ${type}`);
            }
            this.undone = true;
            return { success: true };
        };
        
        super(type, executeAction, undoAction, `Failing: ${type}`);
        this.isEffectCommand = true;
        this.shouldFailOnExecute = shouldFailOnExecute;
        this.shouldFailOnUndo = shouldFailOnUndo;
        this.executed = false;
        this.undone = false;
    }
}

/**
 * Async Test Command - REAL async command for concurrency testing
 */
class AsyncTestCommand extends Command {
    constructor(id, delay = 50, executionOrder) {
        const executeAction = async () => {
            executionOrder.push(`start-${id}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            executionOrder.push(`end-${id}`);
            return { success: true, id };
        };
        
        super(`async-command-${id}`, executeAction, null, `Async command ${id}`);
        this.isEffectCommand = true;
        this.id = id;
    }
}

// Helper function to create test environment and setup
async function setupTestEnvironment() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();
    
    // Use REAL CommandService singleton instance
    const commandService = CommandService;
    
    // Clear command history for clean test state
    commandService.clear();
    
    // Capture REAL EventBus events for verification
    const eventBusEvents = [];
    const originalEmit = EventBusService.emit;
    EventBusService.emit = (event, payload, options) => {
        eventBusEvents.push({ event, payload, options });
        return originalEmit.call(EventBusService, event, payload, options);
    };
    
    return { testEnv, commandService, eventBusEvents, originalEmit };
}

// Helper function to cleanup test environment
async function cleanupTestEnvironment(testEnv, originalEmit) {
    // Restore original EventBus emit
    EventBusService.emit = originalEmit;
    
    // Clear command history
    CommandService.clear();
    
    // Complete cleanup
    await testEnv.cleanup();
}

// Test 1: Command Stack Overflow Handling
export async function testCommandStackOverflowHandling() {
    console.log('🧪 Testing command stack overflow with REAL CommandService...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Create 55 REAL effect commands (5 more than max)
        const commands = [];
        for (let i = 0; i < 55; i++) {
            commands.push(new TestCommand(`test-command-${i}`, i, `Test command ${i}`));
        }
        
        // Execute all commands using REAL CommandService
        for (const command of commands) {
            await commandService.execute(command);
        }
        
        // Verify stack size is limited to 50 (REAL behavior)
        const state = commandService.getState();
        console.log(`📊 Stack size after 55 commands: ${state.undoStackSize}`);
        
        // Should have exactly 50 commands (max stack size)
        if (state.undoStackSize !== 50) {
            throw new Error(`Expected stack size 50, got ${state.undoStackSize}`);
        }
        
        // Verify oldest commands were removed (commands 0-4 should be gone)
        const undoHistory = commandService.getUndoHistory();
        const oldestCommand = undoHistory[undoHistory.length - 1]; // Last in reversed array
        
        console.log(`📋 Oldest command in stack: ${oldestCommand.type}`);
        
        // Should start from command 5 (0-4 were removed)
        if (!oldestCommand.type.includes('test-command-5')) {
            throw new Error(`Expected oldest command to be test-command-5, got ${oldestCommand.type}`);
        }
        
        // Verify newest command is still there
        const newestCommand = undoHistory[0]; // First in reversed array
        if (!newestCommand.type.includes('test-command-54')) {
            throw new Error(`Expected newest command to be test-command-54, got ${newestCommand.type}`);
        }
        
        console.log('✅ Stack overflow handling test passed with REAL commands');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 2: Concurrent Command Execution Prevention
export async function testConcurrentCommandExecutionPrevention() {
    console.log('🧪 Testing concurrent execution prevention with REAL CommandService...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        let executionOrder = [];
        
        const command1 = new AsyncTestCommand(1, 100, executionOrder);
        const command2 = new AsyncTestCommand(2, 50, executionOrder);
        
        // Execute commands concurrently using REAL CommandService
        const promise1 = Promise.resolve(commandService.execute(command1));
        const promise2 = Promise.resolve(commandService.execute(command2));
        
        await Promise.all([promise1, promise2]);
        
        console.log(`📋 Execution order: ${executionOrder.join(' -> ')}`);
        
        // Verify commands executed sequentially, not concurrently
        // If concurrent, we'd see: start-1, start-2, end-2, end-1
        // If sequential, we'd see: start-1, end-1, start-2, end-2
        const expectedSequential = ['start-1', 'end-1', 'start-2', 'end-2'];
        const isSequential = executionOrder.join(',') === expectedSequential.join(',');
        
        if (!isSequential) {
            console.log(`❌ Expected sequential: ${expectedSequential.join(' -> ')}`);
            console.log(`❌ Got: ${executionOrder.join(' -> ')}`);
            throw new Error('Commands should execute sequentially, not concurrently');
        }
        
        console.log('✅ Concurrent execution prevention test passed with REAL commands');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 3: Undo to Index Boundary Conditions
export async function testUndoToIndexBoundaryConditions() {
    console.log('🧪 Testing undo to index boundaries with REAL CommandService...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Create and execute 5 REAL commands
        const commands = [];
        for (let i = 0; i < 5; i++) {
            const command = new TestCommand(`boundary-test-${i}`, i, `Boundary test ${i}`);
            commands.push(command);
            await commandService.execute(command);
        }
        
        // Test valid boundary: undo to index 2 (should undo 3 commands)
        commandService.undoToIndex(2);
        
        let state = commandService.getState();
        if (state.undoStackSize !== 2) {
            throw new Error(`Expected undo stack size 2, got ${state.undoStackSize}`);
        }
        if (state.redoStackSize !== 3) {
            throw new Error(`Expected redo stack size 3, got ${state.redoStackSize}`);
        }
        
        // Test invalid boundary: negative index
        const originalUndoSize = state.undoStackSize;
        commandService.undoToIndex(-1);
        
        state = commandService.getState();
        if (state.undoStackSize !== originalUndoSize) {
            throw new Error('Negative index should not change stack state');
        }
        
        // Test invalid boundary: index beyond stack size
        commandService.undoToIndex(10);
        
        state = commandService.getState();
        if (state.undoStackSize !== originalUndoSize) {
            throw new Error('Index beyond stack should not change stack state');
        }
        
        console.log('✅ Undo to index boundary conditions test passed with REAL commands');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 4: Redo to Index Boundary Conditions
export async function testRedoToIndexBoundaryConditions() {
    console.log('🧪 Testing redo to index boundaries with REAL CommandService...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Create and execute 5 REAL commands, then undo all
        for (let i = 0; i < 5; i++) {
            const command = new TestCommand(`redo-boundary-${i}`, i, `Redo boundary ${i}`);
            await commandService.execute(command);
        }
        
        // Undo all commands to populate redo stack
        while (commandService.canUndo()) {
            commandService.undo();
        }
        
        let state = commandService.getState();
        if (state.redoStackSize !== 5) {
            throw new Error(`Expected redo stack size 5, got ${state.redoStackSize}`);
        }
        
        // Test valid boundary: redo to index 2 (should redo 3 commands)
        commandService.redoToIndex(2);
        
        state = commandService.getState();
        if (state.undoStackSize !== 3) {
            throw new Error(`Expected undo stack size 3, got ${state.undoStackSize}`);
        }
        if (state.redoStackSize !== 2) {
            throw new Error(`Expected redo stack size 2, got ${state.redoStackSize}`);
        }
        
        // Test invalid boundary: negative index
        const originalRedoSize = state.redoStackSize;
        commandService.redoToIndex(-1);
        
        state = commandService.getState();
        if (state.redoStackSize !== originalRedoSize) {
            throw new Error('Negative index should not change stack state');
        }
        
        // Test invalid boundary: index beyond stack size
        commandService.redoToIndex(10);
        
        state = commandService.getState();
        if (state.redoStackSize !== originalRedoSize) {
            throw new Error('Index beyond stack should not change stack state');
        }
        
        console.log('✅ Redo to index boundary conditions test passed with REAL commands');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 5: Command Execution Failure Rollback
export async function testCommandExecutionFailureRollback() {
    console.log('🧪 Testing command execution failure rollback with REAL CommandService...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Execute a successful command first
        const successCommand = new TestCommand('success-before-fail', 1, 'Success before fail');
        await commandService.execute(successCommand);
        
        const initialState = commandService.getState();
        
        // Create REAL failing command
        const failingCommand = new FailingCommand('failing-execute', true, false);
        
        let errorCaught = false;
        let errorMessage = '';
        
        try {
            await commandService.execute(failingCommand);
        } catch (error) {
            errorCaught = true;
            errorMessage = error.message;
        }
        
        // Verify error was thrown
        if (!errorCaught) {
            throw new Error('Expected command execution to throw error');
        }
        
        if (!errorMessage.includes('Execute failed for failing-execute')) {
            throw new Error(`Expected specific error message, got: ${errorMessage}`);
        }
        
        // Verify stack state unchanged after failure
        const finalState = commandService.getState();
        if (finalState.undoStackSize !== initialState.undoStackSize) {
            throw new Error('Failed command should not be added to undo stack');
        }
        
        // Verify successful command is still there
        if (!finalState.lastCommand.includes('success-before-fail')) {
            throw new Error('Previous successful command should still be in stack');
        }
        
        console.log('✅ Command execution failure rollback test passed with REAL errors');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 6: Undo Failure Rollback
export async function testUndoFailureRollback() {
    console.log('🧪 Testing undo failure rollback with REAL CommandService...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Create and execute command that fails on undo
        const failingUndoCommand = new FailingCommand('failing-undo', false, true);
        await commandService.execute(failingUndoCommand);
        
        const initialState = commandService.getState();
        
        let errorCaught = false;
        let errorMessage = '';
        
        try {
            commandService.undo();
        } catch (error) {
            errorCaught = true;
            errorMessage = error.message;
        }
        
        // Verify error was thrown
        if (!errorCaught) {
            throw new Error('Expected undo to throw error');
        }
        
        if (!errorMessage.includes('Undo failed for failing-undo')) {
            throw new Error(`Expected specific error message, got: ${errorMessage}`);
        }
        
        // Verify command was put back on undo stack after failed undo
        const finalState = commandService.getState();
        if (finalState.undoStackSize !== initialState.undoStackSize) {
            throw new Error('Failed undo should restore command to undo stack');
        }
        
        if (finalState.redoStackSize !== 0) {
            throw new Error('Failed undo should not add command to redo stack');
        }
        
        console.log('✅ Undo failure rollback test passed with REAL errors');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 7: Event Emission on Command Lifecycle
export async function testEventEmissionOnCommandLifecycle() {
    console.log('🧪 Testing event emission on command lifecycle with REAL EventBus...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Clear captured events
        eventBusEvents.length = 0;
        
        // Execute REAL command
        const command = new TestCommand('event-test', 42, 'Event test command');
        await commandService.execute(command);
        
        // Verify command:executed event was emitted
        const executedEvents = eventBusEvents.filter(e => e.event === 'command:executed');
        if (executedEvents.length !== 1) {
            throw new Error(`Expected 1 command:executed event, got ${executedEvents.length}`);
        }
        
        const executedEvent = executedEvents[0];
        if (executedEvent.payload.command !== 'event-test') {
            throw new Error(`Expected command 'event-test', got '${executedEvent.payload.command}'`);
        }
        
        if (!executedEvent.payload.canUndo) {
            throw new Error('Expected canUndo to be true after executing undoable command');
        }
        
        // Clear events and test undo
        eventBusEvents.length = 0;
        commandService.undo();
        
        // Verify command:undone event was emitted
        const undoneEvents = eventBusEvents.filter(e => e.event === 'command:undone');
        if (undoneEvents.length !== 1) {
            throw new Error(`Expected 1 command:undone event, got ${undoneEvents.length}`);
        }
        
        const undoneEvent = undoneEvents[0];
        if (undoneEvent.payload.command !== 'event-test') {
            throw new Error(`Expected undone command 'event-test', got '${undoneEvent.payload.command}'`);
        }
        
        if (!undoneEvent.payload.canRedo) {
            throw new Error('Expected canRedo to be true after undo');
        }
        
        // Clear events and test redo
        eventBusEvents.length = 0;
        commandService.redo();
        
        // Verify command:redone event was emitted
        const redoneEvents = eventBusEvents.filter(e => e.event === 'command:redone');
        if (redoneEvents.length !== 1) {
            throw new Error(`Expected 1 command:redone event, got ${redoneEvents.length}`);
        }
        
        console.log('✅ Event emission on command lifecycle test passed with REAL EventBus');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 8: Error Event Emission
export async function testErrorEventEmission() {
    console.log('🧪 Testing error event emission with REAL EventBus...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Clear captured events
        eventBusEvents.length = 0;
        
        // Execute REAL failing command
        const failingCommand = new FailingCommand('error-event-test', true, false);
        
        try {
            await commandService.execute(failingCommand);
        } catch (error) {
            // Expected to throw
        }
        
        // Verify command:error event was emitted
        const errorEvents = eventBusEvents.filter(e => e.event === 'command:error');
        if (errorEvents.length !== 1) {
            throw new Error(`Expected 1 command:error event, got ${errorEvents.length}`);
        }
        
        const errorEvent = errorEvents[0];
        if (errorEvent.payload.command !== 'error-event-test') {
            throw new Error(`Expected error command 'error-event-test', got '${errorEvent.payload.command}'`);
        }
        
        if (!errorEvent.payload.error) {
            throw new Error('Expected error payload to contain error object');
        }
        
        console.log('✅ Error event emission test passed with REAL EventBus');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 9: Effect vs Non-Effect Command Filtering
export async function testEffectVsNonEffectCommandFiltering() {
    console.log('🧪 Testing effect vs non-effect command filtering with REAL CommandService...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Execute REAL effect command
        const effectCommand = new TestCommand('effect-cmd', 1, 'Effect command');
        effectCommand.isEffectCommand = true;
        await commandService.execute(effectCommand);
        
        // Execute REAL non-effect command
        const nonEffectCommand = new NonEffectCommand('non-effect-cmd', 2);
        await commandService.execute(nonEffectCommand);
        
        // Execute another REAL effect command
        const effectCommand2 = new TestCommand('effect-cmd-2', 3, 'Effect command 2');
        effectCommand2.isEffectCommand = true;
        await commandService.execute(effectCommand2);
        
        // Verify only effect commands are in undo stack
        const state = commandService.getState();
        if (state.undoStackSize !== 2) {
            throw new Error(`Expected 2 effect commands in undo stack, got ${state.undoStackSize}`);
        }
        
        // Verify non-effect command was executed but not tracked
        if (!nonEffectCommand.executed) {
            throw new Error('Non-effect command should have been executed');
        }
        
        // Verify undo history contains only effect commands
        const undoHistory = commandService.getUndoHistory();
        const commandTypes = undoHistory.map(cmd => cmd.type);
        
        if (!commandTypes.includes('effect-cmd')) {
            throw new Error('Effect command should be in undo history');
        }
        
        if (!commandTypes.includes('effect-cmd-2')) {
            throw new Error('Second effect command should be in undo history');
        }
        
        if (commandTypes.includes('non-effect-cmd')) {
            throw new Error('Non-effect command should not be in undo history');
        }
        
        console.log('✅ Effect vs non-effect command filtering test passed with REAL commands');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 10: Command History State Management
export async function testCommandHistoryStateManagement() {
    console.log('🧪 Testing command history state management with REAL CommandService...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Initial state should be empty
        let state = commandService.getState();
        if (state.canUndo || state.canRedo) {
            throw new Error('Initial state should not allow undo or redo');
        }
        
        if (state.undoStackSize !== 0 || state.redoStackSize !== 0) {
            throw new Error('Initial stack sizes should be 0');
        }
        
        // Execute REAL commands
        const commands = [];
        for (let i = 0; i < 3; i++) {
            const command = new TestCommand(`state-test-${i}`, i, `State test ${i}`);
            commands.push(command);
            await commandService.execute(command);
        }
        
        // Verify state after executions
        state = commandService.getState();
        if (!state.canUndo) {
            throw new Error('Should be able to undo after executing commands');
        }
        
        if (state.canRedo) {
            throw new Error('Should not be able to redo before any undos');
        }
        
        if (state.undoStackSize !== 3) {
            throw new Error(`Expected undo stack size 3, got ${state.undoStackSize}`);
        }
        
        if (state.lastCommand !== 'state-test-2') {
            throw new Error(`Expected last command 'state-test-2', got '${state.lastCommand}'`);
        }
        
        // Undo one command
        commandService.undo();
        
        state = commandService.getState();
        if (!state.canUndo || !state.canRedo) {
            throw new Error('Should be able to both undo and redo after partial undo');
        }
        
        if (state.undoStackSize !== 2 || state.redoStackSize !== 1) {
            throw new Error(`Expected stack sizes 2/1, got ${state.undoStackSize}/${state.redoStackSize}`);
        }
        
        console.log('✅ Command history state management test passed with REAL commands');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 11: Command History Clearing
export async function testCommandHistoryClearing() {
    console.log('🧪 Testing command history clearing with REAL CommandService...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Execute some REAL commands
        for (let i = 0; i < 3; i++) {
            const command = new TestCommand(`clear-test-${i}`, i, `Clear test ${i}`);
            await commandService.execute(command);
        }
        
        // Undo one to populate redo stack
        commandService.undo();
        
        // Verify we have commands in both stacks
        let state = commandService.getState();
        if (state.undoStackSize === 0 || state.redoStackSize === 0) {
            throw new Error('Should have commands in both stacks before clearing');
        }
        
        // Clear captured events
        eventBusEvents.length = 0;
        
        // Clear command history
        commandService.clear();
        
        // Verify state is completely cleared
        state = commandService.getState();
        if (state.canUndo || state.canRedo) {
            throw new Error('Should not be able to undo or redo after clearing');
        }
        
        if (state.undoStackSize !== 0 || state.redoStackSize !== 0) {
            throw new Error('Stack sizes should be 0 after clearing');
        }
        
        if (state.lastCommand !== null) {
            throw new Error('Last command should be null after clearing');
        }
        
        // Verify command:cleared event was emitted
        const clearedEvents = eventBusEvents.filter(e => e.event === 'command:cleared');
        if (clearedEvents.length !== 1) {
            throw new Error(`Expected 1 command:cleared event, got ${clearedEvents.length}`);
        }
        
        console.log('✅ Command history clearing test passed with REAL state');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 12: EventBus Integration
export async function testEventBusIntegration() {
    console.log('🧪 Testing EventBus integration with REAL event handling...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Execute REAL command
        const command = new TestCommand('eventbus-integration', 99, 'EventBus integration test');
        await commandService.execute(command);
        
        // Clear captured events
        eventBusEvents.length = 0;
        
        // Trigger undo via REAL EventBus
        EventBusService.emit('command:undo', {}, { source: 'test' });
        
        // Verify command was undone
        const state = commandService.getState();
        if (state.canUndo) {
            throw new Error('Command should have been undone via EventBus');
        }
        
        if (!state.canRedo) {
            throw new Error('Should be able to redo after EventBus undo');
        }
        
        // Verify undo event was emitted by CommandService
        const undoneEvents = eventBusEvents.filter(e => e.event === 'command:undone');
        if (undoneEvents.length !== 1) {
            throw new Error(`Expected 1 command:undone event, got ${undoneEvents.length}`);
        }
        
        // Clear events and trigger redo via REAL EventBus
        eventBusEvents.length = 0;
        EventBusService.emit('command:redo', {}, { source: 'test' });
        
        // Verify command was redone
        const finalState = commandService.getState();
        if (!finalState.canUndo) {
            throw new Error('Command should have been redone via EventBus');
        }
        
        if (finalState.canRedo) {
            throw new Error('Should not be able to redo after EventBus redo');
        }
        
        // Verify redo event was emitted by CommandService
        const redoneEvents = eventBusEvents.filter(e => e.event === 'command:redone');
        if (redoneEvents.length !== 1) {
            throw new Error(`Expected 1 command:redone event, got ${redoneEvents.length}`);
        }
        
        console.log('✅ EventBus integration test passed with REAL event handling');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 13: EventBus Undo/Redo to Index
export async function testEventBusUndoRedoToIndex() {
    console.log('🧪 Testing EventBus undo/redo to index with REAL event handling...');
    
    const { testEnv, commandService, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        // Execute 5 REAL commands
        for (let i = 0; i < 5; i++) {
            const command = new TestCommand(`eventbus-index-${i}`, i, `EventBus index test ${i}`);
            await commandService.execute(command);
        }
        
        // Trigger undo to index via REAL EventBus
        EventBusService.emit('command:undo-to-index', { index: 2 }, { source: 'test' });
        
        // Verify correct number of commands were undone
        let state = commandService.getState();
        if (state.undoStackSize !== 2) {
            throw new Error(`Expected undo stack size 2, got ${state.undoStackSize}`);
        }
        
        if (state.redoStackSize !== 3) {
            throw new Error(`Expected redo stack size 3, got ${state.redoStackSize}`);
        }
        
        // Trigger redo to index via REAL EventBus
        EventBusService.emit('command:redo-to-index', { index: 1 }, { source: 'test' });
        
        // Verify correct number of commands were redone
        state = commandService.getState();
        if (state.undoStackSize !== 4) {
            throw new Error(`Expected undo stack size 4, got ${state.undoStackSize}`);
        }
        
        if (state.redoStackSize !== 1) {
            throw new Error(`Expected redo stack size 1, got ${state.redoStackSize}`);
        }
        
        console.log('✅ EventBus undo/redo to index test passed with REAL event handling');
        
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

console.log('📋 CommandService.test.js loaded - REAL OBJECTS TESTING READY');