import React, { useRef, useEffect, useCallback } from 'react';

function PercentageRangeInput({ field, value, onChange }) {
    // Use a ref to always have the latest value
    const valueRef = useRef(value);
    
    // Update ref when value prop changes
    useEffect(() => {
        valueRef.current = value;
    }, [value]);
    
    // Helper to normalize value format - handles legacy formats and ensures proper structure
    const normalizeValue = useCallback((rawValue) => {
        let normalized = rawValue;

        // Convert legacy format if needed
        if (normalized.min !== undefined || normalized.max !== undefined) {
            normalized = {
                lower: { percent: normalized.min || normalized.lower || 0.1, side: 'shortest' },
                upper: { percent: normalized.max || normalized.upper || 0.9, side: 'longest' }
            };
        }

        // Convert simple number format if needed (more robust check)
        if (typeof normalized.lower === 'number' ||
            (normalized.lower && typeof normalized.lower.percent === 'undefined') ||
            normalized.lower === '[Function]') {

            let lowerPercent, upperPercent;

            // Handle different input formats
            if (typeof normalized.lower === 'number') {
                lowerPercent = normalized.lower;
                upperPercent = normalized.upper;
            } else if (normalized.lower === '[Function]' || normalized.upper === '[Function]') {
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

            normalized = {
                lower: { percent: lowerPercent, side: 'shortest' },
                upper: { percent: upperPercent, side: 'longest' }
            };
        }

        // Convert [Object] format (when serialization fails) to enhanced format
        if (normalized.lower && typeof normalized.lower === 'object' &&
            normalized.lower.toString() === '[object Object]' &&
            !normalized.lower.percent) {
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

            normalized = fieldDefaults[field.name] || {
                lower: { percent: 0.1, side: 'shortest' },
                upper: { percent: 0.9, side: 'longest' }
            };
        }

        // Ensure the structure is valid
        if (!normalized.lower || !normalized.upper) {
            normalized = {
                lower: { percent: 0.1, side: 'shortest' },
                upper: { percent: 0.9, side: 'longest' }
            };
        }

        return normalized;
    }, [field.name]);

    // Helper to get current value with defaults and format conversion
    // IMPORTANT: Always use the value prop first, then fall back to ref, then defaults
    const getCurrentValue = useCallback(() => {
        // Use value prop directly if available (this ensures preset changes are reflected)
        // Check for undefined/null explicitly to avoid issues with falsy values
        let rawValue = (value !== undefined && value !== null) ? value : 
                       (valueRef.current !== undefined && valueRef.current !== null) ? valueRef.current :
                       field.default || {
            lower: { percent: 0.1, side: 'shortest' },
            upper: { percent: 0.9, side: 'longest' }
        };
        
        return normalizeValue(rawValue);
    }, [value, field.default, normalizeValue]);
    
    // Handle both legacy {min, max} and new {lower, upper} formats
    // Also handle the new enhanced format with side selection
    let currentValue = getCurrentValue();

    // Debug logging for preset application
    if (currentValue && (currentValue.lower || currentValue.upper)) {
        console.log(`[PercentageRangeInput] ${field.name} received value:`, {
            valueProp: value,
            currentValue,
            lowerType: typeof currentValue.lower,
            upperType: typeof currentValue.upper,
            lowerPercent: currentValue.lower?.percent,
            upperPercent: currentValue.upper?.percent,
            lowerSide: currentValue.lower?.side,
            upperSide: currentValue.upper?.side
        });
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
                                const latestValue = getCurrentValue();
                                onChange(field.name, {
                                    ...latestValue,
                                    lower: { ...latestValue.lower, side: e.target.value }
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
                            const latestValue = getCurrentValue();
                            onChange(field.name, {
                                ...latestValue,
                                lower: { ...latestValue.lower, percent: Math.min(newValue, latestValue.upper.percent - 0.01) }
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
                                const latestValue = getCurrentValue();
                                onChange(field.name, {
                                    ...latestValue,
                                    upper: { ...latestValue.upper, side: e.target.value }
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
                            const latestValue = getCurrentValue();
                            onChange(field.name, {
                                ...latestValue,
                                upper: { ...latestValue.upper, percent: Math.max(newValue, latestValue.lower.percent + 0.01) }
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