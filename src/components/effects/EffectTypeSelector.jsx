import React from 'react';

function EffectTypeSelector({ effectType, onEffectTypeChange }) {
    const effectTypes = [
        {
            id: 'primary',
            title: '🎨 Primary Effects',
            description: 'Core visual effects that create the main imagery'
        },
        {
            id: 'final',
            title: '🎭 Final Effects',
            description: 'Post-processing effects applied to the entire image'
        }
    ];

    return (
        <div>
            <h3>Effect Type Selection</h3>
            <p>Choose the type of effect you want to add:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                {effectTypes.map(type => (
                    <div
                        key={type.id}
                        className={`welcome-card ${effectType === type.id ? 'selected' : ''}`}
                        onClick={() => onEffectTypeChange(type.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <h4>{type.title}</h4>
                        <p>{type.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default EffectTypeSelector;