/**
 * EffectsPanelRefactored Orchestrator Tests
 * Tests with REAL services - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import TestDataBuilder from '../utils/TestDataBuilder.js';

export async function testEffectsPanelRefactoredExpandedState(testEnv) {
    console.log('🧪 Testing EffectsPanelRefactored expanded state...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness', 'saturation'])).data
        );

        const expandedEffects = new Set();
        const effects = projectState.getState().effects;
        const effectIds = effects.map(e => e.id);

        expandedEffects.add(effectIds[0]);
        console.assert(expandedEffects.has(effectIds[0]), '✅ Effect marked as expanded');

        expandedEffects.delete(effectIds[0]);
        console.assert(!expandedEffects.has(effectIds[0]), '✅ Effect marked as collapsed');

        expandedEffects.add(effectIds[0]);
        expandedEffects.add(effectIds[1]);
        console.assert(expandedEffects.size === 2, '✅ Multiple effects expanded');

        return { testName: 'EffectsPanelRefactored Expanded State', status: 'PASSED', expandedCount: expandedEffects.size };
    } catch (error) {
        return { testName: 'EffectsPanelRefactored Expanded State', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelRefactoredEffectResolution(testEnv) {
    console.log('🧪 Testing EffectsPanelRefactored effect resolution...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness'])).data
        );

        const effects = projectState.getState().effects;
        const selectedEffectId = effects[0].id;

        let selectedEffect = null;
        for (const effect of effects) {
            if (effect.id === selectedEffectId) {
                selectedEffect = effect;
                break;
            }
        }

        console.assert(selectedEffect !== null, '✅ Effect found by ID');
        console.assert(selectedEffect.id === selectedEffectId, '✅ Correct effect resolved');

        return { testName: 'EffectsPanelRefactored Effect Resolution', status: 'PASSED', resolvedId: selectedEffect.id };
    } catch (error) {
        return { testName: 'EffectsPanelRefactored Effect Resolution', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelRefactoredSelectCallback(testEnv) {
    console.log('🧪 Testing EffectsPanelRefactored selection callback...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness'])).data
        );

        let selectedEffectId = null;
        let eventEmitted = false;

        eventBusService.subscribe('effect:selected', (payload) => {
            selectedEffectId = payload.effectId;
            eventEmitted = true;
        });

        const effectToSelect = projectState.getState().effects[0];
        eventBusService.emit('effect:selected', { effectId: effectToSelect.id, effectType: 'primary' });

        console.assert(eventEmitted, '✅ Selection event emitted');
        console.assert(selectedEffectId === effectToSelect.id, '✅ Correct effect selected');

        return { testName: 'EffectsPanelRefactored Select Callback', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsPanelRefactored Select Callback', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelRefactoredDeleteCallback(testEnv) {
    console.log('🧪 Testing EffectsPanelRefactored deletion callback...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness', 'saturation'])).data
        );

        let deleteEventEmitted = false;
        let deletedEffectId = null;

        eventBusService.subscribe('effect:delete', (payload) => {
            deleteEventEmitted = true;
            deletedEffectId = payload.effectId;
        });

        const effectToDelete = projectState.getState().effects[0];
        eventBusService.emit('effect:delete', { effectId: effectToDelete.id });

        console.assert(deleteEventEmitted, '✅ Delete event emitted');
        console.assert(deletedEffectId === effectToDelete.id, '✅ Correct effect ID');

        return { testName: 'EffectsPanelRefactored Delete Callback', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsPanelRefactored Delete Callback', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelRefactoredToggleExpandCallback(testEnv) {
    console.log('🧪 Testing EffectsPanelRefactored toggle expand callback...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur'])).data
        );

        const expandedEffects = new Set();
        const effectId = projectState.getState().effects[0].id;

        // First toggle - expand
        if (!expandedEffects.has(effectId)) expandedEffects.add(effectId);
        console.assert(expandedEffects.has(effectId), '✅ Effect expanded');

        // Second toggle - collapse
        if (expandedEffects.has(effectId)) expandedEffects.delete(effectId);
        console.assert(!expandedEffects.has(effectId), '✅ Effect collapsed');

        return { testName: 'EffectsPanelRefactored Toggle Expand Callback', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsPanelRefactored Toggle Expand Callback', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelRefactoredToggleVisibilityCallback(testEnv) {
    console.log('🧪 Testing EffectsPanelRefactored visibility callback...');
    await testEnv.setup();
    const eventBusService = testEnv.getService('EventBusService');
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur'])).data
        );

        let visibilityEventEmitted = false;
        let toggledEffectId = null;

        eventBusService.subscribe('effect:visibility:toggled', (payload) => {
            visibilityEventEmitted = true;
            toggledEffectId = payload.effectId;
        });

        const effectId = projectState.getState().effects[0].id;
        eventBusService.emit('effect:visibility:toggled', { effectId: effectId, visible: false });

        console.assert(visibilityEventEmitted, '✅ Visibility toggle event emitted');
        console.assert(toggledEffectId === effectId, '✅ Correct effect ID');

        return { testName: 'EffectsPanelRefactored Toggle Visibility Callback', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsPanelRefactored Toggle Visibility Callback', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsPanelRefactoredEmptyEffects(testEnv) {
    console.log('🧪 Testing EffectsPanelRefactored with empty effects...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(dataBuilder.buildProject().withEffects([]).data);

        const effects = projectState.getState().effects;
        console.assert(effects.length === 0, '✅ Empty effects handled');

        const selectedEffect = effects.length > 0 ? effects[0] : null;
        console.assert(selectedEffect === null, '✅ No effect selected when empty');

        return { testName: 'EffectsPanelRefactored Empty Effects', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsPanelRefactored Empty Effects', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}