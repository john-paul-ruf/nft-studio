import React from 'react';

function PercentageRangeInput({ field, value, onChange }) {
    // Handle both legacy {min, max} and new {lower, upper} formats
    let currentValue = value || field.default || { lower: 0.1, upper: 0.9 };

    // Convert legacy format if needed
    if (currentValue.min !== undefined || currentValue.max !== undefined) {
        currentValue = {
            lower: currentValue.min || currentValue.lower || 0.1,
            upper: currentValue.max || currentValue.upper || 0.9
        };
    }

    return (
        <div className="percentage-range-input">
            <label style={{ color: '#ffffff', marginBottom: '0.5rem', display: 'block' }}>
                {field.label}
            </label>
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.25rem'
                    }}>
                        <label style={{ fontSize: '0.8rem', color: '#ccc' }}>
                            Lower bound
                        </label>
                        <span style={{ fontSize: '0.8rem', color: '#67eea5', fontWeight: 'bold' }}>
                            {Math.round(currentValue.lower * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentValue.lower}
                        onChange={(e) => {
                            const newValue = parseFloat(e.target.value);
                            onChange(field.name, {
                                ...currentValue,
                                lower: Math.min(newValue, currentValue.upper - 0.01) // Ensure lower < upper
                            });
                        }}
                        style={{
                            width: '100%',
                            height: '6px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '3px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    />
                </div>
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.25rem'
                    }}>
                        <label style={{ fontSize: '0.8rem', color: '#ccc' }}>
                            Upper bound
                        </label>
                        <span style={{ fontSize: '0.8rem', color: '#67eea5', fontWeight: 'bold' }}>
                            {Math.round(currentValue.upper * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentValue.upper}
                        onChange={(e) => {
                            const newValue = parseFloat(e.target.value);
                            onChange(field.name, {
                                ...currentValue,
                                upper: Math.max(newValue, currentValue.lower + 0.01) // Ensure upper > lower
                            });
                        }}
                        style={{
                            width: '100%',
                            height: '6px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '3px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    />
                </div>
                <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.7rem',
                    color: '#888',
                    textAlign: 'center'
                }}>
                    Range: {Math.round(currentValue.lower * 100)}% - {Math.round(currentValue.upper * 100)}%
                </div>
            </div>
        </div>
    );
}

export default PercentageRangeInput;