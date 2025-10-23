/**
 * useEffectDragDrop Hook
 * 
 * Manages drag-and-drop state for reordering effects in the Effects Panel.
 * 
 * Tracks:
 * - Which effect is currently being dragged (by ID, not index)
 * - Drag source information (type and parent effect for nested effects)
 * - Whether a drag operation is in progress
 * 
 * Emits events:
 * - EFFECT_REORDER_START: When drag begins
 * - EFFECT_REORDER_END: When drag ends
 * - EFFECT_REORDER: When drop/reorder completes (handled elsewhere)
 * 
 * @returns {Object} Drag-drop state and handlers
 *   - draggedId: ID of currently dragged effect or null
 *   - dragSource: { type, parentId } or null
 *   - startDrag: Function to initiate drag
 *   - endDrag: Function to complete drag
 *   - isDragging: Function to check if specific effect is dragging
 */

import { useState, useCallback } from 'react';
import { useServices } from '../../contexts/ServiceContext.js';
import { EVENTS, DRAG_CONFIG, EFFECT_TYPES } from '../effects/EffectsPanelConstants.js';
import PropTypes from 'prop-types';

export function useEffectDragDrop(projectState) {
  const { eventBusService } = useServices();

  // Dragged effect: Store ID (never index) + source info
  const [draggedId, setDraggedId] = useState(null);
  const [dragSource, setDragSource] = useState(null);

  /**
   * Validates that an effect exists at the given index
   * @private
   */
  const validateEffectExists = useCallback(
    (effectIndex, effectType = 'primary') => {
      try {
        const freshEffects = projectState?.getState?.()?.effects || [];
        const effect = freshEffects[effectIndex];

        if (!effect || !effect.id) {
          console.error(
            '❌ useEffectDragDrop: Cannot drag effect without ID',
            { effectIndex, effectType }
          );
          return null;
        }

        return effect;
      } catch (error) {
        console.error('useEffectDragDrop: Error validating effect:', error);
        return null;
      }
    },
    [projectState]
  );

  /**
   * Initiate a drag operation for an effect
   * 
   * Stores the effect ID as primary identifier and emits EFFECT_REORDER_START event.
   * 
   * @param {number} effectIndex - Index of effect to drag
   * @param {string} [effectType='primary'] - Type of effect (primary|secondary|keyframe)
   * @param {string} [parentId=null] - Parent effect ID (for secondary/keyframe effects)
   */
  const startDrag = useCallback(
    (effectIndex, effectType = 'primary', parentId = null) => {
      try {
        const effect = validateEffectExists(effectIndex, effectType);
        if (!effect) return;

        const dragInfo = {
          effectId: effect.id,
          effectIndex,
          effectType,
          parentId
        };

        console.log('🎬 useEffectDragDrop: Drag started:', dragInfo);

        setDraggedId(effect.id);
        setDragSource({
          type: effectType,
          parentId
        });

        // Emit start event
        if (eventBusService) {
          eventBusService.emit(
            EVENTS.EFFECT_REORDER_START,
            {
              effectId: effect.id,
              effectIndex,
              effectType,
              parentId
            },
            {
              source: 'useEffectDragDrop',
              component: 'EffectsPanel'
            }
          );
        }
      } catch (error) {
        console.error('useEffectDragDrop: Error starting drag:', error);
      }
    },
    [validateEffectExists, eventBusService]
  );

  /**
   * Complete a drag operation
   * 
   * Clears drag state and emits EFFECT_REORDER_END event.
   * 
   * @param {boolean} [wasDropped=true] - Whether the drag resulted in a drop/reorder
   * @param {Object} [dropInfo=null] - Information about where effect was dropped
   */
  const endDrag = useCallback(
    (wasDropped = true, dropInfo = null) => {
      try {
        if (!draggedId) {
          console.warn('useEffectDragDrop: endDrag called without active drag');
          return;
        }

        console.log('🏁 useEffectDragDrop: Drag ended:', {
          draggedId,
          wasDropped,
          dropInfo
        });

        // Emit end event
        if (eventBusService) {
          eventBusService.emit(
            EVENTS.EFFECT_REORDER_END,
            {
              effectId: draggedId,
              dragSource,
              wasDropped,
              dropInfo
            },
            {
              source: 'useEffectDragDrop',
              component: 'EffectsPanel'
            }
          );
        }

        // Clear drag state
        setDraggedId(null);
        setDragSource(null);
      } catch (error) {
        console.error('useEffectDragDrop: Error ending drag:', error);
        // Clear state even on error
        setDraggedId(null);
        setDragSource(null);
      }
    },
    [draggedId, dragSource, eventBusService]
  );

  /**
   * Check if a specific effect is currently being dragged
   * 
   * Always compares using stable effect ID, never index.
   * 
   * @param {number} effectIndex - Index of effect to check
   * @param {string} [effectType='primary'] - Type of effect
   * @returns {boolean} True if effect is being dragged
   */
  const isDragging = useCallback(
    (effectIndex, effectType = 'primary') => {
      if (!draggedId) return false;

      try {
        const freshEffects = projectState?.getState?.()?.effects || [];
        const effect = freshEffects[effectIndex];

        if (!effect || !effect.id) return false;

        // Check if this effect matches the dragged effect
        const isDraggedEffect =
          draggedId === effect.id &&
          dragSource?.type === effectType;

        return isDraggedEffect;
      } catch (error) {
        console.error('useEffectDragDrop: Error checking drag status:', error);
        return false;
      }
    },
    [draggedId, dragSource, projectState]
  );

  /**
   * Get current drag state
   * @returns {Object} { draggedId, dragSource, isDragging: boolean }
   */
  const getDragState = useCallback(() => {
    return {
      draggedId,
      dragSource,
      isActive: !!draggedId
    };
  }, [draggedId, dragSource]);

  return {
    draggedId,
    dragSource,
    startDrag,
    endDrag,
    isDragging,
    getDragState
  };
}

/**
 * PropTypes for hook parameters
 */
useEffectDragDrop.propTypes = {
  projectState: PropTypes.object
};

export default useEffectDragDrop;