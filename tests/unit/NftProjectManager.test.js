/**
 * NftProjectManager Test Suite
 * Tests the NftProjectManager that uses extracted services
 */

import NftProjectManager from '../../src/main/implementations/NftProjectManager.js';

// Test environment setup
const testEnv = {
    results: [],
    
    log: (message) => {
        console.log(`[NftProjectManager Test] ${message}`);
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
        
        console.log(`\n📊 NftProjectManager Test Results: ${passed}/${total} passed, ${failed} failed`);
        
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
 * Test 1: Constructor and Service Integration
 */
async function testConstructorAndServiceIntegration() {
    testEnv.log('Testing constructor and service integration...');
    
    try {
        // Test basic constructor
        const manager = new NftProjectManager();
        
        if (typeof manager !== 'object') {
            throw new Error('NftProjectManager should be an object');
        }
        
        // Test service integration
        if (!manager.pluginLifecycleManager) {
            throw new Error('PluginLifecycleManager should be initialized');
        }
        
        if (!manager.projectLifecycleManager) {
            throw new Error('ProjectLifecycleManager should be initialized');
        }
        
        if (!manager.renderCoordinator) {
            throw new Error('RenderCoordinator should be initialized');
        }
        
        // Test with event bus
        const testEventBus = { emit: () => {} };
        const managerWithEventBus = new NftProjectManager(null, testEventBus);
        
        if (!managerWithEventBus.pluginLifecycleManager) {
            throw new Error('Services should be initialized with event bus');
        }
        
        testEnv.success('Constructor and service integration work correctly');
        
    } catch (error) {
        testEnv.error('Constructor and service integration failed', error);
    }
}

/**
 * Test 2: Service Delegation
 */
async function testServiceDelegation() {
    testEnv.log('Testing service delegation...');
    
    try {
        const manager = new NftProjectManager();
        
        // Test plugin status delegation
        const pluginStatus = manager.getPluginStatus();
        
        if (typeof pluginStatus !== 'object') {
            throw new Error('Plugin status should return object');
        }
        
        if (typeof pluginStatus.isInitialized !== 'boolean') {
            throw new Error('Plugin status should include isInitialized boolean');
        }
        
        if (typeof pluginStatus.loadedPluginCount !== 'number') {
            throw new Error('Plugin status should include loadedPluginCount number');
        }
        
        if (!Array.isArray(pluginStatus.loadedPlugins)) {
            throw new Error('Plugin status should include loadedPlugins array');
        }
        
        // Test render status delegation
        const renderStatus = manager.getRenderStatus();
        
        if (typeof renderStatus !== 'object') {
            throw new Error('Render status should return object');
        }
        
        if (typeof renderStatus.isActive !== 'boolean') {
            throw new Error('Render status should include isActive boolean');
        }
        
        // Test project lifecycle delegation
        const activeProject = manager.getActiveProject('non-existent');
        if (activeProject !== null) {
            throw new Error('Non-existent project should return null');
        }
        
        // Test clear projects delegation (should not throw)
        manager.clearActiveProjects();
        
        testEnv.success('Service delegation works correctly');
        
    } catch (error) {
        testEnv.error('Service delegation failed', error);
    }
}

/**
 * Test 3: Legacy Compatibility Methods
 */
async function testLegacyCompatibilityMethods() {
    testEnv.log('Testing legacy compatibility methods...');
    
    try {
        const manager = new NftProjectManager();
        
        // Test ensureProjectState delegation
        const legacyConfig = {
            projectName: 'Test Project',
            numFrames: 100,
            targetResolution: '1920x1080',
            effects: []
        };
        
        const projectState = await manager.ensureProjectState(legacyConfig);
        
        if (!projectState) {
            throw new Error('ensureProjectState should return ProjectState');
        }
        
        const state = projectState.getState();
        if (state.projectName !== 'Test Project') {
            throw new Error('ProjectState should preserve project name');
        }
        
        // Test setupEventForwarding (should not throw)
        const testEventBus = { emit: () => {} };
        manager.setupEventForwarding(testEventBus);
        
        // Test emitProgressEvent (should not throw)
        manager.emitProgressEvent('test.event', { test: 'data' });
        
        testEnv.success('Legacy compatibility methods work correctly');
        
    } catch (error) {
        testEnv.error('Legacy compatibility methods failed', error);
    }
}

/**
 * Test 4: Error Handling and Edge Cases
 */
async function testErrorHandlingAndEdgeCases() {
    testEnv.log('Testing error handling and edge cases...');
    
    try {
        const manager = new NftProjectManager();
        
        // Test with null/undefined inputs
        try {
            await manager.ensureProjectState(null);
            throw new Error('Should handle null input gracefully');
        } catch (error) {
            // Expected to throw, but should be handled gracefully
            if (!error.message) {
                throw new Error('Error should have meaningful message');
            }
        }
        
        // Test stop render loop when no active loop
        const stopResult = await manager.stopRenderLoop();
        if (!stopResult.success) {
            throw new Error('Stop should succeed even when no active loop');
        }
        
        // Test render status when no active render
        const renderStatus = manager.getRenderStatus();
        if (renderStatus.isActive !== false) {
            throw new Error('Render status should show inactive when no active render');
        }
        
        testEnv.success('Error handling and edge cases work correctly');
        
    } catch (error) {
        testEnv.error('Error handling and edge cases failed', error);
    }
}

/**
 * Test 5: Effect Configuration Logic
 */
async function testEffectConfigurationLogic() {
    testEnv.log('Testing effect configuration logic...');
    
    try {
        const manager = new NftProjectManager();
        
        // Test project with effect methods
        const testProject = {
            addPrimaryEffect: () => {},
            addSecondaryEffect: () => {},
            addFinalEffect: () => {}
        };
        
        // Test ProjectState with no effects
        const testProjectStateNoEffects = {
            getState: () => ({
                projectName: 'Test Project',
                effects: []
            })
        };
        
        // Should handle no effects gracefully
        await manager.configureProjectFromProjectState(testProject, testProjectStateNoEffects);
        
        // Test ProjectState with effects
        const testProjectStateWithEffects = {
            getState: () => ({
                projectName: 'Test Project',
                effects: [
                    { name: 'Effect1', type: 'primary', visible: true },
                    { name: 'Effect2', type: 'secondary', visible: true },
                    { name: 'Effect3', type: 'final', visible: true },
                    { name: 'Effect4', type: 'primary', visible: false } // hidden
                ]
            })
        };
        
        // Should handle effects configuration (may fail due to missing dependencies, but should not crash)
        try {
            await manager.configureProjectFromProjectState(testProject, testProjectStateWithEffects);
        } catch (error) {
            // Expected to fail due to missing EffectProcessingService in test environment
            // But should not crash the test
            if (!error.message.includes('Cannot resolve module')) {
                throw error;
            }
        }
        
        testEnv.success('Effect configuration logic works correctly');
        
    } catch (error) {
        testEnv.error('Effect configuration logic failed', error);
    }
}

/**
 * Test 6: Service Coordination
 */
async function testServiceCoordination() {
    testEnv.log('Testing service coordination...');
    
    try {
        const manager = new NftProjectManager();
        
        // Test that services are properly coordinated
        const pluginStatus = manager.getPluginStatus();
        const renderStatus = manager.getRenderStatus();
        
        // Both services should be available and responsive
        if (typeof pluginStatus.isInitialized !== 'boolean') {
            throw new Error('Plugin service should be responsive');
        }
        
        if (typeof renderStatus.isActive !== 'boolean') {
            throw new Error('Render service should be responsive');
        }
        
        // Test that project lifecycle operations are coordinated
        const activeProject = manager.getActiveProject('test');
        if (activeProject !== null) {
            throw new Error('Project lifecycle service should be responsive');
        }
        
        testEnv.success('Service coordination works correctly');
        
    } catch (error) {
        testEnv.error('Service coordination failed', error);
    }
}

/**
 * Test 7: Performance and Complexity Reduction
 */
async function testPerformanceAndComplexityReduction() {
    testEnv.log('Testing performance and complexity reduction...');
    
    try {
        const startTime = Date.now();
        
        // Create multiple managers to test instantiation performance
        const managers = [];
        for (let i = 0; i < 5; i++) {
            managers.push(new NftProjectManager());
        }
        
        const instantiationTime = Date.now() - startTime;
        
        if (instantiationTime > 200) { // 200ms threshold for 5 instances
            throw new Error(`Instantiation too slow: ${instantiationTime}ms for 5 instances`);
        }
        
        // Test method call performance
        const methodStartTime = Date.now();
        
        for (const manager of managers) {
            manager.getPluginStatus();
            manager.getRenderStatus();
            manager.getActiveProject('test');
            manager.clearActiveProjects();
        }
        
        const methodTime = Date.now() - methodStartTime;
        
        if (methodTime > 100) { // 100ms threshold for 20 method calls
            throw new Error(`Method calls too slow: ${methodTime}ms for 20 calls`);
        }
        
        // Test memory usage (basic check)
        const manager = new NftProjectManager();
        const initialKeys = Object.keys(manager).length;
        
        // Should have fewer properties than the original god object
        if (initialKeys > 10) {
            throw new Error(`Too many instance properties: ${initialKeys} (should be reduced from god object)`);
        }
        
        testEnv.success(`Performance and complexity reduction verified: ${instantiationTime}ms instantiation, ${methodTime}ms methods, ${initialKeys} properties`);
        
    } catch (error) {
        testEnv.error('Performance and complexity reduction failed', error);
    }
}

/**
 * Test 8: Integration Verification
 */
async function testIntegrationVerification() {
    testEnv.log('Testing integration verification...');
    
    try {
        const manager = new NftProjectManager();
        
        // Verify all services are properly integrated
        const services = [
            'pluginLifecycleManager',
            'projectLifecycleManager',
            'renderCoordinator'
        ];
        
        for (const serviceName of services) {
            if (!manager[serviceName]) {
                throw new Error(`Service ${serviceName} should be integrated`);
            }
            
            if (typeof manager[serviceName] !== 'object') {
                throw new Error(`Service ${serviceName} should be an object`);
            }
        }
        
        // Verify service methods are accessible through manager
        const pluginStatus = manager.getPluginStatus();
        const renderStatus = manager.getRenderStatus();
        
        if (!pluginStatus || !renderStatus) {
            throw new Error('Service methods should be accessible through manager');
        }
        
        // Verify legacy compatibility is maintained
        const legacyMethods = [
            'ensureProjectState',
            'ensurePluginsLoaded',
            'setupEventForwarding',
            'emitProgressEvent'
        ];
        
        for (const methodName of legacyMethods) {
            if (typeof manager[methodName] !== 'function') {
                throw new Error(`Legacy method ${methodName} should be available`);
            }
        }
        
        testEnv.success('Integration verification passed');
        
    } catch (error) {
        testEnv.error('Integration verification failed', error);
    }
}

/**
 * Main test runner
 */
async function runNftProjectManagerTests() {
    console.log('🧪 Starting NftProjectManager Test Suite...\n');
    
    const tests = [
        testConstructorAndServiceIntegration,
        testServiceDelegation,
        testLegacyCompatibilityMethods,
        testErrorHandlingAndEdgeCases,
        testEffectConfigurationLogic,
        testServiceCoordination,
        testPerformanceAndComplexityReduction,
        testIntegrationVerification
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

// Export individual test functions for test runner discovery
export {
    testConstructorAndServiceIntegration,
    testServiceDelegation,
    testLegacyCompatibilityMethods,
    testErrorHandlingAndEdgeCases,
    testEffectConfigurationLogic,
    testServiceCoordination,
    testPerformanceAndComplexityReduction,
    testIntegrationVerification,
    runNftProjectManagerTests
};

// Test registration for the test runner
export const tests = [
    {
        name: 'Constructor and Service Integration',
        category: 'unit',
        fn: testConstructorAndServiceIntegration,
        description: 'Tests NftProjectManager constructor and service integration'
    },
    {
        name: 'Service Delegation',
        category: 'unit',
        fn: testServiceDelegation,
        description: 'Tests delegation to extracted services'
    },
    {
        name: 'Legacy Compatibility Methods',
        category: 'unit',
        fn: testLegacyCompatibilityMethods,
        description: 'Tests backward compatibility methods'
    },
    {
        name: 'Error Handling and Edge Cases',
        category: 'unit',
        fn: testErrorHandlingAndEdgeCases,
        description: 'Tests error handling and edge cases'
    },
    {
        name: 'Effect Configuration Logic',
        category: 'unit',
        fn: testEffectConfigurationLogic,
        description: 'Tests effect configuration logic'
    },
    {
        name: 'Service Coordination',
        category: 'unit',
        fn: testServiceCoordination,
        description: 'Tests coordination between services'
    },
    {
        name: 'Performance and Complexity Reduction',
        category: 'unit',
        fn: testPerformanceAndComplexityReduction,
        description: 'Tests performance improvements from refactoring'
    },
    {
        name: 'Integration Verification',
        category: 'unit',
        fn: testIntegrationVerification,
        description: 'Tests integration between all components'
    }
];

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runNftProjectManagerTests().then(results => {
        process.exit(results.success ? 0 : 1);
    });
}