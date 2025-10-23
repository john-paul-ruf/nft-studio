/**
 * EffectsPanel PropTypes - Comprehensive type specifications for all components
 * 
 * This file defines PropTypes for:
 * - 8 components (EffectsList, EffectItem, SecondaryEffectsList, KeyframeEffectsList, etc.)
 * - 3 custom hooks (useEffectSelection, useEffectDragDrop, useEffectPanelModals)
 * - Shared prop validators
 * 
 * CRITICAL RULE: All components use effect IDs, NEVER indices
 * See: src/components/EffectsPanel.jsx lines 224-244 for pattern reference
 */

import PropTypes from 'prop-types';

/**
 * Shared effect object shape - must include ID for tracking
 */
export const EffectShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  isVisible: PropTypes.bool,
  properties: PropTypes.object,
  secondaryEffects: PropTypes.array,
  keyframeEffects: PropTypes.array
});

/**
 * Custom validators for complex props
 */
export const Validators = {
  /**
   * Validates that an effect ID is a non-empty string
   */
  effectId: (props, propName, componentName) => {
    const value = props[propName];
    if (value && typeof value !== 'string') {
      return new Error(
        `Invalid prop '${propName}' of type '${typeof value}' supplied to '${componentName}', expected 'string'`
      );
    }
  },

  /**
   * Validates that an effect object has required ID
   */
  effectObject: (props, propName, componentName) => {
    const value = props[propName];
    if (value && !value.id) {
      return new Error(
        `Invalid prop '${propName}' supplied to '${componentName}': missing 'id' property`
      );
    }
  },

  /**
   * Validates selection state object contains ID, not index
   */
  selectionState: (props, propName, componentName) => {
    const value = props[propName];
    if (value) {
      if (!value.effectId) {
        return new Error(
          `Invalid prop '${propName}' supplied to '${componentName}': must have 'effectId', not 'effectIndex'`
        );
      }
      if (typeof value.effectId !== 'string') {
        return new Error(
          `Invalid prop '${propName}' supplied to '${componentName}': 'effectId' must be a string`
        );
      }
    }
  }
};

/**
 * ============================================
 * HOOK RETURN TYPE PROPTYPES
 * ============================================
 */

/**
 * Return type for useEffectSelection hook
 */
export const UseEffectSelectionReturn = PropTypes.shape({
  selectedEffect: PropTypes.shape({
    effectId: PropTypes.string.isRequired,
    effectIndex: PropTypes.number,  // Hint only, NOT source of truth
    effectType: PropTypes.oneOf(['primary', 'secondary', 'keyframe']),
    subIndex: PropTypes.number
  }),
  selectEffect: PropTypes.func.isRequired,
  isEffectSelected: PropTypes.func.isRequired,
  clearSelection: PropTypes.func.isRequired
});

/**
 * Return type for useEffectDragDrop hook
 */
export const UseEffectDragDropReturn = PropTypes.shape({
  draggedId: PropTypes.string,      // ID of currently dragged effect
  startDrag: PropTypes.func.isRequired,
  endDrag: PropTypes.func.isRequired,
  isDragging: PropTypes.func.isRequired,
  dragSource: PropTypes.shape({
    type: PropTypes.oneOf(['primary', 'secondary', 'keyframe']),
    parentId: PropTypes.string
  })
});

/**
 * Return type for useEffectPanelModals hook
 */
export const UseEffectPanelModalsReturn = PropTypes.shape({
  specialtyModalOpen: PropTypes.bool.isRequired,
  bulkAddModalOpen: PropTypes.bool.isRequired,
  openSpecialtyModal: PropTypes.func.isRequired,
  closeSpecialtyModal: PropTypes.func.isRequired,
  openBulkAddModal: PropTypes.func.isRequired,
  closeBulkAddModal: PropTypes.func.isRequired
});

/**
 * ============================================
 * COMPONENT PROPTYPES
 * ============================================
 */

/**
 * EffectsList component props
 * Root container for all primary effects
 */
