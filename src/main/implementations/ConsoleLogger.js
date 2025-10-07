
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
        console.log(`🚀 ${title.toUpperCase()}`);
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
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        if (data !== null && data !== undefined) {
            console.log(`ℹ️  [${timestamp}] ${message} - ${this.formatData(data)}`);
        } else {
            console.log(`ℹ️  [${timestamp}] ${message}`);
        }
    }

    /**
     * Log success message
     * @param {string} message - Success message
     */
    success(message) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        console.log(`✅ [${timestamp}] ${message}`);
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} details - Optional details
     */
    warn(message, details = null) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        console.log(`⚠️  [${timestamp}] ${message}`);
        if (details) console.log('   🔍 Details:', details);
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} error - Optional error object
     */
    error(message, error = null) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        console.log(`❌ [${timestamp}] ${message}`);
        if (error) {
            // Format Error objects to show their properties
            const formattedError = this.formatError(error);
            console.log('   💥 Error:', formattedError);
        }
    }

    /**
     * Format Error objects to extract their properties
     * @param {*} error - Error object or any value
     * @returns {*} Formatted error or original value
     */
    formatError(error) {
        if (error instanceof Error) {
            return {
                message: error.message,
                name: error.name,
                code: error.code,
                stack: error.stack
            };
        }
        return error;
    }

    /**
     * Log event message with smart formatting
     * @param {string} eventName - Event name
     * @param {Object} data - Optional event data
     */
    event(eventName, data = null) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
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
            'frame-completed': this.formatFrameCompletedEvent,
            'workerStarted': this.formatWorkerStartedEvent,
            'worker-started': this.formatWorkerStartedEvent,
            'workerCompleted': this.formatWorkerCompletedEvent,
            'worker-completed': this.formatWorkerCompletedEvent,
            'projectProgress': this.formatProjectProgressEvent,
            'project-progress': this.formatProjectProgressEvent,
            'GENERATION_ERROR': this.formatGenerationErrorEvent,
            'generation-error': this.formatGenerationErrorEvent,
            'GENERATION_COMPLETE': this.formatGenerationCompleteEvent,
            'generation-complete': this.formatGenerationCompleteEvent
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
            const progress = Math.round(data.progress || 0); // progress is already a percentage (1-100)
            const timeStr = data.durationMs ? `${data.durationMs}ms` : 'N/A';
            console.log(`🎬 [${timestamp}] frame-completed - Frame ${data.frame || data.frameNumber}/${data.total || data.totalFrames} completed (${progress}%) - ${timeStr}`);
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
            console.log(`👷 [${timestamp}] worker-started: frames ${frameStart}-${frameEnd} (${totalFrames} total) - ${data.workerId}`);
        } else if (data && data.workerId) {
            console.log(`👷 [${timestamp}] worker-started - ${data.workerId}`);
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
            const progress = Math.round(data.progress || ((data.completedFrames / data.totalFrames) * 100));
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
        console.log(`🚨 [${timestamp}] generation-error: ${data?.message || data?.error || 'Unknown error'}`);
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
            const duration = data.totalDurationMs ? `${(data.totalDurationMs / 1000).toFixed(1)}s` : (data.duration || 'N/A');
            const frames = data.totalFrames || 'N/A';
            console.log(`🎉 [${timestamp}] generation-complete: ${frames} frames in ${duration}`);
            if (data.outputDirectory || data.outputPath) {
                console.log(`   📁 Output: ${data.outputDirectory || data.outputPath}`);
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
            console.log('   📊 Data:', this.formatData(data));
        }
    }

    /**
     * Format data intelligently based on content
     * @param {*} data - Data to format
     * @returns {string} Formatted data string
     */
    formatData(data) {
        if (data === null || data === undefined) return 'null';
        if (typeof data === 'string') return `"${data}"`;
        if (typeof data === 'number' || typeof data === 'boolean') return String(data);

        // Format arrays concisely
        if (Array.isArray(data)) {
            if (data.length === 0) return '[]';
            if (data.length <= 3) {
                return `[${data.map(item => this.formatDataSummary(item)).join(',')}]`;
            }
            return `[${data.length} items: ${data.slice(0, 2).map(item => this.formatDataSummary(item)).join(',')}, ...]`;
        }

        // Format objects based on their content
        if (typeof data === 'object') {
            // Specific formatting for known data types
            if (data.frameNumber !== undefined) {
                return `Frame ${data.frameNumber}${data.totalFrames ? `/${data.totalFrames}` : ''}${data.renderTime ? ` (${data.renderTime}ms)` : ''}`;
            }
            if (data.progress !== undefined) {
                return `Progress: ${data.progress}%${data.frameNumber ? ` (frame ${data.frameNumber})` : ''}`;
            }
            if (data.projectName && data.effectsCount !== undefined) {
                return `Project: ${data.projectName} (${data.effectsCount} effects)`;
            }
            if (data.error || data.message) {
                return data.error || data.message;
            }

            // Generic object formatting - show key summary
            const keys = Object.keys(data);
            if (keys.length === 0) return '{}';
            if (keys.length <= 3) {
                return `{${keys.map(key => `${key}: ${this.formatDataSummary(data[key])}`).join(', ')}}`;
            }
            return `{${keys.length} keys: ${keys.slice(0, 2).join(', ')}, ...}`;
        }

        return String(data);
    }

    /**
     * Format data summary for nested objects (shorter format)
     * @param {*} value - Value to summarize
     * @returns {string} Summary string
     */
    formatDataSummary(value) {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'string') return `"${value.length > 20 ? value.substring(0, 20) + '...' : value}"`;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (Array.isArray(value)) return `[${value.length}]`;
        if (typeof value === 'object') return `{${Object.keys(value).length}}`;
        return String(value);
    }
}

export default ConsoleLogger;