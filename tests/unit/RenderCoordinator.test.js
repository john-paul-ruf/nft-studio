/**
 * RenderCoordinator Test Suite
 * Tests the render coordination functionality extracted from NftProjectManager
 */

import { RenderCoordinator } from '../../src/services/RenderCoordinator.js';

// Test environment setup
const testEnv = {
    results: [],
    
    log: (message) => {
        console.log(`[RenderCoordinator Test] ${message}`);
    },
    
    success: (message) => {
        console.log(`✅ ${message}`);
        testEnv.results.push({ test: message, status: 'PASS' });
    },
    
    error: (message, error) => {
        console.error(`❌ ${message}`, error);
        testEnv.results.push({ test: message, status: 'FAIL', error: error?.message || error });
    },
    
    summary: () => {
        const passed = testEnv.results.filter(r => r.status === 'PASS').length;
        const failed = testEnv.results.filter(r => r.status === 'FAIL').length;
        const total = testEnv.results.length;
        
        console.log(`\n📊 RenderCoordinator Test Results: ${passed}/${total} passed, ${failed} failed`);
        
        if (failed > 0) {
            console.log('\n❌ Failed tests:');
            testEnv.results.filter(r => r.status === 'FAIL').forEach(result => {
                console.log(`  - ${result.test}: ${result.error}`);
            });
        }
        
        return { passed, failed, total, success: failed === 0 };
    }
};

/**
 * Test 1: Constructor and Initialization
 */
async function testConstructorAndInitialization() {
    testEnv.log('Testing constructor and initialization...');
    
    try {
        // Test basic constructor
        const coordinator = new RenderCoordinator();
        
        if (typeof coordinator !== 'object') {
            throw new Error('RenderCoordinator should be an object');
        }
        
        // Test with dependencies
        const testEventBus = { emit: () => {} };
        const testLogger = { 
            info: () => {}, 
            error: () => {}, 
            success: () => {}, 
            header: () => {}, 
            warn: () => {},
            event: () => {}
        };
        
        const coordinatorWithDeps = new RenderCoordinator(null, null, testEventBus, testLogger);
        
        if (!coordinatorWithDeps.eventBus) {
            throw new Error('EventBus should be injected');
        }
        
        if (!coordinatorWithDeps.logger) {
            throw new Error('Logger should be injected');
        }
        
        // Test initial state
        if (coordinatorWithDeps.renderLoopActive !== false) {
            throw new Error('renderLoopActive should be initialized as false');
        }
        
        if (coordinatorWithDeps.activeRenderLoop !== null) {
            throw new Error('activeRenderLoop should be initialized as null');
        }
        
        testEnv.success('Constructor and initialization work correctly');
        
    } catch (error) {
        testEnv.error('Constructor and initialization failed', error);
    }
}

/**
 * Test 2: Render Status Management
 */
async function testRenderStatusManagement() {
    testEnv.log('Testing render status management...');
    
    try {
        const coordinator = new RenderCoordinator();
        
        // Test initial status
        const initialStatus = coordinator.getRenderStatus();
        
        if (typeof initialStatus !== 'object') {
            throw new Error('getRenderStatus should return object');
        }
        
        if (initialStatus.isActive !== false) {
            throw new Error('Initial status should show inactive');
        }
        
        if (initialStatus.currentLoopId !== null) {
            throw new Error('Initial status should have no loop ID');
        }
        
        if (initialStatus.currentWorkerId !== null) {
            throw new Error('Initial status should have no worker ID');
        }
        
        if (initialStatus.hasActiveProject !== false) {
            throw new Error('Initial status should have no active project');
        }
        
        if (initialStatus.hasEventBus !== false) {
            throw new Error('Initial status should have no event bus');
        }
        
        testEnv.success('Render status management works correctly');
        
    } catch (error) {
        testEnv.error('Render status management failed', error);
    }
}

/**
 * Test 3: Progress Event Emission
 */
