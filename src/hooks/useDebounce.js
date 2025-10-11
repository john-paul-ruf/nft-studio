import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom debounce hook for input fields
 * Delays the execution of a callback until after a specified delay
 * 
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {Function} Debounced function
 * 
 * @example
 * const debouncedSave = useDebounce((value) => {
 *   onChange(field.name, value);
 * }, 300);
 */
export function useDebounce(callback, delay = 300) {
    const timeoutRef = useRef(null);
    const callbackRef = useRef(callback);

    // Update callback ref when callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Return debounced function
    return useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);
}

/**
 * Custom hook for debounced input value
 * Manages both immediate display value and debounced actual value
 * 
 * @param {*} value - The controlled value
 * @param {Function} onChange - Callback when value changes (debounced)
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {Object} { displayValue, setDisplayValue, handleChange, handleBlur }
 * 
 * @example
 * const { displayValue, handleChange, handleBlur } = useDebouncedInput(
 *   value,
 *   (newValue) => onChange(field.name, newValue),
 *   300
 * );
 */
export function useDebouncedInput(value, onChange, delay = 300) {
    const [displayValue, setDisplayValue] = React.useState(value);
    const debouncedOnChange = useDebounce(onChange, delay);

    // Update display value when prop value changes
    useEffect(() => {
        setDisplayValue(value);
    }, [value]);

    const handleChange = useCallback((newValue) => {
        setDisplayValue(newValue);
        debouncedOnChange(newValue);
    }, [debouncedOnChange]);

    const handleBlur = useCallback(() => {
        // Ensure final value is committed on blur
        onChange(displayValue);
    }, [onChange, displayValue]);

    return {
        displayValue,
        setDisplayValue,
        handleChange,
        handleBlur
    };
}

export default useDebounce;