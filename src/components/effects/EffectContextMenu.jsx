/**
 * EffectContextMenu Component
 * 
 * Right-click context menu for effect actions.
 * Shows options for delete, add secondary, add keyframe, and bulk add keyframes.
 * 
 * Architecture:
 * - ID-based access (stable effect identification)
 * - EventBusService for all events
 * - Keyboard navigation (Arrow keys, Enter, Esc)
 * - Grouped effect selection for secondary/keyframe
 * - Respects read-only mode
 * 
 * @component
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
    Delete,
    Add,
    Schedule,
    PlaylistAdd,
    ChevronRight
} from '@mui/icons-material';
import { useTheme } from '@mui/material';
import { useServices } from '../../contexts/ServiceContext.js';
import './EffectContextMenu.bem.css';

/**
 * EffectContextMenu Component
 * 
 * @param {Object} props
 * @param {Object} props.effect - Effect data
 * @param {string} props.effectId - Stable effect ID (🔒 PRIMARY IDENTIFIER)
 * @param {number} props.effectIndex - Current index in effects array
 * @param {string} props.effectType - 'primary' or 'final'
 * @param {boolean} props.isFinalEffect - Is this a final effect (no secondary/keyframe)
 * @param {boolean} props.isReadOnly - Read-only mode
 * @param {Function} props.onDelete - () => void - Trigger delete action
 * @param {Function} props.onAddSecondary - (effectName) => void - Add secondary effect
 * @param {Function} props.onAddKeyframe - (effectName) => void - Add keyframe effect
 * @param {Function} props.onBulkAddKeyframes - () => void - Trigger bulk add modal
 * @param {Array} props.secondaryEffects - Available secondary effects for submenu
 * @param {Array} props.keyframeEffects - Available keyframe effects for submenu
 * @returns {React.ReactElement}
 */
