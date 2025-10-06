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
 * - Console and exception interception integration
 */

import ConsoleInterceptorService from './ConsoleInterceptorService.js';

class EventCaptureService {
    constructor() {
        this.listeners = new Map();
        this.isMonitoring = false;
        this.eventBuffer = [];
        this.maxBufferSize = 1000;
        this.eventCallbacks = new Set();
        this.consoleUnregister = null;
        
        // Start monitoring immediately on service creation (only in browser environment)
        if (typeof window !== 'undefined') {
            this.initializeBackgroundMonitoring();
        }
    }
    
    /**
     * Initialize background event monitoring that runs independently of UI state
     */
    async initializeBackgroundMonitoring() {
        // Skip initialization if not in browser environment
        if (typeof window === 'undefined') {
            console.log('⚠️ EventCaptureService: Skipping background monitoring (not in browser environment)');
            return;
        }
        
        console.log('🔄 EventCaptureService: Initializing background monitoring');
        
        // Wait a bit for window.api to be available
        const waitForApi = () => {
            return new Promise((resolve) => {
                const checkApi = () => {
                    if (window.api) {
                        resolve();
                    } else {
                        setTimeout(checkApi, 100);
                    }
                };
                checkApi();
            });
        };
        
        await waitForApi();
        
        // Start persistent monitoring
        await this.startPersistentMonitoring();
    }
    
    /**
     * Start persistent background monitoring (always active)
     */
    async startPersistentMonitoring() {
        if (this.isMonitoring) {
            console.log('✅ EventCaptureService: Background monitoring already active');
            return { success: true };
        }
        
        try {
            // Start monitoring on main process
            const result = await window.api.startEventMonitoring({
                enableDebug: true,
                captureAll: true,
                includeFlaggedOff: true
            });
            
            if (result.success) {
                this.isMonitoring = true;
                console.log('✅ EventCaptureService: Background monitoring started');
                
                // Set up persistent event listeners
                this.setupPersistentListeners();
            }
            
            return result;
        } catch (error) {
            console.error('❌ EventCaptureService: Failed to start background monitoring:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Set up persistent event listeners that always capture events
     */
    setupPersistentListeners() {
        // Handler for worker events
        const workerHandler = (data) => {
            // Log frame events for debugging
            if (data.eventName === 'frameStarted' || data.eventName === 'frameCompleted') {
                console.log(`🎬 [EventCaptureService] Received ${data.eventName} - Frame ${data.data?.frameNumber || 'unknown'}`);
            }
            
            const normalizedEvent = this.normalizeEventData(data);
            this.addToBuffer(normalizedEvent);
            this.notifyCallbacks(normalizedEvent);
        };
        
        // Handler for event bus messages
        const eventBusHandler = (ipcEvent, eventData) => {
            // Log frame events for debugging
            if (eventData.eventName === 'frameStarted' || eventData.eventName === 'frameCompleted') {
                console.log(`🎬 [EventCaptureService] Received via EventBus ${eventData.eventName} - Frame ${eventData.data?.frameNumber || 'unknown'}`);
            }
            
            const normalizedEvent = this.normalizeEventData(eventData);
            this.addToBuffer(normalizedEvent);
            this.notifyCallbacks(normalizedEvent);
        };
        
        // Subscribe to IPC channels
        window.api.onWorkerEvent(workerHandler);
        window.api.onEventBusMessage(eventBusHandler);
        
        this.listeners.set('worker', workerHandler);
        this.listeners.set('eventbus', eventBusHandler);
        
        // Set up console and exception interception
        this.setupConsoleInterception();
        
        console.log('✅ EventCaptureService: Persistent listeners established');
    }
    
    /**
     * Set up console and exception interception
     */
    setupConsoleInterception() {
        // BROWSER CONSOLE INTERCEPTION DISABLED
        // Node.js console (main process) is captured via NodeConsoleInterceptor in main.js
        // Browser console interception causes feedback loops and is not needed
        console.log('⚠️ EventCaptureService: Browser console interception DISABLED (Node console captured in main process)');
        return;
        
        // Start console interception
        ConsoleInterceptorService.startIntercepting();
        
        // Register callback to receive console events
        this.consoleUnregister = ConsoleInterceptorService.registerCallback((eventData) => {
            // Add to buffer and notify callbacks
            this.addToBuffer(eventData);
            this.notifyCallbacks(eventData);
        });
        
        console.log('✅ EventCaptureService: Console interception established');
    }
    
    /**
     * Add event to internal buffer
     */
    addToBuffer(eventData) {
        this.eventBuffer.unshift(eventData);
        
        // Keep buffer size manageable
        if (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer = this.eventBuffer.slice(0, this.maxBufferSize);
        }
    }
    
    /**
     * Notify all registered callbacks about new event
     */
    notifyCallbacks(eventData) {
        const eventName = eventData.eventName || 'unknown';
        if (eventName === 'frameStarted' || eventName === 'frameCompleted') {
            console.log(`📢 [EventCaptureService] Notifying ${this.eventCallbacks.size} callbacks about: ${eventName}`);
        }
        
        this.eventCallbacks.forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                console.error('❌ EventCaptureService: Error in event callback:', error);
            }
        });
    }
    
