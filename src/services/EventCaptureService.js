/**
 * EventCaptureService
 * 
 * Handles IPC event listener setup, cleanup, and event data normalization
 * for the EventBusMonitor component.
 * 
 * Responsibilities:
 * - IPC event listener registration (onWorkerEvent, onEventBusMessage)
 * - Event listener cleanup and unsubscription
 * - Event data normalization and transformation
 * - Event monitoring lifecycle management
 */

class EventCaptureService {
    constructor() {
        this.listeners = new Map();
        this.isMonitoring = false;
    }

    /**
     * Start event monitoring on the main process
     * @param {Object} options - Monitoring options
     * @param {boolean} options.enableDebug - Enable debug mode
     * @param {boolean} options.captureAll - Capture all events
     * @param {boolean} options.includeFlaggedOff - Include flagged off events
     * @returns {Promise<Object>} Result object with success status
     */
    async startMonitoring(options = {}) {
        if (!window.api) {
            console.error('❌ EventCaptureService: window.api not available');
            return { success: false, error: 'window.api not available' };
        }

        const monitoringOptions = {
            enableDebug: options.enableDebug ?? true,
            captureAll: options.captureAll ?? true,
            includeFlaggedOff: options.includeFlaggedOff ?? true
        };

        try {
            const result = await window.api.startEventMonitoring(monitoringOptions);
            if (result.success) {
                this.isMonitoring = true;
                console.log('✅ EventCaptureService: Event monitoring started on main process');
            } else {
                console.error('❌ EventCaptureService: Failed to start event monitoring:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ EventCaptureService: Error starting event monitoring:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop event monitoring on the main process
     * @returns {Promise<Object>} Result object with success status
     */
    async stopMonitoring() {
        if (!window.api) {
            return { success: false, error: 'window.api not available' };
        }

        try {
            await window.api.stopEventMonitoring();
            this.isMonitoring = false;
            console.log('🧹 EventCaptureService: Event monitoring stopped on main process');
            return { success: true };
        } catch (error) {
            console.error('❌ EventCaptureService: Error stopping event monitoring:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Subscribe to worker events from IPC
     * @param {Function} callback - Callback function to handle worker events
     * @returns {Function} Unsubscribe function
     */
    subscribeToWorkerEvents(callback) {
        if (!window.api) {
            console.error('❌ EventCaptureService: window.api not available for worker events');
            return () => {};
        }

        const handler = (data) => {
            console.log('🎯 EventCaptureService: Worker event received:', data);
            const normalizedEvent = this.normalizeEventData(data);
            callback(normalizedEvent);
        };

        window.api.onWorkerEvent(handler);
        this.listeners.set('worker', handler);

        console.log('✅ EventCaptureService: Subscribed to worker events');

        return () => {
            if (window.api) {
                window.api.removeWorkerEventListener();
                this.listeners.delete('worker');
                console.log('🧹 EventCaptureService: Unsubscribed from worker events');
            }
        };
    }

    /**
     * Subscribe to event bus messages from IPC
     * @param {Function} callback - Callback function to handle event bus messages
     * @returns {Function} Unsubscribe function
     */
    subscribeToEventBusMessages(callback) {
        if (!window.api) {
            console.error('❌ EventCaptureService: window.api not available for event bus messages');
            return () => {};
        }

        const handler = (event, data) => {
            console.log('🎯 EventCaptureService: EventBus message received:', data);
            const normalizedEvent = this.normalizeEventData(data);
            callback(normalizedEvent);
        };

        window.api.onEventBusMessage(handler);
        this.listeners.set('eventbus', handler);

        console.log('✅ EventCaptureService: Subscribed to event bus messages');

        return () => {
            if (window.api && this.listeners.has('eventbus')) {
                window.api.offEventBusMessage(this.listeners.get('eventbus'));
                this.listeners.delete('eventbus');
                console.log('🧹 EventCaptureService: Unsubscribed from event bus messages');
            }
        };
    }

    /**
     * Normalize event data to a consistent format
     * @param {Object} eventData - Raw event data from IPC
     * @returns {Object} Normalized event data
     */
    normalizeEventData(eventData) {
        return {
            eventName: eventData.eventName || 'unknown',
            data: eventData.data || eventData,
            timestamp: eventData.timestamp || new Date().toISOString(),
            source: eventData.source || 'unknown'
        };
    }

    /**
     * Create an event object for the event list
     * @param {Object} eventData - Normalized event data
     * @param {Function} detectCategoryFn - Function to detect event category
     * @returns {Object} Event object for display
     */
    createEventObject(eventData, detectCategoryFn) {
        return {
            id: Date.now() + Math.random(),
            type: eventData.eventName || 'unknown',
            category: detectCategoryFn ? detectCategoryFn(eventData.eventName, eventData.data) : 'CUSTOM',
            timestamp: eventData.timestamp || new Date().toISOString(),
            data: eventData.data || eventData,
            raw: JSON.stringify(eventData, null, 2)
        };
    }

    /**
     * Cleanup all event listeners
     */
    cleanup() {
        console.log('🧹 EventCaptureService: Cleaning up all listeners');
        
        if (window.api) {
            // Remove worker event listener
            if (this.listeners.has('worker')) {
                window.api.removeWorkerEventListener();
                this.listeners.delete('worker');
            }

            // Remove event bus message listener
            if (this.listeners.has('eventbus')) {
                window.api.offEventBusMessage(this.listeners.get('eventbus'));
                this.listeners.delete('eventbus');
            }

            // Stop monitoring
            if (this.isMonitoring) {
                this.stopMonitoring();
            }
        }

        this.listeners.clear();
        console.log('✅ EventCaptureService: Cleanup complete');
    }

    /**
     * Check if event monitoring is active
     * @returns {boolean} True if monitoring is active
     */
    isActive() {
        return this.isMonitoring;
    }

    /**
     * Get the number of active listeners
     * @returns {number} Number of active listeners
     */
    getListenerCount() {
        return this.listeners.size;
    }
}

// Export singleton instance
export default new EventCaptureService();