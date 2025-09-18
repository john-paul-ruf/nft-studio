/**
 * React-specific implementation of navigation service
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class ReactNavigationService {
    constructor() {
        this.currentView = 'intro';
        this.viewHistory = ['intro'];
        this.subscribers = new Set();
        this.viewParams = new Map();
    }

    /**
     * Navigate to view
     * @param {string} viewName - Name of view to navigate to
     * @param {Object} params - Optional navigation parameters
     */
    navigateTo(viewName, params = {}) {
        if (!viewName || typeof viewName !== 'string') {
            throw new Error('View name is required and must be a string');
        }

        const previousView = this.currentView;
        this.currentView = viewName;

        // Add to history if different from current view
        if (previousView !== viewName) {
            this.viewHistory.push(viewName);
        }

        // Store parameters
        if (Object.keys(params).length > 0) {
            this.viewParams.set(viewName, params);
        }

        // Notify subscribers
        this.notifySubscribers({
            type: 'navigate',
            from: previousView,
            to: viewName,
            params
        });
    }

    /**
     * Get current view
     * @returns {string} Current view name
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Get current view parameters
     * @returns {Object} Current view parameters
     */
    getCurrentViewParams() {
        return this.viewParams.get(this.currentView) || {};
    }

    /**
     * Go back to previous view
     */
    goBack() {
        if (!this.canGoBack()) {
            console.warn('Cannot go back - no previous view in history');
            return;
        }

        // Remove current view from history
        this.viewHistory.pop();

        // Get previous view
        const previousView = this.viewHistory[this.viewHistory.length - 1];
        const currentView = this.currentView;

        this.currentView = previousView;

        // Notify subscribers
        this.notifySubscribers({
            type: 'back',
            from: currentView,
            to: previousView,
            params: this.getCurrentViewParams()
        });
    }

    /**
     * Check if can go back
     * @returns {boolean} True if can go back
     */
    canGoBack() {
        return this.viewHistory.length > 1;
    }

    /**
     * Subscribe to navigation changes
     * @param {Function} callback - Callback for navigation changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        this.subscribers.add(callback);

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Clear navigation history
     */
    clearHistory() {
        this.viewHistory = [this.currentView];
        this.viewParams.clear();
    }

    /**
     * Get navigation history
     * @returns {Array} Array of view names in history
     */
    getHistory() {
        return [...this.viewHistory];
    }

    /**
     * Replace current view (without adding to history)
     * @param {string} viewName - Name of view to replace with
     * @param {Object} params - Optional navigation parameters
     */
    replace(viewName, params = {}) {
        if (!viewName || typeof viewName !== 'string') {
            throw new Error('View name is required and must be a string');
        }

        const previousView = this.currentView;
        this.currentView = viewName;

        // Replace in history instead of adding
        this.viewHistory[this.viewHistory.length - 1] = viewName;

        // Store parameters
        if (Object.keys(params).length > 0) {
            this.viewParams.set(viewName, params);
        }

        // Notify subscribers
        this.notifySubscribers({
            type: 'replace',
            from: previousView,
            to: viewName,
            params
        });
    }

    /**
     * Reset navigation to initial state
     * @param {string} initialView - Initial view name
     */
    reset(initialView = 'intro') {
        const previousView = this.currentView;
        this.currentView = initialView;
        this.viewHistory = [initialView];
        this.viewParams.clear();

        // Notify subscribers
        this.notifySubscribers({
            type: 'reset',
            from: previousView,
            to: initialView,
            params: {}
        });
    }

    /**
     * Notify all subscribers of navigation changes
     * @param {Object} navigationEvent - Navigation event data
     */
    notifySubscribers(navigationEvent) {
        this.subscribers.forEach(callback => {
            try {
                callback(navigationEvent);
            } catch (error) {
                console.error('Error in navigation subscriber:', error);
            }
        });
    }

    /**
     * Check if view exists in history
     * @param {string} viewName - View name to check
     * @returns {boolean} True if view exists in history
     */
    hasInHistory(viewName) {
        return this.viewHistory.includes(viewName);
    }
}

export default ReactNavigationService;