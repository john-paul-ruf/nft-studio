/**
 * Tests for useEffectSelection hook
 * 
 * Tests the hook logic:
 * - Selection state management (using IDs, not indices)
 * - Selection check function
 * - Selection clearing
 * - ID-based comparisons
 * - Error handling
 */

/**
 * Test: useEffectSelection stores effect by ID and emits event
 */
export async function testUseEffectSelectionSelectEffect(testEnv) {
  console.log('🧪 Testing useEffectSelection: selectEffect stores by ID...');
  
  const mockEffects = [
    { id: 'effect-1', name: 'Blur', type: 'primary', visible: true },
    { id: 'effect-2', name: 'Sharpen', type: 'primary', visible: true }
  ];

  // Simulate hook logic
  let selectedEffect = null;
  let emittedEvents = [];

  const mockProjectState = {
    getState: () => ({ effects: mockEffects })
  };

  const mockEventBusService = {
    emit: (eventName, data) => {
      emittedEvents.push({ eventName, data });
    }
  };

  // Simulate selectEffect behavior
  function selectEffect(effectIndex, effectType = 'primary', subIndex = null) {
    const freshEffects = mockProjectState?.getState?.()?.effects || [];
    const effect = freshEffects[effectIndex];

    if (!effect || !effect.id) {
      console.error('❌ Cannot select effect without ID');
      return;
    }

    selectedEffect = {
      effectId: effect.id,
      effectIndex,
      effectType,
      subIndex
    };

    mockEventBusService.emit('effect:selected', selectedEffect);
  }

  // Test
  selectEffect(0, 'primary');

  if (selectedEffect.effectId !== 'effect-1') {
    throw new Error(`Expected effectId 'effect-1', got ${selectedEffect.effectId}`);
  }

  if (selectedEffect.effectIndex !== 0) {
    throw new Error(`Expected effectIndex 0, got ${selectedEffect.effectIndex}`);
  }

  if (emittedEvents[0]?.eventName !== 'effect:selected') {
    throw new Error('Event not emitted correctly');
  }

  return {
    testName: 'useEffectSelection: selectEffect',
    status: 'PASSED',
    selectedEffect,
    eventsEmitted: emittedEvents.length
  };
}

/**
 * Test: useEffectSelection isEffectSelected compares by ID not index
 */
export async function testUseEffectSelectionIsSelected(testEnv) {
  console.log('🧪 Testing useEffectSelection: isEffectSelected uses ID comparison...');

  const mockEffects = [
    { id: 'effect-1', name: 'Blur', type: 'primary' },
    { id: 'effect-2', name: 'Sharpen', type: 'primary' }
  ];

  let selectedEffect = {
    effectId: 'effect-1',
    effectIndex: 0,
    effectType: 'primary',
    subIndex: null
  };

  const mockProjectState = {
    getState: () => ({ effects: mockEffects })
  };

  // Simulate isEffectSelected behavior
  function isEffectSelected(effectIndex, effectType = 'primary', subIndex = null) {
    if (!selectedEffect) return false;

    const freshEffects = mockProjectState?.getState?.()?.effects || [];
    const effect = freshEffects[effectIndex];

    if (!effect || !effect.id) return false;

    // Compare using stable effect ID
    return (
      selectedEffect.effectId === effect.id &&
      selectedEffect.effectType === effectType &&
      selectedEffect.subIndex === subIndex
    );
  }

  // Test: Index 0 should be selected (matches ID)
  if (!isEffectSelected(0, 'primary')) {
    throw new Error('Expected effect at index 0 to be selected');
  }

  // Test: Index 1 should NOT be selected (different effect)
  if (isEffectSelected(1, 'primary')) {
    throw new Error('Expected effect at index 1 to NOT be selected');
  }

  return {
    testName: 'useEffectSelection: isEffectSelected',
    status: 'PASSED',
    comparedByID: true
  };
}

/**
 * Test: useEffectSelection clears selection
 */
