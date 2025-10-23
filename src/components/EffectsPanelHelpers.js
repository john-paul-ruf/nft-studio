/**
 * EffectsPanelHelpers.js - Extracted helper functions for EffectsPanel
 * 
 * This module contains all business logic and event handlers from EffectsPanel.jsx
 * organized into factory functions for clean component code.
 * 
 * @module EffectsPanelHelpers
 */

import { useCallback } from 'react';
import PreferencesService from '../services/PreferencesService.js';

/**
 * Create load effects handler
 * @param {Function} setSecondaryEffects - State setter for secondary effects
 * @param {Function} setKeyframeEffects - State setter for keyframe effects
 * @returns {Function} Async function to load effects from API
 */
export const createLoadEffectsHandler = (setSecondaryEffects, setKeyframeEffects) => async () => {
    try {
        const response = await window.api.discoverEffects();
        if (response.success && response.effects) {
            setSecondaryEffects(response.effects.secondary || []);
            setKeyframeEffects(response.effects.keyFrame || []);
        }
    } catch (error) {
        console.error('Failed to load effects:', error);
    }
};

/**
 * Create add effect event handler
 * @param {Object} eventBusService - Event bus service instance
 * @param {Function} setAddEffectMenuOpen - State setter for menu visibility
 * @returns {Function} Handler for adding effects
 */
export const createAddEffectEventHandler = (eventBusService, setAddEffectMenuOpen) => 
    useCallback((effectName, effectType) => {
        eventBusService.emit('effectspanel:effect:add', {
            effectName,
            effectType
        }, {
            source: 'EffectsPanel',
            component: 'EffectsPanel'
        });
        setAddEffectMenuOpen(false);
    }, [eventBusService, setAddEffectMenuOpen]);

/**
 * Create effect selection handler
 * 🔒 CRITICAL: Store effect ID instead of index to prevent stale reference bugs
 * @param {Object} projectState - Project state instance
 * @param {Object} eventBusService - Event bus service instance
 * @param {Function} setSelectedEffect - State setter for selected effect
 * @param {Function} setConfigPanelOpen - State setter for config panel
 * @param {Boolean} isReadOnly - Whether in read-only mode
 * @returns {Function} Handler for selecting effects
 */
export const createEffectSelectHandler = (projectState, eventBusService, setSelectedEffect, setConfigPanelOpen, isReadOnly) =>
    useCallback((effectIndex, effectType = 'primary', subIndex = null) => {
        const freshEffects = projectState?.getState()?.effects || [];
        const effect = freshEffects[effectIndex];
        
        if (!effect || !effect.id) {
            console.error('❌ handleEffectSelect: Cannot select effect without ID', { effectIndex, effect });
            return;
        }
        
        const selectionData = {
            effectId: effect.id, // PRIMARY identifier - stable across reorders
            effectIndex, // HINT for optimization - may become stale after reorder
            effectType,
            subIndex
        };
        
        console.log('🎯 EffectsPanel: Effect selected:', {
            effectId: effect.id,
            effectIndex,
            effectName: effect.name,
            effectType
        });
        
        setSelectedEffect(selectionData);
        
        // Open config panel when an effect is selected
        if (!isReadOnly) {
            setConfigPanelOpen(true);
        }
        
        // Emit selection event for other components to react
        eventBusService.emit('effect:selected', selectionData, {
            source: 'EffectsPanel',
            component: 'EffectsPanel'
        });
    }, [eventBusService, isReadOnly, projectState, setSelectedEffect, setConfigPanelOpen]);

/**
 * Create effect selection checker
 * 🔒 CRITICAL: Compare using effect ID, not index (index can change after reorder)
 * @param {Object} projectState - Project state instance
 * @param {Object} selectedEffect - Currently selected effect
 * @returns {Function} Checker function
 */
export const createIsEffectSelectedChecker = (projectState, selectedEffect) =>
    useCallback((effectIndex, effectType = 'primary', subIndex = null) => {
        if (!selectedEffect) return false;
        
        const freshEffects = projectState?.getState()?.effects || [];
        const effect = freshEffects[effectIndex];
        
        if (!effect || !effect.id) return false;
        
        const isSelected = selectedEffect.effectId === effect.id &&
               selectedEffect.effectType === effectType &&
               selectedEffect.subIndex === subIndex;
        
        if (isSelected) {
            console.log('✅ isEffectSelected: Effect is selected:', {
                effectIndex,
                effectId: effect.id,
                effectName: effect.name,
                selectedEffectId: selectedEffect.effectId,
                selectedEffectIndex: selectedEffect.effectIndex
            });
        }
        
        return isSelected;
    }, [selectedEffect, projectState]);

