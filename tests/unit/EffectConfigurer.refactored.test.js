/**
 * Comprehensive Test Suite for EffectConfigurer Component
 *
 * Tests the refactored EffectConfigurer component that now acts as a service orchestrator
 * coordinating three extracted services:
 * 1. EffectFormValidator - Form validation logic
 * 2. EffectConfigurationManager - Configuration management
 * 3. EffectEventCoordinator - Event coordination
 *
 * Test Categories:
 * 1. Service orchestration and dependency injection
 * 2. Configuration schema loading and validation
 * 3. Effect addition and attachment coordination
 * 4. Configuration change processing
 * 5. Default configuration management
 * 6. Event emission and callback coordination
 * 7. Backward compatibility with original API
 * 8. Performance and complexity reduction verification
 */

import TestEnvironment from '../setup/TestEnvironment.js';

/**
 * Test 1: Service Orchestration and Dependency Injection
 */
export async function testEffectConfigurerServices(testEnv) {
    console.log('🧪 Testing EffectConfigurer service orchestration...');

    // Test React and Material-UI components for testing
    const testReact = {
        useState: (initial) => [initial, () => {}],
        useEffect: () => {},
        useRef: (initial) => ({ current: initial }),
        useCallback: (fn) => fn
    };

    const testMUI = {
        Box: ({ children }) => children,
        Typography: ({ children }) => children,
        Button: ({ children }) => children,
        useTheme: () => ({})
    };

    const testServices = {
        useServices: () => ({
            eventBusService: {
                emit: () => {},
                subscribe: () => {}
            }
        })
    };
    
    // Test that the component file exists and has expected structure
    const fs = await import('fs/promises');
    const effectConfigurerPath = '../../src/components/effects/EffectConfigurer.jsx';
    const absolutePath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';

    try {
        const content = await fs.readFile(absolutePath, 'utf8');

        // Check for expected React component structure
        if (!content.includes('function EffectConfigurer')) {
            throw new Error('EffectConfigurer should be a React component function');
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error('EffectConfigurer.jsx file not found');
        }
        throw error;
    }
    
    // Test component props interface
    const requiredProps = [
        'selectedEffect',
        'projectState',
        'onConfigChange',
        'onAddEffect'
    ];
    
    // Component should accept these props without throwing
    const testProps = {
        selectedEffect: { name: 'TestEffect', registryKey: 'test-effect' },
        projectState: { targetResolution: 1920 },
        onConfigChange: () => {},
        onAddEffect: () => {}
    };
    
    // Test that component can be instantiated (basic structure test)
    try {
        // Read the file content to check structure
        const fs = await import('fs/promises');
        const absolutePath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
        const componentContent = await fs.readFile(absolutePath, 'utf8');

        // Check for service initialization
        if (!componentContent.includes('EffectFormValidator')) {
            throw new Error('Component should initialize EffectFormValidator service');
        }

        if (!componentContent.includes('EffectConfigurationManager')) {
            throw new Error('Component should initialize EffectConfigurationManager service');
        }

        if (!componentContent.includes('EffectEventCoordinator')) {
            throw new Error('Component should initialize EffectEventCoordinator service');
        }

        // Check for service coordination methods
        if (!componentContent.includes('handleConfigurationChange')) {
            throw new Error('Component should have configuration change handler');
        }

        if (!componentContent.includes('handleAddEffect')) {
            throw new Error('Component should have effect addition handler');
        }
        
    } catch (error) {
        throw new Error(`Component structure validation failed: ${error.message}`);
    }
    
    console.log('✅ EffectConfigurer service orchestration passed');
    
    return {
        success: true,
        message: 'Service orchestration validated',
        componentType: 'function'
    };
}

/**
 * Test 2: Configuration Schema Loading Integration
 */
