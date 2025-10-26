import { useState, useEffect, useCallback } from 'react';

/**
 * usePluginLoading Hook
 *
 * Purpose: Manage plugin operation loading state and progress
 * Listens to the 'plugins:operation-progress' IPC event
 * Provides methods to show/hide loading overlay
 *
 * Created in Phase 5 of plugin refactor
 */
export function usePluginLoading() {
    const [operation, setOperation] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Listen for plugin operation progress updates
        const unsubscribe = window.api.on('plugins:operation-progress', (data) => {
            console.log('📊 [usePluginLoading] Progress update:', data);

            setOperation({
                operation: data.operation,
                phase: data.phase,
                message: data.message,
                percent: data.percent,
                plugin: data.plugin
            });

            setVisible(true);

            // Auto-hide on completion or error
            if (data.phase === 'complete' || data.phase === 'error') {
                // Wait longer for complete to ensure all background operations finish
                // Complete: 8 seconds (extra time for file system sync, cache updates, and registry finalization)
                // Error messages show for 3 seconds
                const delayMs = data.phase === 'error' ? 3000 : 8000;
                setTimeout(() => {
                    setVisible(false);
                    setOperation(null);
                }, delayMs);
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    /**
     * Manually show loading overlay
     * @param {Object} operationData - Operation data
     */
    const showLoading = useCallback((operationData) => {
        setOperation(operationData);
        setVisible(true);
    }, []);

    /**
     * Manually hide loading overlay
     */
    const hideLoading = useCallback(() => {
        setVisible(false);
        // Clear operation after animation
        setTimeout(() => {
            setOperation(null);
        }, 300);
    }, []);

    /**
     * Check if a specific operation is in progress
     * @param {string} operationType - Operation type to check
     * @returns {boolean}
     */
    const isOperationInProgress = useCallback((operationType) => {
        return visible && operation?.operation === operationType;
    }, [visible, operation]);

    return {
        operation,
        visible,
        showLoading,
        hideLoading,
        isOperationInProgress
    };
}

export default usePluginLoading;
