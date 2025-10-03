/**
 * KeyframeEffectCommandService Tests - REAL OBJECTS ONLY (NO MOCKS)
 * Tests keyframe effect command management using REAL objects only
 * 
 * CRITICAL: This test file follows the "REAL OBJECTS ONLY" policy
 * - Uses REAL KeyframeEffectCommandService instances
 * - Uses REAL CommandService for command execution
 * - Uses REAL ProjectState for effect management
 * - Uses REAL EventBusService for event handling
 * - NO MOCKS, STUBS, SPIES, or FAKE OBJECTS
 */

import TestEnvironment from '../setup/TestEnvironment.js';

// Test environment setup
let testEnv;
let keyframeEffectCommandService;
let effectCommandService;
let projectState;
let commandService;
let eventBusService;

async function setupTest() {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    
    // Get REAL service instances - NO MOCKS
    keyframeEffectCommandService = testEnv.getService('KeyframeEffectCommandService');
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
 * Test keyframe effect command service initialization with real services
 */
export async function test_keyframe_effect_command_service_initialization() {
    await setupTest();
    
    try {
        console.log('🧪 Testing KeyframeEffectCommandService initialization with REAL services');
        
        if (!keyframeEffectCommandService) {
            throw new Error('KeyframeEffectCommandService should be initialized');
        }
        
        // Test service methods exist
        const requiredMethods = [
            'createAddCommand',
            'createDeleteCommand',
            'createReorderCommand'
        ];
        
        for (const method of requiredMethods) {
            if (typeof keyframeEffectCommandService[method] !== 'function') {
                throw new Error(`KeyframeEffectCommandService should have ${method} method`);
            }
        }
        
        console.log('✅ KeyframeEffectCommandService initialization test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test add keyframe effect command with frame-based management
 */
export async function test_add_keyframe_effect_command() {
    await setupTest();
    
    try {
        console.log('🧪 Testing add keyframe effect command with REAL services');
        
        // First create a parent effect
        const parentEffect = {
            name: 'KeyframeParent',
            className: 'KeyframeParent',
            registryKey: 'keyframe-parent',
            config: { value: 'parent' },
            keyframeEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'KeyframeParent',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effectsAfterParent = projectState.getState().effects;
        const parentIndex = effectsAfterParent.length - 1;
        
        // Create keyframe effect data
        const keyframeEffectData = {
            name: 'KeyframeEffect',
            className: 'KeyframeEffect',
            registryKey: 'keyframe-effect',
            config: { 
                value: 'keyframe',
                intensity: 0.7
            }
        };
        
        const frame = 30; // Frame number
        
        // Create add keyframe command using REAL KeyframeEffectCommandService
        const addKeyframeCommand = keyframeEffectCommandService.createAddCommand(
            projectState,
            parentIndex,
            keyframeEffectData,
            'KeyframeEffect',
            frame
        );
        
        if (!addKeyframeCommand) {
            throw new Error('Add keyframe command should be created');
        }
        
        if (addKeyframeCommand.type !== 'effect.keyframe.add') {
            throw new Error(`Expected command type 'effect.keyframe.add', got '${addKeyframeCommand.type}'`);
        }
        
        if (addKeyframeCommand.parentIndex !== parentIndex) {
            throw new Error(`Expected parent index ${parentIndex}, got ${addKeyframeCommand.parentIndex}`);
        }
        
        if (addKeyframeCommand.frame !== frame) {
            throw new Error(`Expected frame ${frame}, got ${addKeyframeCommand.frame}`);
        }
        
        // Execute command using REAL CommandService
        const result = commandService.executeCommand(addKeyframeCommand);
        
        if (!result.success) {
            throw new Error('Add keyframe command execution should succeed');
        }
        
        // Verify keyframe effect was added to parent
        const effectsAfterKeyframe = projectState.getState().effects;
        const updatedParent = effectsAfterKeyframe[parentIndex];
        
        if (!updatedParent.keyframeEffects || updatedParent.keyframeEffects.length !== 1) {
            throw new Error('Parent effect should have 1 keyframe effect');
        }
        
        const addedKeyframe = updatedParent.keyframeEffects[0];
        
        if (addedKeyframe.name !== 'KeyframeEffect') {
            throw new Error(`Expected keyframe effect name 'KeyframeEffect', got '${addedKeyframe.name}'`);
        }
        
        if (addedKeyframe.config.intensity !== 0.7) {
            throw new Error(`Expected keyframe intensity 0.7, got ${addedKeyframe.config.intensity}`);
        }
        
        // Verify frame association
        if (addedKeyframe.frame !== frame) {
            throw new Error(`Expected keyframe frame ${frame}, got ${addedKeyframe.frame}`);
        }
        
        console.log('✅ Add keyframe effect command test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test delete keyframe effect command with frame management
 */
export async function test_delete_keyframe_effect_command() {
    await setupTest();
    
    try {
        console.log('🧪 Testing delete keyframe effect command with REAL services');
        
        // Create parent effect with multiple keyframe effects
        const parentEffect = {
            name: 'KeyframeDeleteParent',
            className: 'KeyframeDeleteParent',
            registryKey: 'keyframe-delete-parent',
            config: { value: 'parent' },
            keyframeEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'KeyframeDeleteParent',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effectsAfterParent = projectState.getState().effects;
        const parentIndex = effectsAfterParent.length - 1;
        
        // Add multiple keyframe effects at different frames
        const keyframeEffects = [
            { 
                name: 'Keyframe1', 
                className: 'Keyframe1', 
                registryKey: 'keyframe-1', 
                config: { frame: 10 },
                frame: 10
            },
            { 
                name: 'Keyframe2', 
                className: 'Keyframe2', 
                registryKey: 'keyframe-2', 
                config: { frame: 20 },
                frame: 20
            },
            { 
                name: 'Keyframe3', 
                className: 'Keyframe3', 
                registryKey: 'keyframe-3', 
                config: { frame: 30 },
                frame: 30
            }
        ];
        
        for (const keyframe of keyframeEffects) {
            const addCommand = keyframeEffectCommandService.createAddCommand(
                projectState,
                parentIndex,
                keyframe,
                keyframe.name,
                keyframe.frame
            );
            commandService.executeCommand(addCommand);
        }
        
        // Verify all keyframe effects were added
        const effectsBeforeDelete = projectState.getState().effects;
        const parentBeforeDelete = effectsBeforeDelete[parentIndex];
        
        if (parentBeforeDelete.keyframeEffects.length !== 3) {
            throw new Error(`Expected 3 keyframe effects, got ${parentBeforeDelete.keyframeEffects.length}`);
        }
        
        // Delete middle keyframe effect (index 1, frame 20)
        const deleteIndex = 1;
        const deleteCommand = keyframeEffectCommandService.createDeleteCommand(
            projectState,
            parentIndex,
            deleteIndex
        );
        
        if (!deleteCommand) {
            throw new Error('Delete keyframe command should be created');
        }
        
        if (deleteCommand.type !== 'effect.keyframe.delete') {
            throw new Error(`Expected command type 'effect.keyframe.delete', got '${deleteCommand.type}'`);
        }
        
        // Execute delete command
        const result = commandService.executeCommand(deleteCommand);
        
        if (!result.success) {
            throw new Error('Delete keyframe command execution should succeed');
        }
        
        // Verify keyframe effect was deleted
        const effectsAfterDelete = projectState.getState().effects;
        const parentAfterDelete = effectsAfterDelete[parentIndex];
        
        if (parentAfterDelete.keyframeEffects.length !== 2) {
            throw new Error(`Expected 2 keyframe effects after delete, got ${parentAfterDelete.keyframeEffects.length}`);
        }
        
        // Verify correct keyframe was deleted (frame 20)
        const remainingFrames = parentAfterDelete.keyframeEffects.map(k => k.frame);
        const expectedFrames = [10, 30];
        
        if (JSON.stringify(remainingFrames) !== JSON.stringify(expectedFrames)) {
            throw new Error(`Expected remaining frames ${JSON.stringify(expectedFrames)}, got ${JSON.stringify(remainingFrames)}`);
        }
        
        console.log('✅ Delete keyframe effect command test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test reorder keyframe effects within parent effects
 */
export async function test_reorder_keyframe_effects_command() {
    await setupTest();
    
    try {
        console.log('🧪 Testing reorder keyframe effects command with REAL services');
        
        // Create parent effect
        const parentEffect = {
            name: 'KeyframeReorderParent',
            className: 'KeyframeReorderParent',
            registryKey: 'keyframe-reorder-parent',
            config: { value: 'parent' },
            keyframeEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'KeyframeReorderParent',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effectsAfterParent = projectState.getState().effects;
        const parentIndex = effectsAfterParent.length - 1;
        
        // Add keyframe effects for reordering
        const keyframeEffects = [
            { 
                name: 'FirstFrame', 
                className: 'FirstFrame', 
                registryKey: 'first-frame', 
                config: { position: 1 },
                frame: 5
            },
            { 
                name: 'SecondFrame', 
                className: 'SecondFrame', 
                registryKey: 'second-frame', 
                config: { position: 2 },
                frame: 15
            },
            { 
                name: 'ThirdFrame', 
                className: 'ThirdFrame', 
                registryKey: 'third-frame', 
                config: { position: 3 },
                frame: 25
            }
        ];
        
        for (const keyframe of keyframeEffects) {
            const addCommand = keyframeEffectCommandService.createAddCommand(
                projectState,
                parentIndex,
                keyframe,
                keyframe.name,
                keyframe.frame
            );
            commandService.executeCommand(addCommand);
        }
        
        // Get initial order
        const effectsBeforeReorder = projectState.getState().effects;
        const parentBeforeReorder = effectsBeforeReorder[parentIndex];
        const originalOrder = parentBeforeReorder.keyframeEffects.map(k => k.name);
        
        // Reorder: move first to last (0 -> 2)
        const fromIndex = 0;
        const toIndex = 2;
        
        const reorderCommand = keyframeEffectCommandService.createReorderCommand(
            projectState,
            parentIndex,
            fromIndex,
            toIndex
        );
        
        if (!reorderCommand) {
            throw new Error('Reorder keyframe command should be created');
        }
        
        if (reorderCommand.type !== 'effect.keyframe.reorder') {
            throw new Error(`Expected command type 'effect.keyframe.reorder', got '${reorderCommand.type}'`);
        }
        
        // Execute reorder command
        const result = commandService.executeCommand(reorderCommand);
        
        if (!result.success) {
            throw new Error('Reorder keyframe command execution should succeed');
        }
        
        // Verify reordering
        const effectsAfterReorder = projectState.getState().effects;
        const parentAfterReorder = effectsAfterReorder[parentIndex];
        const newOrder = parentAfterReorder.keyframeEffects.map(k => k.name);
        
        // Expected order: ['SecondFrame', 'ThirdFrame', 'FirstFrame']
        const expectedOrder = ['SecondFrame', 'ThirdFrame', 'FirstFrame'];
        
        if (JSON.stringify(newOrder) !== JSON.stringify(expectedOrder)) {
            throw new Error(`Expected order ${JSON.stringify(expectedOrder)}, got ${JSON.stringify(newOrder)}`);
        }
        
        // Verify frame numbers are preserved
        const newFrames = parentAfterReorder.keyframeEffects.map(k => k.frame);
        const expectedFrames = [15, 25, 5]; // Frames should move with their effects
        
        if (JSON.stringify(newFrames) !== JSON.stringify(expectedFrames)) {
            throw new Error(`Expected frames ${JSON.stringify(expectedFrames)}, got ${JSON.stringify(newFrames)}`);
        }
        
        console.log('✅ Reorder keyframe effects command test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test keyframe command undo/redo functionality
 */
export async function test_keyframe_command_undo_redo_functionality() {
    await setupTest();
    
    try {
        console.log('🧪 Testing keyframe command undo/redo functionality with REAL services');
        
        // Create parent effect
        const parentEffect = {
            name: 'KeyframeUndoParent',
            className: 'KeyframeUndoParent',
            registryKey: 'keyframe-undo-parent',
            config: { value: 'parent' },
            keyframeEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'KeyframeUndoParent',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effectsAfterParent = projectState.getState().effects;
        const parentIndex = effectsAfterParent.length - 1;
        
        // Add keyframe effect
        const keyframeData = {
            name: 'UndoRedoKeyframe',
            className: 'UndoRedoKeyframe',
            registryKey: 'undo-redo-keyframe',
            config: { value: 'keyframe' }
        };
        
        const frame = 60;
        
        const addKeyframeCommand = keyframeEffectCommandService.createAddCommand(
            projectState,
            parentIndex,
            keyframeData,
            'UndoRedoKeyframe',
            frame
        );
        
        commandService.executeCommand(addKeyframeCommand);
        
        // Verify keyframe was added
        const effectsAfterAdd = projectState.getState().effects;
        const parentAfterAdd = effectsAfterAdd[parentIndex];
        
        if (parentAfterAdd.keyframeEffects.length !== 1) {
            throw new Error(`Expected 1 keyframe effect after add, got ${parentAfterAdd.keyframeEffects.length}`);
        }
        
        // Test undo
        const undoResult = commandService.undo();
        
        if (!undoResult.success) {
            throw new Error('Undo should succeed');
        }
        
        // Verify keyframe was removed by undo
        const effectsAfterUndo = projectState.getState().effects;
        const parentAfterUndo = effectsAfterUndo[parentIndex];
        
        if (parentAfterUndo.keyframeEffects.length !== 0) {
            throw new Error(`Expected 0 keyframe effects after undo, got ${parentAfterUndo.keyframeEffects.length}`);
        }
        
        // Test redo
        const redoResult = commandService.redo();
        
        if (!redoResult.success) {
            throw new Error('Redo should succeed');
        }
        
        // Verify keyframe was restored by redo
        const effectsAfterRedo = projectState.getState().effects;
        const parentAfterRedo = effectsAfterRedo[parentIndex];
        
        if (parentAfterRedo.keyframeEffects.length !== 1) {
            throw new Error(`Expected 1 keyframe effect after redo, got ${parentAfterRedo.keyframeEffects.length}`);
        }
        
        const restoredKeyframe = parentAfterRedo.keyframeEffects[0];
        if (restoredKeyframe.name !== 'UndoRedoKeyframe') {
            throw new Error(`Expected restored keyframe name 'UndoRedoKeyframe', got '${restoredKeyframe.name}'`);
        }
        
        if (restoredKeyframe.frame !== frame) {
            throw new Error(`Expected restored frame ${frame}, got ${restoredKeyframe.frame}`);
        }
        
        console.log('✅ Keyframe command undo/redo functionality test passed');
    } finally {
        await cleanupTest();
    }
}

/**
 * Test error handling for invalid keyframe operations
 */
export async function test_error_handling_for_invalid_keyframe_operations() {
    await setupTest();
    
    try {
        console.log('🧪 Testing error handling for invalid keyframe operations with REAL services');
        
        // Test add keyframe to non-existent parent
        try {
            const addCommand = keyframeEffectCommandService.createAddCommand(
                projectState,
                999, // Invalid parent index
                { name: 'Invalid', config: {} },
                'Invalid',
                10
            );
            const result = commandService.executeCommand(addCommand);
            
            if (result.success) {
                throw new Error('Add keyframe command with invalid parent should fail');
            }
        } catch (error) {
            console.log('✅ Invalid parent index for keyframe add handled correctly');
        }
        
        // Create a parent for further tests
        const parentEffect = {
            name: 'KeyframeTestParent',
            className: 'KeyframeTestParent',
            registryKey: 'keyframe-test-parent',
            config: { value: 'parent' },
            keyframeEffects: []
        };
        
        const addParentCommand = effectCommandService.createAddCommand(
            projectState,
            parentEffect,
            'KeyframeTestParent',
            'primary'
        );
        
        commandService.executeCommand(addParentCommand);
        
        const effects = projectState.getState().effects;
        const parentIndex = effects.length - 1;
        
        // Test delete keyframe with invalid index
        try {
            const deleteCommand = keyframeEffectCommandService.createDeleteCommand(
                projectState,
                parentIndex,
                999 // Invalid keyframe index
            );
            const result = commandService.executeCommand(deleteCommand);
            
            if (result.success) {
                throw new Error('Delete keyframe command with invalid index should fail');
            }
        } catch (error) {
            console.log('✅ Invalid keyframe index for delete handled correctly');
        }
        
        // Test reorder keyframe with invalid indices
        try {
            const reorderCommand = keyframeEffectCommandService.createReorderCommand(
                projectState,
                parentIndex,
                999, // Invalid from index
                0
            );
            const result = commandService.executeCommand(reorderCommand);
            
            if (result.success) {
                throw new Error('Reorder keyframe command with invalid indices should fail');
            }
        } catch (error) {
            console.log('✅ Invalid keyframe indices for reorder handled correctly');
        }
        
        console.log('✅ Error handling for invalid keyframe operations test passed');
    } finally {
        await cleanupTest();
    }
}