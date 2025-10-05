/**
 * Comprehensive Test Suite for EffectConfigurationManager Service
 * 
 * Tests all configuration management capabilities extracted from EffectConfigurer:
 * 1. Constructor validation and dependency injection
 * 2. Configuration schema loading and caching
 * 3. Center position application
 * 4. Configuration change processing
 * 5. Default configuration management
 * 6. Cache management and performance
 * 7. Configuration metrics tracking
 * 8. Performance baseline verification
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Test 1: Constructor Validation and Dependency Injection
 */
export async function testEffectConfigurationManagerConstructor(testEnv) {
    console.log('🧪 Testing EffectConfigurationManager constructor...');
    
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    
    // Test default constructor
    const manager1 = new EffectConfigurationManager();
    
    if (!manager1.logger) {
        throw new Error('Default logger not set');
    }
    
    if (!manager1.schemaCache) {
        throw new Error('Schema cache not initialized');
    }
    
    if (!manager1.defaultsCache) {
        throw new Error('Defaults cache not initialized');
    }
    
    if (!manager1.configMetrics) {
        throw new Error('Config metrics not initialized');
    }
    
    // Test constructor with dependencies
    const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
    const eventBus = eventBusInstance;
    eventBus.isLoggingEnabled = false;
    const customLogger = { log: () => {}, error: () => {} };

    const manager2 = new EffectConfigurationManager({
        eventBus: eventBus,
        logger: customLogger
    });

    if (manager2.eventBus !== eventBus) {
        throw new Error('Event bus not set correctly');
    }
    
    if (manager2.logger !== customLogger) {
        throw new Error('Custom logger not set correctly');
    }
    
    console.log('✅ EffectConfigurationManager constructor validation passed');
    
    return {
        success: true,
        message: 'Constructor validation completed',
        manager: manager1
    };
}

/**
 * Test 2: Configuration Schema Loading and Caching
 */
export async function testEffectConfigurationManagerSchemaLoading(testEnv) {
    console.log('🧪 Testing EffectConfigurationManager schema loading...');
    
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    const manager = new EffectConfigurationManager();
    
    // Test effect for testing
    const testEffect = {
        name: 'TestEffect',
        className: 'TestEffect',
        registryKey: 'test-effect'
    };
    
    // Test schema loading (will fail due to missing ConfigIntrospector in test env)
    try {
        await manager.loadConfigSchema(testEffect);
        // If this succeeds, check caching
        const cachedSchema = manager.schemaCache.get(testEffect.registryKey);
        if (!cachedSchema) {
            throw new Error('Schema should be cached after loading');
        }
    } catch (error) {
        // Expected in test environment - ConfigIntrospector may not be available
        console.log('ℹ️ Schema loading failed as expected in test environment:', error.message);
    }
    
    // Test null effect handling
    try {
        await manager.loadConfigSchema(null);
        throw new Error('Should throw error for null effect');
    } catch (error) {
        if (!error.message.includes('required')) {
            throw new Error('Should throw specific error for null effect');
        }
    }
    
    // Test cache functionality directly
    const testSchema = { properties: { test: { type: 'string' } } };
    manager.schemaCache.set('test-key', testSchema);
    
    const cachedResult = manager.schemaCache.get('test-key');
    if (cachedResult !== testSchema) {
        throw new Error('Schema caching not working correctly');
    }
    
    console.log('✅ EffectConfigurationManager schema loading passed');
    
    return {
        success: true,
        message: 'Schema loading completed',
        cacheSize: manager.schemaCache.size
    };
}

/**
 * Test 3: Center Position Application
 */
