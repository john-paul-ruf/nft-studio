/**
 * KeyframeEffectsList Component
 * 
 * Renders nested keyframe effects for a parent effect.
 * Similar to SecondaryEffectsList but with keyframe-specific formatting.
 * 
 * @component
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    IconButton
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Delete,
    ArrowForward
} from '@mui/icons-material';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useServices } from '../../contexts/ServiceContext.js';
import './EffectsPanel.bem.css';
import './effects-list-icons.bem.css';

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
 * Format keyframe display (frame number or time)
 */
const formatKeyframeDisplay = (keyframe) => {
    if (keyframe.frameNumber !== undefined) {
        return `Frame ${keyframe.frameNumber}`;
    }
    if (keyframe.time !== undefined) {
        return `${keyframe.time}ms`;
    }
    return 'Keyframe';
};

/**
 * KeyframeEffectsList Component
 * 
 * Renders list of keyframe effects nested under a parent effect.
 * 
 * @param {Object} props
 * @param {Object} props.parentEffect - Parent effect
 * @param {number} props.parentIndex - Parent effect index
 * @param {string} props.parentEffectId - Parent effect ID
 * @param {Array} props.keyframeEffects - Keyframe effects array (from parent)
 * @param {Object} props.selectedEffect - Current selection
 * @param {boolean} props.isReadOnly - Read-only mode
 * @param {Function} props.onKeyframeSelect - (parentIndex, keyframeIndex) => void
 * @param {Function} props.onKeyframeDelete - (parentIndex, keyframeIndex) => void
 * @param {Function} props.onToggleVisibility - (parentIndex, keyframeIndex) => void
 * @param {Function} props.onReorder - (parentIndex, sourceIndex, targetIndex) => void
 * @returns {React.ReactElement|null}
 */
