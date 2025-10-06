/**
 * NodeConsoleInterceptor
 * 
 * Intercepts Node.js console methods and exceptions in the main Electron process
 * and forwards them to the renderer process via IPC for display in the Event Bus Monitor.
 * 
 * Responsibilities:
 * - Console method interception (log, error, warn, info, debug) in Node.js
 * - Exception capture (uncaughtException, unhandledRejection)
 * - Stack trace extraction and formatting
 * - IPC forwarding to renderer process
 * 
 * Architecture:
 * - Non-blocking: Uses try-catch to prevent interceptor failures
 * - Performant: Minimal overhead, no heavy processing
 * - Reversible: Can restore original console methods
 * - Always active: Starts automatically when imported
 */

class NodeConsoleInterceptor {
    constructor() {
        this.isIntercepting = false;
        this.originalConsole = {};
        this.originalExceptionHandler = null;
        this.originalRejectionHandler = null;
        this.mainWindow = null;
        this.eventBuffer = [];
        this.maxBufferSize = 1000;
        
        console.log('🎤 NodeConsoleInterceptor: Initialized');
    }
    
    /**
     * Set the main window for IPC communication
     * @param {BrowserWindow} window - Electron BrowserWindow instance
     */
    setMainWindow(window) {
        this.mainWindow = window;
        console.log('🪟 NodeConsoleInterceptor: Main window set');
        
        // Send buffered events if any
        if (this.eventBuffer.length > 0) {
            console.log(`📤 NodeConsoleInterceptor: Sending ${this.eventBuffer.length} buffered events`);
            this.eventBuffer.forEach(event => this.sendToRenderer(event));
            this.eventBuffer = [];
        }
    }
    
    /**
     * Start intercepting console methods and exceptions
     * @returns {boolean} Success status
     */
    startIntercepting() {
        if (this.isIntercepting) {
            console.log('✅ NodeConsoleInterceptor: Already intercepting');
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
            
            // Intercept uncaught exceptions
            this.originalExceptionHandler = process.listeners('uncaughtException').slice();
            process.on('uncaughtException', (error) => {
                // Skip EPIPE errors (handled elsewhere)
                if (error.code !== 'EPIPE') {
                    this.captureException(error, { type: 'uncaughtException' });
                }
                
                // Call original handlers
                this.originalExceptionHandler.forEach(handler => {
                    try {
                        handler(error);
                    } catch (e) {
                        // Ignore errors in original handlers
                    }
                });
            });
            
            // Intercept unhandled promise rejections
            this.originalRejectionHandler = process.listeners('unhandledRejection').slice();
            process.on('unhandledRejection', (reason, promise) => {
                this.captureException(reason, {
                    type: 'unhandledRejection',
                    promise: String(promise)
                });
                
                // Call original handlers
                this.originalRejectionHandler.forEach(handler => {
                    try {
                        handler(reason, promise);
                    } catch (e) {
                        // Ignore errors in original handlers
                    }
                });
            });
            
            this.isIntercepting = true;
            this.originalConsole.log('✅ NodeConsoleInterceptor: Started intercepting console and exceptions');
            return true;
        } catch (error) {
            this.originalConsole.error('❌ NodeConsoleInterceptor: Failed to start intercepting:', error);
            return false;
        }
    }
    
    /**
     * Stop intercepting and restore original console methods
     * @returns {boolean} Success status
     */
    stopIntercepting() {
        if (!this.isIntercepting) {
            console.log('⚠️ NodeConsoleInterceptor: Not currently intercepting');
            return true;
        }
        
        try {
            // Restore original console methods
            console.log = this.originalConsole.log;
            console.error = this.originalConsole.error;
            console.warn = this.originalConsole.warn;
            console.info = this.originalConsole.info;
            console.debug = this.originalConsole.debug;
            
            // Remove exception handlers
            process.removeAllListeners('uncaughtException');
            process.removeAllListeners('unhandledRejection');
            
            // Restore original handlers
            if (this.originalExceptionHandler) {
                this.originalExceptionHandler.forEach(handler => {
                    process.on('uncaughtException', handler);
                });
            }
            if (this.originalRejectionHandler) {
                this.originalRejectionHandler.forEach(handler => {
                    process.on('unhandledRejection', handler);
                });
            }
            
            this.isIntercepting = false;
            console.log('🛑 NodeConsoleInterceptor: Stopped intercepting');
            return true;
        } catch (error) {
            console.error('❌ NodeConsoleInterceptor: Failed to stop intercepting:', error);
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
                '🎤 NodeConsoleInterceptor:',
                '✅ NodeConsoleInterceptor:',
                '❌ NodeConsoleInterceptor:',
                '⚠️ NodeConsoleInterceptor:',
                '🪟 NodeConsoleInterceptor:',
                '📤 NodeConsoleInterceptor:',
                '🛑 NodeConsoleInterceptor:',
                '🔍 [Preload',
                '📥 [Preload',
                '🧪 [Preload'
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
                eventName: `node.console.${level}`,
                timestamp: new Date().toISOString(),
                data: {
                    level,
                    message: formattedArgs.join(' '),
                    args: formattedArgs,
                    source: 'node-main-process'
                }
            };
            
            // Send to renderer or buffer
            this.sendToRenderer(eventData);
        } catch (error) {
            // Fail silently to prevent infinite loops
            this.originalConsole.error('❌ NodeConsoleInterceptor: Error capturing console call:', error);
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
                eventName: 'node.exception',
                timestamp: new Date().toISOString(),
                data: {
                    message: error?.message || String(error),
                    name: error?.name || 'Error',
                    stack: stackTrace,
                    context,
                    source: 'node-main-process',
                    error: {
                        message: error?.message,
                        name: error?.name,
                        stack: error?.stack
                    }
                }
            };
            
            // Send to renderer or buffer
            this.sendToRenderer(eventData);
        } catch (captureError) {
            // Fail silently to prevent infinite loops
            this.originalConsole.error('❌ NodeConsoleInterceptor: Error capturing exception:', captureError);
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
            this.originalConsole.error('❌ NodeConsoleInterceptor: Error parsing stack trace:', error);
            return [{ raw: error.stack }];
        }
    }
    
    /**
     * Send event to renderer process via IPC
     * @param {Object} eventData - Event data to send
     */
    sendToRenderer(eventData) {
        try {
            if (this.mainWindow && this.mainWindow.webContents) {
                // Send via worker-event channel (same as other events)
                this.mainWindow.webContents.send('worker-event', eventData);
            } else {
                // Buffer events until window is ready
                this.eventBuffer.push(eventData);
                
                // Keep buffer size manageable
                if (this.eventBuffer.length > this.maxBufferSize) {
                    this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize);
                }
            }
        } catch (error) {
            this.originalConsole.error('❌ NodeConsoleInterceptor: Error sending to renderer:', error);
        }
    }
    
    /**
     * Check if currently intercepting
     * @returns {boolean} Interception status
     */
    isActive() {
        return this.isIntercepting;
    }
    
    /**
     * Get statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            isIntercepting: this.isIntercepting,
            bufferedEvents: this.eventBuffer.length,
            hasMainWindow: !!this.mainWindow
        };
    }
}

// Export singleton instance
export default new NodeConsoleInterceptor();