import React from 'react';

function PercentageInput({ field, value, onChange }) {
    const currentValue = value !== undefined ? value : field.default || 0.5;

    return (
        <div className="percentage-input">
            <label>{field.label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={currentValue}
                    onChange={(e) => onChange(field.name, parseFloat(e.target.value))}
                    style={{
                        flex: 1,
                        background: 'linear-gradient(to right, #667eea 0%, #764ba2 100%)',
                        height: '6px',
                        borderRadius: '3px'
                    }}
                />
                <div style={{
                    minWidth: '80px',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                }}>
                    {Math.round(currentValue * 100)}%
                </div>
            </div>
        </div>
    );
}

export default PercentageInput;