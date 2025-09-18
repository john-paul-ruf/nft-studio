import React, { useState, useEffect } from 'react';
import './EffectContextMenu.css';

export default function EffectContextMenu({
    position,
    onAddSecondary,
    onAddKeyframe,
    onEdit,
    onClose
}) {
    const [secondaryEffects, setSecondaryEffects] = useState([]);
    const [keyframeEffects, setKeyframeEffects] = useState([]);
    const [showSecondarySubmenu, setShowSecondarySubmenu] = useState(false);
    const [showKeyframeSubmenu, setShowKeyframeSubmenu] = useState(false);

    useEffect(() => {
        loadEffects();
    }, []);

    const loadEffects = async () => {
        try {
            const response = await window.api.discoverEffects();
            if (response.success && response.effects) {
                setSecondaryEffects(response.effects.secondary || []);
                setKeyframeEffects(response.effects.keyFrame || []);
            }
        } catch (error) {
            console.error('Failed to load effects:', error);
        }
    };

    return (
        <div
            className="effect-context-menu"
            style={{ left: position.x, top: position.y }}
            onMouseLeave={onClose}
        >
            <div className="context-menu-section">
                <div className="context-menu-item" onClick={onEdit}>
                    Edit Effect
                </div>
            </div>

            <div className="context-menu-divider"></div>

            <div className="context-menu-section">
                <div
                    className="context-menu-item submenu-trigger"
                    onMouseEnter={() => setShowSecondarySubmenu(true)}
                    onMouseLeave={() => setShowSecondarySubmenu(false)}
                >
                    Add Secondary Effect →
                    {showSecondarySubmenu && (
                        <div className="context-submenu">
                            {secondaryEffects.length === 0 ? (
                                <div className="context-menu-item disabled">No secondary effects available</div>
                            ) : (
                                secondaryEffects.map((effect, index) => (
                                    <div
                                        key={index}
                                        className="context-menu-item"
                                        onClick={() => onAddSecondary(effect)}
                                    >
                                        {effect.displayName || effect.name}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="context-menu-divider"></div>

            <div className="context-menu-section">
                <div
                    className="context-menu-item submenu-trigger"
                    onMouseEnter={() => setShowKeyframeSubmenu(true)}
                    onMouseLeave={() => setShowKeyframeSubmenu(false)}
                >
                    Add Keyframe Effect →
                    {showKeyframeSubmenu && (
                        <div className="context-submenu">
                            {keyframeEffects.length === 0 ? (
                                <div className="context-menu-item disabled">No keyframe effects available</div>
                            ) : (
                                keyframeEffects.map((effect, index) => (
                                    <div
                                        key={index}
                                        className="context-menu-item"
                                        onClick={() => onAddKeyframe(effect)}
                                    >
                                        {effect.displayName || effect.name} at frame
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}