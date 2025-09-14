import React from 'react';

function PercentageRangeInput({ field, value, onChange }) {
    const currentValue = value || field.default || { min: 0.1, max: 0.9 };

    return (
        <div className="percentage-range-input">
            <label>{field.label}</label>
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '0.75rem',
                borderRadius: '4px'
            }}>
                <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#ccc' }}>
                        Minimum: {Math.round(currentValue.min * 100)}%
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentValue.min}
                        onChange={(e) => onChange(field.name, {
                            ...currentValue,
                            min: parseFloat(e.target.value)
                        })}
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label style={{ fontSize: '0.8rem', color: '#ccc' }}>
                        Maximum: {Math.round(currentValue.max * 100)}%
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentValue.max}
                        onChange={(e) => onChange(field.name, {
                            ...currentValue,
                            max: parseFloat(e.target.value)
                        })}
                        style={{ width: '100%' }}
                    />
                </div>
            </div>
        </div>
    );
}

export default PercentageRangeInput;