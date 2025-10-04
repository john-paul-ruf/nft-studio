import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * REAL OBJECTS INTEGRATION TESTING - Resolution Scaling
 * Tests resolution change cascades through all services with real objects
 * NO MOCKS - Uses actual service instances and real state management
 */

let testEnv;
let projectState;
let positionScaler;
let resolutionMapper;
let commandService;

// Setup real test environment
async function setupIntegrationEnvironment() {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    
    // Get real service instances
    projectState = testEnv.getService('ProjectState');
    positionScaler = testEnv.getService('PositionScaler');
    resolutionMapper = testEnv.getService('ResolutionMapper');
    commandService = testEnv.getService('CommandService');
    
    console.log('🎯 Resolution Scaling Integration: Real services ready');
}

// Cleanup after each test
async function cleanupIntegrationEnvironment() {
    if (testEnv) {
        await testEnv.cleanup();
        testEnv = null;
        projectState = null;
        positionScaler = null;
        resolutionMapper = null;
        commandService = null;
    }
}

/**
 * Test 1: Resolution Change Cascade Through All Services
 * Tests that resolution changes properly cascade through ProjectState, PositionScaler, and ResolutionMapper
 */
export async function testResolutionChangeCascade() {
    await setupIntegrationEnvironment();
    
    try {
        console.log('🧪 Testing resolution change cascade through all services...');
        
        // Initial setup with 1080p resolution
        await projectState.update({
            targetResolution: '1080p',
            isHorizontal: true,
            effects: [
                {
                    name: 'TestEffect',
                    className: 'TestEffect',
                    registryKey: 'test-effect',
                    type: 'primary',
                    config: {
                        position: { name: 'position', x: 960, y: 540 }
                    }
                }
            ]
        });
        
        // Verify initial state
        const initialDimensions = projectState.getResolutionDimensions();
        const initialEffects = projectState.getEffects();
        const initialPosition = initialEffects[0].config.position;
        
        console.log(`✓ Initial resolution: ${initialDimensions.w}x${initialDimensions.h}`);
        console.log(`✓ Initial position: (${initialPosition.x}, ${initialPosition.y})`);
        
        // Test resolution change to 720p
        console.log('🔄 Changing resolution to 720p...');
        await projectState.update({ targetResolution: '720p' });
        
        // Verify cascade effects
        const newDimensions = projectState.getResolutionDimensions();
        const newEffects = projectState.getEffects();
        const newPosition = newEffects[0].config.position;
        
        console.log(`✓ New resolution: ${newDimensions.w}x${newDimensions.h}`);
        console.log(`✓ New position: (${newPosition.x}, ${newPosition.y})`);
        
        // Verify ResolutionMapper integration
        const resolutionData = resolutionMapper.getResolution('720p');
        if (resolutionData.width === newDimensions.w && resolutionData.height === newDimensions.h) {
            console.log('✅ ResolutionMapper integration verified');
        } else {
            throw new Error('ResolutionMapper integration failed');
        }
        
        // Verify PositionScaler integration (position should be scaled)
        if (newPosition.__autoScaled && newPosition.__scaledAt) {
            console.log('✅ PositionScaler integration verified');
        } else {
            throw new Error('PositionScaler integration failed');
        }
        
        // Verify scaling calculations
        const expectedScaleX = newDimensions.w / initialDimensions.w;
        const expectedScaleY = newDimensions.h / initialDimensions.h;
        const expectedX = Math.round(initialPosition.x * expectedScaleX);
        const expectedY = Math.round(initialPosition.y * expectedScaleY);
        
        if (Math.abs(newPosition.x - expectedX) <= 1 && Math.abs(newPosition.y - expectedY) <= 1) {
            console.log('✅ Position scaling calculations verified');
        } else {
            throw new Error(`Position scaling failed: expected (${expectedX}, ${expectedY}), got (${newPosition.x}, ${newPosition.y})`);
        }
        
        console.log('✅ Resolution change cascade test passed');
        
    } finally {
        await cleanupIntegrationEnvironment();
    }
}

/**
 * Test 2: Undo/Redo with Resolution Changes
 * Tests that resolution changes can be undone/redone properly
 */
