import React from 'react';

function EffectSelector({ effectType, availableEffects, effects, onEffectSelect, onEffectRemove }) {
    const currentEffects = effects[effectType] || [];
    const effectOptions = availableEffects[effectType] || [];

    return (
        <div>
            <h3>Select {effectType} Effect</h3>
            <p>Choose an effect from the {effectType} category:</p>

            {effectOptions.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {effectOptions.map(effect => (
                        <div
                            key={effect.name || effect.displayName}
                            className="welcome-card"
                            onClick={() => onEffectSelect(effect)}
                            style={{ cursor: 'pointer' }}
                        >
                            <h4>{effect.name}</h4>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#cccccc',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    border: '1px dashed rgba(255,255,255,0.2)'
                }}>
                    <p>No {effectType} effects discovered.</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                        Check that the my-nft-gen repository has effects in the src/effects/{effectType}Effects directory.
                    </p>
                </div>
            )}

            {/* Show current effects */}
            {currentEffects.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <h4>Current {effectType} Effects:</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {currentEffects.map(effect => (
                            <div
                                key={effect.id}
                                style={{
                                    background: 'rgba(102, 126, 234, 0.2)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <span>{effect.effectClass.name}</span>
                                <button
                                    onClick={() => onEffectRemove(effectType, effect.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#e53e3e',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem'
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
}

export default EffectSelector;