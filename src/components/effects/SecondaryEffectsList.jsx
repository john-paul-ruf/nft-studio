/**
 * SecondaryEffectsList Component
 * 
 * Renders nested secondary effects for a parent effect.
 * Handles secondary effect rendering, drag-drop, and interactions.
 * 
 * @component
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    IconButton
} from '@mui/material';
import './EffectsPanel.bem.css';
import './effects-list-icons.bem.css';
import {
    Visibility,
    VisibilityOff,
    Delete,
    SubdirectoryArrowRight
} from '@mui/icons-material';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useServices } from '../../contexts/ServiceContext.js';

/**
 * Format effect name for display
 */
const formatEffectName = (effect) => {
    return effect.displayName || effect.name || effect.className || 'Unknown';
};

/**
 * Format effect ID for display
 */
const formatEffectId = (id) => {
    if (!id || id.length < 8) return id;
    return id.substring(0, 8);
};

/**
 * SecondaryEffectsList Component
 * 
 * Renders list of secondary effects nested under a parent effect.
 * 
 * @param {Object} props
 * @param {Object} props.parentEffect - Parent effect
 * @param {number} props.parentIndex - Parent effect index
 * @param {string} props.parentEffectId - Parent effect ID
 * @param {Array} props.secondaryEffects - Secondary effects array (from parent)
 * @param {Object} props.selectedEffect - Current selection
 * @param {boolean} props.isReadOnly - Read-only mode
 * @param {Function} props.onSecondarySelect - (parentIndex, secondaryIndex) => void
 * @param {Function} props.onSecondaryDelete - (parentIndex, secondaryIndex) => void
 * @param {Function} props.onToggleVisibility - (parentIndex, secondaryIndex) => void
 * @param {Function} props.onReorder - (parentIndex, sourceIndex, targetIndex) => void
 * @returns {React.ReactElement|null}
 */
