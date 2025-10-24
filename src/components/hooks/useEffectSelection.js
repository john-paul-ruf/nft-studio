/**
 * useEffectSelection Hook
 * 
 * Manages effect selection state for the Effects Panel.
 * 
 * CRITICAL PATTERN: Uses effect IDs (never indices) as the source of truth.
 * Index is stored as a hint for optimization but is always recalculated from ID.
 * 
 * @returns {Object} Selection state and handlers
 *   - selectedEffect: { effectId, effectIndex, effectType, subIndex } or null
 *   - selectEffect: Function to select an effect
 *   - isEffectSelected: Function to check if effect is selected
 *   - clearSelection: Function to clear selection
 */

import { useState, useCallback, useEffect } from 'react';
import { useServices } from '../../contexts/ServiceContext.js';
import { EVENTS } from '../effects/EffectsPanelConstants.js';
import PropTypes from 'prop-types';

export function useEffectSelection(projectState, isReadOnly = false) {
  const { eventBusService } = useServices();
  
  // Selection state: { effectId (REQUIRED), effectIndex (hint), effectType, subIndex }
  // 🔒 CRITICAL: effectId is the only stable identifier across reorders
  const [selectedEffect, setSelectedEffect] = useState(null);

  /**
   * Validates that an effect exists and has a valid ID
   * @private
   */
  const validateEffect = useCallback((effectIndex, effect) => {
    if (!effect || !effect.id) {
      console.error('❌ useEffectSelection: Cannot select effect without ID', {
        effectIndex,
        effect
      });
      return false;
    }
    return true;
  }, []);

  /**
   * Select an effect by ID (primary identifier)
   * 
   * Internally converts effect ID to index for lookup.
   * Stores the effect ID as primary identifier, index as optimization hint.
   * Automatically opens config panel when effect is selected (unless read-only).
   * 
   * @param {string} effectId - Unique ID of effect
   * @param {string} [effectType='primary'] - Type of effect (primary|secondary|keyframe)
   * @param {number} [subIndex=null] - Index for secondary/keyframe effects
   */
  const selectEffect = useCallback((effectId, effectType = 'primary', subIndex = null) => {
    try {
      // Get fresh effects from ProjectState
      const freshEffects = projectState?.getState?.()?.effects || [];
      const effectIndex = freshEffects.findIndex(e => e.id === effectId);

      if (effectIndex < 0) {
        console.error('❌ useEffectSelection: Effect not found by ID', { effectId });
        return;
      }

      const effect = freshEffects[effectIndex];

      if (!validateEffect(effectIndex, effect)) {
        return;
      }

      const selectionData = {
        effectId: effect.id,        // PRIMARY identifier - stable across reorders
        effectIndex,                 // HINT - may become stale after reorder
        effectType,
        subIndex
      };

      console.log('🎯 useEffectSelection: Effect selected:', {
        effectId: effect.id,
        effectIndex,
        effectName: effect.name,
        effectType,
        subIndex
      });

      setSelectedEffect(selectionData);

      // Emit selection event for other components
      if (eventBusService) {
        eventBusService.emit(EVENTS.EFFECT_SELECTED, selectionData, {
          source: 'useEffectSelection',
          component: 'EffectsPanel'
        });
      }
    } catch (error) {
      console.error('useEffectSelection: Error selecting effect:', error);
    }
  }, [projectState, eventBusService, validateEffect]);

  /**
   * Check if a specific effect is currently selected
   * 
   * Always compares using stable effect ID, never index.
   * 
   * @param {string} effectId - Unique ID of effect to check
   * @param {string} [effectType='primary'] - Type of effect
   * @param {number} [subIndex=null] - Index for secondary/keyframe effects
   * @returns {boolean} True if effect is selected
   */
  const isEffectSelected = useCallback(
    (effectId, effectType = 'primary', subIndex = null) => {
      if (!selectedEffect) return false;

      try {
        // Compare using stable effect ID
        const isSelected =
          selectedEffect.effectId === effectId &&
          selectedEffect.effectType === effectType &&
          selectedEffect.subIndex === subIndex;

        return isSelected;
      } catch (error) {
        console.error('useEffectSelection: Error checking selection:', error);
        return false;
      }
    },
    [selectedEffect]
  );

  /**
   * Clear the current selection
   */
  const clearSelection = useCallback(() => {
    console.log('🎯 useEffectSelection: Clearing selection');
    setSelectedEffect(null);

    if (eventBusService) {
      eventBusService.emit(EVENTS.EFFECT_DESELECTED, null, {
        source: 'useEffectSelection',
        component: 'EffectsPanel'
      });
    }
  }, [eventBusService]);

  /**
   * 🔒 CRITICAL: Update selectedEffect when effects are reordered
   * This ensures the selection state stays synchronized with actual effect positions.
   * 
   * When a reorder happens, the effect ID stays the same but the index changes.
   * We recalculate the index from the ID.
   */
  useEffect(() => {
    if (!eventBusService || !projectState) return;

    const unsubscribe = eventBusService.subscribe(
      EVENTS.EFFECT_REORDER,
      (payload) => {
        console.log('🎨 useEffectSelection: Effect reorder event received:', payload);

        // If we have a selected effect, update its index if affected by reorder
        if (selectedEffect && selectedEffect.effectId) {
          const freshEffects = projectState?.getState?.()?.effects || [];
          const newIndex = freshEffects.findIndex(e => e.id === selectedEffect.effectId);

          if (newIndex !== -1 && newIndex !== selectedEffect.effectIndex) {
            console.log('🎯 useEffectSelection: Updating selected effect index after reorder:', {
              effectId: selectedEffect.effectId,
              oldIndex: selectedEffect.effectIndex,
              newIndex: newIndex
            });

            setSelectedEffect({
              ...selectedEffect,
              effectIndex: newIndex
            });
          }
        }
      },
      { component: 'useEffectSelection' }
    );

    return unsubscribe;
  }, [eventBusService, selectedEffect, projectState]);

  /**
   * Clear selection and close config when entering read-only mode
   */
  useEffect(() => {
    if (isReadOnly && selectedEffect) {
      clearSelection();
    }
  }, [isReadOnly, selectedEffect, clearSelection]);

  return {
    selectedEffect,
    selectEffect,
    isEffectSelected,
    clearSelection
  };
}

/**
 * PropTypes for hook return value
 */
useEffectSelection.propTypes = {
  projectState: PropTypes.object,
  isReadOnly: PropTypes.bool
};

export default useEffectSelection;