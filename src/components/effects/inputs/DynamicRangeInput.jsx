import React from 'react';

function DynamicRangeInput({ field, value, onChange }) {
    const currentValue = value || field.default || {
        bottom: { lower: 0, upper: 5 },
        top: { lower: 5, upper: 10 }
    };

    return (
        <div className="dynamic-range-input" style={{ marginBottom: '1rem' }}>
            <label style={{
                color: '#ffffff',
                marginBottom: '0.5rem',
                display: 'block',
                fontWeight: '500'
            }}>
                {field.label}
            </label>
            <div style={{
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '1rem',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)'
            }}>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#9ae6b4' }}>
                        Bottom Range
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: '#ccc' }}>Lower</label>
                            <input
                                type="number"
                                step="0.1"
                                value={currentValue.bottom?.lower || 0}
                                onChange={(e) => onChange(field.name, {
                                    ...currentValue,
                                    bottom: {
                                        ...currentValue.bottom,
                                        lower: parseFloat(e.target.value) || 0
                                    }
                                })}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    color: '#ffffff'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: '#ccc' }}>Upper</label>
                            <input
                                type="number"
                                step="0.1"
                                value={currentValue.bottom?.upper || 0}
                                onChange={(e) => onChange(field.name, {
                                    ...currentValue,
                                    bottom: {
                                        ...currentValue.bottom,
                                        upper: parseFloat(e.target.value) || 0
                                    }
                                })}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    color: '#ffffff'
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fbb6ce' }}>
                        Top Range
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: '#ccc' }}>Lower</label>
                            <input
                                type="number"
                                step="0.1"
                                value={currentValue.top?.lower || 0}
                                onChange={(e) => onChange(field.name, {
                                    ...currentValue,
                                    top: {
                                        ...currentValue.top,
                                        lower: parseFloat(e.target.value) || 0
                                    }
                                })}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    color: '#ffffff'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: '#ccc' }}>Upper</label>
                            <input
                                type="number"
                                step="0.1"
                                value={currentValue.top?.upper || 0}
                                onChange={(e) => onChange(field.name, {
                                    ...currentValue,
                                    top: {
                                        ...currentValue.top,
                                        upper: parseFloat(e.target.value) || 0
                                    }
                                })}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    color: '#ffffff'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DynamicRangeInput;