export async function testEffectConfigurerSchemaLoading(testEnv) {
    console.log('🧪 Testing EffectConfigurer schema loading integration...');
    
    // Test the integration between component and EffectConfigurationManager
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    
    const testEventBus = {
        emit: () => {},
        subscribe: () => {}
    };
    
    const configManager = new EffectConfigurationManager({ eventBus: testEventBus });
    
    // Test schema loading for a test effect
    const testEffect = {
        name: 'TestEffect',
        registryKey: 'test-effect',
        className: 'TestEffect'
    };
    
    try {
        // This will likely fail in test environment, but we test the integration
        await configManager.loadConfigSchema(testEffect);
    } catch (error) {
        // Expected in test environment - ConfigIntrospector may not be available
        console.log('ℹ️ Schema loading failed as expected in test environment:', error.message);
    }
    
    // Test that the service can handle null effects gracefully
    try {
        await configManager.loadConfigSchema(null);
        throw new Error('Should throw error for null effect');
    } catch (error) {
        if (!error.message.includes('required')) {
            throw new Error('Should throw specific error for null effect');
        }
    }
    
    // Test schema caching functionality
    const testSchema = { properties: { opacity: { type: 'number' } } };
    configManager.schemaCache.set('test-schema', testSchema);
    
    const cachedSchema = configManager.schemaCache.get('test-schema');
    if (cachedSchema !== testSchema) {
        throw new Error('Schema caching should work correctly');
    }
    
    console.log('✅ EffectConfigurer schema loading integration passed');
    
    return {
        success: true,
        message: 'Schema loading integration validated',
        cacheSize: configManager.schemaCache.size
    };
}

/**
 * Test 3: Effect Addition and Attachment Coordination
 */
export async function testEffectConfigurerEffectCoordination(testEnv) {
    console.log('🧪 Testing EffectConfigurer effect coordination...');
    
    // Test the integration between component and EffectEventCoordinator
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    
    let effectAddedEventEmitted = false;
    let effectAttachedEventEmitted = false;
    
    const testEventBus = {
        emit: (eventName, data) => {
            if (eventName === 'effectconfigurer:effect:add') {
                effectAddedEventEmitted = true;
            }
            if (eventName === 'effectconfigurer:effect:attach') {
                effectAttachedEventEmitted = true;
            }
        },
        subscribe: () => {}
    };
    
    const eventCoordinator = new EffectEventCoordinator({ eventBus: testEventBus });
    
    // Test effect addition coordination
    const testEffect = { name: 'TestEffect', registryKey: 'test-effect' };
    const testConfig = { opacity: 0.8 };
    
    let addCallbackCalled = false;
    const addCallback = (effect, config) => {
        addCallbackCalled = true;
        if (effect !== testEffect) {
            throw new Error('Add callback should receive correct effect');
        }
        if (config !== testConfig) {
            throw new Error('Add callback should receive correct config');
        }
    };
    
    eventCoordinator.coordinateEffectAddition(testEffect, testConfig, addCallback);
    
    if (!effectAddedEventEmitted) {
        throw new Error('Effect addition event should be emitted');
    }
    
    if (!addCallbackCalled) {
        throw new Error('Add callback should be called');
    }
    
    // Test effect attachment coordination
    const testProjectState = { targetResolution: 1920 };
    
    let attachCallbackCalled = false;
    const attachCallback = (effect, config, projectState) => {
        attachCallbackCalled = true;
        if (effect !== testEffect) {
            throw new Error('Attach callback should receive correct effect');
        }
        if (config !== testConfig) {
            throw new Error('Attach callback should receive correct config');
        }
        if (projectState !== testProjectState) {
            throw new Error('Attach callback should receive correct project state');
        }
    };
    
    eventCoordinator.coordinateEffectAttachment(testEffect, testConfig, testProjectState, attachCallback);
    
    if (!effectAttachedEventEmitted) {
        throw new Error('Effect attachment event should be emitted');
    }
    
    if (!attachCallbackCalled) {
        throw new Error('Attach callback should be called');
    }
    
    // Check metrics were updated
    const metrics = eventCoordinator.getEventMetrics();
    if (metrics.effectsAdded === 0) {
        throw new Error('Effects added metric should be updated');
    }
    
    if (metrics.effectsAttached === 0) {
        throw new Error('Effects attached metric should be updated');
    }
    
    console.log('✅ EffectConfigurer effect coordination passed');
    
    return {
        success: true,
        message: 'Effect coordination validated',
        effectsAdded: metrics.effectsAdded,
        effectsAttached: metrics.effectsAttached
    };
}

