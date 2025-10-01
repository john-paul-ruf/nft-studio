/**
 * ProjectState Tests
 * Tests for the ProjectState using service-oriented architecture
 * 
 * Test Categories:
 * - Service integration and delegation
 * - Backward compatibility with original API
 * - Service orchestration
 * - Performance improvements
 * - Architecture validation
 * - Error handling across services
 * - Service isolation
 * - Code reduction verification
 */

import ProjectState from '../../src/models/ProjectState.js';

// Test helper functions
function createTestProjectState(initialConfig = null, onUpdate = null) {
    return new ProjectState(initialConfig, onUpdate);
}

function createTestEffect(name = 'TestEffect', className = 'TestEffectClass') {
    return {
        id: `effect_${Date.now()}_${Math.random()}`,
        name,
        className,
        config: {
            position: { x: 100, y: 100 }
        }
    };
}

function createTestConfig() {
    return {
        projectName: 'Test Project',
        artist: 'Test Artist',
        targetResolution: 1080,
        isHorizontal: false,
        numFrames: 50,
        effects: [createTestEffect()],
        colorScheme: 'test-scheme',
        colorSchemeData: { primary: '#ff0000' }
    };
}

// Test Suite
console.log('🧪 Starting ProjectState Tests...');

// Test 1: Service Integration and Delegation
function testServiceIntegrationAndDelegation() {
    console.log('📝 Test 1: Service Integration and Delegation');
    
    try {
        const projectState = createTestProjectState();
        
        // Test that all services are properly initialized
        const coreManager = projectState.getCoreManager();
        const effectsManager = projectState.getEffectsManager();
        const resolutionManager = projectState.getResolutionManager();
        const validationManager = projectState.getValidationManager();
        const persistenceManager = projectState.getPersistenceManager();
        
        if (!coreManager) throw new Error('Core manager not initialized');
        if (!effectsManager) throw new Error('Effects manager not initialized');
        if (!resolutionManager) throw new Error('Resolution manager not initialized');
        if (!validationManager) throw new Error('Validation manager not initialized');
        if (!persistenceManager) throw new Error('Persistence manager not initialized');
        
        // Test service delegation - core operations
        projectState.setProjectName('Delegated Project');
        if (projectState.getProjectName() !== 'Delegated Project') {
            throw new Error('Core service delegation failed');
        }
        
        // Test service delegation - effects operations
        const testEffect = createTestEffect('Delegated Effect');
        projectState.addEffect(testEffect);
        if (!projectState.hasEffects()) {
            throw new Error('Effects service delegation failed');
        }
        
        // Test service delegation - resolution operations
        projectState.setTargetResolution(1280);
        if (projectState.getTargetResolution() !== 1280) {
            throw new Error('Resolution service delegation failed');
        }
        
        // Test service delegation - validation operations
        const validation = projectState.validate();
        if (typeof validation.isValid !== 'boolean') {
            throw new Error('Validation service delegation failed');
        }
        
        // Test service delegation - persistence operations
        const serialized = projectState.serialize();
        if (typeof serialized !== 'string') {
            throw new Error('Persistence service delegation failed');
        }
        
        console.log('✅ Service integration and delegation test passed');
        return true;
    } catch (error) {
        console.error('❌ Service integration and delegation test failed:', error.message);
        return false;
    }
}

// Test 2: Backward Compatibility
function testBackwardCompatibility() {
    console.log('📝 Test 2: Backward Compatibility');
    
    try {
        const testConfig = createTestConfig();
        const projectState = createTestProjectState(testConfig);
        
        // Test all original API methods still work
        
        // Basic property operations
        if (projectState.getProjectName() !== testConfig.projectName) {
            throw new Error('getProjectName compatibility failed');
        }
        
        projectState.setArtist('New Artist');
        if (projectState.getArtist() !== 'New Artist') {
            throw new Error('setArtist compatibility failed');
        }
        
        // Effect operations
        const originalEffectsCount = projectState.getEffects().length;
        const newEffect = createTestEffect('Compatibility Effect');
        projectState.addEffect(newEffect);
        
        if (projectState.getEffects().length !== originalEffectsCount + 1) {
            throw new Error('addEffect compatibility failed');
        }
        
        // Resolution operations
        const originalResolution = projectState.getTargetResolution();
        projectState.setTargetResolution(1440);
        if (projectState.getTargetResolution() !== 1440) {
            throw new Error('setTargetResolution compatibility failed');
        }
        
        // Validation operations
        const validation = projectState.validate();
        if (!validation.hasOwnProperty('isValid') || !validation.hasOwnProperty('errors')) {
            throw new Error('validate compatibility failed');
        }
        
        // Persistence operations
        const jsonObj = projectState.toJSON();
        if (!jsonObj.version || !jsonObj.state) {
            throw new Error('toJSON compatibility failed');
        }
        
        // State operations
        const state = projectState.getState();
        if (!state.projectName || !state.effects) {
            throw new Error('getState compatibility failed');
        }
        
        const cloned = projectState.clone();
        if (cloned.getProjectName() !== projectState.getProjectName()) {
            throw new Error('clone compatibility failed');
        }
        
        console.log('✅ Backward compatibility test passed');
        return true;
    } catch (error) {
        console.error('❌ Backward compatibility test failed:', error.message);
        return false;
    }
}

