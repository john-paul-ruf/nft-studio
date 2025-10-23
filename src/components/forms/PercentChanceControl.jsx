import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Slider, TextField } from '@mui/material';
import useDebounce from '../../hooks/useDebounce.js';
import './PercentChanceControl.bem.css';

/**
 * PercentChanceControl Component
 * 
 * Provides UI controls for setting the probability (percent chance) of an effect occurring.
 * Includes both a slider and a numeric text field for precise control.
 * 
 * Responsibilities:
 * - Display percent chance slider (0-100)
 * - Display percent chance text input
 * - Handle value changes and validation
 * - Maintain value within 0-100 range
 * 
 * @param {Object} props
 * @param {number} props.value - Current percent chance value (0-100)
 * @param {Function} props.onChange - Callback when value changes
 */
const PercentChanceControl = ({ value, onChange }) => {

    // Local state for display value to allow free typing
    const [displayValue, setDisplayValue] = useState(value.toString());

    // Update display value when prop value changes (from slider or external source)
    useEffect(() => {
        setDisplayValue(value.toString());
    }, [value]);

    // Debounced onChange for text field
    const debouncedOnChange = useDebounce(useCallback((val) => {
        onChange(val);
    }, [onChange]), 150);

    const handleSliderChange = (e, newValue) => {
        onChange(newValue);
    };

    const handleTextFieldChange = (e) => {
        const inputValue = e.target.value;
        
        // Allow user to type freely, including empty string
        setDisplayValue(inputValue);
        
        // Only update if we have a valid number
        if (inputValue !== '') {
            const parsedValue = parseInt(inputValue);
            if (!isNaN(parsedValue)) {
                // Clamp value between 0 and 100
                const clampedValue = Math.max(0, Math.min(100, parsedValue));
                debouncedOnChange(clampedValue);
            }
        }
    };

    const handleTextFieldBlur = (e) => {
        const inputValue = e.target.value;
        
        // If empty or invalid on blur, restore the current value
        if (inputValue === '' || isNaN(parseInt(inputValue))) {
            setDisplayValue(value.toString());
        } else {
            // Ensure value is clamped and formatted
            const parsedValue = parseInt(inputValue);
            const clampedValue = Math.max(0, Math.min(100, parsedValue));
            setDisplayValue(clampedValue.toString());
            onChange(clampedValue);
        }
    };

    return (
        <Paper
            elevation={2}
            className="percent-chance__container"
        >
            <Typography variant="h6" className="percent-chance__title">
                Effect Probability
            </Typography>
            <Box className="percent-chance__controls">
                <Typography
                    variant="body2"
                    className="percent-chance__label"
                >
                    Chance to occur:
                </Typography>
                <Slider
                    value={value}
                    onChange={handleSliderChange}
                    min={0}
                    max={100}
                    step={1}
                    className="percent-chance__slider"
                />
                <TextField
                    type="number"
                    size="small"
                    value={displayValue}
                    onChange={handleTextFieldChange}
                    onBlur={handleTextFieldBlur}
                    inputProps={{
                        min: 0,
                        max: 100
                    }}
                    className="percent-chance__input"
                    InputProps={{
                        endAdornment: (
                            <Typography
                                variant="body2"
                                className="percent-chance__percent-symbol"
                            >
                                %
                            </Typography>
                        )
                    }}
                />
            </Box>
        </Paper>
    );
};

export default PercentChanceControl;