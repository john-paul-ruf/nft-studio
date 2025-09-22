import React from 'react';
import { FormControlLabel, Checkbox } from '@mui/material';

function BooleanInput({ field, value, onChange }) {
    const currentValue = value !== undefined ? value : field.default || false;

    return (
        <FormControlLabel
            control={
                <Checkbox
                    checked={currentValue}
                    onChange={(e) => onChange(field.name, e.target.checked)}
                    size="small"
                />
            }
            label={field.label}
        />
    );
}

export default BooleanInput;