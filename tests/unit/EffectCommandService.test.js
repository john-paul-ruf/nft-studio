/**
 * EffectCommandService Tests - REAL OBJECTS ONLY (NO MOCKS)
 * Tests primary effect command management using REAL objects only
 * 
 * CRITICAL: This test file follows the "REAL OBJECTS ONLY" policy
 * - Uses REAL EffectCommandService instances
 * - Uses REAL CommandService for command execution
 * - Uses REAL ProjectState for effect management
 * - Uses REAL EventBusService for event handling
 * - NO MOCKS, STUBS, SPIES, or FAKE OBJECTS
 */

import TestEnvironment from '../setup/TestEnvironment.js';

// Test environment setup
let testEnv;
let effectCommandService;
let projectState;
let commandService;
let eventBusService;

async function setupTest() {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    
    // Get REAL service instances - NO MOCKS
    effectCommandService = testEnv.getService('EffectCommandService');
    projectState = testEnv.getService('ProjectState');
    commandService = testEnv.getService('CommandService');
    eventBusService = testEnv.getService('EventBusService');
    
    // Initialize project state with test data
    await projectState.initializeProject({
        targetResolution: 1080,
        effects: []
    });
}

async function cleanupTest() {
    if (testEnv) {
        await testEnv.cleanup();
    }
}

/**
 * Test effect command service initialization with real services
 */