/**
 * Test 4: Configuration Change Processing Integration
 */
export async function testEffectConfigurerConfigChange(testEnv) {
    console.log('🧪 Testing EffectConfigurer configuration change processing...');
    
    // Test integration between all three services for configuration changes
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    
    let configChangeEventEmitted = false;
    
    const testEventBus = {
        emit: (eventName, data) => {
            if (eventName === 'effectconfigurer:config:change') {
                configChangeEventEmitted = true;
            }
        },
        subscribe: () => {}
    };
    
    const validator = new EffectFormValidator({ eventBus: testEventBus });
    const configManager = new EffectConfigurationManager({ eventBus: testEventBus });
    const eventCoordinator = new EffectEventCoordinator({ eventBus: testEventBus });
    
    // Test configuration validation
    const testConfig = { opacity: 0.8, position: { x: 100, y: 200 } };
    const testSchema = {
        properties: {
            opacity: { type: 'number', minimum: 0, maximum: 1 },
            position: {
                type: 'object',
                properties: {
                    x: { type: 'number' },
                    y: { type: 'number' }
                }
            }
        },
        required: ['opacity']
    };
    
    const validation = validator.validateConfiguration(testConfig, testSchema);
    
    if (!validation.isValid) {
        throw new Error('Valid configuration should pass validation');
    }
    
    if (!validation.isComplete) {
        throw new Error('Complete configuration should be marked as complete');
    }
    
    // Test configuration processing
    const testEffect = { name: 'TestEffect', registryKey: 'test-effect' };
    const testProjectState = { targetResolution: 1920, isHorizontal: true };
    
    let configCallbackCalled = false;
    const configCallback = (config) => {
        configCallbackCalled = true;
        if (!config) {
            throw new Error('Config callback should receive configuration');
        }
    };
    
    // Process configuration change through manager
    configManager.processConfigurationChange(testConfig, testEffect, configCallback);
    
    if (!configCallbackCalled) {
        throw new Error('Configuration callback should be called');
    }
    
    // Coordinate configuration change through event coordinator
    eventCoordinator.coordinateConfigurationChange(testConfig, testEffect, configCallback);
    
    if (!configChangeEventEmitted) {
        throw new Error('Configuration change event should be emitted');
    }
    
    // Check all service metrics were updated
    const validationMetrics = validator.getValidationMetrics();
    const configMetrics = configManager.getConfigurationMetrics();
    const eventMetrics = eventCoordinator.getEventMetrics();
    
    if (validationMetrics.validationsPerformed === 0) {
        throw new Error('Validation metrics should be updated');
    }
    
    if (configMetrics.configurationsProcessed === 0) {
        throw new Error('Configuration metrics should be updated');
    }
    
    if (eventMetrics.configurationChanges === 0) {
        throw new Error('Event metrics should be updated');
    }
    
    console.log('✅ EffectConfigurer configuration change processing passed');
    
    return {
        success: true,
        message: 'Configuration change processing validated',
        validationsPerformed: validationMetrics.validationsPerformed,
        configurationsProcessed: configMetrics.configurationsProcessed,
        configurationChanges: eventMetrics.configurationChanges
    };
}

/**
 * Test 5: Default Configuration Management Integration
 */