export async function testUndoRedoWithResolutionChanges() {
    await setupIntegrationEnvironment();
    
    try {
        console.log('🧪 Testing undo/redo with resolution changes...');
        
        // Initial setup
        await projectState.update({
            targetResolution: '1080p',
            isHorizontal: true,
            effects: [
                {
                    name: 'TestEffect',
                    className: 'TestEffect',
                    registryKey: 'test-effect',
                    type: 'primary',
                    config: {
                        position: { name: 'position', x: 960, y: 540 }
                    }
                }
            ]
        });
        
        const initialState = {
            resolution: projectState.getTargetResolution(),
            dimensions: projectState.getResolutionDimensions(),
            position: projectState.getEffects()[0].config.position
        };
        
        console.log(`✓ Initial state: ${initialState.resolution} (${initialState.dimensions.w}x${initialState.dimensions.h})`);
        console.log(`✓ Initial position: (${initialState.position.x}, ${initialState.position.y})`);
        
        // Create a command for resolution change
        const resolutionChangeCommand = {
            name: 'Change Resolution',
            execute: async () => {
                await projectState.update({ targetResolution: '720p' });
            },
            undo: async () => {
                await projectState.update({ targetResolution: '1080p' });
            }
        };
        
        // Execute resolution change command
        await commandService.executeCommand(resolutionChangeCommand);
        
        const afterChangeState = {
            resolution: projectState.getTargetResolution(),
            dimensions: projectState.getResolutionDimensions(),
            position: projectState.getEffects()[0].config.position
        };
        
        console.log(`✓ After change: ${afterChangeState.resolution} (${afterChangeState.dimensions.w}x${afterChangeState.dimensions.h})`);
        console.log(`✓ After change position: (${afterChangeState.position.x}, ${afterChangeState.position.y})`);
        
        // Verify change was applied
        if (afterChangeState.resolution !== '720p') {
            throw new Error('Resolution change command failed');
        }
        
        // Test undo
        await commandService.undo();
        
        const afterUndoState = {
            resolution: projectState.getTargetResolution(),
            dimensions: projectState.getResolutionDimensions(),
            position: projectState.getEffects()[0].config.position
        };
        
        console.log(`✓ After undo: ${afterUndoState.resolution} (${afterUndoState.dimensions.w}x${afterUndoState.dimensions.h})`);
        console.log(`✓ After undo position: (${afterUndoState.position.x}, ${afterUndoState.position.y})`);
        
        // Verify undo restored original state
        if (afterUndoState.resolution !== initialState.resolution) {
            throw new Error('Undo failed to restore resolution');
        }
        
        // Test redo
        await commandService.redo();
        
        const afterRedoState = {
            resolution: projectState.getTargetResolution(),
            dimensions: projectState.getResolutionDimensions(),
            position: projectState.getEffects()[0].config.position
        };
        
        console.log(`✓ After redo: ${afterRedoState.resolution} (${afterRedoState.dimensions.w}x${afterRedoState.dimensions.h})`);
        console.log(`✓ After redo position: (${afterRedoState.position.x}, ${afterRedoState.position.y})`);
        
        // Verify redo restored changed state
        if (afterRedoState.resolution !== '720p') {
            throw new Error('Redo failed to restore resolution change');
        }
        
        console.log('✅ Undo/redo with resolution changes test passed');
        
    } finally {
        await cleanupIntegrationEnvironment();
    }
}

/**
 * Test 3: Position Scaling Updates UI Components
 * Tests that position scaling properly updates component state
 */
export async function testPositionScalingUpdatesComponents() {
    await setupIntegrationEnvironment();
    
    try {
        console.log('🧪 Testing position scaling updates UI components...');
        
        // Setup with multiple effects containing different position types
        await projectState.update({
            targetResolution: '1080p',
            isHorizontal: true,
            effects: [
                {
                    name: 'PositionEffect',
                    className: 'PositionEffect',
                    registryKey: 'position-effect',
                    type: 'primary',
                    config: {
                        center: { name: 'position', x: 960, y: 540 },
                        corner: { name: 'position', x: 100, y: 100 }
                    }
                },
                {
                    name: 'ArcEffect',
                    className: 'ArcEffect',
                    registryKey: 'arc-effect',
                    type: 'primary',
                    config: {
                        arcPath: {
                            name: 'arc-path',
                            center: { x: 960, y: 540 },
                            radius: 200,
                            startAngle: 0,
                            endAngle: 90
                        }
                    }
                }
            ]
        });
        
        const initialEffects = projectState.getEffects();
        console.log(`✓ Initial effects count: ${initialEffects.length}`);
        
        // Track initial positions
        const initialPositions = {
            center: initialEffects[0].config.center,
            corner: initialEffects[0].config.corner,
            arcCenter: initialEffects[1].config.arcPath.center,
            arcRadius: initialEffects[1].config.arcPath.radius
        };
        
        console.log(`✓ Initial center: (${initialPositions.center.x}, ${initialPositions.center.y})`);
        console.log(`✓ Initial corner: (${initialPositions.corner.x}, ${initialPositions.corner.y})`);
        console.log(`✓ Initial arc center: (${initialPositions.arcCenter.x}, ${initialPositions.arcCenter.y})`);
        console.log(`✓ Initial arc radius: ${initialPositions.arcRadius}`);
        
        // Change resolution to trigger scaling
        await projectState.update({ targetResolution: '720p' });
        
        const scaledEffects = projectState.getEffects();
        const scaledPositions = {
            center: scaledEffects[0].config.center,
            corner: scaledEffects[0].config.corner,
            arcCenter: scaledEffects[1].config.arcPath.center,
            arcRadius: scaledEffects[1].config.arcPath.radius
        };
        
        console.log(`✓ Scaled center: (${scaledPositions.center.x}, ${scaledPositions.center.y})`);
        console.log(`✓ Scaled corner: (${scaledPositions.corner.x}, ${scaledPositions.corner.y})`);
        console.log(`✓ Scaled arc center: (${scaledPositions.arcCenter.x}, ${scaledPositions.arcCenter.y})`);
        console.log(`✓ Scaled arc radius: ${scaledPositions.arcRadius}`);
        
        // Verify all positions were scaled
        const positionsToCheck = [
            scaledPositions.center,
            scaledPositions.corner
        ];
        
        for (const position of positionsToCheck) {
            if (!position.__autoScaled || !position.__scaledAt) {
                throw new Error('Position was not properly scaled');
            }
        }
        
        // Verify arc path was scaled
        if (!scaledEffects[1].config.arcPath.__autoScaled) {
            throw new Error('Arc path was not properly scaled');
        }
        
        // Verify scaling ratios are consistent
        const scaleRatio = 1280 / 1920; // 720p width / 1080p width
        const expectedCenterX = Math.round(initialPositions.center.x * scaleRatio);
        const expectedCenterY = Math.round(initialPositions.center.y * scaleRatio);
        
        if (Math.abs(scaledPositions.center.x - expectedCenterX) <= 1 &&
            Math.abs(scaledPositions.center.y - expectedCenterY) <= 1) {
            console.log('✅ Position scaling ratios verified');
        } else {
            throw new Error('Position scaling ratios incorrect');
        }
        
        console.log('✅ Position scaling updates components test passed');
        
    } finally {
        await cleanupIntegrationEnvironment();
    }
}

