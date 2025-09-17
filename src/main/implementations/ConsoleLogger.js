
/**
 * Console-based implementation of logging
 * Follows Open/Closed Principle - open for extension, closed for modification
 * Follows Liskov Substitution Principle - can be substituted for ILogger
 */
class ConsoleLogger {
    /**
     * Log header message
     * @param {string} title - Header title
     */
    header(title) {
        console.log('\n' + '='.repeat(60));
        console.log(`📋 ${title.toUpperCase()}`);
        console.log('='.repeat(60));
    }

    /**
     * Log section message
     * @param {string} title - Section title
     */
    section(title) {
        console.log('\n' + '-'.repeat(40));
        console.log(`🔹 ${title}`);
        console.log('-'.repeat(40));
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} data - Optional data
     */
    info(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`ℹ️  [${timestamp}] ${message}`);
        if (data && typeof data === 'object') {
            console.log('   📊 Data:', JSON.stringify(data, null, 2));
        }
    }

    /**
     * Log success message
     * @param {string} message - Success message
     */
    success(message) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`✅ [${timestamp}] ${message}`);
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} details - Optional details
     */
    warn(message, details = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`⚠️  [${timestamp}] ${message}`);
        if (details) console.log('   🔍 Details:', details);
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} error - Optional error object
     */
    error(message, error = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`❌ [${timestamp}] ${message}`);
        if (error) console.log('   💥 Error:', error);
    }

    /**
     * Log event message with smart formatting
     * @param {string} eventName - Event name
     * @param {Object} data - Optional event data
     */
    event(eventName, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const formatter = this.getEventFormatter(eventName);
        formatter(timestamp, data);
    }

    /**
     * Get appropriate formatter for event type
     * @param {string} eventName - Event name
     * @returns {Function} Formatter function
     */
    getEventFormatter(eventName) {
        const formatters = {
            'frameCompleted': this.formatFrameCompletedEvent,
            'workerStarted': this.formatWorkerStartedEvent,
            'workerCompleted': this.formatWorkerCompletedEvent,
            'projectProgress': this.formatProjectProgressEvent,
            'GENERATION_ERROR': this.formatGenerationErrorEvent,
            'GENERATION_COMPLETE': this.formatGenerationCompleteEvent
        };

        return formatters[eventName] || this.formatGenericEvent.bind(this, eventName);
    }

    /**
     * Format frame completed event
     * @param {string} timestamp - Timestamp
     * @param {Object} data - Event data
     */
    formatFrameCompletedEvent(timestamp, data) {
        if (data) {
            const progress = Math.round((data.progress || 0) * 100);
            const timeStr = data.durationMs ? `${data.durationMs}ms` : 'N/A';
            console.log(`🖼️  [${timestamp}] Frame ${data.frameNumber}/${data.totalFrames} completed (${progress}%) - ${timeStr}`);
            if (data.outputPath) {
                console.log(`   💾 Saved: ${data.outputPath.split('/').pop()}`);
            }
        }
    }

    /**
     * Format worker started event
     * @param {string} timestamp - Timestamp
     * @param {Object} data - Event data
     */
    formatWorkerStartedEvent(timestamp, data) {
        if (data && data.config) {
            const { frameStart, frameEnd, totalFrames } = data.config;
            console.log(`🔨 [${timestamp}] Worker started: frames ${frameStart}-${frameEnd} (${totalFrames} total) - ${data.workerId}`);
        }
    }

    /**
     * Format worker completed event
     * @param {string} timestamp - Timestamp
     * @param {Object} data - Event data
     */
    formatWorkerCompletedEvent(timestamp, data) {
        if (data) {
            const avgTime = data.avgFrameTimeMs ? `${data.avgFrameTimeMs}ms avg` : 'N/A';
            console.log(`✅ [${timestamp}] Worker completed: ${data.framesProcessed} frames in ${data.totalDurationMs}ms (${avgTime}) - ${data.workerId}`);
        }
    }

    /**
     * Format project progress event
     * @param {string} timestamp - Timestamp
     * @param {Object} data - Event data
     */
    formatProjectProgressEvent(timestamp, data) {
        if (data) {
            const progress = Math.round((data.completedFrames / data.totalFrames) * 100);
            console.log(`📊 [${timestamp}] Project Progress: ${data.completedFrames}/${data.totalFrames} frames (${progress}%)`);
            if (data.estimatedTimeRemaining) {
                console.log(`   ⏱️  ETA: ${data.estimatedTimeRemaining}`);
            }
        }
    }

    /**
     * Format generation error event
     * @param {string} timestamp - Timestamp
     * @param {Object} data - Event data
     */
    formatGenerationErrorEvent(timestamp, data) {
        console.log(`🚨 [${timestamp}] Generation Error: ${data?.message || 'Unknown error'}`);
        if (data?.stack) {
            console.log('   🔍 Stack:', data.stack.split('\n').slice(0, 3).join('\n'));
        }
    }

    /**
     * Format generation complete event
     * @param {string} timestamp - Timestamp
     * @param {Object} data - Event data
     */
    formatGenerationCompleteEvent(timestamp, data) {
        if (data) {
            const duration = data.totalDurationMs ? `${(data.totalDurationMs / 1000).toFixed(1)}s` : 'N/A';
            console.log(`🎉 [${timestamp}] Generation Complete: ${data.totalFrames} frames in ${duration}`);
            if (data.outputDirectory) {
                console.log(`   📁 Output: ${data.outputDirectory}`);
            }
        }
    }

    /**
     * Format generic event
     * @param {string} eventName - Event name
     * @param {string} timestamp - Timestamp
     * @param {Object} data - Event data
     */
    formatGenericEvent(eventName, timestamp, data) {
        console.log(`📡 [${timestamp}] ${eventName}`);
        if (data && typeof data === 'object') {
            console.log('   📊 Data:', JSON.stringify(data, null, 2));
        }
    }
}

module.exports = ConsoleLogger;