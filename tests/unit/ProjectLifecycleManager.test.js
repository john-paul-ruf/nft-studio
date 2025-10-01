/**
 * ProjectLifecycleManager Test Suite
 * Tests the project lifecycle management functionality extracted from NftProjectManager
 */

import { ProjectLifecycleManager } from '../../src/services/ProjectLifecycleManager.js';

// Test environment setup
const testEnv = {
    results: [],
    
    log: (message) => {
        console.log(`[ProjectLifecycleManager Test] ${message}`);
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
        
        console.log(`\n📊 ProjectLifecycleManager Test Results: ${passed}/${total} passed, ${failed} failed`);
        
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
        const manager = new ProjectLifecycleManager();
        
        if (typeof manager !== 'object') {
            throw new Error('ProjectLifecycleManager should be an object');
        }
        
        // Test with dependencies
        const mockEventBus = { emit: () => {} };
        const mockLogger = { info: () => {}, error: () => {}, success: () => {}, header: () => {}, warn: () => {} };
        
        const managerWithDeps = new ProjectLifecycleManager(null, null, mockEventBus, mockLogger);
        
        if (!managerWithDeps.eventBus) {
            throw new Error('EventBus should be injected');
        }
        
        if (!managerWithDeps.logger) {
            throw new Error('Logger should be injected');
        }
        
        // Test internal state initialization
        if (!(managerWithDeps.activeProjects instanceof Map)) {
            throw new Error('activeProjects should be initialized as Map');
        }
        
        testEnv.success('Constructor and initialization work correctly');
        
    } catch (error) {
        testEnv.error('Constructor and initialization failed', error);
    }
}

/**
 * Test 2: Project State Management
 */
async function testProjectStateManagement() {
    testEnv.log('Testing project state management...');
    
    try {
        const manager = new ProjectLifecycleManager();
        
        // Test initial state
        const activeNames = manager.getActiveProjectNames();
        if (!Array.isArray(activeNames) || activeNames.length !== 0) {
            throw new Error('Initial active projects should be empty array');
        }
        
        // Test project existence check
        const exists = manager.isProjectActive('test-project');
        if (exists !== false) {
            throw new Error('Non-existent project should return false');
        }
        
        // Test getting non-existent project
        const project = manager.getActiveProject('test-project');
        if (project !== null) {
            throw new Error('Non-existent project should return null');
        }
        
        // Test clearing projects (should not throw)
        manager.clearActiveProjects();
        
        testEnv.success('Project state management works correctly');
        
    } catch (error) {
        testEnv.error('Project state management failed', error);
    }
}

/**
 * Test 3: ProjectState Conversion
 */
async function testProjectStateConversion() {
    testEnv.log('Testing ProjectState conversion...');
    
    try {
        const manager = new ProjectLifecycleManager();
        
        // Test with legacy config object
        const legacyConfig = {
            projectName: 'Test Project',
            numFrames: 100,
            targetResolution: '1920x1080',
            effects: []
        };
        
        const projectState = await manager.ensureProjectState(legacyConfig);
        
        if (!projectState) {
            throw new Error('ProjectState should be created from legacy config');
        }
        
        const state = projectState.getState();
        if (state.projectName !== 'Test Project') {
            throw new Error('ProjectState should preserve project name');
        }
        
        testEnv.success('ProjectState conversion works correctly');
        
    } catch (error) {
        testEnv.error('ProjectState conversion failed', error);
    }
}

/**
 * Test 4: Resolution Configuration
 */
async function testResolutionConfiguration() {
    testEnv.log('Testing resolution configuration...');
    
    try {
        const manager = new ProjectLifecycleManager();
        
        // Test with known resolution
        const resolution = manager.getResolutionFromConfig('1920x1080');
        
        if (!resolution || typeof resolution !== 'object') {
            throw new Error('Resolution should return object');
        }
        
        if (!resolution.width || !resolution.height) {
            throw new Error('Resolution should have width and height');
        }
        
        if (typeof resolution.width !== 'number' || typeof resolution.height !== 'number') {
            throw new Error('Resolution width and height should be numbers');
        }
        
        // Test with unknown resolution (should use default)
        const defaultResolution = manager.getResolutionFromConfig('unknown');
        
        if (defaultResolution.width !== 1920 || defaultResolution.height !== 1080) {
            throw new Error('Unknown resolution should return default 1920x1080');
        }
        
        testEnv.success('Resolution configuration works correctly');
        
    } catch (error) {
        testEnv.error('Resolution configuration failed', error);
    }
}

/**
 * Test 5: Color Scheme Validation
 */
