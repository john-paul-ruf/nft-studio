import React from 'react';

function ColorPickerInput({ field, value, onChange }) {
    const currentValue = value || {
        selectionType: field.bucketType || 'colorBucket',
        colorValue: '#ff0000'
    };

    const colorSelectionTypes = [
        { value: 'colorBucket', label: '🎨 Color Bucket (Random from theme colors)' },
        { value: 'neutralBucket', label: '⚪ Neutral Bucket (Whites, grays, blacks)' },
        { value: 'color', label: '🎯 Specific Color' }
    ];

    return (
        <div className="color-picker-input">
            <label>{field.label}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                    value={currentValue.selectionType || 'colorBucket'}
                    onChange={(e) => onChange(field.name, {
                        ...currentValue,
                        selectionType: e.target.value
                    })}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        color: 'white'
                    }}
                >
                    {colorSelectionTypes.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>
                {currentValue.selectionType === 'color' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={currentValue.colorValue || '#ff0000'}
                            onChange={(e) => onChange(field.name, {
                                ...currentValue,
                                colorValue: e.target.value
                            })}
                            style={{
                                width: '60px',
                                height: '40px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        />
                        <input
                            type="text"
                            value={currentValue.colorValue || '#ff0000'}
                            onChange={(e) => onChange(field.name, {
                                ...currentValue,
                                colorValue: e.target.value
                            })}
                            placeholder="#ff0000"
                            style={{ flex: 1 }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default ColorPickerInput;