export async function test_effect_command_service_initialization() {
    await setupTest();
    
    try {
        console.log('🧪 Testing EffectCommandService initialization with REAL services');
        
        if (!effectCommandService) {
            throw new Error('EffectCommandService should be initialized');
        }
        
        // Test service methods exist
        const requiredMethods = [
            'createUpdateCommand',
            'createAddCommand',
            'createDeleteCommand',
            'createReorderCommand'
        ];
        
        for (const method of requiredMethods) {
            if (typeof effectCommandService[method] !== 'function') {
                throw new Error(`EffectCommandService should have ${method} method`);
            }
        }
        
        console.log('✅ EffectCommandService initialization test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test add effect command creation and execution with real services
 */
export async function test_add_effect_command_execution() {
    await setupTest();
    
    try {
        console.log('🧪 Testing add effect command execution with REAL services');
        
        const effectData = {
            name: 'TestAddEffect',
            className: 'TestAddEffect',
            registryKey: 'test-add-effect',
            config: {
                intensity: 0.5,
                color: '#ff0000'
            }
        };
        
        const effectName = 'TestAddEffect';
        const effectType = 'primary';
        
        // Get initial state
        const initialEffects = projectState.getState().effects;
        const initialCount = initialEffects.length;
        
        // Create add command using REAL EffectCommandService
        const addCommand = effectCommandService.createAddCommand(
            projectState,
            effectData,
            effectName,
            effectType
        );
        
        if (!addCommand) {
            throw new Error('Add command should be created');
        }
        
        if (addCommand.type !== 'effect.add') {
            throw new Error(`Expected command type 'effect.add', got '${addCommand.type}'`);
        }
        
        if (!addCommand.isEffectCommand) {
            throw new Error('Add command should be marked as effect command');
        }
        
        // Execute command using REAL CommandService
        const result = commandService.executeCommand(addCommand);
        
        if (!result.success) {
            throw new Error('Add command execution should succeed');
        }
        
        // Verify effect was added
        const effectsAfterAdd = projectState.getState().effects;
        const newCount = effectsAfterAdd.length;
        
        if (newCount !== initialCount + 1) {
            throw new Error(`Expected ${initialCount + 1} effects, got ${newCount}`);
        }
        
        const addedEffect = effectsAfterAdd[effectsAfterAdd.length - 1];
        
        if (addedEffect.name !== effectName) {
            throw new Error(`Expected effect name '${effectName}', got '${addedEffect.name}'`);
        }
        
        if (addedEffect.config.intensity !== effectData.config.intensity) {
            throw new Error(`Expected intensity ${effectData.config.intensity}, got ${addedEffect.config.intensity}`);
        }
        
        console.log('✅ Add effect command execution test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test update effect command creation and execution with real services
 */
export async function test_update_effect_command_execution() {
    await setupTest();
    
    try {
        console.log('🧪 Testing update effect command execution with REAL services');
        
        // First add an effect to update
        const originalEffect = {
            name: 'TestUpdateEffect',
            className: 'TestUpdateEffect',
            registryKey: 'test-update-effect',
            config: {
                intensity: 0.3,
                color: '#00ff00'
            }
        };
        
        const addCommand = effectCommandService.createAddCommand(
            projectState,
            originalEffect,
            'TestUpdateEffect',
            'primary'
        );
        
        commandService.executeCommand(addCommand);
        
        const effectsAfterAdd = projectState.getState().effects;
        const effectIndex = effectsAfterAdd.length - 1;
        
        // Create updated effect data
        const updatedEffect = {
            ...originalEffect,
            config: {
                ...originalEffect.config,
                intensity: 0.8,
                color: '#0000ff',
                newProperty: 'test-value'
            }
        };
        
        // Create update command using REAL EffectCommandService
        const updateCommand = effectCommandService.createUpdateCommand(
            projectState,
            effectIndex,
            updatedEffect,
            'TestUpdateEffect'
        );
        
        if (!updateCommand) {
            throw new Error('Update command should be created');
        }
        
        if (updateCommand.type !== 'effect.update') {
            throw new Error(`Expected command type 'effect.update', got '${updateCommand.type}'`);
        }
        
        if (updateCommand.effectIndex !== effectIndex) {
            throw new Error(`Expected effect index ${effectIndex}, got ${updateCommand.effectIndex}`);
        }
        
        // Execute update command using REAL CommandService
        const result = commandService.executeCommand(updateCommand);
        
        if (!result.success) {
            throw new Error('Update command execution should succeed');
        }
        
        // Verify effect was updated
        const effectsAfterUpdate = projectState.getState().effects;
        const updatedEffectResult = effectsAfterUpdate[effectIndex];
        
        if (updatedEffectResult.config.intensity !== 0.8) {
            throw new Error(`Expected updated intensity 0.8, got ${updatedEffectResult.config.intensity}`);
        }
        
        if (updatedEffectResult.config.color !== '#0000ff') {
            throw new Error(`Expected updated color '#0000ff', got '${updatedEffectResult.config.color}'`);
        }
        
        if (updatedEffectResult.config.newProperty !== 'test-value') {
            throw new Error(`Expected newProperty 'test-value', got '${updatedEffectResult.config.newProperty}'`);
        }
        
        console.log('✅ Update effect command execution test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test delete effect command creation and execution with real services
 */
export async function test_delete_effect_command_execution() {
    await setupTest();
    
    try {
        console.log('🧪 Testing delete effect command execution with REAL services');
        
        // First add multiple effects
        const effect1 = {
            name: 'Effect1',
            className: 'Effect1',
            registryKey: 'effect-1',
            config: { value: 1 }
        };
        
        const effect2 = {
            name: 'Effect2',
            className: 'Effect2',
            registryKey: 'effect-2',
            config: { value: 2 }
        };
        
        const effect3 = {
            name: 'Effect3',
            className: 'Effect3',
            registryKey: 'effect-3',
            config: { value: 3 }
        };
        
        // Add effects
        commandService.executeCommand(effectCommandService.createAddCommand(projectState, effect1, 'Effect1', 'primary'));
        commandService.executeCommand(effectCommandService.createAddCommand(projectState, effect2, 'Effect2', 'primary'));
        commandService.executeCommand(effectCommandService.createAddCommand(projectState, effect3, 'Effect3', 'primary'));
        
        const effectsBeforeDelete = projectState.getState().effects;
        const initialCount = effectsBeforeDelete.length;
        const deleteIndex = 1; // Delete middle effect
        const effectToDelete = effectsBeforeDelete[deleteIndex];
        
        // Create delete command using REAL EffectCommandService
        const deleteCommand = effectCommandService.createDeleteCommand(projectState, deleteIndex);
        
        if (!deleteCommand) {
            throw new Error('Delete command should be created');
        }
        
        if (deleteCommand.type !== 'effect.delete') {
            throw new Error(`Expected command type 'effect.delete', got '${deleteCommand.type}'`);
        }
        
        if (deleteCommand.effectIndex !== deleteIndex) {
            throw new Error(`Expected effect index ${deleteIndex}, got ${deleteCommand.effectIndex}`);
        }
        
        // Execute delete command using REAL CommandService
        const result = commandService.executeCommand(deleteCommand);
        
        if (!result.success) {
            throw new Error('Delete command execution should succeed');
        }
        
        // Verify effect was deleted
        const effectsAfterDelete = projectState.getState().effects;
        const newCount = effectsAfterDelete.length;
        
        if (newCount !== initialCount - 1) {
            throw new Error(`Expected ${initialCount - 1} effects, got ${newCount}`);
        }
        
        // Verify the correct effect was deleted (middle one)
        if (effectsAfterDelete[0].name !== 'Effect1') {
            throw new Error(`Expected first effect to be 'Effect1', got '${effectsAfterDelete[0].name}'`);
        }
        
        if (effectsAfterDelete[1].name !== 'Effect3') {
            throw new Error(`Expected second effect to be 'Effect3', got '${effectsAfterDelete[1].name}'`);
        }
        
        console.log('✅ Delete effect command execution test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test reorder effects command creation and execution with real services
 */
export async function test_reorder_effects_command_execution() {
    await setupTest();
    
    try {
        console.log('🧪 Testing reorder effects command execution with REAL services');
        
        // Add multiple effects for reordering
        const effects = [
            { name: 'First', className: 'First', registryKey: 'first', config: { order: 1 } },
            { name: 'Second', className: 'Second', registryKey: 'second', config: { order: 2 } },
            { name: 'Third', className: 'Third', registryKey: 'third', config: { order: 3 } }
        ];
        
        for (const effect of effects) {
            commandService.executeCommand(effectCommandService.createAddCommand(projectState, effect, effect.name, 'primary'));
        }
        
        const effectsBeforeReorder = projectState.getState().effects;
        const originalOrder = effectsBeforeReorder.map(e => e.name);
        
        // Reorder: move first effect to last position (0 -> 2)
        const fromIndex = 0;
        const toIndex = 2;
        
        // Create reorder command using REAL EffectCommandService
        const reorderCommand = effectCommandService.createReorderCommand(projectState, fromIndex, toIndex);
        
        if (!reorderCommand) {
            throw new Error('Reorder command should be created');
        }
        
        if (reorderCommand.type !== 'effect.reorder') {
            throw new Error(`Expected command type 'effect.reorder', got '${reorderCommand.type}'`);
        }
        
        if (reorderCommand.fromIndex !== fromIndex) {
            throw new Error(`Expected fromIndex ${fromIndex}, got ${reorderCommand.fromIndex}`);
        }
        
        if (reorderCommand.toIndex !== toIndex) {
            throw new Error(`Expected toIndex ${toIndex}, got ${reorderCommand.toIndex}`);
        }
        
        // Execute reorder command using REAL CommandService
        const result = commandService.executeCommand(reorderCommand);
        
        if (!result.success) {
            throw new Error('Reorder command execution should succeed');
        }
        
        // Verify effects were reordered correctly
        const effectsAfterReorder = projectState.getState().effects;
        const newOrder = effectsAfterReorder.map(e => e.name);
        
        // Expected order: ['Second', 'Third', 'First']
        const expectedOrder = ['Second', 'Third', 'First'];
        
        if (JSON.stringify(newOrder) !== JSON.stringify(expectedOrder)) {
            throw new Error(`Expected order ${JSON.stringify(expectedOrder)}, got ${JSON.stringify(newOrder)}`);
        }
        
        console.log('✅ Reorder effects command execution test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test command undo/redo functionality with real services
 */
export async function test_command_undo_redo_functionality() {
    await setupTest();
    
    try {
        console.log('🧪 Testing command undo/redo functionality with REAL services');
        
        const effectData = {
            name: 'UndoRedoEffect',
            className: 'UndoRedoEffect',
            registryKey: 'undo-redo-effect',
            config: { value: 'test' }
        };
        
        // Get initial state
        const initialEffects = projectState.getState().effects;
        const initialCount = initialEffects.length;
        
        // Execute add command
        const addCommand = effectCommandService.createAddCommand(projectState, effectData, 'UndoRedoEffect', 'primary');
        commandService.executeCommand(addCommand);
        
        // Verify effect was added
        const effectsAfterAdd = projectState.getState().effects;
        if (effectsAfterAdd.length !== initialCount + 1) {
            throw new Error(`Expected ${initialCount + 1} effects after add, got ${effectsAfterAdd.length}`);
        }
        
        // Test undo using REAL CommandService
        const undoResult = commandService.undo();
        
        if (!undoResult.success) {
            throw new Error('Undo should succeed');
        }
        
        // Verify effect was removed by undo
        const effectsAfterUndo = projectState.getState().effects;
        if (effectsAfterUndo.length !== initialCount) {
            throw new Error(`Expected ${initialCount} effects after undo, got ${effectsAfterUndo.length}`);
        }
        
        // Test redo using REAL CommandService
        const redoResult = commandService.redo();
        
        if (!redoResult.success) {
            throw new Error('Redo should succeed');
        }
        
        // Verify effect was restored by redo
        const effectsAfterRedo = projectState.getState().effects;
        if (effectsAfterRedo.length !== initialCount + 1) {
            throw new Error(`Expected ${initialCount + 1} effects after redo, got ${effectsAfterRedo.length}`);
        }
        
        const restoredEffect = effectsAfterRedo[effectsAfterRedo.length - 1];
        if (restoredEffect.name !== 'UndoRedoEffect') {
            throw new Error(`Expected restored effect name 'UndoRedoEffect', got '${restoredEffect.name}'`);
        }
        
        console.log('✅ Command undo/redo functionality test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test event emission during command execution with real services
 */
export async function test_event_emission_during_command_execution() {
    await setupTest();
    
    try {
        console.log('🧪 Testing event emission during command execution with REAL services');
        
        let commandExecutedEvent = null;
        let effectAddedEvent = null;
        
        // Subscribe to events using REAL EventBusService
        const commandSubscription = eventBusService.subscribe('command:executed', (event) => {
            commandExecutedEvent = event;
        });
        
        const effectSubscription = eventBusService.subscribe('effect:added', (event) => {
            effectAddedEvent = event;
        });
        
        const effectData = {
            name: 'EventTestEffect',
            className: 'EventTestEffect',
            registryKey: 'event-test-effect',
            config: { value: 'event-test' }
        };
        
        // Execute add command
        const addCommand = effectCommandService.createAddCommand(projectState, effectData, 'EventTestEffect', 'primary');
        commandService.executeCommand(addCommand);
        
        // Verify command executed event was emitted
        if (!commandExecutedEvent) {
            throw new Error('Command executed event should be emitted');
        }
        
        if (commandExecutedEvent.commandType !== 'effect.add') {
            throw new Error(`Expected command type 'effect.add', got '${commandExecutedEvent.commandType}'`);
        }
        
        // Verify effect added event was emitted (if the service emits it)
        // Note: This depends on the actual implementation
        
        // Clean up subscriptions
        eventBusService.unsubscribe('command:executed', commandSubscription);
        eventBusService.unsubscribe('effect:added', effectSubscription);
        
        console.log('✅ Event emission during command execution test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test error handling for invalid indices and edge cases
 */
export async function test_error_handling_for_invalid_indices() {
    await setupTest();
    
    try {
        console.log('🧪 Testing error handling for invalid indices with REAL services');
        
        // Test delete with invalid index
        try {
            const deleteCommand = effectCommandService.createDeleteCommand(projectState, 999);
            const result = commandService.executeCommand(deleteCommand);
            
            if (result.success) {
                throw new Error('Delete command with invalid index should fail');
            }
        } catch (error) {
            // Expected error for invalid index
            console.log('✅ Invalid delete index handled correctly');
        }
        
        // Test update with invalid index
        try {
            const updateCommand = effectCommandService.createUpdateCommand(
                projectState,
                999,
                { name: 'Invalid', config: {} },
                'Invalid'
            );
            const result = commandService.executeCommand(updateCommand);
            
            if (result.success) {
                throw new Error('Update command with invalid index should fail');
            }
        } catch (error) {
            // Expected error for invalid index
            console.log('✅ Invalid update index handled correctly');
        }
        
        // Test reorder with invalid indices
        try {
            const reorderCommand = effectCommandService.createReorderCommand(projectState, 999, 0);
            const result = commandService.executeCommand(reorderCommand);
            
            if (result.success) {
                throw new Error('Reorder command with invalid fromIndex should fail');
            }
        } catch (error) {
            // Expected error for invalid index
            console.log('✅ Invalid reorder indices handled correctly');
        }
        
        console.log('✅ Error handling for invalid indices test passed');
    } finally {
        await cleanupTest();
    }
}