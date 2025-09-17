/**
 * Interface for navigation operations in frontend
 * Defines the contract for view navigation
 */
class INavigationService {
    /**
     * Navigate to view
     * @param {string} viewName - Name of view to navigate to
     * @param {Object} params - Optional navigation parameters
     */
    navigateTo(viewName, params = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get current view
     * @returns {string} Current view name
     */
    getCurrentView() {
        throw new Error('Method not implemented');
    }

    /**
     * Go back to previous view
     */
    goBack() {
        throw new Error('Method not implemented');
    }

    /**
     * Check if can go back
     * @returns {boolean} True if can go back
     */
    canGoBack() {
        throw new Error('Method not implemented');
    }

    /**
     * Subscribe to navigation changes
     * @param {Function} callback - Callback for navigation changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        throw new Error('Method not implemented');
    }
}

module.exports = INavigationService;