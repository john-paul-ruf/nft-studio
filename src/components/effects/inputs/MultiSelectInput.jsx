import React from 'react';

function MultiSelectInput({ field, value, onChange }) {
    const selectedValues = Array.isArray(value) ? value : field.default || [];
    const availableOptions = field.options || [];

    // Handle removing a selected item
    const handleRemove = (option) => {
        const newValues = selectedValues.filter(v => v !== option);
        onChange(field.name, newValues);
    };

    // Handle adding an available item
    const handleAdd = (option) => {
        if (!selectedValues.includes(option)) {
            const newValues = [...selectedValues, option];
            onChange(field.name, newValues);
        }
    };

    // Get options that are not currently selected
    const unselectedOptions = availableOptions.filter(option => !selectedValues.includes(option));

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

            {/* Selected Values Display */}
            {selectedValues.length > 0 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {selectedValues.map((option) => {
                        const displayValue = typeof option === 'object' ? JSON.stringify(option) : String(option);

                        return (
                            <div
                                key={displayValue}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.3rem 0.6rem',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                <span>{displayValue}</span>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRemove(option);
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '18px',
                                        height: '18px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        lineHeight: '1',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.3)';
                                        e.target.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.2)';
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                    title={`Remove ${displayValue}`}
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Available Options Display */}
            {unselectedOptions.length > 0 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {unselectedOptions.map((option) => {
                        const displayValue = typeof option === 'object' ? JSON.stringify(option) : String(option);

                        return (
                            <button
                                key={displayValue}
                                onClick={() => handleAdd(option)}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '4px',
                                    color: '#ccc',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s ease',
                                    fontWeight: 'normal'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.1)';
                                }}
                            >
                                {displayValue}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Help Text */}
            <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#888'
            }}>
                <div>Select multiple options • {selectedValues.length} selected</div>
                {unselectedOptions.length > 0 && (
                    <div style={{ marginTop: '0.25rem' }}>
                        {unselectedOptions.length} option{unselectedOptions.length !== 1 ? 's' : ''} available to add
                    </div>
                )}
            </div>
        </div>
    );
}

export default MultiSelectInput;