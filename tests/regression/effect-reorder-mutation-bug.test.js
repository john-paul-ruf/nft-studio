/**
 * Regression Test: Effect Reorder Mutation Bug
 * 
 * Bug Description:
 * When you add effect A, edit effect A, add effect B, reorder B to index 0, 
 * and then edit effect B, it changes both A and B values.
 * 
 * Root Cause:
 * Commands were storing direct references to effect objects instead of deep clones.
 * When effects were reordered, the same object reference was moved to a different index,
 * causing multiple commands to share the same previousEffect reference.
 * 
 * Fix:
 * All command services now deep clone effects when storing them for undo operations.
 */

import ProjectState from '../../src/models/ProjectState.js';
import { Effect } from '../../src/models/Effect.js';
import { 
    AddEffectCommand, 
    UpdateEffectCommand, 
    ReorderEffectsCommand,
    AddSecondaryEffectCommand,
    UpdateSecondaryEffectCommand,
    ReorderSecondaryEffectsCommand
} from '../../src/commands/ProjectCommands.js';
import { EventBusService } from '../../src/services/EventBusService.js';
import { LoggerService } from '../../src/services/LoggerService.js';
import { CommandService } from '../../src/services/CommandService.js';

export async function testEffectReorderMutationBug(testEnv) {
    console.log('🧪 Testing effect reorder mutation bug...');
    
    // Setup services
    const eventBus = new EventBusService();
    const logger = new LoggerService();
    const commandService = new CommandService({ eventBus, logger });
    const projectState = new ProjectState();
    
    // Initialize project
    projectState.setTargetResolution('1080p');
    projectState.setIsHorizontal(true);

    // Step 1: Add effect A
    const effectA = Effect.fromPOJO({
        id: 'effect-a',
        name: 'Effect A',
        className: 'TestEffect',
        registryKey: 'test-effect-a',
        type: 'primary',
        config: { value: 'A-initial' }
    });

    const addCommandA = new AddEffectCommand(projectState, effectA, 'Effect A');
    await commandService.execute(addCommandA);

    // Verify effect A was added
    let effects = projectState.getState().effects;
    if (effects.length !== 1) {
        throw new Error(`Expected 1 effect, got ${effects.length}`);
    }
    if (effects[0].config.value !== 'A-initial') {
        throw new Error(`Expected effect A config.value to be 'A-initial', got '${effects[0].config.value}'`);
    }

    // Step 2: Edit effect A
    const updatedEffectA = {
        ...effects[0],
        config: {
            ...effects[0].config,
            value: 'A-edited'
        }
    };
    const updateCommandA = new UpdateEffectCommand(projectState, 0, updatedEffectA, 'Effect A');
    await commandService.execute(updateCommandA);

    // Verify effect A was edited
    effects = projectState.getState().effects;
    if (effects[0].config.value !== 'A-edited') {
        throw new Error(`Expected effect A config.value to be 'A-edited', got '${effects[0].config.value}'`);
    }

    // Step 3: Add effect B
    const effectB = Effect.fromPOJO({
        id: 'effect-b',
        name: 'Effect B',
        className: 'TestEffect',
        registryKey: 'test-effect-b',
        type: 'primary',
        config: { value: 'B-initial' }
    });

    const addCommandB = new AddEffectCommand(projectState, effectB, 'Effect B');
    await commandService.execute(addCommandB);

    // Verify effect B was added
    effects = projectState.getState().effects;
    if (effects.length !== 2) {
        throw new Error(`Expected 2 effects, got ${effects.length}`);
    }
    if (effects[1].config.value !== 'B-initial') {
        throw new Error(`Expected effect B config.value to be 'B-initial', got '${effects[1].config.value}'`);
    }

    // Step 4: Reorder B to index 0 (move B before A)
    const reorderCommand = new ReorderEffectsCommand(projectState, 1, 0);
    await commandService.execute(reorderCommand);

    // Verify reorder happened
    effects = projectState.getState().effects;
    if (effects[0].id !== 'effect-b') {
        throw new Error(`Expected effect B at index 0, got ${effects[0].id}`);
    }
    if (effects[1].id !== 'effect-a') {
        throw new Error(`Expected effect A at index 1, got ${effects[1].id}`);
    }

    // Step 5: Edit effect B (now at index 0)
    const updatedEffectB = {
        ...effects[0],
        config: {
            ...effects[0].config,
            value: 'B-edited'
        }
    };
    const updateCommandB = new UpdateEffectCommand(projectState, 0, updatedEffectB, 'Effect B');
    await commandService.execute(updateCommandB);

    // Verify effect B was edited
    effects = projectState.getState().effects;
    if (effects[0].config.value !== 'B-edited') {
        throw new Error(`Expected effect B config.value to be 'B-edited', got '${effects[0].config.value}'`);
    }

    // 🔒 CRITICAL TEST: Effect A should NOT have been changed
    if (effects[1].config.value !== 'A-edited') {
        throw new Error(
            `BUG DETECTED: Effect A was mutated! ` +
            `Expected 'A-edited', got '${effects[1].config.value}'. ` +
            `This indicates the reference sharing bug is still present.`
        );
    }

    // Additional verification: Undo should work correctly
    await commandService.undo(); // Undo edit B
    effects = projectState.getState().effects;
    if (effects[0].config.value !== 'B-initial') {
        throw new Error(`Expected effect B to be restored to 'B-initial', got '${effects[0].config.value}'`);
    }
    if (effects[1].config.value !== 'A-edited') {
        throw new Error(`Effect A should still be 'A-edited', got '${effects[1].config.value}'`);
    }

    await commandService.undo(); // Undo reorder
    effects = projectState.getState().effects;
    if (effects[0].id !== 'effect-a') {
        throw new Error(`Expected effect A at index 0 after undo reorder, got ${effects[0].id}`);
    }
    if (effects[1].id !== 'effect-b') {
        throw new Error(`Expected effect B at index 1 after undo reorder, got ${effects[1].id}`);
    }

    await commandService.undo(); // Undo add B
    effects = projectState.getState().effects;
    if (effects.length !== 1) {
        throw new Error(`Expected 1 effect after undo add B, got ${effects.length}`);
    }

    await commandService.undo(); // Undo edit A
    effects = projectState.getState().effects;
    if (effects[0].config.value !== 'A-initial') {
        throw new Error(`Expected effect A to be restored to 'A-initial', got '${effects[0].config.value}'`);
    }

    console.log('✅ Effect reorder mutation bug test passed');
}

