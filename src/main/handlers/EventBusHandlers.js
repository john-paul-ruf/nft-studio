import { ipcMain, BrowserWindow } from 'electron';
import defaultLogger from '../utils/logger.js';

/**
 * IPC handlers for comprehensive EventBus monitoring
 * Captures ALL events including debug and flagged-off events
 */
class EventBusHandlers {
    constructor(logger = null) {
        this.logger = logger || defaultLogger;
        this.eventBus = null;
        this.isMonitoring = false;
        this.eventBuffer = [];
        this.maxBufferSize = 1000;
        this.captureConfig = {
            enableDebug: true,
            captureAll: true,
            includeFlaggedOff: true
        };
    }

    register() {
        // Start comprehensive event monitoring
        ipcMain.handle('start-event-monitoring', async (event, config) => {
            try {
                this.captureConfig = { ...this.captureConfig, ...config };
                await this.startMonitoring();
                return { success: true };
            } catch (error) {
                this.logger.error('Failed to start event monitoring', error);
                return { success: false, error: error.message };
            }
        });

        // Stop event monitoring
        ipcMain.handle('stop-event-monitoring', async () => {
            try {
                this.stopMonitoring();
                return { success: true };
            } catch (error) {
                this.logger.error('Failed to stop event monitoring', error);
                return { success: false, error: error.message };
            }
        });

        // Get buffered events
        ipcMain.handle('get-event-buffer', () => {
            return this.eventBuffer;
        });

        // Clear event buffer
        ipcMain.handle('clear-event-buffer', () => {
            this.eventBuffer = [];
            return { success: true };
        });

        // Test IPC channel - sends a test event to renderer
        ipcMain.handle('test-ipc-channel', () => {
            console.log('🧪 [EventBusHandlers] Test IPC invoked from renderer');
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                console.log(`🧪 [EventBusHandlers] Sending test worker-event to ${windows.length} window(s)`);
                windows[0].webContents.send('worker-event', {
                    eventName: 'TEST_EVENT',
                    data: { message: 'This is a test event', timestamp: Date.now() }
                });
                return { success: true, message: 'Test event sent' };
            }
            return { success: false, message: 'No windows available' };
        });