export default function SecondaryEffectsList({
    parentEffect = {},
    parentIndex = -1,
    parentEffectId = '',
    secondaryEffects = null,
    selectedEffect = null,
    isReadOnly = false,
    onSecondarySelect = () => {},
    onSecondaryDelete = () => {},
    onToggleVisibility = () => {},
    onReorder = () => {}
}) {
    const { eventBusService } = useServices();

    // Get secondary effects from parent if not provided
    const effectsList = secondaryEffects || parentEffect.secondaryEffects || [];

    if (!effectsList || effectsList.length === 0) {
        return null;
    }

    /**
     * Check if a secondary effect is selected
     */
    const isSecondarySelected = useCallback((secondaryIndex) => {
        if (!selectedEffect) return false;

        return selectedEffect.effectType === 'secondary' &&
               selectedEffect.subIndex === secondaryIndex;
    }, [selectedEffect]);

    /**
     * Handle secondary effect selection
     */
    const handleSelect = useCallback((secondaryIndex) => {
        try {
            onSecondarySelect(parentIndex, secondaryIndex);

            eventBusService?.emit('effectspanel:log:action', {
                action: 'secondary:effect:selected',
                parentIndex,
                secondaryIndex,
                component: 'SecondaryEffectsList'
            });
        } catch (error) {
            console.error('❌ SecondaryEffectsList: Error selecting secondary effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'SecondaryEffectsList',
                action: 'select',
                error: error.message
            });
        }
    }, [parentIndex, onSecondarySelect, eventBusService]);

    /**
     * Handle secondary effect deletion
     */
    const handleDelete = useCallback((secondaryIndex) => {
        try {
            onSecondaryDelete(parentIndex, secondaryIndex);

            eventBusService?.emit('effectspanel:log:action', {
                action: 'secondary:effect:delete',
                parentIndex,
                secondaryIndex,
                component: 'SecondaryEffectsList'
            });
        } catch (error) {
            console.error('❌ SecondaryEffectsList: Error deleting secondary effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'SecondaryEffectsList',
                action: 'delete',
                error: error.message
            });
        }
    }, [parentIndex, onSecondaryDelete, eventBusService]);

    /**
     * Handle visibility toggle
     */
    const handleToggleVisibility = useCallback((e, secondaryIndex) => {
        try {
            e.stopPropagation();
            onToggleVisibility(parentIndex, secondaryIndex);

            eventBusService?.emit('effectspanel:log:action', {
                action: 'secondary:effect:visibility:toggle',
                parentIndex,
                secondaryIndex,
                component: 'SecondaryEffectsList'
            });
        } catch (error) {
            console.error('❌ SecondaryEffectsList: Error toggling visibility:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'SecondaryEffectsList',
                action: 'visibility_toggle',
                error: error.message
            });
        }
    }, [parentIndex, onToggleVisibility, eventBusService]);

    /**
     * Handle drag start
     */
    const handleDragStart = useCallback((e, secondaryIndex) => {
        try {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'secondary',
                parentIndex,
                sourceIndex: secondaryIndex
            }));

            eventBusService?.emit('effectspanel:log:action', {
                action: 'secondary:effect:drag:start',
                parentIndex,
                secondaryIndex,
                component: 'SecondaryEffectsList'
            });
        } catch (error) {
            console.error('❌ SecondaryEffectsList: Error in drag start:', error);
        }
    }, [parentIndex, eventBusService]);

    /**
     * Handle drag over
     */
    const handleDragOver = useCallback((e) => {
        try {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        } catch (error) {
            console.error('❌ SecondaryEffectsList: Error in drag over:', error);
        }
    }, []);

    /**
     * Handle drop
     */
    const handleDrop = useCallback((e, targetIndex) => {
        try {
            e.preventDefault();
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

            if (dragData.type === 'secondary' &&
                dragData.parentIndex === parentIndex &&
                dragData.sourceIndex !== targetIndex) {
                onReorder(parentIndex, dragData.sourceIndex, targetIndex);

                eventBusService?.emit('effectspanel:log:action', {
                    action: 'secondary:effect:reorder',
                    parentIndex,
                    sourceIndex: dragData.sourceIndex,
                    targetIndex,
                    component: 'SecondaryEffectsList'
                });
            }
        } catch (error) {
            console.error('❌ SecondaryEffectsList: Error in drop:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'SecondaryEffectsList',
                action: 'drop',
                error: error.message
            });
        }
    }, [parentIndex, onReorder, eventBusService]);

    return (
        <div className="secondary-effects-list__container">
            {effectsList.map((secondary, idx) => {
                const isSelected = isSecondarySelected(idx);
                const isVisible = secondary.visible !== false;

                return (
                    <ContextMenu.Root key={idx}>
                        <ContextMenu.Trigger asChild>
                            <div
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, idx)}
                                className="secondary-effects-list__item__drag-container"
                            >
                                <div
                                    onClick={() => handleSelect(idx)}
                                    onContextMenu={() => handleSelect(idx)}
                                    className={`secondary-effects-list__item ${isSelected ? 'secondary-effects-list__item--selected' : ''}`}
                                >
                                    {/* Icon and Name */}
                                    <div className="secondary-effects-list__item__icon-container">
                                        <SubdirectoryArrowRight className="secondary-effects-list__item__arrow-icon" />
                                        <div className="secondary-effects-list__item__name">
                                            {formatEffectName(secondary)}
                                        </div>
                                        {secondary.id && (
                                            <div
                                                className="secondary-effects-list__item__id-chip"
                                                title={`Full ID: ${secondary.id}`}
                                            >
                                                {formatEffectId(secondary.id)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="secondary-effects-list__item__actions">
                                        <IconButton
                                            size="small"
                                            disabled={isReadOnly}
                                            onClick={(e) => handleToggleVisibility(e, idx)}
                                            title={isReadOnly ? 'Read-only mode' : (isVisible ? 'Hide' : 'Show')}
                                            className="secondary-effects-list__item__visibility-btn"
                                        >
                                            {isVisible ? <Visibility className="effects-list__icon--small" /> : <VisibilityOff className="effects-list__icon--small" />}
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            disabled={isReadOnly}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(idx);
                                            }}
                                            title={isReadOnly ? 'Read-only mode' : 'Delete'}
                                            className="secondary-effects-list__item__delete-btn"
                                        >
                                            <Delete className="effects-list__icon--small" />
                                        </IconButton>
                                    </div>
                                </div>
                            </div>
                        </ContextMenu.Trigger>

                        {/* Context Menu */}
                        <ContextMenu.Portal>
                            <ContextMenu.Content className="secondary-effects-list__context-menu">
                                <ContextMenu.Item
                                    disabled={isReadOnly}
                                    className="secondary-effects-list__context-item"
                                    onSelect={() => !isReadOnly && handleDelete(idx)}
                                >
                                    <Delete fontSize="small" className="effects-list__icon--with-margin-right" />
                                    {isReadOnly ? 'Delete (Read-only)' : 'Delete Secondary Effect'}
                                </ContextMenu.Item>
                            </ContextMenu.Content>
                        </ContextMenu.Portal>
                    </ContextMenu.Root>
                );
            })}
        </div>
    );
}

/**
 * PropTypes
 */
SecondaryEffectsList.propTypes = {
    parentEffect: PropTypes.shape({
        id: PropTypes.string,
        secondaryEffects: PropTypes.array
    }),
    parentIndex: PropTypes.number,
    parentEffectId: PropTypes.string,
    secondaryEffects: PropTypes.array,
    selectedEffect: PropTypes.object,
    isReadOnly: PropTypes.bool,
    onSecondarySelect: PropTypes.func,
    onSecondaryDelete: PropTypes.func,
    onToggleVisibility: PropTypes.func,
    onReorder: PropTypes.func
};