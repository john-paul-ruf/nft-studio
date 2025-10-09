/**
 * Utility for formatting numbers in effect config inputs
 * - All numbers: show up to three decimal places (#.###)
 * - Trailing zeros are removed for cleaner display
 */
class NumberFormatter {
    /**
     * Format a number for display based on its value
     * @param {number} value - The number to format
     * @returns {string} - Formatted number string
     */
    static formatForDisplay(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return '0';
        }

        const numValue = Number(value);
        
        // Handle zero
        if (numValue === 0) {
            return '0';
        }
        
        // All numbers get up to 3 decimal places, with trailing zeros removed
        // This allows formats like: 0.5, 1.25, 2.333, 10, 100.5, etc.
        const formatted = numValue.toFixed(3);
        
        // Remove trailing zeros and unnecessary decimal point
        return formatted.replace(/\.?0+$/, '');
    }

    /**
     * Parse a formatted string back to a number
     * @param {string} value - The formatted string
     * @param {boolean} allowEmpty - If true, returns null for empty strings instead of 0
     * @returns {number|null} - Parsed number or null if empty and allowEmpty is true
     */
    static parseFromString(value, allowEmpty = false) {
        // Handle empty string
        if (value === '' || value === null || value === undefined) {
            return allowEmpty ? null : 0;
        }
        
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Get the appropriate step value for an input based on the current value
     * @param {number} value - Current value
     * @returns {number} - Step value (always 0.001 for 3 decimal precision)
     */
    static getStepForValue(value) {
        // Always use fine step to allow 3 decimal places (#.###)
        return 0.001;
    }

    /**
     * Determine if a value should be treated as decimal based on its range
     * @param {number} value - The value to check
     * @returns {boolean} - True if should use decimal formatting (always true now)
     */
    static shouldUseDecimalFormatting(value) {
        // Always use decimal formatting to support #.### format for all values
        return true;
    }
}

export default NumberFormatter;