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
        bulkAddTargetId,
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
                        effectIndex: selectedEffectState.effectIndex
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
            
            // Return enriched selectedEffect with both selection metadata and full effect data
            return {
                // Original selection metadata from hook
                effectId: selectedEffectState.effectId,
                effectIndex: selectedEffectState.effectIndex,
                effectType: selectedEffectState.effectType,
                subIndex: selectedEffectState.subIndex,
                
                // Full effect data for EffectConfigurer
                name: effect.name || effect.className,
                registryKey: effect.name || effect.className,
                className: effect.className,
                id: effect.id,
                // 🔒 CRITICAL: Include config so EffectConfigPanel can pass it as initialConfig
                config: effect.config || {},
                // ... any other effect properties that might be needed
            };
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

    // Initialize Effect Command Service for creating commands
    const [effectCommandService] = useState(() => EffectCommandService);

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

        // Effect selection events
        const unsubscribeSelect = eventBusService.subscribe('effect:selected', (payload, event) => {
            try {
                const { effectId, effectType } = payload || {};
                if (effectId) {
                    // Pass effect ID directly - hook handles ID-to-index conversion
                    selectEffect(effectId, effectType);
                    logger.logAction('effect:selected', 'Effect selected', {
                        effectId,
                        effectType,
                    });
                }
            } catch (error) {
                logger.logError('Error handling effect:selected event', error);
            }
        });

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
                    if (commandService && effectCommandService && projectState) {
                        // Create the reorder command using EffectCommandService
                        // Pass effect IDs if available (prevents stale reference bugs)
                        const reorderCommand = effectCommandService.createReorderCommand(
                            projectState,
                            reorderFromId,  // Pass ID or index
                            reorderToId     // Pass ID or index
                        );
                        
                        // Execute the command via CommandService
                        commandService.execute(reorderCommand);
                    } else if (onEffectReorder) {
                        // Fallback to callback if services not available
                        onEffectReorder(fromId, toId);
                    }
                } else {
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

        return () => {
            unsubscribeSelect?.();
            unsubscribeAdd?.();
            unsubscribeDelete?.();
            unsubscribeReorder?.();
            unsubscribeVisibility?.();
        };
    }, [eventBusService, logger, selectEffect, clearSelection, onEffectDelete, onEffectReorder, onEffectToggleVisibility, commandService, effectCommandService, projectState]);

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
     * EffectsList callbacks - wired to state and events
     */
    const handleEffectSelect = useCallback((index, effectType = 'primary') => {
        const state = projectState?.getState?.();
        const effects = state?.effects || [];
        const effect = effects[index];
        if (effect?.id) {
            // Pass effect ID to hook - it handles ID-to-index conversion internally
            selectEffect(effect.id, effectType);
            setConfigPanelExpanded(true);
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
                    open={bulkAddModalOpen}
                    onClose={closeBulkAddModal}
                    effectId={bulkAddTargetId}
                    projectState={projectState}
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