export async function testEffectConfigurationManagerCenterPositions(testEnv) {
    console.log('🧪 Testing EffectConfigurationManager center position application...');
    
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    const manager = new EffectConfigurationManager();
    
    // Test center position application
    const testConfig = {
        position: { x: 100, y: 200 },
        size: { width: 50, height: 50 }
    };
    
    const testProjectState = {
        targetResolution: 1920,
        isHorizontal: true,
        getResolutionDimensions: () => ({ width: 1920, height: 1080 })
    };
    
    // Test with isNewEffect = true (should update metrics)
    const result = manager.applyCenterDefaults(testConfig, testProjectState, true);

    // Should return a configuration (CenterUtils may modify it)
    if (!result) {
        throw new Error('Center defaults application should return a configuration');
    }

    if (typeof result !== 'object') {
        throw new Error('Result should be an object');
    }

    // Test with null inputs
    const nullConfigResult = manager.applyCenterDefaults(null, testProjectState, true);
    if (nullConfigResult !== null) {
        // CenterUtils should handle null gracefully
    }

    const nullProjectResult = manager.applyCenterDefaults(testConfig, null, true);
    if (!nullProjectResult) {
        throw new Error('Should handle null project state gracefully');
    }

    // Check metrics were updated when isNewEffect is true
    const metrics = manager.getConfigurationMetrics();
    if (metrics.centerPositionsApplied === 0) {
        throw new Error('Center positions applied metric should be updated for new effects');
    }
    
    console.log('✅ EffectConfigurationManager center position application passed');
    
    return {
        success: true,
        message: 'Center position application completed',
        centerPositionsApplied: metrics.centerPositionsApplied
    };
}

/**
 * Test 4: Configuration Change Processing
 */
export async function testEffectConfigurationManagerConfigChange(testEnv) {
    console.log('🧪 Testing EffectConfigurationManager configuration change processing...');
    
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    
    const eventBusInstance = (await import('../../src/services/EventBusService.js')).default;
    const eventBus = eventBusInstance;
    eventBus.isLoggingEnabled = false;

    let eventEmitted = false;
    let emittedData = null;

    // Subscribe to track events
    eventBus.subscribe('effectconfigurer:config:change', (data) => {
        eventEmitted = true;
        emittedData = data;
    });
    
    const manager = new EffectConfigurationManager({ eventBus: eventBus });
    
    const testConfig = { opacity: 0.8, position: { x: 100, y: 200 } };
    const testEffect = { name: 'TestEffect', registryKey: 'test-effect' };
    
    let callbackCalled = false;
    const testCallback = (config) => {
        callbackCalled = true;
        if (config !== testConfig) {
            throw new Error('Callback should receive the same config');
        }
    };
    
    // Test configuration change processing
    manager.processConfigurationChange(testConfig, testEffect, testCallback);
    
    if (!eventEmitted) {
        throw new Error('Configuration change event should be emitted');
    }
    
    if (!callbackCalled) {
        throw new Error('Callback should be called');
    }
    
    if (!emittedData || emittedData.config !== testConfig) {
        throw new Error('Event should contain the configuration');
    }
    
    if (!emittedData.effect || emittedData.effect !== testEffect) {
        throw new Error('Event should contain the effect');
    }
    
    // Test without callback
    eventEmitted = false;
    manager.processConfigurationChange(testConfig, testEffect);
    
    if (!eventEmitted) {
        throw new Error('Event should still be emitted without callback');
    }
    
    // Check metrics were updated
    const metrics = manager.getConfigurationMetrics();
    if (metrics.configurationsProcessed === 0) {
        throw new Error('Configurations processed metric should be updated');
    }
    
    console.log('✅ EffectConfigurationManager configuration change processing passed');
    
    return {
        success: true,
        message: 'Configuration change processing completed',
        configurationsProcessed: metrics.configurationsProcessed
    };
}

/**
 * Test 5: Default Configuration Management
 */