export async function testSecondaryEffectReorderMutationBug(testEnv) {
    console.log('🧪 Testing secondary effect reorder mutation bug...');
    
    // Setup local service instances for test isolation
    const eventBus = new EventBusService();
    const logger = new LoggerService();
    const commandService = new CommandService({ eventBus, logger });
    
    const projectState = new ProjectState();
    projectState.setTargetResolution('1080p');
    projectState.setIsHorizontal(true);

    // Add parent effect
    const parentEffect = Effect.fromPOJO({
        id: 'parent',
        name: 'Parent',
        className: 'ParentEffect',
        registryKey: 'parent',
        type: 'primary',
        config: { value: 'parent' },
        secondaryEffects: []
    });

    const addParentCommand = new AddEffectCommand(
        projectState,
        parentEffect,
        'Parent',
        'primary'
    );
    await commandService.execute(addParentCommand);

    // Add secondary effect A
    const secondaryA = Effect.fromPOJO({
        id: 'secondary-a',
        name: 'Secondary A',
        className: 'SecondaryA',
        registryKey: 'secondary-a',
        type: 'secondary',
        config: { value: 'A-initial' }
    });

    const addSecondaryA = new AddSecondaryEffectCommand(
        projectState,
        0, // parent index
        secondaryA,
        'Secondary A'
    );
    await commandService.execute(addSecondaryA);

    // Edit secondary A
    const updateSecondaryA = new UpdateSecondaryEffectCommand(
        projectState,
        0, // parent index
        0, // secondary index
        { config: { value: 'A-edited' } }
    );
    await commandService.execute(updateSecondaryA);

    // Add secondary effect B
    const secondaryB = Effect.fromPOJO({
        id: 'secondary-b',
        name: 'Secondary B',
        className: 'SecondaryB',
        registryKey: 'secondary-b',
        type: 'secondary',
        config: { value: 'B-initial' }
    });

    const addSecondaryB = new AddSecondaryEffectCommand(
        projectState,
        0, // parent index
        secondaryB,
        'Secondary B'
    );
    await commandService.execute(addSecondaryB);

    // Reorder B to index 0
    const reorderSecondary = new ReorderSecondaryEffectsCommand(
        projectState,
        0, // parent index
        1, // from index
        0  // to index
    );
    await commandService.execute(reorderSecondary);

    // Edit secondary B
    const updateSecondaryB = new UpdateSecondaryEffectCommand(
        projectState,
        0, // parent index
        0, // secondary index (B is now at 0)
        { config: { value: 'B-edited' } }
    );
    await commandService.execute(updateSecondaryB);

    // Verify secondary A was not mutated
    const effects = projectState.getState().effects;
    const parent = effects[0];
    const secondaryEffects = parent.secondaryEffects;

    if (secondaryEffects[0].config.value !== 'B-edited') {
        throw new Error(`Expected secondary B at index 0 to be 'B-edited', got '${secondaryEffects[0].config.value}'`);
    }

    if (secondaryEffects[1].config.value !== 'A-edited') {
        throw new Error(
            `BUG DETECTED: Secondary A was mutated! ` +
            `Expected 'A-edited', got '${secondaryEffects[1].config.value}'`
        );
    }

    console.log('✅ Secondary effect reorder mutation bug test passed');
}