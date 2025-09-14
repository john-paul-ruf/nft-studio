import React from 'react';

function RangeInput({ field, value, onChange }) {
    const currentValue = value || field.default || { lower: 0, upper: 0 };

    return (
        <div className="range-input" style={{ marginBottom: '1rem' }}>
            <label style={{
                color: '#ffffff',
                marginBottom: '0.5rem',
                display: 'block',
                fontWeight: '500'
            }}>
                {field.label}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', color: '#cccccc', display: 'block', marginBottom: '0.25rem' }}>Lower</label>
                    <input
                        type="number"
                        step={field.step || 0.01}
                        value={currentValue.lower || 0}
                        onChange={(e) => onChange(field.name, {
                            ...currentValue,
                            lower: parseFloat(e.target.value) || 0
                        })}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            color: '#ffffff'
                        }}
                        min={field.min}
                        max={field.max}
                    />
                </div>
                <span style={{ color: '#cccccc', margin: '0 0.5rem', marginTop: '1rem' }}>—</span>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', color: '#cccccc', display: 'block', marginBottom: '0.25rem' }}>Upper</label>
                    <input
                        type="number"
                        step={field.step || 0.01}
                        value={currentValue.upper || 0}
                        onChange={(e) => onChange(field.name, {
                            ...currentValue,
                            upper: parseFloat(e.target.value) || 0
                        })}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            color: '#ffffff'
                        }}
                        min={field.min}
                        max={field.max}
                    />
                </div>
            </div>
        </div>
    );
}

export default RangeInput;