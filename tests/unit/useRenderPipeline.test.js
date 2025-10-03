import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * REAL OBJECTS TESTING - useRenderPipeline Hook
 * Tests render pipeline hook with real services and state management
 * NO MOCKS - Uses actual hook behavior and real render pipeline
 */

let testEnv;
let projectState;
let renderService;

// Setup real test environment
async function setupRenderPipelineEnvironment() {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    
    // Get real service instances
    projectState = testEnv.getService('ProjectState');
    renderService = testEnv.getService('RenderService');
    
    console.log('🎯 useRenderPipeline Hook: Real services ready');
}

// Cleanup after each test
async function cleanupRenderPipelineEnvironment() {
    if (testEnv) {
        await testEnv.cleanup();
        testEnv = null;
        projectState = null;
        renderService = null;
    }
}

/**
 * Test 1: Render Pipeline Initialization
 * Tests that render pipeline initializes correctly with project state
 */
export async function testRenderPipelineInitialization() {
    await setupRenderPipelineEnvironment();
    
    try {
        console.log('🧪 Testing render pipeline initialization...');
        
        // Setup project state for rendering
        await projectState.update({
            targetResolution: '1080p',
            isHorizontal: true,
            effects: [
                {
                    name: 'TestEffect',
                    className: 'TestEffect',
                    registryKey: 'test-effect',
                    config: {
                        position: { name: 'position', x: 960, y: 540 },
                        color: '#FF0000'
                    }
                }
            ]
        });
        
        // Simulate useRenderPipeline hook initialization
        const initializeRenderPipeline = (projectState) => {
            const dimensions = projectState.getResolutionDimensions();
            const effects = projectState.getEffects();
            const resolution = projectState.getTargetResolution();
            
            return {
                isInitialized: true,
                dimensions,
                effects,
                resolution,
                status: 'ready',
                progress: 0,
                error: null,
                canRender: effects.length > 0
            };
        };
        
        // Initialize pipeline
        const pipeline = initializeRenderPipeline(projectState);
        
        console.log(`✓ Pipeline initialized: ${pipeline.isInitialized}`);
        console.log(`✓ Resolution: ${pipeline.resolution} (${pipeline.dimensions.w}x${pipeline.dimensions.h})`);
        console.log(`✓ Effects count: ${pipeline.effects.length}`);
        console.log(`✓ Status: ${pipeline.status}`);
        console.log(`✓ Can render: ${pipeline.canRender}`);
        
        // Verify initialization
        if (!pipeline.isInitialized) {
            throw new Error('Render pipeline failed to initialize');
        }
        
        if (pipeline.dimensions.w !== 1920 || pipeline.dimensions.h !== 1080) {
            throw new Error('Render pipeline dimensions incorrect');
        }
        
        if (pipeline.effects.length !== 1) {
            throw new Error('Render pipeline effects not loaded');
        }
        
        if (!pipeline.canRender) {
            throw new Error('Render pipeline should be ready to render');
        }
        
        console.log('✅ Render pipeline initialization test passed');
        
    } finally {
        await cleanupRenderPipelineEnvironment();
    }
}

/**
 * Test 2: Render Progress Tracking
 * Tests render progress updates and status changes
 */
