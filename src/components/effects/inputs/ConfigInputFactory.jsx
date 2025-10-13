import React, { useCallback, useState, useEffect } from 'react';
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
                <div className="readonly-input">
                    <label style={{ color: '#ffffff', marginBottom: '0.5rem', display: 'block' }}>
                        {field.label}
                    </label>
                    <div style={{
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px dashed #666',
                        borderRadius: '4px',
                        color: '#999',
                        fontStyle: 'italic'
                    }}>
                        {field.default}
                    </div>
                </div>
            );
        case 'text':
            return (
                <div className="text-input">
                    <label style={{ color: '#ffffff', marginBottom: '0.5rem', display: 'block' }}>
                        {field.label}
                    </label>
                    <input
                        type="text"
                        value={textValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            setTextValue(val);
                            debouncedOnChange(field.name, val);
                        }}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        readOnly={field.readonly}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            color: '#ffffff'
                        }}
                    />
                </div>
            );
        case 'json':
            return (
                <div className="json-input">
                    <label style={{ color: '#ffffff', marginBottom: '0.5rem', display: 'block' }}>
                        {field.label}
                    </label>
                    {field.warning && (
                        <div style={{
                            background: 'rgba(255, 193, 7, 0.1)',
                            border: '1px solid rgba(255, 193, 7, 0.3)',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            marginBottom: '0.5rem',
                            color: '#ffc107',
                            fontSize: '0.8rem'
                        }}>
                            ⚠️ {field.warning}
                        </div>
                    )}
                    <textarea
                        value={jsonValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            setJsonValue(val); // Update local state immediately
                            try {
                                const parsed = JSON.parse(val);
                                debouncedJsonOnChange(field.name, parsed);
                            } catch (err) {
                                // Invalid JSON, store as string temporarily with debounce
                                debouncedJsonOnChange(field.name, val);
                            }
                        }}
                        placeholder="Enter JSON object"
                        style={{
                            width: '100%',
                            minHeight: '80px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            color: '#ffffff',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem'
                        }}
                    />
                </div>
            );
        default:
            return (
                <div className="text-input">
                    <label style={{ color: '#ffffff', marginBottom: '0.5rem', display: 'block' }}>
                        {field.label}
                    </label>
                    <input
                        type="text"
                        value={textValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            setTextValue(val);
                            debouncedOnChange(field.name, val);
                        }}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            color: '#ffffff'
                        }}
                    />
                </div>
            );
    }
}

export default ConfigInputFactory;