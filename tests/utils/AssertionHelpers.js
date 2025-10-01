/**
 * AssertionHelpers - Custom assertions for refactoring tests
 * 
 * Provides domain-specific assertions that make refactoring tests
 * more readable and maintainable.
 * 
 * REAL OBJECTS ONLY - No mocks, just real object validation.
 */
class AssertionHelpers {
    constructor() {
        this.failureMessages = [];
    }

    /**
     * Assert that an object has the expected structure
     * @param {Object} actual - Actual object
     * @param {Object} expected - Expected structure
     * @param {string} message - Custom message
     */
    assertStructure(actual, expected, message = 'Structure assertion failed') {
        const errors = this._validateStructure(actual, expected, '');
        
        if (errors.length > 0) {
            const errorMessage = `${message}:\n${errors.join('\n')}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that a project has valid configuration
     * @param {Object} project - Project object
     * @param {string} message - Custom message
     */
    assertValidProject(project, message = 'Invalid project structure') {
        const requiredFields = ['id', 'name', 'settings', 'effects'];
        const missingFields = requiredFields.filter(field => !(field in project));
        
        if (missingFields.length > 0) {
            const errorMessage = `${message}: Missing fields: ${missingFields.join(', ')}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }

        // Validate settings structure
        if (project.settings) {
            const requiredSettings = ['targetResolution', 'frameCount'];
            const missingSettings = requiredSettings.filter(setting => !(setting in project.settings));
            
            if (missingSettings.length > 0) {
                const errorMessage = `${message}: Missing settings: ${missingSettings.join(', ')}`;
                this.failureMessages.push(errorMessage);
                throw new Error(errorMessage);
            }
        }

        // Validate effects array
        if (!Array.isArray(project.effects)) {
            const errorMessage = `${message}: Effects must be an array`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that an effect has valid configuration
     * @param {Object} effect - Effect object
     * @param {string} message - Custom message
     */
    assertValidEffect(effect, message = 'Invalid effect structure') {
        const requiredFields = ['id', 'type', 'properties'];
        const missingFields = requiredFields.filter(field => !(field in effect));
        
        if (missingFields.length > 0) {
            const errorMessage = `${message}: Missing fields: ${missingFields.join(', ')}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }

        // Validate effect ID format
        if (typeof effect.id !== 'string' || !effect.id.startsWith('effect_')) {
            const errorMessage = `${message}: Effect ID must be a string starting with 'effect_'`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }

        // Validate properties object
        if (typeof effect.properties !== 'object' || effect.properties === null) {
            const errorMessage = `${message}: Effect properties must be an object`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that a service implements required interface
     * @param {Object} service - Service instance
     * @param {Array} requiredMethods - Required method names
     * @param {string} message - Custom message
     */
    assertServiceInterface(service, requiredMethods, message = 'Service interface assertion failed') {
        const missingMethods = requiredMethods.filter(method => typeof service[method] !== 'function');
        
        if (missingMethods.length > 0) {
            const errorMessage = `${message}: Missing methods: ${missingMethods.join(', ')}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that performance metrics are within acceptable ranges
     * @param {Object} metrics - Performance metrics
     * @param {Object} thresholds - Performance thresholds
     * @param {string} message - Custom message
     */
    assertPerformance(metrics, thresholds, message = 'Performance assertion failed') {
        const violations = [];
        
        for (const [metric, threshold] of Object.entries(thresholds)) {
            if (!(metric in metrics)) {
                violations.push(`Missing metric: ${metric}`);
                continue;
            }
            
            const value = metrics[metric];
            
            if (threshold.max !== undefined && value > threshold.max) {
                violations.push(`${metric} (${value}) exceeds maximum (${threshold.max})`);
            }
            
            if (threshold.min !== undefined && value < threshold.min) {
                violations.push(`${metric} (${value}) below minimum (${threshold.min})`);
            }
        }
        
        if (violations.length > 0) {
            const errorMessage = `${message}:\n${violations.join('\n')}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that an async operation completes within timeout
     * @param {Promise} promise - Promise to test
     * @param {number} timeout - Timeout in milliseconds
     * @param {string} message - Custom message
     */
    async assertTimeout(promise, timeout, message = 'Timeout assertion failed') {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${message}: Operation timed out after ${timeout}ms`)), timeout);
        });
        
        try {
            await Promise.race([promise, timeoutPromise]);
        } catch (error) {
            this.failureMessages.push(error.message);
            throw error;
        }
    }

