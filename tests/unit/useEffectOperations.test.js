/**
 * Tests for useEffectOperations hook
 * Tests effect operations management using REAL objects only
 * 
 * CRITICAL: This test file follows the "REAL OBJECTS ONLY" policy
 * - Uses REAL EffectOperationsService instances
 * - Uses REAL CommandService for undo/redo operations
 * - Uses REAL EventBusService for event-driven operations
 * - Uses REAL ProjectState for effect management
 * - NO MOCKS, STUBS, SPIES, or FAKE OBJECTS
 */

import TestEnvironment from '../setup/TestEnvironment.js';

describe('useEffectOperations Hook Tests', () => {
    let testEnv;
    let projectState;
    let commandService;
    let eventBusService;
    let effectOperationsService;

    beforeEach(async () => {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        
        // Get REAL service instances - NO MOCKS
        projectState = testEnv.getService('ProjectState');
        commandService = testEnv.getService('CommandService');
        eventBusService = testEnv.getService('EventBusService');
        
        // Initialize project state with test data
        await projectState.initializeProject({
            targetResolution: 1080,
            effects: []
        });
        
        // Create REAL EffectOperationsService instance
        const EffectOperationsService = testEnv.getClass('EffectOperationsService');
        effectOperationsService = new EffectOperationsService({
            commandService,
            eventBus: eventBusService,
            logger: testEnv.getService('LoggerService')
        });
    });

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    /**
     * Test effect creation operations with real services
     */
    function test_effect_creation_operations() {
        console.log('🧪 Testing effect creation operations with REAL services');
        
        const initialEffects = projectState.getState().effects;
        const initialEffectCount = initialEffects.length;
        
        console.log('🎭 Initial effect count:', initialEffectCount);
        
        // Test basic effect creation
        const effectName = 'TestEffect';
        const effectType = 'primary';
        const availableEffects = {
            primary: [{ name: effectName, category: 'test' }],
            secondary: [],
            finalImage: []
        };
        
        // Create effect using REAL EffectOperationsService
        effectOperationsService.createEffect({
            effectName,
            effectType,
            projectState,
            availableEffects
        });
        
        const effectsAfterAdd = projectState.getState().effects;
        const newEffectCount = effectsAfterAdd.length;
        
        if (newEffectCount !== initialEffectCount + 1) {
            throw new Error(`Expected ${initialEffectCount + 1} effects, got ${newEffectCount}`);
        }
        
        const addedEffect = effectsAfterAdd[effectsAfterAdd.length - 1];
        
        if (addedEffect.name !== effectName) {
            throw new Error(`Expected effect name to be '${effectName}', got '${addedEffect.name}'`);
        }
        
        if (addedEffect.type !== effectType) {
            throw new Error(`Expected effect type to be '${effectType}', got '${addedEffect.type}'`);
        }
        
        console.log('✅ Effect creation operations test passed');
    }

    /**
     * Test effect creation with configuration using real services
     */
    function test_effect_creation_with_config() {
        console.log('🧪 Testing effect creation with config using REAL services');
        
        const effectName = 'ConfigurableEffect';
        const effectType = 'primary';
        const config = {
            intensity: 0.8,
            color: '#ff0000',
            specialtyGroup: 'test-group'
        };
        const percentChance = 75;
        
        const availableEffects = {
            primary: [{ name: effectName, category: 'configurable' }],
            secondary: [],
            finalImage: []
        };
        
        const initialEffectCount = projectState.getState().effects.length;
        
        // Create effect with config using REAL EffectOperationsService
        effectOperationsService.createEffectWithConfig({
            effectName,
            effectType,
            config,
            percentChance,
            projectState,
            availableEffects
        });
        
        const effectsAfterAdd = projectState.getState().effects;
        const newEffectCount = effectsAfterAdd.length;
        
        if (newEffectCount !== initialEffectCount + 1) {
            throw new Error(`Expected ${initialEffectCount + 1} effects, got ${newEffectCount}`);
        }
        
        const addedEffect = effectsAfterAdd[effectsAfterAdd.length - 1];
        
        if (addedEffect.name !== effectName) {
            throw new Error(`Expected effect name to be '${effectName}', got '${addedEffect.name}'`);
        }
        
        if (addedEffect.percentChance !== percentChance) {
            throw new Error(`Expected percentChance to be ${percentChance}, got ${addedEffect.percentChance}`);
        }
        
        // Verify config was applied
        if (addedEffect.config.intensity !== config.intensity) {
            throw new Error(`Expected intensity to be ${config.intensity}, got ${addedEffect.config.intensity}`);
        }
        
        if (addedEffect.config.color !== config.color) {
            throw new Error(`Expected color to be '${config.color}', got '${addedEffect.config.color}'`);
        }
        
        console.log('✅ Effect creation with config test passed');
    }

    /**
     * Test effect update operations with real services
     */
    function test_effect_update_operations() {
        console.log('🧪 Testing effect update operations with REAL services');
        
        // First create an effect to update
        const effectName = 'UpdatableEffect';
        const availableEffects = {
            primary: [{ name: effectName, category: 'test' }],
            secondary: [],
            finalImage: []
        };
        
        effectOperationsService.createEffect({
            effectName,
            effectType: 'primary',
            projectState,
            availableEffects
        });
        
        const effectsBeforeUpdate = projectState.getState().effects;
        const effectIndex = effectsBeforeUpdate.length - 1;
        const originalEffect = effectsBeforeUpdate[effectIndex];
        
        // Update the effect
        const updatedEffect = {
            ...originalEffect,
            config: {
                ...originalEffect.config,
                intensity: 0.9,
                newProperty: 'test-value'
            },
            percentChance: 90
        };
        
        effectOperationsService.updateEffect({
            index: effectIndex,
            updatedEffect,
            projectState
        });
        
        const effectsAfterUpdate = projectState.getState().effects;
        const updatedEffectResult = effectsAfterUpdate[effectIndex];
        
        if (updatedEffectResult.config.intensity !== 0.9) {
            throw new Error(`Expected updated intensity to be 0.9, got ${updatedEffectResult.config.intensity}`);
        }
        
        if (updatedEffectResult.config.newProperty !== 'test-value') {
            throw new Error(`Expected newProperty to be 'test-value', got '${updatedEffectResult.config.newProperty}'`);
        }
        
        if (updatedEffectResult.percentChance !== 90) {
            throw new Error(`Expected updated percentChance to be 90, got ${updatedEffectResult.percentChance}`);
        }
        
        console.log('✅ Effect update operations test passed');
    }

    /**
     * Test effect deletion and reordering with real services
     */
    function test_effect_deletion_and_reordering() {
        console.log('🧪 Testing effect deletion and reordering with REAL services');
        
        const availableEffects = {
            primary: [
                { name: 'Effect1', category: 'test' },
                { name: 'Effect2', category: 'test' },
                { name: 'Effect3', category: 'test' }
            ],
            secondary: [],
            finalImage: []
        };
        
        // Create multiple effects
        effectOperationsService.createEffect({
            effectName: 'Effect1',
            effectType: 'primary',
            projectState,
            availableEffects
        });
        
        effectOperationsService.createEffect({
            effectName: 'Effect2',
            effectType: 'primary',
            projectState,
            availableEffects
        });
        
        effectOperationsService.createEffect({
            effectName: 'Effect3',
            effectType: 'primary',
            projectState,
            availableEffects
        });
        
        const effectsAfterCreation = projectState.getState().effects;
        const initialCount = effectsAfterCreation.length;
        
        if (initialCount < 3) {
            throw new Error(`Expected at least 3 effects, got ${initialCount}`);
        }
        
        // Test reordering (move last effect to first position)
        const fromIndex = initialCount - 1;
        const toIndex = 0;
        const effectToMove = effectsAfterCreation[fromIndex];
        
        effectOperationsService.reorderEffects({
            fromIndex,
            toIndex,
            projectState
        });
        
        const effectsAfterReorder = projectState.getState().effects;
        const movedEffect = effectsAfterReorder[toIndex];
        
        if (movedEffect.name !== effectToMove.name) {
            throw new Error(`Expected moved effect to be '${effectToMove.name}', got '${movedEffect.name}'`);
        }
        
        // Test deletion (delete the first effect)
        effectOperationsService.deleteEffect({
            index: 0,
            projectState
        });
        
        const effectsAfterDeletion = projectState.getState().effects;
        const finalCount = effectsAfterDeletion.length;
        
        if (finalCount !== initialCount - 1) {
            throw new Error(`Expected ${initialCount - 1} effects after deletion, got ${finalCount}`);
        }
        
        console.log('✅ Effect deletion and reordering test passed');
    }

    /**
     * Test effect visibility toggle with real services
     */
    function test_effect_visibility_toggle() {
        console.log('🧪 Testing effect visibility toggle with REAL services');
        
        const availableEffects = {
            primary: [{ name: 'VisibilityTestEffect', category: 'test' }],
            secondary: [],
            finalImage: []
        };
        
        // Create an effect
        effectOperationsService.createEffect({
            effectName: 'VisibilityTestEffect',
            effectType: 'primary',
            projectState,
            availableEffects
        });
        
        const effects = projectState.getState().effects;
        const effectIndex = effects.length - 1;
        const effect = effects[effectIndex];
        
        const initialVisibility = effect.visible !== false; // Default should be visible
        
        // Toggle visibility
        effectOperationsService.toggleEffectVisibility({
            index: effectIndex,
            projectState
        });
        
        const effectsAfterToggle = projectState.getState().effects;
        const toggledEffect = effectsAfterToggle[effectIndex];
        const newVisibility = toggledEffect.visible !== false;
        
        if (newVisibility === initialVisibility) {
            throw new Error(`Expected visibility to change from ${initialVisibility} to ${!initialVisibility}`);
        }
        
        // Toggle back
        effectOperationsService.toggleEffectVisibility({
            index: effectIndex,
            projectState
        });
        
        const effectsAfterSecondToggle = projectState.getState().effects;
        const retoggledEffect = effectsAfterSecondToggle[effectIndex];
        const finalVisibility = retoggledEffect.visible !== false;
        
        if (finalVisibility !== initialVisibility) {
            throw new Error(`Expected visibility to return to ${initialVisibility}, got ${finalVisibility}`);
        }
        
        console.log('✅ Effect visibility toggle test passed');
    }

    /**
     * Test operation metrics tracking with real services
     */
    function test_operation_metrics_tracking() {
        console.log('🧪 Testing operation metrics tracking with REAL services');
        
        // Get initial metrics
        const initialMetrics = effectOperationsService.getOperationMetrics();
        
        console.log('📊 Initial operation metrics:', initialMetrics);
        
        const availableEffects = {
            primary: [{ name: 'MetricsTestEffect', category: 'test' }],
            secondary: [],
            finalImage: []
        };
        
        // Perform operations to update metrics
        effectOperationsService.createEffect({
            effectName: 'MetricsTestEffect',
            effectType: 'primary',
            projectState,
            availableEffects
        });
        
        const metricsAfterCreate = effectOperationsService.getOperationMetrics();
        
        if (metricsAfterCreate.effectsCreated <= initialMetrics.effectsCreated) {
            throw new Error(`Expected effectsCreated to increase from ${initialMetrics.effectsCreated}`);
        }
        
        if (!metricsAfterCreate.lastOperationTime) {
            throw new Error('Expected lastOperationTime to be set after operation');
        }
        
        // Update the effect
        const effects = projectState.getState().effects;
        const effectIndex = effects.length - 1;
        const effect = effects[effectIndex];
        
        effectOperationsService.updateEffect({
            index: effectIndex,
            updatedEffect: { ...effect, config: { ...effect.config, updated: true } },
            projectState
        });
        
        const metricsAfterUpdate = effectOperationsService.getOperationMetrics();
        
        if (metricsAfterUpdate.effectsUpdated <= metricsAfterCreate.effectsUpdated) {
            throw new Error(`Expected effectsUpdated to increase from ${metricsAfterCreate.effectsUpdated}`);
        }
        
        console.log('📊 Final operation metrics:', metricsAfterUpdate);
        console.log('✅ Operation metrics tracking test passed');
    }

    // Execute all tests
    test_effect_creation_operations();
    test_effect_creation_with_config();
    test_effect_update_operations();
    test_effect_deletion_and_reordering();
    test_effect_visibility_toggle();
    test_operation_metrics_tracking();
});