import React from 'react';
import RangeInput from './RangeInput.jsx';
import Point2DInput from './Point2DInput.jsx';
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

function ConfigInputFactory({ field, value, onChange, projectData }) {
    const commonProps = { field, value, onChange, projectData };

    switch (field.type) {
        case 'range':
            return <RangeInput {...commonProps} />;
        case 'point2d':
            return <Point2DInput {...commonProps} />;
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
                        value={value || field.default || ''}
                        onChange={(e) => onChange(field.name, e.target.value)}
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
                        value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || JSON.stringify(field.default, null, 2) || '{}'}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                onChange(field.name, parsed);
                            } catch (err) {
                                // Invalid JSON, store as string temporarily
                                onChange(field.name, e.target.value);
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
                        value={value || field.default || ''}
                        onChange={(e) => onChange(field.name, e.target.value)}
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