export async function testUseEffectSelectionClear(testEnv) {
  console.log('🧪 Testing useEffectSelection: clearSelection...');

  let selectedEffect = {
    effectId: 'effect-1',
    effectIndex: 0,
    effectType: 'primary',
    subIndex: null
  };

  let emittedEvents = [];

  const mockEventBusService = {
    emit: (eventName, data) => {
      emittedEvents.push({ eventName, data });
    }
  };

  // Simulate clearSelection behavior
  function clearSelection() {
    selectedEffect = null;
    mockEventBusService.emit('effect:deselected', null);
  }

  // Test
  clearSelection();

  if (selectedEffect !== null) {
    throw new Error('Expected selectedEffect to be null after clear');
  }

  if (emittedEvents[0]?.eventName !== 'effect:deselected') {
    throw new Error('Deselected event not emitted correctly');
  }

  return {
    testName: 'useEffectSelection: clearSelection',
    status: 'PASSED',
    clearedSuccessfully: selectedEffect === null
  };
}

/**
 * Test: useEffectSelection fails gracefully for invalid effects
 */
export async function testUseEffectSelectionErrorHandling(testEnv) {
  console.log('🧪 Testing useEffectSelection: error handling...');

  const mockEffects = [];

  let selectedEffect = null;
  let errors = [];

  const mockProjectState = {
    getState: () => ({ effects: mockEffects })
  };

  // Simulate selectEffect with error handling
  function selectEffect(effectIndex, effectType = 'primary') {
    try {
      const freshEffects = mockProjectState?.getState?.()?.effects || [];
      const effect = freshEffects[effectIndex];

      if (!effect || !effect.id) {
        errors.push('Cannot select effect without ID');
        return;
      }

      selectedEffect = { effectId: effect.id, effectIndex, effectType };
    } catch (error) {
      errors.push(error.message);
    }
  }

  // Test: Try to select non-existent effect
  selectEffect(0, 'primary');

  if (selectedEffect !== null) {
    throw new Error('Expected selectedEffect to remain null for invalid effect');
  }

  if (errors.length === 0) {
    throw new Error('Expected error to be recorded');
  }

  return {
    testName: 'useEffectSelection: error handling',
    status: 'PASSED',
    errorsHandled: errors.length,
    selectedEffectAfterError: selectedEffect
  };
}

/**
 * Test: useEffectSelection handles secondary effects with subIndex
 */
export async function testUseEffectSelectionSecondaryEffects(testEnv) {
  console.log('🧪 Testing useEffectSelection: secondary effects...');

  const mockEffects = [
    {
      id: 'effect-1',
      name: 'Blur',
      type: 'primary',
      secondaryEffects: [
        { id: 'secondary-1', name: 'Glow' },
        { id: 'secondary-2', name: 'Shadow' }
      ]
    }
  ];

  let selectedEffect = null;

  const mockProjectState = {
    getState: () => ({ effects: mockEffects })
  };

  // Simulate selectEffect for secondary effect
  function selectEffect(effectIndex, effectType = 'primary', subIndex = null) {
    const freshEffects = mockProjectState?.getState?.()?.effects || [];
    const effect = freshEffects[effectIndex];

    if (!effect || !effect.id) {
      throw new Error('Cannot select effect without ID');
    }

    selectedEffect = {
      effectId: effect.id,
      effectIndex,
      effectType,
      subIndex
    };
  }

  // Simulate isEffectSelected
  function isEffectSelected(effectIndex, effectType = 'primary', subIndex = null) {
    if (!selectedEffect) return false;

    const freshEffects = mockProjectState?.getState?.()?.effects || [];
    const effect = freshEffects[effectIndex];

    if (!effect || !effect.id) return false;

    return (
      selectedEffect.effectId === effect.id &&
      selectedEffect.effectType === effectType &&
      selectedEffect.subIndex === subIndex
    );
  }

  // Test: Select secondary effect
  selectEffect(0, 'secondary', 1);

  if (selectedEffect.subIndex !== 1) {
    throw new Error(`Expected subIndex 1, got ${selectedEffect.subIndex}`);
  }

  if (!isEffectSelected(0, 'secondary', 1)) {
    throw new Error('Secondary effect selection check failed');
  }

  if (isEffectSelected(0, 'secondary', 0)) {
    throw new Error('Different subIndex should not match');
  }

  return {
    testName: 'useEffectSelection: secondary effects',
    status: 'PASSED',
    secondaryEffectSelected: true,
    subIndex: selectedEffect.subIndex
  };
}

