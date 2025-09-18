/**
 * Interface for logging operations
 * Defines the contract for logging functionality
 */
class ILogger {
    /**
     * Log header message
     * @param {string} title - Header title
     */
    header(title) {
        throw new Error('Method not implemented');
    }

    /**
     * Log section message
     * @param {string} title - Section title
     */
    section(title) {
        throw new Error('Method not implemented');
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} data - Optional data
     */
    info(message, data = null) {
        throw new Error('Method not implemented');
    }

    /**
     * Log success message
     * @param {string} message - Success message
     */
    success(message) {
        throw new Error('Method not implemented');
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} details - Optional details
     */
    warn(message, details = null) {
        throw new Error('Method not implemented');
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} error - Optional error object
     */
    error(message, error = null) {
        throw new Error('Method not implemented');
    }

    /**
     * Log event message
     * @param {string} eventName - Event name
     * @param {Object} data - Optional event data
     */
    event(eventName, data = null) {
        throw new Error('Method not implemented');
    }
}

export default ILogger;