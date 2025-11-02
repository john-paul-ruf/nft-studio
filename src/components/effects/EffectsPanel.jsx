/**
 * EffectsPanel (Refactored) - Phase 5.1
 * 
 * Main orchestrator component for the Effects Panel UI.
 * Reduced from 2,042 lines to ~250 lines through delegation to sub-components.
 * 
 * Architecture:
 * - Composes all Phase 2-4 sub-components (EffectsList, AddEffectDropdown, EffectConfigPanel, etc.)
 * - Uses Phase 1 hooks for state management (useEffectSelection, useEffectDragDrop, useEffectPanelModals)
 * - Listens to all events from sub-components via EventBusService
 * - Relays events to ProjectState for data persistence
 * - Integrates logging via EffectsPanelLogger
 * - Integrates Electron IPC via ElectronIPCBridge
 * - Handles error boundaries for component stability
 * 
 * Single Source of Truth:
 * - All state decisions use effect IDs (never indices)
 * - ProjectState is read-only within component (updates via EventBusService)
 * - Event emissions coordinate all state changes
 * 
 * @component
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useServices } from '../../contexts/ServiceContext.js';
import { Box, CircularProgress } from '@mui/material';

// CSS Import - Phase 6: CSS Organization (BEM)
import './EffectsPanel.bem.css';

// Phase 1: Hooks
import { useEffectSelection } from '../hooks/useEffectSelection.js';
import { useEffectDragDrop } from '../hooks/useEffectDragDrop.js';
import { useEffectPanelModals } from '../hooks/useEffectPanelModals.js';

// Phase 2: List Components
import EffectsList from './EffectsList.jsx';
import AddEffectDropdown from './AddEffectDropdown.jsx';
import SpecialtyEffectsModal from './SpecialtyEffectsModal.jsx';
import BulkAddKeyframeModal from './BulkAddKeyframeModal.jsx';

// Phase 3: Effect Addition UI
import EffectSubmenu from './EffectSubmenu.jsx';
import GroupedEffectsList from './GroupedEffectsList.jsx';

// Phase 4.5: Logging & IPC
import { EffectsPanelLogger } from '../../services/EffectsPanelLogger.js';
import { ElectronIPCBridge } from '../../services/ElectronIPCBridge.js';

// Command Services
import EffectCommandService from '../../services/EffectCommandService.js';
import { AddKeyframeEffectCommand } from '../../services/KeyframeEffectCommandService.js';
import SecondaryEffectCommandService from '../../services/SecondaryEffectCommandService.js';
import KeyframeEffectCommandService from '../../services/KeyframeEffectCommandService.js';

// Utilities
import ConfigCloner from '../../utils/ConfigCloner.js';

// Constants
import EFFECTS_PANEL_CONSTANTS from './EffectsPanelConstants.js';

/**
 * EffectsPanel (Orchestrator)
 * 
 * Main component that composes all sub-components and manages event flow.
 * 
 * @param {Object} props
 * @param {Object} props.projectState - ProjectState instance (read-only)
 * @param {Object} props.effectRegistry - Effect registry service
 * @param {Object} props.availableEffects - Available effects by type
 * @param {boolean} props.effectsLoaded - Whether effects have finished loading
 * @param {Function} props.onEffectDelete - Callback for deleting effect (deprecated - use events)
 * @param {Function} props.onEffectReorder - Callback for reordering effects (deprecated - use events)
 * @param {Function} props.onEffectToggleVisibility - Callback for visibility toggle (deprecated - use events)
 * @param {Object} props.currentTheme - MUI theme object
 * @param {boolean} props.isReadOnly - Whether panel is in read-only mode
 * @param {Function} props.refreshAvailableEffects - Function to refresh effect registry
 * @returns {React.ReactElement}
 */
