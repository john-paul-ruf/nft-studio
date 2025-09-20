import React from 'react';

function NumberInput({ field, value, onChange }) {
    const currentValue = value !== undefined ? value : field.default || 0;
    const step = field.step || 1;
    const isDecimal = step < 1;
    const maxValue = field.max || 100;

    // Use direct input for small ranges (single digit inputs)
    const useDirectInput = maxValue <= 10;

    const handleNumberChange = (e) => {
        const val = isDecimal ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0;
        onChange(field.name, val);
    };

    const handleSliderChange = (e) => {
        const val = isDecimal ? parseFloat(e.target.value) : parseInt(e.target.value);
        onChange(field.name, val);
    };

    if (useDirectInput) {
        // Direct keyboard input for small ranges
        return (
            <div className="number-input" style={{ marginBottom: '1rem' }}>
                <label style={{
                    color: '#ffffff',
                    marginBottom: '0.5rem',
                    display: 'block',
                    fontWeight: '500'
                }}>
                    {field.label}
                </label>
                <input
                    type="number"
                    min={field.min || 0}
                    max={maxValue}
                    step={step}
                    value={currentValue}
                    onChange={handleNumberChange}
                    style={{
                        width: '120px',
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        color: '#ffffff',
                        fontSize: '1rem',
                        fontWeight: '500'
                    }}
                />
                <div style={{
                    fontSize: '0.7rem',
                    color: '#888',
                    marginTop: '0.25rem'
                }}>
                    Range: {field.min || 0} - {maxValue}
                </div>
            </div>
        );
    }

    // Slider + number input for larger ranges
    return (
        <div className="number-input" style={{ marginBottom: '1rem' }}>
            <label style={{
                color: '#ffffff',
                marginBottom: '0.5rem',
                display: 'block',
                fontWeight: '500'
            }}>
                {field.label}
            </label>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'rgba(255,255,255,0.05)',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <input
                    type="range"
                    min={field.min || 0}
                    max={maxValue}
                    step={step}
                    value={currentValue}
                    onChange={handleSliderChange}
                    style={{
                        flex: 1,
                        height: '8px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                />
                <input
                    type="number"
                    min={field.min}
                    max={maxValue}
                    step={step}
                    value={currentValue}
                    onChange={handleNumberChange}
                    style={{
                        width: '80px',
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        color: '#ffffff',
                        fontSize: '0.9rem'
                    }}
                />
            </div>
            <div style={{
                fontSize: '0.7rem',
                color: '#888',
                marginTop: '0.25rem',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>Min: {field.min || 0}</span>
                <span>Max: {maxValue}</span>
            </div>
        </div>
    );
}

export default NumberInput;