import { useState, useEffect, useCallback } from 'react';
import { useNavigationService } from '../contexts/ServiceContext.js';

/**
 * Custom hook for navigation operations
 * Follows Single Responsibility Principle - only handles navigation state and operations
 */
export function useNavigation() {
    const navigationService = useNavigationService();
    const [currentView, setCurrentView] = useState(navigationService.getCurrentView());
    const [currentParams, setCurrentParams] = useState(navigationService.getCurrentViewParams());
    const [canGoBack, setCanGoBack] = useState(navigationService.canGoBack());

    /**
     * Navigate to a view
     * @param {string} viewName - Name of view to navigate to
     * @param {Object} params - Optional navigation parameters
     */
    const navigateTo = useCallback((viewName, params = {}) => {
        navigationService.navigateTo(viewName, params);
    }, [navigationService]);

    /**
     * Go back to previous view
     */
    const goBack = useCallback(() => {
        navigationService.goBack();
    }, [navigationService]);

    /**
     * Replace current view (without adding to history)
     * @param {string} viewName - Name of view to replace with
     * @param {Object} params - Optional navigation parameters
     */
    const replace = useCallback((viewName, params = {}) => {
        navigationService.replace(viewName, params);
    }, [navigationService]);

    /**
     * Reset navigation to initial state
     * @param {string} initialView - Initial view name
     */
    const reset = useCallback((initialView = 'intro') => {
        navigationService.reset(initialView);
    }, [navigationService]);

    /**
     * Clear navigation history
     */
    const clearHistory = useCallback(() => {
        navigationService.clearHistory();
    }, [navigationService]);

    /**
     * Get navigation history
     * @returns {Array} Navigation history
     */
    const getHistory = useCallback(() => {
        return navigationService.getHistory();
    }, [navigationService]);

    /**
     * Check if view exists in history
     * @param {string} viewName - View name to check
     * @returns {boolean} True if view exists in history
     */
    const hasInHistory = useCallback((viewName) => {
        return navigationService.hasInHistory(viewName);
    }, [navigationService]);

    // Subscribe to navigation changes
    useEffect(() => {
        const unsubscribe = navigationService.subscribe((navigationEvent) => {
            setCurrentView(navigationService.getCurrentView());
            setCurrentParams(navigationService.getCurrentViewParams());
            setCanGoBack(navigationService.canGoBack());
        });

        return unsubscribe;
    }, [navigationService]);

    // View-specific navigation helpers
    const navigateToIntro = useCallback((params = {}) => {
        navigateTo('intro', params);
    }, [navigateTo]);

    const navigateToWizard = useCallback((params = {}) => {
        navigateTo('wizard', params);
    }, [navigateTo]);

    const navigateToCanvas = useCallback((params = {}) => {
        navigateTo('canvas', params);
    }, [navigateTo]);

    /**
     * Check if currently on specific view
     * @param {string} viewName - View name to check
     * @returns {boolean} True if on specified view
     */
    const isOnView = useCallback((viewName) => {
        return currentView === viewName;
    }, [currentView]);

    /**
     * Get current view parameter
     * @param {string} paramName - Parameter name
     * @param {*} defaultValue - Default value if parameter not found
     * @returns {*} Parameter value
     */
    const getParam = useCallback((paramName, defaultValue = null) => {
        return currentParams[paramName] || defaultValue;
    }, [currentParams]);

    /**
     * Check if parameter exists
     * @param {string} paramName - Parameter name
     * @returns {boolean} True if parameter exists
     */
    const hasParam = useCallback((paramName) => {
        return paramName in currentParams;
    }, [currentParams]);

    return {
        // State
        currentView,
        currentParams,
        canGoBack,

        // Actions
        navigateTo,
        goBack,
        replace,
        reset,
        clearHistory,

        // View-specific helpers
        navigateToIntro,
        navigateToWizard,
        navigateToCanvas,

        // Computed helpers
        isOnView,
        getParam,
        hasParam,
        getHistory,
        hasInHistory,

        // Computed properties
        isOnIntro: currentView === 'intro',
        isOnWizard: currentView === 'wizard',
        isOnCanvas: currentView === 'canvas'
    };
}

/**
 * Hook for view-specific navigation
 * @param {string} viewName - View name
 * @returns {Object} View-specific navigation helpers
 */
export function useViewNavigation(viewName) {
    const { navigateTo, isOnView, getParam, hasParam } = useNavigation();

    const navigate = useCallback((params = {}) => {
        navigateTo(viewName, params);
    }, [navigateTo, viewName]);

    const isActive = useCallback(() => {
        return isOnView(viewName);
    }, [isOnView, viewName]);

    return {
        navigate,
        isActive,
        getParam,
        hasParam
    };
}