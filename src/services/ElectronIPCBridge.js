/**
 * ElectronIPCBridge Service - Phase 4.5.2
 * 
 * Wrapper around IPC calls with error handling, logging, and retry logic.
 * Provides a unified interface for main process ↔ renderer process communication.
 * 
 * Features:
 * - Wraps window.electronAPI IPC calls
 * - Automatic logging of all IPC calls via EffectsPanelLogger
 * - Timeout handling with configurable retry logic
 * - Request/response tracking
 * - Error recovery strategies
 * - Type-safe IPC method declarations
 * 
 * @class ElectronIPCBridge
 */

export class ElectronIPCBridge {
    constructor({
        logger = null,
        defaultTimeout = 5000,
        maxRetries = 3,
        retryDelay = 1000,
    } = {}) {
        this.logger = logger;
        this.defaultTimeout = defaultTimeout;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;

        // Access to window.electronAPI
        this.electronAPI = typeof window !== 'undefined' ? window.electronAPI : null;

        // Tracking
        this.requestMap = new Map(); // Track pending requests by ID
        this.callStats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            timeoutCalls: 0,
            retriedCalls: 0,
        };

        this.nextRequestId = 0;
    }

    /**
     * Generate unique request ID
     * @private
     */
    _getNextRequestId() {
        return `req_${++this.nextRequestId}_${Date.now()}`;
    }

    /**
     * Sleep for a given duration
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if IPC is available
     */
    isAvailable() {
        return this.electronAPI !== null && typeof this.electronAPI === 'object';
    }

    /**
     * Invoke an IPC method on the main process
     * @param {string} channel - IPC channel name
     * @param {*} args - Arguments to pass to the main process
     * @param {Object} options - Options for this call
     * @returns {Promise}
     */
    async invoke(channel, args = null, options = {}) {
        const timeout = options.timeout ?? this.defaultTimeout;
        const maxRetries = options.maxRetries ?? this.maxRetries;

        if (!this.isAvailable()) {
            this._logError(channel, 'send', args, null, 'IPC not available');
            throw new Error('Electron IPC not available');
        }

        let lastError = null;
        let attemptCount = 0;

        while (attemptCount <= maxRetries) {
            attemptCount++;
            const requestId = this._getNextRequestId();
            const startTime = Date.now();

            try {
                this.callStats.totalCalls++;

                // Set timeout wrapper
                const invokePromise = this.electronAPI.invoke(channel, args);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('IPC timeout')), timeout)
                );

                const response = await Promise.race([invokePromise, timeoutPromise]);
                const duration = Date.now() - startTime;

                this._logSuccess(channel, 'invoke', args, response, duration);
                this.callStats.successfulCalls++;
                this.requestMap.delete(requestId);

                return response;
            } catch (error) {
                lastError = error;
                const duration = Date.now() - startTime;

                if (error.message === 'IPC timeout') {
                    this.callStats.timeoutCalls++;
                    this._logTimeout(channel, 'invoke', args, duration);
                } else {
                    this._logError(channel, 'invoke', args, null, error.message, duration);
                }

                // Retry if we haven't exceeded max retries
                if (attemptCount <= maxRetries) {
                    this.callStats.retriedCalls++;
                    this.logger?.logDebug(
                        `Retrying IPC call ${channel} (attempt ${attemptCount}/${maxRetries})`,
                        { error: error.message }
                    );
                    await this._sleep(this.retryDelay * attemptCount); // Exponential backoff
                    continue;
                }

                // Max retries exceeded
                break;
            }
        }

        // All retries failed
        this.callStats.failedCalls++;
        this.logger?.logError(
            `Failed to invoke IPC method '${channel}' after ${attemptCount} attempts`,
            lastError,
            { channel, attemptCount, maxRetries }
        );
        throw lastError || new Error(`Failed to invoke ${channel}`);
    }

    /**
     * Send an async message to the main process (fire and forget)
     * @param {string} channel - IPC channel name
     * @param {*} args - Arguments to pass
     */
    send(channel, args = null) {
        if (!this.isAvailable()) {
            this.logger?.logError(
                `IPC send failed: IPC not available`,
                null,
                { channel }
            );
            return;
        }

        const startTime = Date.now();
        try {
            this.callStats.totalCalls++;
            this.electronAPI.send(channel, args);
            const duration = Date.now() - startTime;
            this._logSuccess(channel, 'send', args, null, duration);
            this.callStats.successfulCalls++;
        } catch (error) {
            const duration = Date.now() - startTime;
            this._logError(channel, 'send', args, null, error.message, duration);
            this.callStats.failedCalls++;
            this.logger?.logError(
                `IPC send failed on channel '${channel}'`,
                error,
                { channel }
            );
        }
    }

    /**
     * Listen for async messages from the main process
     * @param {string} channel - IPC channel name
     * @param {Function} listener - Callback function
     */
    on(channel, listener) {
        if (!this.isAvailable()) {
            this.logger?.logError(
                `Cannot listen on channel: IPC not available`,
                null,
                { channel }
            );
            return;
        }

        try {
            // Wrap listener to add logging
            const wrappedListener = (...args) => {
                this.logger?.logDebug(`IPC received on channel '${channel}'`, {
                    argsCount: args.length,
                });
                try {
                    listener(...args);
                } catch (error) {
                    this.logger?.logError(
                        `Error handling IPC message on channel '${channel}'`,
                        error,
                        { channel }
                    );
                }
            };

            this.electronAPI.on(channel, wrappedListener);
        } catch (error) {
            this.logger?.logError(
                `Failed to set up IPC listener on channel '${channel}'`,
                error,
                { channel }
            );
        }
    }

    /**
     * Remove a listener from a channel
     * @param {string} channel - IPC channel name
     * @param {Function} listener - Listener to remove
     */
    off(channel, listener) {
        if (!this.isAvailable()) {
            return;
        }

        try {
            this.electronAPI.off(channel, listener);
        } catch (error) {
            this.logger?.logDebug(
                `Error removing IPC listener from channel '${channel}'`,
                { error: error.message }
            );
        }
    }

    /**
     * Log successful IPC call
     * @private
     */
    _logSuccess(channel, direction, payload, response, duration) {
        if (this.logger?.logIPCCall) {
            this.logger.logIPCCall(channel, direction, payload, response, duration);
        } else {
            console.log(`[IPC:${direction.toUpperCase()}] ${channel} (${duration}ms)`);
        }
    }

    /**
     * Log IPC timeout
     * @private
     */
    _logTimeout(channel, direction, payload, duration) {
        if (this.logger?.logIPCCall) {
            this.logger.logIPCCall(
                channel,
                direction,
                payload,
                null,
                duration,
                new Error('Timeout')
            );
        } else {
            console.warn(`[IPC:${direction.toUpperCase()}:TIMEOUT] ${channel} (${duration}ms)`);
        }
    }

    /**
     * Log IPC error
     * @private
     */
    _logError(channel, direction, payload, response, errorMessage, duration = 0) {
        if (this.logger?.logIPCCall) {
            this.logger.logIPCCall(
                channel,
                direction,
                payload,
                response,
                duration,
                new Error(errorMessage)
            );
        } else {
            console.error(`[IPC:${direction.toUpperCase()}:ERROR] ${channel}:`, errorMessage);
        }
    }

    /**
     * Get IPC statistics
     */
    getStatistics() {
        return {
            ...this.callStats,
            successRate: this.callStats.totalCalls > 0
                ? ((this.callStats.successfulCalls / this.callStats.totalCalls) * 100).toFixed(2) + '%'
                : 'N/A',
        };
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.callStats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            timeoutCalls: 0,
            retriedCalls: 0,
        };
    }
}

export default ElectronIPCBridge;