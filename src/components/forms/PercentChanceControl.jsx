import React, { useCallback } from 'react';
import { Box, Paper, Typography, Slider, TextField } from '@mui/material';
import useDebounce from '../../hooks/useDebounce.js';

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
    // Debounced onChange for text field
    const debouncedOnChange = useDebounce(useCallback((val) => {
        onChange(val);
    }, [onChange]), 150);

    const handleSliderChange = (e, newValue) => {
        onChange(newValue);
    };

    const handleTextFieldChange = (e) => {
        const newValue = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
        debouncedOnChange(newValue);
    };

    return (
        <Paper
            elevation={2}
            sx={{
                mt: 3,
                p: 3,
                background: 'rgba(102, 126, 234, 0.1)',
                borderRadius: 2,
                border: '1px solid rgba(102, 126, 234, 0.3)'
            }}
        >
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Effect Probability
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
                <Typography
                    variant="body2"
                    sx={{
                        color: '#cccccc',
                        minWidth: '120px'
                    }}
                >
                    Chance to occur:
                </Typography>
                <Slider
                    value={value}
                    onChange={handleSliderChange}
                    min={0}
                    max={100}
                    step={1}
                    sx={{
                        flex: 1,
                        color: 'rgba(102, 126, 234, 0.8)',
                        '& .MuiSlider-track': {
                            backgroundColor: 'rgba(102, 126, 234, 0.8)',
                        },
                        '& .MuiSlider-rail': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        }
                    }}
                />
                <TextField
                    type="number"
                    size="small"
                    value={value}
                    onChange={handleTextFieldChange}
                    inputProps={{
                        min: 0,
                        max: 100,
                        style: { textAlign: 'center' }
                    }}
                    sx={{
                        width: '80px',
                        '& .MuiInputBase-root': {
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: '#ffffff'
                        }
                    }}
                    InputProps={{
                        endAdornment: (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#cccccc',
                                    ml: 0.5
                                }}
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