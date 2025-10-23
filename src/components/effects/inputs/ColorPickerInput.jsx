import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box, TextField, Typography, Select, MenuItem } from '@mui/material';
import useDebounce from '../../../hooks/useDebounce.js';
import './EffectInput.bem.css';
import './color-picker-input.bem.css';

// Default color for color picker when no value is provided
const DEFAULT_COLOR_PICKER_COLOR = '#ff0000';

function ColorPickerInput({ field, value, onChange }) {
    // Use a ref to always have the latest value
    const valueRef = useRef(value);

    // Helper to get current value with defaults
    const getCurrentValue = useCallback(() => {
        // Use value prop directly if available (this ensures preset changes are reflected)
        return (value !== undefined && value !== null) ? value :
               (valueRef.current !== undefined && valueRef.current !== null) ? valueRef.current : {
            selectionType: field.bucketType || 'color-bucket',
            colorValue: DEFAULT_COLOR_PICKER_COLOR
        };
    }, [value, field.bucketType]);
    
    const currentValue = getCurrentValue();
    
    // State for text input to allow typing invalid values temporarily
    const [textInputValue, setTextInputValue] = useState(currentValue.colorValue || DEFAULT_COLOR_PICKER_COLOR);
    
    // Track if text input is focused to prevent overwriting during typing
    const isTextInputFocusedRef = useRef(false);
    
    // Debounced onChange for text input
    const debouncedOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 300);

    // Update ref when value prop changes
    useEffect(() => {
        valueRef.current = value;
    }, [value]);
    
    // Update text input when colorValue changes externally, but ONLY if not actively typing
    useEffect(() => {
        if (!isTextInputFocusedRef.current) {
            setTextInputValue(currentValue.colorValue || DEFAULT_COLOR_PICKER_COLOR);
        }
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
            __type: 'ColorPicker',
            ...latestValue,
            selectionType: newSelectionType
        };
        
        // If switching to 'color' and colorValue is null/undefined, set default
        if (newSelectionType === 'color' && !updatedValue.colorValue) {
            updatedValue.colorValue = DEFAULT_COLOR_PICKER_COLOR;
        }
        
        onChange(field.name, updatedValue);
    };
    
    // Handle color picker change (always valid)
    const handleColorPickerChange = (e) => {
        const latestValue = getCurrentValue();
        const newColor = e.target.value;
        setTextInputValue(newColor);
        onChange(field.name, {
            __type: 'ColorPicker',
            ...latestValue,
            colorValue: newColor
        });
    };
    
    // Handle text input focus
    const handleTextInputFocus = () => {
        isTextInputFocusedRef.current = true;
    };
    
    // Handle text input change (allow typing, validate on blur)
    const handleTextInputChange = (e) => {
        const inputValue = e.target.value;
        setTextInputValue(inputValue);
        
        // Only update if valid hex color (with debounce)
        if (isValidHexColor(inputValue)) {
            const latestValue = getCurrentValue();
            debouncedOnChange(field.name, {
                __type: 'ColorPicker',
                ...latestValue,
                colorValue: inputValue
            });
        }
    };
    
    // Handle text input blur (validate and correct if needed)
    const handleTextInputBlur = () => {
        isTextInputFocusedRef.current = false;
        const latestValue = getCurrentValue();
        
        if (!isValidHexColor(textInputValue)) {
            // Revert to current valid value or default
            const validColor = latestValue.colorValue || DEFAULT_COLOR_PICKER_COLOR;
            setTextInputValue(validColor);
        }
    };

    return (
        <Box className="color-picker-input effect-input">
            <Typography variant="subtitle2" className="color-picker-input__label">
                {field.label}
            </Typography>
            <Box className="color-picker-input__wrapper">
                <Select
                    fullWidth
                    size="small"
                    className="color-picker-input__select"
                    value={currentValue.selectionType || 'color-bucket'}
                    onChange={handleSelectionTypeChange}
                >
                    {colorSelectionTypes.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                            {type.label}
                        </MenuItem>
                    ))}
                </Select>
                {currentValue.selectionType === 'color' && (
                    <Box className="color-picker-input__controls">
                        <Box
                            className="color-picker-input__swatch"
                            component="input"
                            type="color"
                            value={currentValue.colorValue || DEFAULT_COLOR_PICKER_COLOR}
                            onChange={handleColorPickerChange}
                        />
                        <TextField
                            className="color-picker-input__text-input"
                            fullWidth
                            size="small"
                            value={textInputValue}
                            onFocus={handleTextInputFocus}
                            onChange={handleTextInputChange}
                            onBlur={handleTextInputBlur}
                            placeholder={DEFAULT_COLOR_PICKER_COLOR}
                            error={!isValidHexColor(textInputValue)}
                            helperText={!isValidHexColor(textInputValue) ? 'Invalid hex color' : ''}
                            variant="outlined"
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
}

export default ColorPickerInput;