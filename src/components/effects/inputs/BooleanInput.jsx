import React from 'react';

function BooleanInput({ field, value, onChange }) {
    const currentValue = value !== undefined ? value : field.default || false;

    return (
        <div className="boolean-input">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={currentValue}
                    onChange={(e) => onChange(field.name, e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                />
                <span>{field.label}</span>
            </label>
        </div>
    );
}

export default BooleanInput;