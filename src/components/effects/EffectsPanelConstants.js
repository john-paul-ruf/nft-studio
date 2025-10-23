/**
 * EffectsPanel Constants - Single source of truth for all magic strings and numbers
 * 
 * Organize all configuration values needed by the refactored EffectsPanel components:
 * - Event names
 * - Animation timings
 * - UI dimensions and spacing
 * - Drag-drop thresholds
 * - Text labels
 * - Keyboard shortcuts
 */

/**
 * Event names emitted by EffectsPanel components
 * These coordinate with EventBusService
 * 
 * PATTERN: All events include `effectId` in payload (NEVER index)
 */
export const EVENTS = {
  // Effect selection
  EFFECT_SELECTED: 'effect:selected',
  EFFECT_DESELECTED: 'effect:deselected',
  
  // Effect mutations
  EFFECT_ADDED: 'effect:added',
  EFFECT_DELETED: 'effect:deleted',
  EFFECT_DUPLICATED: 'effect:duplicated',
  EFFECT_VISIBILITY_TOGGLED: 'effect:visibility:toggle',
  EFFECT_PROPERTY_UPDATED: 'effect:property:updated',
  
  // Effect reordering (drag-drop)
  EFFECT_REORDER_START: 'effectspanel:effect:reorder:start',
  EFFECT_REORDER_END: 'effectspanel:effect:reorder:end',
  EFFECT_REORDER: 'effectspanel:effect:reorder',
  
  // Secondary effects
  SECONDARY_EFFECT_ADDED: 'effectspanel:secondary:added',
  SECONDARY_EFFECT_DELETED: 'effectspanel:secondary:deleted',
  SECONDARY_EFFECT_REORDER: 'effectspanel:secondary:reorder',
  
  // Keyframe effects
  KEYFRAME_EFFECT_ADDED: 'effectspanel:keyframe:added',
  KEYFRAME_EFFECT_DELETED: 'effectspanel:keyframe:deleted',
  KEYFRAME_EFFECT_REORDER: 'effectspanel:keyframe:reorder',
  
  // Context menu
  CONTEXT_MENU_OPEN: 'effectspanel:context:menu:open',
  CONTEXT_MENU_DELETE: 'effectspanel:context:delete',
  CONTEXT_MENU_DUPLICATE: 'effectspanel:context:duplicate',
  CONTEXT_MENU_COPY: 'effectspanel:context:copy',
  CONTEXT_MENU_CLOSE: 'effectspanel:context:menu:close',
  
  // Modal operations
  SPECIALTY_MODAL_OPEN: 'effectspanel:specialty:modal:open',
  SPECIALTY_MODAL_CLOSE: 'effectspanel:specialty:modal:close',
  BULK_ADD_MODAL_OPEN: 'effectspanel:bulk:add:modal:open',
  BULK_ADD_MODAL_CLOSE: 'effectspanel:bulk:add:modal:close',
  
  // Logging events
  LOG_ACTION: 'effectspanel:log:action',
  LOG_PERFORMANCE: 'effectspanel:log:performance',
  LOG_ERROR: 'effectspanel:log:error'
};

/**
 * Animation and transition timings (milliseconds)
 */
export const TIMING = {
  // Transitions
  TRANSITION_DURATION: 200,      // ms, expand/collapse animations
  TRANSITION_DELAY: 0,
  ANIMATION_DURATION_MS: 300,    // ms, panel slide animations
  
  // Drag-drop
  DRAG_DEBOUNCE: 50,             // ms, throttle drag events
  REORDER_ANIMATION: 300,        // ms, effect reorder animation
  
  // Modal
  MODAL_OPEN_DURATION: 250,      // ms
  MODAL_CLOSE_DURATION: 150,     // ms
  
  // Keyboard
  KEYBOARD_REPEAT_DELAY: 100,    // ms, arrow key repeat rate
  
  // Performance thresholds
  SLOW_RENDER_THRESHOLD: 16,     // ms, 60fps = 16.67ms per frame
  WARNING_RENDER_THRESHOLD: 50,  // ms, flag if render takes longer
  
  // IPC Communication
  IPC_TIMEOUT_MS: 5000,          // ms, IPC call timeout
  IPC_RETRY_DELAY_MS: 1000       // ms, delay before IPC retry
};

