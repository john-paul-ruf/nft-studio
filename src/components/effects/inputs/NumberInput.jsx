import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, TextField, Slider, FormControl, FormHelperText } from '@mui/material';
import NumberFormatter from '../../../utils/NumberFormatter.js';
import useDebounce from '../../../hooks/useDebounce.js';

function NumberInput({ field, value, onChange }) {
    const currentValue = value !== undefined ? value : field.default || 0;
    const maxValue = field.max || 100;
    
    // Use our custom formatting logic
    const dynamicStep = NumberFormatter.getStepForValue(currentValue);
    const step = field.step || dynamicStep;
    const isDecimal = NumberFormatter.shouldUseDecimalFormatting(currentValue);

    // Use direct input for small ranges (single digit inputs)
    const useDirectInput = maxValue <= 10;

    // State for display value to handle formatting
    const [displayValue, setDisplayValue] = useState(NumberFormatter.formatForDisplay(currentValue));
    
    // Track if input is focused to prevent overwriting during typing
    const isFocusedRef = useRef(false);

    // Update display value when currentValue changes, but ONLY if not actively typing
    useEffect(() => {
        if (!isFocusedRef.current) {
            setDisplayValue(NumberFormatter.formatForDisplay(currentValue));
        }
    }, [currentValue]);

    // Debounce onChange for text input (150ms for numbers - faster than text)
    const debouncedOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 150);

    const handleNumberFocus = () => {
        isFocusedRef.current = true;
    };

    const handleNumberChange = (e) => {
        const inputValue = e.target.value;
        
        // Allow user to type freely, including empty string and partial numbers like "-" or "."
        setDisplayValue(inputValue);
        
        // Only parse and update if we have a valid number
        // This allows typing negative signs, decimals, etc. without interference
        if (inputValue !== '' && inputValue !== '-' && inputValue !== '.') {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            // Only update if it's a valid number
            if (!isNaN(parsedValue)) {
                debouncedOnChange(field.name, parsedValue);
            }
        }
    };

    const handleNumberBlur = (e) => {
        isFocusedRef.current = false;
        const inputValue = e.target.value;
        
        // If empty or invalid on blur, restore the current value (don't force a default)
        // This allows users to clear and retype without fighting the UI
        if (inputValue === '' || inputValue === '-' || inputValue === '.' || isNaN(NumberFormatter.parseFromString(inputValue))) {
            // Restore the current valid value instead of forcing a default
            const formattedValue = NumberFormatter.formatForDisplay(currentValue);
            setDisplayValue(formattedValue);
            // No need to call onChange - we're keeping the existing value
        } else {
            // Format the value when user finishes editing
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            const formattedValue = NumberFormatter.formatForDisplay(parsedValue);
            setDisplayValue(formattedValue);
            onChange(field.name, parsedValue);
        }
    };

    const handleSliderChange = (e, sliderValue) => {
        const val = isDecimal ? parseFloat(sliderValue) : parseInt(sliderValue);
        onChange(field.name, val);
    };

    if (useDirectInput) {
        // Direct keyboard input for small ranges
        return (
            <FormControl fullWidth>
                <Typography variant="body2" gutterBottom>
                    {field.label}
                </Typography>
                <TextField
                    type="number"
                    size="small"
                    value={displayValue}
                    onFocus={handleNumberFocus}
                    onChange={handleNumberChange}
                    onBlur={handleNumberBlur}
                    inputProps={{
                        step: step,
                        style: { textAlign: 'center' }
                    }}
                    sx={{ width: 120 }}
                />
            </FormControl>
        );
    }

    // Slider + number input for larger ranges
    return (
        <FormControl fullWidth>
            <Typography variant="body2" gutterBottom>
                {field.label}
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
                <Slider
                    value={currentValue}
                    onChange={handleSliderChange}
                    min={0}
                    max={maxValue}
                    step={step}
                    sx={{ flex: 1 }}
                />
                <TextField
                    type="number"
                    size="small"
                    value={displayValue}
                    onFocus={handleNumberFocus}
                    onChange={handleNumberChange}
                    onBlur={handleNumberBlur}
                    inputProps={{
                        step: step,
                        style: { textAlign: 'center' }
                    }}
                    sx={{ width: 80 }}
                />
            </Box>
        </FormControl>
    );
}

export default NumberInput;