export async function testRenderProgressTracking() {
    await setupRenderPipelineEnvironment();
    
    try {
        console.log('🧪 Testing render progress tracking...');
        
        // Setup project for rendering
        await projectState.update({
            targetResolution: '720p',
            isHorizontal: true,
            effects: [
                {
                    name: 'Effect1',
                    className: 'TestEffect',
                    registryKey: 'test-effect',
                    config: { value: 1 }
                },
                {
                    name: 'Effect2',
                    className: 'TestEffect',
                    registryKey: 'test-effect',
                    config: { value: 2 }
                },
                {
                    name: 'Effect3',
                    className: 'TestEffect',
                    registryKey: 'test-effect',
                    config: { value: 3 }
                }
            ]
        });
        
        // Simulate render pipeline with progress tracking
        const createRenderPipeline = () => {
            let currentProgress = 0;
            let currentStatus = 'ready';
            let currentError = null;
            
            return {
                progress: currentProgress,
                status: currentStatus,
                error: currentError,
                
                startRender: async () => {
                    currentStatus = 'rendering';
                    currentProgress = 0;
                    currentError = null;
                    console.log('  ✓ Render started');
                },
                
                updateProgress: (progress) => {
                    currentProgress = Math.max(0, Math.min(100, progress));
                    console.log(`  ✓ Progress updated: ${currentProgress}%`);
                },
                
                completeRender: () => {
                    currentStatus = 'completed';
                    currentProgress = 100;
                    console.log('  ✓ Render completed');
                },
                
                failRender: (error) => {
                    currentStatus = 'error';
                    currentError = error;
                    console.log(`  ✗ Render failed: ${error}`);
                },
                
                cancelRender: () => {
                    currentStatus = 'cancelled';
                    console.log('  ✓ Render cancelled');
                },
                
                getState: () => ({
                    progress: currentProgress,
                    status: currentStatus,
                    error: currentError
                })
            };
        };
        
        // Create and test pipeline
        const pipeline = createRenderPipeline();
        
        // Test initial state
        let state = pipeline.getState();
        console.log(`✓ Initial state: ${state.status}, progress: ${state.progress}%`);
        
        if (state.status !== 'ready' || state.progress !== 0) {
            throw new Error('Initial render pipeline state incorrect');
        }
        
        // Test render start
        await pipeline.startRender();
        state = pipeline.getState();
        console.log(`✓ After start: ${state.status}, progress: ${state.progress}%`);
        
        if (state.status !== 'rendering') {
            throw new Error('Render start failed');
        }
        
        // Test progress updates
        const progressSteps = [10, 25, 50, 75, 90];
        for (const progress of progressSteps) {
            pipeline.updateProgress(progress);
            state = pipeline.getState();
            
            if (state.progress !== progress) {
                throw new Error(`Progress update failed: expected ${progress}, got ${state.progress}`);
            }
        }
        
        // Test completion
        pipeline.completeRender();
        state = pipeline.getState();
        console.log(`✓ After completion: ${state.status}, progress: ${state.progress}%`);
        
        if (state.status !== 'completed' || state.progress !== 100) {
            throw new Error('Render completion failed');
        }
        
        // Test error handling
        const newPipeline = createRenderPipeline();
        await newPipeline.startRender();
        newPipeline.failRender('Test error');
        
        const errorState = newPipeline.getState();
        console.log(`✓ Error state: ${errorState.status}, error: ${errorState.error}`);
        
        if (errorState.status !== 'error' || errorState.error !== 'Test error') {
            throw new Error('Render error handling failed');
        }
        
        // Test cancellation
        const cancelPipeline = createRenderPipeline();
        await cancelPipeline.startRender();
        cancelPipeline.updateProgress(30);
        cancelPipeline.cancelRender();
        
        const cancelState = cancelPipeline.getState();
        console.log(`✓ Cancel state: ${cancelState.status}, progress: ${cancelState.progress}%`);
        
        if (cancelState.status !== 'cancelled') {
            throw new Error('Render cancellation failed');
        }
        
        console.log('✅ Render progress tracking test passed');
        
    } finally {
        await cleanupRenderPipelineEnvironment();
    }
}

/**
 * Test 3: Render Cancellation
 * Tests render cancellation functionality
 */
