/**
 * EffectItem Component
 * 
 * Renders a single effect row with controls (expand, visibility, delete).
 * Handles selection state, keyboard navigation, and context menu.
 * 
 * Architecture:
 * - ID-based access (stable across reorders)
 * - EventBusService for all events
 * - No direct callbacks (except from parent EffectsList)
 * - Includes keyboard a11y support
 * 
 * @component
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import {
    IconButton
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    Visibility,
    VisibilityOff,
    Delete
} from '@mui/icons-material';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useServices } from '../../contexts/ServiceContext.js';
import SecondaryEffectsList from './SecondaryEffectsList.jsx';
import KeyframeEffectsList from './KeyframeEffectsList.jsx';
import EffectContextMenu from './EffectContextMenu.jsx';

// CSS Import - Phase 6: CSS Organization
import './EffectsPanel.bem.css';
import './EffectItem.bem.css';
import './effects-list-icons.bem.css';

/**
 * Format effect name for display
 */
const formatEffectName = (effect) => {
    return effect.displayName || effect.name || effect.className || 'Unknown Effect';
};

/**
 * Format effect ID for display (first 8 chars)
 */
const formatEffectId = (id) => {
    if (!id || id.length < 8) return id;
    return id.substring(0, 8);
};

/**
 * EffectItem Component
 * 
 * Individual effect row with controls.
 * 
 * @param {Object} props
 * @param {Object} props.effect - Effect data
 * @param {string} props.effectId - Stable effect ID (🔒 PRIMARY IDENTIFIER)
 * @param {number} props.effectIndex - Current index (optimization hint, recalculated on reorder)
 * @param {string} props.effectType - 'primary' or 'final'
 * @param {boolean} props.isSelected - Is this effect selected
 * @param {boolean} props.isExpanded - Are children expanded
 * @param {boolean} props.hasChildren - Has secondary/keyframe effects
 * @param {boolean} props.isReadOnly - Read-only mode
 * @param {Function} props.onSelect - () => void - Called when effect clicked
 * @param {Function} props.onSecondarySelect - (parentIndex, secondaryIndex) => void - Called when secondary effect clicked
 * @param {Function} props.onKeyframeSelect - (parentIndex, keyframeIndex) => void - Called when keyframe effect clicked
 * @param {Function} props.onDelete - () => void - Called when delete confirmed
 * @param {Function} props.onToggleVisibility - () => void
 * @param {Function} props.onToggleExpand - () => void
 * @param {Function} props.onContextMenu - (effectId, position) => void (optional)
 * @param {Array} props.secondaryEffects - Available secondary effects for context menu
 * @param {Array} props.keyframeEffects - Available keyframe effects for context menu
 * @param {Object} props.selectedEffect - Current selection state for highlighting nested effects
 * @param {Function} props.onDragStart - (e, index) => void - Drag start handler
 * @param {Function} props.onDragOver - (e) => void - Drag over handler
 * @param {Function} props.onDrop - (e, index) => void - Drop handler
 * @returns {React.ReactElement}
 */