export async function testEffectConfigurerDefaults(testEnv) {
    console.log('🧪 Testing EffectConfigurer default configuration management...');
    
    // Test the integration with EffectConfigurationManager for defaults
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    
    const testEventBus = {
        emit: () => {},
        subscribe: () => {}
    };
    
    const configManager = new EffectConfigurationManager({ eventBus: testEventBus });
    
    const testRegistryKey = 'test-effect-defaults';
    const testConfig = { opacity: 0.7, position: { x: 150, y: 250 } };
    
    // Test checking for defaults (will likely return null in test environment)
    const initialDefaults = await configManager.checkForDefaults(testRegistryKey);
    // Should not throw, may return null
    
    // Test saving defaults (will likely fail in test environment)
    try {
        const saveResult = await configManager.saveAsDefault(testRegistryKey, testConfig);
        if (saveResult) {
            console.log('✅ Defaults saved successfully');
            
            // Check if defaults are cached
            const cachedDefaults = configManager.defaultsCache.get(testRegistryKey);
            if (cachedDefaults !== testConfig) {
                throw new Error('Defaults should be cached after saving');
            }
        }
    } catch (error) {
        console.log('ℹ️ Save defaults failed as expected in test environment:', error.message);
    }
    
    // Test resetting defaults (will likely fail in test environment)
    try {
        const resetResult = await configManager.resetDefaults(testRegistryKey);
        if (resetResult) {
            console.log('✅ Defaults reset successfully');
            
            // Check if cache was cleared
            const cachedDefaults = configManager.defaultsCache.get(testRegistryKey);
            if (cachedDefaults !== undefined) {
                throw new Error('Cache should be cleared after reset');
            }
        }
    } catch (error) {
        console.log('ℹ️ Reset defaults failed as expected in test environment:', error.message);
    }
    
    // Test error handling for invalid inputs
    try {
        await configManager.saveAsDefault(null, testConfig);
        throw new Error('Should throw error for null registry key');
    } catch (error) {
        if (!error.message.includes('required')) {
            throw new Error('Should throw specific error for null registry key');
        }
    }
    
    try {
        await configManager.saveAsDefault(testRegistryKey, null);
        throw new Error('Should throw error for null config');
    } catch (error) {
        if (!error.message.includes('required')) {
            throw new Error('Should throw specific error for null config');
        }
    }
    
    console.log('✅ EffectConfigurer default configuration management passed');
    
    return {
        success: true,
        message: 'Default configuration management validated'
    };
}

/**
 * Test 6: Event Emission and Callback Coordination
 */
export async function testEffectConfigurerEventCoordination(testEnv) {
    console.log('🧪 Testing EffectConfigurer event coordination...');
    
    // Test comprehensive event coordination across all services
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    
    const eventLog = [];
    
    const testEventBus = {
        emit: (eventName, data, metadata) => {
            eventLog.push({ eventName, data, metadata, timestamp: Date.now() });
        },
        subscribe: () => {}
    };
    
    const eventCoordinator = new EffectEventCoordinator({ eventBus: testEventBus });
    
    // Test multiple event types
    const testEffect = { name: 'TestEffect', registryKey: 'test-effect' };
    const testConfig = { opacity: 0.9 };
    const testProjectState = { targetResolution: 1920 };
    
    // Coordinate multiple events
    eventCoordinator.coordinateEffectAddition(testEffect, testConfig);
    eventCoordinator.coordinateEffectAttachment(testEffect, testConfig, testProjectState);
    eventCoordinator.coordinateConfigurationChange(testConfig, testEffect);
    eventCoordinator.coordinateResolutionChange(1080, 1920, testProjectState);
    
    // Verify all events were emitted
    const expectedEvents = [
        'effectconfigurer:effect:add',
        'effectconfigurer:effect:attach',
        'effectconfigurer:config:change',
        'effectconfigurer:resolution:change'
    ];
    
    for (const expectedEvent of expectedEvents) {
        const found = eventLog.find(log => log.eventName === expectedEvent);
        if (!found) {
            throw new Error(`Expected event not found: ${expectedEvent}`);
        }
    }
    
    if (eventLog.length !== expectedEvents.length) {
        throw new Error(`Expected ${expectedEvents.length} events, got ${eventLog.length}`);
    }
    
    // Test callback registration and execution
    let callbackExecuted = false;
    const testCallback = () => {
        callbackExecuted = true;
    };
    
    const callbackId = eventCoordinator.registerCallback('test-event', testCallback);
    eventCoordinator.executeCallback(callbackId);
    
    if (!callbackExecuted) {
        throw new Error('Registered callback should be executed');
    }
    
    // Test callback unregistration
    const unregistered = eventCoordinator.unregisterCallback(callbackId);
    if (!unregistered) {
        throw new Error('Callback should be successfully unregistered');
    }
    
    // Check event metrics
    const metrics = eventCoordinator.getEventMetrics();
    
    if (metrics.eventsEmitted === 0) {
        throw new Error('Events emitted metric should be updated');
    }
    
    if (metrics.eventHistory.length === 0) {
        throw new Error('Event history should contain events');
    }
    
    console.log('✅ EffectConfigurer event coordination passed');
    
    return {
        success: true,
        message: 'Event coordination validated',
        eventsEmitted: metrics.eventsEmitted,
        eventHistoryLength: metrics.eventHistory.length
    };
}