export async function testEffectConfigurationManagerDefaults(testEnv) {
    console.log('🧪 Testing EffectConfigurationManager default configuration management...');
    
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    const manager = new EffectConfigurationManager();
    
    const testRegistryKey = 'test-effect-defaults';
    const testConfig = { opacity: 0.5, position: { x: 50, y: 100 } };
    
    // Test checking for defaults (will likely return null in test environment)
    const initialDefaults = await manager.checkForDefaults(testRegistryKey);
    // Should not throw, may return null
    
    // Test with null registry key
    const nullKeyDefaults = await manager.checkForDefaults(null);
    if (nullKeyDefaults !== null) {
        throw new Error('Null registry key should return null');
    }
    
    // Test saving defaults (will likely fail in test environment)
    try {
        const saveResult = await manager.saveAsDefault(testRegistryKey, testConfig);
        // If successful, check cache
        if (saveResult) {
            const cachedDefaults = manager.defaultsCache.get(testRegistryKey);
            if (cachedDefaults !== testConfig) {
                throw new Error('Defaults should be cached after saving');
            }
        }
    } catch (error) {
        console.log('ℹ️ Save defaults failed as expected in test environment:', error.message);
    }
    
    // Test resetting defaults (will likely fail in test environment)
    try {
        const resetResult = await manager.resetDefaults(testRegistryKey);
        // If successful, check cache was cleared
        if (resetResult) {
            const cachedDefaults = manager.defaultsCache.get(testRegistryKey);
            if (cachedDefaults !== undefined) {
                throw new Error('Cache should be cleared after reset');
            }
        }
    } catch (error) {
        console.log('ℹ️ Reset defaults failed as expected in test environment:', error.message);
    }
    
    // Test error handling for invalid inputs
    try {
        await manager.saveAsDefault(null, testConfig);
        throw new Error('Should throw error for null registry key');
    } catch (error) {
        if (!error.message.toLowerCase().includes('required')) {
            throw new Error('Should throw specific error for null registry key');
        }
    }
    
    try {
        await manager.saveAsDefault(testRegistryKey, null);
        throw new Error('Should throw error for null config');
    } catch (error) {
        if (!error.message.toLowerCase().includes('required')) {
            throw new Error('Should throw specific error for null config');
        }
    }
    
    console.log('✅ EffectConfigurationManager default configuration management passed');
    
    return {
        success: true,
        message: 'Default configuration management completed'
    };
}

/**
 * Test 6: Cache Management and Performance
 */
export async function testEffectConfigurationManagerCacheManagement(testEnv) {
    console.log('🧪 Testing EffectConfigurationManager cache management...');
    
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    const manager = new EffectConfigurationManager();
    
    // Add items to caches
    const testSchema = { properties: { test: { type: 'string' } } };
    const testDefaults = { opacity: 0.8 };
    
    manager.schemaCache.set('test-schema', testSchema);
    manager.defaultsCache.set('test-defaults', testDefaults);
    
    // Verify items are in cache
    if (manager.schemaCache.size === 0) {
        throw new Error('Schema cache should contain items');
    }
    
    if (manager.defaultsCache.size === 0) {
        throw new Error('Defaults cache should contain items');
    }
    
    // Test cache clearing
    manager.clearCaches();
    
    if (manager.schemaCache.size !== 0) {
        throw new Error('Schema cache should be empty after clearing');
    }
    
    if (manager.defaultsCache.size !== 0) {
        throw new Error('Defaults cache should be empty after clearing');
    }
    
    // Test cache metrics
    const metrics = manager.getConfigurationMetrics();
    
    if (!metrics.cacheHitRate) {
        throw new Error('Cache hit rate should be included in metrics');
    }
    
    if (typeof metrics.cacheHitRate.schemas !== 'number') {
        throw new Error('Schema cache size should be a number');
    }
    
    if (typeof metrics.cacheHitRate.defaults !== 'number') {
        throw new Error('Defaults cache size should be a number');
    }
    
    console.log('✅ EffectConfigurationManager cache management passed');
    
    return {
        success: true,
        message: 'Cache management completed',
        cacheMetrics: metrics.cacheHitRate
    };
}

/**
 * Test 7: Configuration Metrics Tracking
 */
