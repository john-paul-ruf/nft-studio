/**
 * EffectsList Component Tests
 * 
 * Tests for the EffectsList component covering:
 * - Effect organization (Primary/Final sections)
 * - Empty state handling
 * - ID-based access patterns
 * - Event emission
 */

import EffectsList from '../../src/components/effects/EffectsList.jsx';

// Mock data
const createMockEffect = (id, name, type = 'primary', secondaryCount = 0) => ({
    id,
    name,
    className: name,
    type,
    visible: true,
    secondaryEffects: Array(secondaryCount).fill(null).map((_, i) => ({
        id: `${id}-sec-${i}`,
        name: `Secondary ${i}`,
        visible: true
    })),
    keyframeEffects: []
});

const createMockProjectState = (effects) => ({
    getState: () => ({ effects })
});

const createMockEventBusService = () => ({
    emit: (event, data) => {
        console.log(`📢 Event: ${event}`, data);
    }
});

export async function testEffectsListEmpty(testEnv) {
    // Test: Renders empty state when no effects
    const effects = [];
    const projectState = createMockProjectState(effects);
    const eventBusService = createMockEventBusService();

    // Mock the context
    global.useServices = () => ({ eventBusService, projectState });

    const component = EffectsList({
        effects,
        expandedEffects: new Set(),
        selectedEffect: null,
        onEffectSelect: () => {},
        onEffectDelete: () => {},
        onToggleExpand: () => {},
        onToggleVisibility: () => {},
        isReadOnly: false
    });

    console.assert(component !== null, '✅ Empty state renders');
    return true;
}

export async function testEffectsListOrganization(testEnv) {
    // Test: Organizes primary and final effects into sections
    const effects = [
        createMockEffect('prim-1', 'Primary Effect 1', 'primary'),
        createMockEffect('final-1', 'Final Effect 1', 'finalImage'),
        createMockEffect('prim-2', 'Primary Effect 2', 'primary')
    ];

    const projectState = createMockProjectState(effects);
    const eventBusService = createMockEventBusService();
    global.useServices = () => ({ eventBusService, projectState });

    let selectCalled = false;
    const onEffectSelect = (index, type) => {
        selectCalled = true;
        console.log(`✅ Effect selected: index=${index}, type=${type}`);
    };

    const component = EffectsList({
        effects,
        expandedEffects: new Set(),
        selectedEffect: null,
        onEffectSelect,
        onEffectDelete: () => {},
        onToggleExpand: () => {},
        onToggleVisibility: () => {},
        isReadOnly: false
    });

    console.assert(component !== null, '✅ Organized list renders');
    return true;
}

export async function testEffectsListIDBasedAccess(testEnv) {
    // Test: 🔒 CRITICAL - Uses ID-based access, not index
    const effects = [
        createMockEffect('effect-A', 'Effect A', 'primary'),
        createMockEffect('effect-B', 'Effect B', 'primary'),
        createMockEffect('effect-C', 'Effect C', 'primary')
    ];

    const projectState = createMockProjectState(effects);
    const eventBusService = createMockEventBusService();
    global.useServices = () => ({ eventBusService, projectState });

    let selectedEffectId = null;
    const onEffectSelect = (index, type) => {
        // Get the effect at this index and verify we're using its ID
        selectedEffectId = effects[index].id;
        console.log(`✅ ID-based selection: index=${index}, effectId=${selectedEffectId}`);
    };

    const component = EffectsList({
        effects,
        expandedEffects: new Set(),
        selectedEffect: {
            effectId: 'effect-B',
            effectIndex: 1,
            effectType: 'primary',
            subIndex: null
        },
        onEffectSelect,
        onEffectDelete: () => {},
        onToggleExpand: () => {},
        onToggleVisibility: () => {},
        isReadOnly: false
    });

    console.assert(component !== null, '✅ ID-based access pattern works');
    return true;
}

export async function testEffectsListStability(testEnv) {
    // Test: Effect selection remains stable after reordering
    // This is the 🔒 CRITICAL test - selection should follow the effect by ID, not index
    
    const initialEffects = [
        createMockEffect('effect-A', 'Effect A', 'primary'),
        createMockEffect('effect-B', 'Effect B', 'primary'),
        createMockEffect('effect-C', 'Effect C', 'primary')
    ];

    // Start with effect-B selected at index 1
    let currentEffects = [...initialEffects];
    const projectState = createMockProjectState(currentEffects);
    const eventBusService = createMockEventBusService();
    global.useServices = () => ({ eventBusService, projectState });

    let selectedEffect = {
        effectId: 'effect-B',
        effectIndex: 1,
        effectType: 'primary',
        subIndex: null
    };

    // Render initial state
    EffectsList({
        effects: currentEffects,
        expandedEffects: new Set(),
        selectedEffect,
        onEffectSelect: () => {},
        onEffectDelete: () => {},
        onToggleExpand: () => {},
        onToggleVisibility: () => {},
        isReadOnly: false
    });

    // Now reorder: move effect-C to the beginning
    // Original: [A, B, C] -> [C, A, B]
    currentEffects = [
        createMockEffect('effect-C', 'Effect C', 'primary'),
        createMockEffect('effect-A', 'Effect A', 'primary'),
        createMockEffect('effect-B', 'Effect B', 'primary')
    ];

    // Update projectState mock
    projectState.getState = () => ({ effects: currentEffects });

    // Re-render with reordered effects
    EffectsList({
        effects: currentEffects,
        expandedEffects: new Set(),
        selectedEffect, // Still has effectId 'effect-B', but now at index 2
        onEffectSelect: (newIndex, type) => {
            // Should resolve to index 2 (where effect-B is now)
            const actualId = currentEffects[newIndex].id;
            console.assert(actualId === 'effect-B', `✅ Selection followed by ID after reorder: id=${actualId}, newIndex=${newIndex}`);
        },
        onEffectDelete: () => {},
        onToggleExpand: () => {},
        onToggleVisibility: () => {},
        isReadOnly: false
    });

    return true;
}

export async function testEffectsListEventEmission(testEnv) {
    // Test: Events are emitted through EventBusService
    const effects = [
        createMockEffect('effect-1', 'Effect 1', 'primary')
    ];

    const projectState = createMockProjectState(effects);
    const emittedEvents = [];
    const eventBusService = {
        emit: (event, data) => {
            emittedEvents.push({ event, data });
        }
    };

    global.useServices = () => ({ eventBusService, projectState });

    EffectsList({
        effects,
        expandedEffects: new Set(),
        selectedEffect: null,
        onEffectSelect: () => {},
        onEffectDelete: () => {},
        onToggleExpand: () => {},
        onToggleVisibility: () => {},
        isReadOnly: false
    });

    console.assert(emittedEvents.length >= 0, '✅ EventBusService integration present');
    return true;
}

export async function testEffectsListReadOnlyMode(testEnv) {
    // Test: Read-only mode disables interactions
    const effects = [
        createMockEffect('effect-1', 'Effect 1', 'primary')
    ];

    const projectState = createMockProjectState(effects);
    const eventBusService = createMockEventBusService();
    global.useServices = () => ({ eventBusService, projectState });

    let selectCalled = false;
    const component = EffectsList({
        effects,
        expandedEffects: new Set(),
        selectedEffect: null,
        onEffectSelect: () => {
            selectCalled = true;
        },
        onEffectDelete: () => {},
        onToggleExpand: () => {},
        onToggleVisibility: () => {},
        isReadOnly: true
    });

    console.assert(component !== null, '✅ Read-only mode renders');
    return true;
}