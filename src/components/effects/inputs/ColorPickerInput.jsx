import React, { useRef, useEffect, useCallback, useState } from 'react';
import useDebounce from '../../../hooks/useDebounce.js';

function ColorPickerInput({ field, value, onChange }) {
    // Use a ref to always have the latest value
    const valueRef = useRef(value);
    
    // Helper to get current value with defaults
    const getCurrentValue = useCallback(() => {
        return valueRef.current || {
            selectionType: field.bucketType || 'color-bucket',
            colorValue: '#ff0000'
        };
    }, [field.bucketType]);
    
    const currentValue = getCurrentValue();
    
    // State for text input to allow typing invalid values temporarily
    const [textInputValue, setTextInputValue] = useState(currentValue.colorValue || '#ff0000');
    
    // Debounced onChange for text input
    const debouncedOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 300);

    // Update ref when value prop changes
    useEffect(() => {
        valueRef.current = value;
    }, [value]);
    
    // Update text input when colorValue changes externally
    useEffect(() => {
        setTextInputValue(currentValue.colorValue || '#ff0000');
    }, [currentValue.colorValue]);

    const colorSelectionTypes = [
        { value: 'color-bucket', label: '🎨 Color Bucket (Random from theme colors)' },
        { value: 'neutral-bucket', label: '⚪ Neutral Bucket (Whites, grays, blacks)' },
        { value: 'color', label: '🎯 Specific Color' }
    ];
    
    // Validate hex color format
    const isValidHexColor = (color) => {
        return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
    };
    
    // Handle selection type change
    const handleSelectionTypeChange = (e) => {
        const latestValue = getCurrentValue();
        const newSelectionType = e.target.value;
        
        // When switching to 'color' mode, ensure colorValue is set
        const updatedValue = {
            ...latestValue,
            selectionType: newSelectionType
        };
        
        // If switching to 'color' and colorValue is null/undefined, set default
        if (newSelectionType === 'color' && !updatedValue.colorValue) {
            updatedValue.colorValue = '#ff0000';
        }
        
        onChange(field.name, updatedValue);
    };
    
    // Handle color picker change (always valid)
    const handleColorPickerChange = (e) => {
        const latestValue = getCurrentValue();
        const newColor = e.target.value;
        setTextInputValue(newColor);
        onChange(field.name, {
            ...latestValue,
            colorValue: newColor
        });
    };
    
    // Handle text input change (allow typing, validate on blur)
    const handleTextInputChange = (e) => {
        const inputValue = e.target.value;
        setTextInputValue(inputValue);
        
        // Only update if valid hex color (with debounce)
        if (isValidHexColor(inputValue)) {
            const latestValue = getCurrentValue();
            debouncedOnChange(field.name, {
                ...latestValue,
                colorValue: inputValue
            });
        }
    };
    
    // Handle text input blur (validate and correct if needed)
    const handleTextInputBlur = () => {
        const latestValue = getCurrentValue();
        
        if (!isValidHexColor(textInputValue)) {
            // Revert to current valid value or default
            const validColor = latestValue.colorValue || '#ff0000';
            setTextInputValue(validColor);
        }
    };

    return (
        <div className="color-picker-input">
            <label>{field.label}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                    value={currentValue.selectionType || 'color-bucket'}
                    onChange={handleSelectionTypeChange}
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
                            onChange={handleColorPickerChange}
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
                            value={textInputValue}
                            onChange={handleTextInputChange}
                            onBlur={handleTextInputBlur}
                            placeholder="#ff0000"
                            style={{ 
                                flex: 1,
                                background: 'rgba(255,255,255,0.1)',
                                border: `1px solid ${isValidHexColor(textInputValue) ? '#333' : '#ff4444'}`,
                                borderRadius: '4px',
                                padding: '0.5rem',
                                color: 'white'
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default ColorPickerInput;