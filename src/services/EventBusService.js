/**
 * EventBusService - Single Source of Truth for All Application Events
 * Eliminates prop drilling and provides centralized event management
 */

class EventBusService {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.isLoggingEnabled = true;

        console.log('📡 EventBusService: Initialized - Single source of truth for all events');
    }

    /**
     * Subscribe to events with automatic cleanup
     * @param {string} eventType - Event type to listen for
     * @param {Function} handler - Event handler function
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    subscribe(eventType, handler, options = {}) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }

        const subscription = {
            handler,
            id: Math.random().toString(36).substr(2, 9),
            once: options.once || false,
            component: options.component || 'unknown'
        };

        this.listeners.get(eventType).add(subscription);

        if (this.isLoggingEnabled) {
            console.log(`📡 EventBus: ${options.component} subscribed to '${eventType}'`);
        }

        // Return unsubscribe function
        return () => {
            this.listeners.get(eventType)?.delete(subscription);
            if (this.isLoggingEnabled) {
                console.log(`📡 EventBus: ${options.component} unsubscribed from '${eventType}'`);
            }
        };
    }

    /**
     * Emit events to all subscribers
     * @param {string} eventType - Event type to emit
     * @param {*} payload - Event payload
     * @param {Object} context - Event context for debugging
     */
    emit(eventType, payload, context = {}) {
        const event = {
            type: eventType,
            payload,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9),
            context: {
                source: context.source || 'unknown',
                component: context.component || 'unknown',
                ...context
            }
        };

        // Add to history for debugging/replay
        this.eventHistory.push(event);

        // Keep history manageable
        if (this.eventHistory.length > 1000) {
            this.eventHistory = this.eventHistory.slice(-500);
        }

        if (this.isLoggingEnabled) {
            console.log(`📡 EventBus: Emitting '${eventType}'`, {
                payload,
                context: event.context,
                listenersCount: this.listeners.get(eventType)?.size || 0
            });
        }

        // Notify all subscribers
        const subscribers = this.listeners.get(eventType);
        if (subscribers) {
            const toRemove = [];

            subscribers.forEach(subscription => {
                try {
                    subscription.handler(payload, event);

                    // Remove one-time subscriptions
                    if (subscription.once) {
                        toRemove.push(subscription);
                    }
                } catch (error) {
                    console.error(`📡 EventBus: Error in ${subscription.component} handler for '${eventType}':`, error);
                }
            });

            // Clean up one-time subscriptions
            toRemove.forEach(subscription => subscribers.delete(subscription));
        }
    }

    /**
     * Get event history for debugging
     * @param {string} eventType - Filter by event type (optional)
     * @returns {Array} Event history
     */
    getEventHistory(eventType = null) {
        if (eventType) {
            return this.eventHistory.filter(event => event.type === eventType);
        }
        return [...this.eventHistory];
    }

    /**
     * Replay events for testing/debugging
     * @param {Array} events - Events to replay
     */
    replayEvents(events) {
        console.log('📡 EventBus: Replaying events', events);
        events.forEach(event => {
            this.emit(event.type, event.payload, { ...event.context, isReplay: true });
        });
    }

    /**
     * Clear all subscriptions (for cleanup)
     */
    clear() {
        this.listeners.clear();
        this.eventHistory = [];
        console.log('📡 EventBus: Cleared all subscriptions and history');
    }

    /**
     * Get current subscription stats
     * @returns {Object} Subscription statistics
     */
    getStats() {
        const stats = {};
        this.listeners.forEach((subscribers, eventType) => {
            stats[eventType] = subscribers.size;
        });
        return stats;
    }

    /**
     * Enable/disable event logging
     * @param {boolean} enabled - Whether to enable logging
     */
    setLogging(enabled) {
        this.isLoggingEnabled = enabled;
        console.log(`📡 EventBus: Logging ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export singleton instance
export default new EventBusService();