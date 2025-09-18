import React, { useState } from 'react';
import './EffectsPanel.css';

export default function EffectsPanel({
    effects,
    onEffectDelete,
    onEffectReorder,
    onEffectRightClick,
    onEffectToggleVisibility
}) {
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [expandedEffects, setExpandedEffects] = useState(new Set());

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            onEffectReorder(draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
    };

    const toggleExpanded = (index) => {
        const newExpanded = new Set(expandedEffects);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedEffects(newExpanded);
    };

    const formatEffectName = (className) => {
        return className.replace(/([A-Z])/g, ' $1').trim();
    };

    const renderSecondaryEffects = (effect, parentOriginalIndex) => {
        if (!effect.secondaryEffects || effect.secondaryEffects.length === 0) return null;

        return (
            <div className="secondary-effects">
                {effect.secondaryEffects.map((secondary, idx) => (
                    <div
                        key={idx}
                        className="effect-item secondary"
                    >
                        <span className="effect-indent">↳</span>
                        <span className="effect-name">
                            {formatEffectName(secondary.className)}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const renderKeyframeEffects = (effect, parentOriginalIndex) => {
        if (!effect.keyframeEffects || effect.keyframeEffects.length === 0) return null;

        return (
            <div className="keyframe-effects">
                {effect.keyframeEffects.map((keyframe, idx) => (
                    <div
                        key={idx}
                        className="effect-item keyframe"
                    >
                        <span className="effect-indent">⟶</span>
                        <span className="effect-name">
                            Frame {keyframe.frame}: {formatEffectName(keyframe.className)}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const isFinalEffect = (className) => {
        return className && className.toLowerCase().includes('final');
    };

    const sortedEffectsWithIndices = effects
        .map((effect, originalIndex) => ({ effect, originalIndex }))
        .sort((a, b) => {
            const aIsFinal = isFinalEffect(a.effect.className);
            const bIsFinal = isFinalEffect(b.effect.className);
            if (aIsFinal && !bIsFinal) return 1;
            if (!aIsFinal && bIsFinal) return -1;
            return 0;
        });

    return (
        <div className="effects-panel">
            <div className="effects-panel-header">
                <h3>Layers</h3>
            </div>
            <div className="effects-list">
                {sortedEffectsWithIndices.length === 0 ? (
                    <div className="no-effects">
                        No effects added yet
                    </div>
                ) : (
                    sortedEffectsWithIndices.map(({ effect, originalIndex }, sortedIndex) => {
                        const isExpanded = expandedEffects.has(sortedIndex);
                        const hasChildren =
                            (effect.secondaryEffects?.length > 0) ||
                            (effect.keyframeEffects?.length > 0);

                        return (
                            <div
                                key={originalIndex}
                                className="effect-container"
                                draggable={!isFinalEffect(effect.className)}
                                onDragStart={(e) => handleDragStart(e, originalIndex)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, originalIndex)}
                                onContextMenu={(e) => onEffectRightClick(effect, originalIndex, e)}
                            >
                                <div className="effect-item primary">
                                    {hasChildren && (
                                        <button
                                            className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                                            onClick={() => toggleExpanded(sortedIndex)}
                                        >
                                            ▶
                                        </button>
                                    )}
                                    <button
                                        className={`visibility-button ${effect.visible !== false ? 'visible' : 'hidden'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEffectToggleVisibility && onEffectToggleVisibility(originalIndex);
                                        }}
                                        title={effect.visible !== false ? 'Hide layer' : 'Show layer'}
                                    >
                                        {effect.visible !== false ? '👁️' : '🚫'}
                                    </button>
                                    <span className="effect-name">
                                        {formatEffectName(effect.className)}
                                        {isFinalEffect(effect.className) && (
                                            <span className="effect-badge">Final</span>
                                        )}
                                    </span>
                                    <button
                                        className="delete-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEffectDelete(originalIndex);
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                                {isExpanded && (
                                    <>
                                        {renderSecondaryEffects(effect, originalIndex)}
                                        {renderKeyframeEffects(effect, originalIndex)}
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}