export default function EffectContextMenu({
    effect = {},
    effectId = '',
    effectIndex = -1,
    effectType = 'primary',
    isFinalEffect = false,
    isReadOnly = false,
    onDelete = () => {},
    onAddSecondary = () => {},
    onAddKeyframe = () => {},
    onBulkAddKeyframes = () => {},
    secondaryEffects = [],
    keyframeEffects = []
}) {
    const theme = useTheme();
    const { eventBusService } = useServices();

    /**
     * Handle delete from context menu
     */
    const handleContextDelete = useCallback(() => {
        try {
            eventBusService?.emit('effectspanel:context:delete', {
                effectId,
                effectIndex,
                effectType,
                component: 'EffectContextMenu'
            });

            eventBusService?.emit('effectspanel:log:action', {
                action: 'context:delete',
                effectId,
                component: 'EffectContextMenu'
            });

            onDelete();
        } catch (error) {
            console.error('❌ EffectContextMenu: Error deleting effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectContextMenu',
                action: 'delete',
                error: error.message
            });
        }
    }, [effectId, effectIndex, effectType, onDelete, eventBusService]);

    /**
     * Handle secondary effect selection from submenu
     */
    const handleAddSecondary = useCallback((secondaryEffectName) => {
        try {
            eventBusService?.emit('effectspanel:effect:addsecondary', {
                effectId,
                effectIndex,
                effectName: secondaryEffectName,
                effectType: 'secondary',
                parentIndex: effectIndex,
                component: 'EffectContextMenu'
            });

            eventBusService?.emit('effectspanel:log:action', {
                action: 'context:add:secondary',
                effectId,
                secondaryEffectName,
                component: 'EffectContextMenu'
            });

            // 🔒 CRITICAL: Don't call onAddSecondary callback here!
            // The event emission is the communication mechanism - calling the callback causes duplicate creation
            // The event is already being relayed through EventDrivenToolbarActions
        } catch (error) {
            console.error('❌ EffectContextMenu: Error adding secondary effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectContextMenu',
                action: 'add:secondary',
                error: error.message
            });
        }
    }, [effectId, effectIndex, eventBusService]);

    /**
     * Handle keyframe effect selection from submenu
     */
    const handleAddKeyframe = useCallback((keyframeEffectName) => {
        try {
            eventBusService?.emit('effectspanel:effect:addkeyframe', {
                effectId,
                effectIndex,
                effectName: keyframeEffectName,
                effectType: 'keyframe',
                parentIndex: effectIndex,
                component: 'EffectContextMenu'
            });

            eventBusService?.emit('effectspanel:log:action', {
                action: 'context:add:keyframe',
                effectId,
                keyframeEffectName,
                component: 'EffectContextMenu'
            });

            // 🔒 CRITICAL: Don't call onAddKeyframe callback here!
            // The event emission is the communication mechanism - calling the callback causes duplicate creation
            // The event is already being relayed through EventDrivenToolbarActions
        } catch (error) {
            console.error('❌ EffectContextMenu: Error adding keyframe effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectContextMenu',
                action: 'add:keyframe',
                error: error.message
            });
        }
    }, [effectId, effectIndex, eventBusService]);

    /**
     * Handle bulk add keyframes trigger
     */
    const handleBulkAddKeyframes = useCallback(() => {
        try {
            eventBusService?.emit('effectspanel:context:bulk:add:keyframes', {
                effectId,
                effectIndex,
                component: 'EffectContextMenu'
            });

            eventBusService?.emit('effectspanel:log:action', {
                action: 'context:bulk:add:keyframes',
                effectId,
                component: 'EffectContextMenu'
            });

            onBulkAddKeyframes();
        } catch (error) {
            console.error('❌ EffectContextMenu: Error triggering bulk add keyframes:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectContextMenu',
                action: 'bulk:add:keyframes',
                error: error.message
            });
        }
    }, [effectId, effectIndex, onBulkAddKeyframes, eventBusService]);

    /**
     * Render grouped effect options for submenu
     * Groups effects by author, then by category
     */
    const renderEffectOptions = useCallback((effects) => {
        if (!effects || effects.length === 0) {
            return (
                <ContextMenu.Item disabled className="effect-context-menu__disabled-item">
                    No effects available
                </ContextMenu.Item>
            );
        }

        // First group by author
        const authorGroups = {};
        effects.forEach(effect => {
            const author = effect.author || 'NFT Studio';
            if (!authorGroups[author]) {
                authorGroups[author] = [];
            }
            authorGroups[author].push(effect);
        });

        // Sort authors: NFT Studio first, then others alphabetically
        const sortedAuthors = Object.keys(authorGroups).sort((a, b) => {
            if (a === 'NFT Studio') return -1;
            if (b === 'NFT Studio') return 1;
            return a.localeCompare(b);
        });

        // Flatten all items with headers and separators
        const items = [];
        let isFirstAuthor = true;

        sortedAuthors.forEach((author) => {
            const authorEffects = authorGroups[author];
            
            // Add separator between authors (but not before first)
            if (!isFirstAuthor) {
                items.push(<ContextMenu.Separator key={`sep-${author}`} className="effect-context-menu__separator" />);
            }
            isFirstAuthor = false;
            
            // Within each author, group by category
            const categoryGroups = {};
            authorEffects.forEach(effect => {
                const category = effect.category || 'Other';
                if (!categoryGroups[category]) {
                    categoryGroups[category] = [];
                }
                categoryGroups[category].push(effect);
            });

            const sortedCategories = Object.keys(categoryGroups).sort();

            // Add author header (always show)
            items.push(
                <ContextMenu.Item disabled key={`header-${author}`} className="effect-context-menu__header">
                    {author}
                </ContextMenu.Item>
            );

            // Add category groups
            sortedCategories.forEach((category) => {
                // Add category header (show only if multiple categories)
                if (sortedCategories.length > 1) {
                    items.push(
                        <ContextMenu.Item disabled key={`subheader-${author}-${category}`} className="effect-context-menu__subheader">
                            {category}
                        </ContextMenu.Item>
                    );
                }

                // Add effects in this category
                categoryGroups[category].forEach((effect) => {
                    items.push(
                        <ContextMenu.Item
                            key={effect.name || effect.className}
                            className="effect-context-menu__item"
                            onSelect={() => {
                                if (effect.type === 'keyframe') {
                                    handleAddKeyframe(effect.name || effect.className);
                                } else {
                                    handleAddSecondary(effect.name || effect.className);
                                }
                            }}
                        >
                            {effect.displayName || effect.name || effect.className}
                        </ContextMenu.Item>
                    );
                });
            });
        });

        return items;
    }, [handleAddSecondary, handleAddKeyframe]);

    // If in read-only mode or effect is final, only show delete option
    if (isReadOnly && isFinalEffect) {
        return (
            <ContextMenu.Portal>
                <ContextMenu.Content className="effect-context-menu__content">
                    {!isReadOnly && (
                        <ContextMenu.Item className="effect-context-menu__item" onSelect={handleContextDelete}>
                            <Delete fontSize="small" />
                            Delete Effect
                        </ContextMenu.Item>
                    )}
                </ContextMenu.Content>
            </ContextMenu.Portal>
        );
    }

    return (
        <ContextMenu.Portal>
            <ContextMenu.Content className="effect-context-menu__content">
                {/* Show secondary and keyframe options for non-final effects and not in read-only mode */}
                {!isFinalEffect && !isReadOnly && (
                    <>
                        {/* Add Secondary Effect Submenu */}
                        <ContextMenu.Sub>
                            <ContextMenu.SubTrigger className="effect-context-menu__item effect-context-menu__trigger">
                                <div className="effect-context-menu__icon-container">
                                    <Add fontSize="small" />
                                    Add Secondary Effect
                                </div>
                                <ChevronRight fontSize="small" />
                            </ContextMenu.SubTrigger>
                            <ContextMenu.Portal>
                                <ContextMenu.SubContent className="effect-context-menu__content effect-context-menu__subcontent">
                                    {renderEffectOptions(secondaryEffects)}
                                </ContextMenu.SubContent>
                            </ContextMenu.Portal>
                        </ContextMenu.Sub>

                        <div className="effect-context-menu__separator" />

                        {/* Add Keyframe Effect Submenu */}
                        <ContextMenu.Sub>
                            <ContextMenu.SubTrigger className="effect-context-menu__item effect-context-menu__trigger">
                                <div className="effect-context-menu__icon-container">
                                    <Schedule fontSize="small" />
                                    Add Keyframe Effect
                                </div>
                                <ChevronRight fontSize="small" />
                            </ContextMenu.SubTrigger>
                            <ContextMenu.Portal>
                                <ContextMenu.SubContent className="effect-context-menu__content effect-context-menu__subcontent">
                                    {renderEffectOptions(keyframeEffects)}
                                </ContextMenu.SubContent>
                            </ContextMenu.Portal>
                        </ContextMenu.Sub>

                        <div className="effect-context-menu__separator" />

                        {/* Bulk Add Keyframes */}
                        <ContextMenu.Item className="effect-context-menu__item" onSelect={handleBulkAddKeyframes}>
                            <PlaylistAdd fontSize="small" />
                            Bulk Add Keyframes
                        </ContextMenu.Item>
                    </>
                )}

                {/* Delete always available unless read-only */}
                {!isReadOnly && (
                    <>
                        {!isFinalEffect && !isReadOnly && <div className="effect-context-menu__separator" />}
                        <ContextMenu.Item className="effect-context-menu__item" onSelect={handleContextDelete}>
                            <Delete fontSize="small" />
                            Delete Effect
                        </ContextMenu.Item>
                    </>
                )}
            </ContextMenu.Content>
        </ContextMenu.Portal>
    );
}

EffectContextMenu.propTypes = {
    effect: PropTypes.object,
    effectId: PropTypes.string.isRequired,
    effectIndex: PropTypes.number,
    effectType: PropTypes.oneOf(['primary', 'final', 'secondary', 'keyframe']),
    isFinalEffect: PropTypes.bool,
    isReadOnly: PropTypes.bool,
    onDelete: PropTypes.func,
    onAddSecondary: PropTypes.func,
    onAddKeyframe: PropTypes.func,
    onBulkAddKeyframes: PropTypes.func,
    secondaryEffects: PropTypes.array,
    keyframeEffects: PropTypes.array
};