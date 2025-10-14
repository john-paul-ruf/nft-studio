import React, { useState, useEffect, useCallback, useRef } from 'react';
import NumberFormatter from '../../../utils/NumberFormatter.js';
import useDebounce from '../../../hooks/useDebounce.js';

function RangeInput({ field, value, onChange }) {
    const currentValue = value || field.default || { lower: 0, upper: 0 };
    
    // State for display values
    const [displayLower, setDisplayLower] = useState(NumberFormatter.formatForDisplay(currentValue.lower || 0));
    const [displayUpper, setDisplayUpper] = useState(NumberFormatter.formatForDisplay(currentValue.upper || 0));
    
    // Track if inputs are focused to prevent overwriting during typing
    const isLowerFocusedRef = useRef(false);
    const isUpperFocusedRef = useRef(false);

    // Update display values when currentValue changes, but ONLY if not actively typing
    useEffect(() => {
        if (!isLowerFocusedRef.current) {
            setDisplayLower(NumberFormatter.formatForDisplay(currentValue.lower || 0));
        }
        if (!isUpperFocusedRef.current) {
            setDisplayUpper(NumberFormatter.formatForDisplay(currentValue.upper || 0));
        }
    }, [currentValue.lower, currentValue.upper]);

    // Debounce onChange (150ms for numbers)
    const debouncedOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 150);

    const handleLowerFocus = () => {
        isLowerFocusedRef.current = true;
    };

    const handleLowerChange = (e) => {
        const inputValue = e.target.value;
        
        // Allow user to type freely, including empty string and partial numbers
        setDisplayLower(inputValue);
        
        // Only parse and update if we have a valid number
        if (inputValue !== '' && inputValue !== '-' && inputValue !== '.') {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            if (!isNaN(parsedValue)) {
                debouncedOnChange(field.name, {
                    ...currentValue,
                    lower: parsedValue
                });
            }
        }
    };

    const handleLowerBlur = (e) => {
        isLowerFocusedRef.current = false;
        const inputValue = e.target.value;
        
        // If empty or invalid on blur, restore the current value (don't force a default)
        if (inputValue === '' || inputValue === '-' || inputValue === '.' || isNaN(NumberFormatter.parseFromString(inputValue))) {
            // Restore the current valid value
            const formattedValue = NumberFormatter.formatForDisplay(currentValue.lower || 0);
            setDisplayLower(formattedValue);
        } else {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const formattedValue = NumberFormatter.formatForDisplay(parsedValue);
            setDisplayLower(formattedValue);
            onChange(field.name, {
                ...currentValue,
                lower: parsedValue
            });
        }
    };

    const handleUpperFocus = () => {
        isUpperFocusedRef.current = true;
    };

    const handleUpperChange = (e) => {
        const inputValue = e.target.value;
        
        // Allow user to type freely, including empty string and partial numbers
        setDisplayUpper(inputValue);
        
        // Only parse and update if we have a valid number
        if (inputValue !== '' && inputValue !== '-' && inputValue !== '.') {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            if (!isNaN(parsedValue)) {
                debouncedOnChange(field.name, {
                    ...currentValue,
                    upper: parsedValue
                });
            }
        }
    };

    const handleUpperBlur = (e) => {
        isUpperFocusedRef.current = false;
        const inputValue = e.target.value;
        
        // If empty or invalid on blur, restore the current value (don't force a default)
        if (inputValue === '' || inputValue === '-' || inputValue === '.' || isNaN(NumberFormatter.parseFromString(inputValue))) {
            // Restore the current valid value
            const formattedValue = NumberFormatter.formatForDisplay(currentValue.upper || 0);
            setDisplayUpper(formattedValue);
        } else {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const formattedValue = NumberFormatter.formatForDisplay(parsedValue);
            setDisplayUpper(formattedValue);
            onChange(field.name, {
                ...currentValue,
                upper: parsedValue
            });
        }
    };

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
                        step={NumberFormatter.getStepForValue(currentValue.lower || 0)}
                        value={displayLower}
                        onFocus={handleLowerFocus}
                        onChange={handleLowerChange}
                        onBlur={handleLowerBlur}
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
                <span style={{ color: '#cccccc', margin: '0 0.5rem', marginTop: '1rem' }}>—</span>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', color: '#cccccc', display: 'block', marginBottom: '0.25rem' }}>Upper</label>
                    <input
                        type="number"
                        step={NumberFormatter.getStepForValue(currentValue.upper || 0)}
                        value={displayUpper}
                        onFocus={handleUpperFocus}
                        onChange={handleUpperChange}
                        onBlur={handleUpperBlur}
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
    );
}

export default RangeInput;