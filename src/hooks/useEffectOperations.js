/**
 * Simplified hook for effect operations using EffectOperationsService
 * Extracted from useEffectManagement to follow Single Responsibility Principle
 */

import { useState, useEffect, useCallback } from 'react';
import { useServices } from '../contexts/ServiceContext.js';
import EffectOperationsService from '../services/EffectOperationsService.js';
import PreferencesService from '../services/PreferencesService.js';

export default function useEffectOperations(projectState) {
    const { commandService, eventBusService, loggerService } = useServices();
    
    // State for available effects
    const [availableEffects, setAvailableEffects] = useState({
        primary: [],
        secondary: [],
        finalImage: []
    });
    const [effectsLoaded, setEffectsLoaded] = useState(false);
    const [editingEffect, setEditingEffect] = useState(null);
    const [contextMenuEffect, setContextMenuEffect] = useState(null);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

    // Initialize EffectOperationsService
    const [effectOperationsService] = useState(() => {
        if (!commandService || !eventBusService || !loggerService) {
            console.warn('useEffectOperations: Missing required services, operations will be limited');
            return null;
        }
        
        return new EffectOperationsService({
            commandService,
            eventBus: eventBusService,
            logger: loggerService
        });
    });

    // Load available effects
    const loadAvailableEffects = useCallback(async () => {
        try {
            const result = await window.api.getAvailableEffects();
            console.log('🎭 Available effects result:', result);
            if (result.success) {
                setAvailableEffects({
                    primary: result.effects.primary || [],
                    secondary: result.effects.secondary || [],
                    finalImage: result.effects.finalImage || []
                });
                setEffectsLoaded(true);
            }
        } catch (error) {
            console.error('Failed to load available effects:', error);
        }
    }, []);

    // Refresh available effects
    const refreshAvailableEffects = useCallback(async () => {
        try {
            console.log('🔄 Refreshing available effects...');
            const result = await window.api.refreshEffectRegistry();
            console.log('🎭 Refresh effects result:', result);
            if (result.success) {
                setAvailableEffects({
                    primary: result.effects.primary || [],
                    secondary: result.effects.secondary || [],
                    finalImage: result.effects.finalImage || []
                });
                console.log('✅ Available effects refreshed successfully');
            }
        } catch (error) {
            console.error('Failed to refresh available effects:', error);
        }
    }, []);

    // Load effects on mount
    useEffect(() => {
        loadAvailableEffects();
    }, [loadAvailableEffects]);

    // Effect operation handlers using the service
    const handleAddEffect = useCallback(async (effectName, effectType = 'primary') => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.createEffect({
                effectName,
                effectType,
                projectState,
                availableEffects
            });
        } catch (error) {
            console.error('Error adding effect:', error);
            alert(`Error adding effect: ${error.message}`);
        }
    }, [effectOperationsService, projectState, availableEffects]);

    const handleAddEffectWithConfig = useCallback(async (effectName, effectType = 'primary', config, percentChance = 100) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.createEffectWithConfig({
                effectName,
                effectType,
                config,
                percentChance,
                projectState,
                availableEffects
            });
        } catch (error) {
            console.error('Error adding effect with config:', error);
            alert(`Error adding effect: ${error.message}`);
        }
    }, [effectOperationsService, projectState, availableEffects]);

    const handleEffectUpdate = useCallback(async (index, updatedEffect) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.updateEffect({
                index,
                updatedEffect,
                projectState
            });
        } catch (error) {
            console.error('Error updating effect:', error);
        }
    }, [effectOperationsService, projectState]);

    const handleEffectDelete = useCallback(async (index) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.deleteEffect({
                index,
                projectState
            });
        } catch (error) {
            console.error('Error deleting effect:', error);
        }
    }, [effectOperationsService, projectState]);

    const handleEffectReorder = useCallback(async (fromIndex, toIndex) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.reorderEffects({
                fromIndex,
                toIndex,
                projectState
            });
        } catch (error) {
            console.error('Error reordering effects:', error);
        }
    }, [effectOperationsService, projectState]);

    const handleEffectToggleVisibility = useCallback(async (effectIdOrIndex) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            // 🔒 CRITICAL: Determine if we received an ID or index
            const currentEffects = projectState.getState().effects || [];
            const isId = typeof effectIdOrIndex === 'string';
            
            if (isId) {
                // ID-first pattern: pass effectId
                await effectOperationsService.toggleEffectVisibility({
                    effectId: effectIdOrIndex,
                    projectState
                });
            } else {
                // Backward compatibility: resolve index to ID
                const effect = currentEffects[effectIdOrIndex];
                if (effect && effect.id) {
                    console.warn(`⚠️ handleEffectToggleVisibility called with index (${effectIdOrIndex}). Resolving to ID: ${effect.id}`);
                    await effectOperationsService.toggleEffectVisibility({
                        effectId: effect.id,
                        projectState
                    });
                } else {
                    console.error(`❌ No effect found at index ${effectIdOrIndex}`);
                }
            }
        } catch (error) {
            console.error('Error toggling effect visibility:', error);
        }
    }, [effectOperationsService, projectState]);

    const handleAddSecondaryEffect = useCallback(async (parentIndex, effectName, config) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.createSecondaryEffect({
                parentIndex,
                effectName,
                config,
                projectState
            });
        } catch (error) {
            console.error('Error adding secondary effect:', error);
        }
    }, [effectOperationsService, projectState]);

    const handleAddKeyframeEffect = useCallback(async (parentIndex, effectName, frame, config) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.createKeyframeEffect({
                parentIndex,
                effectName,
                frame,
                config,
                projectState
            });
        } catch (error) {
            console.error('Error adding keyframe effect:', error);
        }
    }, [effectOperationsService, projectState]);

    const handleDeleteKeyframeEffect = useCallback(async (parentIndex, keyframeIndex) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.deleteKeyframeEffect({
                parentIndex,
                keyframeIndex,
                projectState
            });
        } catch (error) {
            console.error('Error deleting keyframe effect:', error);
        }
    }, [effectOperationsService, projectState]);

    const handleToggleKeyframeVisibility = useCallback(async (parentIndex, keyframeIndex) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.toggleKeyframeEffectVisibility({
                parentIndex,
                keyframeIndex,
                projectState
            });
        } catch (error) {
            console.error('Error toggling keyframe visibility:', error);
        }
    }, [effectOperationsService, projectState]);

    // UI state handlers
    const handleEffectRightClick = useCallback((effect, index, e) => {
        e.preventDefault();
        setContextMenuEffect({ effect, index });
        setContextMenuPos({ x: e.clientX, y: e.clientY });
    }, []);

    const handleEditEffect = useCallback((effectIndex, effectType = 'primary', subIndex = null) => {
        setEditingEffect({
            effectIndex,
            effectType,
            subIndex
        });
    }, []);

    const getEditingEffectData = useCallback(() => {
        const currentEffects = projectState?.getState()?.effects || [];
        console.log('🔍 getEditingEffectData called with:', {
            editingEffect,
            hasCurrentEffects: !!currentEffects.length,
            effectsLength: currentEffects.length,
            effectIndex: editingEffect?.effectIndex,
            timestamp: Date.now()
        });

        if (!editingEffect || !currentEffects[editingEffect.effectIndex]) {
            console.log('❌ getEditingEffectData: Returning null because no editingEffect or invalid index');
            return null;
        }

        const effect = currentEffects[editingEffect.effectIndex];
        
        if (editingEffect.effectType === 'secondary' && editingEffect.subIndex !== null) {
            const secondaryEffect = effect.secondaryEffects?.[editingEffect.subIndex];
            if (secondaryEffect) {
                return {
                    effect: secondaryEffect,
                    effectType: 'secondary',
                    parentIndex: editingEffect.effectIndex,
                    subIndex: editingEffect.subIndex
                };
            }
        } else if (editingEffect.effectType === 'keyframe' && editingEffect.subIndex !== null) {
            const keyframeEffect = effect.keyframeEffects?.[editingEffect.subIndex];
            if (keyframeEffect) {
                return {
                    effect: keyframeEffect,
                    effectType: 'keyframe',
                    parentIndex: editingEffect.effectIndex,
                    subIndex: editingEffect.subIndex
                };
            }
        } else {
            return {
                effect,
                effectType: 'primary',
                effectIndex: editingEffect.effectIndex
            };
        }

        return null;
    }, [editingEffect, projectState]);

    const closeEditDialog = useCallback(() => {
        setEditingEffect(null);
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenuEffect(null);
    }, []);

    // Get operation metrics from service
    const getOperationMetrics = useCallback(() => {
        if (!effectOperationsService) {
            return {
                effectsCreated: 0,
                effectsUpdated: 0,
                effectsDeleted: 0,
                effectsReordered: 0,
                secondaryEffectsCreated: 0,
                keyframeEffectsCreated: 0,
                operationErrors: 0,
                lastOperationTime: null
            };
        }
        return effectOperationsService.getOperationMetrics();
    }, [effectOperationsService]);

    // Listen for effect events from event-driven architecture
    useEffect(() => {
        if (!eventBusService) return;

        const unsubscribeEffectAdd = eventBusService.subscribe('effect:add', (payload) => {
            console.log('🎭 useEffectOperations: Effect add event received:', payload);

            if (payload.config && payload.config.specialtyGroup) {
                console.log('🌟 useEffectOperations: Detected specialty effect, using provided config:', payload.config);
                handleAddEffectWithConfig(payload.effectName, payload.effectType, payload.config, payload.percentChance);
            } else {
                handleAddEffect(payload.effectName, payload.effectType);
            }
        }, { component: 'useEffectOperations' });

        const unsubscribeEffectDelete = eventBusService.subscribe('effect:delete', (payload) => {
            console.log('🎭 useEffectOperations: Effect delete event received:', payload);
            
            // 🔒 CRITICAL: Prefer effectId over effectIndex (ID-first pattern)
            let effectIndex;
            if (payload.effectId) {
                const currentEffects = projectState.getState().effects || [];
                effectIndex = currentEffects.findIndex(e => e.id === payload.effectId);
                if (effectIndex === -1) {
                    console.error('❌ effect:delete: Effect with ID not found:', payload.effectId);
                    return;
                }
                console.log(`✅ effect:delete: Resolved effect ID "${payload.effectId}" to index ${effectIndex}`);
            } else if (payload.effectIndex !== undefined) {
                console.warn('⚠️ effect:delete event received with effectIndex only. Please pass effectId.');
                effectIndex = payload.effectIndex;
            } else {
                console.error('❌ effect:delete: Neither effectId nor effectIndex provided');
                return;
            }
            
            handleEffectDelete(effectIndex);
        }, { component: 'useEffectOperations' });

        const unsubscribeEffectReorder = eventBusService.subscribe('effect:reorder', (payload) => {
            console.log('🎭 useEffectOperations: Effect reorder event received:', payload);
            handleEffectReorder(payload.dragIndex, payload.hoverIndex);
        }, { component: 'useEffectOperations' });

        const unsubscribeEffectToggleVisibility = eventBusService.subscribe('effect:togglevisibility', (payload) => {
            console.log('🎭 useEffectOperations: Effect toggle visibility event received:', payload);
            // 🔒 CRITICAL: Prefer effectId over effectIndex (ID-first pattern)
            const identifier = payload.effectId || payload.effectIndex;
            if (!payload.effectId && payload.effectIndex !== undefined) {
                console.warn('⚠️ effect:togglevisibility event received with effectIndex only. Please pass effectId.');
            }
            handleEffectToggleVisibility(identifier);
        }, { component: 'useEffectOperations' });

        // 🔒 REMOVED: Duplicate listeners for secondary and keyframe effects
        // These are now handled exclusively by useEffectManagement.js (active implementation)
        // Keeping both caused double-execution bug (effects added twice)

        const unsubscribeEffectDeleteKeyframe = eventBusService.subscribe('effect:deletekeyframe', (payload) => {
            console.log('🎭 useEffectOperations: Keyframe delete event received:', payload);
            console.log('🎭 About to call handleDeleteKeyframeEffect with:', { parentIndex: payload.parentIndex, keyframeIndex: payload.keyframeIndex });
            handleDeleteKeyframeEffect(payload.parentIndex, payload.keyframeIndex);
        }, { component: 'useEffectOperations' });

        const unsubscribeEffectKeyframeVisibility = eventBusService.subscribe('effect:keyframevisibility', (payload) => {
            console.log('🎭 useEffectOperations: Keyframe visibility event received:', payload);
            console.log('🎭 About to call handleToggleKeyframeVisibility with:', { parentIndex: payload.parentIndex, keyframeIndex: payload.keyframeIndex });
            handleToggleKeyframeVisibility(payload.parentIndex, payload.keyframeIndex);
        }, { component: 'useEffectOperations' });

        const unsubscribeEffectsRefreshed = eventBusService.subscribe('effects:refreshed', () => {
            console.log('🎭 useEffectOperations: Effects refreshed event received');
            loadAvailableEffects();
        }, { component: 'useEffectOperations' });

        return () => {
            unsubscribeEffectAdd();
            unsubscribeEffectDelete();
            unsubscribeEffectReorder();
            unsubscribeEffectToggleVisibility();
            unsubscribeEffectDeleteKeyframe();
            unsubscribeEffectKeyframeVisibility();
            unsubscribeEffectsRefreshed();
        };
    }, [
        eventBusService,
        handleAddEffect,
        handleAddEffectWithConfig,
        handleEffectDelete,
        handleEffectReorder,
        handleEffectToggleVisibility,
        handleDeleteKeyframeEffect,
        handleToggleKeyframeVisibility,
        availableEffects,
        loadAvailableEffects
    ]);

    return {
        // State
        availableEffects,
        effectsLoaded,
        editingEffect,
        contextMenuEffect,
        contextMenuPos,
        
        // Effect operations
        handleAddEffect,
        handleAddEffectWithConfig,
        handleEffectUpdate,
        handleEffectDelete,
        handleEffectReorder,
        handleEffectToggleVisibility,
        handleAddSecondaryEffect,
        handleAddKeyframeEffect,
        handleDeleteKeyframeEffect,
        handleToggleKeyframeVisibility,
        
        // UI operations
        handleEffectRightClick,
        handleEditEffect,
        getEditingEffectData,
        closeEditDialog,
        closeContextMenu,
        
        // Utility operations
        loadAvailableEffects,
        refreshAvailableEffects,
        getOperationMetrics,
        
        // Service reference (for advanced usage)
        effectOperationsService
    };
}