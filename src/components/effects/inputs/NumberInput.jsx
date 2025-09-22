import React from 'react';
import { Box, Typography, TextField, Slider, FormControl, FormHelperText } from '@mui/material';

function NumberInput({ field, value, onChange }) {
    const currentValue = value !== undefined ? value : field.default || 0;
    const step = field.step || 1;
    const isDecimal = step < 1;
    const maxValue = field.max || 100;

    // Use direct input for small ranges (single digit inputs)
    const useDirectInput = maxValue <= 10;

    const handleNumberChange = (e) => {
        const val = isDecimal ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0;
        onChange(field.name, val);
    };

    const handleSliderChange = (e) => {
        const val = isDecimal ? parseFloat(e.target.value) : parseInt(e.target.value);
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
                    value={currentValue}
                    onChange={handleNumberChange}
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
                    onChange={(e, value) => onChange(field.name, value)}
                    min={field.min || 0}
                    max={maxValue}
                    step={step}
                    sx={{ flex: 1 }}
                />
                <TextField
                    type="number"
                    size="small"
                    value={currentValue}
                    onChange={handleNumberChange}
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