/**
 * UI Dimensions and spacing (pixels)
 */
export const SPACING = {
  // Padding and margins
  PADDING_XS: 4,
  PADDING_SM: 8,
  PADDING_MD: 12,
  PADDING_LG: 16,
  PADDING_XL: 24,
  
  // Effect item dimensions
  EFFECT_ITEM_HEIGHT: 40,
  EFFECT_ITEM_PADDING: 8,
  
  // Icon sizes
  ICON_SIZE_SM: 16,
  ICON_SIZE_MD: 20,
  ICON_SIZE_LG: 24,
  
  // Nesting indentation
  NEST_LEVEL_INDENT: 20,         // px per nesting level
  SECONDARY_INDENT: 20,
  KEYFRAME_INDENT: 40,
  
  // Drag preview
  DRAG_PREVIEW_OFFSET: 10,
  
  // Context menu
  CONTEXT_MENU_OFFSET_X: 5,
  CONTEXT_MENU_OFFSET_Y: 5,
  
  // Panel dimensions
  CONFIG_PANEL_WIDTH: 400,
  CONFIG_PANEL_PADDING: 16,
  
  // List container
  LIST_MAX_HEIGHT: 600
};

/**
 * Drag-drop configuration
 */
export const DRAG_CONFIG = {
  DRAG_THRESHOLD: 5,             // px, minimum distance to initiate drag
  DROP_SENSITIVITY: 10,          // px, zone height for drop indicator
  SCROLL_THRESHOLD: 20,          // px from edge to trigger scroll
  SCROLL_SPEED: 5,               // px per frame when scrolling
  
  // Drag types
  DRAG_TYPE_PRIMARY: 'effect-primary',
  DRAG_TYPE_SECONDARY: 'effect-secondary',
  DRAG_TYPE_KEYFRAME: 'effect-keyframe'
};

/**
 * Keyboard shortcuts and navigation
 */
export const KEYBOARD = {
  // Arrow navigation
  KEY_UP: 'ArrowUp',
  KEY_DOWN: 'ArrowDown',
  KEY_LEFT: 'ArrowLeft',
  KEY_RIGHT: 'ArrowRight',
  
  // Selection and activation
  KEY_ENTER: 'Enter',
  KEY_SPACE: ' ',
  KEY_DELETE: 'Delete',
  KEY_BACKSPACE: 'Backspace',
  
  // Menu and escape
  KEY_ESCAPE: 'Escape',
  
  // Undo/Redo (platform-dependent)
  KEY_UNDO: 'z',   // Ctrl+Z or Cmd+Z
  KEY_REDO: 'y',   // Ctrl+Y or Cmd+Y
  
  // Modifiers
  MODIFIER_CTRL: 'Control',
  MODIFIER_CMD: 'Meta',
  MODIFIER_SHIFT: 'Shift',
  MODIFIER_ALT: 'Alt'
};

/**
 * UI Text and Labels
 */
