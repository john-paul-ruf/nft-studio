import React from 'react';
import RangeInput from './RangeInput';
import Point2DInput from './Point2DInput';
import ColorPickerInput from './ColorPickerInput';
import PercentageInput from './PercentageInput';
import PercentageRangeInput from './PercentageRangeInput';
import DynamicRangeInput from './DynamicRangeInput';
import NumberInput from './NumberInput';
import BooleanInput from './BooleanInput';
import FindValueAlgorithmInput from './FindValueAlgorithmInput';

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