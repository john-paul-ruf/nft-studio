/**
 * Interface for Event Monitoring Operations
 * 
 * This interface defines the contract for monitoring system events,
 * including event capture, filtering, analysis, and reporting.
 * 
 * @interface IEventMonitor
 */
export class IEventMonitor {
    /**
     * Starts monitoring system events
     * 
     * @param {Object} [options] - Monitoring options
     * @param {Array<string>} [options.eventTypes] - Types of events to monitor
     * @param {number} [options.bufferSize] - Event buffer size
     * @param {boolean} [options.realTime] - Enable real-time monitoring
     * @returns {Promise<void>}
     */
    async startMonitoring(options = {}) {
        throw new Error('IEventMonitor.startMonitoring() must be implemented');
    }

    /**
     * Stops monitoring system events
     * 
     * @returns {Promise<void>}
     */
    async stopMonitoring() {
        throw new Error('IEventMonitor.stopMonitoring() must be implemented');
    }

    /**
     * Pauses event monitoring temporarily
     * 
     * @returns {Promise<void>}
     */
    async pauseMonitoring() {
        throw new Error('IEventMonitor.pauseMonitoring() must be implemented');
    }

    /**
     * Resumes paused event monitoring
     * 
     * @returns {Promise<void>}
     */
    async resumeMonitoring() {
        throw new Error('IEventMonitor.resumeMonitoring() must be implemented');
    }

    /**
     * Gets current monitoring status
     * 
     * @returns {MonitoringStatus} Current monitoring status
     */
    getMonitoringStatus() {
        throw new Error('IEventMonitor.getMonitoringStatus() must be implemented');
    }

    /**
     * Captures a specific event
     * 
     * @param {Object} event - Event to capture
     * @param {string} event.type - Event type
     * @param {Object} event.data - Event data
     * @param {number} [event.timestamp] - Event timestamp
     * @returns {Promise<string>} Event ID
     */
    async captureEvent(event) {
        throw new Error('IEventMonitor.captureEvent() must be implemented');
    }

    /**
     * Gets captured events with optional filtering
     * 
     * @param {Object} [filter] - Event filter criteria
     * @param {Array<string>} [filter.types] - Event types to include
     * @param {number} [filter.startTime] - Start time filter
     * @param {number} [filter.endTime] - End time filter
     * @param {number} [filter.limit] - Maximum number of events
     * @returns {Promise<Array<Object>>} Array of captured events
     */
    async getEvents(filter = {}) {
        throw new Error('IEventMonitor.getEvents() must be implemented');
    }

    /**
     * Gets event statistics and metrics
     * 
     * @param {Object} [options] - Statistics options
     * @param {number} [options.timeWindow] - Time window for statistics
     * @param {Array<string>} [options.eventTypes] - Event types to analyze
     * @returns {Promise<EventStatistics>} Event statistics
     */
    async getEventStatistics(options = {}) {
        throw new Error('IEventMonitor.getEventStatistics() must be implemented');
    }

    /**
     * Clears captured events from buffer
     * 
     * @param {Object} [criteria] - Clear criteria
     * @param {Array<string>} [criteria.types] - Event types to clear
     * @param {number} [criteria.olderThan] - Clear events older than timestamp
     * @returns {Promise<number>} Number of events cleared
     */
    async clearEvents(criteria = {}) {
        throw new Error('IEventMonitor.clearEvents() must be implemented');
    }

    /**
     * Sets event filters for monitoring
     * 
     * @param {Array<Object>} filters - Array of filter definitions
     * @returns {Promise<void>}
     */
    async setEventFilters(filters) {
        throw new Error('IEventMonitor.setEventFilters() must be implemented');
    }

    /**
     * Adds a new event filter
     * 
     * @param {Object} filter - Filter definition
     * @param {string} filter.id - Unique filter ID
     * @param {string} filter.type - Filter type
     * @param {Object} filter.criteria - Filter criteria
     * @returns {Promise<void>}
     */
    async addEventFilter(filter) {
        throw new Error('IEventMonitor.addEventFilter() must be implemented');
    }

    /**
     * Removes an event filter
     * 
     * @param {string} filterId - Filter ID to remove
     * @returns {Promise<boolean>} True if filter was removed
     */
    async removeEventFilter(filterId) {
        throw new Error('IEventMonitor.removeEventFilter() must be implemented');
    }

    /**
     * Gets current event filters
     * 
     * @returns {Array<Object>} Array of active filters
     */
    getEventFilters() {
        throw new Error('IEventMonitor.getEventFilters() must be implemented');
    }

    /**
     * Sets event listeners for real-time monitoring
     * 
     * @param {Object} listeners - Event listener functions
     * @param {Function} [listeners.onEvent] - New event callback
     * @param {Function} [listeners.onError] - Error callback
     * @param {Function} [listeners.onStatusChange] - Status change callback
     */
    setEventListeners(listeners) {
        throw new Error('IEventMonitor.setEventListeners() must be implemented');
    }

    /**
     * Analyzes event patterns and anomalies
     * 
     * @param {Object} [options] - Analysis options
     * @param {number} [options.timeWindow] - Time window for analysis
     * @param {Array<string>} [options.patterns] - Patterns to look for
     * @returns {Promise<EventAnalysis>} Event analysis results
     */
    async analyzeEvents(options = {}) {
        throw new Error('IEventMonitor.analyzeEvents() must be implemented');
    }

    /**
     * Creates an event snapshot for debugging
     * 
     * @param {string} [description] - Snapshot description
     * @returns {Promise<string>} Snapshot ID
     */
    async createSnapshot(description = '') {
        throw new Error('IEventMonitor.createSnapshot() must be implemented');
    }

    /**
     * Gets monitoring configuration
     * 
     * @returns {Object} Current monitoring configuration
     */
    getConfiguration() {
        throw new Error('IEventMonitor.getConfiguration() must be implemented');
    }

    /**
     * Updates monitoring configuration
     * 
     * @param {Object} config - New configuration
     * @returns {Promise<void>}
     */
    async updateConfiguration(config) {
        throw new Error('IEventMonitor.updateConfiguration() must be implemented');
    }
}

/**
 * Monitoring status enumeration
 * @typedef {string} MonitoringStatus
 * @enum {string}
 */
export const MonitoringStatus = {
    STOPPED: 'stopped',
    STARTING: 'starting',
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPING: 'stopping',
    ERROR: 'error'
};

/**
 * Event statistics structure
 * @typedef {Object} EventStatistics
 * @property {number} totalEvents - Total number of events
 * @property {Object} eventsByType - Events grouped by type
 * @property {number} eventsPerSecond - Average events per second
 * @property {Object} timeDistribution - Event distribution over time
 * @property {Array<Object>} topEventTypes - Most frequent event types
 * @property {number} bufferUtilization - Buffer utilization percentage
 */

/**
 * Event analysis structure
 * @typedef {Object} EventAnalysis
 * @property {Array<Object>} patterns - Detected patterns
 * @property {Array<Object>} anomalies - Detected anomalies
 * @property {Object} trends - Event trends over time
 * @property {Array<string>} recommendations - Analysis recommendations
 * @property {number} analysisTimestamp - When analysis was performed
 */