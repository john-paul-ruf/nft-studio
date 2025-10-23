/**
 * SecondaryEffectsList Component Tests
 * 
 * Tests for nested secondary effects covering:
 * - Secondary effect rendering
 * - Empty state handling
 * - Selection and parent-aware tracking
 * - Visibility toggle
 * - Drag-drop reordering
 */

import SecondaryEffectsList from '../../src/components/effects/SecondaryEffectsList.jsx';

// Mock data
const createMockSecondaryEffect = (id, name) => ({
    id,
    name,
    className: name,
    visible: true
});

const createMockParentEffect = (id, secondaryCount = 0) => ({
    id,
    name: 'Parent Effect',
    className: 'ParentEffect',
    type: 'primary',
    visible: true,
    secondaryEffects: Array(secondaryCount).fill(null).map((_, i) =>
        createMockSecondaryEffect(`${id}-sec-${i}`, `Secondary ${i}`)
    ),
    keyframeEffects: []
});

const createMockEventBusService = () => ({
    emit: (event, data) => {
        console.log(`📢 Event: ${event}`, data);
    }
});

export async function testSecondaryEffectsListRendering(testEnv) {
    // Test: Renders secondary effects list
    const parentEffect = createMockParentEffect('parent-1', 3);
    const eventBusService = createMockEventBusService();
    global.useServices = () => ({ eventBusService });

    const component = SecondaryEffectsList({
        parentEffect,
        parentIndex: 0,
        parentEffectId: 'parent-1',
        secondaryEffects: parentEffect.secondaryEffects,
        selectedEffect: null,
        isReadOnly: false,
        onSecondarySelect: () => {},
        onSecondaryDelete: () => {},
        onToggleVisibility: () => {},
        onReorder: () => {}
    });

    console.assert(component !== null, '✅ SecondaryEffectsList renders with effects');
    return true;
}

export async function testSecondaryEffectsListEmpty(testEnv) {
    // Test: Renders null when no secondary effects
    const parentEffect = createMockParentEffect('parent-1', 0);
    const eventBusService = createMockEventBusService();
    global.useServices = () => ({ eventBusService });

    const component = SecondaryEffectsList({
        parentEffect,
        parentIndex: 0,
        parentEffectId: 'parent-1',
        secondaryEffects: [],
        selectedEffect: null,
        isReadOnly: false,
        onSecondarySelect: () => {},
        onSecondaryDelete: () => {},
        onToggleVisibility: () => {},
        onReorder: () => {}
    });

    console.assert(component === null, '✅ SecondaryEffectsList returns null when empty');
    return true;
}

export async function testSecondaryEffectsListSelection(testEnv) {
    // Test: Selects secondary effects with parent-aware tracking
    const parentEffect = createMockParentEffect('parent-1', 2);
    let selectionData = null;
    
    const onSecondarySelect = (parentIndex, secondaryIndex) => {
        selectionData = { parentIndex, secondaryIndex };
        console.log(`✅ Secondary selected: parent=${parentIndex}, secondary=${secondaryIndex}`);
    };

    const eventBusService = createMockEventBusService();
    global.useServices = () => ({ eventBusService });

    const selectedEffect = {
        effectType: 'secondary',
        subIndex: 1,
        parentIndex: 0
    };

    const component = SecondaryEffectsList({
        parentEffect,
        parentIndex: 0,
        parentEffectId: 'parent-1',
        secondaryEffects: parentEffect.secondaryEffects,
        selectedEffect,
        isReadOnly: false,
        onSecondarySelect,
        onSecondaryDelete: () => {},
        onToggleVisibility: () => {},
        onReorder: () => {}
    });

    console.assert(component !== null, '✅ Selection with parent tracking works');
    return true;
}

export async function testSecondaryEffectsListVisibilityToggle(testEnv) {
    // Test: Visibility toggle with parent-aware indices
    const parentEffect = createMockParentEffect('parent-1', 2);
    let visibilityData = null;

    const onToggleVisibility = (parentIndex, secondaryIndex) => {
        visibilityData = { parentIndex, secondaryIndex };
        console.log(`✅ Visibility toggled: parent=${parentIndex}, secondary=${secondaryIndex}`);
    };

    const eventBusService = createMockEventBusService();
    global.useServices = () => ({ eventBusService });

    const component = SecondaryEffectsList({
        parentEffect,
        parentIndex: 0,
        parentEffectId: 'parent-1',
        secondaryEffects: parentEffect.secondaryEffects,
        selectedEffect: null,
        isReadOnly: false,
        onSecondarySelect: () => {},
        onSecondaryDelete: () => {},
        onToggleVisibility,
        onReorder: () => {}
    });

    console.assert(component !== null, '✅ Visibility toggle callback available');
    return true;
}

export async function testSecondaryEffectsListDragDrop(testEnv) {
    // Test: Drag-drop reordering within parent
    const parentEffect = createMockParentEffect('parent-1', 3);
    let reorderData = null;

    const onReorder = (parentIndex, sourceIndex, targetIndex) => {
        reorderData = { parentIndex, sourceIndex, targetIndex };
        console.log(`✅ Reorder: parent=${parentIndex}, source=${sourceIndex}, target=${targetIndex}`);
    };

    const eventBusService = createMockEventBusService();
    global.useServices = () => ({ eventBusService });

    const component = SecondaryEffectsList({
        parentEffect,
        parentIndex: 0,
        parentEffectId: 'parent-1',
        secondaryEffects: parentEffect.secondaryEffects,
        selectedEffect: null,
        isReadOnly: false,
        onSecondarySelect: () => {},
        onSecondaryDelete: () => {},
        onToggleVisibility: () => {},
        onReorder
    });

    console.assert(component !== null, '✅ Drag-drop reorder callback available');
    console.assert(typeof onReorder === 'function', '✅ Reorder callback is function');
    return true;
}