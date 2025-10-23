import React from 'react';
import './MultiSelectInput.bem.css';

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
        <div className="multi-select-input">
            <label className="multi-select-input__label">
                {field.label || field.name}
            </label>

            {/* Selected Values Display */}
            {selectedValues.length > 0 && (
                <div className="multi-select-input__selected-values">
                    {selectedValues.map((option) => {
                        const displayValue = typeof option === 'object' ? JSON.stringify(option) : String(option);

                        return (
                            <div
                                key={displayValue}
                                className="multi-select-input__tag"
                            >
                                <span className="multi-select-input__tag-text">{displayValue}</span>
                                <button
                                    className="multi-select-input__tag-remove"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRemove(option);
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
                <div className="multi-select-input__available-options">
                    {unselectedOptions.map((option) => {
                        const displayValue = typeof option === 'object' ? JSON.stringify(option) : String(option);

                        return (
                            <button
                                key={displayValue}
                                className="multi-select-input__add-btn"
                                onClick={() => handleAdd(option)}
                            >
                                {displayValue}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Help Text */}
            <div className="multi-select-input__help">
                <div className="multi-select-input__help-line">Select multiple options • {selectedValues.length} selected</div>
                {unselectedOptions.length > 0 && (
                    <div className="multi-select-input__help-line multi-select-input__help-line--secondary">
                        {unselectedOptions.length} option{unselectedOptions.length !== 1 ? 's' : ''} available to add
                    </div>
                )}
            </div>
        </div>
    );
}

export default MultiSelectInput;