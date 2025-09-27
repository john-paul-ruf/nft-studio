import { useState, useEffect, useCallback } from 'react';
import CenterUtils from '../../utils/CenterUtils.js';
import IdGenerator from '../../utils/IdGenerator.js';
import {
    AddEffectCommand,
    DeleteEffectCommand,
    UpdateEffectCommand,
    ReorderEffectsCommand,
    AddSecondaryEffectCommand,
    AddKeyframeEffectCommand,
    ReorderSecondaryEffectsCommand,
    ReorderKeyframeEffectsCommand,
    DeleteSecondaryEffectCommand,
    DeleteKeyframeEffectCommand
} from '../../commands/ProjectCommands.js';
import { useServices } from '../../contexts/ServiceContext.js';
import PreferencesService from '../../services/PreferencesService.js';


export default function useEffectManagement(projectState) {
    const { commandService, eventBusService } = useServices();

    // Debug ProjectState (single source of truth)
    const currentEffects = projectState?.getState()?.effects || [];
    console.log('🎭 useEffectManagement: Hook called with ProjectState effects:', currentEffects.length, currentEffects.map(e => e.name || e.className));

    const [availableEffects, setAvailableEffects] = useState({
        primary: [],
        secondary: [],
        finalImage: []
    });
    const [effectsLoaded, setEffectsLoaded] = useState(false);
    const [editingEffect, setEditingEffect] = useState(null);
    const [contextMenuEffect, setContextMenuEffect] = useState(null);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

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

    // Refresh available effects (useful after loading plugins)
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

    // Listen for all effect events from event-driven architecture
    useEffect(() => {
        if (!eventBusService) return;

        const unsubscribeEffectAdd = eventBusService.subscribe('effect:add', (payload) => {
            console.log('🎭 useEffectManagement: Effect add event received:', payload);

            // Check if this is a specialty effect with pre-calculated config
            if (payload.config && payload.config.specialtyGroup) {
                console.log('🌟 useEffectManagement: Detected specialty effect, using provided config:', payload.config);
                handleAddEffectWithConfig(payload.effectName, payload.effectType, payload.config, payload.percentChance);
            } else {
                handleAddEffectDirect(payload.effectName, payload.effectType);
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectDelete = eventBusService.subscribe('effect:delete', (payload) => {
            console.log('🎭 useEffectManagement: Effect delete event received:', payload);
            handleEffectDelete(payload.effectIndex);
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectReorder = eventBusService.subscribe('effect:reorder', (payload) => {
            console.log('🎭 useEffectManagement: Effect reorder event received:', payload);
            handleEffectReorder(payload.dragIndex, payload.hoverIndex);
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectEdit = eventBusService.subscribe('effect:edit', (payload) => {
            console.log('🎭 useEffectManagement: Effect edit event received:', payload);
            handleEditEffect(payload.effectIndex, payload.effectType, payload.subIndex);
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectToggleVisibility = eventBusService.subscribe('effect:togglevisibility', (payload) => {
            console.log('🎭 useEffectManagement: Effect toggle visibility event received:', payload);
            handleEffectToggleVisibility(payload.effectIndex);
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectAddSecondary = eventBusService.subscribe('effect:addsecondary', async (payload) => {
            console.log('🎭 useEffectManagement: Effect add secondary event received:', payload);

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

                console.log('🎭 useEffectManagement: Using secondary effect defaults:', {
                    effectName: payload.effectName,
                    registryKey,
                    usingSavedDefaults: !!savedDefaults,
                    config
                });

                const currentEffects = projectState.getState().effects || [];
                const targetEffect = currentEffects[payload.parentIndex];
                if (targetEffect) {
                    const secondaryEffectData = {
                        id: IdGenerator.generateId(),
                        registryKey: payload.effectName,
                        config
                    };

                    console.log('🎭 EVENT HANDLER: Created secondaryEffectData:', {
                        registryKey: secondaryEffectData.registryKey,
                        config: secondaryEffectData.config,
                        fullData: secondaryEffectData
                    });
                    console.log('🎭 EVENT HANDLER: Target effect before adding secondary:', {
                        index: payload.parentIndex,
                        targetEffect: targetEffect,
                        existingSecondaryEffects: targetEffect.secondaryEffects?.length || 0
                    });

                    handleAddSecondaryEffect(targetEffect, payload.parentIndex, secondaryEffectData);
                }
            } catch (error) {
                console.error('Error adding secondary effect:', error);
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectAddKeyframe = eventBusService.subscribe('effect:addkeyframe', async (payload) => {
            console.log('🎭 useEffectManagement: Effect add keyframe event received:', payload);

            try {
                // Get effect defaults from backend first
                const result = await window.api.getEffectDefaults(payload.effectName);
                if (!result.success) {
                    console.error('Failed to get effect defaults for keyframe effect:', result.error);
                    return;
                }

                // Find the effect in available effects to get proper metadata
                const effectCategory = availableEffects.secondary || []; // Keyframe effects are in secondary category
                const effectData = effectCategory.find(e => e.name === payload.effectName);
                const registryKey = effectData?.registryKey || payload.effectName;

                // Use config from payload if provided, otherwise check for user-saved defaults
                let config;
                if (payload.config && Object.keys(payload.config).length > 0) {
                    config = payload.config;
                    console.log('🎭 useEffectManagement: Using config from payload (bulk add)');
                } else {
                    const savedDefaults = await PreferencesService.getEffectDefaults(registryKey);
                    config = savedDefaults || result.defaults || {};
                    console.log('🎭 useEffectManagement: Using default config');
                }

                console.log('🎭 useEffectManagement: Using keyframe effect config:', {
                    effectName: payload.effectName,
                    registryKey,
                    fromPayload: !!(payload.config && Object.keys(payload.config).length > 0),
                    config
                });

                const currentEffects = projectState.getState().effects || [];
                const targetEffect = currentEffects[payload.parentIndex];
                if (targetEffect) {
                    const keyframeEffectData = {
                        id: IdGenerator.generateId(),
                        registryKey: payload.effectName,
                        config
                    };

                    console.log('🎭 useEffectManagement: Adding keyframe effect:', keyframeEffectData);
                    handleAddKeyframeEffect(targetEffect, payload.parentIndex, keyframeEffectData, payload.frame || 0);
                }
            } catch (error) {
                console.error('Error adding keyframe effect:', error);
            }
        }, { component: 'useEffectManagement' });

        // EffectConfigurer events
        const unsubscribeEffectConfigChange = eventBusService.subscribe('effect:config:change', (payload) => {
            console.log('🎭 useEffectManagement: Effect config change event received:', payload);

            // Set editing context from the payload before updating config
            if (payload.effectIndex !== undefined) {
                const context = {
                    effectIndex: payload.effectIndex,
                    effectType: payload.effectType || 'primary',
                    subIndex: payload.subEffectIndex !== undefined ? payload.subEffectIndex : null
                };

                console.log('🎯 useEffectManagement: Setting editing context from event:', context);
                setEditingEffect(context);

                // Use context directly instead of relying on async state update
                handleConfigUpdateWithContext(payload.config, context);
            } else {
                // Fallback to old behavior if no context provided
                handleSubEffectUpdate(payload.config);
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectAttach = eventBusService.subscribe('effect:attach', (payload) => {
            console.log('🎭 useEffectManagement: Effect attach event received:', payload);
            // Handle effect attachment (secondary/keyframe effects from EffectConfigurer)
            if (payload.parentEffect && payload.effectData) {
                const currentEffects = projectState.getState().effects || [];
                const parentIndex = currentEffects.findIndex(e => e === payload.parentEffect);
                if (parentIndex !== -1) {
                    if (payload.attachmentType === 'secondary') {
                        handleAddSecondaryEffect(currentEffects[parentIndex], parentIndex, payload.effectData);
                    } else if (payload.attachmentType === 'keyframe') {
                        handleAddKeyframeEffect(currentEffects[parentIndex], parentIndex, payload.effectData, 0);
                    }
                }
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeSecondaryReorder = eventBusService.subscribe('effectspanel:secondary:reorder', (payload) => {
            console.log('🎭 useEffectManagement: Secondary effect reorder event received:', payload);
            if (projectState) {
                const command = new ReorderSecondaryEffectsCommand(
                    projectState,
                    payload.parentIndex,
                    payload.dragIndex,
                    payload.hoverIndex
                );
                commandService.execute(command);
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeKeyframeReorder = eventBusService.subscribe('effectspanel:keyframe:reorder', (payload) => {
            console.log('🎭 useEffectManagement: Keyframe effect reorder event received:', payload);
            if (projectState) {
                const command = new ReorderKeyframeEffectsCommand(
                    projectState,
                    payload.parentIndex,
                    payload.dragIndex,
                    payload.hoverIndex
                );
                commandService.execute(command);
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeSecondaryDelete = eventBusService.subscribe('effectspanel:secondary:delete', (payload) => {
            console.log('🎭 useEffectManagement: Secondary effect delete event received:', payload);
            if (projectState) {
                const command = new DeleteSecondaryEffectCommand(
                    projectState,
                    payload.parentIndex,
                    payload.secondaryIndex
                );
                commandService.execute(command);
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeKeyframeDelete = eventBusService.subscribe('effectspanel:keyframe:delete', (payload) => {
            console.log('🎭 useEffectManagement: Keyframe effect delete event received:', payload);
            if (projectState) {
                const command = new DeleteKeyframeEffectCommand(
                    projectState,
                    payload.parentIndex,
                    payload.keyframeIndex
                );
                commandService.execute(command);
            }
        }, { component: 'useEffectManagement' });

        // Listen for effects refreshed event (emitted when registry is refreshed)
        const unsubscribeEffectsRefreshed = eventBusService.subscribe('effects:refreshed', async (payload) => {
            console.log('📊 useEffectManagement: Effects refreshed event received:', payload);
            // Reload the available effects from the refreshed registry
            await loadAvailableEffects();
        }, { component: 'useEffectManagement' });

        return () => {
            unsubscribeEffectAdd();
            unsubscribeEffectDelete();
            unsubscribeEffectReorder();
            unsubscribeEffectEdit();
            unsubscribeEffectToggleVisibility();
            unsubscribeEffectAddSecondary();
            unsubscribeEffectAddKeyframe();
            unsubscribeEffectConfigChange();
            unsubscribeEffectAttach();
            unsubscribeSecondaryReorder();
            unsubscribeKeyframeReorder();
            unsubscribeSecondaryDelete();
            unsubscribeKeyframeDelete();
            unsubscribeEffectsRefreshed();
        };
    }, [eventBusService, handleAddEffectDirect, handleEffectDelete, handleEffectReorder, handleEditEffect, handleEffectToggleVisibility, handleAddSecondaryEffect, handleAddKeyframeEffect, handleSubEffectUpdate, handleConfigUpdateWithContext, projectState, availableEffects, loadAvailableEffects]);

    const handleAddEffect = useCallback((effect) => {
        const currentEffects = projectState.getState().effects || [];
        const newEffects = [...currentEffects, effect];
        projectState.update({ effects: newEffects });
    }, [projectState]);

    // Handle adding effects with pre-calculated config (for specialty effects)
    const handleAddEffectWithConfig = useCallback(async (effectName, effectType = 'primary', config, percentChance = 100) => {
        try {
            console.log('🌟 useEffectManagement: Adding effect with provided config:', {
                effectName,
                effectType,
                config,
                percentChance
            });

            // Find the effect in our available effects to get the registryKey
            const effectCategory = availableEffects[effectType] || [];
            const effectData = effectCategory.find(e => e.name === effectName);
            const registryKey = effectData?.registryKey || effectName;

            // For specialty effects, use the provided config directly without centering
            const effect = {
                id: IdGenerator.generateId(),
                name: effectName,
                className: effectData?.className || effectName,
                registryKey: registryKey,
                config: config, // Use the provided config as-is
                type: effectType,
                percentChance: percentChance || 100
            };

            console.log('🌟 useEffectManagement: Created specialty effect:', effect);

            // Add the effect directly to project state
            const currentEffects = projectState.getState().effects || [];
            const newEffects = [...currentEffects, effect];
            projectState.update({ effects: newEffects });

        } catch (error) {
            console.error('🌟 useEffectManagement: Error adding effect with config:', error);
        }
    }, [availableEffects, projectState]);

    const handleAddEffectDirect = useCallback(async (effectName, effectType = 'primary') => {
        try {
            // Get effect defaults from backend
            const result = await window.api.getEffectDefaults(effectName);
            if (result.success) {
                // Find the effect in our available effects to get the registryKey
                const effectCategory = availableEffects[effectType] || [];
                const effectData = effectCategory.find(e => e.name === effectName);
                const registryKey = effectData?.registryKey || effectName;

                // Check for user-saved defaults first
                const savedDefaults = await PreferencesService.getEffectDefaults(registryKey);
                let processedConfig = savedDefaults || result.defaults;

                console.log('🎯 useEffectManagement: Using effect defaults:', {
                    effectName,
                    registryKey,
                    usingSavedDefaults: !!savedDefaults,
                    config: processedConfig
                });

                // Apply center defaults immediately when adding effect
                const projectData = projectState.getState();

                console.log('🎯 useEffectManagement: Applying center defaults to newly added effect:', {
                    effectName,
                    originalConfig: processedConfig,
                    projectData: {
                        targetResolution: projectData?.targetResolution,
                        isHorizontal: projectData?.isHorizontal
                    }
                });

                if (projectData) {
                    processedConfig = CenterUtils.detectAndApplyCenter(processedConfig, projectData);
                    console.log('🎯 useEffectManagement: Center defaults applied:', {
                        original: savedDefaults || result.defaults,
                        processed: processedConfig,
                        changed: JSON.stringify(result.defaults) !== JSON.stringify(processedConfig)
                    });
                }

                // Validate and correct effect type to prevent categorization issues
                let validatedType = effectType;

                // If effect was found in availableEffects, use its natural category
                if (effectData && effectData.category) {
                    const naturalCategory = effectData.category;
                    console.log('🔍 useEffectManagement: Effect natural category validation:', {
                        effectName,
                        requestedType: effectType,
                        naturalCategory: naturalCategory,
                        effectData: effectData
                    });

                    // Use the natural category from the registry if it's valid
                    if (['primary', 'secondary', 'keyframe', 'finalImage'].includes(naturalCategory)) {
                        validatedType = naturalCategory;
                        if (validatedType !== effectType) {
                            console.warn('🔍 useEffectManagement: Corrected effect type:', {
                                effectName,
                                requested: effectType,
                                corrected: validatedType
                            });
                        }
                    }
                }

                const effect = {
                    id: IdGenerator.generateId(),
                    registryKey: effectName,
                    type: validatedType,
                    config: processedConfig,
                    visible: true
                };

                console.log('🔍 useEffectManagement: Final effect object:', {
                    effectName,
                    finalType: validatedType,
                    effect
                });

                // Use Command Pattern instead of direct state update
                const addCommand = new AddEffectCommand(projectState, effect, effectName, effectType);
                commandService.execute(addCommand);

                console.log(`✅ Command executed: Add ${effectType} effect: ${effectName}`, effect);
            } else {
                console.error('Failed to get effect defaults:', result.error);
                alert(`Failed to add effect: ${result.error}`);
            }
        } catch (error) {
            console.error('Error adding effect:', error);
            alert(`Error adding effect: ${error.message}`);
        }
    }, [availableEffects, projectState, commandService]);

    const handleEffectUpdate = useCallback((index, updatedEffect) => {
        const currentEffects = projectState.getState().effects || [];
        const currentEffect = currentEffects[index];
        const effectName = updatedEffect.name || updatedEffect.className || 'Effect';

        console.log('🔧 HANDLE_EFFECT_UPDATE: Updating effect at index', index, {
            originalEffect: currentEffect,
            updatedEffect: updatedEffect,
            secondaryEffectsCount: updatedEffect.secondaryEffects?.length || 0,
            secondaryEffects: updatedEffect.secondaryEffects
        });

        // Use command pattern for undo/redo support
        const updateCommand = new UpdateEffectCommand(projectState, index, updatedEffect, effectName);
        commandService.execute(updateCommand);

        // Verify what was actually stored
        const verifyEffects = projectState.getState().effects || [];
        const storedEffect = verifyEffects[index];
        console.log('🔧 HANDLE_EFFECT_UPDATE: Verification - effect after storage:', {
            storedEffect: storedEffect,
            storedSecondaryEffects: storedEffect?.secondaryEffects,
            storedSecondaryCount: storedEffect?.secondaryEffects?.length || 0
        });
    }, [projectState, commandService]);

    const handleEffectDelete = useCallback((index) => {
        // Get fresh effects from current ProjectState
        const currentEffects = projectState.getState().effects || [];
        console.log('🗑️ useEffectManagement: handleEffectDelete called with index:', index);
        console.log('🗑️ useEffectManagement: Current effects before delete:', currentEffects.length, currentEffects.map(e => e.name || e.className));

        // Use Command Pattern for delete
        const deleteCommand = new DeleteEffectCommand(projectState, index);
        commandService.execute(deleteCommand);
        console.log(`✅ Command executed: Delete effect at index ${index}`);
    }, [projectState, commandService]);

    const handleEffectReorder = useCallback((fromIndex, toIndex) => {
        console.log('🔄 handleEffectReorder: Reordering effects', { fromIndex, toIndex });

        // Use command pattern for undo/redo support
        const reorderCommand = new ReorderEffectsCommand(projectState, fromIndex, toIndex);
        commandService.execute(reorderCommand);
    }, [projectState, commandService]);

    const handleEffectToggleVisibility = useCallback((index) => {
        const currentEffects = projectState.getState().effects || [];
        const effect = currentEffects[index];
        const updatedEffect = {
            ...effect,
            visible: effect.visible === false ? true : false
        };

        // Use UpdateEffectCommand for visibility toggle (it's an effect property change)
        const effectName = effect.name || effect.className || 'Effect';
        const updateCommand = new UpdateEffectCommand(
            projectState,
            index,
            updatedEffect,
            effectName
        );

        // Override the description for visibility toggle
        updateCommand.description = `${updatedEffect.visible ? 'Showed' : 'Hid'} ${effectName}`;
        commandService.execute(updateCommand);
    }, [projectState, commandService]);

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
        // Get fresh effects from ProjectState every time (ensures we get scaled values)
        const currentEffects = projectState.getState().effects || [];
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

        const mainEffect = currentEffects[editingEffect.effectIndex];
        console.log('🔍 getEditingEffectData: Found mainEffect (fresh from ProjectState):', mainEffect);

        if (editingEffect.effectType === 'primary') {
            return mainEffect;
        } else if (editingEffect.effectType === 'secondary' && mainEffect.secondaryEffects && editingEffect.subIndex !== null) {
            const secondaryEffect = mainEffect.secondaryEffects[editingEffect.subIndex];
            console.log('🔍 getEditingEffectData: Returning secondary effect:', secondaryEffect);
            console.log('🔍 getEditingEffectData: Secondary effect details:', {
                registryKey: secondaryEffect.registryKey,
                config: secondaryEffect.config,
                hasConfig: !!secondaryEffect.config,
                configKeys: secondaryEffect.config ? Object.keys(secondaryEffect.config) : 'none'
            });

            // CRITICAL: Secondary effect MUST have registryKey - no fallbacks
            if (!secondaryEffect.registryKey) {
                console.error('❌ getEditingEffectData: Secondary effect missing registryKey:', secondaryEffect);
                return null;
            }

            // Ensure secondary effect has proper registryKey for EffectConfigurer
            return {
                ...secondaryEffect,
                name: secondaryEffect.registryKey
            };
        } else if (editingEffect.effectType === 'keyframe' && editingEffect.subIndex !== null) {
            // Use single source of truth for keyframe effects
            const keyframeEffects = mainEffect.attachedEffects?.keyFrame || [];
            const keyframeEffect = keyframeEffects[editingEffect.subIndex];
            
            console.log('🔍 getEditingEffectData: Returning keyframe effect:', keyframeEffect);
            console.log('🔍 getEditingEffectData: Keyframe effect details:', {
                registryKey: keyframeEffect?.registryKey,
                config: keyframeEffect?.config,
                hasConfig: !!keyframeEffect?.config,
                configKeys: keyframeEffect?.config ? Object.keys(keyframeEffect.config) : 'none',
                foundInAttachedEffects: !!mainEffect.attachedEffects?.keyFrame
            });

            if (!keyframeEffect) {
                console.error('❌ getEditingEffectData: Keyframe effect not found at index:', editingEffect.subIndex);
                return null;
            }

            // CRITICAL: Keyframe effect MUST have registryKey - no fallbacks
            if (!keyframeEffect.registryKey) {
                console.error('❌ getEditingEffectData: Keyframe effect missing registryKey:', keyframeEffect);
                return null;
            }

            // Ensure keyframe effect has proper registryKey for EffectConfigurer
            return {
                ...keyframeEffect,
                name: keyframeEffect.registryKey
            };
        }

        return null;
    }, [editingEffect, projectState]);

    // Updated version that uses context directly instead of relying on async state
    const handleConfigUpdateWithContext = useCallback((newConfig, context) => {
        console.log('🔧 useEffectManagement: handleConfigUpdateWithContext called with:', { newConfig, context });

        const currentEffects = projectState.getState().effects || [];
        if (!context || !currentEffects[context.effectIndex]) {
            console.warn('🔧 useEffectManagement: Invalid context or effect not found:', { context, effectsLength: currentEffects.length });
            return;
        }

        const mainEffect = currentEffects[context.effectIndex];

        if (context.effectType === 'primary') {
            console.log('🔧 useEffectManagement: Updating primary effect config');
            const updatedEffect = {
                ...mainEffect,
                config: newConfig
            };
            handleEffectUpdate(context.effectIndex, updatedEffect);
        } else if (context.effectType === 'secondary' && context.subIndex !== null) {
            console.log('🔧 useEffectManagement: Updating secondary effect config at index:', context.subIndex);
            const updatedSecondaryEffects = [...(mainEffect.secondaryEffects || [])];
            updatedSecondaryEffects[context.subIndex] = {
                ...updatedSecondaryEffects[context.subIndex],
                config: newConfig
            };
            const updatedEffect = {
                ...mainEffect,
                secondaryEffects: updatedSecondaryEffects
            };
            handleEffectUpdate(context.effectIndex, updatedEffect);
        } else if (context.effectType === 'keyframe' && context.subIndex !== null) {
            console.log('🔧 useEffectManagement: Updating keyframe effect config at index:', context.subIndex);
            
            // Use single source of truth for keyframe effects
            const currentKeyframeEffects = mainEffect.attachedEffects?.keyFrame || [];
            const updatedKeyframeEffects = [...currentKeyframeEffects];
            updatedKeyframeEffects[context.subIndex] = {
                ...updatedKeyframeEffects[context.subIndex],
                config: newConfig
            };
            const updatedEffect = {
                ...mainEffect,
                attachedEffects: {
                    ...mainEffect.attachedEffects,
                    keyFrame: updatedKeyframeEffects
                }
            };
            handleEffectUpdate(context.effectIndex, updatedEffect);
        }
    }, [projectState, handleEffectUpdate]);

    const handleSubEffectUpdate = useCallback((newConfig) => {
        const currentEffects = projectState.getState().effects || [];
        if (!editingEffect || !currentEffects[editingEffect.effectIndex]) {
            return;
        }

        const mainEffect = currentEffects[editingEffect.effectIndex];

        if (editingEffect.effectType === 'primary') {
            const updatedEffect = {
                ...mainEffect,
                config: newConfig
            };
            handleEffectUpdate(editingEffect.effectIndex, updatedEffect);
        } else if (editingEffect.effectType === 'secondary' && editingEffect.subIndex !== null) {
            const updatedSecondaryEffects = [...(mainEffect.secondaryEffects || [])];
            updatedSecondaryEffects[editingEffect.subIndex] = {
                ...updatedSecondaryEffects[editingEffect.subIndex],
                config: newConfig
            };
            const updatedEffect = {
                ...mainEffect,
                secondaryEffects: updatedSecondaryEffects
            };
            handleEffectUpdate(editingEffect.effectIndex, updatedEffect);
        } else if (editingEffect.effectType === 'keyframe' && editingEffect.subIndex !== null) {
            // Use single source of truth for keyframe effects
            const currentKeyframeEffects = mainEffect.attachedEffects?.keyFrame || [];
            const updatedKeyframeEffects = [...currentKeyframeEffects];
            updatedKeyframeEffects[editingEffect.subIndex] = {
                ...updatedKeyframeEffects[editingEffect.subIndex],
                config: newConfig
            };
            const updatedEffect = {
                ...mainEffect,
                attachedEffects: {
                    ...mainEffect.attachedEffects,
                    keyFrame: updatedKeyframeEffects
                }
            };
            handleEffectUpdate(editingEffect.effectIndex, updatedEffect);
        }
    }, [editingEffect, projectState, handleEffectUpdate]);

    const handleAddSecondaryEffect = useCallback((targetEffect, effectIndex, newSecondaryEffect) => {
        try {
            console.log('🎭 HANDLE_ADD_SECONDARY: Received data:', {
                targetEffect: targetEffect,
                effectIndex: effectIndex,
                newSecondaryEffect: newSecondaryEffect,
                registryKey: newSecondaryEffect.registryKey,
                config: newSecondaryEffect.config
            });

            // CRITICAL: Ensure registryKey is always present
            if (!newSecondaryEffect.registryKey) {
                console.error('🎭 HANDLE_ADD_SECONDARY: MISSING REGISTRY KEY!', newSecondaryEffect);
                throw new Error('Secondary effect must have a registryKey');
            }

            // Use the already-fetched config data instead of making another API call
            const secondaryEffectToAdd = {
                id: newSecondaryEffect.id,
                registryKey: newSecondaryEffect.registryKey,
                config: newSecondaryEffect.config || {}
            };

            console.log('🎭 HANDLE_ADD_SECONDARY: Effect to add:', secondaryEffectToAdd);

            // Use command pattern for undo/redo support
            const secondaryEffectName = newSecondaryEffect.name || newSecondaryEffect.className || 'secondary';
            const addCommand = new AddSecondaryEffectCommand(
                projectState,
                effectIndex,
                secondaryEffectToAdd,
                secondaryEffectName
            );
            commandService.execute(addCommand);
        } catch (error) {
            console.error('Failed to add secondary effect:', error);
        }
    }, [projectState, commandService]);

    const handleAddKeyframeEffect = useCallback((targetEffect, effectIndex, newKeyframeEffect, selectedFrame) => {
        try {
            console.log('🎭 handleAddKeyframeEffect: Creating keyframe effect with registryKey:', newKeyframeEffect.registryKey);
            console.log('🎭 handleAddKeyframeEffect: Using pre-fetched config:', newKeyframeEffect.config);

            // CRITICAL: Ensure registryKey is always present
            if (!newKeyframeEffect.registryKey) {
                throw new Error('Keyframe effect must have a registryKey');
            }

            // Use the already-fetched config data instead of making another API call
            const keyframeEffectToAdd = {
                id: newKeyframeEffect.id,
                frame: selectedFrame,
                registryKey: newKeyframeEffect.registryKey,
                config: newKeyframeEffect.config || {}
            };

            console.log('🎭 handleAddKeyframeEffect: Keyframe effect to add:', keyframeEffectToAdd);

            // Use command pattern for undo/redo support
            const keyframeEffectName = newKeyframeEffect.name || newKeyframeEffect.className || 'keyframe';
            const addCommand = new AddKeyframeEffectCommand(
                projectState,
                effectIndex,
                keyframeEffectToAdd,
                keyframeEffectName,
                selectedFrame
            );
            commandService.execute(addCommand);
        } catch (error) {
            console.error('Failed to add keyframe effect:', error);
        }
    }, [projectState, commandService]);

    return {
        availableEffects,
        effectsLoaded,
        editingEffect,
        contextMenuEffect,
        contextMenuPos,
        handleAddEffect,
        handleAddEffectDirect,
        handleEffectUpdate,
        handleEffectDelete,
        handleEffectReorder,
        handleEffectToggleVisibility,
        handleEffectRightClick,
        handleEditEffect,
        getEditingEffectData,
        handleSubEffectUpdate,
        handleAddSecondaryEffect,
        handleAddKeyframeEffect,
        setEditingEffect,
        refreshAvailableEffects
    };
}