/**
 * Create selected effect data getter
 * CRITICAL FIX: Always fetch fresh data from ProjectState to avoid stale config
 * @param {Object} projectState - Project state instance
 * @param {Object} selectedEffect - Currently selected effect
 * @returns {Function} Getter function
 */
export const createGetSelectedEffectDataGetter = (projectState, selectedEffect) =>
    useCallback(() => {
        if (!selectedEffect || !projectState) return null;
        
        const freshEffects = projectState.getState().effects || [];
        
        // 🔒 CRITICAL: Resolve effect ID to current index (handles reordering)
        const { effectId, effectType, subIndex } = selectedEffect;
        const effectIndex = freshEffects.findIndex(e => e.id === effectId);
        
        if (effectIndex === -1) {
            console.warn('⚠️ getSelectedEffectData: Selected effect not found (may have been deleted)', { effectId });
            return null;
        }
        
        const effect = freshEffects[effectIndex];
        
        console.log('📋 getSelectedEffectData: Returning effect data for config panel:', {
            effectId,
            effectIndex,
            effectName: effect?.name,
            selectedEffectIndex: selectedEffect.effectIndex
        });
        
        if (!effect) return null;
        
        // Handle different effect types
        if (effectType === 'secondary' && subIndex !== null) {
            const secondaryEffect = effect.secondaryEffects?.[subIndex];
            return secondaryEffect ? {
                ...secondaryEffect,
                effectIndex,
                effectType: 'secondary',
                subEffectIndex: subIndex
            } : null;
        } else if (effectType === 'keyframe' && subIndex !== null) {
            const keyframeEffect = effect.keyframeEffects?.[subIndex];
            return keyframeEffect ? {
                ...keyframeEffect,
                effectIndex,
                effectType: 'keyframe',
                subEffectIndex: subIndex
            } : null;
        } else {
            // Primary or final effect
            return {
                ...effect,
                effectIndex,
                effectType: effect.type || 'primary',
                subEffectIndex: null
            };
        }
    }, [selectedEffect, projectState]);

/**
 * Create config panel change handler
 * @param {Object} projectState - Project state instance
 * @param {Object} eventBusService - Event bus service instance
 * @param {Object} selectedEffect - Currently selected effect
 * @returns {Function} Handler for config changes
 */
export const createConfigPanelChangeHandler = (projectState, eventBusService, selectedEffect) =>
    useCallback((updatedConfig) => {
        if (!selectedEffect) return;
        
        // 🔒 CRITICAL: Use effect ID from selectedEffect (already stored during selection)
        // The ID is stable across reorders, while the index can change before debounced updates fire.
        const { effectId, effectType, subIndex } = selectedEffect;
        
        if (!effectId) {
            console.error('❌ EffectsPanel: Cannot update effect without ID', { selectedEffect });
            return;
        }
        
        // Resolve effect ID to current index for the event payload
        const freshEffects = projectState.getState().effects || [];
        const effectIndex = freshEffects.findIndex(e => e.id === effectId);
        
        if (effectIndex === -1) {
            console.error('❌ EffectsPanel: Selected effect not found (may have been deleted)', { effectId });
            return;
        }
        
        const effect = freshEffects[effectIndex];
        console.log('🔧 EffectsPanel: Config change - emitting update for:', {
            effectId,
            effectIndex,
            effectName: effect?.name,
            effectType,
            configKeys: Object.keys(updatedConfig)
        });
        
        // Emit config change event with effect ID for reliable tracking
        eventBusService.emit('effect:config:change', {
            effectId, // PRIMARY identifier - stable across reorders
            effectIndex, // HINT for optimization - resolved fresh from ID
            effectType,
            subEffectIndex: subIndex, // Use subEffectIndex to match listener expectations
            config: updatedConfig
        }, {
            source: 'EffectsPanel',
            component: 'ConfigPanel'
        });
    }, [selectedEffect, projectState, eventBusService]);

/**
 * Create toggle all visibility handler
 * @param {Array} effects - List of effects
 * @param {Boolean} areAllEffectsVisible - Current visibility state
 * @param {Function} onEffectToggleVisibility - Callback for visibility toggle
 * @returns {Function} Handler for toggling all visibility
 */
export const createToggleAllVisibilityHandler = (effects, areAllEffectsVisible, onEffectToggleVisibility) =>
    useCallback(() => {
        const shouldHide = areAllEffectsVisible;
        effects.forEach((effect) => {
            if ((effect.visible !== false) === shouldHide) {
                // 🔒 CRITICAL: Pass effect ID, not index
                onEffectToggleVisibility(effect.id);
            }
        });
    }, [effects, areAllEffectsVisible, onEffectToggleVisibility]);

/**
 * Detect position property name from effect's default config
 * @param {Object} effectClass - Effect class with defaultConfig
 * @returns {String} Property name for position
 */
