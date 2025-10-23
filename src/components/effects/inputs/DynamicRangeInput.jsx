import React, { useState, useEffect, useRef, useCallback } from 'react';
import NumberFormatter from '../../../utils/NumberFormatter.js';
import './DynamicRangeInput.bem.css';

function DynamicRangeInput({ field, value, onChange }) {
    // Use a ref to always have the latest value
    const valueRef = useRef(value);
    
    // Helper to get current value with defaults
    const getCurrentValue = useCallback(() => {
        // Use value prop directly if available (this ensures preset changes are reflected)
        return (value !== undefined && value !== null) ? value :
               (valueRef.current !== undefined && valueRef.current !== null) ? valueRef.current :
               field.default || {
            bottom: { lower: 0, upper: 5 },
            top: { lower: 5, upper: 10 }
        };
    }, [value, field.default]);
    
    const currentValue = getCurrentValue();

    // State for display values
    const [displayBottomLower, setDisplayBottomLower] = useState(NumberFormatter.formatForDisplay(currentValue.bottom?.lower ?? 0));
    const [displayBottomUpper, setDisplayBottomUpper] = useState(NumberFormatter.formatForDisplay(currentValue.bottom?.upper ?? 0));
    const [displayTopLower, setDisplayTopLower] = useState(NumberFormatter.formatForDisplay(currentValue.top?.lower ?? 0));
    const [displayTopUpper, setDisplayTopUpper] = useState(NumberFormatter.formatForDisplay(currentValue.top?.upper ?? 0));
    
    // Track if inputs are focused to prevent overwriting during typing
    const isBottomLowerFocusedRef = useRef(false);
    const isBottomUpperFocusedRef = useRef(false);
    const isTopLowerFocusedRef = useRef(false);
    const isTopUpperFocusedRef = useRef(false);

    // Update ref when value prop changes
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    // Update display values when currentValue changes, but ONLY if not actively typing
    useEffect(() => {
        if (!isBottomLowerFocusedRef.current) {
            setDisplayBottomLower(NumberFormatter.formatForDisplay(currentValue.bottom?.lower ?? 0));
        }
        if (!isBottomUpperFocusedRef.current) {
            setDisplayBottomUpper(NumberFormatter.formatForDisplay(currentValue.bottom?.upper ?? 0));
        }
        if (!isTopLowerFocusedRef.current) {
            setDisplayTopLower(NumberFormatter.formatForDisplay(currentValue.top?.lower ?? 0));
        }
        if (!isTopUpperFocusedRef.current) {
            setDisplayTopUpper(NumberFormatter.formatForDisplay(currentValue.top?.upper ?? 0));
        }
    }, [currentValue.bottom?.lower, currentValue.bottom?.upper, currentValue.top?.lower, currentValue.top?.upper]);

    const handleBottomLowerFocus = () => {
        isBottomLowerFocusedRef.current = true;
    };

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
        isBottomLowerFocusedRef.current = false;
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

    const handleBottomUpperFocus = () => {
        isBottomUpperFocusedRef.current = true;
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
        isBottomUpperFocusedRef.current = false;
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

    const handleTopLowerFocus = () => {
        isTopLowerFocusedRef.current = true;
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
        isTopLowerFocusedRef.current = false;
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

    const handleTopUpperFocus = () => {
        isTopUpperFocusedRef.current = true;
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
        isTopUpperFocusedRef.current = false;
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
        <div className="dynamic-range-input">
            <label className="dynamic-range-input__label">
                {field.label}
            </label>
            <div className="dynamic-range-input__section">
                <div className="dynamic-range-input__section-wrapper">
                    <label className="dynamic-range-input__section-title dynamic-range-input__section-title--bottom">
                        Bottom Range
                    </label>
                    <div className="dynamic-range-input__inputs-grid">
                        <div>
                            <label className="dynamic-range-input__input-label">Lower</label>
                            <input
                                type="number"
                                step={NumberFormatter.getStepForValue(currentValue.bottom?.lower || 0)}
                                value={displayBottomLower}
                                onChange={handleBottomLowerChange}
                                onBlur={handleBottomLowerBlur}
                                onFocus={handleBottomLowerFocus}
                                className="dynamic-range-input__input"
                            />
                        </div>
                        <div>
                            <label className="dynamic-range-input__input-label">Upper</label>
                            <input
                                type="number"
                                step={NumberFormatter.getStepForValue(currentValue.bottom?.upper || 0)}
                                value={displayBottomUpper}
                                onFocus={handleBottomUpperFocus}
                                onChange={handleBottomUpperChange}
                                onBlur={handleBottomUpperBlur}
                                className="dynamic-range-input__input"
                            />
                        </div>
                    </div>
                </div>
                <div className="dynamic-range-input__section-wrapper">
                    <label className="dynamic-range-input__section-title dynamic-range-input__section-title--top">
                        Top Range
                    </label>
                    <div className="dynamic-range-input__inputs-grid">
                        <div>
                            <label className="dynamic-range-input__input-label">Lower</label>
                            <input
                                type="number"
                                step={NumberFormatter.getStepForValue(currentValue.top?.lower || 0)}
                                value={displayTopLower}
                                onFocus={handleTopLowerFocus}
                                onChange={handleTopLowerChange}
                                onBlur={handleTopLowerBlur}
                                className="dynamic-range-input__input"
                            />
                        </div>
                        <div>
                            <label className="dynamic-range-input__input-label">Upper</label>
                            <input
                                type="number"
                                step={NumberFormatter.getStepForValue(currentValue.top?.upper || 0)}
                                value={displayTopUpper}
                                onFocus={handleTopUpperFocus}
                                onChange={handleTopUpperChange}
                                onBlur={handleTopUpperBlur}
                                className="dynamic-range-input__input"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DynamicRangeInput;