        this.logger.success('EventBusHandlers registered');
    }

    async startMonitoring() {
        if (this.isMonitoring) {
            this.logger.info('Event monitoring already active');
            return;
        }

        this.isMonitoring = true;
        this.logger.header('Starting Comprehensive Event Monitoring');

        // Import UnifiedEventBus
        const { UnifiedEventBus } = await import('my-nft-gen/src/core/events/UnifiedEventBus.js');

        // Create event bus with all debugging enabled
        this.eventBus = new UnifiedEventBus({
            enableDebug: true,
            enableMetrics: true,
            enableEventHistory: true,
            maxHistorySize: this.maxBufferSize
        });

        // DISABLED: Console interception floods the event system with console.log events
        // and prevents actual progress events (frameCompleted, etc.) from being visible
        // this.interceptConsoleLogs();

        // Subscribe to ALL possible events
        this.subscribeToAllEvents();

        // Also monitor worker events if available
        this.monitorWorkerEvents();

        this.logger.success('Comprehensive event monitoring started');
    }

    interceptConsoleLogs() {
        const originalLog = console.log;
        const originalDebug = console.debug;
        const originalInfo = console.info;
        const originalWarn = console.warn;
        const originalError = console.error;

        // Intercept all console methods
        console.log = (...args) => {
            this.captureEvent('console.log', { message: args.join(' '), type: 'log' });
            originalLog.apply(console, args);
        };

        console.debug = (...args) => {
            this.captureEvent('console.debug', { message: args.join(' '), type: 'debug' });
            originalDebug.apply(console, args);
        };

        console.info = (...args) => {
            this.captureEvent('console.info', { message: args.join(' '), type: 'info' });
            originalInfo.apply(console, args);
        };

        console.warn = (...args) => {
            this.captureEvent('console.warn', { message: args.join(' '), type: 'warning' });
            originalWarn.apply(console, args);
        };

        console.error = (...args) => {
            this.captureEvent('console.error', { message: args.join(' '), type: 'error' });
            originalError.apply(console, args);
        };

        // Store originals for restoration
        this.originalConsole = {
            log: originalLog,
            debug: originalDebug,
            info: originalInfo,
            warn: originalWarn,
            error: originalError
        };
    }

    subscribeToAllEvents() {
        if (!this.eventBus) return;

        // Subscribe to all known event categories
        const categories = ['frame', 'effect', 'fileIo', 'performance', 'resource', 'error', 'lifecycle', 'progress'];

        categories.forEach(category => {
            this.eventBus.subscribeToCategory(category, (data) => {
                this.captureEvent(`category.${category}`, data);
            });
        });

        // Also subscribe to all events generically
        this.eventBus.subscribeToAllEvents((data) => {
            this.captureEvent(data.eventName || 'unknown', data);
        });

        // Subscribe to custom events
        this.eventBus.on('*', (data) => {
            this.captureEvent('wildcard', data);
        });
    }

    monitorWorkerEvents() {
        // Import worker event monitoring if available
        import('my-nft-gen/src/core/events/WorkerEventLogger.js')
            .then(({ WorkerEventLogger }) => {
                // Enable all worker event logging
                if (WorkerEventLogger) {
                    this.logger.info('Enabling WorkerEventLogger monitoring');
                    // This would need to be implemented in the worker module
                }
            })
            .catch(err => {
                this.logger.warn('WorkerEventLogger not available', err);
            });
    }

    captureEvent(eventName, data) {
        if (!this.isMonitoring) return;

        const event = {
            eventName,
            data,
            timestamp: Date.now(),
            category: this.detectCategory(eventName),
            source: 'eventbus-monitor'
        };

        // Add to buffer
        this.eventBuffer.push(event);
        if (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer.shift();
        }

        // Send to renderer
        this.sendToRenderer(event);
    }

    detectCategory(eventName) {
        const name = eventName.toLowerCase();
        if (name.includes('frame')) return 'FRAME';
        if (name.includes('effect')) return 'EFFECT';
        if (name.includes('file') || name.includes('write') || name.includes('read')) return 'FILE_IO';
        if (name.includes('memory') || name.includes('timing') || name.includes('performance')) return 'PERFORMANCE';
        if (name.includes('buffer') || name.includes('canvas') || name.includes('resource')) return 'RESOURCE';
        if (name.includes('error') || name.includes('fail') || name.includes('exception')) return 'ERROR';
        if (name.includes('worker') || name.includes('start') || name.includes('complete')) return 'LIFECYCLE';
        if (name.includes('progress')) return 'PROGRESS';
        if (name.includes('render') || name.includes('loop')) return 'RENDER_LOOP';
        if (name.includes('debug') || name.includes('log') || name.includes('console')) return 'DEBUG';
        return 'CUSTOM';
    }

    sendToRenderer(event) {
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            window.webContents.send('eventbus-message', event);
        });
    }

    stopMonitoring() {
        if (!this.isMonitoring) {
            this.logger.info('Event monitoring not active');
            return;
        }

        this.isMonitoring = false;

        // Restore original console methods
        if (this.originalConsole) {
            console.log = this.originalConsole.log;
            console.debug = this.originalConsole.debug;
            console.info = this.originalConsole.info;
            console.warn = this.originalConsole.warn;
            console.error = this.originalConsole.error;
        }

        // Clear event bus
        if (this.eventBus) {
            this.eventBus.removeAllListeners();
            this.eventBus.clear();
            this.eventBus = null;
        }

        this.logger.success('Event monitoring stopped');
    }


    unregister() {
        this.stopMonitoring();
        this.logger.info('EventBusHandlers unregistered');
    }
}

export default EventBusHandlers;