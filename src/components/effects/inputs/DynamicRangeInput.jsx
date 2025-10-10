import React, { useState, useEffect, useRef, useCallback } from 'react';
import NumberFormatter from '../../../utils/NumberFormatter.js';

function DynamicRangeInput({ field, value, onChange }) {
    // Use a ref to always have the latest value
    const valueRef = useRef(value);
    
    // Helper to get current value with defaults
    const getCurrentValue = useCallback(() => {
        return valueRef.current || field.default || {
            bottom: { lower: 0, upper: 5 },
            top: { lower: 5, upper: 10 }
        };
    }, [field.default]);
    
    const currentValue = getCurrentValue();

    // State for display values
    const [displayBottomLower, setDisplayBottomLower] = useState(NumberFormatter.formatForDisplay(currentValue.bottom?.lower ?? 0));
    const [displayBottomUpper, setDisplayBottomUpper] = useState(NumberFormatter.formatForDisplay(currentValue.bottom?.upper ?? 0));
    const [displayTopLower, setDisplayTopLower] = useState(NumberFormatter.formatForDisplay(currentValue.top?.lower ?? 0));
    const [displayTopUpper, setDisplayTopUpper] = useState(NumberFormatter.formatForDisplay(currentValue.top?.upper ?? 0));

    // Update ref when value prop changes
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    // Update display values when currentValue changes
    useEffect(() => {
        setDisplayBottomLower(NumberFormatter.formatForDisplay(currentValue.bottom?.lower ?? 0));
        setDisplayBottomUpper(NumberFormatter.formatForDisplay(currentValue.bottom?.upper ?? 0));
        setDisplayTopLower(NumberFormatter.formatForDisplay(currentValue.top?.lower ?? 0));
        setDisplayTopUpper(NumberFormatter.formatForDisplay(currentValue.top?.upper ?? 0));
    }, [currentValue.bottom?.lower, currentValue.bottom?.upper, currentValue.top?.lower, currentValue.top?.upper]);

    const handleBottomLowerChange = (e) => {
        const inputValue = e.target.value;
        setDisplayBottomLower(inputValue);
        
        // Don't update the value while typing if it's empty - wait for blur
        if (inputValue !== '') {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const latestValue = getCurrentValue();
            onChange(field.name, {
                ...latestValue,
                bottom: {
                    ...latestValue.bottom,
                    lower: parsedValue
                }
            });
        }
    };

    const handleBottomLowerBlur = (e) => {
        const inputValue = e.target.value;
        const latestValue = getCurrentValue();
        
        // If empty on blur, use 0 as default
        if (inputValue === '') {
            const defaultValue = 0;
            const formattedValue = NumberFormatter.formatForDisplay(defaultValue);
            setDisplayBottomLower(formattedValue);
            onChange(field.name, {
                ...latestValue,
                bottom: {
                    ...latestValue.bottom,
                    lower: defaultValue
                }
            });
        } else {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const formattedValue = NumberFormatter.formatForDisplay(parsedValue);
            setDisplayBottomLower(formattedValue);
            onChange(field.name, {
                ...latestValue,
                bottom: {
                    ...latestValue.bottom,
                    lower: parsedValue
                }
            });
        }
    };

    const handleBottomUpperChange = (e) => {
        const inputValue = e.target.value;
        setDisplayBottomUpper(inputValue);
        
        // Don't update the value while typing if it's empty - wait for blur
        if (inputValue !== '') {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const latestValue = getCurrentValue();
            onChange(field.name, {
                ...latestValue,
                bottom: {
                    ...latestValue.bottom,
                    upper: parsedValue
                }
            });
        }
    };

    const handleBottomUpperBlur = (e) => {
        const inputValue = e.target.value;
        const latestValue = getCurrentValue();
        
        // If empty on blur, use 0 as default
        if (inputValue === '') {
            const defaultValue = 0;
            const formattedValue = NumberFormatter.formatForDisplay(defaultValue);
            setDisplayBottomUpper(formattedValue);
            onChange(field.name, {
                ...latestValue,
                bottom: {
                    ...latestValue.bottom,
                    upper: defaultValue
                }
            });
        } else {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const formattedValue = NumberFormatter.formatForDisplay(parsedValue);
            setDisplayBottomUpper(formattedValue);
            onChange(field.name, {
                ...latestValue,
                bottom: {
                    ...latestValue.bottom,
                    upper: parsedValue
                }
            });
        }
    };

    const handleTopLowerChange = (e) => {
        const inputValue = e.target.value;
        setDisplayTopLower(inputValue);
        
        // Don't update the value while typing if it's empty - wait for blur
        if (inputValue !== '') {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const latestValue = getCurrentValue();
            onChange(field.name, {
                ...latestValue,
                top: {
                    ...latestValue.top,
                    lower: parsedValue
                }
            });
        }
    };

    const handleTopLowerBlur = (e) => {
        const inputValue = e.target.value;
        const latestValue = getCurrentValue();
        
        // If empty on blur, use 0 as default
        if (inputValue === '') {
            const defaultValue = 0;
            const formattedValue = NumberFormatter.formatForDisplay(defaultValue);
            setDisplayTopLower(formattedValue);
            onChange(field.name, {
                ...latestValue,
                top: {
                    ...latestValue.top,
                    lower: defaultValue
                }
            });
        } else {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const formattedValue = NumberFormatter.formatForDisplay(parsedValue);
            setDisplayTopLower(formattedValue);
            onChange(field.name, {
                ...latestValue,
                top: {
                    ...latestValue.top,
                    lower: parsedValue
                }
            });
        }
    };

    const handleTopUpperChange = (e) => {
        const inputValue = e.target.value;
        setDisplayTopUpper(inputValue);
        
        // Don't update the value while typing if it's empty - wait for blur
        if (inputValue !== '') {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const latestValue = getCurrentValue();
            onChange(field.name, {
                ...latestValue,
                top: {
                    ...latestValue.top,
                    upper: parsedValue
                }
            });
        }
    };

    const handleTopUpperBlur = (e) => {
        const inputValue = e.target.value;
        const latestValue = getCurrentValue();
        
        // If empty on blur, use 0 as default
        if (inputValue === '') {
            const defaultValue = 0;
            const formattedValue = NumberFormatter.formatForDisplay(defaultValue);
            setDisplayTopUpper(formattedValue);
            onChange(field.name, {
                ...latestValue,
                top: {
                    ...latestValue.top,
                    upper: defaultValue
                }
            });
        } else {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const formattedValue = NumberFormatter.formatForDisplay(parsedValue);
            setDisplayTopUpper(formattedValue);
            onChange(field.name, {
                ...latestValue,
                top: {
                    ...latestValue.top,
                    upper: parsedValue
                }
            });
        }
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
                                step={NumberFormatter.getStepForValue(currentValue.bottom?.lower || 0)}
                                value={displayBottomLower}
                                onChange={handleBottomLowerChange}
                                onBlur={handleBottomLowerBlur}
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
                                step={NumberFormatter.getStepForValue(currentValue.bottom?.upper || 0)}
                                value={displayBottomUpper}
                                onChange={handleBottomUpperChange}
                                onBlur={handleBottomUpperBlur}
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
                                step={NumberFormatter.getStepForValue(currentValue.top?.lower || 0)}
                                value={displayTopLower}
                                onChange={handleTopLowerChange}
                                onBlur={handleTopLowerBlur}
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
                                step={NumberFormatter.getStepForValue(currentValue.top?.upper || 0)}
                                value={displayTopUpper}
                                onChange={handleTopUpperChange}
                                onBlur={handleTopUpperBlur}
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