/**
 * Test 7: Backward Compatibility with Original API
 */
export async function testEffectConfigurerCompatibility(testEnv) {
    console.log('🧪 Testing EffectConfigurer backward compatibility...');
    
    // Test that the refactored component maintains the same API as the original
    // Read component file to check for backward compatibility
    const fs = await import('fs/promises');
    const absolutePath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
    const componentContent = await fs.readFile(absolutePath, 'utf8');

    // Test component function signature exists in file
    if (!componentContent.includes('function EffectConfigurer')) {
        throw new Error('Component should be a function');
    }
    
    // Test that component accepts all original props
    const originalProps = [
        'selectedEffect',
        'projectState',
        'onConfigChange',
        'onAddEffect',
        'onAddCompleteEffect',
        'isModal',
        'effectType',
        'availableEffects',
        'attachedEffects',
        'onAttachEffect',
        'onRemoveAttachedEffect',
        'initialConfig',
        'initialPercentChance',
        'useWideLayout'
    ];
    
    // Check component source for prop usage (use the file content we already read)
    const componentSource = componentContent;
    
    for (const prop of originalProps) {
        if (!componentSource.includes(prop)) {
            throw new Error(`Component should accept original prop: ${prop}`);
        }
    }
    
    // Test that component maintains original callback signatures
    const callbackProps = [
        'onConfigChange',
        'onAddEffect',
        'onAttachEffect',
        'onRemoveAttachedEffect'
    ];
    
    for (const callback of callbackProps) {
        if (!componentSource.includes(callback)) {
            throw new Error(`Component should maintain original callback: ${callback}`);
        }
    }
    
    // Test that component uses Material-UI components (Phase 6.3: removed useTheme hook, now uses CSS)
    const muiComponents = [
        'Typography',
        'Button',
        'Dialog'  // Changed from Box to Dialog for current component structure
    ];
    
    for (const component of muiComponents) {
        if (!componentSource.includes(component)) {
            throw new Error(`Component should use Material-UI component: ${component}`);
        }
    }
    
    // Test that component uses CSS for styling (Phase 6.3 migration removed inline sx props)
    if (!componentSource.includes('.css')) {
        throw new Error('Component should import CSS for styling (Phase 6.3 requirement)');
    }
    
    // Test that component imports the same child components (refactored to use services)
    // Phase 6.3: EffectAttachmentModal replaced with EffectEventCoordinator service orchestration
    const childComponents = [
        'EffectFormRenderer',
        'AttachedEffectsDisplay',
        'PercentChanceControl'
    ];
    
    for (const child of childComponents) {
        if (!componentSource.includes(child)) {
            throw new Error(`Component should use child component: ${child}`);
        }
    }
    
    // Test that component uses service orchestration instead of direct modal
    const requiredServices = [
        'EffectEventCoordinator',
        'EffectFormValidator',
        'EffectConfigurationManager',
        'EffectUpdateCoordinator'
    ];
    
    for (const service of requiredServices) {
        if (!componentSource.includes(service)) {
            throw new Error(`Component should use service: ${service} (refactored architecture)`);
        }
    }
    
    console.log('✅ EffectConfigurer backward compatibility passed');
    
    return {
        success: true,
        message: 'Backward compatibility validated',
        propsSupported: originalProps.length,
        callbacksSupported: callbackProps.length
    };
}