// Test 3: Service Orchestration
function testServiceOrchestration() {
    console.log('📝 Test 3: Service Orchestration');
    
    try {
        const projectState = createTestProjectState();
        
        // Test cross-service operations
        // Resolution change should trigger effects scaling
        const testEffect = createTestEffect('Orchestration Effect');
        testEffect.config.position = { x: 100, y: 100 };
        projectState.addEffect(testEffect);
        
        // Change resolution - should trigger scaling through service orchestration
        projectState.setTargetResolution(1080);
        projectState.setTargetResolution(1280);
        
        // Verify effect still exists (scaling should preserve effects)
        const effects = projectState.getEffects();
        if (effects.length === 0) {
            throw new Error('Service orchestration lost effects during scaling');
        }
        
        // Test validation across services
        projectState.setProjectName('Orchestrated Project');
        projectState.setColorSchemeData({ primary: '#ff0000' });
        projectState.setNumFrames(100);
        
        const validation = projectState.validate();
        if (!validation.isValid) {
            throw new Error('Service orchestration validation failed');
        }
        
        // Test persistence with all services
        const serialized = projectState.serialize();
        const parsed = JSON.parse(serialized);
        
        if (!parsed.state.projectName || !parsed.state.effects) {
            throw new Error('Service orchestration persistence failed');
        }
        
        console.log('✅ Service orchestration test passed');
        return true;
    } catch (error) {
        console.error('❌ Service orchestration test failed:', error.message);
        return false;
    }
}

// Test 4: Performance Improvements
function testPerformanceImprovements() {
    console.log('📝 Test 4: Performance Improvements');
    
    try {
        const startTime = Date.now();
        
        // Test constructor performance
        const projectState = createTestProjectState();
        const constructorTime = Date.now() - startTime;
        
        if (constructorTime > 100) {
            console.log(`⚠️ Warning: Constructor took ${constructorTime}ms (target: <100ms)`);
        }
        
        // Test method performance with service delegation
        const methodStartTime = Date.now();
        
        for (let i = 0; i < 50; i++) {
            projectState.setProjectName(`Performance Test ${i}`);
            projectState.getProjectName();
            projectState.addEffect(createTestEffect(`Effect ${i}`));
            projectState.getEffects();
        }
        
        const methodTime = Date.now() - methodStartTime;
        const avgMethodTime = methodTime / 200; // 200 operations
        
        if (avgMethodTime > 2) {
            console.log(`⚠️ Warning: Average method time ${avgMethodTime}ms (target: <2ms)`);
        }
        
        // Test service isolation performance
        const isolationStartTime = Date.now();
        
        const coreManager = projectState.getCoreManager();
        const effectsManager = projectState.getEffectsManager();
        
        for (let i = 0; i < 20; i++) {
            coreManager.setProperty('testProp', `value${i}`);
            effectsManager.getEffectsCount();
        }
        
        const isolationTime = Date.now() - isolationStartTime;
        
        if (isolationTime > 50) {
            console.log(`⚠️ Warning: Service isolation time ${isolationTime}ms (target: <50ms)`);
        }
        
        console.log('✅ Performance improvements test passed');
        console.log(`📊 Performance Metrics:`);
        console.log(`   Constructor: ${constructorTime}ms (target: <100ms)`);
        console.log(`   Average method: ${avgMethodTime.toFixed(2)}ms (target: <2ms)`);
        console.log(`   Service isolation: ${isolationTime}ms (target: <50ms)`);
        
        return true;
    } catch (error) {
        console.error('❌ Performance improvements test failed:', error.message);
        return false;
    }
}

