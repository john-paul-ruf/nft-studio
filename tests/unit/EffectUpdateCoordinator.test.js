/**
 * EffectUpdateCoordinator Service Tests - REAL OBJECTS ONLY (NO MOCKS)
 * 
 * Tests the EffectUpdateCoordinator service that orchestrates
 * debounced updates, batching, and state synchronization.
 * 
 * CRITICAL: This test file uses REAL EffectUpdateCoordinator instance
 * NO MOCKS, NO STUBS, NO SPIES - Only real objects and real behavior
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import { EffectUpdateCoordinator } from '../../src/services/EffectUpdateCoordinator.js';
import EventBusService from '../../src/services/EventBusService.js';

// Helper function to create test environment and setup
async function setupTestEnvironment() {
    const testEnv = new TestEnvironment();
    await testEnv.setup();
    
    // Track real events
    const eventBusEvents = [];
    const originalEmit = EventBusService.emit;
    EventBusService.emit = (event, payload, options) => {
        eventBusEvents.push({ event, payload, options });
        return originalEmit.call(EventBusService, event, payload, options);
    };
    
    return { testEnv, eventBusEvents, originalEmit };
}

// Helper function to cleanup test environment
async function cleanupTestEnvironment(testEnv, originalEmit) {
    // Restore original EventBus emit
    EventBusService.emit = originalEmit;
    
    // Complete cleanup
    await testEnv.cleanup();
}

// Helper to wait for debounce
function waitForDebounce(ms = 150) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Basic Update Scheduling
export async function testBasicUpdateScheduling() {
    console.log('🧪 Testing basic update scheduling with REAL EffectUpdateCoordinator...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        let updateCallCount = 0;
        const updateCallback = (config, metadata) => {
            updateCallCount++;
        };
        
        // Create REAL coordinator
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console,
            debounceMs: 100,
            onUpdate: updateCallback,
            enableBatching: true,
            maxBatchSize: 10
        });
        
        // Schedule update
        const config = { x: 100, y: 200 };
        const result = coordinator.scheduleUpdate(config, { source: 'user-input', fieldName: 'x' });
        
        // Verify scheduling
        if (!result) throw new Error('Update scheduling failed');
        if (!coordinator.hasPendingUpdate()) throw new Error('No pending update after scheduling');
        
        const pendingUpdate = coordinator.getPendingUpdate();
        if (JSON.stringify(pendingUpdate.config) !== JSON.stringify(config)) {
            throw new Error('Pending update config mismatch');
        }
        
        // Verify user modification flag
        if (!coordinator.getUserModified()) throw new Error('User modified flag not set');
        
        // Wait for debounce
        await waitForDebounce();
        
        // Verify update was flushed
        if (updateCallCount !== 1) throw new Error(`Expected 1 update call, got ${updateCallCount}`);
        if (coordinator.hasPendingUpdate()) throw new Error('Update still pending after debounce');
        
        // Verify event was emitted
        const scheduledEvent = eventBusEvents.find(e => e.event === 'effectupdate:scheduled');
        if (!scheduledEvent) throw new Error('Scheduled event not emitted');
        
        const flushedEvent = eventBusEvents.find(e => e.event === 'effectupdate:flushed');
        if (!flushedEvent) throw new Error('Flushed event not emitted');
        
        // Cleanup
        coordinator.destroy();
        
        console.log('✅ Basic update scheduling test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Basic update scheduling test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 2: Debounce Behavior with Rapid Updates
export async function testDebounceWithRapidUpdates() {
    console.log('🧪 Testing debounce behavior with rapid updates...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        let updateCallCount = 0;
        let lastConfig = null;
        
        const updateCallback = (config, metadata) => {
            updateCallCount++;
            lastConfig = config;
        };
        
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console,
            debounceMs: 100,
            onUpdate: updateCallback
        });
        
        // Schedule 10 rapid updates
        for (let i = 0; i < 10; i++) {
            coordinator.scheduleUpdate({ x: i }, { source: 'user-input' });
        }
        
        // Verify only last update is pending
        const pendingUpdate = coordinator.getPendingUpdate();
        if (pendingUpdate.config.x !== 9) {
            throw new Error(`Expected last update (x=9), got x=${pendingUpdate.config.x}`);
        }
        
        // Wait for debounce
        await waitForDebounce();
        
        // Verify only ONE update was flushed (the last one)
        if (updateCallCount !== 1) {
            throw new Error(`Expected 1 update call, got ${updateCallCount}`);
        }
        
        if (lastConfig.x !== 9) {
            throw new Error(`Expected last config (x=9), got x=${lastConfig.x}`);
        }
        
        // Verify metrics
        const metrics = coordinator.getMetrics();
        if (metrics.updatesScheduled !== 10) {
            throw new Error(`Expected 10 scheduled updates, got ${metrics.updatesScheduled}`);
        }
        if (metrics.updatesFlushed !== 1) {
            throw new Error(`Expected 1 flushed update, got ${metrics.updatesFlushed}`);
        }
        if (metrics.updatesCancelled !== 9) {
            throw new Error(`Expected 9 cancelled updates, got ${metrics.updatesCancelled}`);
        }
        
        coordinator.destroy();
        
        console.log('✅ Debounce with rapid updates test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Debounce with rapid updates test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 3: Immediate Flush
export async function testImmediateFlush() {
    console.log('🧪 Testing immediate flush...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        let updateCallCount = 0;
        
        const updateCallback = (config, metadata) => {
            updateCallCount++;
        };
        
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console,
            debounceMs: 100,
            onUpdate: updateCallback
        });
        
        // Schedule update
        coordinator.scheduleUpdate({ x: 100 }, { source: 'user-input' });
        
        // Flush immediately (don't wait for debounce)
        const result = coordinator.flush();
        
        if (!result) throw new Error('Flush failed');
        if (updateCallCount !== 1) throw new Error(`Expected 1 update call, got ${updateCallCount}`);
        if (coordinator.hasPendingUpdate()) throw new Error('Update still pending after flush');
        
        coordinator.destroy();
        
        console.log('✅ Immediate flush test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Immediate flush test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 4: Update Cancellation
export async function testUpdateCancellation() {
    console.log('🧪 Testing update cancellation...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        let updateCallCount = 0;
        
        const updateCallback = (config, metadata) => {
            updateCallCount++;
        };
        
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console,
            debounceMs: 100,
            onUpdate: updateCallback
        });
        
        // Schedule update
        coordinator.scheduleUpdate({ x: 100 }, { source: 'user-input' });
        
        // Cancel it
        const result = coordinator.cancel();
        
        if (!result) throw new Error('Cancel failed');
        if (coordinator.hasPendingUpdate()) throw new Error('Update still pending after cancel');
        
        // Wait to ensure no update is flushed
        await waitForDebounce();
        
        if (updateCallCount !== 0) throw new Error(`Expected 0 update calls, got ${updateCallCount}`);
        
        // Verify cancelled event
        const cancelledEvent = eventBusEvents.find(e => e.event === 'effectupdate:cancelled');
        if (!cancelledEvent) throw new Error('Cancelled event not emitted');
        
        coordinator.destroy();
        
        console.log('✅ Update cancellation test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Update cancellation test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 5: Update Batching
export async function testUpdateBatching() {
    console.log('🧪 Testing update batching...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console,
            debounceMs: 100,
            onUpdate: () => {},
            enableBatching: true,
            maxBatchSize: 5
        });
        
        // Schedule 3 updates
        coordinator.scheduleUpdate({ x: 1 }, { source: 'user-input' });
        coordinator.scheduleUpdate({ x: 2 }, { source: 'user-input' });
        coordinator.scheduleUpdate({ x: 3 }, { source: 'user-input' });
        
        // Verify batch
        const batch = coordinator.getUpdateBatch();
        if (batch.length !== 3) throw new Error(`Expected batch size 3, got ${batch.length}`);
        
        // Schedule more updates to exceed max batch size
        for (let i = 4; i <= 10; i++) {
            coordinator.scheduleUpdate({ x: i }, { source: 'user-input' });
        }
        
        // Verify batch is trimmed to max size
        const trimmedBatch = coordinator.getUpdateBatch();
        if (trimmedBatch.length !== 5) {
            throw new Error(`Expected batch size 5 (max), got ${trimmedBatch.length}`);
        }
        
        // Wait for flush
        await waitForDebounce();
        
        // Verify batch is cleared after flush
        const clearedBatch = coordinator.getUpdateBatch();
        if (clearedBatch.length !== 0) {
            throw new Error(`Expected empty batch after flush, got ${clearedBatch.length}`);
        }
        
        coordinator.destroy();
        
        console.log('✅ Update batching test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Update batching test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 6: Flag Management
export async function testFlagManagement() {
    console.log('🧪 Testing flag management...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console
        });
        
        // Test user modified flag
        coordinator.setUserModified(true);
        if (!coordinator.getUserModified()) throw new Error('User modified flag not set');
        
        coordinator.setUserModified(false);
        if (coordinator.getUserModified()) throw new Error('User modified flag not cleared');
        
        // Test editing existing effect flag
        coordinator.setEditingExistingEffect(true);
        if (!coordinator.getEditingExistingEffect()) throw new Error('Editing existing effect flag not set');
        
        coordinator.setEditingExistingEffect(false);
        if (coordinator.getEditingExistingEffect()) throw new Error('Editing existing effect flag not cleared');
        
        // Test reset flags
        coordinator.setUserModified(true);
        coordinator.setEditingExistingEffect(true);
        coordinator.resetFlags();
        
        if (coordinator.getUserModified()) throw new Error('User modified flag not reset');
        if (coordinator.getEditingExistingEffect()) throw new Error('Editing existing effect flag not reset');
        
        // Test automatic flag setting on schedule
        coordinator.scheduleUpdate({ x: 100 }, { source: 'user-input' });
        if (!coordinator.getUserModified()) throw new Error('User modified flag not auto-set on user input');
        
        coordinator.resetFlags();
        coordinator.scheduleUpdate({ x: 100 }, { source: 'defaults' });
        if (coordinator.getUserModified()) throw new Error('User modified flag incorrectly set for defaults');
        
        coordinator.destroy();
        
        console.log('✅ Flag management test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Flag management test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 7: Lifecycle Callbacks
export async function testLifecycleCallbacks() {
    console.log('🧪 Testing lifecycle callbacks...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console,
            debounceMs: 100,
            onUpdate: () => {}
        });
        
        let scheduleCallCount = 0;
        let flushCallCount = 0;
        let cancelCallCount = 0;
        let batchCallCount = 0;
        
        // Register callbacks
        coordinator.onLifecycle('onSchedule', () => scheduleCallCount++);
        coordinator.onLifecycle('onFlush', () => flushCallCount++);
        coordinator.onLifecycle('onCancel', () => cancelCallCount++);
        coordinator.onLifecycle('onBatch', () => batchCallCount++);
        
        // Trigger schedule
        coordinator.scheduleUpdate({ x: 100 }, { source: 'user-input' });
        if (scheduleCallCount !== 1) throw new Error(`Expected 1 schedule callback, got ${scheduleCallCount}`);
        if (batchCallCount !== 1) throw new Error(`Expected 1 batch callback, got ${batchCallCount}`);
        
        // Trigger flush
        await waitForDebounce();
        if (flushCallCount !== 1) throw new Error(`Expected 1 flush callback, got ${flushCallCount}`);
        
        // Trigger cancel
        coordinator.scheduleUpdate({ x: 200 }, { source: 'user-input' });
        coordinator.cancel();
        if (cancelCallCount !== 1) throw new Error(`Expected 1 cancel callback, got ${cancelCallCount}`);
        
        coordinator.destroy();
        
        console.log('✅ Lifecycle callbacks test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Lifecycle callbacks test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 8: Destroy and Cleanup
export async function testDestroyAndCleanup() {
    console.log('🧪 Testing destroy and cleanup...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        let updateCallCount = 0;
        
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console,
            debounceMs: 100,
            onUpdate: () => updateCallCount++
        });
        
        // Schedule update
        coordinator.scheduleUpdate({ x: 100 }, { source: 'user-input' });
        
        // Destroy (should flush pending update)
        coordinator.destroy();
        
        if (updateCallCount !== 1) throw new Error(`Expected 1 update call on destroy, got ${updateCallCount}`);
        if (coordinator.hasPendingUpdate()) throw new Error('Update still pending after destroy');
        
        // Verify destroyed event
        const destroyedEvent = eventBusEvents.find(e => e.event === 'effectupdate:destroyed');
        if (!destroyedEvent) throw new Error('Destroyed event not emitted');
        
        // Verify operations fail after destroy
        const scheduleResult = coordinator.scheduleUpdate({ x: 200 }, {});
        if (scheduleResult) throw new Error('Schedule succeeded after destroy');
        
        const flushResult = coordinator.flush();
        if (flushResult) throw new Error('Flush succeeded after destroy');
        
        console.log('✅ Destroy and cleanup test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Destroy and cleanup test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 9: Metrics Tracking
export async function testMetricsTracking() {
    console.log('🧪 Testing metrics tracking...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console,
            debounceMs: 100,
            onUpdate: () => {}
        });
        
        // Schedule and flush updates
        coordinator.scheduleUpdate({ x: 1 }, { source: 'user-input' });
        await waitForDebounce();
        
        coordinator.scheduleUpdate({ x: 2 }, { source: 'user-input' });
        coordinator.scheduleUpdate({ x: 3 }, { source: 'user-input' });
        await waitForDebounce();
        
        // Get metrics
        const metrics = coordinator.getMetrics();
        
        if (metrics.updatesScheduled !== 3) {
            throw new Error(`Expected 3 scheduled updates, got ${metrics.updatesScheduled}`);
        }
        if (metrics.updatesFlushed !== 2) {
            throw new Error(`Expected 2 flushed updates, got ${metrics.updatesFlushed}`);
        }
        if (metrics.updatesCancelled !== 1) {
            throw new Error(`Expected 1 cancelled update, got ${metrics.updatesCancelled}`);
        }
        if (metrics.averageDebounceTime <= 0) {
            throw new Error('Average debounce time should be > 0');
        }
        if (metrics.updateHistory.length !== 2) {
            throw new Error(`Expected 2 history entries, got ${metrics.updateHistory.length}`);
        }
        
        // Reset metrics
        coordinator.resetMetrics();
        const resetMetrics = coordinator.getMetrics();
        
        if (resetMetrics.updatesScheduled !== 0) {
            throw new Error('Metrics not reset properly');
        }
        
        coordinator.destroy();
        
        console.log('✅ Metrics tracking test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Metrics tracking test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}

// Test 10: Configuration Updates
export async function testConfigurationUpdates() {
    console.log('🧪 Testing configuration updates...');
    
    const { testEnv, eventBusEvents, originalEmit } = await setupTestEnvironment();
    
    try {
        const coordinator = new EffectUpdateCoordinator({
            eventBus: EventBusService,
            logger: console,
            debounceMs: 100,
            onUpdate: () => {}
        });
        
        // Test debounce delay update
        coordinator.setDebounceMs(200);
        if (coordinator.getDebounceMs() !== 200) {
            throw new Error('Debounce delay not updated');
        }
        
        // Test callback update
        let newCallbackCalled = false;
        coordinator.setOnUpdate(() => { newCallbackCalled = true; });
        
        coordinator.scheduleUpdate({ x: 100 }, { source: 'user-input' });
        coordinator.flush();
        
        if (!newCallbackCalled) throw new Error('New callback not called');
        
        coordinator.destroy();
        
        console.log('✅ Configuration updates test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Configuration updates test failed:', error);
        throw error;
    } finally {
        await cleanupTestEnvironment(testEnv, originalEmit);
    }
}