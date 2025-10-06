/**
 * ConsoleInterceptorService
 * 
 * Intercepts all console methods (log, error, warn, info, debug) and exceptions
 * to provide comprehensive application activity monitoring.
 * 
 * Responsibilities:
 * - Console method interception (log, error, warn, info, debug)
 * - Exception and error capture (window.onerror, unhandledrejection)
 * - Stack trace extraction and formatting
 * - Integration with EventCaptureService for unified event stream
 * 
 * Architecture:
 * - Non-blocking: Uses try-catch to prevent interceptor failures from breaking app
 * - Performant: Minimal overhead, no heavy processing in hot path
 * - Reversible: Can restore original console methods
 */

class ConsoleInterceptorService {
    constructor() {
        this.isIntercepting = false;
        this.originalConsole = {};
        this.originalErrorHandler = null;
        this.originalRejectionHandler = null;
        this.callbacks = new Set();
        
        console.log('🎤 ConsoleInterceptorService: Initialized');
    }
    
    /**
     * Start intercepting console methods and exceptions
     * @returns {boolean} Success status
     */
    startIntercepting() {
        if (this.isIntercepting) {
            console.log('✅ ConsoleInterceptorService: Already intercepting');
            return true;
        }
        
        try {
            // Store original console methods
            this.originalConsole = {
                log: console.log.bind(console),
                error: console.error.bind(console),
                warn: console.warn.bind(console),
                info: console.info.bind(console),
                debug: console.debug.bind(console)
            };
            
            // Intercept console.log
            console.log = (...args) => {
                this.originalConsole.log(...args);
                this.captureConsoleCall('log', args);
            };
            
            // Intercept console.error
            console.error = (...args) => {
                this.originalConsole.error(...args);
                this.captureConsoleCall('error', args);
            };
            
            // Intercept console.warn
            console.warn = (...args) => {
                this.originalConsole.warn(...args);
                this.captureConsoleCall('warn', args);
            };
            
            // Intercept console.info
            console.info = (...args) => {
                this.originalConsole.info(...args);
                this.captureConsoleCall('info', args);
            };
            
            // Intercept console.debug
            console.debug = (...args) => {
                this.originalConsole.debug(...args);
                this.captureConsoleCall('debug', args);
            };
            
            // Intercept window.onerror for uncaught exceptions
            this.originalErrorHandler = window.onerror;
            window.onerror = (message, source, lineno, colno, error) => {
                this.captureException(error || new Error(message), {
                    source,
                    lineno,
                    colno,
                    message
                });
                
                // Call original handler if it exists
                if (this.originalErrorHandler) {
                    return this.originalErrorHandler(message, source, lineno, colno, error);
                }
                return false;
            };
            
            // Intercept unhandled promise rejections
            this.originalRejectionHandler = window.onunhandledrejection;
            window.onunhandledrejection = (event) => {
                this.captureException(event.reason, {
                    type: 'unhandledRejection',
                    promise: event.promise
                });
                
                // Call original handler if it exists
                if (this.originalRejectionHandler) {
                    this.originalRejectionHandler(event);
                }
            };
            
            this.isIntercepting = true;
            this.originalConsole.log('✅ ConsoleInterceptorService: Started intercepting console and exceptions');
            return true;
        } catch (error) {
            this.originalConsole.error('❌ ConsoleInterceptorService: Failed to start intercepting:', error);
            return false;
        }
    }
    
    /**
     * Stop intercepting and restore original console methods
     * @returns {boolean} Success status
     */
    stopIntercepting() {
        if (!this.isIntercepting) {
            console.log('⚠️ ConsoleInterceptorService: Not currently intercepting');
            return true;
        }
        
        try {
            // Restore original console methods
            console.log = this.originalConsole.log;
            console.error = this.originalConsole.error;
            console.warn = this.originalConsole.warn;
            console.info = this.originalConsole.info;
            console.debug = this.originalConsole.debug;
            
            // Restore original error handlers
            if (this.originalErrorHandler) {
                window.onerror = this.originalErrorHandler;
            }
            if (this.originalRejectionHandler) {
                window.onunhandledrejection = this.originalRejectionHandler;
            }
            
            this.isIntercepting = false;
            console.log('🛑 ConsoleInterceptorService: Stopped intercepting');
            return true;
        } catch (error) {
            console.error('❌ ConsoleInterceptorService: Failed to stop intercepting:', error);
            return false;
        }
    }
    
