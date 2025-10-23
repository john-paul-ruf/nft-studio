import React, { useRef, useEffect, useCallback, useState } from 'react';
import './EffectInput.bem.css';
import './PercentageRangeInput.bem.css';

function PercentageRangeInput({ field, value, onChange }) {
    // Use a ref to always have the latest value
    const valueRef = useRef(value);
    const lowerDebounceTimerRef = useRef(null);
    const upperDebounceTimerRef = useRef(null);
    
    // Update ref when value prop changes
    useEffect(() => {
        valueRef.current = value;
    }, [value]);
    
    // Cleanup debounce timers on unmount
    useEffect(() => {
        return () => {
            if (lowerDebounceTimerRef.current) {
                clearTimeout(lowerDebounceTimerRef.current);
            }
            if (upperDebounceTimerRef.current) {
                clearTimeout(upperDebounceTimerRef.current);
            }
        };
    }, []);
    
    // Helper to format percentage with fractional precision
    const formatPercentage = useCallback((decimalValue) => {
        const percentage = decimalValue * 100;
        // Show up to 3 decimal places if there's a fractional part, otherwise show whole number
        if (percentage % 1 === 0) {
            return percentage.toFixed(0);
        } else if ((percentage * 10) % 1 === 0) {
            return percentage.toFixed(1);
        } else if ((percentage * 100) % 1 === 0) {
            return percentage.toFixed(2);
        } else {
            return percentage.toFixed(3);
        }
    }, []);
    
    // Helper to normalize value format - handles legacy formats and ensures proper structure
    const normalizeValue = useCallback((rawValue) => {
        let normalized = rawValue;

        // Convert legacy format if needed
        if (normalized.min !== undefined || normalized.max !== undefined) {
            normalized = {
                lower: { 
                    percent: normalized.min !== undefined ? normalized.min : (normalized.lower !== undefined ? normalized.lower : 0.1), 
                    side: 'shortest' 
                },
                upper: { 
                    percent: normalized.max !== undefined ? normalized.max : (normalized.upper !== undefined ? normalized.upper : 0.9), 
                    side: 'longest' 
                }
            };
        }

        // Convert simple number format if needed (more robust check)
        // Only convert if we don't already have a valid enhanced format with side property
        const hasValidLower = normalized.lower && typeof normalized.lower === 'object' && 
                             normalized.lower.percent !== undefined && normalized.lower.side !== undefined;
        const hasValidUpper = normalized.upper && typeof normalized.upper === 'object' && 
                             normalized.upper.percent !== undefined && normalized.upper.side !== undefined;
        
        if (!hasValidLower || !hasValidUpper) {
            if (typeof normalized.lower === 'number' ||
                (normalized.lower && typeof normalized.lower.percent === 'undefined') ||
                normalized.lower === '[Function]') {

                let lowerPercent, upperPercent, lowerSide, upperSide;

                // Handle different input formats
                if (typeof normalized.lower === 'number') {
                    lowerPercent = normalized.lower;
                    upperPercent = normalized.upper;
                    lowerSide = 'shortest';
                    upperSide = 'longest';
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
                    lowerSide = 'shortest';
                    upperSide = 'longest';
                } else {
                    // Fallback for other cases
                    lowerPercent = 0.1;
                    upperPercent = 0.9;
                    lowerSide = 'shortest';
                    upperSide = 'longest';
                }

                // Preserve existing side values if they exist
                if (hasValidLower) {
                    lowerPercent = normalized.lower.percent;
                    lowerSide = normalized.lower.side;
                }
                if (hasValidUpper) {
                    upperPercent = normalized.upper.percent;
                    upperSide = normalized.upper.side;
                }

                normalized = {
                    lower: { percent: lowerPercent, side: lowerSide },
                    upper: { percent: upperPercent, side: upperSide }
                };
            }
        }

        // Convert [Object] format (when serialization fails) to enhanced format
        if (normalized.lower && typeof normalized.lower === 'object' &&
            normalized.lower.toString() === '[object Object]' &&
            normalized.lower.percent === undefined) {
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
    
    // State for text input values - use lazy initialization to avoid resetting on re-renders
    const [lowerInputValue, setLowerInputValue] = useState(() => (currentValue.lower?.percent * 100 || 0).toString());
    const [upperInputValue, setUpperInputValue] = useState(() => (currentValue.upper?.percent * 100 || 0).toString());

    // Sync input values when the value prop changes (e.g., when a preset is applied)
    useEffect(() => {
        const normalized = getCurrentValue();
        const newLowerValue = (normalized.lower?.percent * 100 || 0).toString();
        const newUpperValue = (normalized.upper?.percent * 100 || 0).toString();
        
        // Only update if the values actually changed to avoid unnecessary re-renders
        if (newLowerValue !== lowerInputValue) {
            setLowerInputValue(newLowerValue);
        }
        if (newUpperValue !== upperInputValue) {
            setUpperInputValue(newUpperValue);
        }
    }, [value]); // Only depend on value prop, not the state variables

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
    
    // Handle manual input changes for lower bound with debouncing
    const handleLowerInputChange = (e) => {
        const rawValue = e.target.value;
        setLowerInputValue(rawValue);
        
        // Clear existing timer
        if (lowerDebounceTimerRef.current) {
            clearTimeout(lowerDebounceTimerRef.current);
        }
        
        if (rawValue === '' || rawValue === '-' || rawValue === '.') {
            return;
        }
        
        const numValue = parseFloat(rawValue);
        if (!isNaN(numValue)) {
            // Debounce the onChange call
            lowerDebounceTimerRef.current = setTimeout(() => {
                // No validation - accept whatever value the user wants
                // Get fresh value from ref to avoid stale closure
                const freshValue = normalizeValue(valueRef.current);
                onChange(field.name, {
                    ...freshValue,
                    lower: { ...freshValue.lower, percent: numValue / 100 }
                });
            }, 300);
        }
    };
    
    // Handle manual input changes for upper bound with debouncing
    const handleUpperInputChange = (e) => {
        const rawValue = e.target.value;
        setUpperInputValue(rawValue);
        
        // Clear existing timer
        if (upperDebounceTimerRef.current) {
            clearTimeout(upperDebounceTimerRef.current);
        }
        
        if (rawValue === '' || rawValue === '-' || rawValue === '.') {
            return;
        }
        
        const numValue = parseFloat(rawValue);
        if (!isNaN(numValue)) {
            // Debounce the onChange call
            upperDebounceTimerRef.current = setTimeout(() => {
                // No validation - accept whatever value the user wants
                // Get fresh value from ref to avoid stale closure
                const freshValue = normalizeValue(valueRef.current);
                onChange(field.name, {
                    ...freshValue,
                    upper: { ...freshValue.upper, percent: numValue / 100 }
                });
            }, 300);
        }
    };

    return (
        <div className="effect-input effect-input__percentage-range">
            <label className="percentage-range-input__label">
                {field.label}
            </label>
            <div className="percentage-range-input__controls">
                <div className="percentage-range-input__section-wrapper">
                    <div className="percentage-range-input__section-header">
                        <label className="percentage-range-input__section-label">
                            Lower bound
                        </label>
                        <div className="percentage-range-input__input-row">
                            <input
                                type="text"
                                value={lowerInputValue}
                                onChange={handleLowerInputChange}
                                onFocus={(e) => e.target.select()}
                                className="percentage-range-input__input"
                            />
                            <span className="percentage-range-input__percent-symbol">%</span>
                        </div>
                    </div>
                    <div className="percentage-range-input__side-row">
                        <select
                            value={currentValue.lower?.side || 'shortest'}
                            onChange={(e) => {
                                // Get fresh value from ref to avoid stale closure
                                const freshValue = normalizeValue(valueRef.current);
                                const newSide = e.target.value;
                                const newType = newSide === 'shortest' ? 'PercentageShortestSide' : 'PercentageLongestSide';
                                const newValue = {
                                    ...freshValue,
                                    lower: { 
                                        ...freshValue.lower, 
                                        side: newSide,
                                        __type: newType
                                    }
                                };
                                console.log(`[PercentageRangeInput] ${field.name} lower side changed to:`, newSide, 'Full value:', newValue);
                                onChange(field.name, newValue);
                            }}
                            className="percentage-range-input__side-select"
                        >
                            <option value="shortest">Shortest Side</option>
                            <option value="longest">Longest Side</option>
                        </select>
                        <span className="percentage-range-input__canvas-label">
                            of canvas
                        </span>
                    </div>
                </div>
                <div className="percentage-range-input__section-wrapper">
                    <div className="percentage-range-input__section-header">
                        <label className="percentage-range-input__section-label">
                            Upper bound
                        </label>
                        <div className="percentage-range-input__input-row">
                            <input
                                type="text"
                                value={upperInputValue}
                                onChange={handleUpperInputChange}
                                onFocus={(e) => e.target.select()}
                                className="percentage-range-input__input"
                            />
                            <span className="percentage-range-input__percent-symbol">%</span>
                        </div>
                    </div>
                    <div className="percentage-range-input__side-row">
                        <select
                            value={currentValue.upper?.side || 'longest'}
                            onChange={(e) => {
                                // Get fresh value from ref to avoid stale closure
                                const freshValue = normalizeValue(valueRef.current);
                                const newSide = e.target.value;
                                const newType = newSide === 'shortest' ? 'PercentageShortestSide' : 'PercentageLongestSide';
                                const newValue = {
                                    ...freshValue,
                                    upper: { 
                                        ...freshValue.upper, 
                                        side: newSide,
                                        __type: newType
                                    }
                                };
                                console.log(`[PercentageRangeInput] ${field.name} upper side changed to:`, newSide, 'Full value:', newValue);
                                onChange(field.name, newValue);
                            }}
                            className="percentage-range-input__side-select"
                        >
                            <option value="shortest">Shortest Side</option>
                            <option value="longest">Longest Side</option>
                        </select>
                        <span className="percentage-range-input__canvas-label">
                            of canvas
                        </span>
                    </div>
                </div>
                <div className="percentage-range-input__range-display">
                    Range: {formatPercentage(currentValue.lower?.percent || 0)}% ({currentValue.lower?.side || 'shortest'}) - {formatPercentage(currentValue.upper?.percent || 0)}% ({currentValue.upper?.side || 'longest'})
                </div>
            </div>
        </div>
    );
}

export default PercentageRangeInput;