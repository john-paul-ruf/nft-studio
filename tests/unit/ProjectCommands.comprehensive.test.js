/**
 * Comprehensive Test Suite: ProjectCommands
 * Purpose: Complete testing of all ProjectCommands before decomposition
 * Created as part of God Object Destruction Plan - Phase 6, Step 6.3
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import {
    UpdateEffectCommand,
    AddEffectCommand,
    DeleteEffectCommand,
    ChangeResolutionCommand,
    ToggleOrientationCommand,
    ChangeFramesCommand,
    ReorderEffectsCommand,
    AddSecondaryEffectCommand,
    ReorderSecondaryEffectsCommand,
    DeleteSecondaryEffectCommand,
    AddKeyframeEffectCommand,
    ReorderKeyframeEffectsCommand,
    DeleteKeyframeEffectCommand
} from '../../src/commands/ProjectCommands.js';

/**
 * Mock ProjectState for testing
 */
class MockProjectState {
    constructor(initialState = {}) {
        this.state = {
            effects: [],
            targetResolution: 1024,
            resolution: 1024,
            isHorizontal: true,
            numFrames: 100,
            ...initialState
        };
        this.updateCallCount = 0;
    }

    getState() {
        return this.state;
    }

    update(updates) {
        this.state = { ...this.state, ...updates };
        this.updateCallCount++;
    }

    setTargetResolution(resolution) {
        this.state.targetResolution = resolution;
        this.state.resolution = resolution;
    }

    setIsHorizontal(isHorizontal) {
        this.state.isHorizontal = isHorizontal;
    }

    reorderSecondaryEffects(parentIndex, sourceIndex, destinationIndex) {
        const effects = [...this.state.effects];
        const parentEffect = effects[parentIndex];
        const secondaryEffects = [...parentEffect.secondaryEffects];
        const [removed] = secondaryEffects.splice(sourceIndex, 1);
        secondaryEffects.splice(destinationIndex, 0, removed);
        effects[parentIndex] = { ...parentEffect, secondaryEffects };
        this.state.effects = effects;
    }

    reorderKeyframeEffects(parentIndex, sourceIndex, destinationIndex) {
        const effects = [...this.state.effects];
        const parentEffect = effects[parentIndex];
        const keyframeEffects = [...(parentEffect.attachedEffects?.keyFrame || [])];
        const [removed] = keyframeEffects.splice(sourceIndex, 1);
        keyframeEffects.splice(destinationIndex, 0, removed);
        effects[parentIndex] = {
            ...parentEffect,
            attachedEffects: {
                ...parentEffect.attachedEffects,
                keyFrame: keyframeEffects
            }
        };
        this.state.effects = effects;
    }
}

/**
 * Test: UpdateEffectCommand
 */
export async function testUpdateEffectCommand(testEnv) {
    console.log('🧪 Testing UpdateEffectCommand...');

    const mockEffect = { name: 'TestEffect', className: 'TestClass', config: { value: 10 } };
    const updatedEffect = { name: 'TestEffect', className: 'TestClass', config: { value: 20 } };
    const projectState = new MockProjectState({ effects: [mockEffect] });

    const command = new UpdateEffectCommand(projectState, 0, updatedEffect, 'TestEffect');

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    if (projectState.getState().effects[0].config.value !== 20) throw new Error('Effect should be updated');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    if (projectState.getState().effects[0].config.value !== 10) throw new Error('Effect should be restored');

    console.log('✅ UpdateEffectCommand tests passed');
    return { testName: 'UpdateEffectCommand', status: 'PASSED' };
}

/**
 * Test: AddEffectCommand
 */
export async function testAddEffectCommand(testEnv) {
    console.log('🧪 Testing AddEffectCommand...');

    const newEffect = { name: 'NewEffect', className: 'NewClass', config: {} };
    const projectState = new MockProjectState({ effects: [] });

    const command = new AddEffectCommand(projectState, newEffect, 'NewEffect', 'visual');

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    if (projectState.getState().effects.length !== 1) throw new Error('Effect should be added');
    if (projectState.getState().effects[0].name !== 'NewEffect') throw new Error('Correct effect added');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    if (projectState.getState().effects.length !== 0) throw new Error('Effect should be removed');

    console.log('✅ AddEffectCommand tests passed');
    return { testName: 'AddEffectCommand', status: 'PASSED' };
}

/**
 * Test: DeleteEffectCommand
 */
