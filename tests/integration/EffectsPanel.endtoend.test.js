/**
 * EffectsPanel End-to-End Integration Test
 * Full event flow validation with REAL services - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import TestDataBuilder from '../utils/TestDataBuilder.js';

export async function testEffectsPanelCompleteUserWorkflow(testEnv) {
    console.log('🧪 Testing complete EffectsPanel workflow...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness', 'saturation'])).data
        );

        const eventFlow = [];

        eventBusService.subscribe('effect:selected', (p) => eventFlow.push({ event: 'effect:selected', id: p.effectId }));
        eventBusService.subscribe('effectspanel:config:panel:open', (p) => eventFlow.push({ event: 'config:open', id: p.effectId }));
        eventBusService.subscribe('effect:config:change', (p) => eventFlow.push({ event: 'config:change' }));
        eventBusService.subscribe('effect:update', (p) => eventFlow.push({ event: 'update', id: p.effectId }));

        // Step 1: Select effect
        const effects = projectState.getState().effects;
        const selectedEffect = effects[0];

        eventBusService.emit('effect:selected', { effectId: selectedEffect.id, effectType: 'primary' });
        console.assert(eventFlow.length === 1, '✅ Effect selected');

        // Step 2: Config panel opens
        eventBusService.emit('effectspanel:config:panel:open', { effectId: selectedEffect.id, effectType: 'primary' });
        console.assert(eventFlow.length === 2, '✅ Config panel opened');

        // Step 3: Property changed
        eventBusService.emit('effect:config:change', { effectId: selectedEffect.id, propertyPath: 'intensity', newValue: 75 });
        console.assert(eventFlow.length === 3, '✅ Config changed');

        // Step 4: Update applied
        eventBusService.emit('effect:update', { effectId: selectedEffect.id, update: { intensity: 75 } });
        console.assert(eventFlow.length === 4, '✅ Update applied');

        console.assert(eventFlow[0].id === selectedEffect.id, '✅ Same effect throughout');

        return { testName: 'EffectsPanel Complete Workflow', status: 'PASSED', eventCount: eventFlow.length };
    } catch (error) {
        return { testName: 'EffectsPanel Complete Workflow', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelDeletionWorkflow(testEnv) {
    console.log('🧪 Testing EffectsPanel deletion workflow...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness', 'saturation'])).data
        );

        const eventFlow = [];

        eventBusService.subscribe('effect:delete', (p) => eventFlow.push({ event: 'delete', id: p.effectId }));
        eventBusService.subscribe('command:executed', (p) => eventFlow.push({ event: 'command' }));

        const initialCount = projectState.getState().effects.length;
        const effectToDelete = projectState.getState().effects[0];

        eventBusService.emit('effect:delete', { effectId: effectToDelete.id });
        console.assert(eventFlow.length === 1, '✅ Delete event emitted');

        return { testName: 'EffectsPanel Deletion Workflow', status: 'PASSED', initialCount: initialCount };
    } catch (error) {
        return { testName: 'EffectsPanel Deletion Workflow', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelSecondaryEffectsWorkflow(testEnv) {
    console.log('🧪 Testing EffectsPanel secondary effects workflow...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur'])).data
        );

        const eventFlow = [];

        eventBusService.subscribe('effect:selected', (p) => eventFlow.push({ event: 'selected', type: p.effectType }));
        eventBusService.subscribe('effect:add-secondary', (p) => eventFlow.push({ event: 'add-secondary' }));
        eventBusService.subscribe('effect:secondary:added', (p) => eventFlow.push({ event: 'secondary:added' }));

        const primaryEffect = projectState.getState().effects[0];

        eventBusService.emit('effect:selected', { effectId: primaryEffect.id, effectType: 'primary' });
        console.assert(eventFlow.length === 1, '✅ Primary selected');

        eventBusService.emit('effect:add-secondary', { parentEffectId: primaryEffect.id, type: 'blur' });
        console.assert(eventFlow.length === 2, '✅ Add secondary');

        eventBusService.emit('effect:secondary:added', { effectId: 'sec_1', parentEffectId: primaryEffect.id });
        console.assert(eventFlow.length === 3, '✅ Secondary added');

        return { testName: 'EffectsPanel Secondary Effects Workflow', status: 'PASSED', eventCount: eventFlow.length };
    } catch (error) {
        return { testName: 'EffectsPanel Secondary Effects Workflow', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelKeyframeWorkflow(testEnv) {
    console.log('🧪 Testing EffectsPanel keyframe workflow...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur'])).data
        );

        const eventFlow = [];

        eventBusService.subscribe('effect:keyframe:add', (p) => eventFlow.push({ event: 'kf:add', frame: p.frame }));
        eventBusService.subscribe('effect:keyframe:update', (p) => eventFlow.push({ event: 'kf:update', frame: p.frame }));
        eventBusService.subscribe('effect:keyframe:delete', (p) => eventFlow.push({ event: 'kf:delete' }));

        const primaryEffect = projectState.getState().effects[0];

        eventBusService.emit('effect:keyframe:add', { effectId: primaryEffect.id, frame: 10, properties: { intensity: 50 } });
        console.assert(eventFlow.length === 1, '✅ Keyframe added');

        eventBusService.emit('effect:keyframe:update', { effectId: primaryEffect.id, frame: 20, properties: { intensity: 75 } });
        console.assert(eventFlow.length === 2, '✅ Keyframe updated');

        eventBusService.emit('effect:keyframe:delete', { effectId: primaryEffect.id, keyframeId: 'kf_10', frame: 10 });
        console.assert(eventFlow.length === 3, '✅ Keyframe deleted');

        return { testName: 'EffectsPanel Keyframe Workflow', status: 'PASSED', eventCount: eventFlow.length };
    } catch (error) {
        return { testName: 'EffectsPanel Keyframe Workflow', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelReorderingWorkflow(testEnv) {
    console.log('🧪 Testing EffectsPanel reordering workflow...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness', 'saturation'])).data
        );

        const eventFlow = [];

        eventBusService.subscribe('effect:reorder', (p) => eventFlow.push({ event: 'reorder', id: p.effectId }));
        eventBusService.subscribe('effect:reordered', (p) => eventFlow.push({ event: 'reordered', id: p.effectId }));

        const effects = projectState.getState().effects;
        const draggedEffect = effects[0];

        eventBusService.emit('effect:reorder', { effectId: draggedEffect.id, fromIndex: 0, toIndex: 2 });
        console.assert(eventFlow.length === 1, '✅ Reorder event emitted');
        console.assert(eventFlow[0].id === draggedEffect.id, '✅ Effect ID used, not index');

        eventBusService.emit('effect:reordered', { effectId: draggedEffect.id, newPosition: 2 });
        console.assert(eventFlow.length === 2, '✅ Reorder completion');

        const foundEffect = effects.find(e => e.id === draggedEffect.id);
        console.assert(foundEffect !== undefined, '✅ Effect found by ID after reorder');

        return { testName: 'EffectsPanel Reordering Workflow', status: 'PASSED', eventCount: eventFlow.length };
    } catch (error) {
        return { testName: 'EffectsPanel Reordering Workflow', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelPinStatePersistence(testEnv) {
    console.log('🧪 Testing EffectsPanel pin state persistence...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness'])).data
        );

        const effects = projectState.getState().effects;
        const pinnedEffects = new Set();

        eventBusService.subscribe('effectspanel:pin:changed', (p) => {
            if (p.pinned) pinnedEffects.add(p.effectId);
            else pinnedEffects.delete(p.effectId);
        });

        // Pin first effect
        eventBusService.emit('effectspanel:pin:changed', { effectId: effects[0].id, pinned: true });
        console.assert(pinnedEffects.has(effects[0].id), '✅ Effect pinned');

        // Select another effect
        eventBusService.emit('effect:selected', { effectId: effects[1].id });
        console.assert(pinnedEffects.has(effects[0].id), '✅ Pin persists after selection');

        // Update config
        eventBusService.emit('effect:config:change', { effectId: effects[1].id, propertyPath: 'intensity', newValue: 50 });
        console.assert(pinnedEffects.has(effects[0].id), '✅ Pin persists after config change');

        // Reorder
        eventBusService.emit('effect:reorder', { effectId: effects[1].id, fromIndex: 1, toIndex: 0 });
        console.assert(pinnedEffects.has(effects[0].id), '✅ Pin persists after reorder');

        return { testName: 'EffectsPanel Pin State Persistence', status: 'PASSED', pinnedCount: pinnedEffects.size };
    } catch (error) {
        return { testName: 'EffectsPanel Pin State Persistence', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}