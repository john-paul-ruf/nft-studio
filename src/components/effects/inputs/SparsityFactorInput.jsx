import React, { useState, useRef, useEffect } from 'react';
import { getDivisorDisplayName, isDivisorOf360, getRemainingDivisorsOf360, validateDivisors, sortDivisors } from '../../../utils/divisorHelper.js';

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
            {sortedSelectedValues.length > 0 && (
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
                    {sortedSelectedValues.map((divisor) => (
                        <div
                            key={divisor}
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
                            <span>{getDivisorDisplayName(divisor)}</span>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleRemove(divisor);
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
                                title={`Remove ${divisor}`}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Field with Add Button */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <input
                            ref={inputRef}
                            type="number"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => inputValue && setShowDropdown(true)}
                            placeholder="Enter a divisor of 360..."
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: 'rgba(255,255,255,0.1)',
                                border: error ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                color: '#fff',
                                fontSize: '0.9rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />

                        {/* Error Message */}
                        {error && (
                            <div style={{
                                marginTop: '0.25rem',
                                fontSize: '0.75rem',
                                color: '#ff6b6b',
                                background: 'rgba(255, 107, 107, 0.1)',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 107, 107, 0.3)'
                            }}>
                                {error}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAdd();
                        }}
                        disabled={!inputValue.trim()}
                        style={{
                            padding: '0.5rem 1rem',
                            background: inputValue.trim()
                                ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                                : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '4px',
                            color: inputValue.trim() ? 'white' : '#666',
                            cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Add
                    </button>
                </div>

                {/* Dropdown for Quick Selection */}
                {showDropdown && filteredOptions.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#323232',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '2px'
                    }}>
                        {filteredOptions.slice(0, 10).map((divisor) => (
                            <button
                                key={divisor}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectFromDropdown(divisor);
                                }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#444'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                            >
                                {getDivisorDisplayName(divisor)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Help Text */}
            <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#888'
            }}>
                <div>Add divisors of 360 • {selectedValues.length} selected</div>
                {remainingDivisors.length > 0 && (
                    <div style={{ marginTop: '0.25rem' }}>
                        Available: {remainingDivisors.slice(0, 8).join(', ')}
                        {remainingDivisors.length > 8 && ` and ${remainingDivisors.length - 8} more...`}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SparsityFactorInput;