export async function testDeleteEffectCommand(testEnv) {
    console.log('🧪 Testing DeleteEffectCommand...');

    const effect1 = { name: 'Effect1', className: 'Class1' };
    const effect2 = { name: 'Effect2', className: 'Class2' };
    const projectState = new MockProjectState({ effects: [effect1, effect2] });

    const command = new DeleteEffectCommand(projectState, 0);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    if (projectState.getState().effects.length !== 1) throw new Error('Effect should be deleted');
    if (projectState.getState().effects[0].name !== 'Effect2') throw new Error('Correct effect remains');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    if (projectState.getState().effects.length !== 2) throw new Error('Effect should be restored');
    if (projectState.getState().effects[0].name !== 'Effect1') throw new Error('Effect restored at correct position');

    console.log('✅ DeleteEffectCommand tests passed');
    return { testName: 'DeleteEffectCommand', status: 'PASSED' };
}

/**
 * Test: ChangeResolutionCommand
 */
export async function testChangeResolutionCommand(testEnv) {
    console.log('🧪 Testing ChangeResolutionCommand...');

    const projectState = new MockProjectState({ targetResolution: 1024 });
    const command = new ChangeResolutionCommand(projectState, 2048);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    if (projectState.getState().targetResolution !== 2048) throw new Error('Resolution should be updated');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    if (projectState.getState().targetResolution !== 1024) throw new Error('Resolution should be restored');

    console.log('✅ ChangeResolutionCommand tests passed');
    return { testName: 'ChangeResolutionCommand', status: 'PASSED' };
}

/**
 * Test: ToggleOrientationCommand
 */
export async function testToggleOrientationCommand(testEnv) {
    console.log('🧪 Testing ToggleOrientationCommand...');

    const projectState = new MockProjectState({ isHorizontal: true });
    const command = new ToggleOrientationCommand(projectState);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    if (projectState.getState().isHorizontal !== false) throw new Error('Orientation should be toggled');

    // Test undo (toggle back)
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    if (projectState.getState().isHorizontal !== true) throw new Error('Orientation should be toggled back');

    console.log('✅ ToggleOrientationCommand tests passed');
    return { testName: 'ToggleOrientationCommand', status: 'PASSED' };
}

/**
 * Test: ChangeFramesCommand
 */
export async function testChangeFramesCommand(testEnv) {
    console.log('🧪 Testing ChangeFramesCommand...');

    const projectState = new MockProjectState({ numFrames: 100 });
    const command = new ChangeFramesCommand(projectState, 200);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    if (projectState.getState().numFrames !== 200) throw new Error('Frame count should be updated');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    if (projectState.getState().numFrames !== 100) throw new Error('Frame count should be restored');

    console.log('✅ ChangeFramesCommand tests passed');
    return { testName: 'ChangeFramesCommand', status: 'PASSED' };
}

/**
 * Test: ReorderEffectsCommand
 */
export async function testReorderEffectsCommand(testEnv) {
    console.log('🧪 Testing ReorderEffectsCommand...');

    const effect1 = { name: 'Effect1', className: 'Class1' };
    const effect2 = { name: 'Effect2', className: 'Class2' };
    const effect3 = { name: 'Effect3', className: 'Class3' };
    const projectState = new MockProjectState({ effects: [effect1, effect2, effect3] });

    const command = new ReorderEffectsCommand(projectState, 0, 2);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    const effects = projectState.getState().effects;
    if (effects[0].name !== 'Effect2') throw new Error('Effect order should be updated');
    if (effects[2].name !== 'Effect1') throw new Error('Effect moved to correct position');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    const restoredEffects = projectState.getState().effects;
    if (restoredEffects[0].name !== 'Effect1') throw new Error('Effect order should be restored');

    console.log('✅ ReorderEffectsCommand tests passed');
    return { testName: 'ReorderEffectsCommand', status: 'PASSED' };
}

/**
 * Test: AddSecondaryEffectCommand
 */
export async function testAddSecondaryEffectCommand(testEnv) {
    console.log('🧪 Testing AddSecondaryEffectCommand...');

    const parentEffect = { name: 'ParentEffect', className: 'ParentClass', secondaryEffects: [] };
    const secondaryEffect = { name: 'SecondaryEffect', className: 'SecondaryClass' };
    const projectState = new MockProjectState({ effects: [parentEffect] });

    const command = new AddSecondaryEffectCommand(projectState, 0, secondaryEffect, 'SecondaryEffect');

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    const parent = projectState.getState().effects[0];
    if (parent.secondaryEffects.length !== 1) throw new Error('Secondary effect should be added');
    if (parent.secondaryEffects[0].name !== 'SecondaryEffect') throw new Error('Correct secondary effect added');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    const restoredParent = projectState.getState().effects[0];
    if (restoredParent.secondaryEffects.length !== 0) throw new Error('Secondary effect should be removed');

    console.log('✅ AddSecondaryEffectCommand tests passed');
    return { testName: 'AddSecondaryEffectCommand', status: 'PASSED' };
}

/**
 * Test: DeleteSecondaryEffectCommand
 */