const detectPositionProperty = (effectClass) => {
    const defaultConfig = effectClass.defaultConfig || {};

    // Check for common position property names
    if (defaultConfig.center !== undefined) return 'center';
    if (defaultConfig.position !== undefined) return 'position';
    if (defaultConfig.point !== undefined) return 'point';
    if (defaultConfig.location !== undefined) return 'location';

    // Fallback to 'center' for most effects
    return 'center';
};

/**
 * Create specialty effects creation handler
 * @param {Object} eventBusService - Event bus service instance
 * @param {Function} setSpecialtyModalOpen - State setter for specialty modal
 * @returns {Function} Handler for creating specialty effects
 */
export const createCreateSpecialtyHandler = (eventBusService, setSpecialtyModalOpen) =>
    useCallback(async (specialtyData) => {
        const positionPropertyName = detectPositionProperty(specialtyData.effectClass);

        // Get effect configuration in priority order:
        // 1. Custom config from wizard (highest priority)
        // 2. User-saved defaults
        // 3. Effect's default config (fallback)
        const registryKey = specialtyData.effectClass.registryKey;
        const savedDefaults = await PreferencesService.getEffectDefaults(registryKey);

        let baseConfig;
        let configSource;

        if (specialtyData.effectConfig) {
            // Use custom configuration from the wizard
            baseConfig = specialtyData.effectConfig;
            configSource = 'Wizard Configuration';
        } else if (savedDefaults) {
            // Use user-saved defaults
            baseConfig = savedDefaults;
            configSource = 'User Preferences';
        } else {
            // Fallback to raw defaults
            baseConfig = specialtyData.effectClass.defaultConfig;
            configSource = 'Default Configuration';
        }

        console.log('🌟 EffectsPanel: Using effect configuration:', {
            registryKey,
            hasWizardConfig: !!specialtyData.effectConfig,
            hasUserPreferences: !!savedDefaults,
            configSource,
            finalConfig: configSource
        });

        // Create individual effects for each position
        specialtyData.positions.forEach((position, index) => {
            // Create proper Position object structure
            const positionObject = {
                name: 'position',
                x: Math.round(position.x),
                y: Math.round(position.y),
                __className: 'Position'
            };

            const effectData = {
                effectName: specialtyData.effectClass.registryKey,
                effectType: 'primary',
                config: {
                    // Use user preferences first, fallback to raw defaults
                    ...baseConfig,
                    // Override position with calculated position using correct property name
                    [positionPropertyName]: positionObject,
                    // Add specialty metadata
                    specialtyGroup: `${specialtyData.effectClass.registryKey}_${Date.now()}`,
                    specialtyIndex: index,
                    specialtyTotal: specialtyData.positions.length
                },
                percentChance: 100 // Specialty effects always occur
            };

            console.log('🌟 EffectsPanel: Creating effect with position:', {
                effectName: specialtyData.effectClass.registryKey,
                positionPropertyName,
                positionObject,
                originalPosition: position,
                usingUserDefaults: !!savedDefaults
            });

            // Emit individual effect creation events
            eventBusService.emit('effectspanel:effect:add', effectData, {
                source: 'EffectsPanel',
                component: 'SpecialtyCreator'
            });
        });

        // Close the modal
        setSpecialtyModalOpen(false);
    }, [eventBusService, setSpecialtyModalOpen]);

/**
 * Create bulk add keyframes handler
 * @param {Object} eventBusService - Event bus service instance
 * @param {Number} bulkAddTargetIndex - Target effect index
 * @param {Function} setBulkAddModalOpen - State setter for modal
 * @param {Function} setBulkAddTargetIndex - State setter for target index
 * @returns {Function} Handler for bulk adding keyframes
 */
export const createBulkAddKeyframesHandler = (eventBusService, bulkAddTargetIndex, setBulkAddModalOpen, setBulkAddTargetIndex) =>
    useCallback((keyframeEffectsData) => {
        if (bulkAddTargetIndex === null || !keyframeEffectsData || keyframeEffectsData.length === 0) {
            return;
        }

        // Emit events for each keyframe effect using the standard event format
        keyframeEffectsData.forEach(keyframeData => {
            eventBusService.emit('effectspanel:effect:addkeyframe', {
                effectName: keyframeData.registryKey,
                effectType: 'keyframe',
                parentIndex: bulkAddTargetIndex,
                frame: keyframeData.frame,
                config: keyframeData.config
            }, {
                source: 'EffectsPanel',
                component: 'BulkAddKeyframes'
            });
        });

        // Close the modal and reset state
        setBulkAddModalOpen(false);
        setBulkAddTargetIndex(null);
    }, [eventBusService, bulkAddTargetIndex, setBulkAddModalOpen, setBulkAddTargetIndex]);

