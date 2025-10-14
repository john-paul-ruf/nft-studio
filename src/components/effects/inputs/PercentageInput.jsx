import React, { useState, useRef, useEffect } from 'react';

function PercentageInput({ field, value, onChange }) {
    const currentValue = value !== undefined ? value : field.default || 0.5;
    const [inputValue, setInputValue] = useState(() => (currentValue * 100).toString());
    const debounceTimerRef = useRef(null);
    
    // Helper to format percentage with fractional precision
    const formatPercentage = (decimalValue) => {
        const percentage = decimalValue * 100;
        // Show up to 3 decimal places if there's a fractional part, otherwise show whole number
        if (percentage % 1 === 0) {
            return percentage.toFixed(0);
        } else if ((percentage * 10) % 1 === 0) {
            return percentage.toFixed(1);
        } else if ((percentage * 100) % 1 === 0) {
            return percentage.toFixed(2);
        } else {
            return percentage.toFixed(3);
        }
    };
    
    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);
    
    // Handle manual input changes with debouncing
    const handleInputChange = (e) => {
        const rawValue = e.target.value;
        setInputValue(rawValue);
        
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        
        // Allow empty string or valid number input
        if (rawValue === '' || rawValue === '-' || rawValue === '.') {
            return;
        }
        
        const numValue = parseFloat(rawValue);
        if (!isNaN(numValue)) {
            // Debounce the onChange call
            debounceTimerRef.current = setTimeout(() => {
                // No validation - accept whatever value the user wants
                onChange(field.name, numValue / 100);
            }, 300);
        }
    };

    return (
        <div className="percentage-input">
            <label>{field.label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                    type="range"
                    min={-10}
                    max={10}
                    step={0.001}
                    value={currentValue}
                    onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        onChange(field.name, newValue);
                        setInputValue((newValue * 100).toString());
                    }}
                    style={{
                        flex: 1,
                        background: 'linear-gradient(to right, #667eea 0%, #764ba2 100%)',
                        height: '6px',
                        borderRadius: '3px'
                    }}
                />
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={(e) => e.target.select()}
                    style={{
                        width: '70px',
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                    }}
                />
                <span style={{
                    color: '#67eea5',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    minWidth: '20px'
                }}>
                    %
                </span>
            </div>
        </div>
    );
}

export default PercentageInput;