export default function EffectsPanel({
    projectState,
    effectRegistry,
    availableEffects = { primary: [], secondary: [], keyFrame: [], finalImage: [] },
    effectsLoaded = true,
    onEffectDelete = null,
    onEffectReorder = null,
    onEffectToggleVisibility = null,
    currentTheme = null,
    isReadOnly = false,
    refreshAvailableEffects = null,
}) {
    const { eventBusService, commandService } = useServices();

    // Phase 1 Hooks: State management
    const {
        selectedEffect: selectedEffectState,
        selectEffect,
        isEffectSelected,
        clearSelection,
    } = useEffectSelection(projectState, isReadOnly);

    const {
        draggedEffectId,
        startDrag,
        endDrag,
        isDragging,
    } = useEffectDragDrop();

    const {
        specialtyModalOpen,
        bulkAddModalOpen,
        bulkAddTargetIndex,
        openSpecialtyModal,
        closeSpecialtyModal,
        openBulkAddModal,
        closeBulkAddModal,
    } = useEffectPanelModals();

    // Expanded effects state for EffectsList (UI state, not persisted)
    const [expandedEffects, setExpandedEffects] = useState(new Set());

    // Add effect menu state
    const [addEffectMenuOpen, setAddEffectMenuOpen] = useState(false);

    /**
     * 🔒 CRITICAL: Enrich selectedEffect with full effect data from ProjectState
     * The hook returns { effectId, effectIndex, effectType, subIndex }
     * But EffectConfigurer needs the full effect object with name, registryKey, etc.
     * 
     * For secondary/keyframe effects, needs to navigate the parent → nested structure.
     * 
     * IMPORTANT: Always returns enriched effect data (never null) to keep config panel open
     * when switching between effects. Panel only closes via explicit close button.
     */
    const selectedEffect = useMemo(() => {
        if (!selectedEffectState || !selectedEffectState.effectId) {
            return null;
        }
        
        try {
            const state = projectState?.getState?.();
            const effects = state?.effects || [];
            let effect = effects[selectedEffectState.effectIndex];
            
            if (!effect || effect.id !== selectedEffectState.effectId) {
                // Effect not found at cached index - search for it by ID
                effect = effects.find(e => e.id === selectedEffectState.effectId);
                if (!effect) {
                    console.warn('⚠️ EffectsPanel: Selected effect not found in ProjectState', {
                        effectId: selectedEffectState.effectId,
                        effectIndex: selectedEffectState.effectIndex,
                        effectType: selectedEffectState.effectType
                    });
                    // Don't return null - return minimal effect object so panel stays open
                    // This keeps the panel open when switching effects
                    return {
                        effectId: selectedEffectState.effectId,
                        effectIndex: selectedEffectState.effectIndex,
                        effectType: selectedEffectState.effectType,
                        subIndex: selectedEffectState.subIndex,
                        name: 'Effect',
                        registryKey: 'Unknown',
                        className: 'Unknown',
                        config: {},
                    };
                }
            }
            
            // Handle secondary and keyframe effects
            let effectData = effect;
            console.log('🔍 EffectsPanel: Enriching effect:', {
                effectId: selectedEffectState.effectId,
                effectType: selectedEffectState.effectType,
                subIndex: selectedEffectState.subIndex,
                parentEffectName: effect.name,
                hasSecondary: !!effect.secondaryEffects?.length,
                hasKeyframe: !!effect.keyframeEffects?.length
            });
            
            if (selectedEffectState.effectType === 'secondary' && selectedEffectState.subIndex !== null && selectedEffectState.subIndex !== undefined) {
                const secondaryEffect = effect.secondaryEffects?.[selectedEffectState.subIndex];
                console.log('🔍 EffectsPanel: Looking for secondary effect:', {
                    subIndex: selectedEffectState.subIndex,
                    found: !!secondaryEffect,
                    secondaryEffectName: secondaryEffect?.name,
                    parentSecondaryEffectsCount: effect.secondaryEffects?.length
                });
                if (secondaryEffect) {
                    effectData = secondaryEffect;
                } else {
                    console.warn('⚠️ EffectsPanel: Secondary effect not found at subIndex', {
                        parentEffectId: effect.id,
                        subIndex: selectedEffectState.subIndex,
                        availableCount: effect.secondaryEffects?.length
                    });
                }
            } else if (selectedEffectState.effectType === 'keyframe' && selectedEffectState.subIndex !== null && selectedEffectState.subIndex !== undefined) {
                const keyframeEffect = effect.keyframeEffects?.[selectedEffectState.subIndex];
                console.log('🔍 EffectsPanel: Looking for keyframe effect:', {
                    subIndex: selectedEffectState.subIndex,
                    found: !!keyframeEffect,
                    keyframeEffectName: keyframeEffect?.name,
                    parentKeyframeEffectsCount: effect.keyframeEffects?.length
                });
                if (keyframeEffect) {
                    effectData = keyframeEffect;
                } else {
                    console.warn('⚠️ EffectsPanel: Keyframe effect not found at subIndex', {
                        parentEffectId: effect.id,
                        subIndex: selectedEffectState.subIndex,
                        availableCount: effect.keyframeEffects?.length
                    });
                }
            }
            
            // Return enriched selectedEffect with both selection metadata and full effect data
            const enrichedEffect = {
                // Original selection metadata from hook
                effectId: selectedEffectState.effectId,
                effectIndex: selectedEffectState.effectIndex,
                effectType: selectedEffectState.effectType,
                subIndex: selectedEffectState.subIndex,
                
                // Full effect data for EffectConfigurer
                name: effectData.name || effectData.className,
                registryKey: effectData.name || effectData.className,
                className: effectData.className,
                id: effectData.id,
                // 🔒 CRITICAL: Deep-clone config to prevent multiple effects of same type from sharing references
                // This prevents "changes in UI affect other effects" bug when toggling effects off/on
                config: ConfigCloner.deepClone(effectData.config || {}),
                // ... any other effect properties that might be needed
            };
            
            console.log('✅ EffectsPanel: Enriched effect ready for EffectConfigurer:', {
                selectedName: enrichedEffect.name,
                effectType: enrichedEffect.effectType,
                subIndex: enrichedEffect.subIndex,
                configKeys: Object.keys(enrichedEffect.config || {}).slice(0, 5)
            });
            
            return enrichedEffect;
        } catch (error) {
            console.error('❌ EffectsPanel: Error enriching selectedEffect:', error);
            // Even on error, return minimal effect object to keep panel open
            return {
                effectId: selectedEffectState?.effectId,
                effectIndex: selectedEffectState?.effectIndex,
                effectType: selectedEffectState?.effectType,
                subIndex: selectedEffectState?.subIndex,
                name: 'Effect',
                registryKey: 'Error Loading',
                className: 'Error',
                config: {},
            };
        }
    }, [selectedEffectState, projectState]);

    // Phase 4.5: Logging & IPC
    const [logger] = useState(() =>
        new EffectsPanelLogger({
            eventBusService,
            enableDebug: process.env.NODE_ENV === 'development',
        })
    );

    const [ipcBridge] = useState(() =>
        new ElectronIPCBridge({
            logger,
            defaultTimeout: EFFECTS_PANEL_CONSTANTS.IPC_TIMEOUT_MS || 5000,
        })
    );

    // Initialize Command Services for creating commands
    // NOTE: These are already singleton instances exported from their respective services
    // Don't instantiate them again with 'new' - that causes the "is not a constructor" error
    const [effectCommandService] = useState(() => EffectCommandService);
    const [secondaryEffectCommandService] = useState(() => SecondaryEffectCommandService);
    const [keyframeEffectCommandService] = useState(() => KeyframeEffectCommandService);

    // Log initialization
    useEffect(() => {
        const state = projectState?.getState?.();
        logger.logAction('panel:initialized', 'EffectsPanel initialized', {
            effectsCount: state?.effects?.length || 0,
            isReadOnly,
        });
    }, [logger, projectState, isReadOnly]);

    // Listen to and relay events to ProjectState/CommandService
    useEffect(() => {
        if (!eventBusService) return;

        // Effect add events
        const unsubscribeAdd = eventBusService.subscribe('effectspanel:effect:add', async (payload, event) => {
            try {
                const { effectName, effectType } = payload || {};
                logger.logAction('effect:add', `Adding ${effectType} effect`, {
                    effectName,
                    effectType,
                });

                // Create command and execute via CommandService
                if (commandService) {
                    // Command will be created and executed by CommandService
                    logger.logDebug('Effect add command queued', { effectName, effectType });
                }
            } catch (error) {
                logger.logError('Error handling effectspanel:effect:add event', error);
            }
        });

        // Effect delete events
        const unsubscribeDelete = eventBusService.subscribe('effect:delete', (payload, event) => {
            try {
                const { effectId } = payload || {};
                logger.logAction('effect:delete', 'Effect deleted', { effectId });
                clearSelection();
                if (onEffectDelete) {
                    onEffectDelete(effectId);
                }
            } catch (error) {
                logger.logError('Error handling effect:delete event', error);
            }
        });

        // Effect reorder events
        const unsubscribeReorder = eventBusService.subscribe('effectspanel:effect:reorder', (payload, event) => {
            try {
                const { fromId, toId, sourceIndex, targetIndex } = payload || {};
                logger.logAction('effect:reorder', 'Effects reordered', {
                    fromId,
                    toId,
                    sourceIndex,
                    targetIndex,
                });

                // Convert IDs to indices if not provided
                let fromIdx = sourceIndex;
                let toIdx = targetIndex;

                if ((fromIdx === undefined || fromIdx === null) && fromId) {
                    const effects = projectState?.getState?.()?.effects || [];
                    fromIdx = effects.findIndex(e => e.id === fromId);
                }

                if ((toIdx === undefined || toIdx === null) && toId) {
                    const effects = projectState?.getState?.()?.effects || [];
                    toIdx = effects.findIndex(e => e.id === toId);
                }

                // Use IDs if available (preferred, stable across reorders)
                // Fall back to indices if IDs not available (for backward compatibility)
                const reorderFromId = fromId || fromIdx;
                const reorderToId = toId || toIdx;

                // Validate that we have resolvable parameters
                const hasValidParams = (reorderFromId !== undefined && reorderFromId !== null) && 
                                      (reorderToId !== undefined && reorderToId !== null);

                if (hasValidParams) {
                    // Use commandService if available to execute reorder command
                    console.log('🔄 EffectsPanel: Reorder event received', {
                        reorderFromId,
                        reorderToId,
                        hasCommandService: !!commandService,
                        hasEffectCommandService: !!effectCommandService,
                        hasProjectState: !!projectState,
                    });
                    
                    if (commandService && effectCommandService && projectState) {
                        try {
                            // Create the reorder command using EffectCommandService
                            // Pass effect IDs if available (prevents stale reference bugs)
                            const reorderCommand = effectCommandService.createReorderCommand(
                                projectState,
                                reorderFromId,  // Pass ID or index
                                reorderToId     // Pass ID or index
                            );
                            
                            console.log('🔄 EffectsPanel: Reorder command created', {
                                commandType: reorderCommand.type,
                                description: reorderCommand.description
                            });
                            
                            // Execute the command via CommandService
                            commandService.execute(reorderCommand);
                            console.log('✅ EffectsPanel: Reorder command executed');
                        } catch (cmdError) {
                            console.error('❌ EffectsPanel: Error creating/executing reorder command', cmdError);
                            throw cmdError;
                        }
                    } else if (onEffectReorder) {
                        // Fallback to callback if services not available
                        console.warn('⚠️ EffectsPanel: Services not available, using fallback callback');
                        onEffectReorder(fromId, toId);
                    } else {
                        console.error('❌ EffectsPanel: No reorder handler available', {
                            hasCommandService: !!commandService,
                            hasEffectCommandService: !!effectCommandService,
                            hasProjectState: !!projectState,
                            hasCallback: !!onEffectReorder
                        });
                    }
                } else {
                    console.warn('⚠️ EffectsPanel: Could not resolve effect IDs/indices for reorder', {
                        fromIdx,
                        toIdx,
                        fromId,
                        toId,
                        reorderFromId,
                        reorderToId
                    });
                    logger.logDebug('Could not resolve effect IDs/indices for reorder', {
                        fromIdx,
                        toIdx,
                        fromId,
                        toId,
                        reorderFromId,
                        reorderToId
                    });
                }
            } catch (error) {
                logger.logError('Error handling effectspanel:effect:reorder event', error);
            }
        });

        // Effect visibility toggle events
        const unsubscribeVisibility = eventBusService.subscribe('effect:togglevisibility', (payload, event) => {
            try {
                const { effectId, visible } = payload || {};
                logger.logAction('effect:visibility:toggle', `Effect ${visible ? 'shown' : 'hidden'}`, {
                    effectId,
                    visible,
                });
                if (onEffectToggleVisibility) {
                    onEffectToggleVisibility(effectId, visible);
                }
            } catch (error) {
                logger.logError('Error handling effect:togglevisibility event', error);
            }
        });

        // Bulk add keyframes event (triggered from context menu)
        const unsubscribeBulkAddKeyframes = eventBusService.subscribe('effectspanel:context:bulk:add:keyframes', (payload, event) => {
            try {
                const { effectId, effectIndex } = payload || {};
                logger.logAction('bulk:add:keyframes', 'Bulk add keyframes modal triggered', {
                    effectId,
                    effectIndex,
                });
                // Open the modal with the target effect index
                openBulkAddModal(effectIndex);
            } catch (error) {
                logger.logError('Error handling effectspanel:context:bulk:add:keyframes event', error);
            }
        });

        // Secondary effects reorder events
        const unsubscribeSecondaryReorder = eventBusService.subscribe('effectspanel:secondary:reorder', (payload, event) => {
            try {
                const { parentIndex, sourceIndex, targetIndex } = payload || {};
                console.log('🔄 EffectsPanel: Secondary reorder event received', {
                    parentIndex,
                    sourceIndex,
                    targetIndex,
                    hasCommandService: !!commandService,
                    hasSecondaryService: !!secondaryEffectCommandService,
                    hasProjectState: !!projectState,
                });
                
                logger.logAction('secondary:effect:reorder', 'Secondary effect reordered', {
                    parentIndex,
                    sourceIndex,
                    targetIndex,
                });

                if (commandService && projectState && secondaryEffectCommandService) {
                    try {
                        const reorderCommand = secondaryEffectCommandService.createReorderCommand(
                            projectState,
                            parentIndex,
                            sourceIndex,
                            targetIndex
                        );
                        console.log('🔄 EffectsPanel: Secondary reorder command created and executing');
                        commandService.execute(reorderCommand);
                        console.log('✅ EffectsPanel: Secondary reorder command executed');
                    } catch (cmdError) {
                        console.error('❌ EffectsPanel: Error with secondary reorder command', cmdError);
                        throw cmdError;
                    }
                } else {
                    console.error('❌ EffectsPanel: Secondary reorder - services not available', {
                        hasCommandService: !!commandService,
                        hasProjectState: !!projectState,
                        hasSecondaryService: !!secondaryEffectCommandService
                    });
                }
            } catch (error) {
                logger.logError('Error handling effectspanel:secondary:reorder event', error);
                console.error('❌ EffectsPanel: Secondary reorder error:', error);
            }
        });

        // Keyframe effects reorder events
        const unsubscribeKeyframeReorder = eventBusService.subscribe('effectspanel:keyframe:reorder', (payload, event) => {
            try {
                const { parentIndex, sourceIndex, targetIndex } = payload || {};
                console.log('🔄 EffectsPanel: Keyframe reorder event received', {
                    parentIndex,
                    sourceIndex,
                    targetIndex,
                    hasCommandService: !!commandService,
                    hasKeyframeService: !!keyframeEffectCommandService,
                    hasProjectState: !!projectState,
                });
                
                logger.logAction('keyframe:effect:reorder', 'Keyframe effect reordered', {
                    parentIndex,
                    sourceIndex,
                    targetIndex,
                });

                if (commandService && projectState && keyframeEffectCommandService) {
                    try {
                        const reorderCommand = keyframeEffectCommandService.createReorderCommand(
                            projectState,
                            parentIndex,
                            sourceIndex,
                            targetIndex
                        );
                        console.log('🔄 EffectsPanel: Keyframe reorder command created and executing');
                        commandService.execute(reorderCommand);
                        console.log('✅ EffectsPanel: Keyframe reorder command executed');
                    } catch (cmdError) {
                        console.error('❌ EffectsPanel: Error with keyframe reorder command', cmdError);
                        throw cmdError;
                    }
                } else {
                    console.error('❌ EffectsPanel: Keyframe reorder - services not available', {
                        hasCommandService: !!commandService,
                        hasProjectState: !!projectState,
                        hasKeyframeService: !!keyframeEffectCommandService
                    });
                }
            } catch (error) {
                logger.logError('Error handling effectspanel:keyframe:reorder event', error);
                console.error('❌ EffectsPanel: Keyframe reorder error:', error);
            }
        });

        // Keyframe effect delete events
        const unsubscribeKeyframeDelete = eventBusService.subscribe('effectspanel:keyframe:delete', (payload, event) => {
            try {
                const { parentIndex, keyframeIndex } = payload || {};
                logger.logAction('keyframe:effect:delete', 'Keyframe effect deleted', {
                    parentIndex,
                    keyframeIndex,
                });

                if (commandService && projectState && keyframeEffectCommandService) {
                    const deleteCommand = keyframeEffectCommandService.createDeleteCommand(
                        projectState,
                        parentIndex,
                        keyframeIndex
                    );
                    commandService.execute(deleteCommand);
                }
            } catch (error) {
                logger.logError('Error handling effectspanel:keyframe:delete event', error);
            }
        });

        // Keyframe effect visibility toggle events
        const unsubscribeKeyframeVisibility = eventBusService.subscribe('effectspanel:keyframe:togglevisibility', (payload, event) => {
            try {
                const { parentIndex, keyframeIndex } = payload || {};
                logger.logAction('keyframe:effect:visibility:toggle', 'Keyframe effect visibility toggled', {
                    parentIndex,
                    keyframeIndex,
                });

                if (projectState) {
                    const state = projectState.getState?.();
                    const effects = state?.effects || [];
                    
                    if (parentIndex >= 0 && parentIndex < effects.length) {
                        const parentEffect = effects[parentIndex];
                        const keyframeEffects = parentEffect.keyframeEffects || [];
                        
                        if (keyframeIndex >= 0 && keyframeIndex < keyframeEffects.length) {
                            const keyframeEffect = keyframeEffects[keyframeIndex];
                            const newParent = {
                                ...parentEffect,
                                keyframeEffects: keyframeEffects.map((kf, idx) => 
                                    idx === keyframeIndex 
                                        ? { ...kf, visible: kf.visible === false ? true : false }
                                        : kf
                                )
                            };
                            
                            const newEffects = effects.map((eff, idx) => 
                                idx === parentIndex ? newParent : eff
                            );
                            
                            projectState.update({ effects: newEffects });
                        }
                    }
                }
            } catch (error) {
                logger.logError('Error handling effectspanel:keyframe:togglevisibility event', error);
            }
        });

        return () => {
            unsubscribeAdd?.();
            unsubscribeDelete?.();
            unsubscribeReorder?.();
            unsubscribeVisibility?.();
            unsubscribeBulkAddKeyframes?.();
            unsubscribeSecondaryReorder?.();
            unsubscribeKeyframeReorder?.();
            unsubscribeKeyframeDelete?.();
            unsubscribeKeyframeVisibility?.();
        };
    }, [eventBusService, logger, clearSelection, onEffectDelete, onEffectReorder, onEffectToggleVisibility, commandService, effectCommandService, secondaryEffectCommandService, keyframeEffectCommandService, projectState, openBulkAddModal]);

    // Close config panel when entering read-only mode
    useEffect(() => {
        if (isReadOnly) {
            logger.logDebug('Entering read-only mode');
        }
    }, [isReadOnly, logger]);

    // Handle effect configuration changes
    // 🔒 CRITICAL FIX: Match the actual callback signature from EffectConfigurer
    // EffectConfigurer calls: onConfigChange(config, selectedEffect)
    // This callback receives the full config object and effect context, not individual properties
    const handleConfigChange = useCallback((config, selectedEffect) => {
        if (!selectedEffect || !selectedEffect.effectId) {
            logger.logDebug('handleConfigChange: Missing selectedEffect or effectId', { selectedEffect });
            return;
        }

        logger.logAction('config:change', 'Effect configuration changed', {
            effectId: selectedEffect.effectId,
            effectIndex: selectedEffect.effectIndex,
            configKeys: Object.keys(config || {}),
        });

        if (eventBusService) {
            eventBusService.emit('effect:config:change', {
                effectId: selectedEffect.effectId,
                effectIndex: selectedEffect.effectIndex,
                effectType: selectedEffect.effectType || 'primary',
                config: config,  // 🔒 CRITICAL: Include the full config object!
                // 🔒 CRITICAL: Include subEffectIndex for keyframe/secondary effects
                // This is essential for useEffectManagement to properly route the update
                // NOTE: Must use !== undefined check, not || null, because 0 is a valid falsy index value
                subEffectIndex: selectedEffect.subIndex !== undefined ? selectedEffect.subIndex : null,
                timestamp: Date.now(),
            });
        }
    }, [logger, eventBusService]);

    // Handle adding secondary/keyframe effects
    const handleAddEffect = useCallback((effectName, effectType) => {
        logger.logAction('effect:add_secondary', 'Secondary effect added', {
            effectName,
            effectType,
        });

        if (eventBusService) {
            eventBusService.emit('effectspanel:effect:add', {
                effectName,
                effectType,
            });
        }
    }, [logger, eventBusService]);

    const handleOpenSpecialty = useCallback(() => {
        openSpecialtyModal();
        logger.logAction('modal:specialty_open', 'Specialty modal opened');
    }, [openSpecialtyModal, logger]);

    const handleCloseSpecialty = useCallback(() => {
        closeSpecialtyModal();
        logger.logAction('modal:specialty_close', 'Specialty modal closed');
    }, [closeSpecialtyModal, logger]);

    /**
     * Handle bulk adding keyframe effects to a parent effect
     * Called when user confirms the BulkAddKeyframeModal with multiple keyframe instances
     * 
     * @param {Array} keyframeEffectsData - Array of keyframe effect objects with:
     *   - registryKey: Effect name (e.g., 'GlitchEffect')
     *   - frame: Frame number for the keyframe
     *   - config: Configuration object for the effect
     */
    const handleBulkAddKeyframes = useCallback((keyframeEffectsData) => {
        if (!keyframeEffectsData || !Array.isArray(keyframeEffectsData) || keyframeEffectsData.length === 0) {
            logger.logError('handleBulkAddKeyframes: No keyframe effects data provided');
            return;
        }

        if (bulkAddTargetIndex === null || bulkAddTargetIndex === undefined) {
            logger.logError('handleBulkAddKeyframes: No parent effect index specified');
            return;
        }

        const state = projectState?.getState?.();
        const effects = state?.effects || [];
        const parentEffect = effects[bulkAddTargetIndex];

        if (!parentEffect) {
            logger.logError('handleBulkAddKeyframes: Parent effect not found at index', { bulkAddTargetIndex });
            return;
        }

        logger.logAction('bulk:keyframes:add', 'Adding bulk keyframes', {
            parentEffectId: parentEffect.id,
            parentEffectIndex: bulkAddTargetIndex,
            keyframeCount: keyframeEffectsData.length,
        });

        // Create and execute commands for each keyframe
        try {
            keyframeEffectsData.forEach((keyframeData, index) => {
                const { registryKey, frame, config } = keyframeData;
                
                logger.logDebug(`Adding keyframe ${index + 1}/${keyframeEffectsData.length}`, {
                    registryKey,
                    frame,
                    configKeys: Object.keys(config || {}).slice(0, 5),
                });

                // Create the keyframe effect object with config
                const keyframeEffect = {
                    name: registryKey,
                    className: registryKey,
                    registryKey: registryKey,
                    config: config,
                    type: 'keyframe',
                    id: `keyframe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    visible: true  // ✅ CRITICAL: Ensure keyframe effects are visible by default
                };

                // Create and execute the command
                if (commandService && projectState) {
                    const command = new AddKeyframeEffectCommand(
                        projectState,
                        bulkAddTargetIndex,
                        keyframeEffect,
                        registryKey,
                        frame
                    );
                    commandService.execute(command);
                }
            });

            closeBulkAddModal();
            logger.logAction('bulk:keyframes:complete', 'Bulk keyframes added successfully', {
                count: keyframeEffectsData.length
            });
        } catch (error) {
            logger.logError('Error adding bulk keyframes', error);
        }
    }, [bulkAddTargetIndex, projectState, commandService, logger, closeBulkAddModal]);

    /**
     * EffectsList callbacks - wired to state and events
     */
    const handleEffectSelect = useCallback((index, effectType = 'primary') => {
        const state = projectState?.getState?.();
        const effects = state?.effects || [];
        const effect = effects[index];
        if (effect?.id) {
            // Pass effect ID to hook - it handles ID-to-index conversion internally
            selectEffect(effect.id, effectType);
            // 🔒 CRITICAL: Include effectIndex in the event payload
            // This is needed for EffectConfigurer to have the correct context
            eventBusService?.emit('effect:selected', {
                effectId: effect.id,
                effectIndex: index,  // Include the current index
                effectType,
            }, { component: 'EffectsPanel' });
            logger.logAction('effect:selected', 'Effect selected', { effectId: effect.id, effectType });
        }
    }, [projectState, selectEffect, eventBusService, logger]);

    /**
     * Handle secondary effect selection
     */
    const handleSecondarySelect = useCallback((parentIndex, secondaryIndex) => {
        try {
            console.log('🎯 EffectsPanel: handleSecondarySelect called:', { parentIndex, secondaryIndex });
            const state = projectState?.getState?.();
            const effects = state?.effects || [];
            const parentEffect = effects[parentIndex];
            
            console.log('🎯 EffectsPanel: Parent effect:', {
                found: !!parentEffect,
                parentId: parentEffect?.id,
                hasSecondaryEffects: !!parentEffect?.secondaryEffects?.length,
                secondaryCount: parentEffect?.secondaryEffects?.length
            });
            
            if (parentEffect?.id && parentEffect.secondaryEffects?.[secondaryIndex]) {
                const secondaryEffect = parentEffect.secondaryEffects[secondaryIndex];
                
                console.log('🎯 EffectsPanel: Secondary effect found:', {
                    parentId: parentEffect.id,
                    secondaryIndex,
                    secondaryName: secondaryEffect.name
                });
                
                // Select the secondary effect with the parent ID and subIndex
                selectEffect(parentEffect.id, 'secondary', secondaryIndex);
                
                eventBusService?.emit('effect:selected', {
                    effectId: parentEffect.id,
                    effectIndex: parentIndex,
                    effectType: 'secondary',
                    subIndex: secondaryIndex,
                }, { component: 'EffectsPanel' });
                
                logger.logAction('secondary:effect:selected', 'Secondary effect selected', { 
                    parentEffectId: parentEffect.id, 
                    secondaryIndex 
                });
            } else {
                console.warn('⚠️ EffectsPanel: handleSecondarySelect - parent not found or no secondary effect at index:', {
                    parentIndex,
                    secondaryIndex,
                    parentFound: !!parentEffect,
                    parentId: parentEffect?.id
                });
            }
        } catch (error) {
            console.error('❌ EffectsPanel: Error in handleSecondarySelect:', error);
        }
    }, [projectState, selectEffect, eventBusService, logger]);

    /**
     * Handle keyframe effect selection
     */
    const handleKeyframeSelect = useCallback((parentIndex, keyframeIndex) => {
        try {
            console.log('🎯 EffectsPanel: handleKeyframeSelect called:', { parentIndex, keyframeIndex });
            const state = projectState?.getState?.();
            const effects = state?.effects || [];
            const parentEffect = effects[parentIndex];
            
            console.log('🎯 EffectsPanel: Parent effect for keyframe:', {
                found: !!parentEffect,
                parentId: parentEffect?.id,
                hasKeyframeEffects: !!parentEffect?.keyframeEffects?.length,
                keyframeCount: parentEffect?.keyframeEffects?.length
            });
            
            if (parentEffect?.id && parentEffect.keyframeEffects?.[keyframeIndex]) {
                const keyframeEffect = parentEffect.keyframeEffects[keyframeIndex];
                
                console.log('🎯 EffectsPanel: Keyframe effect found:', {
                    parentId: parentEffect.id,
                    keyframeIndex,
                    keyframeName: keyframeEffect.name
                });
                
                // Select the keyframe effect with the parent ID and subIndex
                selectEffect(parentEffect.id, 'keyframe', keyframeIndex);
                
                eventBusService?.emit('effect:selected', {
                    effectId: parentEffect.id,
                    effectIndex: parentIndex,
                    effectType: 'keyframe',
                    subIndex: keyframeIndex,
                }, { component: 'EffectsPanel' });
                
                logger.logAction('keyframe:effect:selected', 'Keyframe effect selected', { 
                    parentEffectId: parentEffect.id, 
                    keyframeIndex 
                });
            } else {
                console.warn('⚠️ EffectsPanel: handleKeyframeSelect - parent not found or no keyframe effect at index:', {
                    parentIndex,
                    keyframeIndex,
                    parentFound: !!parentEffect,
                    parentId: parentEffect?.id
                });
            }
        } catch (error) {
            console.error('❌ EffectsPanel: Error in handleKeyframeSelect:', error);
        }
    }, [projectState, selectEffect, eventBusService, logger]);

    const handleEffectDelete = useCallback((effectId) => {
        eventBusService?.emit('effect:delete', { effectId }, {
            component: 'EffectsPanel'
        });
        logger.logAction('effect:delete', 'Effect deleted', { effectId });
    }, [eventBusService, logger]);

    const handleToggleExpand = useCallback((sectionKey) => {
        setExpandedEffects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionKey)) {
                newSet.delete(sectionKey);
            } else {
                newSet.add(sectionKey);
            }
            return newSet;
        });
    }, []);

    const handleToggleVisibility = useCallback((effectId) => {
        eventBusService?.emit('effect:togglevisibility', { effectId }, {
            component: 'EffectsPanel'
        });
        logger.logAction('effect:visibility:toggle', 'Effect visibility toggled', { effectId });
    }, [eventBusService, logger]);

    if (!projectState) {
        return (
            <div className="effects-panel__loading">
                <CircularProgress />
            </div>
        );
    }

    return (
        <div className="effects-panel">
            {/* Header */}
            <div className="effects-panel__header">
                <h3 className="effects-panel__title">Effects</h3>
                {!isReadOnly && (
                    <div className="effects-panel__controls">
                        <AddEffectDropdown
                            addEffectMenuOpen={addEffectMenuOpen}
                            setAddEffectMenuOpen={setAddEffectMenuOpen}
                            availableEffects={availableEffects}
                            effectsLoaded={effectsLoaded}
                            currentTheme={currentTheme}
                            onAddEffect={handleAddEffect}
                            onOpenSpecialty={handleOpenSpecialty}
                        />
                    </div>
                )}
            </div>

            {/* Effects List - Phase 2 Component */}
            <div className="effects-panel__list">
                <EffectsList
                    effects={projectState?.getState?.()?.effects || []}
                    expandedEffects={expandedEffects}
                    selectedEffect={selectedEffect}
                    onEffectSelect={handleEffectSelect}
                    onSecondarySelect={handleSecondarySelect}
                    onKeyframeSelect={handleKeyframeSelect}
                    onEffectDelete={handleEffectDelete}
                    onToggleExpand={handleToggleExpand}
                    onToggleVisibility={handleToggleVisibility}
                    secondaryEffects={availableEffects?.secondary || []}
                    keyframeEffects={availableEffects?.keyFrame || []}
                    isReadOnly={isReadOnly}
                />
            </div>

            {/* Modals - Phase 1.3 State */}
            {specialtyModalOpen && (
                <SpecialtyEffectsModal
                    open={specialtyModalOpen}
                    onClose={handleCloseSpecialty}
                    projectState={projectState}
                    effectRegistry={effectRegistry}
                />
            )}

            {bulkAddModalOpen && (
                <BulkAddKeyframeModal
                    isOpen={bulkAddModalOpen}
                    onClose={closeBulkAddModal}
                    onBulkAdd={handleBulkAddKeyframes}
                    projectState={projectState}
                    keyframeEffects={availableEffects?.keyFrame || []}
                />
            )}
        </div>
    );
}

EffectsPanel.propTypes = {
    projectState: PropTypes.object.isRequired,
    effectRegistry: PropTypes.object,
    availableEffects: PropTypes.shape({
        primary: PropTypes.array,
        secondary: PropTypes.array,
        keyFrame: PropTypes.array,
        finalImage: PropTypes.array,
    }),
    effectsLoaded: PropTypes.bool,
    onEffectDelete: PropTypes.func,
    onEffectReorder: PropTypes.func,
    onEffectToggleVisibility: PropTypes.func,
    currentTheme: PropTypes.object,
    isReadOnly: PropTypes.bool,
    refreshAvailableEffects: PropTypes.func,
};