async function testColorSchemeValidation() {
    testEnv.log('Testing color scheme validation...');
    
    try {
        const manager = new ProjectLifecycleManager();
        
        // Test valid color scheme data
        const validColorSchemeData = {
            colors: ['#FF0000', '#00FF00', '#0000FF'],
            lights: ['#FFFFFF', '#CCCCCC'],
            neutrals: ['#808080', '#404040'],
            backgrounds: ['#000000', '#111111'],
            name: 'Test Scheme'
        };
        
        // This should not throw
        manager.validateColorSchemeData(validColorSchemeData);
        
        // Test missing colors array
        try {
            manager.validateColorSchemeData({ lights: [], neutrals: [], backgrounds: [] });
            throw new Error('Should have thrown for missing colors');
        } catch (error) {
            if (!error.message.includes('MISSING colorSchemeData.colors')) {
                throw new Error('Should throw specific error for missing colors');
            }
        }
        
        // Test empty colors array
        try {
            manager.validateColorSchemeData({
                colors: [],
                lights: ['#FFFFFF'],
                neutrals: ['#808080'],
                backgrounds: ['#000000']
            });
            throw new Error('Should have thrown for empty colors');
        } catch (error) {
            if (!error.message.includes('EMPTY colorSchemeData.colors')) {
                throw new Error('Should throw specific error for empty colors');
            }
        }
        
        // Test non-array colors
        try {
            manager.validateColorSchemeData({
                colors: '#FF0000',
                lights: ['#FFFFFF'],
                neutrals: ['#808080'],
                backgrounds: ['#000000']
            });
            throw new Error('Should have thrown for non-array colors');
        } catch (error) {
            if (!error.message.includes('INVALID colorSchemeData.colors')) {
                throw new Error('Should throw specific error for non-array colors');
            }
        }
        
        testEnv.success('Color scheme validation works correctly');
        
    } catch (error) {
        testEnv.error('Color scheme validation failed', error);
    }
}

/**
 * Test 6: Event Emission
 */
async function testEventEmission() {
    testEnv.log('Testing event emission...');
    
    try {
        const emittedEvents = [];
        const mockEventBus = {
            emit: (eventName, data) => {
                emittedEvents.push({ eventName, data });
            }
        };
        
        const manager = new ProjectLifecycleManager(null, null, mockEventBus);
        
        // Test clear projects event
        manager.clearActiveProjects();
        
        if (emittedEvents.length !== 1) {
            throw new Error('Should emit one event for clearActiveProjects');
        }
        
        if (emittedEvents[0].eventName !== 'projects:cleared') {
            throw new Error('Should emit projects:cleared event');
        }
        
        if (!emittedEvents[0].data.timestamp) {
            throw new Error('Event should include timestamp');
        }
        
        testEnv.success('Event emission works correctly');
        
    } catch (error) {
        testEnv.error('Event emission failed', error);
    }
}

/**
 * Test 7: Error Handling and Edge Cases
 */
async function testErrorHandlingAndEdgeCases() {
    testEnv.log('Testing error handling and edge cases...');
    
    try {
        const manager = new ProjectLifecycleManager();
        
        // Test removing non-existent project
        const removed = manager.removeActiveProject('non-existent');
        if (removed !== false) {
            throw new Error('Removing non-existent project should return false');
        }
        
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
        
        // Test resolution with null input
        const resolution = manager.getResolutionFromConfig(null);
        if (!resolution || resolution.width !== 1920) {
            throw new Error('Should return default resolution for null input');
        }
        
        testEnv.success('Error handling and edge cases work correctly');
        
    } catch (error) {
        testEnv.error('Error handling and edge cases failed', error);
    }
}

/**
 * Test 8: Performance and Complexity Baseline
 */
async function testPerformanceAndComplexity() {
    testEnv.log('Testing performance and complexity baseline...');
    
    try {
        const startTime = Date.now();
        
        // Create multiple managers to test instantiation performance
        const managers = [];
        for (let i = 0; i < 10; i++) {
            managers.push(new ProjectLifecycleManager());
        }
        
        const instantiationTime = Date.now() - startTime;
        
        if (instantiationTime > 100) { // 100ms threshold
            throw new Error(`Instantiation too slow: ${instantiationTime}ms for 10 instances`);
        }
        
        // Test method call performance
        const methodStartTime = Date.now();
        
        for (const manager of managers) {
            manager.getActiveProjectNames();
            manager.isProjectActive('test');
            manager.getActiveProject('test');
            manager.clearActiveProjects();
        }
        
        const methodTime = Date.now() - methodStartTime;
        
        if (methodTime > 50) { // 50ms threshold for 40 method calls
            throw new Error(`Method calls too slow: ${methodTime}ms for 40 calls`);
        }
        
        // Test memory usage (basic check)
        const manager = new ProjectLifecycleManager();
        const initialKeys = Object.keys(manager).length;
        
        if (initialKeys > 10) { // Reasonable number of properties
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
async function runProjectLifecycleManagerTests() {
    console.log('🧪 Starting ProjectLifecycleManager Test Suite...\n');
    
    const tests = [
        testConstructorAndInitialization,
        testProjectStateManagement,
        testProjectStateConversion,
        testResolutionConfiguration,
        testColorSchemeValidation,
        testEventEmission,
        testErrorHandlingAndEdgeCases,
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
export { runProjectLifecycleManagerTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runProjectLifecycleManagerTests().then(results => {
        process.exit(results.success ? 0 : 1);
    });
}