export default function EffectItem({
    effect = {},
    effectId = '',
    effectIndex = -1,
    effectType = 'primary',
    isSelected = false,
    isExpanded = false,
    hasChildren = false,
    isReadOnly = false,
    onSelect = () => {},
    onSecondarySelect = () => {},
    onKeyframeSelect = () => {},
    onDelete = () => {},
    onToggleVisibility = () => {},
    onToggleExpand = () => {},
    onContextMenu = () => {},
    secondaryEffects = [],
    keyframeEffects = [],
    selectedEffect = null,
    onDragStart = () => {},
    onDragOver = () => {},
    onDrop = () => {}
}) {
    const { eventBusService } = useServices();
    const [contextMenuPosition, setContextMenuPosition] = useState(null);

    /**
     * Handle effect selection with keyboard support
     */
    const handleSelect = useCallback((e) => {
        try {
            if (e && e.type === 'keydown') {
                if (e.key !== 'Enter') return;
                e.preventDefault();
            }

            onSelect();

            eventBusService?.emit('effectspanel:log:action', {
                action: 'effect:selected',
                effectId,
                effectType,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error selecting effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'select',
                error: error.message
            });
        }
    }, [effectId, effectType, onSelect, eventBusService]);

    /**
     * Handle effect deletion
     */
    const handleDelete = useCallback(() => {
        try {
            onDelete();

            eventBusService?.emit('effectspanel:log:action', {
                action: 'effect:delete',
                effectId,
                effectType,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error deleting effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'delete',
                error: error.message
            });
        }
    }, [effectId, effectType, onDelete, eventBusService]);

    /**
     * Handle visibility toggle
     */
    const handleToggleVisibility = useCallback((e) => {
        try {
            e.stopPropagation();
            onToggleVisibility();

            eventBusService?.emit('effectspanel:log:action', {
                action: 'effect:visibility:toggle',
                effectId,
                visible: !(effect.visible !== false),
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error toggling visibility:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'visibility_toggle',
                error: error.message
            });
        }
    }, [effect.visible, effectId, onToggleVisibility, eventBusService]);

    /**
     * Handle secondary effect deletion
     */
    const handleSecondaryDelete = useCallback((parentIndex, secondaryIndex) => {
        try {
            eventBusService?.emit('effectspanel:secondary:delete', {
                parentIndex,
                secondaryIndex,
                component: 'EffectItem'
            });

            eventBusService?.emit('effectspanel:log:action', {
                action: 'secondary:effect:delete',
                effectId,
                secondaryIndex,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error deleting secondary effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'secondary:delete',
                error: error.message
            });
        }
    }, [effectId, eventBusService]);

    /**
     * Handle secondary effect visibility toggle
     */
    const handleSecondaryToggleVisibility = useCallback((parentIndex, secondaryIndex) => {
        try {
            eventBusService?.emit('effectspanel:secondary:togglevisibility', {
                parentIndex,
                secondaryIndex,
                component: 'EffectItem'
            });

            eventBusService?.emit('effectspanel:log:action', {
                action: 'secondary:effect:visibility:toggle',
                effectId,
                secondaryIndex,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error toggling secondary effect visibility:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'secondary:visibility_toggle',
                error: error.message
            });
        }
    }, [effectId, eventBusService]);

    /**
     * Handle expand/collapse
     */
    const handleToggleExpand = useCallback((e) => {
        try {
            e.stopPropagation();
            onToggleExpand();

            eventBusService?.emit('effectspanel:log:action', {
                action: 'effect:expand:toggle',
                effectId,
                expanded: !isExpanded,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error toggling expand:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'expand_toggle',
                error: error.message
            });
        }
    }, [effectId, isExpanded, onToggleExpand, eventBusService]);

    /**
     * Handle keyboard delete (Delete key)
     */
    const handleKeyDown = useCallback((e) => {
        try {
            if (e.key === 'Delete' && !isReadOnly) {
                e.preventDefault();
                handleDelete();
            }
        } catch (error) {
            console.error('❌ EffectItem: Error in keydown handler:', error);
        }
    }, [isReadOnly, handleDelete]);

    /**
     * Handle secondary effect addition
     */
    const handleAddSecondary = useCallback((secondaryEffectName) => {
        try {
            eventBusService?.emit('effectspanel:effect:addsecondary', {
                effectId,
                effectIndex,
                effectName: secondaryEffectName,
                effectType: 'secondary',
                parentIndex: effectIndex,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error adding secondary effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'add:secondary',
                error: error.message
            });
        }
    }, [effectId, effectIndex, eventBusService]);

    /**
     * Handle keyframe effect addition
     */
    const handleAddKeyframe = useCallback((keyframeEffectName) => {
        try {
            eventBusService?.emit('effectspanel:effect:addkeyframe', {
                effectId,
                effectIndex,
                effectName: keyframeEffectName,
                effectType: 'keyframe',
                parentIndex: effectIndex,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error adding keyframe effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'add:keyframe',
                error: error.message
            });
        }
    }, [effectId, effectIndex, eventBusService]);

    /**
     * Handle bulk add keyframes
     */
    const handleBulkAddKeyframes = useCallback(() => {
        try {
            eventBusService?.emit('effectspanel:context:bulk:add:keyframes', {
                effectId,
                effectIndex,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error triggering bulk add keyframes:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'bulk:add:keyframes',
                error: error.message
            });
        }
    }, [effectId, effectIndex, eventBusService]);

    /**
     * Handle secondary effects reorder
     */
    const handleSecondaryReorder = useCallback((parentIndex, sourceIndex, targetIndex) => {
        try {
            console.log('🔄 EffectItem.handleSecondaryReorder called with:', { parentIndex, sourceIndex, targetIndex, effectId });
            eventBusService?.emit('effectspanel:secondary:reorder', {
                parentIndex,
                sourceIndex,
                targetIndex,
                parentEffectId: effectId,
                component: 'EffectItem'
            });
            console.log('📤 EffectItem: Emitted effectspanel:secondary:reorder event');

            eventBusService?.emit('effectspanel:log:action', {
                action: 'secondary:effect:reorder',
                parentIndex,
                sourceIndex,
                targetIndex,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error reordering secondary effects:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'secondary:reorder',
                error: error.message
            });
        }
    }, [effectId, eventBusService]);

    /**
     * Handle keyframe effects reorder
     */
    const handleKeyframeReorder = useCallback((parentIndex, sourceIndex, targetIndex) => {
        try {
            console.log('🔄 EffectItem.handleKeyframeReorder called with:', { parentIndex, sourceIndex, targetIndex, effectId });
            eventBusService?.emit('effectspanel:keyframe:reorder', {
                parentIndex,
                sourceIndex,
                targetIndex,
                parentEffectId: effectId,
                component: 'EffectItem'
            });
            console.log('📤 EffectItem: Emitted effectspanel:keyframe:reorder event');

            eventBusService?.emit('effectspanel:log:action', {
                action: 'keyframe:effect:reorder',
                parentIndex,
                sourceIndex,
                targetIndex,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error reordering keyframe effects:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'keyframe:reorder',
                error: error.message
            });
        }
    }, [effectId, eventBusService]);

    /**
     * Handle keyframe effect deletion
     */
    const handleKeyframeDelete = useCallback((parentIndex, keyframeIndex) => {
        try {
            eventBusService?.emit('effectspanel:keyframe:delete', {
                parentIndex,
                keyframeIndex,
                parentEffectId: effectId,
                component: 'EffectItem'
            });

            eventBusService?.emit('effectspanel:log:action', {
                action: 'keyframe:effect:delete',
                parentIndex,
                keyframeIndex,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error deleting keyframe effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'keyframe:delete',
                error: error.message
            });
        }
    }, [effectId, eventBusService]);

    /**
     * Handle keyframe effect visibility toggle
     */
    const handleKeyframeToggleVisibility = useCallback((parentIndex, keyframeIndex) => {
        try {
            eventBusService?.emit('effectspanel:keyframe:togglevisibility', {
                parentIndex,
                keyframeIndex,
                parentEffectId: effectId,
                component: 'EffectItem'
            });

            eventBusService?.emit('effectspanel:log:action', {
                action: 'keyframe:effect:visibility:toggle',
                parentIndex,
                keyframeIndex,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error toggling keyframe visibility:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'keyframe:visibility:toggle',
                error: error.message
            });
        }
    }, [effectId, eventBusService]);

    /**
     * Handle context menu
     */
    const handleContextMenu = useCallback(() => {
        try {
            // Store position for context menu
            setContextMenuPosition({ effectId, effectType, effectIndex });

            eventBusService?.emit('effectspanel:log:action', {
                action: 'effect:context:menu:open',
                effectId,
                effectType,
                component: 'EffectItem'
            });
        } catch (error) {
            console.error('❌ EffectItem: Error opening context menu:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectItem',
                action: 'context_menu',
                error: error.message
            });
        }
    }, [effectId, effectType, effectIndex, eventBusService]);

    const isVisible = effect.visible !== false;
    const isFinalEffect = effectType === 'final';
    
    // Build className for effect item
    const itemClassName = [
        'effects-list__item',
        `effects-list__item--${effectType}`,
        isSelected && 'effects-list__item--selected',
        isExpanded && 'effects-list__item--expanded',
        isReadOnly && 'effects-list__item--disabled'
    ].filter(Boolean).join(' ');

    return (
        <div
            onKeyDown={handleKeyDown}
            onDragStart={(effectType === 'primary' || effectType === 'final') ? (e) => onDragStart(e, effectIndex) : undefined}
            onDragOver={(effectType === 'primary' || effectType === 'final') ? onDragOver : undefined}
            onDrop={(effectType === 'primary' || effectType === 'final') ? (e) => onDrop(e, effectIndex) : undefined}
            draggable={(effectType === 'primary' || effectType === 'final') && !isReadOnly}
            className="effects-list__item-wrapper"
        >
            <ContextMenu.Root>
                <ContextMenu.Trigger asChild>
                    <div
                        className={itemClassName}
                        onClick={handleSelect}
                        onContextMenu={handleContextMenu}
                        tabIndex={0}
                        role="button"
                        aria-selected={isSelected}
                        aria-label={`Effect: ${formatEffectName(effect)}`}
                    >
                        {/* Expand/Collapse Button */}
                        {hasChildren && (
                            <IconButton
                                size="small"
                                onClick={handleToggleExpand}
                                disabled={isReadOnly}
                                title={isReadOnly ? 'Cannot expand while read-only' : (isExpanded ? 'Collapse' : 'Expand')}
                                className="effects-list__item__expand-button"
                                data-read-only={isReadOnly}
                            >
                                <ExpandMore className="effects-list__icon--medium" />
                            </IconButton>
                        )}

                        {/* Visibility Toggle Button */}
                        <IconButton
                            size="small"
                            disabled={isReadOnly}
                            onClick={handleToggleVisibility}
                            title={isReadOnly ? 'Read-only mode' : (isVisible ? 'Hide layer' : 'Show layer')}
                            className="effects-list__item__visibility-button"
                            data-read-only={isReadOnly}
                            data-visible={isVisible}
                        >
                            {isVisible ? <Visibility className="effects-list__icon--medium" /> : <VisibilityOff className="effects-list__icon--medium" />}
                        </IconButton>

                        {/* Effect Name and ID */}
                        <div className="effects-list__item__label">
                            <div className="effects-list__item__name">
                                {formatEffectName(effect)}
                            </div>

                            {effect.id && (
                                <div
                                    className="effects-list__item__badge"
                                    title={`Full ID: ${effect.id}`}
                                >
                                    {formatEffectId(effect.id)}
                                </div>
                            )}

                            {isFinalEffect && (
                                <div className="effects-list__item__badge effects-list__item__badge--final">
                                    Final
                                </div>
                            )}
                        </div>

                        {/* Delete Button */}
                        <IconButton
                            size="small"
                            disabled={isReadOnly}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                            }}
                            title={isReadOnly ? 'Read-only mode' : 'Delete layer'}
                            className="effects-list__item__delete-button"
                            data-read-only={isReadOnly}
                        >
                            <Delete className="effects-list__icon--medium" />
                        </IconButton>

                        {/* Secondary and Keyframe Effects (expanded) */}
                        {isExpanded && (
                            <div className="effects-list__item__children">
                                {effect.secondaryEffects && effect.secondaryEffects.length > 0 && (
                                    <SecondaryEffectsList
                                        parentEffect={effect}
                                        parentIndex={effectIndex}
                                        parentEffectId={effectId}
                                        selectedEffect={selectedEffect}
                                        isReadOnly={isReadOnly}
                                        onSecondarySelect={onSecondarySelect}
                                        onSecondaryDelete={handleSecondaryDelete}
                                        onToggleVisibility={handleSecondaryToggleVisibility}
                                        onReorder={handleSecondaryReorder}
                                    />
                                )}
                                {effect.keyframeEffects && effect.keyframeEffects.length > 0 && (
                                    <KeyframeEffectsList
                                        parentEffect={effect}
                                        parentIndex={effectIndex}
                                        parentEffectId={effectId}
                                        selectedEffect={selectedEffect}
                                        isReadOnly={isReadOnly}
                                        onKeyframeSelect={onKeyframeSelect}
                                        onKeyframeDelete={handleKeyframeDelete}
                                        onToggleVisibility={handleKeyframeToggleVisibility}
                                        onReorder={handleKeyframeReorder}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </ContextMenu.Trigger>

                {/* Context Menu - Render with EffectContextMenu component */}
                <EffectContextMenu
                    effect={effect}
                    effectId={effectId}
                    effectIndex={effectIndex}
                    effectType={effectType}
                    isFinalEffect={isFinalEffect}
                    isReadOnly={isReadOnly}
                    onDelete={handleDelete}
                    onAddSecondary={handleAddSecondary}
                    onAddKeyframe={handleAddKeyframe}
                    onBulkAddKeyframes={handleBulkAddKeyframes}
                    secondaryEffects={secondaryEffects}
                    keyframeEffects={keyframeEffects}
                />
            </ContextMenu.Root>
        </div>
    );
}

/**
 * PropTypes
 */
EffectItem.propTypes = {
    effect: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string,
        displayName: PropTypes.string,
        className: PropTypes.string,
        type: PropTypes.string,
        visible: PropTypes.bool,
        secondaryEffects: PropTypes.array,
        keyframeEffects: PropTypes.array
    }).isRequired,
    effectId: PropTypes.string.isRequired,
    effectIndex: PropTypes.number.isRequired,
    effectType: PropTypes.oneOf(['primary', 'final']),
    isSelected: PropTypes.bool,
    isExpanded: PropTypes.bool,
    hasChildren: PropTypes.bool,
    isReadOnly: PropTypes.bool,
    onSelect: PropTypes.func,
    onSecondarySelect: PropTypes.func,
    onKeyframeSelect: PropTypes.func,
    onDelete: PropTypes.func,
    onToggleVisibility: PropTypes.func,
    onToggleExpand: PropTypes.func,
    onContextMenu: PropTypes.func,
    secondaryEffects: PropTypes.array,
    keyframeEffects: PropTypes.array,
    selectedEffect: PropTypes.object,
    onDragStart: PropTypes.func,
    onDragOver: PropTypes.func,
    onDrop: PropTypes.func
};