/**
 * Create primary effect drag start handler
 * @param {Function} setDraggedIndex - State setter for dragged index
 * @returns {Function} Handler for drag start
 */
export const createDragStartHandler = (setDraggedIndex) => (e, index, section) => {
    setDraggedIndex({ index, section });
    e.dataTransfer.effectAllowed = 'move';
};

/**
 * Create drag over handler
 * @returns {Function} Handler for drag over
 */
export const createDragOverHandler = () => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
};

/**
 * Create primary effect drop handler
 * @param {Object} draggedIndex - Currently dragged index
 * @param {Function} setDraggedIndex - State setter for dragged index
 * @param {Function} onEffectReorder - Callback for reordering
 * @returns {Function} Handler for drop
 */
export const createDropHandler = (draggedIndex, setDraggedIndex, onEffectReorder) => (e, dropIndex, section) => {
    e.preventDefault();
    if (draggedIndex !== null &&
        draggedIndex.index !== dropIndex &&
        draggedIndex.section === section) {
        onEffectReorder(draggedIndex.index, dropIndex);
    }
    setDraggedIndex(null);
};

/**
 * Create secondary effect drag start handler
 * @param {Function} setDraggedSecondaryIndex - State setter
 * @returns {Function} Handler for drag start
 */
export const createSecondaryDragStartHandler = (setDraggedSecondaryIndex) => (e, parentIndex, subIndex) => {
    setDraggedSecondaryIndex({ parentIndex, subIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); // Prevent parent drag
};

/**
 * Create secondary effect drag over handler
 * @returns {Function} Handler for drag over
 */
export const createSecondaryDragOverHandler = () => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.stopPropagation();
};

/**
 * Create secondary effect drop handler
 * @param {Object} draggedSecondaryIndex - Currently dragged secondary index
 * @param {Function} setDraggedSecondaryIndex - State setter
 * @param {Function} onSecondaryEffectReorder - Callback for reordering
 * @returns {Function} Handler for drop
 */
export const createSecondaryDropHandler = (draggedSecondaryIndex, setDraggedSecondaryIndex, onSecondaryEffectReorder) => 
    (e, parentIndex, dropIndex) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedSecondaryIndex !== null &&
            draggedSecondaryIndex.parentIndex === parentIndex &&
            draggedSecondaryIndex.subIndex !== dropIndex) {
            onSecondaryEffectReorder && onSecondaryEffectReorder(parentIndex, draggedSecondaryIndex.subIndex, dropIndex);
        }
        setDraggedSecondaryIndex(null);
    };

/**
 * Create keyframe effect drag start handler
 * @param {Function} setDraggedKeyframeIndex - State setter
 * @returns {Function} Handler for drag start
 */
export const createKeyframeDragStartHandler = (setDraggedKeyframeIndex) => (e, parentIndex, subIndex) => {
    setDraggedKeyframeIndex({ parentIndex, subIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); // Prevent parent drag
};

/**
 * Create keyframe effect drag over handler
 * @returns {Function} Handler for drag over
 */
export const createKeyframeDragOverHandler = () => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.stopPropagation();
};

/**
 * Create keyframe effect drop handler
 * @param {Object} draggedKeyframeIndex - Currently dragged keyframe index
 * @param {Function} setDraggedKeyframeIndex - State setter
 * @param {Function} onKeyframeEffectReorder - Callback for reordering
 * @returns {Function} Handler for drop
 */
export const createKeyframeDropHandler = (draggedKeyframeIndex, setDraggedKeyframeIndex, onKeyframeEffectReorder) =>
    (e, parentIndex, dropIndex) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedKeyframeIndex !== null &&
            draggedKeyframeIndex.parentIndex === parentIndex &&
            draggedKeyframeIndex.subIndex !== dropIndex) {
            onKeyframeEffectReorder && onKeyframeEffectReorder(parentIndex, draggedKeyframeIndex.subIndex, dropIndex);
        }
        setDraggedKeyframeIndex(null);
    };

/**
 * Create final effect checker
 * @returns {Function} Checker function
 */
export const createIsFinalEffectChecker = () => (effect) => {
    if (!effect) return false;

    // Explicitly exclude secondary and keyframe effects from final effects
    if (effect.type === 'secondary' || effect.type === 'keyframe') {
        console.log('📋 EffectsPanel: Excluding from final effects:', effect.name || effect.className, 'type:', effect.type);
        return false;
    }

    // Only allow actual final image effects
    const isFinal = effect.type === 'finalImage';
    console.log('📋 EffectsPanel: Effect categorization:', {
        name: effect.name || effect.className,
        type: effect.type,
        isFinal
    });

    return isFinal;
};