export const EffectsListProps = {
  effects: PropTypes.arrayOf(EffectShape).isRequired,
  selectedEffectId: PropTypes.string,
  onEffectSelect: PropTypes.func,
  onEffectDelete: PropTypes.func,
  onEffectReorder: PropTypes.func,
  onSecondaryEffectAdd: PropTypes.func,
  onKeyframeEffectAdd: PropTypes.func,
  isLoading: PropTypes.bool,
  error: PropTypes.string
};

/**
 * EffectItem component props
 * Single effect row with nested secondary/keyframe effects
 */
export const EffectItemProps = {
  effect: EffectShape.isRequired,
  isSelected: PropTypes.bool,
  canDelete: PropTypes.bool,
  canDuplicate: PropTypes.bool,
  isDragging: PropTypes.bool,
  onSelect: PropTypes.func,
  onDelete: PropTypes.func,
  onToggleVisibility: PropTypes.func,
  onContextMenu: PropTypes.func,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  index: PropTypes.number  // Hint only
};

/**
 * EffectContextMenu component props
 * Context menu for effect item (right-click operations)
 */
export const EffectContextMenuProps = {
  effectId: PropTypes.string.isRequired,
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired
  }).isRequired,
  onDelete: PropTypes.func,
  onDuplicate: PropTypes.func,
  onCopy: PropTypes.func,
  onClose: PropTypes.func.isRequired
};

/**
 * SecondaryEffectsList component props
 * Container for secondary effects of a parent effect
 */
export const SecondaryEffectsListProps = {
  parentEffectId: PropTypes.string.isRequired,
  effects: PropTypes.arrayOf(EffectShape),
  selectedEffectId: PropTypes.string,
  onEffectSelect: PropTypes.func,
  onEffectDelete: PropTypes.func,
  onEffectReorder: PropTypes.func,
  isEmpty: PropTypes.bool
};

/**
 * KeyframeEffectsList component props
 * Container for keyframe effects of a parent effect
 */
export const KeyframeEffectsListProps = {
  parentEffectId: PropTypes.string.isRequired,
  effects: PropTypes.arrayOf(EffectShape),
  selectedEffectId: PropTypes.string,
  onEffectSelect: PropTypes.func,
  onEffectDelete: PropTypes.func,
  onEffectReorder: PropTypes.func,
  isEmpty: PropTypes.bool
};

/**
 * AddEffectDropdown component props
 * Dropdown trigger for adding new effects
 */
export const AddEffectDropdownProps = {
  onEffectTypeSelect: PropTypes.func,
  availableTypes: PropTypes.arrayOf(PropTypes.string),
  isOpen: PropTypes.bool,
  onToggle: PropTypes.func
};

/**
 * EffectSubmenu component props
 * Submenu for each effect type (primary/final/keyframe)
 */
export const EffectSubmenuProps = {
  effectType: PropTypes.oneOf(['primary', 'final', 'keyframe']).isRequired,
  effects: PropTypes.arrayOf(EffectShape),
  isOpen: PropTypes.bool,
  onEffectSelect: PropTypes.func,
  groupedByAuthor: PropTypes.bool
};

/**
 * GroupedEffectsList component props
 * Effect list grouped by author
 */
export const GroupedEffectsListProps = {
  effects: PropTypes.arrayOf(EffectShape).isRequired,
  groupBy: PropTypes.oneOf(['author', 'type', 'none']),
  onEffectSelect: PropTypes.func,
  selectedEffectId: PropTypes.string
};

/**
 * EffectConfigPanel component props
 * Right-side configuration drawer
 */
export const EffectConfigPanelProps = {
  effect: EffectShape,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onUpdate: PropTypes.func,
  isLoading: PropTypes.bool
};

/**
 * EventDrivenEffectsPanel (wrapper) props
 * Top-level orchestrator component
 */
export const EventDrivenEffectsPanelProps = {
  projectState: PropTypes.object,
  eventBusService: PropTypes.object.isRequired,
  commandService: PropTypes.object,
  onEffectSelect: PropTypes.func,
  onEffectUpdate: PropTypes.func,
  onEffectDelete: PropTypes.func
};