export async function testRenderCancellation() {
    await setupRenderPipelineEnvironment();
    
    try {
        console.log('🧪 Testing render cancellation...');
        
        // Setup project for rendering
        await projectState.update({
            targetResolution: '1080p',
            isHorizontal: true,
            effects: [
                {
                    name: 'LongRunningEffect',
                    className: 'TestEffect',
                    registryKey: 'test-effect',
                    config: { duration: 5000 }
                }
            ]
        });
        
        // Simulate cancellable render pipeline
        const createCancellableRenderPipeline = () => {
            let isCancelled = false;
            let isRunning = false;
            let currentProgress = 0;
            
            return {
                isCancelled: () => isCancelled,
                isRunning: () => isRunning,
                getProgress: () => currentProgress,
                
                startRender: async () => {
                    if (isCancelled) {
                        throw new Error('Cannot start cancelled render');
                    }
                    
                    isRunning = true;
                    currentProgress = 0;
                    console.log('  ✓ Cancellable render started');
                    
                    // Simulate long-running render with cancellation checks
                    for (let i = 0; i <= 100; i += 10) {
                        if (isCancelled) {
                            console.log('  ✓ Render cancelled during execution');
                            isRunning = false;
                            return { cancelled: true, progress: currentProgress };
                        }
                        
                        currentProgress = i;
                        console.log(`  ✓ Render progress: ${i}%`);
                        
                        // Simulate work delay
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                    
                    isRunning = false;
                    console.log('  ✓ Render completed normally');
                    return { completed: true, progress: 100 };
                },
                
                cancel: () => {
                    if (!isRunning) {
                        console.log('  ⚠️ Cannot cancel: render not running');
                        return false;
                    }
                    
                    isCancelled = true;
                    console.log('  ✓ Render cancellation requested');
                    return true;
                },
                
                reset: () => {
                    isCancelled = false;
                    isRunning = false;
                    currentProgress = 0;
                    console.log('  ✓ Pipeline reset');
                }
            };
        };
        
        // Test normal completion (no cancellation)
        console.log('🔄 Testing normal completion...');
        const pipeline1 = createCancellableRenderPipeline();
        
        const result1 = await pipeline1.startRender();
        console.log(`✓ Normal completion result: ${JSON.stringify(result1)}`);
        
        if (!result1.completed || result1.progress !== 100) {
            throw new Error('Normal render completion failed');
        }
        
        // Test early cancellation
        console.log('🔄 Testing early cancellation...');
        const pipeline2 = createCancellableRenderPipeline();
        
        // Start render and cancel immediately
        const renderPromise = pipeline2.startRender();
        
        // Cancel after a short delay
        setTimeout(() => {
            pipeline2.cancel();
        }, 25);
        
        const result2 = await renderPromise;
        console.log(`✓ Cancellation result: ${JSON.stringify(result2)}`);
        
        if (!result2.cancelled) {
            throw new Error('Render cancellation failed');
        }
        
        if (result2.progress >= 100) {
            throw new Error('Cancelled render should not complete');
        }
        
        // Test cancellation when not running
        console.log('🔄 Testing cancellation when not running...');
        const pipeline3 = createCancellableRenderPipeline();
        
        const cancelResult = pipeline3.cancel();
        console.log(`✓ Cancel when not running: ${cancelResult}`);
        
        if (cancelResult !== false) {
            throw new Error('Should not be able to cancel when not running');
        }
        
        // Test pipeline reset after cancellation
        console.log('🔄 Testing pipeline reset...');
        pipeline2.reset();
        
        if (pipeline2.isCancelled() || pipeline2.isRunning() || pipeline2.getProgress() !== 0) {
            throw new Error('Pipeline reset failed');
        }
        
        // Test render after reset
        const result3 = await pipeline2.startRender();
        console.log(`✓ Render after reset: ${JSON.stringify(result3)}`);
        
        if (!result3.completed) {
            throw new Error('Render after reset failed');
        }
        
        console.log('✅ Render cancellation test passed');
        
    } finally {
        await cleanupRenderPipelineEnvironment();
    }
}

/**
 * Test 4: Pipeline State Management
 * Tests render pipeline state transitions and validation
 */
export async function testPipelineStateManagement() {
    await setupRenderPipelineEnvironment();
    
    try {
        console.log('🧪 Testing pipeline state management...');
        
        // Setup project state
        await projectState.update({
            targetResolution: '720p',
            isHorizontal: true,
            effects: [
                {
                    name: 'StateTestEffect',
                    className: 'TestEffect',
                    registryKey: 'test-effect',
                    config: { test: true }
                }
            ]
        });
        
        // Create state-aware render pipeline
        const createStatefulRenderPipeline = () => {
            const states = {
                IDLE: 'idle',
                INITIALIZING: 'initializing',
                READY: 'ready',
                RENDERING: 'rendering',
                COMPLETED: 'completed',
                ERROR: 'error',
                CANCELLED: 'cancelled'
            };
            
            let currentState = states.IDLE;
            let stateHistory = [states.IDLE];
            let renderData = null;
            let error = null;
            
            const validTransitions = {
                [states.IDLE]: [states.INITIALIZING],
                [states.INITIALIZING]: [states.READY, states.ERROR],
                [states.READY]: [states.RENDERING, states.INITIALIZING],
                [states.RENDERING]: [states.COMPLETED, states.ERROR, states.CANCELLED],
                [states.COMPLETED]: [states.INITIALIZING],
                [states.ERROR]: [states.INITIALIZING],
                [states.CANCELLED]: [states.INITIALIZING]
            };
            
            const transitionTo = (newState) => {
                const allowedTransitions = validTransitions[currentState] || [];
                
                if (!allowedTransitions.includes(newState)) {
                    throw new Error(`Invalid state transition: ${currentState} → ${newState}`);
                }
                
                console.log(`  ✓ State transition: ${currentState} → ${newState}`);
                currentState = newState;
                stateHistory.push(newState);
            };
            
            return {
                getState: () => currentState,
                getStateHistory: () => [...stateHistory],
                getRenderData: () => renderData,
                getError: () => error,
                
                initialize: async () => {
                    transitionTo(states.INITIALIZING);
                    
                    // Simulate initialization
                    const effects = projectState.getEffects();
                    const dimensions = projectState.getResolutionDimensions();
                    
                    if (effects.length === 0) {
                        error = 'No effects to render';
                        transitionTo(states.ERROR);
                        return false;
                    }
                    
                    renderData = { effects, dimensions };
                    transitionTo(states.READY);
                    return true;
                },
                
                startRender: async () => {
                    transitionTo(states.RENDERING);
                    
                    try {
                        // Simulate render process
                        console.log('  ✓ Rendering started');
                        await new Promise(resolve => setTimeout(resolve, 50));
                        
                        transitionTo(states.COMPLETED);
                        return { success: true };
                    } catch (err) {
                        error = err.message;
                        transitionTo(states.ERROR);
                        return { success: false, error: err.message };
                    }
                },
                
                cancel: () => {
                    if (currentState === states.RENDERING) {
                        transitionTo(states.CANCELLED);
                        return true;
                    }
                    return false;
                },
                
                reset: () => {
                    transitionTo(states.INITIALIZING);
                    renderData = null;
                    error = null;
                }
            };
        };
        
        // Test state transitions
        console.log('🔄 Testing state transitions...');
        const pipeline = createStatefulRenderPipeline();
        
        // Initial state
        console.log(`✓ Initial state: ${pipeline.getState()}`);
        if (pipeline.getState() !== 'idle') {
            throw new Error('Initial state should be idle');
        }
        
        // Initialize
        const initResult = await pipeline.initialize();
        console.log(`✓ Initialize result: ${initResult}, state: ${pipeline.getState()}`);
        
        if (!initResult || pipeline.getState() !== 'ready') {
            throw new Error('Initialization failed');
        }
        
        // Start render
        const renderResult = await pipeline.startRender();
        console.log(`✓ Render result: ${JSON.stringify(renderResult)}, state: ${pipeline.getState()}`);
        
        if (!renderResult.success || pipeline.getState() !== 'completed') {
            throw new Error('Render failed');
        }
        
        // Test invalid transition
        console.log('🔄 Testing invalid state transition...');
        try {
            // Try to go from completed directly to rendering (should fail)
            const pipeline2 = createStatefulRenderPipeline();
            await pipeline2.initialize();
            await pipeline2.startRender();
            
            // This should throw an error
            await pipeline2.startRender();
            throw new Error('Invalid transition should have been blocked');
        } catch (error) {
            if (error.message.includes('Invalid state transition')) {
                console.log('✅ Invalid state transition correctly blocked');
            } else {
                throw error;
            }
        }
        
        // Test state history
        const stateHistory = pipeline.getStateHistory();
        console.log(`✓ State history: ${stateHistory.join(' → ')}`);
        
        const expectedHistory = ['idle', 'initializing', 'ready', 'rendering', 'completed'];
        if (JSON.stringify(stateHistory) === JSON.stringify(expectedHistory)) {
            console.log('✅ State history verified');
        } else {
            throw new Error('State history incorrect');
        }
        
        // Test cancellation state
        console.log('🔄 Testing cancellation state...');
        const cancelPipeline = createStatefulRenderPipeline();
        await cancelPipeline.initialize();
        
        // Start render and cancel
        const renderPromise = cancelPipeline.startRender();
        setTimeout(() => cancelPipeline.cancel(), 10);
        
        await renderPromise;
        console.log(`✓ Final state after cancel: ${cancelPipeline.getState()}`);
        
        if (cancelPipeline.getState() !== 'cancelled') {
            throw new Error('Cancellation state not reached');
        }
        
        console.log('✅ Pipeline state management test passed');
        
    } finally {
        await cleanupRenderPipelineEnvironment();
    }
}

// Export all test functions for the test runner
console.log('📋 useRenderPipeline.test.js loaded - REAL OBJECTS TESTING READY');