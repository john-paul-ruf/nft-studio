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
import EffectOperationsService from '../../services/EffectOperationsService.js';
import { UpdateQueue } from '../../utils/UpdateQueue.js';


export default function useEffectManagement(projectState) {
    const { commandService, eventBusService, loggerService } = useServices();

    // Initialize UpdateQueue for sequential config updates (prevents race conditions)
    const [updateQueue] = useState(() => new UpdateQueue());

    // Initialize EffectOperationsService
    const [effectOperationsService] = useState(() => {
        if (!commandService || !eventBusService || !loggerService) {
            console.warn('useEffectManagement: Missing required services, operations will be limited');
            return null;
        }
        
        return new EffectOperationsService({
            commandService,
            eventBus: eventBusService,
            logger: loggerService
        });
    });

    // Debug ProjectState (single source of truth)
    const currentEffects = projectState?.getState()?.effects || [];
    console.log('🎭 useEffectManagement: Hook called with ProjectState effects:', currentEffects.length, currentEffects.map(e => e.name || e.className));

    /**
     * 🔒 CRITICAL UTILITY: Resolve Effect ID to Current Index
     * 
     * This function ensures that effects are NEVER updated by index alone.
     * It always resolves the effect ID to the current index in the array,
     * which prevents race conditions during reordering, deletion, and rapid updates.
     * 
     * @param {string} effectId - The stable effect ID
     * @param {string} context - Context for error logging (e.g., 'handleEffectUpdate')
     * @returns {number|null} - Current index of the effect, or null if not found
     */
    const resolveEffectIndex = useCallback((effectId, context = 'unknown') => {
        if (!effectId) {
            console.error(`❌ ${context}: effectId is required but was not provided`);
            return null;
        }

        const currentEffects = projectState.getState().effects || [];
        const effectIndex = currentEffects.findIndex(e => e.id === effectId);

        if (effectIndex === -1) {
            console.error(`❌ ${context}: Effect with ID "${effectId}" not found in current effects array`);
            return null;
        }

        console.log(`✅ ${context}: Resolved effect ID "${effectId}" to index ${effectIndex}`);
        return effectIndex;
    }, [projectState]);

    const [availableEffects, setAvailableEffects] = useState({
        primary: [],
        secondary: [],
        keyFrame: [],
        finalImage: []
    });
    const [effectsLoaded, setEffectsLoaded] = useState(false);
    const [editingEffect, setEditingEffect] = useState(null);
    const [contextMenuEffect, setContextMenuEffect] = useState(null);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

    // Load available effects
    const loadAvailableEffects = useCallback(async () => {
        try {
            console.log('🎭 useEffectManagement: Loading available effects from IPC...');
            const result = await window.api.getAvailableEffects();
            console.log('🎭 Available effects result:', result);
            if (result.success) {
                setAvailableEffects({
                    primary: result.effects.primary || [],
                    secondary: result.effects.secondary || [],
                    finalImage: result.effects.finalImage || [],
                    keyFrame: result.effects.keyFrame || []
                });
                console.log('✅ Available effects loaded successfully:', {
                    primary: result.effects.primary?.length || 0,
                    secondary: result.effects.secondary?.length || 0,
                    finalImage: result.effects.finalImage?.length || 0,
                    keyFrame: result.effects.keyFrame?.length || 0
                });
                setEffectsLoaded(true);
            } else {
                console.error('🎭 Failed to load available effects:', result.error);
                // Set effects as loaded even on error, with empty arrays
                setEffectsLoaded(true);
            }
        } catch (error) {
            console.error('🎭 Failed to load available effects (exception):', error);
            // Set effects as loaded even on error to prevent infinite loading state
            setEffectsLoaded(true);
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
                    keyFrame: result.effects.keyFrame || [],
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
            
            // 🔒 CRITICAL: Prefer effectId over effectIndex (ID-first pattern)
            let effectIndex;
            if (payload.effectId) {
                effectIndex = resolveEffectIndex(payload.effectId, 'effect:delete');
                if (effectIndex === null) return; // Effect not found
            } else if (payload.effectIndex !== undefined) {
                console.warn('⚠️ effect:delete event received with effectIndex only. Please pass effectId.');
                effectIndex = payload.effectIndex;
            } else {
                console.error('❌ effect:delete: Neither effectId nor effectIndex provided');
                return;
            }
            
            handleEffectDelete(effectIndex);
            
            // Clear editing context if the deleted effect was being edited
            if (editingEffect && editingEffect.effectIndex === effectIndex) {
                console.log('🎯 useEffectManagement: Clearing editing context - effect was deleted');
                setEditingEffect(null);
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectReorder = eventBusService.subscribe('effect:reorder', (payload) => {
            console.log('🎭 useEffectManagement: Effect reorder event received:', payload);
            handleEffectReorder(payload.dragIndex, payload.hoverIndex);
            
            // Update editing context if the edited effect was reordered
            if (editingEffect && editingEffect.effectId) {
                const currentEffects = projectState.getState().effects || [];
                const newIndex = currentEffects.findIndex(e => e.id === editingEffect.effectId);
                if (newIndex !== -1 && newIndex !== editingEffect.effectIndex) {
                    console.log('🎯 useEffectManagement: Updating editing context after reorder:', {
                        oldIndex: editingEffect.effectIndex,
                        newIndex: newIndex,
                        effectId: editingEffect.effectId
                    });
                    setEditingEffect({
                        ...editingEffect,
                        effectIndex: newIndex
                    });
                }
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectToggleVisibility = eventBusService.subscribe('effect:togglevisibility', (payload) => {
            console.log('🎭 useEffectManagement: Effect toggle visibility event received:', payload);
            
            // 🔒 CRITICAL: Use effect ID if provided, otherwise resolve from index
            let effectId = payload.effectId;
            if (!effectId && payload.effectIndex !== undefined) {
                const currentEffects = projectState.getState().effects || [];
                const effect = currentEffects[payload.effectIndex];
                if (effect) {
                    effectId = effect.id;
                    console.warn('⚠️ effect:togglevisibility: Received index without ID, resolved to ID:', effectId);
                } else {
                    console.error('❌ effect:togglevisibility: Cannot resolve effect ID from index', payload.effectIndex);
                    return;
                }
            }
            
            handleEffectToggleVisibility(effectId);
        }, { component: 'useEffectManagement' });

        const unsubscribeEffectAddSecondary = eventBusService.subscribe('effect:addsecondary', async (payload) => {
            console.log('🎭 useEffectManagement: Effect add secondary event received:', payload);

            try {
                // Find the effect in available effects to get proper metadata
                const effectCategory = availableEffects.secondary || [];
                const effectData = effectCategory.find(e => e.name === payload.effectName);
                const registryKey = effectData?.registryKey || payload.effectName;

                // ⚠️ CRITICAL: Start with empty config - NO defaults applied
                // Effects should be created with empty configuration and user configures them manually
                const config = {};

                console.log('🎭 useEffectManagement: Creating secondary effect with empty config:', {
                    effectName: payload.effectName,
                    registryKey,
                    config
                });

                const currentEffects = projectState.getState().effects || [];
                const targetEffect = currentEffects[payload.parentIndex];
                if (targetEffect) {
                    const secondaryEffectData = {
                        id: IdGenerator.generateId(),
                        name: registryKey, // Use registryKey as the name (it's the canonical identifier)
                        className: effectData?.className || payload.effectName,
                        registryKey: registryKey, // Use the registryKey we looked up
                        type: 'secondary',
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
                // Find the effect in available effects to get proper metadata
                const effectCategory = availableEffects.secondary || []; // Keyframe effects are in secondary category
                const effectData = effectCategory.find(e => e.name === payload.effectName);
                const registryKey = effectData?.registryKey || payload.effectName;

                // ⚠️ CRITICAL: Use config from payload if provided, otherwise start with empty config
                // NO defaults applied - effects should be created with empty configuration
                let config;
                if (payload.config && Object.keys(payload.config).length > 0) {
                    config = payload.config;
                    console.log('🎭 useEffectManagement: Using config from payload (bulk add)');
                } else {
                    config = {};
                    console.log('🎭 useEffectManagement: Using empty config - no defaults');
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
                        name: registryKey, // Use registryKey as the name (it's the canonical identifier)
                        className: effectData?.className || payload.effectName,
                        registryKey: registryKey, // Use the registryKey we looked up
                        type: 'keyframe',
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
            if (payload.effectIndex !== undefined || payload.effectId) {
                const currentEffects = projectState.getState().effects || [];
                
                // CRITICAL FIX: Prioritize effect ID if provided (prevents race conditions)
                let effectId = payload.effectId;
                let effectIndex = payload.effectIndex;
                
                if (effectId) {
                    // Effect ID provided - resolve to current index (handles reordering)
                    const currentIndex = currentEffects.findIndex(e => e.id === effectId);
                    if (currentIndex === -1) {
                        console.error('❌ useEffectManagement: Effect with ID not found (may have been deleted):', { 
                            effectId,
                            originalIndex: effectIndex
                        });
                        return;
                    }
                    effectIndex = currentIndex;
                } else {
                    // Fallback: No effect ID provided, use index and look up ID
                    const effect = currentEffects[effectIndex];
                    if (!effect || !effect.id) {
                        console.error('❌ useEffectManagement: Cannot update effect without ID', { 
                            effectIndex, 
                            effect 
                        });
                        return;
                    }
                    effectId = effect.id;
                }
                
                const context = {
                    effectId, // Store ID for reliable tracking across reorders
                    effectIndex,
                    effectType: payload.effectType || 'primary',
                    subIndex: payload.subEffectIndex !== undefined ? payload.subEffectIndex : null
                };

                console.log('🎯 useEffectManagement: Setting editing context from event with ID:', context);
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

        const unsubscribeSecondaryToggleVisibility = eventBusService.subscribe('effectspanel:secondary:togglevisibility', async (payload) => {
            console.log('🎭 useEffectManagement: Secondary effect toggle visibility event received:', payload);
            if (effectOperationsService && projectState) {
                await effectOperationsService.toggleSecondaryEffectVisibility({
                    parentIndex: payload.parentIndex,
                    secondaryIndex: payload.secondaryIndex,
                    projectState
                });
            }
        }, { component: 'useEffectManagement' });

        const unsubscribeKeyframeToggleVisibility = eventBusService.subscribe('effectspanel:keyframe:togglevisibility', async (payload) => {
            console.log('🎭 useEffectManagement: Keyframe effect toggle visibility event received:', payload);
            if (effectOperationsService && projectState) {
                await effectOperationsService.toggleKeyframeEffectVisibility({
                    parentIndex: payload.parentIndex,
                    keyframeIndex: payload.keyframeIndex,
                    projectState
                });
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
            unsubscribeEffectToggleVisibility();
            unsubscribeEffectAddSecondary();
            unsubscribeEffectAddKeyframe();
            unsubscribeEffectConfigChange();
            unsubscribeEffectAttach();
            unsubscribeSecondaryReorder();
            unsubscribeKeyframeReorder();
            unsubscribeSecondaryDelete();
            unsubscribeKeyframeDelete();
            unsubscribeSecondaryToggleVisibility();
            unsubscribeKeyframeToggleVisibility();
            unsubscribeEffectsRefreshed();
        };
    }, [eventBusService]);

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
                percentChance: percentChance || 100,
                visible: true
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
            // Find the effect in our available effects to get the registryKey
            const effectCategory = availableEffects[effectType] || [];
            const effectData = effectCategory.find(e => e.name === effectName);
            const registryKey = effectData?.registryKey || effectName;

            // 🚀 CRITICAL FIX: Fetch and apply default config for new effects
            // This ensures that position objects are present when the effect is added
            // Without this, positions won't be available for scaling during orientation changes
            console.log(`🚀 Fetching default config for new effect: ${effectName}`);
            let processedConfig = {};
            
            try {
                const defaultResult = await window.api.getEffectDefaults(effectName);
                if (defaultResult.success && defaultResult.defaults) {
                    processedConfig = defaultResult.defaults;
                    console.log(`✅ Applied default config for ${effectName}:`, processedConfig);
                } else {
                    console.log(`⚠️ No defaults available for ${effectName}, starting with empty config`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to fetch defaults for ${effectName}, starting with empty config:`, error.message);
                processedConfig = {};
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
                name: effectName,
                className: effectName,
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
        } catch (error) {
            console.error('Error adding effect:', error);
            alert(`Error adding effect: ${error.message}`);
        }
    }, [availableEffects, projectState, commandService]);

    const handleEffectUpdate = useCallback((effectId, updatedEffect) => {
        // 🔒 CRITICAL: Pass effect ID directly to command (don't resolve to index here)
        // The command will resolve ID to index at execution time, preventing stale index bugs
        
        // Quick validation that effect exists
        const currentEffects = projectState.getState().effects || [];
        const effectIndex = currentEffects.findIndex(e => e.id === effectId);
        
        if (effectIndex === -1) {
            console.error('❌ handleEffectUpdate: Cannot update effect - effect not found:', effectId);
            return;
        }

        const currentEffect = currentEffects[effectIndex];
        const effectName = updatedEffect.name || updatedEffect.className || 'Effect';

        // 🔒 CRITICAL: Pass effect ID (not index) to command
        // Command will resolve ID to current index at execution time
        const updateCommand = new UpdateEffectCommand(projectState, effectId, updatedEffect, effectName);
        commandService.execute(updateCommand);

        console.log('✅ handleEffectUpdate: Update command queued for effect:', {
            effectId,
            effectName,
            currentIndex: effectIndex
        });

    }, [projectState, commandService]);

    const handleEffectDelete = useCallback((index) => {
        // Get fresh effects from current ProjectState
        const currentEffects = projectState.getState().effects || [];
        const deleteCommand = new DeleteEffectCommand(projectState, index);
        commandService.execute(deleteCommand);
    }, [projectState, commandService]);

    const handleEffectReorder = useCallback((fromIndex, toIndex) => {

        // Use command pattern for undo/redo support
        const reorderCommand = new ReorderEffectsCommand(projectState, fromIndex, toIndex);
        commandService.execute(reorderCommand);
    }, [projectState, commandService]);

    const handleEffectToggleVisibility = useCallback((effectId) => {
        // 🔒 CRITICAL: Pass effect ID directly to command (don't resolve to index here)
        // The command will resolve ID to index at execution time, preventing stale index bugs
        
        // Quick validation that effect exists
        const currentEffects = projectState.getState().effects || [];
        const effectIndex = currentEffects.findIndex(e => e.id === effectId);
        
        if (effectIndex === -1) {
            console.error('❌ handleEffectToggleVisibility: Cannot toggle visibility - effect not found:', effectId);
            return;
        }

        const effect = currentEffects[effectIndex];
        
        const updatedEffect = {
            ...effect,
            visible: effect.visible === false ? true : false
        };

        // Use UpdateEffectCommand for visibility toggle (it's an effect property change)
        const effectName = effect.name || effect.className || 'Effect';
        
        // 🔒 CRITICAL: Pass effect ID (not index) to command
        const updateCommand = new UpdateEffectCommand(
            projectState,
            effectId,
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
        // Get the effect ID to track it reliably across reorders
        const currentEffects = projectState.getState().effects || [];
        const effect = currentEffects[effectIndex];
        
        if (!effect || !effect.id) {
            console.error('❌ handleEditEffect: Cannot edit effect without ID', { effectIndex, effect });
            return;
        }
        
        setEditingEffect({
            effectId: effect.id, // Store ID instead of index
            effectIndex, // Keep index for backward compatibility
            effectType,
            subIndex
        });
        
        console.log('🎯 handleEditEffect: Set editing context with ID tracking:', {
            effectId: effect.id,
            effectIndex,
            effectType,
            subIndex
        });
    }, [projectState]);

    const getEditingEffectData = useCallback((effectContext = null) => {
        // Use provided context or fall back to state
        const context = effectContext || editingEffect;
        
        console.log('🔍 getEditingEffectData: Called with context:', {
            providedContext: effectContext,
            fallbackEditingEffect: editingEffect,
            finalContext: context
        });
        
        // Get fresh effects from ProjectState every time (ensures we get scaled values)
        const currentEffects = projectState.getState().effects || [];

        if (!context) {
            console.error('❌ getEditingEffectData: No context available', {
                providedContext: effectContext,
                editingEffect: editingEffect
            });
            return null;
        }

        // Resolve effect ID to current index (handles reordering)
        let effectIndex = context.effectIndex;
        if (context.effectId) {
            const currentIndex = currentEffects.findIndex(e => e.id === context.effectId);
            if (currentIndex === -1) {
                console.error('❌ getEditingEffectData: Effect with ID not found (may have been deleted):', {
                    effectId: context.effectId,
                    originalIndex: context.effectIndex
                });
                return null;
            }
            if (currentIndex !== context.effectIndex) {
                console.warn('⚠️ getEditingEffectData: Effect index changed due to reordering:', {
                    effectId: context.effectId,
                    oldIndex: context.effectIndex,
                    newIndex: currentIndex
                });
            }
            effectIndex = currentIndex;
        }

        if (!currentEffects[effectIndex]) {
            console.error('❌ getEditingEffectData: Invalid effect index', {
                effectIndex: effectIndex,
                effectsLength: currentEffects.length,
                availableIndices: currentEffects.map((e, i) => i)
            });
            return null;
        }

        const mainEffect = currentEffects[effectIndex];
        console.log('🔍 getEditingEffectData: Found mainEffect (fresh from ProjectState):', {
            effectIndex: effectIndex,
            originalIndex: context.effectIndex,
            effectId: context.effectId,
            effectType: context.effectType,
            subIndex: context.subIndex,
            mainEffect: mainEffect,
            hasRegistryKey: !!mainEffect.registryKey,
            hasSecondaryEffects: !!mainEffect.secondaryEffects,
            secondaryEffectsCount: mainEffect.secondaryEffects?.length || 0,
            hasKeyframeEffects: !!mainEffect.keyframeEffects,
            keyframeEffectsCount: mainEffect.keyframeEffects?.length || 0
        });

        if (context.effectType === 'primary') {
            console.log('✅ getEditingEffectData: Returning primary effect');
            return mainEffect;
        } else if (context.effectType === 'secondary') {
            if (!mainEffect.secondaryEffects) {
                console.error('❌ getEditingEffectData: Main effect has no secondaryEffects array', {
                    mainEffect: mainEffect
                });
                return null;
            }
            
            if (context.subIndex === null || context.subIndex === undefined) {
                console.error('❌ getEditingEffectData: subIndex is null/undefined for secondary effect', {
                    subIndex: context.subIndex
                });
                return null;
            }

            const secondaryEffect = mainEffect.secondaryEffects[context.subIndex];
            
            if (!secondaryEffect) {
                console.error('❌ getEditingEffectData: Secondary effect not found at index', {
                    subIndex: context.subIndex,
                    secondaryEffectsLength: mainEffect.secondaryEffects.length,
                    availableIndices: mainEffect.secondaryEffects.map((e, i) => i)
                });
                return null;
            }

            // CRITICAL: Secondary effect MUST have registryKey - no fallbacks
            if (!secondaryEffect.registryKey) {
                console.error('❌ getEditingEffectData: Secondary effect missing registryKey:', {
                    secondaryEffect: secondaryEffect,
                    hasName: !!secondaryEffect.name,
                    hasClassName: !!secondaryEffect.className,
                    keys: Object.keys(secondaryEffect)
                });
                return null;
            }

            console.log('✅ getEditingEffectData: Returning secondary effect');
            // Ensure secondary effect has proper registryKey for EffectConfigurer
            return {
                ...secondaryEffect,
                name: secondaryEffect.registryKey
            };
        } else if (context.effectType === 'keyframe') {
            if (context.subIndex === null || context.subIndex === undefined) {
                console.error('❌ getEditingEffectData: subIndex is null/undefined for keyframe effect', {
                    subIndex: context.subIndex
                });
                return null;
            }
            
            // Use single source of truth for keyframe effects
            const keyframeEffects = mainEffect.keyframeEffects || [];
            const keyframeEffect = keyframeEffects[context.subIndex];
            
            if (!keyframeEffect) {
                console.error('❌ getEditingEffectData: Keyframe effect not found at index', {
                    subIndex: context.subIndex,
                    keyframeEffectsLength: keyframeEffects.length,
                    availableIndices: keyframeEffects.map((e, i) => i)
                });
                return null;
            }

            // CRITICAL: Keyframe effect MUST have registryKey - no fallbacks
            if (!keyframeEffect.registryKey) {
                console.error('❌ getEditingEffectData: Keyframe effect missing registryKey:', {
                    keyframeEffect: keyframeEffect,
                    hasName: !!keyframeEffect.name,
                    hasClassName: !!keyframeEffect.className,
                    keys: Object.keys(keyframeEffect)
                });
                return null;
            }

            console.log('✅ getEditingEffectData: Returning keyframe effect');
            // Ensure keyframe effect has proper registryKey for EffectConfigurer
            return {
                ...keyframeEffect,
                name: keyframeEffect.registryKey
            };
        }

        console.error('❌ getEditingEffectData: Unknown effect type or invalid state', {
            effectType: context.effectType,
            subIndex: context.subIndex
        });
        return null;
    }, [editingEffect, projectState]);

    // Updated version that uses context directly instead of relying on async state
    const handleConfigUpdateWithContext = useCallback((newConfig, context) => {
        console.log('🔧 useEffectManagement: handleConfigUpdateWithContext called with:', { 
            newConfig, 
            context,
            configKeys: Object.keys(newConfig || {}),
            effectId: context?.effectId,
            effectIndex: context?.effectIndex,
            effectName: context?.effectName
        });

        if (!context) {
            console.warn('🔧 useEffectManagement: No context provided - ABORTING');
            return;
        }

        // Create a unique key for this update to enable deduplication
        const updateKey = `config-${context.effectId || context.effectIndex}-${context.effectType}-${context.subIndex}`;
        console.log('🔧 useEffectManagement: Enqueueing update with key:', updateKey);
        
        // Enqueue the update to prevent race conditions from rapid updates
        updateQueue.enqueue(async () => {
            console.log('🔧 useEffectManagement: Processing queued update for:', {
                effectId: context.effectId,
                effectIndex: context.effectIndex,
                configKeys: Object.keys(newConfig || {})
            });
            
            // 🔒 CRITICAL: ALWAYS get fresh effects at execution time (not at enqueue time)
            const currentEffects = projectState.getState().effects || [];
            console.log('🔧 useEffectManagement: Current effects count:', currentEffects.length);

            // 🔒 CRITICAL: ALWAYS resolve effect ID to current index (handles reordering)
            // NEVER trust context.effectIndex - it may be stale if effects were reordered
            let effectIndex;
            if (context.effectId) {
                effectIndex = currentEffects.findIndex(e => e.id === context.effectId);
                console.log('🔧 useEffectManagement: Resolved effect ID to index:', {
                    effectId: context.effectId,
                    resolvedIndex: effectIndex,
                    contextIndex: context.effectIndex
                });
                
                if (effectIndex === -1) {
                    console.error('❌ useEffectManagement: Effect with ID not found (may have been deleted):', {
                        effectId: context.effectId,
                        originalIndex: context.effectIndex
                    });
                    return;
                }
                if (effectIndex !== context.effectIndex) {
                    console.warn('⚠️ useEffectManagement: Effect index changed due to reordering:', {
                        effectId: context.effectId,
                        oldIndex: context.effectIndex,
                        newIndex: effectIndex
                    });
                }
            } else {
                // Fallback: No effect ID provided (legacy behavior)
                // This should never happen with the new ID-based system
                console.warn('⚠️ useEffectManagement: No effect ID in context, using index (may be unreliable)');
                effectIndex = context.effectIndex;
            }

            if (!currentEffects[effectIndex]) {
                console.warn('🔧 useEffectManagement: Effect not found at index:', { effectIndex, effectsLength: currentEffects.length });
                return;
            }

            const mainEffect = currentEffects[effectIndex];
            console.log('🔧 useEffectManagement: Found effect to update:', {
                effectId: mainEffect.id,
                effectName: mainEffect.name,
                effectIndex: effectIndex
            });

        // CRITICAL FIX: Handle both 'primary' and 'finalImage' effect types
        // Final image effects are top-level effects just like primary effects
        if (context.effectType === 'primary' || context.effectType === 'finalImage') {
            console.log('🔧 useEffectManagement: Updating effect config (type: ' + context.effectType + ')');
            console.log('🔧 useEffectManagement: Existing config:', mainEffect.config);
            console.log('🔧 useEffectManagement: New config:', newConfig);
            
            // CRITICAL FIX: Merge new config with existing config instead of replacing
            // This prevents config properties from being lost when only partial updates are sent
            const mergedConfig = {
                ...(mainEffect.config || {}),
                ...newConfig
            };
            console.log('🔧 useEffectManagement: Merged config:', mergedConfig);
            
            const updatedEffect = {
                ...mainEffect,
                config: mergedConfig
            };
            console.log('🔧 useEffectManagement: Calling handleEffectUpdate with:', {
                effectId: mainEffect.id,
                updatedEffect
            });
            
            // 🔒 CRITICAL: Pass effect ID, not index
            handleEffectUpdate(mainEffect.id, updatedEffect);
            console.log('🔧 useEffectManagement: handleEffectUpdate called successfully');
        } else if (context.effectType === 'secondary' && context.subIndex !== null) {
            console.log('🔧 useEffectManagement: Updating secondary effect config at index:', context.subIndex);
            const updatedSecondaryEffects = [...(mainEffect.secondaryEffects || [])];
            // CRITICAL FIX: Merge new config with existing config instead of replacing
            const existingSecondaryEffect = updatedSecondaryEffects[context.subIndex];
            
            // 🔒 CRITICAL: Validate secondary effect exists before updating
            if (!existingSecondaryEffect) {
                console.error('❌ Secondary effect not found at subIndex:', context.subIndex);
                return;
            }
            
            const mergedConfig = {
                ...(existingSecondaryEffect?.config || {}),
                ...newConfig
            };
            updatedSecondaryEffects[context.subIndex] = {
                ...existingSecondaryEffect,
                config: mergedConfig
            };
            const updatedEffect = {
                ...mainEffect,
                secondaryEffects: updatedSecondaryEffects
            };
            // 🔒 CRITICAL: Pass effect ID, not index
            handleEffectUpdate(mainEffect.id, updatedEffect);
        } else if (context.effectType === 'keyframe' && context.subIndex !== null) {
            console.log('🔧 useEffectManagement: Updating keyframe effect config at index:', context.subIndex);
            
            // CRITICAL FIX: Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
            const currentKeyframeEffects = mainEffect.keyframeEffects || 
                                          mainEffect.attachedEffects?.keyFrame || [];
            const updatedKeyframeEffects = [...currentKeyframeEffects];
            // CRITICAL FIX: Merge new config with existing config instead of replacing
            const existingKeyframeEffect = updatedKeyframeEffects[context.subIndex];
            
            // 🔒 CRITICAL: Validate keyframe effect exists before updating
            if (!existingKeyframeEffect) {
                console.error('❌ Keyframe effect not found at subIndex:', context.subIndex);
                return;
            }
            
            const mergedConfig = {
                ...(existingKeyframeEffect?.config || {}),
                ...newConfig
            };
            updatedKeyframeEffects[context.subIndex] = {
                ...existingKeyframeEffect,
                config: mergedConfig
            };
            
            // CRITICAL FIX: Update using new keyframeEffects property (single source of truth)
            const updatedEffect = {
                ...mainEffect,
                keyframeEffects: updatedKeyframeEffects
            };
            // 🔒 CRITICAL: Pass effect ID, not index
            handleEffectUpdate(mainEffect.id, updatedEffect);
            }
        }, { 
            key: updateKey, 
            replace: true // Replace pending updates for the same effect to avoid stale updates
        });
    }, [projectState, handleEffectUpdate, updateQueue]);

    const handleSubEffectUpdate = useCallback((newConfig) => {
        if (!editingEffect) {
            return;
        }

        // 🔒 CRITICAL: Resolve effect ID to current index (NEVER use index alone)
        const effectIndex = resolveEffectIndex(editingEffect.effectId, 'handleSubEffectUpdate');
        if (effectIndex === null) {
            console.error('❌ handleSubEffectUpdate: Cannot update - effect not found');
            return;
        }

        const currentEffects = projectState.getState().effects || [];
        const mainEffect = currentEffects[effectIndex];

        if (!mainEffect) {
            console.error('❌ handleSubEffectUpdate: Effect not found at resolved index');
            return;
        }

        // CRITICAL FIX: Handle both 'primary' and 'finalImage' effect types
        if (editingEffect.effectType === 'primary' || editingEffect.effectType === 'finalImage') {
            // CRITICAL FIX: Merge new config with existing config instead of replacing
            const mergedConfig = {
                ...(mainEffect.config || {}),
                ...newConfig
            };
            const updatedEffect = {
                ...mainEffect,
                config: mergedConfig
            };
            // 🔒 CRITICAL: Pass effect ID, not index
            handleEffectUpdate(mainEffect.id, updatedEffect);
        } else if (editingEffect.effectType === 'secondary' && editingEffect.subIndex !== null) {
            const updatedSecondaryEffects = [...(mainEffect.secondaryEffects || [])];
            // CRITICAL FIX: Merge new config with existing config instead of replacing
            const existingSecondaryEffect = updatedSecondaryEffects[editingEffect.subIndex];
            
            if (!existingSecondaryEffect) {
                console.error('❌ handleSubEffectUpdate: Secondary effect not found at subIndex:', editingEffect.subIndex);
                return;
            }
            
            const mergedConfig = {
                ...(existingSecondaryEffect?.config || {}),
                ...newConfig
            };
            updatedSecondaryEffects[editingEffect.subIndex] = {
                ...existingSecondaryEffect,
                config: mergedConfig
            };
            const updatedEffect = {
                ...mainEffect,
                secondaryEffects: updatedSecondaryEffects
            };
            // 🔒 CRITICAL: Pass effect ID, not index
            handleEffectUpdate(mainEffect.id, updatedEffect);
        } else if (editingEffect.effectType === 'keyframe' && editingEffect.subIndex !== null) {
            // CRITICAL FIX: Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
            const currentKeyframeEffects = mainEffect.keyframeEffects || 
                                          mainEffect.attachedEffects?.keyFrame || [];
            const updatedKeyframeEffects = [...currentKeyframeEffects];
            // CRITICAL FIX: Merge new config with existing config instead of replacing
            const existingKeyframeEffect = updatedKeyframeEffects[editingEffect.subIndex];
            
            if (!existingKeyframeEffect) {
                console.error('❌ handleSubEffectUpdate: Keyframe effect not found at subIndex:', editingEffect.subIndex);
                return;
            }
            
            const mergedConfig = {
                ...(existingKeyframeEffect?.config || {}),
                ...newConfig
            };
            updatedKeyframeEffects[editingEffect.subIndex] = {
                ...existingKeyframeEffect,
                config: mergedConfig
            };
            
            // CRITICAL FIX: Update using new keyframeEffects property (single source of truth)
            const updatedEffect = {
                ...mainEffect,
                keyframeEffects: updatedKeyframeEffects
            };
            // 🔒 CRITICAL: Pass effect ID, not index
            handleEffectUpdate(mainEffect.id, updatedEffect);
        }
    }, [editingEffect, projectState, handleEffectUpdate, resolveEffectIndex]);

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
            const secondaryEffectName = newSecondaryEffect.name || newSecondaryEffect.className || 'secondary';
            const secondaryEffectToAdd = {
                id: newSecondaryEffect.id,
                name: secondaryEffectName,
                className: newSecondaryEffect.className || secondaryEffectName,
                registryKey: newSecondaryEffect.registryKey,
                config: newSecondaryEffect.config || {},
                type: 'secondary',
                percentChance: newSecondaryEffect.percentChance || 100,
                visible: newSecondaryEffect.visible !== false
            };

            console.log('🎭 HANDLE_ADD_SECONDARY: Effect to add:', secondaryEffectToAdd);

            // Use command pattern for undo/redo support
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
            const keyframeEffectName = newKeyframeEffect.name || newKeyframeEffect.className || 'keyframe';
            const keyframeEffectToAdd = {
                id: newKeyframeEffect.id,
                name: keyframeEffectName,
                className: newKeyframeEffect.className || keyframeEffectName,
                frame: selectedFrame,
                registryKey: newKeyframeEffect.registryKey,
                config: newKeyframeEffect.config || {},
                type: 'keyframe',
                percentChance: newKeyframeEffect.percentChance || 100,
                visible: newKeyframeEffect.visible !== false
            };

            console.log('🎭 handleAddKeyframeEffect: Keyframe effect to add:', keyframeEffectToAdd);

            // Use command pattern for undo/redo support
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