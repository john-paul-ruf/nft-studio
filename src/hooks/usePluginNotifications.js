import { useState, useEffect } from 'react';

/**
 * Hook to handle plugin notifications
 * Listens for plugin loaded success/error events from main process
 *
 * Updated in Phase 5 to support new orchestrator events
 */
export function usePluginNotifications() {
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        // Legacy: Listen for plugin loading success
        const unsubscribeSuccess = window.api.on('plugins:loaded-success', (data) => {
            console.log('✅ [usePluginNotifications] Plugins loaded successfully:', data);
            setNotification({
                type: 'success',
                message: data.message || 'Plugins loaded successfully',
                open: true
            });

            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                setNotification(prev => prev ? { ...prev, open: false } : null);
            }, 5000);
        });

        // Legacy: Listen for plugin loading errors
        const unsubscribeError = window.api.on('plugins:loaded-error', (data) => {
            console.error('❌ [usePluginNotifications] Plugin loading failed:', data);
            setNotification({
                type: 'error',
                message: data.message || 'Failed to load plugins',
                open: true
            });

            // Auto-dismiss after 7 seconds for errors
            setTimeout(() => {
                setNotification(prev => prev ? { ...prev, open: false } : null);
            }, 7000);
        });

        // NEW: Listen for orchestrator operation progress (for final notifications)
        const unsubscribeProgress = window.api.on('plugins:operation-progress', (data) => {
            // Only show notifications for completion/error phases
            if (data.phase === 'complete') {
                const messages = {
                    install: `Plugin "${data.plugin}" installed successfully`,
                    uninstall: `Plugin "${data.plugin}" uninstalled successfully`,
                    reload: `Plugin "${data.plugin}" reloaded successfully`,
                    'bulk-load': 'Plugins loaded successfully'
                };

                setNotification({
                    type: 'success',
                    message: messages[data.operation] || data.message || 'Operation completed successfully',
                    open: true
                });

                setTimeout(() => {
                    setNotification(prev => prev ? { ...prev, open: false } : null);
                }, 5000);
            } else if (data.phase === 'error') {
                setNotification({
                    type: 'error',
                    message: data.message || 'Plugin operation failed',
                    open: true
                });

                setTimeout(() => {
                    setNotification(prev => prev ? { ...prev, open: false } : null);
                }, 7000);
            }
        });

        // Cleanup listeners on unmount
        return () => {
            if (unsubscribeSuccess) unsubscribeSuccess();
            if (unsubscribeError) unsubscribeError();
            if (unsubscribeProgress) unsubscribeProgress();
        };
    }, []);

    const closeNotification = () => {
        setNotification(prev => prev ? { ...prev, open: false } : null);
    };

    return { notification, closeNotification };
}

export default usePluginNotifications;