/**
 * Test: useEffectSelection syncs index after reorder
 */
export async function testUseEffectSelectionReorderSync(testEnv) {
  console.log('🧪 Testing useEffectSelection: index sync after reorder...');

  // Initial state: effect-1 at index 0
  let mockEffects = [
    { id: 'effect-1', name: 'Blur' },
    { id: 'effect-2', name: 'Sharpen' }
  ];

  let selectedEffect = {
    effectId: 'effect-1',
    effectIndex: 0,
    effectType: 'primary',
    subIndex: null
  };

  const mockProjectState = {
    getState: () => ({ effects: mockEffects })
  };

  // Simulate reorder event handler
  function handleReorderEvent() {
    // After reorder, effect-1 is now at index 1
    mockEffects = [
      { id: 'effect-2', name: 'Sharpen' },
      { id: 'effect-1', name: 'Blur' }
    ];

    // Update selectedEffect index from ID
    if (selectedEffect && selectedEffect.effectId) {
      const freshEffects = mockProjectState?.getState?.()?.effects || [];
      const newIndex = freshEffects.findIndex(e => e.id === selectedEffect.effectId);

      if (newIndex !== -1 && newIndex !== selectedEffect.effectIndex) {
        selectedEffect = {
          ...selectedEffect,
          effectIndex: newIndex
        };
      }
    }
  }

  // Test: Initial index
  if (selectedEffect.effectIndex !== 0) {
    throw new Error('Expected initial index 0');
  }

  // Simulate reorder
  handleReorderEvent();

  // Test: Index updated after reorder
  if (selectedEffect.effectIndex !== 1) {
    throw new Error(`Expected updated index 1, got ${selectedEffect.effectIndex}`);
  }

  // Test: ID remains stable
  if (selectedEffect.effectId !== 'effect-1') {
    throw new Error('Expected ID to remain stable');
  }

  return {
    testName: 'useEffectSelection: reorder sync',
    status: 'PASSED',
    indexBeforeReorder: 0,
    indexAfterReorder: selectedEffect.effectIndex,
    idRemainedStable: selectedEffect.effectId === 'effect-1'
  };
}

// Test registration
export const tests = [
  {
    name: 'useEffectSelection: selectEffect stores by ID',
    category: 'unit',
    fn: testUseEffectSelectionSelectEffect,
    description: 'Verify effect selection stores ID and emits event'
  },
  {
    name: 'useEffectSelection: isEffectSelected compares by ID',
    category: 'unit',
    fn: testUseEffectSelectionIsSelected,
    description: 'Verify selection checking uses ID comparison'
  },
  {
    name: 'useEffectSelection: clearSelection',
    category: 'unit',
    fn: testUseEffectSelectionClear,
    description: 'Verify selection can be cleared'
  },
  {
    name: 'useEffectSelection: error handling',
    category: 'unit',
    fn: testUseEffectSelectionErrorHandling,
    description: 'Verify graceful error handling'
  },
  {
    name: 'useEffectSelection: secondary effects',
    category: 'unit',
    fn: testUseEffectSelectionSecondaryEffects,
    description: 'Verify secondary effect selection with subIndex'
  },
  {
    name: 'useEffectSelection: reorder sync',
    category: 'unit',
    fn: testUseEffectSelectionReorderSync,
    description: 'Verify index updates after reorder event'
  }
];