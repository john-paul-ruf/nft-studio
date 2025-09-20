/**
 * Divisor Helper Utility
 * Functions for working with divisors of numbers, specifically for sparsity factors
 */

/**
 * Calculate all divisors of a number
 * @param {number} num - The number to find divisors for
 * @returns {number[]} Array of divisors in ascending order
 */
export function getDivisors(num) {
    const divisors = [];
    for (let i = 1; i <= num; i++) {
        if (num % i === 0) {
            divisors.push(i);
        }
    }
    return divisors;
}

/**
 * Get all divisors of 360 (commonly used for sparsity factors)
 * @returns {number[]} Array of 360's divisors
 */
export function getDivisorsOf360() {
    // Pre-calculated for performance since this is called frequently
    return [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180, 360];
}

/**
 * Check if a number is a divisor of 360
 * @param {number} num - Number to check
 * @returns {boolean} True if num is a divisor of 360
 */
export function isDivisorOf360(num) {
    return Number.isInteger(num) && num > 0 && 360 % num === 0;
}

/**
 * Get common/suggested divisors of 360 for UI
 * @returns {number[]} Array of commonly used divisors
 */
export function getCommonDivisorsOf360() {
    return [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180, 360];
}

/**
 * Get remaining divisors that are not in the current selection
 * @param {number[]} selectedDivisors - Currently selected divisors
 * @returns {number[]} Available divisors not yet selected
 */
export function getRemainingDivisorsOf360(selectedDivisors = []) {
    const allDivisors = getDivisorsOf360();
    return allDivisors.filter(divisor => !selectedDivisors.includes(divisor));
}

/**
 * Sort divisors in a logical order (ascending numeric)
 * @param {number[]} divisors - Array of divisors to sort
 * @returns {number[]} Sorted array
 */
export function sortDivisors(divisors) {
    return [...divisors].sort((a, b) => a - b);
}

/**
 * Validate and clean an array of potential divisors
 * @param {any[]} values - Array of values to validate
 * @returns {number[]} Array of valid divisors only
 */
export function validateDivisors(values) {
    return values
        .map(val => Number(val))
        .filter(num => isDivisorOf360(num))
        .filter((num, index, arr) => arr.indexOf(num) === index); // Remove duplicates
}

/**
 * Get display name for a divisor (with degree indication)
 * @param {number} divisor - The divisor value
 * @returns {string} Display string like "4 (90°)"
 */
export function getDivisorDisplayName(divisor) {
    if (!isDivisorOf360(divisor)) {
        return String(divisor);
    }
    const degrees = 360 / divisor;
    return `${divisor} (${degrees}°)`;
}