async function testProgressEventEmission() {
    testEnv.log('Testing progress event emission...');
    
    try {
        const emittedEvents = [];
        const testEventBus = {
            emit: (eventName, data) => {
                emittedEvents.push({ eventName, data });
            }
        };
        
        const coordinator = new RenderCoordinator(null, null, testEventBus);
        
        // Test progress event emission
        coordinator.emitProgressEvent('test.event', {
            frameNumber: 5,
            totalFrames: 100,
            projectName: 'Test Project'
        });
        
        if (emittedEvents.length !== 1) {
            throw new Error('Should emit one event to internal event bus');
        }
        
        if (emittedEvents[0].eventName !== 'render:progress') {
            throw new Error('Should emit render:progress event');
        }
        
        if (!emittedEvents[0].data.eventName) {
            throw new Error('Event data should include original event name');
        }
        
        if (!emittedEvents[0].data.timestamp) {
            throw new Error('Event data should include timestamp');
        }
        
        testEnv.success('Progress event emission works correctly');
        
    } catch (error) {
        testEnv.error('Progress event emission failed', error);
    }
}

/**
 * Test 4: Frame Rendering (Test)
 */
async function testFrameRendering() {
    testEnv.log('Testing frame rendering...');
    
    try {
        const coordinator = new RenderCoordinator();
        
        // Test project with generateSingleFrame method
        const testProject = {
            generateSingleFrame: async (frameNumber, totalFrames, returnBuffer) => {
                // Simulate frame generation
                await new Promise(resolve => setTimeout(resolve, 10));
                return Buffer.from('test-frame-data');
            }
        };
        
        // Test successful frame render
        const result = await coordinator.renderFrame(testProject, 5, 100, 'Test Project');
        
        if (!result.success) {
            throw new Error('Frame render should succeed');
        }
        
        if (result.frameNumber !== 5) {
            throw new Error('Result should include correct frame number');
        }
        
        if (!result.frameBuffer) {
            throw new Error('Result should include frame buffer');
        }
        
        if (typeof result.renderTime !== 'number') {
            throw new Error('Result should include render time');
        }
        
        testEnv.success('Frame rendering works correctly');
        
    } catch (error) {
        testEnv.error('Frame rendering failed', error);
    }
}

/**
 * Test 5: Frame Rendering Error Handling
 */
async function testFrameRenderingErrorHandling() {
    testEnv.log('Testing frame rendering error handling...');
    
    try {
        const coordinator = new RenderCoordinator();
        
        // Test project that throws error
        const testProject = {
            generateSingleFrame: async () => {
                throw new Error('Test render error');
            }
        };
        
        // Test error handling
        const result = await coordinator.renderFrame(testProject, 5, 100, 'Test Project');
        
        if (result.success !== false) {
            throw new Error('Frame render should fail');
        }
        
        if (!result.error) {
            throw new Error('Result should include error message');
        }
        
        if (result.frameNumber !== 5) {
            throw new Error('Result should include frame number even on error');
        }
        
        testEnv.success('Frame rendering error handling works correctly');
        
    } catch (error) {
        testEnv.error('Frame rendering error handling failed', error);
    }
}

/**
 * Test 6: Render Loop State Management
 */
async function testRenderLoopStateManagement() {
    testEnv.log('Testing render loop state management...');
    
    try {
        const coordinator = new RenderCoordinator();
        
        // Test stop when no active loop
        const stopResult = await coordinator.stopRenderLoop();
        
        if (!stopResult.success) {
            throw new Error('Stop should succeed even when no active loop');
        }
        
        if (!stopResult.message.includes('No active loop')) {
            throw new Error('Should indicate no active loop was running');
        }
        
        // Test pause (not implemented)
        const pauseResult = await coordinator.pauseRender();
        
        if (pauseResult.success !== false) {
            throw new Error('Pause should indicate not implemented');
        }
        
        if (!pauseResult.message.includes('not yet implemented')) {
            throw new Error('Should indicate pause not implemented');
        }
        
        // Test cancel (should call stop)
        const cancelResult = await coordinator.cancelRender();
        
        if (!cancelResult.success) {
            throw new Error('Cancel should succeed (calls stop)');
        }
        
        testEnv.success('Render loop state management works correctly');
        
    } catch (error) {
        testEnv.error('Render loop state management failed', error);
    }
}

