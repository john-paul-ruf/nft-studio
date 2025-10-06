const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class FileLogger {
    constructor() {
        this.logFile = null;
        this.initialized = false;
        this.pendingLogs = [];
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Wait for app to be ready before accessing userData path
            if (!app.isReady()) {
                await app.whenReady();
            }
            
            const userDataPath = app.getPath('userData');
            this.logFile = path.join(userDataPath, 'plugin-debug.log');
            
            // Clear previous log
            fs.writeFileSync(this.logFile, `=== Plugin Debug Log - ${new Date().toISOString()} ===\n\n`);
            
            this.initialized = true;
            
            // Write any pending logs
            if (this.pendingLogs.length > 0) {
                this.pendingLogs.forEach(logLine => {
                    try {
                        fs.appendFileSync(this.logFile, logLine);
                    } catch (error) {
                        console.error('Failed to write pending log:', error);
                    }
                });
                this.pendingLogs = [];
            }
            
            this.log('FileLogger initialized at:', this.logFile);
        } catch (error) {
            console.error('Failed to initialize FileLogger:', error);
        }
    }

    log(...args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message}\n`;
        
        // Always log to console
        console.log(...args);
        
        // If not initialized yet, queue the log
        if (!this.initialized) {
            this.pendingLogs.push(logLine);
            // Try to initialize if not already in progress
            if (!this.initPromise) {
                this.initPromise = this.initialize();
            }
            return;
        }
        
        // Write to file if initialized
        if (this.logFile) {
            try {
                fs.appendFileSync(this.logFile, logLine);
            } catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }

    getLogPath() {
        return this.logFile;
    }
}

// Export singleton instance
module.exports = new FileLogger();