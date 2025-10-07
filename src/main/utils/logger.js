/**
 * Enhanced logging utilities for better readability
 */
const logger = {
    header: (title) => {
        console.log('\n' + '='.repeat(60));
        console.log(`📋 ${title.toUpperCase()}`);
        console.log('='.repeat(60));
    },

    section: (title) => {
        console.log('\n' + '-'.repeat(40));
        console.log(`🔹 ${title}`);
        console.log('-'.repeat(40));
    },

    info: (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        console.log(`ℹ️  [${timestamp}] ${message}`);
        if (data && typeof data === 'object') {
            console.log('   📊 Data:', logger.formatData(data));
        }
    },

    success: (message) => {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        console.log(`✅ [${timestamp}] ${message}`);
    },

    warn: (message, details = null) => {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        console.log(`⚠️  [${timestamp}] ${message}`);
        if (details) console.log('   🔍 Details:', details);
    },

    error: (message, error = null) => {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        console.log(`❌ [${timestamp}] ${message}`);
        if (error) {
            // Format error object to extract meaningful information
            const errorInfo = logger.formatError(error);
            console.log('   💥 Error:', errorInfo);
        }
    },

    event: (eventName, data = null) => {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        // Format events based on their type for better readability
        switch (eventName) {
            case 'frameCompleted':
                if (data) {
                    const progress = Math.round(data.progress || 0); // progress is already a percentage (1-100)
                    const timeStr = data.durationMs ? `${data.durationMs}ms` : 'N/A';
                    console.log(`🖼️  [${timestamp}] Frame ${data.frameNumber}/${data.totalFrames} completed (${progress}%) - ${timeStr}`);
                    if (data.outputPath) {
                        console.log(`   💾 Saved: ${data.outputPath.split('/').pop()}`);
                    }
                }
                break;

            case 'workerStarted':
                if (data && data.config) {
                    const { frameStart, frameEnd, totalFrames } = data.config;
                    console.log(`🔨 [${timestamp}] Worker started: frames ${frameStart}-${frameEnd} (${totalFrames} total) - ${data.workerId}`);
                }
                break;

            case 'workerCompleted':
                if (data) {
                    const avgTime = data.avgFrameTimeMs ? `${data.avgFrameTimeMs}ms avg` : 'N/A';
                    console.log(`✅ [${timestamp}] Worker completed: ${data.framesProcessed} frames in ${data.totalDurationMs}ms (${avgTime}) - ${data.workerId}`);
                }
                break;

            case 'projectProgress':
                if (data) {
                    const progress = Math.round(data.progress || ((data.completedFrames / data.totalFrames) * 100));
                    console.log(`📊 [${timestamp}] Project Progress: ${data.completedFrames}/${data.totalFrames} frames (${progress}%)`);
                    if (data.estimatedTimeRemaining) {
                        // Parse ETA time string and format appropriately
                        const etaStr = data.estimatedTimeRemaining;

                        // Check if ETA contains more than 24 hours
                        if (etaStr.includes('h') && parseInt(etaStr) >= 24) {
                            // Calculate completion time
                            const now = new Date();
                            const etaMs = logger.parseETAToMs(etaStr);
                            const completionTime = new Date(now.getTime() + etaMs);

                            const completionTimeStr = completionTime.toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                timeZoneName: 'short'
                            });

                            console.log(`   ⏱️  ETA: ${etaStr} (${completionTimeStr})`);
                        } else {
                            console.log(`   ⏱️  ETA: ${etaStr}`);
                        }
                    }
                }
                break;

            case 'GENERATION_ERROR':
                console.log(`🚨 [${timestamp}] Generation Error: ${data?.message || 'Unknown error'}`);
                if (data?.stack) {
                    console.log('   🔍 Stack:', data.stack.split('\n').slice(0, 3).join('\n'));
                }
                break;

            case 'GENERATION_COMPLETE':
                if (data) {
                    const duration = data.totalDurationMs ? `${(data.totalDurationMs / 1000).toFixed(1)}s` : 'N/A';
                    console.log(`🎉 [${timestamp}] Generation Complete: ${data.totalFrames} frames in ${duration}`);
                    if (data.outputDirectory) {
                        console.log(`   📁 Output: ${data.outputDirectory}`);
                    }
                }
                break;

            default:
                console.log(`📡 [${timestamp}] ${eventName}`);
                if (data && typeof data === 'object') {
                    console.log('   📊 Data:', logger.formatData(data));
                }
                break;
        }
    },

    /**
     * Format data intelligently based on content
     * @param {*} data - Data to format
     * @returns {string} Formatted data string
     */
    formatData: (data) => {
        if (data === null || data === undefined) return 'null';
        if (typeof data === 'string') return `"${data}"`;
        if (typeof data === 'number' || typeof data === 'boolean') return String(data);

        // Format arrays concisely
        if (Array.isArray(data)) {
            if (data.length === 0) return '[]';
            if (data.length <= 3) {
                return `[${data.map(item => logger.formatDataSummary(item)).join(', ')}]`;
            }
            return `[${data.length} items: ${data.slice(0, 2).map(item => logger.formatDataSummary(item)).join(', ')}, ...]`;
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
                return `{${keys.map(key => `${key}: ${logger.formatDataSummary(data[key])}`).join(', ')}}`;
            }
            return `{${keys.length} keys: ${keys.slice(0, 2).join(', ')}, ...}`;
        }

        return String(data);
    },

    /**
     * Format data summary for nested objects (shorter format)
     * @param {*} value - Value to summarize
     * @returns {string} Summary string
     */
    formatDataSummary: (value) => {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'string') return `"${value.length > 20 ? value.substring(0, 20) + '...' : value}"`;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (Array.isArray(value)) return `[${value.length}]`;
        if (typeof value === 'object') return `{${Object.keys(value).length}}`;
        return String(value);
    },

    /**
     * Parse ETA string to milliseconds
     * @param {string} etaStr - ETA string like "2h 30m 15s" or "45m 30s"
     * @returns {number} Milliseconds
     */
    parseETAToMs: (etaStr) => {
        let totalMs = 0;

        // Extract hours
        const hourMatch = etaStr.match(/(\d+)h/);
        if (hourMatch) {
            totalMs += parseInt(hourMatch[1]) * 60 * 60 * 1000;
        }

        // Extract minutes
        const minuteMatch = etaStr.match(/(\d+)m/);
        if (minuteMatch) {
            totalMs += parseInt(minuteMatch[1]) * 60 * 1000;
        }

        // Extract seconds
        const secondMatch = etaStr.match(/(\d+)s/);
        if (secondMatch) {
            totalMs += parseInt(secondMatch[1]) * 1000;
        }

        return totalMs;
    },

    /**
     * Format error object to extract meaningful information
     * Error objects don't serialize to JSON properly, so we need to extract their properties
     * @param {Error|Object|string} error - Error to format
     * @returns {Object|string} Formatted error information
     */
    formatError: (error) => {
        // If it's already a string, return it
        if (typeof error === 'string') {
            return error;
        }

        // If it's null or undefined
        if (!error) {
            return 'Unknown error';
        }

        // If it's an Error object or error-like object
        if (error instanceof Error || (error.message !== undefined)) {
            const errorInfo = {
                message: error.message || 'No error message',
                name: error.name || 'Error',
            };

            // Add error code if present
            if (error.code) {
                errorInfo.code = error.code;
            }

            // Add stack trace (first 3 lines for brevity)
            if (error.stack) {
                const stackLines = error.stack.split('\n').slice(0, 4);
                errorInfo.stack = stackLines.join('\n');
            }

            // Add any custom properties
            const customProps = Object.keys(error).filter(
                key => !['message', 'name', 'stack', 'code'].includes(key)
            );
            if (customProps.length > 0) {
                errorInfo.details = {};
                customProps.forEach(key => {
                    errorInfo.details[key] = error[key];
                });
            }

            return errorInfo;
        }

        // If it's a plain object, return it as-is
        if (typeof error === 'object') {
            return error;
        }

        // Fallback: convert to string
        return String(error);
    }
};

export default logger;