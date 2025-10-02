import ConsoleLogger from '../main/implementations/ConsoleLogger.js';

/**
 * Logger Service
 * Provides centralized logging functionality for the application
 * Implements the Service pattern with dependency injection support
 */
class LoggerService {
    constructor(logger = null) {
        this.logger = logger || new ConsoleLogger();
    }

    /**
     * Log header message
     * @param {string} title - Header title
     */
    header(title) {
        this.logger.header(title);
    }

    /**
     * Log section message
     * @param {string} title - Section title
     */
    section(title) {
        this.logger.section(title);
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} data - Optional data
     */
    info(message, data = null) {
        this.logger.info(message, data);
    }

    /**
     * Log success message
     * @param {string} message - Success message
     */
    success(message) {
        this.logger.success(message);
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} details - Optional details
     */
    warn(message, details = null) {
        this.logger.warn(message, details);
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} error - Optional error object
     */
    error(message, error = null) {
        this.logger.error(message, error);
    }

    /**
     * Log event message with smart formatting
     * @param {string} eventName - Event name
     * @param {Object} data - Optional event data
     */
    event(eventName, data = null) {
        this.logger.event(eventName, data);
    }

    /**
     * Format data intelligently based on content
     * @param {*} data - Data to format
     * @returns {string} Formatted data string
     */
    formatData(data) {
        return this.logger.formatData(data);
    }

    /**
     * Format data summary for nested objects (shorter format)
     * @param {*} value - Value to summarize
     * @returns {string} Summary string
     */
    formatDataSummary(value) {
        return this.logger.formatDataSummary(value);
    }
}

// Export singleton instance
export default new LoggerService();