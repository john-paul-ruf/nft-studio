import React from 'react';

function PercentageRangeInput({ field, value, onChange }) {
    // Handle both legacy {min, max} and new {lower, upper} formats
    // Also handle the new enhanced format with side selection
    let currentValue = value || field.default || {
        lower: { percent: 0.1, side: 'shortest' },
        upper: { percent: 0.9, side: 'longest' }
    };


    // Convert legacy format if needed
    if (currentValue.min !== undefined || currentValue.max !== undefined) {
        currentValue = {
            lower: { percent: currentValue.min || currentValue.lower || 0.1, side: 'shortest' },
            upper: { percent: currentValue.max || currentValue.upper || 0.9, side: 'longest' }
        };
    }

    // Convert simple number format if needed (more robust check)
    if (typeof currentValue.lower === 'number' ||
        (currentValue.lower && typeof currentValue.lower.percent === 'undefined') ||
        currentValue.lower === '[Function]') {

        let lowerPercent, upperPercent;

        // Handle different input formats
        if (typeof currentValue.lower === 'number') {
            lowerPercent = currentValue.lower;
            upperPercent = currentValue.upper;
        } else if (currentValue.lower === '[Function]' || currentValue.upper === '[Function]') {
            // Use field-specific defaults for serialized functions
            const fieldDefaults = {
                'flareOffset': { lower: 0.01, upper: 0.06 },
                'flareRingsSizeRange': { lower: 0.05, upper: 1.0 },
                'flareRaysSizeRange': { lower: 0.7, upper: 1.0 }
            };
            const defaults = fieldDefaults[field.name] || { lower: 0.1, upper: 0.9 };
            lowerPercent = defaults.lower;
            upperPercent = defaults.upper;
        } else {
            // Fallback for other cases
            lowerPercent = 0.1;
            upperPercent = 0.9;
        }

        currentValue = {
            lower: { percent: lowerPercent, side: 'shortest' },
            upper: { percent: upperPercent, side: 'longest' }
        };
    }

    // Convert [Object] format (when serialization fails) to enhanced format
    if (currentValue.lower && typeof currentValue.lower === 'object' &&
        currentValue.lower.toString() === '[object Object]' &&
        !currentValue.lower.percent) {
        // This is likely a failed serialization, use field-specific defaults
        const fieldDefaults = {
            'flareOffset': {
                lower: { percent: 0.01, side: 'shortest' },
                upper: { percent: 0.06, side: 'shortest' }
            },
            'flareRingsSizeRange': {
                lower: { percent: 0.05, side: 'shortest' },
                upper: { percent: 1.0, side: 'longest' }
            },
            'flareRaysSizeRange': {
                lower: { percent: 0.7, side: 'longest' },
                upper: { percent: 1.0, side: 'longest' }
            }
        };

        currentValue = fieldDefaults[field.name] || {
            lower: { percent: 0.1, side: 'shortest' },
            upper: { percent: 0.9, side: 'longest' }
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
                            {Math.round((currentValue.lower?.percent || 0) * 100)}%
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select
                            value={currentValue.lower?.side || 'shortest'}
                            onChange={(e) => {
                                onChange(field.name, {
                                    ...currentValue,
                                    lower: { ...currentValue.lower, side: e.target.value }
                                });
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                padding: '0.25rem',
                                fontSize: '0.8rem',
                                minWidth: '100px'
                            }}
                        >
                            <option value="shortest" style={{ background: '#333', color: '#fff' }}>Shortest Side</option>
                            <option value="longest" style={{ background: '#333', color: '#fff' }}>Longest Side</option>
                        </select>
                        <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center' }}>
                            of canvas
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentValue.lower?.percent || 0}
                        onChange={(e) => {
                            const newValue = parseFloat(e.target.value);
                            onChange(field.name, {
                                ...currentValue,
                                lower: { ...currentValue.lower, percent: Math.min(newValue, currentValue.upper.percent - 0.01) }
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
                            {Math.round((currentValue.upper?.percent || 0) * 100)}%
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select
                            value={currentValue.upper?.side || 'longest'}
                            onChange={(e) => {
                                onChange(field.name, {
                                    ...currentValue,
                                    upper: { ...currentValue.upper, side: e.target.value }
                                });
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                padding: '0.25rem',
                                fontSize: '0.8rem',
                                minWidth: '100px'
                            }}
                        >
                            <option value="shortest" style={{ background: '#333', color: '#fff' }}>Shortest Side</option>
                            <option value="longest" style={{ background: '#333', color: '#fff' }}>Longest Side</option>
                        </select>
                        <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center' }}>
                            of canvas
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={currentValue.upper?.percent || 0}
                        onChange={(e) => {
                            const newValue = parseFloat(e.target.value);
                            onChange(field.name, {
                                ...currentValue,
                                upper: { ...currentValue.upper, percent: Math.max(newValue, currentValue.lower.percent + 0.01) }
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
                    Range: {Math.round((currentValue.lower?.percent || 0) * 100)}% ({currentValue.lower?.side || 'shortest'}) - {Math.round((currentValue.upper?.percent || 0) * 100)}% ({currentValue.upper?.side || 'longest'})
                </div>
            </div>
        </div>
    );
}

export default PercentageRangeInput;