/**
 * Test 7: Event Bus Integration
 */
async function testEventBusIntegration() {
    testEnv.log('Testing event bus integration...');
    
    try {
        const emittedEvents = [];
        const testEventBus = {
            emit: (eventName, data) => {
                emittedEvents.push({ eventName, data });
            }
        };
        
        const coordinator = new RenderCoordinator(null, null, testEventBus);
        
        // Test multiple event emissions
        coordinator.emitProgressEvent('frame.start', { frameNumber: 1 });
        coordinator.emitProgressEvent('frame.complete', { frameNumber: 1 });
        coordinator.emitProgressEvent('render.error', { error: 'test error' });
        
        if (emittedEvents.length !== 3) {
            throw new Error('Should emit three events');
        }
        
        // All events should be wrapped as render:progress
        const allRenderProgress = emittedEvents.every(e => e.eventName === 'render:progress');
        if (!allRenderProgress) {
            throw new Error('All events should be wrapped as render:progress');
        }
        
        // Each event should have proper structure
        for (const event of emittedEvents) {
            if (!event.data.eventName || !event.data.timestamp || !event.data.category) {
                throw new Error('Event should have proper structure');
            }
        }
        
        testEnv.success('Event bus integration works correctly');
        
    } catch (error) {
        testEnv.error('Event bus integration failed', error);
    }
}

/**
 * Test 8: Performance and Complexity Baseline
 */
async function testPerformanceAndComplexity() {
    testEnv.log('Testing performance and complexity baseline...');
    
    try {
        const startTime = Date.now();
        
        // Create multiple coordinators to test instantiation performance
        const coordinators = [];
        for (let i = 0; i < 10; i++) {
            coordinators.push(new RenderCoordinator());
        }
        
        const instantiationTime = Date.now() - startTime;
        
        if (instantiationTime > 100) { // 100ms threshold
            throw new Error(`Instantiation too slow: ${instantiationTime}ms for 10 instances`);
        }
        
        // Test method call performance
        const methodStartTime = Date.now();
        
        for (const coordinator of coordinators) {
            coordinator.getRenderStatus();
            coordinator.emitProgressEvent('test', {});
            await coordinator.pauseRender();
            await coordinator.stopRenderLoop();
        }
        
        const methodTime = Date.now() - methodStartTime;
        
        if (methodTime > 100) { // 100ms threshold for 40 method calls
            throw new Error(`Method calls too slow: ${methodTime}ms for 40 calls`);
        }
        
        // Test memory usage (basic check)
        const coordinator = new RenderCoordinator();
        const initialKeys = Object.keys(coordinator).length;
        
        if (initialKeys > 15) { // Reasonable number of properties
            throw new Error(`Too many instance properties: ${initialKeys}`);
        }
        
        testEnv.success(`Performance baseline established: ${instantiationTime}ms instantiation, ${methodTime}ms methods, ${initialKeys} properties`);
        
    } catch (error) {
        testEnv.error('Performance and complexity baseline failed', error);
    }
}

/**
 * Main test runner
 */
async function runRenderCoordinatorTests() {
    console.log('🧪 Starting RenderCoordinator Test Suite...\n');
    
    const tests = [
        testConstructorAndInitialization,
        testRenderStatusManagement,
        testProgressEventEmission,
        testFrameRendering,
        testFrameRenderingErrorHandling,
        testRenderLoopStateManagement,
        testEventBusIntegration,
        testPerformanceAndComplexity
    ];
    
    for (const test of tests) {
        try {
            await test();
        } catch (error) {
            testEnv.error(`Test function ${test.name} threw unexpected error`, error);
        }
    }
    
    return testEnv.summary();
}

// Export for use in test runner
export { runRenderCoordinatorTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runRenderCoordinatorTests().then(results => {
        process.exit(results.success ? 0 : 1);
    });
}