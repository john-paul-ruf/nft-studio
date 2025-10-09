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

    const handleEffectToggleVisibility = useCallback(async (index) => {
        if (!effectOperationsService) {
            console.error('EffectOperationsService not available');
            return;
        }

        try {
            await effectOperationsService.toggleEffectVisibility({
                index,
                projectState
            });
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
            handleEffectDelete(payload.effectIndex);
        }, { component: 'useEffectOperations' });

        const unsubscribeEffectReorder = eventBusService.subscribe('effect:reorder', (payload) => {
            console.log('🎭 useEffectOperations: Effect reorder event received:', payload);
            handleEffectReorder(payload.dragIndex, payload.hoverIndex);
        }, { component: 'useEffectOperations' });

        const unsubscribeEffectToggleVisibility = eventBusService.subscribe('effect:togglevisibility', (payload) => {
            console.log('🎭 useEffectOperations: Effect toggle visibility event received:', payload);
            handleEffectToggleVisibility(payload.effectIndex);
        }, { component: 'useEffectOperations' });

        const unsubscribeEffectAddSecondary = eventBusService.subscribe('effect:addsecondary', async (payload) => {
            console.log('🎭 useEffectOperations: Effect add secondary event received:', payload);

            try {
                // Get effect defaults from backend first
                const result = await window.api.getEffectDefaults(payload.effectName);
                if (!result.success) {
                    console.error('Failed to get effect defaults for secondary effect:', result.error);
                    return;
                }

                // Find the effect in available effects to get proper metadata
                const effectCategory = availableEffects.secondary || [];
                const effectData = effectCategory.find(e => e.name === payload.effectName);
                const registryKey = effectData?.registryKey || payload.effectName;

                // Check for user-saved defaults first
                const savedDefaults = await PreferencesService.getEffectDefaults(registryKey);
                const config = savedDefaults || result.defaults || {};

                console.log('🎭 useEffectOperations: Using secondary effect defaults:', {
                    effectName: payload.effectName,
                    registryKey,
                    usingSavedDefaults: !!savedDefaults,
                    config
                });

                await handleAddSecondaryEffect(payload.parentIndex, payload.effectName, config);
            } catch (error) {
                console.error('Error handling add secondary effect event:', error);
            }
        }, { component: 'useEffectOperations' });

        const unsubscribeEffectAddKeyframe = eventBusService.subscribe('effect:addkeyframe', async (payload) => {
            console.log('🎭 useEffectOperations: Effect add keyframe event received:', payload);

            try {
                // Get effect defaults from backend first
                const result = await window.api.getEffectDefaults(payload.effectName);
                if (!result.success) {
                    console.error('Failed to get effect defaults for keyframe effect:', result.error);
                    return;
                }

                // Find the effect in available effects to get proper metadata
                const effectCategory = availableEffects.secondary || [];
                const effectData = effectCategory.find(e => e.name === payload.effectName);
                const registryKey = effectData?.registryKey || payload.effectName;

                // Check for user-saved defaults first
                const savedDefaults = await PreferencesService.getEffectDefaults(registryKey);
                const config = savedDefaults || result.defaults || {};

                console.log('🎭 useEffectOperations: Using keyframe effect defaults:', {
                    effectName: payload.effectName,
                    registryKey,
                    frame: payload.frame,
                    usingSavedDefaults: !!savedDefaults,
                    config
                });

                await handleAddKeyframeEffect(payload.parentIndex, payload.effectName, payload.frame, config);
            } catch (error) {
                console.error('Error handling add keyframe effect event:', error);
            }
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
            unsubscribeEffectAddSecondary();
            unsubscribeEffectAddKeyframe();
            unsubscribeEffectsRefreshed();
        };
    }, [
        eventBusService,
        handleAddEffect,
        handleAddEffectWithConfig,
        handleEffectDelete,
        handleEffectReorder,
        handleEffectToggleVisibility,
        handleAddSecondaryEffect,
        handleAddKeyframeEffect,
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