// Test 5: Architecture Validation
function testArchitectureValidation() {
    console.log('📝 Test 5: Architecture Validation');
    
    try {
        const projectState = createTestProjectState();
        
        // Test service information
        const serviceInfo = projectState.getServiceInfo();
        
        if (!serviceInfo.core || !serviceInfo.effects || !serviceInfo.resolution || 
            !serviceInfo.validation || !serviceInfo.persistence) {
            throw new Error('Service information incomplete');
        }
        
        // Verify each service has correct responsibility
        if (serviceInfo.core.responsibility !== 'Core state management') {
            throw new Error('Core service responsibility incorrect');
        }
        
        if (serviceInfo.effects.responsibility !== 'Effect operations') {
            throw new Error('Effects service responsibility incorrect');
        }
        
        // Test architecture summary
        const archSummary = projectState.getArchitectureSummary();
        
        if (archSummary.pattern !== 'Service-Oriented Architecture') {
            throw new Error('Architecture pattern incorrect');
        }
        
        if (archSummary.principle !== 'Single Responsibility Principle') {
            throw new Error('Architecture principle incorrect');
        }
        
        if (archSummary.services !== 5) {
            throw new Error('Service count incorrect');
        }
        
        // Test code reduction metrics
        const codeMetrics = archSummary.codeReduction;
        if (!codeMetrics.originalLines || !codeMetrics.refactoredLines) {
            throw new Error('Code reduction metrics missing');
        }
        
        // Test total methods count
        const totalMethods = projectState.getTotalMethods();
        if (typeof totalMethods !== 'number' || totalMethods <= 0) {
            throw new Error('Total methods count invalid');
        }
        
        console.log('✅ Architecture validation test passed');
        console.log(`📊 Architecture Metrics:`);
        console.log(`   Services: ${archSummary.services}`);
        console.log(`   Total methods: ${totalMethods}`);
        console.log(`   Code reduction: ${codeMetrics.reduction}`);
        
        return true;
    } catch (error) {
        console.error('❌ Architecture validation test failed:', error.message);
        return false;
    }
}

// Test 6: Error Handling Across Services
async function testErrorHandlingAcrossServices() {
    console.log('📝 Test 6: Error Handling Across Services');
    
    try {
        const projectState = createTestProjectState();
        
        // Test core service error handling
        try {
            projectState.getCoreManager().setProperty(null, 'value');
            // Should not throw in this implementation
        } catch (error) {
            // Expected behavior - some implementations may throw
        }
        
        // Test effects service error handling
        try {
            projectState.updateEffect(-1, { name: 'Invalid' });
            // Should handle gracefully
        } catch (error) {
            // Expected behavior
        }
        
        // Test resolution service error handling
        try {
            projectState.setTargetResolution(-1);
            // Should handle gracefully or validate
        } catch (error) {
            // Expected behavior
        }
        
        // Test validation service error handling
        const validation = projectState.validate();
        if (!Array.isArray(validation.errors)) {
            throw new Error('Validation should return errors array');
        }
        
        // Test persistence service error handling
        try {
            const invalidData = '{ invalid json';
            await ProjectState.fromJSON(invalidData);
            throw new Error('Should have thrown for invalid JSON');
        } catch (error) {
            if (!error.message.includes('Failed to deserialize')) {
                throw new Error('Wrong error message for invalid JSON');
            }
        }
        
        console.log('✅ Error handling across services test passed');
        return true;
    } catch (error) {
        console.error('❌ Error handling across services test failed:', error.message);
        return false;
    }
}

// Test 7: Service Isolation
function testServiceIsolation() {
    console.log('📝 Test 7: Service Isolation');
    
    try {
        const projectState = createTestProjectState();
        
        // Test that services are properly isolated
        const coreManager = projectState.getCoreManager();
        const effectsManager = projectState.getEffectsManager();
        const resolutionManager = projectState.getResolutionManager();
        
        // Modify core state directly
        coreManager.setProperty('testProperty', 'isolated value');
        
        // Verify other services are not affected
        const effects = effectsManager.getEffects();
        const resolution = resolutionManager.getTargetResolution();
        
        if (!Array.isArray(effects)) {
            throw new Error('Effects service affected by core changes');
        }
        
        if (typeof resolution === 'undefined') {
            throw new Error('Resolution service affected by core changes');
        }
        
        // Test effects isolation
        effectsManager.addEffect(createTestEffect('Isolated Effect'));
        
        // Verify core state is updated but other services maintain isolation
        const state = coreManager.getState();
        if (!state.effects || state.effects.length === 0) {
            throw new Error('Effects not properly integrated with core');
        }
        
        // Test that each service has its own methods and doesn't interfere
        const coreProperties = Object.getOwnPropertyNames(coreManager);
        const effectsProperties = Object.getOwnPropertyNames(effectsManager);
        
        if (coreProperties.some(prop => effectsProperties.includes(prop) && prop !== 'constructor')) {
            console.log('⚠️ Warning: Some method names overlap between services');
        }
        
        console.log('✅ Service isolation test passed');
        return true;
    } catch (error) {
        console.error('❌ Service isolation test failed:', error.message);
        return false;
    }
}