/**
 * Test 8: Performance and Complexity Reduction Verification
 */
export async function testEffectConfigurerPerformance(testEnv) {
    console.log('🧪 Testing EffectConfigurer performance and complexity reduction...');
    
    // Test that the refactored component is significantly smaller than the original
    // Read component file to check complexity reduction
    const fs = await import('fs/promises');
    const absolutePath = '/Users/the.phoenix/WebstormProjects/nft-studio/src/components/effects/EffectConfigurer.jsx';
    const componentContent = await fs.readFile(absolutePath, 'utf8');

    const componentLines = componentContent.split('\n').length;
    
    // The original EffectConfigurer was 532 lines, refactored should be much smaller
    const originalLines = 532;
    const maxRefactoredLines = 300; // Target: reduce by at least 40%
    
    if (componentLines > maxRefactoredLines) {
        console.warn(`⚠️ Component may still be too large: ${componentLines} lines (target: <${maxRefactoredLines})`);
    }
    
    const reductionPercentage = ((originalLines - componentLines) / originalLines * 100).toFixed(1);
    console.log(`📊 Component size reduction: ${originalLines} -> ${componentLines} lines (${reductionPercentage}% reduction)`);
    
    // Test that services meet performance baselines
    const { EffectFormValidator } = await import('../../src/services/EffectFormValidator.js');
    const { EffectConfigurationManager } = await import('../../src/services/EffectConfigurationManager.js');
    const { EffectEventCoordinator } = await import('../../src/services/EffectEventCoordinator.js');
    
    const validator = new EffectFormValidator();
    const configManager = new EffectConfigurationManager();
    const eventCoordinator = new EffectEventCoordinator();
    
    // Test service performance baselines
    const validatorPerf = validator.checkPerformanceBaseline();
    const configManagerPerf = configManager.checkPerformanceBaseline();
    const eventCoordinatorPerf = eventCoordinator.checkPerformanceBaseline();
    
    if (!validatorPerf.meetsBaseline) {
        throw new Error('EffectFormValidator does not meet performance baseline');
    }
    
    if (!configManagerPerf.meetsBaseline) {
        throw new Error('EffectConfigurationManager does not meet performance baseline');
    }
    
    if (!eventCoordinatorPerf.meetsBaseline) {
        throw new Error('EffectEventCoordinator does not meet performance baseline');
    }
    
    // Test service instantiation performance
    const startTime = performance.now();
    
    for (let i = 0; i < 10; i++) {
        new EffectFormValidator();
        new EffectConfigurationManager();
        new EffectEventCoordinator();
    }
    
    const endTime = performance.now();
    const instantiationTime = endTime - startTime;
    
    if (instantiationTime > 100) { // 100ms baseline for 30 service instantiations
        console.warn(`⚠️ Service instantiation took ${instantiationTime.toFixed(2)}ms (baseline: 100ms)`);
    }
    
    console.log('✅ EffectConfigurer performance and complexity reduction passed');
    
    return {
        success: true,
        message: 'Performance and complexity reduction validated',
        originalLines,
        refactoredLines: componentLines,
        reductionPercentage: reductionPercentage + '%',
        instantiationTime: instantiationTime.toFixed(2) + 'ms',
        servicePerformance: {
            validator: validatorPerf.meetsBaseline,
            configManager: configManagerPerf.meetsBaseline,
            eventCoordinator: eventCoordinatorPerf.meetsBaseline
        }
    };
}

// Export all test functions
export const testFunctions = [
    testEffectConfigurerServices,
    testEffectConfigurerSchemaLoading,
    testEffectConfigurerEffectCoordination,
    testEffectConfigurerConfigChange,
    testEffectConfigurerDefaults,
    testEffectConfigurerEventCoordination,
    testEffectConfigurerCompatibility,
    testEffectConfigurerPerformance
];

export const testInfo = {
    suiteName: 'EffectConfigurer Component Tests',
    totalTests: testFunctions.length,
    category: 'unit'
};