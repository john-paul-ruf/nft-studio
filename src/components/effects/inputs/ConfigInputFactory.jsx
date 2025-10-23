import React, { useCallback, useState, useEffect } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import './EffectInput.bem.css';
import './ConfigInputFactory.bem.css';
import RangeInput from './RangeInput.jsx';
import Point2DInput from './Point2DInput.jsx';
import PositionInput from './PositionInput.jsx';
import ColorPickerInput from './ColorPickerInput.jsx';
import PercentageInput from './PercentageInput.jsx';
import PercentageRangeInput from './PercentageRangeInput.jsx';
import DynamicRangeInput from './DynamicRangeInput.jsx';
import NumberInput from './NumberInput.jsx';
import BooleanInput from './BooleanInput.jsx';
import FindValueAlgorithmInput from './FindValueAlgorithmInput.jsx';
import MultiSelectInput from './MultiSelectInput.jsx';
import MultiStepInput from './MultiStepInput.jsx';
import SparsityFactorInput from './SparsityFactorInput.jsx';
import EnhancedArrayInput from './EnhancedArrayInput.jsx';
import useDebounce from '../../../hooks/useDebounce.js';

function ConfigInputFactory({ field, value, onChange, projectState }) {
    const commonProps = { field, value, onChange, projectState };
    
    // Check if this is a JSON field that contains an array
    const isJsonArray = field.type === 'json' && Array.isArray(field.default);
    
    // Debug logging for array types
    if (field.type === 'array' || isJsonArray) {
        console.log('🔧 ConfigInputFactory: Array field detected:', {
            fieldName: field.name,
            fieldType: field.type,
            isJsonArray: isJsonArray,
            arrayType: field.arrayType,
            value: value
        });
    }
    
    // Local state for text inputs to provide immediate feedback
    const [textValue, setTextValue] = useState(value || field.default || '');
    
    // Local state for JSON textarea
    const [jsonValue, setJsonValue] = useState(() => {
        if (field.type === 'json') {
            return typeof value === 'object' ? JSON.stringify(value, null, 2) : value || JSON.stringify(field.default, null, 2) || '{}';
        }
        return '';
    });
    
    // Sync local state when value changes externally
    useEffect(() => {
        setTextValue(value || field.default || '');
        
        // Sync JSON value
        if (field.type === 'json') {
            setJsonValue(typeof value === 'object' ? JSON.stringify(value, null, 2) : value || JSON.stringify(field.default, null, 2) || '{}');
        }
    }, [value, field.default, field.type]);
    
    // Debounced onChange for text inputs
    const debouncedOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 300);
    
    // Debounced onChange for JSON inputs
    const debouncedJsonOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 500);

    // If this is a JSON field with an array default, treat it as an array
    if (isJsonArray) {
        return <EnhancedArrayInput {...commonProps} />;
    }
    
    switch (field.type) {
        case 'range':
            return <RangeInput {...commonProps} />;
        case 'point2d':
            return <Point2DInput {...commonProps} />;
        case 'position':
        case 'arc-path':
            return <PositionInput {...commonProps} />;
        case 'colorpicker':
            return <ColorPickerInput {...commonProps} />;
        case 'percentage':
            return <PercentageInput {...commonProps} />;
        case 'percentagerange':
            return <PercentageRangeInput {...commonProps} />;
        case 'dynamicrange':
            return <DynamicRangeInput {...commonProps} />;
        case 'number':
            return <NumberInput {...commonProps} />;
        case 'boolean':
            return <BooleanInput {...commonProps} />;
        case 'findvaluealgorithm':
            return <FindValueAlgorithmInput {...commonProps} />;
        case 'multiselect':
            return <MultiSelectInput {...commonProps} />;
        case 'multistep':
            return <MultiStepInput {...commonProps} />;
        case 'sparsityfactor':
            return <SparsityFactorInput {...commonProps} />;
        case 'array':
            // Use enhanced array input for better UX
            return <EnhancedArrayInput {...commonProps} />;
        case 'readonly':
            return (
                <Box className="effect-input effect-input__readonly">
                    <Typography variant="subtitle2" className="effect-input__readonly-label">
                        {field.label}
                    </Typography>
                    <Box className="effect-input__readonly-value">
                        <Typography variant="body2">
                            {field.default}
                        </Typography>
                    </Box>
                </Box>
            );
        case 'text':
            return (
                <Box className="effect-input effect-input__text">
                    <TextField
                        fullWidth
                        size="small"
                        label={field.label}
                        value={textValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            setTextValue(val);
                            debouncedOnChange(field.name, val);
                        }}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        disabled={field.readonly}
                        variant="outlined"
                        className="effect-input__text-input"
                    />
                </Box>
            );
        case 'json':
            return (
                <Box className="effect-input effect-input__json">
                    <Typography variant="subtitle2" className="effect-input__json-label">
                        {field.label}
                    </Typography>
                    {field.warning && (
                        <Box className="effect-input__json-warning">
                            ⚠️ {field.warning}
                        </Box>
                    )}
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={jsonValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            setJsonValue(val);
                            try {
                                const parsed = JSON.parse(val);
                                debouncedJsonOnChange(field.name, parsed);
                            } catch (err) {
                                debouncedJsonOnChange(field.name, val);
                            }
                        }}
                        placeholder="Enter JSON object"
                        variant="outlined"
                        className="effect-input__json-textarea"
                    />
                </Box>
            );
        default:
            return (
                <Box className="effect-input effect-input__text">
                    <TextField
                        fullWidth
                        size="small"
                        label={field.label}
                        value={textValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            setTextValue(val);
                            debouncedOnChange(field.name, val);
                        }}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        variant="outlined"
                        className="effect-input__text-input"
                    />
                </Box>
            );
    }
}

export default ConfigInputFactory;