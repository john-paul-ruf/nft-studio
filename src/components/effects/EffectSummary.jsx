import React from 'react';

function EffectSummary({ effects, onStartGeneration }) {
    const totalEffects = Object.values(effects).flat().length;

    const effectCategories = [
        { key: 'primary', name: 'Primary Effects', icon: '🎨', description: 'Core visual effects' },
        { key: 'secondary', name: 'Secondary Effects', icon: '✨', description: 'Enhancement effects' },
        { key: 'keyFrame', name: 'Key Frame Effects', icon: '🔑', description: 'Animation effects' },
        { key: 'final', name: 'Final Effects', icon: '🎭', description: 'Post-processing effects' }
    ];

    return (
        <div>
            <h3>Effect Summary</h3>
            <p>Review all the effects you've configured for your NFT project:</p>

            <div style={{ marginTop: '1.5rem' }}>
                {effectCategories.map(category => {
                    const categoryEffects = effects[category.key] || [];
                    if (categoryEffects.length === 0) return null;

                    return (
                        <div key={category.key} style={{
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            border: '1px solid #333'
                        }}>
                            <h4 style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                margin: '0 0 1rem 0',
                                color: '#fff'
                            }}>
                                <span>{category.icon}</span>
                                <span>{category.name} ({categoryEffects.length})</span>
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {categoryEffects.map((effect, index) => (
                                    <div key={effect.id || index} style={{
                                        padding: '0.75rem',
                                        background: 'rgba(255,255,255,0.08)',
                                        borderRadius: '6px',
                                        border: '1px solid #444'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <h5 style={{ margin: 0, color: '#fff' }}>
                                                {effect.effectClass?.name}
                                            </h5>
                                        </div>


                                        {/* Show key config parameters */}
                                        {effect.config && Object.keys(effect.config).length > 0 && (
                                            <div style={{
                                                fontSize: '0.8rem',
                                                color: '#aaa',
                                                maxHeight: '100px',
                                                overflow: 'auto'
                                            }}>
                                                <strong>Configuration:</strong>
                                                <div style={{
                                                    marginTop: '0.25rem',
                                                    fontFamily: 'monospace',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    padding: '0.5rem',
                                                    borderRadius: '4px'
                                                }}>
                                                    {Object.entries(effect.config).slice(0, 3).map(([key, value]) => (
                                                        <div key={key}>
                                                            {key}: {typeof value === 'object' ? JSON.stringify(value).slice(0, 30) + '...' : String(value)}
                                                        </div>
                                                    ))}
                                                    {Object.keys(effect.config).length > 3 && (
                                                        <div style={{ color: '#666' }}>
                                                            ...and {Object.keys(effect.config).length - 3} more properties
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Generation Status */}
            <div style={{ marginTop: '2rem' }}>
                {totalEffects === 0 ? (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'rgba(255,255,0,0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,0,0.3)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#ffeb3b' }}>No Effects Configured</h4>
                        <p style={{ margin: 0, color: '#fff' }}>
                            Your project will generate, but it may appear blank without any effects.
                            Consider adding at least one primary effect to create visual content.
                        </p>
                    </div>
                ) : (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'rgba(0,255,0,0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(0,255,0,0.3)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#4caf50' }}>Ready to Generate!</h4>
                        <p style={{ margin: '0 0 1rem 0', color: '#fff' }}>
                            Total effects configured: <strong>{totalEffects}</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc' }}>
                            Your NFT animation will be generated with all configured effects applied in the correct order.
                        </p>
                    </div>
                )}
            </div>

            {/* Generation Button */}
            {totalEffects > 0 && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={onStartGeneration}
                        className="btn"
                        style={{
                            background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                            padding: '1rem 3rem',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                        }}
                    >
                        🚀 Start NFT Generation
                    </button>
                </div>
            )}
        </div>
    );
}

export default EffectSummary;