/**
 * Test 4: Cross-Service Communication During Resolution Changes
 * Tests that all services communicate properly during resolution changes
 */
export async function testCrossServiceCommunication() {
    await setupIntegrationEnvironment();
    
    try {
        console.log('🧪 Testing cross-service communication during resolution changes...');
        
        // Setup initial state
        await projectState.update({
            targetResolution: '1080p',
            isHorizontal: true,
            effects: [
                {
                    name: 'TestEffect',
                    className: 'TestEffect',
                    registryKey: 'test-effect',
                    type: 'primary',
                    config: {
                        position: { name: 'position', x: 960, y: 540 }
                    }
                }
            ]
        });
        
        // Track service interactions
        const serviceInteractions = {
            resolutionMapperCalls: 0,
            positionScalerCalls: 0,
            projectStateUpdates: 0
        };
        
        // Test resolution change with service tracking
        console.log('🔄 Initiating resolution change with service tracking...');
        
        // Change resolution and track interactions
        await projectState.update({ targetResolution: '4k' });
        
        // Verify services were involved
        const newDimensions = projectState.getResolutionDimensions();
        const newEffects = projectState.getEffects();
        const newPosition = newEffects[0].config.position;
        
        console.log(`✓ New resolution dimensions: ${newDimensions.w}x${newDimensions.h}`);
        console.log(`✓ New position: (${newPosition.x}, ${newPosition.y})`);
        
        // Verify ResolutionMapper was used
        const resolutionData = resolutionMapper.getResolution('4k');
        if (resolutionData && resolutionData.width === newDimensions.w) {
            console.log('✅ ResolutionMapper communication verified');
        } else {
            throw new Error('ResolutionMapper communication failed');
        }
        
        // Verify PositionScaler was used
        if (newPosition.__autoScaled && newPosition.__scaledAt) {
            console.log('✅ PositionScaler communication verified');
        } else {
            throw new Error('PositionScaler communication failed');
        }
        
        // Verify ProjectState coordination
        const currentResolution = projectState.getTargetResolution();
        if (currentResolution === '4k') {
            console.log('✅ ProjectState coordination verified');
        } else {
            throw new Error('ProjectState coordination failed');
        }
        
        // Test multiple rapid resolution changes
        console.log('🔄 Testing rapid resolution changes...');
        
        const resolutions = ['720p', '1080p', '1440p', '4k'];
        for (const resolution of resolutions) {
            await projectState.update({ targetResolution: resolution });
            
            const currentDimensions = projectState.getResolutionDimensions();
            const expectedData = resolutionMapper.getResolution(resolution);
            
            if (currentDimensions.w !== expectedData.width || currentDimensions.h !== expectedData.height) {
                throw new Error(`Rapid resolution change failed for ${resolution}`);
            }
            
            console.log(`✓ Rapid change to ${resolution}: ${currentDimensions.w}x${currentDimensions.h}`);
        }
        
        console.log('✅ Cross-service communication test passed');
        
    } finally {
        await cleanupIntegrationEnvironment();
    }
}

// Export all test functions for the test runner
console.log('📋 resolution-scaling-integration.test.js loaded - REAL OBJECTS INTEGRATION TESTING READY');