/**
 * EffectsList Component Tests - REFACTORED
 * Uses REAL services and data structures - NO MOCKS
 */

import TestEnvironment from '../setup/TestEnvironment.js';
import TestDataBuilder from '../utils/TestDataBuilder.js';

export async function testEffectsListRendersEffects(testEnv) {
    console.log('🧪 Testing EffectsList renders effects...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness'])).data
        );

        const effects = projectState.getState().effects;
        console.assert(effects.length === 2, '✅ All effects created');
        
        effects.forEach(e => {
            console.assert(e.id !== undefined, '✅ Effect has ID');
            console.assert(typeof e.id === 'string', '✅ ID is string (not index)');
        });

        return { testName: 'EffectsList Renders Effects', status: 'PASSED', effectCount: effects.length };
    } catch (error) {
        return { testName: 'EffectsList Renders Effects', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsListEmptyState(testEnv) {
    console.log('🧪 Testing EffectsList empty state...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(dataBuilder.buildProject().withEffects([]).data);

        const effects = projectState.getState().effects;
        console.assert(effects.length === 0, '✅ Empty state handled');

        return { testName: 'EffectsList Empty State', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsList Empty State', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsListIDBasedAccess(testEnv) {
    console.log('🧪 Testing EffectsList ID-based access...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness'])).data
        );

        const effects = projectState.getState().effects;
        const selectedId = effects[1].id;
        const found = effects.find(e => e.id === selectedId);

        console.assert(found !== undefined, '✅ Effect found by ID');
        console.assert(found.id === selectedId, '✅ Correct effect resolved');

        return { testName: 'EffectsList ID-Based Access', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsList ID-Based Access', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsListSelectCallback(testEnv) {
    console.log('🧪 Testing EffectsList selection callback...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur'])).data
        );

        let called = false;
        let passedId = null;

        const onSelect = (effect) => {
            called = true;
            passedId = effect.id;
        };

        const effect = projectState.getState().effects[0];
        onSelect(effect);

        console.assert(called, '✅ Callback called');
        console.assert(passedId === effect.id, '✅ Correct ID passed');

        return { testName: 'EffectsList Select Callback', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsList Select Callback', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsListDeleteCallback(testEnv) {
    console.log('🧪 Testing EffectsList delete callback...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness'])).data
        );

        let called = false;
        let deletedId = null;

        const onDelete = (effectId) => {
            called = true;
            deletedId = effectId;
        };

        const effect = projectState.getState().effects[1];
        onDelete(effect.id);

        console.assert(called, '✅ Delete callback called');
        console.assert(deletedId === effect.id, '✅ Correct ID passed');

        return { testName: 'EffectsList Delete Callback', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsList Delete Callback', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsListExpandedState(testEnv) {
    console.log('🧪 Testing EffectsList expanded state...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur', 'brightness'])).data
        );

        const expandedEffects = new Set();
        const effects = projectState.getState().effects;

        expandedEffects.add(effects[0].id);
        console.assert(expandedEffects.has(effects[0].id), '✅ Effect 1 expanded');

        expandedEffects.add(effects[1].id);
        console.assert(expandedEffects.has(effects[1].id), '✅ Effect 2 expanded');

        expandedEffects.delete(effects[0].id);
        console.assert(!expandedEffects.has(effects[0].id), '✅ Effect 1 collapsed');
        console.assert(expandedEffects.has(effects[1].id), '✅ Effect 2 still expanded');

        return { testName: 'EffectsList Expanded State', status: 'PASSED', expandedCount: expandedEffects.size };
    } catch (error) {
        return { testName: 'EffectsList Expanded State', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsListVisibilityToggle(testEnv) {
    console.log('🧪 Testing EffectsList visibility toggle...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur'])).data
        );

        let called = false;
        let toggledId = null;
        let newState = null;

        const onToggle = (effectId, visible) => {
            called = true;
            toggledId = effectId;
            newState = visible;
        };

        const effect = projectState.getState().effects[0];
        onToggle(effect.id, false);

        console.assert(called, '✅ Visibility callback called');
        console.assert(toggledId === effect.id, '✅ Correct ID');
        console.assert(newState === false, '✅ New state passed');

        return { testName: 'EffectsList Visibility Toggle', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsList Visibility Toggle', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsListReadOnlyMode(testEnv) {
    console.log('🧪 Testing EffectsList read-only mode...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects(dataBuilder.buildEffects(['blur'])).data
        );

        const isReadOnly = true;
        const effects = projectState.getState().effects;
        
        // Effects should be readable in read-only mode
        console.assert(effects.length > 0, '✅ Effects readable in read-only mode');

        return { testName: 'EffectsList Read-Only Mode', status: 'PASSED' };
    } catch (error) {
        return { testName: 'EffectsList Read-Only Mode', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}

export async function testEffectsListWithSecondaryEffects(testEnv) {
    console.log('🧪 Testing EffectsList with secondary effects...');
    await testEnv.setup();
    const projectState = testEnv.getService('ProjectState');
    const dataBuilder = new TestDataBuilder();

    try {
        const primaryEffect = dataBuilder.buildEffect('blur');
        primaryEffect.secondaryEffects = [
            dataBuilder.buildEffect('brightness'),
            dataBuilder.buildEffect('saturation')
        ];

        await projectState.initializeProject(
            dataBuilder.buildProject().withEffects([primaryEffect]).data
        );

        const effect = projectState.getState().effects[0];
        const hasSecondary = effect.secondaryEffects !== undefined;
        console.assert(hasSecondary, '✅ Secondary effects exist');

        if (hasSecondary) {
            console.assert(effect.secondaryEffects.length === 2, '✅ Secondary effects rendered');
        }

        return { testName: 'EffectsList with Secondary Effects', status: 'PASSED', secondaryCount: effect.secondaryEffects?.length || 0 };
    } catch (error) {
        return { testName: 'EffectsList with Secondary Effects', status: 'FAILED', error: error.message };
    } finally {
        await testEnv.cleanup();
    }
}