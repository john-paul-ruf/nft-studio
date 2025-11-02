/**
 * EffectsList Component
 * 
 * Renders organized list of primary and final effects.
 * Manages effect list structure, sectioning, and state delegation.
 * 
 * Architecture:
 * - Receives all effects and organizes them into Primary/Final sections
 * - Uses ID-based access pattern (NEVER index-based)
 * - Delegates to EffectItem for individual effect rendering
 * - Emits events through EventBusService (NO direct callbacks)
 * 
 * @component
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useServices } from '../../contexts/ServiceContext.js';
import EffectItem from './EffectItem.jsx';

// CSS Import - Phase 6: CSS Organization
import './EffectsPanel.bem.css';

/**
 * Categorizes an effect as final or primary
 * @param {Object} effect - Effect to categorize
 * @returns {boolean} true if effect is final image effect
 */
const isFinalEffect = (effect) => {
    if (!effect) return false;
    if (effect.type === 'secondary' || effect.type === 'keyframe') return false;
    return effect.type === 'finalImage';
};

/**
 * EffectsList Component
 * 
 * Organizes and renders effects in sections (Primary/Final).
 * Handles empty states, sectioning, and delegates rendering to EffectItem.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.effects - All effects from ProjectState
 * @param {Set} props.expandedEffects - Expanded state: new Set(['primary-0', 'final-1'])
 * @param {Object} props.selectedEffect - Current selection: { effectId, effectIndex, effectType, subIndex }
 * @param {Function} props.onEffectSelect - (index, type) => void
 * @param {Function} props.onSecondarySelect - (parentIndex, secondaryIndex) => void
 * @param {Function} props.onKeyframeSelect - (parentIndex, keyframeIndex) => void
 * @param {Function} props.onEffectDelete - (effectId) => void
 * @param {Function} props.onToggleExpand - (sectionKey) => void
 * @param {Function} props.onToggleVisibility - (effectId) => void
 * @param {Function} props.onContextMenu - (effectId, position) => void (optional)
 * @param {Array} props.secondaryEffects - Available secondary effects for context menu
 * @param {Array} props.keyframeEffects - Available keyframe effects for context menu
 * @param {boolean} props.isReadOnly - Read-only mode
 * @returns {React.ReactElement}
 */
