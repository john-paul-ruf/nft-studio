/**
 * Utility for formatting numbers in effect config inputs
 * - Numbers between 0 and 1: show three decimal places (0.000)
 * - Numbers 1 and above: show as integers only
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
        
        // Numbers between 0 and 1 (exclusive) get 3 decimal places
        if (numValue > 0 && numValue < 1) {
            return numValue.toFixed(3);
        }
        
        // Numbers 1 and above are integers
        if (numValue >= 1) {
            return Math.round(numValue).toString();
        }
        
        // Handle 0 and negative numbers
        if (numValue === 0) {
            return '0';
        }
        
        // Negative numbers between -1 and 0 get 3 decimal places
        if (numValue > -1 && numValue < 0) {
            return numValue.toFixed(3);
        }
        
        // Negative numbers -1 and below are integers
        return Math.round(numValue).toString();
    }

    /**
     * Parse a formatted string back to a number
     * @param {string} value - The formatted string
     * @returns {number} - Parsed number
     */
    static parseFromString(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Get the appropriate step value for an input based on the current value
     * @param {number} value - Current value
     * @returns {number} - Step value (0.001 for decimals, 1 for integers)
     */
    static getStepForValue(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 1;
        }

        const numValue = Number(value);
        
        // Use fine step for values between -1 and 1 (exclusive of endpoints)
        if (numValue > -1 && numValue < 1 && numValue !== 0) {
            return 0.001;
        }
        
        // Use integer step for everything else
        return 1;
    }

    /**
     * Determine if a value should be treated as decimal based on its range
     * @param {number} value - The value to check
     * @returns {boolean} - True if should use decimal formatting
     */
    static shouldUseDecimalFormatting(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return false;
        }

        const numValue = Number(value);
        return numValue > -1 && numValue < 1 && numValue !== 0;
    }
}

export default NumberFormatter;