export async function testDeleteSecondaryEffectCommand(testEnv) {
    console.log('🧪 Testing DeleteSecondaryEffectCommand...');

    const secondary1 = { name: 'Secondary1', className: 'SecondaryClass1' };
    const secondary2 = { name: 'Secondary2', className: 'SecondaryClass2' };
    const parentEffect = { name: 'ParentEffect', className: 'ParentClass', secondaryEffects: [secondary1, secondary2] };
    const projectState = new MockProjectState({ effects: [parentEffect] });

    const command = new DeleteSecondaryEffectCommand(projectState, 0, 0);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    const parent = projectState.getState().effects[0];
    if (parent.secondaryEffects.length !== 1) throw new Error('Secondary effect should be deleted');
    if (parent.secondaryEffects[0].name !== 'Secondary2') throw new Error('Correct secondary effect remains');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    const restoredParent = projectState.getState().effects[0];
    if (restoredParent.secondaryEffects.length !== 2) throw new Error('Secondary effect should be restored');
    if (restoredParent.secondaryEffects[0].name !== 'Secondary1') throw new Error('Secondary effect restored at correct position');

    console.log('✅ DeleteSecondaryEffectCommand tests passed');
    return { testName: 'DeleteSecondaryEffectCommand', status: 'PASSED' };
}

/**
 * Test: ReorderSecondaryEffectsCommand
 */
export async function testReorderSecondaryEffectsCommand(testEnv) {
    console.log('🧪 Testing ReorderSecondaryEffectsCommand...');

    const secondary1 = { name: 'Secondary1', className: 'SecondaryClass1' };
    const secondary2 = { name: 'Secondary2', className: 'SecondaryClass2' };
    const secondary3 = { name: 'Secondary3', className: 'SecondaryClass3' };
    const parentEffect = { name: 'ParentEffect', className: 'ParentClass', secondaryEffects: [secondary1, secondary2, secondary3] };
    const projectState = new MockProjectState({ effects: [parentEffect] });

    const command = new ReorderSecondaryEffectsCommand(projectState, 0, 0, 2);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    const parent = projectState.getState().effects[0];
    if (parent.secondaryEffects[0].name !== 'Secondary2') throw new Error('Secondary effects reordered');
    if (parent.secondaryEffects[2].name !== 'Secondary1') throw new Error('Secondary effect moved to correct position');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    const restoredParent = projectState.getState().effects[0];
    if (restoredParent.secondaryEffects[0].name !== 'Secondary1') throw new Error('Secondary effects order restored');

    console.log('✅ ReorderSecondaryEffectsCommand tests passed');
    return { testName: 'ReorderSecondaryEffectsCommand', status: 'PASSED' };
}

/**
 * Test: AddKeyframeEffectCommand
 */
export async function testAddKeyframeEffectCommand(testEnv) {
    console.log('🧪 Testing AddKeyframeEffectCommand...');

    const parentEffect = { name: 'ParentEffect', className: 'ParentClass', attachedEffects: { keyFrame: [] } };
    const keyframeEffect = { name: 'KeyframeEffect', className: 'KeyframeClass', frame: 50 };
    const projectState = new MockProjectState({ effects: [parentEffect] });

    const command = new AddKeyframeEffectCommand(projectState, 0, keyframeEffect, 'KeyframeEffect', 50);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    const parent = projectState.getState().effects[0];
    if (parent.attachedEffects.keyFrame.length !== 1) throw new Error('Keyframe effect should be added');
    if (parent.attachedEffects.keyFrame[0].name !== 'KeyframeEffect') throw new Error('Correct keyframe effect added');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    const restoredParent = projectState.getState().effects[0];
    if (restoredParent.attachedEffects.keyFrame.length !== 0) throw new Error('Keyframe effect should be removed');

    console.log('✅ AddKeyframeEffectCommand tests passed');
    return { testName: 'AddKeyframeEffectCommand', status: 'PASSED' };
}

/**
 * Test: DeleteKeyframeEffectCommand
 */
export async function testDeleteKeyframeEffectCommand(testEnv) {
    console.log('🧪 Testing DeleteKeyframeEffectCommand...');

    const keyframe1 = { name: 'Keyframe1', className: 'KeyframeClass1', frame: 25 };
    const keyframe2 = { name: 'Keyframe2', className: 'KeyframeClass2', frame: 75 };
    const parentEffect = { name: 'ParentEffect', className: 'ParentClass', attachedEffects: { keyFrame: [keyframe1, keyframe2] } };
    const projectState = new MockProjectState({ effects: [parentEffect] });

    const command = new DeleteKeyframeEffectCommand(projectState, 0, 0);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    const parent = projectState.getState().effects[0];
    if (parent.attachedEffects.keyFrame.length !== 1) throw new Error('Keyframe effect should be deleted');
    if (parent.attachedEffects.keyFrame[0].name !== 'Keyframe2') throw new Error('Correct keyframe effect remains');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    const restoredParent = projectState.getState().effects[0];
    if (restoredParent.attachedEffects.keyFrame.length !== 2) throw new Error('Keyframe effect should be restored');
    if (restoredParent.attachedEffects.keyFrame[0].name !== 'Keyframe1') throw new Error('Keyframe effect restored at correct position');

    console.log('✅ DeleteKeyframeEffectCommand tests passed');
    return { testName: 'DeleteKeyframeEffectCommand', status: 'PASSED' };
}

