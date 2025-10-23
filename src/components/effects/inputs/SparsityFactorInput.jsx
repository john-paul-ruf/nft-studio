import React, { useState, useRef, useEffect } from 'react';
import { getDivisorDisplayName, isDivisorOf360, getRemainingDivisorsOf360, validateDivisors, sortDivisors } from '../../../utils/divisorHelper.js';
import './SparsityFactorInput.bem.css';

function SparsityFactorInput({ field, value, onChange }) {
    const [inputValue, setInputValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Current selected values (validated and sorted)
    const selectedValues = validateDivisors(Array.isArray(value) ? value : field.default || []);
    const sortedSelectedValues = sortDivisors(selectedValues);

    // Available options for dropdown
    const remainingDivisors = getRemainingDivisorsOf360(selectedValues);

    // Handle adding a new divisor
    const handleAdd = () => {
        const trimmed = inputValue.trim();
        const numValue = parseInt(trimmed, 10);

        if (!trimmed || isNaN(numValue) || numValue <= 0) {
            setError('Please enter a valid positive number');
            return;
        }

        if (!isDivisorOf360(numValue)) {
            setError(`${numValue} is not a divisor of 360. Valid divisors: 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180, 360`);
            return;
        }

        if (selectedValues.includes(numValue)) {
            setError(`${numValue} is already selected`);
            return;
        }

        const newValues = sortDivisors([...selectedValues, numValue]);
        onChange(field.name, newValues);
        setInputValue('');
        setError('');
        setShowDropdown(false);
    };

    // Handle removing a divisor
    const handleRemove = (valueToRemove) => {
        const newValues = selectedValues.filter(v => v !== valueToRemove);
        onChange(field.name, newValues);
    };

    // Handle selecting from dropdown
    const handleSelectFromDropdown = (divisor) => {
        const newValues = sortDivisors([...selectedValues, divisor]);
        onChange(field.name, newValues);
        setInputValue('');
        setShowDropdown(false);
        inputRef.current?.focus();
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setError('');

        // Show dropdown when typing
        if (newValue.length > 0) {
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    };

    // Handle Enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
            setInputValue('');
            setError('');
        }
    };

    // Filter dropdown options based on input
    const filteredOptions = remainingDivisors.filter(divisor =>
        divisor.toString().includes(inputValue)
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="sparsity-factor-input">
            <label className="sparsity-factor-input__label">
                {field.label || field.name}
            </label>

            {/* Selected Values Display */}
            {sortedSelectedValues.length > 0 && (
                <div className="sparsity-factor-input__selected-values">
                    {sortedSelectedValues.map((divisor) => (
                        <div key={divisor} className="sparsity-factor-input__tag">
                            <span className="sparsity-factor-input__tag-name">{getDivisorDisplayName(divisor)}</span>
                            <button
                                className="sparsity-factor-input__tag-remove"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleRemove(divisor);
                                }}
                                title={`Remove ${divisor}`}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Field with Add Button */}
            <div className="sparsity-factor-input__input-wrapper" ref={dropdownRef}>
                <div className="sparsity-factor-input__input-row">
                    <div className="sparsity-factor-input__input-column">
                        <input
                            ref={inputRef}
                            type="number"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => inputValue && setShowDropdown(true)}
                            placeholder="Enter a divisor of 360..."
                            className={`sparsity-factor-input__input ${error ? 'sparsity-factor-input__input--error' : ''}`}
                        />

                        {/* Error Message */}
                        {error && (
                            <div className="sparsity-factor-input__error">
                                {error}
                            </div>
                        )}
                    </div>

                    <button
                        className={`sparsity-factor-input__add-btn ${inputValue.trim() ? 'sparsity-factor-input__add-btn--enabled' : 'sparsity-factor-input__add-btn--disabled'}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAdd();
                        }}
                        disabled={!inputValue.trim()}
                    >
                        Add
                    </button>
                </div>

                {/* Dropdown for Quick Selection */}
                {showDropdown && filteredOptions.length > 0 && (
                    <div className="sparsity-factor-input__dropdown">
                        {filteredOptions.slice(0, 10).map((divisor) => (
                            <button
                                key={divisor}
                                className="sparsity-factor-input__dropdown-item"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectFromDropdown(divisor);
                                }}
                            >
                                {getDivisorDisplayName(divisor)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Help Text */}
            <div className="sparsity-factor-input__help">
                <div className="sparsity-factor-input__help-line">Add divisors of 360 • {selectedValues.length} selected</div>
                {remainingDivisors.length > 0 && (
                    <div className="sparsity-factor-input__available">
                        Available: {remainingDivisors.slice(0, 8).join(', ')}
                        {remainingDivisors.length > 8 && ` and ${remainingDivisors.length - 8} more...`}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SparsityFactorInput;