export const UI_TEXT = {
  // Button labels
  ADD_EFFECT: 'Add Effect',
  DELETE_EFFECT: 'Delete',
  DUPLICATE_EFFECT: 'Duplicate',
  COPY_EFFECT: 'Copy',
  PASTE_EFFECT: 'Paste',
  
  // Menu items
  PRIMARY_EFFECTS: 'Primary Effects',
  SECONDARY_EFFECTS: 'Secondary',
  KEYFRAME_EFFECTS: 'Keyframes',
  FINAL_EFFECTS: 'Final Effects',
  
  // Statuses
  LOADING: 'Loading effects...',
  NO_EFFECTS: 'No effects added',
  NO_SECONDARY: 'No secondary effects',
  NO_KEYFRAMES: 'No keyframe effects',
  
  // Confirmation dialogs
  CONFIRM_DELETE: 'Delete effect?',
  CONFIRM_DELETE_DESC: 'This action cannot be undone.',
  
  // Error messages
  ERROR_INVALID_EFFECT: 'Invalid effect ID',
  ERROR_MISSING_PROPERTY: 'Missing required property',
  ERROR_REORDER_FAILED: 'Failed to reorder effects',
  ERROR_DELETE_FAILED: 'Failed to delete effect',
  
  // ARIA labels
  ARIA_EFFECT_LIST: 'Effects list',
  ARIA_EFFECT_ITEM: 'Effect item',
  ARIA_VISIBILITY_TOGGLE: 'Toggle visibility',
  ARIA_DELETE_BUTTON: 'Delete effect',
  ARIA_CONTEXT_MENU: 'Effect options menu'
};

/**
 * CSS Class Names (BEM convention)
 * Used for styling and testing hooks
 */
export const CSS_CLASSES = {
  // Container
  PANEL: 'effectsPanel',
  PANEL_CONTAINER: 'effectsPanel-container',
  
  // List components
  LIST: 'effectsList',
  LIST_ITEM: 'effectsPanel-effectItem',
  LIST_EMPTY: 'effectsList-empty',
  
  // Effect item states
  ITEM_SELECTED: 'effectItem--selected',
  ITEM_DRAGGING: 'effectItem--dragging',
  ITEM_DRAGGING_OVER: 'effectItem--draggingOver',
  
  // Secondary/Keyframe
  SECONDARY_LIST: 'effectsPanel-secondaryEffects',
  KEYFRAME_LIST: 'effectsPanel-keyframeEffects',
  
  // Buttons and controls
  BUTTON_ADD: 'effectsPanel-addButton',
  BUTTON_DELETE: 'effectsPanel-deleteButton',
  BUTTON_VISIBILITY: 'effectsPanel-visibilityButton',
  
  // Context menu
  CONTEXT_MENU: 'effectContextMenu',
  CONTEXT_MENU_ITEM: 'effectContextMenu-item',
  
  // Config panel
  CONFIG_PANEL: 'effectConfigPanel',
  CONFIG_PANEL_OPEN: 'effectConfigPanel--open',
  
  // Modals
  MODAL: 'effectsPanel-modal',
  MODAL_OVERLAY: 'effectsPanel-modal-overlay',
  
  // Drag indicator
  DROP_INDICATOR: 'effectsPanel-dropIndicator'
};

/**
 * Validation rules and constraints
 */
export const VALIDATION = {
  // Effect names
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  
  // Properties
  MIN_NUMERIC_VALUE: -9999,
  MAX_NUMERIC_VALUE: 9999,
  
  // Collection sizes
  MAX_EFFECTS: 1000,
  MAX_SECONDARY_EFFECTS: 500,
  MAX_KEYFRAME_EFFECTS: 500,
  
  // Depth limits
  MAX_NESTING_DEPTH: 3
};

/**
 * Effect types and categories
 */
export const EFFECT_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  KEYFRAME: 'keyframe',
  FINAL: 'final'
};

/**
 * Error severity levels (for logging)
 */
export const ERROR_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Performance measurement keys
 */
export const PERF_KEYS = {
  RENDER_TIME: 'effectsPanel:render',
  REORDER_TIME: 'effectsPanel:reorder',
  DELETE_TIME: 'effectsPanel:delete',
  ADD_TIME: 'effectsPanel:add',
  MEMORY_DELTA: 'effectsPanel:memory'
};

export default {
  EVENTS,
  TIMING,
  SPACING,
  DRAG_CONFIG,
  KEYBOARD,
  UI_TEXT,
  CSS_CLASSES,
  VALIDATION,
  EFFECT_TYPES,
  ERROR_LEVELS,
  PERF_KEYS
};