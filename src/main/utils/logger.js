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
        const timestamp = new Date().toLocaleTimeString();
        console.log(`ℹ️  [${timestamp}] ${message}`);
        if (data && typeof data === 'object') {
            console.log('   📊 Data:', JSON.stringify(data, null, 2));
        }
    },

    success: (message) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`✅ [${timestamp}] ${message}`);
    },

    warn: (message, details = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`⚠️  [${timestamp}] ${message}`);
        if (details) console.log('   🔍 Details:', details);
    },

    error: (message, error = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`❌ [${timestamp}] ${message}`);
        if (error) console.log('   💥 Error:', error);
    },

    event: (eventName, data = null) => {
        const timestamp = new Date().toLocaleTimeString();

        // Format events based on their type for better readability
        switch (eventName) {
            case 'frameCompleted':
                if (data) {
                    const progress = Math.round((data.progress || 0) * 100);
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
                    const progress = Math.round((data.completedFrames / data.totalFrames) * 100);
                    console.log(`📊 [${timestamp}] Project Progress: ${data.completedFrames}/${data.totalFrames} frames (${progress}%)`);
                    if (data.estimatedTimeRemaining) {
                        console.log(`   ⏱️  ETA: ${data.estimatedTimeRemaining}`);
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
                    console.log('   📊 Data:', JSON.stringify(data, null, 2));
                }
                break;
        }
    }
};

module.exports = logger;