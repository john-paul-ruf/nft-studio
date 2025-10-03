/**
 * ProjectStateManager Tests
 * 
 * Tests project state lifecycle management and coordination between
 * UI updates, persistence, and other state-dependent operations.
 * 
 * REAL OBJECTS ONLY - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import ProjectStateManager from '../../src/services/ProjectStateManager.js';

/**
 * Test service initialization and method availability
 */
async function test_service_initialization_and_methods() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing ProjectStateManager initialization...');
        
        const manager = new ProjectStateManager();
        
        if (!manager) {
            throw new Error('ProjectStateManager not created');
        }
        
        // Verify all expected methods exist
        const expectedMethods = [
            'initialize', 'onUpdate', 'getProjectState', 'getPersistenceService',
            'forceSave', 'updateState', 'setupPersistence', 'destroy'
        ];
        
        for (const method of expectedMethods) {
            if (typeof manager[method] !== 'function') {
                throw new Error(`Method ${method} not available`);
            }
        }
        
        // Verify initial state
        if (manager.getProjectState() !== null) {
            throw new Error('Expected null project state initially');
        }
        
        if (manager.getPersistenceService() !== null) {
            throw new Error('Expected null persistence service initially');
        }
        
        console.log('✅ ProjectStateManager initialization test passed');
        return true;
        
    } catch (error) {
        console.error('❌ ProjectStateManager initialization test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test manager initialization with project state
 */
async function test_initialize_with_project_state() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing ProjectStateManager initialization with project state...');
        
        const manager = new ProjectStateManager();
        const projectState = testEnv.getService('ProjectState');
        
        // Initialize without output directory (no persistence)
        await manager.initialize(projectState);
        
        if (manager.getProjectState() !== projectState) {
            throw new Error('Project state not set correctly');
        }
        
        if (manager.getPersistenceService() !== null) {
            throw new Error('Expected no persistence service without output directory');
        }
        
        // Verify the onUpdate callback was set up
        if (typeof projectState.core.onUpdate !== 'function') {
            throw new Error('onUpdate callback not set up');
        }
        
        console.log('✅ ProjectStateManager initialization with project state test passed');
        return true;
        
    } catch (error) {
        console.error('❌ ProjectStateManager initialization with project state test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test update callback registration and notification
 */
async function test_update_callback_registration() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing update callback registration and notification...');
        
        const manager = new ProjectStateManager();
        const projectState = testEnv.getService('ProjectState');
        
        await manager.initialize(projectState);
        
        let callbackCount = 0;
        let lastReceivedState = null;
        
        // Register a callback
        const unsubscribe = manager.onUpdate((newState) => {
            callbackCount++;
            lastReceivedState = newState;
        });
        
        if (typeof unsubscribe !== 'function') {
            throw new Error('Expected unsubscribe function from onUpdate');
        }
        
        // Trigger a state update
        const testEffect = {
            name: 'TestEffect',
            className: 'TestEffect',
            registryKey: 'test-effect',
            config: { value: 42 }
        };
        
        projectState.update({ effects: [testEffect] });
        
        // Give a moment for callbacks to execute
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (callbackCount !== 1) {
            throw new Error(`Expected 1 callback call, got ${callbackCount}`);
        }
        
        if (!lastReceivedState) {
            throw new Error('Callback did not receive state');
        }
        
        if (!lastReceivedState.effects || lastReceivedState.effects.length !== 1) {
            throw new Error('Callback received incorrect state');
        }
        
        // Test unsubscribe
        unsubscribe();
        
        // Trigger another update
        projectState.update({ effects: [] });
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (callbackCount !== 1) {
            throw new Error(`Expected callback count to remain 1 after unsubscribe, got ${callbackCount}`);
        }
        
        console.log('✅ Update callback registration test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Update callback registration test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test multiple callback registration and notification
 */
async function test_multiple_callback_registration() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing multiple callback registration...');
        
        const manager = new ProjectStateManager();
        const projectState = testEnv.getService('ProjectState');
        
        await manager.initialize(projectState);
        
        let callback1Count = 0;
        let callback2Count = 0;
        let callback3Count = 0;
        
        // Register multiple callbacks
        const unsubscribe1 = manager.onUpdate(() => callback1Count++);
        const unsubscribe2 = manager.onUpdate(() => callback2Count++);
        const unsubscribe3 = manager.onUpdate(() => callback3Count++);
        
        // Trigger a state update
        projectState.update({ targetResolution: '720p' });
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (callback1Count !== 1 || callback2Count !== 1 || callback3Count !== 1) {
            throw new Error(`Expected all callbacks to be called once, got ${callback1Count}, ${callback2Count}, ${callback3Count}`);
        }
        
        // Unsubscribe middle callback
        unsubscribe2();
        
        // Trigger another update
        projectState.update({ isHorizontal: false });
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (callback1Count !== 2 || callback2Count !== 1 || callback3Count !== 2) {
            throw new Error(`Expected selective callback execution, got ${callback1Count}, ${callback2Count}, ${callback3Count}`);
        }
        
        // Clean up remaining callbacks
        unsubscribe1();
        unsubscribe3();
        
        console.log('✅ Multiple callback registration test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Multiple callback registration test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test state update convenience method
 */
async function test_state_update_convenience_method() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing state update convenience method...');
        
        const manager = new ProjectStateManager();
        const projectState = testEnv.getService('ProjectState');
        
        await manager.initialize(projectState);
        
        let updateReceived = false;
        manager.onUpdate(() => {
            updateReceived = true;
        });
        
        // Use convenience method to update state
        manager.updateState({ targetResolution: '4K' });
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (!updateReceived) {
            throw new Error('Update callback not triggered by convenience method');
        }
        
        // Verify the update was applied
        const currentState = projectState.getState();
        if (currentState.targetResolution !== '4K') {
            throw new Error(`Expected targetResolution '4K', got '${currentState.targetResolution}'`);
        }
        
        // Test with uninitialized manager
        const uninitializedManager = new ProjectStateManager();
        
        // Should not throw error
        uninitializedManager.updateState({ test: 'value' });
        
        console.log('✅ State update convenience method test passed');
        return true;
        
    } catch (error) {
        console.error('❌ State update convenience method test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test manager destruction and cleanup
 */
async function test_manager_destruction_and_cleanup() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing manager destruction and cleanup...');
        
        const manager = new ProjectStateManager();
        const projectState = testEnv.getService('ProjectState');
        
        await manager.initialize(projectState);
        
        let callbackCalled = false;
        manager.onUpdate(() => {
            callbackCalled = true;
        });
        
        // Verify manager is set up
        if (manager.getProjectState() !== projectState) {
            throw new Error('Manager not properly initialized');
        }
        
        // Destroy the manager
        manager.destroy();
        
        // Verify cleanup
        if (manager.getProjectState() !== null) {
            throw new Error('Project state not cleared after destroy');
        }
        
        if (manager.getPersistenceService() !== null) {
            throw new Error('Persistence service not cleared after destroy');
        }
        
        // Trigger an update to verify callbacks are cleared
        projectState.update({ test: 'cleanup' });
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (callbackCalled) {
            throw new Error('Callback was called after manager destruction');
        }
        
        console.log('✅ Manager destruction and cleanup test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Manager destruction and cleanup test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

/**
 * Test error handling in callbacks
 */
async function test_error_handling_in_callbacks() {
    let testEnv;
    
    try {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        console.log('🧪 Testing error handling in callbacks...');
        
        const manager = new ProjectStateManager();
        const projectState = testEnv.getService('ProjectState');
        
        await manager.initialize(projectState);
        
        let goodCallbackCount = 0;
        let errorCallbackCount = 0;
        
        // Register a callback that throws an error
        manager.onUpdate(() => {
            errorCallbackCount++;
            throw new Error('Test callback error');
        });
        
        // Register a good callback
        manager.onUpdate(() => {
            goodCallbackCount++;
        });
        
        // Trigger an update
        projectState.update({ test: 'error-handling' });
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Both callbacks should have been called despite the error
        if (errorCallbackCount !== 1) {
            throw new Error(`Expected error callback to be called once, got ${errorCallbackCount}`);
        }
        
        if (goodCallbackCount !== 1) {
            throw new Error(`Expected good callback to be called once, got ${goodCallbackCount}`);
        }
        
        console.log('✅ Error handling in callbacks test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Error handling in callbacks test failed:', error.message);
        return false;
    } finally {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }
}

// Export all test functions
export {
    test_service_initialization_and_methods,
    test_initialize_with_project_state,
    test_update_callback_registration,
    test_multiple_callback_registration,
    test_state_update_convenience_method,
    test_manager_destruction_and_cleanup,
    test_error_handling_in_callbacks
};