/**
 * Test: ReorderKeyframeEffectsCommand
 */
export async function testReorderKeyframeEffectsCommand(testEnv) {
    console.log('🧪 Testing ReorderKeyframeEffectsCommand...');

    const keyframe1 = { name: 'Keyframe1', className: 'KeyframeClass1', frame: 25 };
    const keyframe2 = { name: 'Keyframe2', className: 'KeyframeClass2', frame: 50 };
    const keyframe3 = { name: 'Keyframe3', className: 'KeyframeClass3', frame: 75 };
    const parentEffect = { name: 'ParentEffect', className: 'ParentClass', attachedEffects: { keyFrame: [keyframe1, keyframe2, keyframe3] } };
    const projectState = new MockProjectState({ effects: [parentEffect] });

    const command = new ReorderKeyframeEffectsCommand(projectState, 0, 0, 2);

    // Test execute
    const result = command.execute();
    if (result.success !== true) throw new Error('Execute should return success');
    const parent = projectState.getState().effects[0];
    if (parent.attachedEffects.keyFrame[0].name !== 'Keyframe2') throw new Error('Keyframe effects reordered');
    if (parent.attachedEffects.keyFrame[2].name !== 'Keyframe1') throw new Error('Keyframe effect moved to correct position');

    // Test undo
    const undoResult = command.undo();
    if (undoResult.success !== true) throw new Error('Undo should return success');
    const restoredParent = projectState.getState().effects[0];
    if (restoredParent.attachedEffects.keyFrame[0].name !== 'Keyframe1') throw new Error('Keyframe effects order restored');

    console.log('✅ ReorderKeyframeEffectsCommand tests passed');
    return { testName: 'ReorderKeyframeEffectsCommand', status: 'PASSED' };
}

// Test registration
export const tests = [
    {
        name: 'Update Effect Command',
        category: 'unit',
        fn: testUpdateEffectCommand,
        description: 'Test UpdateEffectCommand execute and undo'
    },
    {
        name: 'Add Effect Command',
        category: 'unit',
        fn: testAddEffectCommand,
        description: 'Test AddEffectCommand execute and undo'
    },
    {
        name: 'Delete Effect Command',
        category: 'unit',
        fn: testDeleteEffectCommand,
        description: 'Test DeleteEffectCommand execute and undo'
    },
    {
        name: 'Change Resolution Command',
        category: 'unit',
        fn: testChangeResolutionCommand,
        description: 'Test ChangeResolutionCommand execute and undo'
    },
    {
        name: 'Toggle Orientation Command',
        category: 'unit',
        fn: testToggleOrientationCommand,
        description: 'Test ToggleOrientationCommand execute and undo'
    },
    {
        name: 'Change Frames Command',
        category: 'unit',
        fn: testChangeFramesCommand,
        description: 'Test ChangeFramesCommand execute and undo'
    },
    {
        name: 'Reorder Effects Command',
        category: 'unit',
        fn: testReorderEffectsCommand,
        description: 'Test ReorderEffectsCommand execute and undo'
    },
    {
        name: 'Add Secondary Effect Command',
        category: 'unit',
        fn: testAddSecondaryEffectCommand,
        description: 'Test AddSecondaryEffectCommand execute and undo'
    },
    {
        name: 'Delete Secondary Effect Command',
        category: 'unit',
        fn: testDeleteSecondaryEffectCommand,
        description: 'Test DeleteSecondaryEffectCommand execute and undo'
    },
    {
        name: 'Reorder Secondary Effects Command',
        category: 'unit',
        fn: testReorderSecondaryEffectsCommand,
        description: 'Test ReorderSecondaryEffectsCommand execute and undo'
    },
    {
        name: 'Add Keyframe Effect Command',
        category: 'unit',
        fn: testAddKeyframeEffectCommand,
        description: 'Test AddKeyframeEffectCommand execute and undo'
    },
    {
        name: 'Delete Keyframe Effect Command',
        category: 'unit',
        fn: testDeleteKeyframeEffectCommand,
        description: 'Test DeleteKeyframeEffectCommand execute and undo'
    },
    {
        name: 'Reorder Keyframe Effects Command',
        category: 'unit',
        fn: testReorderKeyframeEffectsCommand,
        description: 'Test ReorderKeyframeEffectsCommand execute and undo'
    }
];