export default function EffectsList({
    effects = [],
    expandedEffects = new Set(),
    selectedEffect = null,
    onEffectSelect = () => {},
    onSecondarySelect = () => {},
    onKeyframeSelect = () => {},
    onEffectDelete = () => {},
    onToggleExpand = () => {},
    onToggleVisibility = () => {},
    onContextMenu = () => {},
    secondaryEffects = [],
    keyframeEffects = [],
    isReadOnly = false
}) {
    const { eventBusService, projectState } = useServices();

    /**
     * 🔒 CRITICAL: Resolve effect index from ID
     * Handles reordering safely - index is resolved fresh at render time
     * @param {string} effectId - Stable effect ID
     * @returns {number} Current index in effects array, or -1 if not found
     */
    const resolveEffectIndex = useCallback((effectId) => {
        const freshEffects = projectState?.getState()?.effects || effects;
        return freshEffects.findIndex(e => e.id === effectId);
    }, [projectState, effects]);

    /**
     * Organize effects into sections
     * 🔒 Uses ID for stable categorization across reorders
     */
    const organizedEffects = useMemo(() => {
        try {
            // Create [effect, effectId] pairs for stable tracking
            const effectsWithIds = effects.map(effect => ({
                effect,
                effectId: effect.id
            }));

            const primary = effectsWithIds.filter(({ effect }) => !isFinalEffect(effect));
            const final = effectsWithIds.filter(({ effect }) => isFinalEffect(effect));

            return { primary, final };
        } catch (error) {
            console.error('❌ EffectsList: Error organizing effects:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectsList',
                message: 'Failed to organize effects',
                error: error.message
            });
            return { primary: [], final: [] };
        }
    }, [effects, eventBusService]);

    /**
     * Handle effect selection with ID-based comparison
     */
    const handleEffectSelect = useCallback((index, effectType = 'primary') => {
        try {
            if (index < 0 || index >= effects.length) {
                console.warn('⚠️ EffectsList: Invalid effect index:', index);
                return;
            }

            // 🔒 CRITICAL: Get effect ID from fresh state
            const freshEffects = projectState?.getState()?.effects || effects;
            const effect = freshEffects[index];

            if (!effect || !effect.id) {
                console.error('❌ EffectsList: Cannot select effect without ID', { index, effect });
                return;
            }

            onEffectSelect(index, effectType);

            // Emit logging event
            eventBusService?.emit('effectspanel:log:action', {
                action: 'effect:selected',
                effectId: effect.id,
                effectType,
                component: 'EffectsList'
            });
        } catch (error) {
            console.error('❌ EffectsList: Error selecting effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectsList',
                action: 'select',
                error: error.message
            });
        }
    }, [effects, projectState, onEffectSelect, eventBusService]);

    /**
     * Handle effect deletion
     */
    const handleEffectDelete = useCallback((effectId) => {
        try {
            if (!effectId) {
                console.error('❌ EffectsList: Cannot delete effect without ID');
                return;
            }

            onEffectDelete(effectId);

            // Emit logging event
            eventBusService?.emit('effectspanel:log:action', {
                action: 'effect:delete',
                effectId,
                component: 'EffectsList'
            });
        } catch (error) {
            console.error('❌ EffectsList: Error deleting effect:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectsList',
                action: 'delete',
                error: error.message
            });
        }
    }, [onEffectDelete, eventBusService]);

    /**
     * Handle effect visibility toggle
     */
    const handleToggleVisibility = useCallback((effectId) => {
        try {
            if (!effectId) {
                console.error('❌ EffectsList: Cannot toggle visibility without effect ID');
                return;
            }

            onToggleVisibility(effectId);

            // Emit logging event
            eventBusService?.emit('effectspanel:log:action', {
                action: 'effect:visibility:toggle',
                effectId,
                component: 'EffectsList'
            });
        } catch (error) {
            console.error('❌ EffectsList: Error toggling visibility:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectsList',
                action: 'visibility_toggle',
                error: error.message
            });
        }
    }, [onToggleVisibility, eventBusService]);

    /**
     * Check if effect is selected using ID comparison
     * 🔒 CRITICAL: Compare by ID, not index (index changes on reorder)
     */
    const isEffectSelected = useCallback((effectId, effectType = 'primary') => {
        if (!selectedEffect) return false;

        try {
            const isSelected = selectedEffect.effectId === effectId &&
                              selectedEffect.effectType === effectType &&
                              selectedEffect.subIndex === null;

            return isSelected;
        } catch (error) {
            console.error('❌ EffectsList: Error checking selection:', error);
            return false;
        }
    }, [selectedEffect]);

    /**
     * Handle primary/final effect drag start
     */
    const handleDragStart = useCallback((e, effectIndex) => {
        try {
            const freshEffects = projectState?.getState()?.effects || effects;
            const effect = freshEffects[effectIndex];
            if (!effect || !effect.id) {
                console.error('❌ EffectsList: Cannot drag effect without ID', { effectIndex });
                return;
            }

            // Determine effect type from the effect itself
            const effectType = effect.type === 'finalImage' ? 'final' : 'primary';

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: effectType,
                sourceIndex: effectIndex,
                effectId: effect.id
            }));

            eventBusService?.emit('effectspanel:log:action', {
                action: `${effectType}:effect:drag:start`,
                effectIndex,
                effectId: effect.id,
                component: 'EffectsList'
            });
        } catch (error) {
            console.error('❌ EffectsList: Error in drag start:', error);
        }
    }, [effects, projectState, eventBusService]);

    /**
     * Handle drag over - allow drop
     */
    const handleDragOver = useCallback((e) => {
        try {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        } catch (error) {
            console.error('❌ EffectsList: Error in drag over:', error);
        }
    }, []);

    /**
     * Handle drop to reorder primary/final effects
     */
    const handleDrop = useCallback((e, targetIndex) => {
        try {
            e.preventDefault();
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

            // Handle both primary and final effect drops
            if ((dragData.type === 'primary' || dragData.type === 'final') && dragData.sourceIndex !== targetIndex) {
                const freshEffects = projectState?.getState()?.effects || effects;
                const sourceEffect = freshEffects[dragData.sourceIndex];
                const targetEffect = freshEffects[targetIndex];

                if (sourceEffect?.id && targetEffect?.id) {
                    eventBusService?.emit('effectspanel:effect:reorder', {
                        fromId: sourceEffect.id,
                        toId: targetEffect.id,
                        sourceIndex: dragData.sourceIndex,
                        targetIndex: targetIndex
                    }, { component: 'EffectsList' });

                    eventBusService?.emit('effectspanel:log:action', {
                        action: `${dragData.type}:effect:reorder`,
                        sourceIndex: dragData.sourceIndex,
                        targetIndex,
                        fromId: sourceEffect.id,
                        toId: targetEffect.id,
                        component: 'EffectsList'
                    });
                }
            }
        } catch (error) {
            console.error('❌ EffectsList: Error in drop:', error);
            eventBusService?.emit('effectspanel:log:error', {
                component: 'EffectsList',
                action: 'drop',
                error: error.message
            });
        }
    }, [effects, projectState, eventBusService]);

    /**
     * Render effect section (Primary or Final)
     */
    const renderSection = (title, effectList, sectionType) => {
        if (!effectList || effectList.length === 0) return null;

        return (
            <div key={sectionType} className="effects-list__section">
                {sectionType === 'final' && effectList.length > 0 && (
                    <div className="effects-list__section-divider" />
                )}
                <div className="effects-list__section-title">
                    {title}
                </div>
                <div className="effects-list__items-container">
                    {effectList.map((effectData, sortedIndex) => {
                        const { effect, effectId } = effectData;
                        // 🔒 CRITICAL: Resolve current index from effect ID
                        const currentIndex = resolveEffectIndex(effectId);

                        if (currentIndex === -1) {
                            console.warn('⚠️ EffectsList: Effect ID not found in effects array:', effectId);
                            return null;
                        }

                        const effectType = effect.type === 'finalImage' ? 'final' : 'primary';
                        const isSelected = isEffectSelected(effectId, effectType);
                        const isExpanded = expandedEffects.has(`${sectionType}-${sortedIndex}`);
                        const hasChildren = (effect.secondaryEffects?.length > 0) ||
                                          (effect.keyframeEffects?.length > 0);

                        return (
                            <EffectItem
                                key={effectId}
                                effect={effect}
                                effectId={effectId}
                                effectIndex={currentIndex}
                                effectType={effectType}
                                isSelected={isSelected}
                                isExpanded={isExpanded}
                                hasChildren={hasChildren}
                                isReadOnly={isReadOnly}
                                onSelect={() => handleEffectSelect(currentIndex, effectType)}
                                onSecondarySelect={onSecondarySelect}
                                onKeyframeSelect={onKeyframeSelect}
                                onDelete={() => handleEffectDelete(effectId)}
                                onToggleVisibility={() => handleToggleVisibility(effectId)}
                                onToggleExpand={() => onToggleExpand(`${sectionType}-${sortedIndex}`)}
                                onContextMenu={onContextMenu}
                                secondaryEffects={secondaryEffects}
                                keyframeEffects={keyframeEffects}
                                selectedEffect={selectedEffect}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    // Handle empty state
    if (effects.length === 0) {
        return (
            <div className="effects-panel__empty-state">
                No effects added yet
            </div>
        );
    }

    return (
        <div className="effects-list">
            {renderSection('Primary Effects', organizedEffects.primary, 'primary')}
            {renderSection('Final Effects', organizedEffects.final, 'final')}
        </div>
    );
}

/**
 * PropTypes for EffectsList
 */
EffectsList.propTypes = {
    effects: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string,
        className: PropTypes.string,
        type: PropTypes.string,
        visible: PropTypes.bool,
        secondaryEffects: PropTypes.array,
        keyframeEffects: PropTypes.array
    })).isRequired,
    expandedEffects: PropTypes.instanceOf(Set).isRequired,
    selectedEffect: PropTypes.shape({
        effectId: PropTypes.string,
        effectIndex: PropTypes.number,
        effectType: PropTypes.string,
        subIndex: PropTypes.number
    }),
    onEffectSelect: PropTypes.func,
    onSecondarySelect: PropTypes.func,
    onKeyframeSelect: PropTypes.func,
    onEffectDelete: PropTypes.func,
    onToggleExpand: PropTypes.func,
    onToggleVisibility: PropTypes.func,
    onContextMenu: PropTypes.func,
    secondaryEffects: PropTypes.array,
    keyframeEffects: PropTypes.array,
    isReadOnly: PropTypes.bool
};