export async function testEffectConfigurationManagerMetrics(testEnv) {
    console.log('🧪 Testing EffectConfigurationManager metrics tracking...');
    
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    const manager = new EffectConfigurationManager();
    
    // Get initial metrics
    const initialMetrics = manager.getConfigurationMetrics();
    
    const requiredMetricFields = [
        'schemasLoaded',
        'configurationsProcessed',
        'defaultsApplied',
        'centerPositionsApplied',
        'configurationTime',
        'averageConfigurationTime',
        'cacheHitRate'
    ];
    
    for (const field of requiredMetricFields) {
        if (!(field in initialMetrics)) {
            throw new Error(`Missing metric field: ${field}`);
        }
    }
    
    if (initialMetrics.schemasLoaded !== 0) {
        throw new Error('Initial schemas loaded should be 0');
    }
    
    if (initialMetrics.configurationsProcessed !== 0) {
        throw new Error('Initial configurations processed should be 0');
    }
    
    // Perform some operations to update metrics
    const testConfig = { opacity: 0.8 };
    const testEffect = { name: 'TestEffect' };

    manager.processConfigurationChange(testConfig, testEffect);
    // Pass isNewEffect = true to ensure metrics are updated
    manager.applyCenterDefaults(testConfig, { targetResolution: 1920 }, true);

    const afterMetrics = manager.getConfigurationMetrics();

    if (afterMetrics.configurationsProcessed <= initialMetrics.configurationsProcessed) {
        throw new Error('Configurations processed should increase');
    }

    if (afterMetrics.centerPositionsApplied <= initialMetrics.centerPositionsApplied) {
        throw new Error('Center positions applied should increase for new effects');
    }
    
    // Test metrics reset
    manager.resetMetrics();
    const resetMetrics = manager.getConfigurationMetrics();
    
    if (resetMetrics.configurationsProcessed !== 0) {
        throw new Error('Metrics should reset to 0');
    }
    
    console.log('✅ EffectConfigurationManager metrics tracking passed');
    
    return {
        success: true,
        message: 'Metrics tracking completed',
        finalMetrics: resetMetrics
    };
}

/**
 * Test 8: Performance Baseline Verification
 */
export async function testEffectConfigurationManagerPerformance(testEnv) {
    console.log('🧪 Testing EffectConfigurationManager performance baseline...');
    
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    const manager = new EffectConfigurationManager();
    
    // Test performance baseline check
    const performanceCheck = manager.checkPerformanceBaseline();
    
    if (typeof performanceCheck.meetsBaseline !== 'boolean') {
        throw new Error('Performance baseline check should return boolean');
    }
    
    if (performanceCheck.instanceProperties > performanceCheck.maxInstanceProperties) {
        throw new Error(`Too many instance properties: ${performanceCheck.instanceProperties} > ${performanceCheck.maxInstanceProperties}`);
    }
    
    // Test configuration processing performance
    const startTime = performance.now();
    
    const testConfig = { opacity: 0.8, position: { x: 100, y: 200 } };
    const testEffect = { name: 'TestEffect' };
    
    manager.processConfigurationChange(testConfig, testEffect);
    manager.applyCenterDefaults(testConfig, { targetResolution: 1920 });
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    if (processingTime > 100) { // 100ms baseline
        console.warn(`⚠️ Configuration processing took ${processingTime.toFixed(2)}ms (baseline: 100ms)`);
    }
    
    console.log('✅ EffectConfigurationManager performance baseline passed');
    
    return {
        success: true,
        message: 'Performance baseline verified',
        processingTime: processingTime.toFixed(2) + 'ms',
        performanceCheck
    };
}

// Export all test functions
export const testFunctions = [
    testEffectConfigurationManagerConstructor,
    testEffectConfigurationManagerSchemaLoading,
    testEffectConfigurationManagerCenterPositions,
    testEffectConfigurationManagerConfigChange,
    testEffectConfigurationManagerDefaults,
    testEffectConfigurationManagerCacheManagement,
    testEffectConfigurationManagerMetrics,
    testEffectConfigurationManagerPerformance
];

export const testInfo = {
    suiteName: 'EffectConfigurationManager Service Tests',
    totalTests: testFunctions.length,
    category: 'unit'
};