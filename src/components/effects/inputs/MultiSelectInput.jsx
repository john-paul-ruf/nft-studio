import React from 'react';

function MultiSelectInput({ field, value, onChange }) {
    const selectedValues = Array.isArray(value) ? value : field.default || [];
    const availableOptions = field.options || [];

    const handleToggle = (option) => {
        const currentValues = Array.isArray(selectedValues) ? selectedValues : [];
        const newValues = currentValues.includes(option)
            ? currentValues.filter(v => v !== option)
            : [...currentValues, option];
        onChange(newValues);
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                color: '#ccc'
            }}>
                {field.label || field.name}
            </label>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {availableOptions.map((option) => {
                    const isSelected = selectedValues.includes(option);
                    const displayValue = typeof option === 'object' ? JSON.stringify(option) : String(option);

                    return (
                        <button
                            key={displayValue}
                            onClick={() => handleToggle(option)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                background: isSelected
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : 'rgba(255,255,255,0.1)',
                                border: isSelected
                                    ? '1px solid transparent'
                                    : '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                color: isSelected ? 'white' : '#ccc',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s ease',
                                fontWeight: isSelected ? 'bold' : 'normal'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    e.target.style.background = 'rgba(255,255,255,0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.target.style.background = 'rgba(255,255,255,0.1)';
                                }
                            }}
                        >
                            {displayValue}
                        </button>
                    );
                })}
            </div>
            <div style={{
                marginTop: '0.25rem',
                fontSize: '0.75rem',
                color: '#888'
            }}>
                Select multiple options • {selectedValues.length} selected
            </div>
        </div>
    );
}

export default MultiSelectInput;