    /**
     * Register a callback to receive events (for UI components)
     */
    registerCallback(callback) {
        this.eventCallbacks.add(callback);
        console.log('✅ EventCaptureService: Callback registered, total:', this.eventCallbacks.size);
        
        // Return unregister function
        return () => {
            this.eventCallbacks.delete(callback);
            console.log('🧹 EventCaptureService: Callback unregistered, remaining:', this.eventCallbacks.size);
        };
    }
    
    /**
     * Get all buffered events
     */
    getBufferedEvents() {
        return [...this.eventBuffer];
    }
    
    /**
     * Clear event buffer
     */
    clearBuffer() {
        this.eventBuffer = [];
        console.log('🧹 EventCaptureService: Event buffer cleared');
    }

    /**
     * Start event monitoring on the main process
     * @param {Object} options - Monitoring options
     * @param {Function} options.onEvent - Callback function to handle events
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
                
                // Subscribe to IPC channels if callback is provided
                if (options.onEvent) {
                    console.log('✅ EventCaptureService: Setting up IPC event listeners');
                    this.subscribeToWorkerEvents(options.onEvent);
                    this.subscribeToEventBusMessages(options.onEvent);
                }
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
            // Clean up IPC listeners first
            if (this.listeners.has('worker')) {
                window.api.removeWorkerEventListener();
                this.listeners.delete('worker');
                console.log('🧹 EventCaptureService: Removed worker event listener');
            }

            if (this.listeners.has('eventbus')) {
                window.api.offEventBusMessage(this.listeners.get('eventbus'));
                this.listeners.delete('eventbus');
                console.log('🧹 EventCaptureService: Removed event bus listener');
            }
            
            // Clean up console interception
            if (this.consoleUnregister) {
                this.consoleUnregister();
                this.consoleUnregister = null;
                console.log('🧹 EventCaptureService: Unregistered console callback');
            }
            
            // Note: We don't stop ConsoleInterceptorService here as it should remain active
            // for the lifetime of the application to capture all console activity

            // Stop monitoring on main process
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

        // Clean up existing listener if any
        if (this.listeners.has('worker')) {
            console.log('🧹 EventCaptureService: Removing existing worker listener before subscribing');
            window.api.removeWorkerEventListener();
            this.listeners.delete('worker');
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

        // Clean up existing listener if any
        if (this.listeners.has('eventbus')) {
            console.log('🧹 EventCaptureService: Removing existing eventbus listener before subscribing');
            window.api.offEventBusMessage(this.listeners.get('eventbus'));
            this.listeners.delete('eventbus');
        }

        const handler = (ipcEvent, eventData) => {
            console.log('🎯 EventCaptureService: EventBus message received via IPC');
            console.log('🎯 EventCaptureService: IPC Event object:', ipcEvent);
            console.log('🎯 EventCaptureService: Event data:', eventData);
            // The eventData parameter contains the actual event object sent from main process
            const normalizedEvent = this.normalizeEventData(eventData);
            console.log('🎯 EventCaptureService: Normalized event:', normalizedEvent);
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
        const rawEventName = eventData.eventName || 'unknown';
        
        // Map event names from my-nft-gen library to standard names
        // This ensures render loop events are recognized by EventBusMonitor
        const eventNameMap = {
            // Frame events - map various formats to standard names
            'frame.complete': 'frameCompleted',
            'frame.render.complete': 'frameCompleted',
            'frameComplete': 'frameCompleted',
            'frame.start': 'frameStarted',
            'frame.render.start': 'frameStarted',
            'frameStart': 'frameStarted',
            'frame.error': 'frameError',
            'frame.render.error': 'frameError',
            // Keep standard names as-is
            'frameCompleted': 'frameCompleted',
            'frameStarted': 'frameStarted',
            'frameError': 'frameError',
            'render.loop.start': 'render.loop.start',
            'render.loop.complete': 'render.loop.complete',
            'render.loop.error': 'render.loop.error',
            'project.resume.start': 'project.resume.start'
        };
        
        // Normalize the event name
        const normalizedEventName = eventNameMap[rawEventName] || rawEventName;
        
        // Log mapping if event name was changed
        if (normalizedEventName !== rawEventName) {
            console.log(`🔄 EventCaptureService: Mapped event name '${rawEventName}' → '${normalizedEventName}'`);
        }
        
        return {
            eventName: normalizedEventName,
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