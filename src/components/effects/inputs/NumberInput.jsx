import React, { useState, useEffect, useCallback } from 'react';
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

    // Update display value when currentValue changes
    useEffect(() => {
        setDisplayValue(NumberFormatter.formatForDisplay(currentValue));
    }, [currentValue]);

    // Debounce onChange for text input (150ms for numbers - faster than text)
    const debouncedOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 150);

    const handleNumberChange = (e) => {
        const inputValue = e.target.value;
        setDisplayValue(inputValue); // Allow user to type freely, including empty string
        
        // Don't update the value while typing if it's empty - wait for blur
        if (inputValue !== '') {
            const parsedValue = NumberFormatter.parseFromString(inputValue);
            debouncedOnChange(field.name, parsedValue);
        }
    };

    const handleNumberBlur = (e) => {
        const inputValue = e.target.value;
        
        // If empty on blur, use the field default or 0
        if (inputValue === '') {
            const defaultValue = field.default !== undefined ? field.default : 0;
            const formattedValue = NumberFormatter.formatForDisplay(defaultValue);
            setDisplayValue(formattedValue);
            onChange(field.name, defaultValue);
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
                    onChange={handleNumberChange}
                    onBlur={handleNumberBlur}
                    inputProps={{
                        min: field.min || 0,
                        max: maxValue,
                        step: step,
                        style: { textAlign: 'center' }
                    }}
                    sx={{ width: 120 }}
                />
                <FormHelperText>
                    Range: {field.min || 0} - {maxValue}
                </FormHelperText>
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
                    min={field.min || 0}
                    max={maxValue}
                    step={step}
                    sx={{ flex: 1 }}
                />
                <TextField
                    type="number"
                    size="small"
                    value={displayValue}
                    onChange={handleNumberChange}
                    onBlur={handleNumberBlur}
                    inputProps={{
                        min: field.min || 0,
                        max: maxValue,
                        step: step,
                        style: { textAlign: 'center' }
                    }}
                    sx={{ width: 80 }}
                />
            </Box>
            <FormHelperText>
                Min: {field.min || 0} | Max: {maxValue}
            </FormHelperText>
        </FormControl>
    );
}

export default NumberInput;