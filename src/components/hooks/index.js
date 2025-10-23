/**
 * Custom Hooks for EffectsPanel
 * 
 * This file provides centralized exports for all EffectsPanel hooks.
 * 
 * Usage:
 * ```javascript
 * import { 
 *   useEffectSelection, 
 *   useEffectDragDrop, 
 *   useEffectPanelModals 
 * } from './hooks';
 * ```
 */

export { useEffectSelection, useEffectSelection as default } from './useEffectSelection.js';
export { useEffectDragDrop } from './useEffectDragDrop.js';
export { useEffectPanelModals } from './useEffectPanelModals.js';

/**
 * Re-export all hooks as named exports for convenience
 */
export * from './useEffectSelection.js';
export * from './useEffectDragDrop.js';
export * from './useEffectPanelModals.js';