    /**
     * Capture console method call
     * @param {string} level - Console level (log, error, warn, info, debug)
     * @param {Array} args - Console arguments
     */
    captureConsoleCall(level, args) {
        try {
            // Skip internal monitoring system logs to prevent feedback loops
            const firstArg = String(args[0] || '');
            const internalPrefixes = [
                '📂 EventBusMonitor:',
                '📨 EventBusMonitor',
                '🔔 EventBusMonitor:',
                '🧹 EventBusMonitor:',
                '🎯 EventBusMonitor:',
                '🛑 EventBusMonitor:',
                '✅ EventBusMonitor:',
                '🔄 EventCaptureService:',
                '✅ EventCaptureService:',
                '❌ EventCaptureService:',
                '⚠️ EventCaptureService:',
                '🎬 [EventCaptureService]',
                '🎤 ConsoleInterceptorService:',
                '✅ ConsoleInterceptorService:',
                '❌ ConsoleInterceptorService:',
                '⚠️ ConsoleInterceptorService:'
            ];
            
            // Check if this is an internal monitoring log
            if (internalPrefixes.some(prefix => firstArg.startsWith(prefix))) {
                return; // Skip capturing internal logs
            }
            
            // Format arguments for display
            const formattedArgs = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            });
            
            const eventData = {
                eventName: `console.${level}`,
                timestamp: new Date().toISOString(),
                data: {
                    level,
                    message: formattedArgs.join(' '),
                    args: formattedArgs,
                    rawArgs: args
                }
            };
            
            // Notify all callbacks
            this.notifyCallbacks(eventData);
        } catch (error) {
            // Fail silently to prevent infinite loops
            this.originalConsole.error('❌ ConsoleInterceptorService: Error capturing console call:', error);
        }
    }
    
    /**
     * Capture exception with stack trace
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     */
    captureException(error, context = {}) {
        try {
            const stackTrace = this.extractStackTrace(error);
            
            const eventData = {
                eventName: 'exception',
                timestamp: new Date().toISOString(),
                data: {
                    message: error?.message || String(error),
                    name: error?.name || 'Error',
                    stack: stackTrace,
                    context,
                    error: {
                        message: error?.message,
                        name: error?.name,
                        stack: error?.stack
                    }
                }
            };
            
            // Notify all callbacks
            this.notifyCallbacks(eventData);
        } catch (captureError) {
            // Fail silently to prevent infinite loops
            this.originalConsole.error('❌ ConsoleInterceptorService: Error capturing exception:', captureError);
        }
    }
    
    /**
     * Extract and format stack trace from error
     * @param {Error} error - Error object
     * @returns {Array<Object>} Formatted stack trace
     */
    extractStackTrace(error) {
        if (!error || !error.stack) {
            return [];
        }
        
        try {
            const stackLines = error.stack.split('\n');
            const frames = [];
            
            for (let i = 1; i < stackLines.length; i++) {
                const line = stackLines[i].trim();
                
                // Parse stack frame (format: "at functionName (file:line:column)")
                const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
                if (match) {
                    frames.push({
                        function: match[1],
                        file: match[2],
                        line: parseInt(match[3], 10),
                        column: parseInt(match[4], 10),
                        raw: line
                    });
                } else {
                    // Fallback for different stack formats
                    frames.push({
                        raw: line
                    });
                }
            }
            
            return frames;
        } catch (error) {
            this.originalConsole.error('❌ ConsoleInterceptorService: Error parsing stack trace:', error);
            return [{ raw: error.stack }];
        }
    }
    
    /**
     * Register callback to receive intercepted events
     * @param {Function} callback - Callback function
     * @returns {Function} Unregister function
     */
    registerCallback(callback) {
        this.callbacks.add(callback);
        
        if (this.originalConsole.log) {
            this.originalConsole.log('✅ ConsoleInterceptorService: Callback registered, total:', this.callbacks.size);
        }
        
        // Return unregister function
        return () => {
            this.callbacks.delete(callback);
            if (this.originalConsole.log) {
                this.originalConsole.log('🧹 ConsoleInterceptorService: Callback unregistered, remaining:', this.callbacks.size);
            }
        };
    }
    
    /**
     * Notify all registered callbacks
     * @param {Object} eventData - Event data to send
     */
    notifyCallbacks(eventData) {
        this.callbacks.forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                this.originalConsole.error('❌ ConsoleInterceptorService: Error in callback:', error);
            }
        });
    }
    
    /**
     * Check if currently intercepting
     * @returns {boolean} Interception status
     */
    isActive() {
        return this.isIntercepting;
    }
    
    /**
     * Get statistics about intercepted events
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            isIntercepting: this.isIntercepting,
            callbackCount: this.callbacks.size
        };
    }
}

// Export singleton instance
export default new ConsoleInterceptorService();