export default function KeyframeEffectsList({
    parentEffect = {},
    parentIndex = -1,
    parentEffectId = '',
    keyframeEffects = null,
    selectedEffect = null,
    isReadOnly = false,
    onKeyframeSelect = () => {},
    onKeyframeDelete = () => {},
    onToggleVisibility = () => {},
    onReorder = () => {}
}) {
    const { eventBusService } = useServices();

    // Get keyframe effects from parent if not provided
    const effectsList = keyframeEffects || parentEffect.keyframeEffects || [];

    if (!effectsList || effectsList.length === 0) {
        return null;
    }

    /**
     * Check if a keyframe effect is selected
     */
    const isKeyframeSelected = useCallback((keyframeIndex) => {
        if (!selectedEffect) return false;

        return selectedEffect.effectType === 'keyframe' &&
               selectedEffect.subIndex === keyframeIndex;
    }, [selectedEffect]);

    /**
     * Handle keyframe effect selection
     */
    const handleSelect = useCallback((keyframeIndex) => {
        try {
            onKeyframeSelect(parentIndex, keyframeIndex);

            eventBusService?.emit('effectspanel:log:action', {
                action: 'keyframe:effect:selected',
                parentIndex,
                keyframeIndex,
                component: 'KeyframeEffectsList'
            });
        } catch (error) {
            console.error('❌ KeyframeEffectsList: Error selecting keyframe effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'KeyframeEffectsList',
                action: 'select',
                error: error.message
            });
        }
    }, [parentIndex, onKeyframeSelect, eventBusService]);

    /**
     * Handle keyframe effect deletion
     */
    const handleDelete = useCallback((keyframeIndex) => {
        try {
            console.log('🗑️ KeyframeEffectsList.handleDelete called:', { parentIndex, keyframeIndex, parentEffectId, hasEventBus: !!eventBusService });
            
            // Call prop handler if available
            if (onKeyframeDelete) {
                console.log('📞 Calling onKeyframeDelete prop');
                onKeyframeDelete(parentIndex, keyframeIndex);
            }

            // Also emit event for other listeners
            if (!eventBusService) {
                console.error('❌ eventBusService is not available!');
            } else {
                console.log('📤 Emitting effectspanel:effect:deletekeyframe event');
                eventBusService.emit('effectspanel:effect:deletekeyframe', {
                    parentIndex,
                    keyframeIndex,
                    parentEffectId,
                    component: 'KeyframeEffectsList'
                });
            }

            eventBusService?.emit('effectspanel:log:action', {
                action: 'keyframe:effect:delete',
                parentIndex,
                keyframeIndex,
                component: 'KeyframeEffectsList'
            });
        } catch (error) {
            console.error('❌ KeyframeEffectsList: Error deleting keyframe effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'KeyframeEffectsList',
                action: 'delete',
                error: error.message
            });
        }
    }, [parentIndex, parentEffectId, onKeyframeDelete, eventBusService]);

    /**
     * Handle visibility toggle
     */
    const handleToggleVisibility = useCallback((e, keyframeIndex) => {
        try {
            console.log('👁️ KeyframeEffectsList.handleToggleVisibility called:', { parentIndex, keyframeIndex, parentEffectId, hasEventBus: !!eventBusService });
            
            e.stopPropagation();
            
            // Call prop handler if available
            if (onToggleVisibility) {
                console.log('📞 Calling onToggleVisibility prop');
                onToggleVisibility(parentIndex, keyframeIndex);
            }

            // Also emit event for other listeners
            const keyframe = effectsList[keyframeIndex];
            const isVisible = keyframe?.visible !== false;
            
            if (!eventBusService) {
                console.error('❌ eventBusService is not available!');
            } else {
                console.log('📤 Emitting effectspanel:effect:keyframevisibility event');
                eventBusService.emit('effectspanel:effect:keyframevisibility', {
                    parentIndex,
                    keyframeIndex,
                    parentEffectId,
                    visible: !isVisible,
                    component: 'KeyframeEffectsList'
                });
            }

            eventBusService?.emit('effectspanel:log:action', {
                action: 'keyframe:effect:visibility:toggle',
                parentIndex,
                keyframeIndex,
                visible: !isVisible,
                component: 'KeyframeEffectsList'
            });
        } catch (error) {
            console.error('❌ KeyframeEffectsList: Error toggling visibility:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'KeyframeEffectsList',
                action: 'visibility_toggle',
                error: error.message
            });
        }
    }, [parentIndex, parentEffectId, effectsList, onToggleVisibility, eventBusService]);

    /**
     * Handle drag start
     */
    const handleDragStart = useCallback((e, keyframeIndex) => {
        try {
            console.log('🎯 KeyframeEffectsList: handleDragStart fired', { parentIndex, keyframeIndex });
            e.stopPropagation(); // ✅ Prevent bubbling to parent EffectItem
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'keyframe',
                parentIndex,
                sourceIndex: keyframeIndex
            }));

            eventBusService?.emit('effectspanel:log:action', {
                action: 'keyframe:effect:drag:start',
                parentIndex,
                keyframeIndex,
                component: 'KeyframeEffectsList'
            });
        } catch (error) {
            console.error('❌ KeyframeEffectsList: Error in drag start:', error);
        }
    }, [parentIndex, eventBusService]);

    /**
     * Handle drag over
     */
    const handleDragOver = useCallback((e) => {
        try {
            e.stopPropagation(); // ✅ Prevent bubbling to parent EffectItem
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        } catch (error) {
            console.error('❌ KeyframeEffectsList: Error in drag over:', error);
        }
    }, []);

    /**
     * Handle drop
     */
    const handleDrop = useCallback((e, targetIndex) => {
        try {
            console.log('🎯 KeyframeEffectsList: handleDrop fired', { targetIndex, parentIndex });
            e.stopPropagation(); // ✅ Prevent bubbling to parent EffectItem
            e.preventDefault();
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
            console.log('🎯 KeyframeEffectsList: dragData parsed:', dragData);

            if (dragData.type === 'keyframe' &&
                dragData.parentIndex === parentIndex &&
                dragData.sourceIndex !== targetIndex) {
                console.log('🎯 KeyframeEffectsList: Calling onReorder with:', { parentIndex, sourceIndex: dragData.sourceIndex, targetIndex });
                onReorder(parentIndex, dragData.sourceIndex, targetIndex);

                eventBusService?.emit('effectspanel:log:action', {
                    action: 'keyframe:effect:reorder',
                    parentIndex,
                    sourceIndex: dragData.sourceIndex,
                    targetIndex,
                    component: 'KeyframeEffectsList'
                });
            } else {
                console.warn('🎯 KeyframeEffectsList: Drop condition not met', {
                    isKeyframe: dragData.type === 'keyframe',
                    parentMatch: dragData.parentIndex === parentIndex,
                    sameIndex: dragData.sourceIndex === targetIndex,
                    dragDataType: dragData.type,
                    dragDataParentIndex: dragData.parentIndex,
                    dragDataSourceIndex: dragData.sourceIndex
                });
            }
        } catch (error) {
            console.error('❌ KeyframeEffectsList: Error in drop:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'KeyframeEffectsList',
                action: 'drop',
                error: error.message
            });
        }
    }, [parentIndex, onReorder, eventBusService]);

    return (
        <div className="keyframe-effects-list__container">
            {effectsList.map((keyframe, idx) => {
                const isSelected = isKeyframeSelected(idx);
                const isVisible = keyframe.visible !== false;

                return (
                    <ContextMenu.Root key={idx}>
                        <ContextMenu.Trigger asChild>
                            <div
                                className="keyframe-effects-list__item__drag-container"
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, idx)}
                            >
                                <div
                                    className={`keyframe-effects-list__item ${isSelected ? 'keyframe-effects-list__item--selected' : ''}`}
                                    onClick={() => handleSelect(idx)}
                                    onContextMenu={() => handleSelect(idx)}
                                >
                                    {/* Icon and Name */}
                                    <div className="keyframe-effects-list__item__icon-container">
                                        <ArrowForward
                                            className="keyframe-effects-list__item__arrow-icon"
                                        />
                                        <div className="keyframe-effects-list__item__name">
                                            {formatKeyframeDisplay(keyframe)}: {formatEffectName(keyframe)}
                                        </div>
                                        {keyframe.id && (
                                            <div
                                                className="keyframe-effects-list__item__id-chip"
                                                title={`Full ID: ${keyframe.id}`}
                                            >
                                                {formatEffectId(keyframe.id)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="keyframe-effects-list__item__actions">
                                        <IconButton
                                            size="small"
                                            disabled={isReadOnly}
                                            onClick={(e) => handleToggleVisibility(e, idx)}
                                            title={isReadOnly ? 'Read-only mode' : (isVisible ? 'Hide' : 'Show')}
                                            className={`keyframe-effects-list__item__visibility-btn ${!isVisible ? 'keyframe-effects-list__item__visibility-btn--hidden' : ''}`}
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
                                            className="keyframe-effects-list__item__delete-btn"
                                        >
                                            <Delete className="effects-list__icon--small" />
                                        </IconButton>
                                    </div>
                                </div>
                            </div>
                        </ContextMenu.Trigger>

                        {/* Context Menu */}
                        <ContextMenu.Portal>
                            <ContextMenu.Content
                                className="keyframe-effects-list__context-menu"
                            >
                                <ContextMenu.Item
                                    disabled={isReadOnly}
                                    className="keyframe-effects-list__context-item"
                                    onSelect={() => !isReadOnly && handleDelete(idx)}
                                >
                                    <Delete fontSize="small" className="effects-list__icon--with-margin-right" />
                                    {isReadOnly ? 'Delete (Read-only)' : 'Delete Keyframe Effect'}
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
KeyframeEffectsList.propTypes = {
    parentEffect: PropTypes.shape({
        id: PropTypes.string,
        keyframeEffects: PropTypes.array
    }),
    parentIndex: PropTypes.number,
    parentEffectId: PropTypes.string,
    keyframeEffects: PropTypes.array,
    selectedEffect: PropTypes.object,
    isReadOnly: PropTypes.bool,
    onKeyframeSelect: PropTypes.func,
    onKeyframeDelete: PropTypes.func,
    onToggleVisibility: PropTypes.func,
    onReorder: PropTypes.func
};