    /**
     * Assert that an error is thrown with expected message
     * @param {Function} fn - Function that should throw
     * @param {string|RegExp} expectedError - Expected error message or pattern
     * @param {string} message - Custom message
     */
    assertThrows(fn, expectedError = null, message = 'Throw assertion failed') {
        let thrownError = null;
        
        try {
            fn();
        } catch (error) {
            thrownError = error;
        }
        
        if (!thrownError) {
            const errorMessage = `${message}: Expected function to throw an error`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
        
        if (expectedError) {
            const errorMatches = expectedError instanceof RegExp 
                ? expectedError.test(thrownError.message)
                : thrownError.message.includes(expectedError);
                
            if (!errorMatches) {
                const errorMessage = `${message}: Error message '${thrownError.message}' does not match expected '${expectedError}'`;
                this.failureMessages.push(errorMessage);
                throw new Error(errorMessage);
            }
        }
    }

    /**
     * Assert that an async function throws
     * @param {Function} asyncFn - Async function that should throw
     * @param {string|RegExp} expectedError - Expected error message or pattern
     * @param {string} message - Custom message
     */
    async assertThrowsAsync(asyncFn, expectedError = null, message = 'Async throw assertion failed') {
        let thrownError = null;
        
        try {
            await asyncFn();
        } catch (error) {
            thrownError = error;
        }
        
        if (!thrownError) {
            const errorMessage = `${message}: Expected async function to throw an error`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
        
        if (expectedError) {
            const errorMatches = expectedError instanceof RegExp 
                ? expectedError.test(thrownError.message)
                : thrownError.message.includes(expectedError);
                
            if (!errorMatches) {
                const errorMessage = `${message}: Error message '${thrownError.message}' does not match expected '${expectedError}'`;
                this.failureMessages.push(errorMessage);
                throw new Error(errorMessage);
            }
        }
    }

    /**
     * Assert that two objects are deeply equal
     * @param {*} actual - Actual value
     * @param {*} expected - Expected value
     * @param {string} message - Custom message
     */
    assertEqual(actual, expected, message = 'Equality assertion failed') {
        if (!this._deepEqual(actual, expected)) {
            const errorMessage = `${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that a value is truthy
     * @param {*} value - Value to test
     * @param {string} message - Custom message
     */
    assertTrue(value, message = 'Truth assertion failed') {
        if (!value) {
            const errorMessage = `${message}: Expected truthy value, got ${value}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that a value is falsy
     * @param {*} value - Value to test
     * @param {string} message - Custom message
     */
    assertFalse(value, message = 'Falsy assertion failed') {
        if (value) {
            const errorMessage = `${message}: Expected falsy value, got ${value}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that a value is null or undefined
     * @param {*} value - Value to test
     * @param {string} message - Custom message
     */
    assertNull(value, message = 'Null assertion failed') {
        if (value !== null && value !== undefined) {
            const errorMessage = `${message}: Expected null or undefined, got ${value}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that a value is not null or undefined
     * @param {*} value - Value to test
     * @param {string} message - Custom message
     */
    assertNotNull(value, message = 'Not null assertion failed') {
        if (value === null || value === undefined) {
            const errorMessage = `${message}: Expected non-null value, got ${value}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that an array contains a specific item
     * @param {Array} array - Array to search
     * @param {*} item - Item to find
     * @param {string} message - Custom message
     */
    assertContains(array, item, message = 'Contains assertion failed') {
        if (!Array.isArray(array)) {
            const errorMessage = `${message}: Expected array, got ${typeof array}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
        
        const found = array.some(element => this._deepEqual(element, item));
        if (!found) {
            const errorMessage = `${message}: Array does not contain expected item ${JSON.stringify(item)}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Assert that an array has expected length
     * @param {Array} array - Array to test
     * @param {number} expectedLength - Expected length
     * @param {string} message - Custom message
     */
    assertLength(array, expectedLength, message = 'Length assertion failed') {
        if (!Array.isArray(array)) {
            const errorMessage = `${message}: Expected array, got ${typeof array}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
        
        if (array.length !== expectedLength) {
            const errorMessage = `${message}: Expected length ${expectedLength}, got ${array.length}`;
            this.failureMessages.push(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Validate object structure recursively
     * @private
     */
    _validateStructure(actual, expected, path) {
        const errors = [];
        
        if (typeof expected !== 'object' || expected === null) {
            if (actual !== expected) {
                errors.push(`${path}: Expected ${expected}, got ${actual}`);
            }
            return errors;
        }
        
        if (typeof actual !== 'object' || actual === null) {
            errors.push(`${path}: Expected object, got ${typeof actual}`);
            return errors;
        }
        
        for (const [key, expectedValue] of Object.entries(expected)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (!(key in actual)) {
                errors.push(`${currentPath}: Missing property`);
                continue;
            }
            
            errors.push(...this._validateStructure(actual[key], expectedValue, currentPath));
        }
        
        return errors;
    }

    /**
     * Deep equality comparison
     * @private
     */
    _deepEqual(a, b) {
        if (a === b) return true;
        
        if (a == null || b == null) return a === b;
        
        if (typeof a !== typeof b) return false;
        
        if (typeof a !== 'object') return a === b;
        
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        
        if (keysA.length !== keysB.length) return false;
        
        for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!this._deepEqual(a[key], b[key])) return false;
        }
        
        return true;
    }

    /**
     * Get all failure messages
     * @returns {Array} Array of failure messages
     */
    getFailureMessages() {
        return [...this.failureMessages];
    }

    /**
     * Clear failure messages
     */
    clearFailureMessages() {
        this.failureMessages = [];
    }

    /**
     * Create a summary of all assertions made
     * @returns {Object} Assertion summary
     */
    getSummary() {
        return {
            totalFailures: this.failureMessages.length,
            failures: this.getFailureMessages()
        };
    }
}

export default AssertionHelpers;