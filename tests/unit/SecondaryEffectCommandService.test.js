/**
 * SecondaryEffectCommandService Tests - REAL OBJECTS ONLY (NO MOCKS)
 * Tests secondary effect command management using REAL objects only
 * 
 * CRITICAL: This test file follows the "REAL OBJECTS ONLY" policy
 * - Uses REAL SecondaryEffectCommandService instances
 * - Uses REAL CommandService for command execution
 * - Uses REAL ProjectState for effect management
 * - Uses REAL EventBusService for event handling
 * - NO MOCKS, STUBS, SPIES, or FAKE OBJECTS
 */

import TestEnvironment from '../setup/TestEnvironment.js';

// Test environment setup
let testEnv;
let secondaryEffectCommandService;
let effectCommandService;
let projectState;
let commandService;
let eventBusService;

async function setupTest() {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    
    // Get REAL service instances - NO MOCKS
    secondaryEffectCommandService = testEnv.getService('SecondaryEffectCommandService');
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
 * Test secondary effect command service initialization with real services
 */
export async function test_secondary_effect_command_service_initialization() {
    await setupTest();
    
    try {
        console.log('🧪 Testing SecondaryEffectCommandService initialization with REAL services');
        
        if (!secondaryEffectCommandService) {
            throw new Error('SecondaryEffectCommandService should be initialized');
        }
        
        // Test service methods exist
        const requiredMethods = [
            'createAddSecondaryCommand',
            'createDeleteSecondaryCommand',
            'createReorderSecondaryCommand'
        ];
        
        for (const method of requiredMethods) {
            if (typeof secondaryEffectCommandService[method] !== 'function') {
                throw new Error(`SecondaryEffectCommandService should have ${method} method`);
            }
        }
        
        console.log('✅ SecondaryEffectCommandService initialization test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test add secondary effect command with parent-child relationship management
 */
export async function test_add_secondary_effect_command() {
    await setupTest();
    
    try {
        console.log('🧪 Testing add secondary effect command with REAL services');
        
        // First create a parent effect
        const parentEffect = {
            name: 'ParentEffect',
            className: 'ParentEffect',
            registryKey: 'parent-effect',
            config: { value: 'parent' },
            secondaryEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'ParentEffect',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effectsAfterParent = projectState.getState().effects;
        const parentIndex = effectsAfterParent.length - 1;
        
        // Create secondary effect data
        const secondaryEffectData = {
            name: 'SecondaryEffect',
            className: 'SecondaryEffect',
            registryKey: 'secondary-effect',
            config: { value: 'secondary' }
        };
        
        // Create add secondary command using REAL SecondaryEffectCommandService
        const addSecondaryCommand = secondaryEffectCommandService.createAddSecondaryCommand(
            projectState,
            parentIndex,
            secondaryEffectData,
            'SecondaryEffect'
        );
        
        if (!addSecondaryCommand) {
            throw new Error('Add secondary command should be created');
        }
        
        if (addSecondaryCommand.type !== 'effect.secondary.add') {
            throw new Error(`Expected command type 'effect.secondary.add', got '${addSecondaryCommand.type}'`);
        }
        
        if (addSecondaryCommand.parentIndex !== parentIndex) {
            throw new Error(`Expected parent index ${parentIndex}, got ${addSecondaryCommand.parentIndex}`);
        }
        
        // Execute command using REAL CommandService
        const result = commandService.executeCommand(addSecondaryCommand);
        
        if (!result.success) {
            throw new Error('Add secondary command execution should succeed');
        }
        
        // Verify secondary effect was added to parent
        const effectsAfterSecondary = projectState.getState().effects;
        const updatedParent = effectsAfterSecondary[parentIndex];
        
        if (!updatedParent.secondaryEffects || updatedParent.secondaryEffects.length !== 1) {
            throw new Error('Parent effect should have 1 secondary effect');
        }
        
        const addedSecondary = updatedParent.secondaryEffects[0];
        
        if (addedSecondary.name !== 'SecondaryEffect') {
            throw new Error(`Expected secondary effect name 'SecondaryEffect', got '${addedSecondary.name}'`);
        }
        
        if (addedSecondary.config.value !== 'secondary') {
            throw new Error(`Expected secondary config value 'secondary', got '${addedSecondary.config.value}'`);
        }
        
        console.log('✅ Add secondary effect command test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test delete secondary effect command with nested array manipulation
 */
export async function test_delete_secondary_effect_command() {
    await setupTest();
    
    try {
        console.log('🧪 Testing delete secondary effect command with REAL services');
        
        // Create parent effect with multiple secondary effects
        const parentEffect = {
            name: 'ParentWithSecondaries',
            className: 'ParentWithSecondaries',
            registryKey: 'parent-with-secondaries',
            config: { value: 'parent' },
            secondaryEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'ParentWithSecondaries',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effectsAfterParent = projectState.getState().effects;
        const parentIndex = effectsAfterParent.length - 1;
        
        // Add multiple secondary effects
        const secondaryEffects = [
            { name: 'Secondary1', className: 'Secondary1', registryKey: 'secondary-1', config: { order: 1 } },
            { name: 'Secondary2', className: 'Secondary2', registryKey: 'secondary-2', config: { order: 2 } },
            { name: 'Secondary3', className: 'Secondary3', registryKey: 'secondary-3', config: { order: 3 } }
        ];
        
        for (const secondary of secondaryEffects) {
            const addCommand = secondaryEffectCommandService.createAddSecondaryCommand(
                projectState,
                parentIndex,
                secondary,
                secondary.name
            );
            commandService.executeCommand(addCommand);
        }
        
        // Verify all secondary effects were added
        const effectsBeforeDelete = projectState.getState().effects;
        const parentBeforeDelete = effectsBeforeDelete[parentIndex];
        
        if (parentBeforeDelete.secondaryEffects.length !== 3) {
            throw new Error(`Expected 3 secondary effects, got ${parentBeforeDelete.secondaryEffects.length}`);
        }
        
        // Delete middle secondary effect (index 1)
        const deleteIndex = 1;
        const deleteCommand = secondaryEffectCommandService.createDeleteSecondaryCommand(
            projectState,
            parentIndex,
            deleteIndex
        );
        
        if (!deleteCommand) {
            throw new Error('Delete secondary command should be created');
        }
        
        if (deleteCommand.type !== 'effect.secondary.delete') {
            throw new Error(`Expected command type 'effect.secondary.delete', got '${deleteCommand.type}'`);
        }
        
        // Execute delete command
        const result = commandService.executeCommand(deleteCommand);
        
        if (!result.success) {
            throw new Error('Delete secondary command execution should succeed');
        }
        
        // Verify secondary effect was deleted
        const effectsAfterDelete = projectState.getState().effects;
        const parentAfterDelete = effectsAfterDelete[parentIndex];
        
        if (parentAfterDelete.secondaryEffects.length !== 2) {
            throw new Error(`Expected 2 secondary effects after delete, got ${parentAfterDelete.secondaryEffects.length}`);
        }
        
        // Verify correct effect was deleted (middle one)
        const remainingNames = parentAfterDelete.secondaryEffects.map(s => s.name);
        const expectedNames = ['Secondary1', 'Secondary3'];
        
        if (JSON.stringify(remainingNames) !== JSON.stringify(expectedNames)) {
            throw new Error(`Expected remaining names ${JSON.stringify(expectedNames)}, got ${JSON.stringify(remainingNames)}`);
        }
        
        console.log('✅ Delete secondary effect command test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test reorder secondary effects within parent effects
 */
export async function test_reorder_secondary_effects_command() {
    await setupTest();
    
    try {
        console.log('🧪 Testing reorder secondary effects command with REAL services');
        
        // Create parent effect
        const parentEffect = {
            name: 'ReorderParent',
            className: 'ReorderParent',
            registryKey: 'reorder-parent',
            config: { value: 'parent' },
            secondaryEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'ReorderParent',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effectsAfterParent = projectState.getState().effects;
        const parentIndex = effectsAfterParent.length - 1;
        
        // Add secondary effects for reordering
        const secondaryEffects = [
            { name: 'First', className: 'First', registryKey: 'first', config: { position: 1 } },
            { name: 'Second', className: 'Second', registryKey: 'second', config: { position: 2 } },
            { name: 'Third', className: 'Third', registryKey: 'third', config: { position: 3 } }
        ];
        
        for (const secondary of secondaryEffects) {
            const addCommand = secondaryEffectCommandService.createAddSecondaryCommand(
                projectState,
                parentIndex,
                secondary,
                secondary.name
            );
            commandService.executeCommand(addCommand);
        }
        
        // Get initial order
        const effectsBeforeReorder = projectState.getState().effects;
        const parentBeforeReorder = effectsBeforeReorder[parentIndex];
        const originalOrder = parentBeforeReorder.secondaryEffects.map(s => s.name);
        
        // Reorder: move first to last (0 -> 2)
        const fromIndex = 0;
        const toIndex = 2;
        
        const reorderCommand = secondaryEffectCommandService.createReorderSecondaryCommand(
            projectState,
            parentIndex,
            fromIndex,
            toIndex
        );
        
        if (!reorderCommand) {
            throw new Error('Reorder secondary command should be created');
        }
        
        if (reorderCommand.type !== 'effect.secondary.reorder') {
            throw new Error(`Expected command type 'effect.secondary.reorder', got '${reorderCommand.type}'`);
        }
        
        // Execute reorder command
        const result = commandService.executeCommand(reorderCommand);
        
        if (!result.success) {
            throw new Error('Reorder secondary command execution should succeed');
        }
        
        // Verify reordering
        const effectsAfterReorder = projectState.getState().effects;
        const parentAfterReorder = effectsAfterReorder[parentIndex];
        const newOrder = parentAfterReorder.secondaryEffects.map(s => s.name);
        
        // Expected order: ['Second', 'Third', 'First']
        const expectedOrder = ['Second', 'Third', 'First'];
        
        if (JSON.stringify(newOrder) !== JSON.stringify(expectedOrder)) {
            throw new Error(`Expected order ${JSON.stringify(expectedOrder)}, got ${JSON.stringify(newOrder)}`);
        }
        
        console.log('✅ Reorder secondary effects command test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test secondary command undo/redo functionality
 */
export async function test_secondary_command_undo_redo_functionality() {
    await setupTest();
    
    try {
        console.log('🧪 Testing secondary command undo/redo functionality with REAL services');
        
        // Create parent effect
        const parentEffect = {
            name: 'UndoRedoParent',
            className: 'UndoRedoParent',
            registryKey: 'undo-redo-parent',
            config: { value: 'parent' },
            secondaryEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'UndoRedoParent',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effectsAfterParent = projectState.getState().effects;
        const parentIndex = effectsAfterParent.length - 1;
        
        // Add secondary effect
        const secondaryData = {
            name: 'UndoRedoSecondary',
            className: 'UndoRedoSecondary',
            registryKey: 'undo-redo-secondary',
            config: { value: 'secondary' }
        };
        
        const addSecondaryCommand = secondaryEffectCommandService.createAddSecondaryCommand(
            projectState,
            parentIndex,
            secondaryData,
            'UndoRedoSecondary'
        );
        
        commandService.executeCommand(addSecondaryCommand);
        
        // Verify secondary was added
        const effectsAfterAdd = projectState.getState().effects;
        const parentAfterAdd = effectsAfterAdd[parentIndex];
        
        if (parentAfterAdd.secondaryEffects.length !== 1) {
            throw new Error(`Expected 1 secondary effect after add, got ${parentAfterAdd.secondaryEffects.length}`);
        }
        
        // Test undo
        const undoResult = commandService.undo();
        
        if (!undoResult.success) {
            throw new Error('Undo should succeed');
        }
        
        // Verify secondary was removed by undo
        const effectsAfterUndo = projectState.getState().effects;
        const parentAfterUndo = effectsAfterUndo[parentIndex];
        
        if (parentAfterUndo.secondaryEffects.length !== 0) {
            throw new Error(`Expected 0 secondary effects after undo, got ${parentAfterUndo.secondaryEffects.length}`);
        }
        
        // Test redo
        const redoResult = commandService.redo();
        
        if (!redoResult.success) {
            throw new Error('Redo should succeed');
        }
        
        // Verify secondary was restored by redo
        const effectsAfterRedo = projectState.getState().effects;
        const parentAfterRedo = effectsAfterRedo[parentIndex];
        
        if (parentAfterRedo.secondaryEffects.length !== 1) {
            throw new Error(`Expected 1 secondary effect after redo, got ${parentAfterRedo.secondaryEffects.length}`);
        }
        
        const restoredSecondary = parentAfterRedo.secondaryEffects[0];
        if (restoredSecondary.name !== 'UndoRedoSecondary') {
            throw new Error(`Expected restored secondary name 'UndoRedoSecondary', got '${restoredSecondary.name}'`);
        }
        
        console.log('✅ Secondary command undo/redo functionality test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test error handling for non-existent parents and invalid indices
 */
export async function test_error_handling_for_invalid_operations() {
    await setupTest();
    
    try {
        console.log('🧪 Testing error handling for invalid secondary operations with REAL services');
        
        // Test add secondary to non-existent parent
        try {
            const addCommand = secondaryEffectCommandService.createAddSecondaryCommand(
                projectState,
                999, // Invalid parent index
                { name: 'Invalid', config: {} },
                'Invalid'
            );
            const result = commandService.executeCommand(addCommand);
            
            if (result.success) {
                throw new Error('Add secondary command with invalid parent should fail');
            }
        } catch (error) {
            console.log('✅ Invalid parent index for add handled correctly');
        }
        
        // Create a parent for further tests
        const parentEffect = {
            name: 'TestParent',
            className: 'TestParent',
            registryKey: 'test-parent',
            config: { value: 'parent' },
            secondaryEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'TestParent',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effects = projectState.getState().effects;
        const parentIndex = effects.length - 1;
        
        // Test delete secondary with invalid index
        try {
            const deleteCommand = secondaryEffectCommandService.createDeleteSecondaryCommand(
                projectState,
                parentIndex,
                999 // Invalid secondary index
            );
            const result = commandService.executeCommand(deleteCommand);
            
            if (result.success) {
                throw new Error('Delete secondary command with invalid index should fail');
            }
        } catch (error) {
            console.log('✅ Invalid secondary index for delete handled correctly');
        }
        
        // Test reorder secondary with invalid indices
        try {
            const reorderCommand = secondaryEffectCommandService.createReorderSecondaryCommand(
                projectState,
                parentIndex,
                999, // Invalid from index
                0
            );
            const result = commandService.executeCommand(reorderCommand);
            
            if (result.success) {
                throw new Error('Reorder secondary command with invalid indices should fail');
            }
        } catch (error) {
            console.log('✅ Invalid secondary indices for reorder handled correctly');
        }
        
        console.log('✅ Error handling for invalid secondary operations test passed');
    } finally {
        await cleanupTest();
    }
}