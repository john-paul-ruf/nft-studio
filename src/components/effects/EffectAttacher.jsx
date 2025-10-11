import React, { useState } from 'react';

function EffectAttacher({
    primaryEffect,
    availableEffects,
    onAttachEffect,
    onSkip,
    onRemoveAttachedEffect
}) {
    const [attachmentType, setAttachmentType] = useState(null);

    const handleEffectSelect = (effect, type) => {
        onAttachEffect(effect, type);
    };

    const renderEffectList = (type, title, description) => {
        const effects = availableEffects[type] || [];
        const attachedEffects = type === 'secondary' 
            ? (primaryEffect.secondaryEffects || [])
            : (primaryEffect.keyframeEffects || []);

        return (
            <div style={{ marginBottom: '2rem' }}>
                <h4>{title}</h4>
                <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem' }}>{description}</p>

                {effects.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                    }}>
                        {effects.map(effect => (
                            <div
                                key={effect.name || effect.displayName}
                                className="welcome-card"
                                onClick={() => handleEffectSelect(effect, type)}
                                style={{
                                    cursor: 'pointer',
                                    padding: '0.75rem',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <h5 style={{ margin: '0', fontSize: '0.85rem' }}>
                                    {effect.displayName || effect.name}
                                </h5>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '1.5rem',
                        color: '#888',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        fontSize: '0.9rem'
                    }}>
                        No {type} effects available
                    </div>
                )}

                {/* Show attached effects */}
                {attachedEffects.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ color: '#667eea', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                            Attached {title}:
                        </h5>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {attachedEffects.map(effect => (
                                <div
                                    key={effect.id}
                                    style={{
                                        background: 'rgba(102, 126, 234, 0.2)',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    <span>{effect.effectClass.name}</span>
                                    <button
                                        onClick={() => onRemoveAttachedEffect(type, effect.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#e53e3e',
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            padding: '0',
                                            lineHeight: '1'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            <h3>Attach Effects to Primary Effect</h3>
            <div style={{
                background: 'rgba(102, 126, 234, 0.1)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                border: '1px solid rgba(102, 126, 234, 0.3)'
            }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#667eea' }}>
                    Primary Effect: {primaryEffect.effectClass.name}
                </h4>
                <p style={{ margin: '0', fontSize: '0.9rem', color: '#aaa' }}>
                    Add secondary and keyframe effects that will be applied to this primary effect.
                </p>
            </div>

            {renderEffectList(
                'secondary',
                '✨ Secondary Effects',
                'Effects that enhance the primary effect (glow, blur, fade, etc.)'
            )}

            {renderEffectList(
                'keyFrame',
                '🔑 Key Frame Effects',
                'Time-based animation effects applied to the primary effect'
            )}

            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                textAlign: 'center'
            }}>
                <p style={{ margin: '0 0 1rem 0', color: '#aaa', fontSize: '0.9rem' }}>
                    You can attach multiple secondary and keyframe effects to this primary effect.
                    When ready, continue to add more effects or finish configuration.
                </p>
                <button
                    className="btn btn-ready"
                    onClick={onSkip}
                    style={{ fontSize: '0.9rem' }}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

export default EffectAttacher;