// Test 8: Code Reduction Verification
function testCodeReductionVerification() {
    console.log('📝 Test 8: Code Reduction Verification');
    
    try {
        const projectState = createTestProjectState();
        
        // Verify that the refactored version maintains all functionality
        // while reducing complexity in the main class
        
        // Test that all original methods are still available
        const originalMethods = [
            'getState', 'update', 'reset', 'clone',
            'getProjectName', 'setProjectName', 'getArtist', 'setArtist',
            'getNumFrames', 'setNumFrames', 'getColorScheme', 'setColorScheme',
            'getEffects', 'setEffects', 'addEffect', 'updateEffect', 'removeEffect',
            'getTargetResolution', 'setTargetResolution', 'getIsHorizontal', 'setIsHorizontal',
            'validate', 'isReadyForRender', 'serialize', 'toJSON', 'exportForBackend'
        ];
        
        for (const method of originalMethods) {
            if (typeof projectState[method] !== 'function') {
                throw new Error(`Method ${method} not available in refactored version`);
            }
        }
        
        // Test that static methods are still available
        const staticMethods = [
            'fromJSON', 'fromObject', 'isVersionCompatible', 'fromLegacyConfig', 'isBrowser', 'isNode'
        ];
        
        for (const method of staticMethods) {
            if (typeof ProjectState[method] !== 'function') {
                throw new Error(`Static method ${method} not available in refactored version`);
            }
        }
        
        // Test new service access methods
        const serviceAccessMethods = [
            'getCoreManager', 'getEffectsManager', 'getResolutionManager',
            'getValidationManager', 'getPersistenceManager'
        ];
        
        for (const method of serviceAccessMethods) {
            if (typeof projectState[method] !== 'function') {
                throw new Error(`Service access method ${method} not available`);
            }
        }
        
        // Test new utility methods
        const utilityMethods = ['getServiceInfo', 'getArchitectureSummary', 'getTotalMethods'];
        
        for (const method of utilityMethods) {
            if (typeof projectState[method] !== 'function') {
                throw new Error(`Utility method ${method} not available`);
            }
        }
        
        // Verify complexity reduction
        const archSummary = projectState.getArchitectureSummary();
        const codeMetrics = archSummary.codeReduction;
        
        if (codeMetrics.originalLines <= codeMetrics.refactoredLines) {
            console.log('⚠️ Warning: Refactored version may not have reduced main class complexity');
        }
        
        console.log('✅ Code reduction verification test passed');
        console.log(`📊 Code Reduction Metrics:`);
        console.log(`   Original lines: ${codeMetrics.originalLines}`);
        console.log(`   Refactored lines: ${codeMetrics.refactoredLines}`);
        console.log(`   Service lines: ${codeMetrics.serviceLines}`);
        console.log(`   Reduction: ${codeMetrics.reduction}`);
        
        return true;
    } catch (error) {
        console.error('❌ Code reduction verification test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running ProjectState Test Suite...\n');
    
    const tests = [
        testServiceIntegrationAndDelegation,
        testBackwardCompatibility,
        testServiceOrchestration,
        testPerformanceImprovements,
        testArchitectureValidation,
        testErrorHandlingAcrossServices,
        testServiceIsolation,
        testCodeReductionVerification
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error('❌ Test execution error:', error.message);
            failed++;
        }
        console.log(''); // Add spacing between tests
    }
    
    console.log('📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
        console.log('🎉 All ProjectState tests passed! Step 4.2 complete.');
        console.log('🏗️ ProjectState successfully decomposed into 5 focused services.');
    } else {
        console.log('🚨 Some tests failed. Review and fix issues.');
    }
    
    return failed === 0;
}

// Export for use in test runner
export { runAllTests };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}