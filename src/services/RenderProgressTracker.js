/**
 * RenderProgressTracker
 * 
 * Handles render progress tracking, ETA calculation, and FPS monitoring
 * for the EventBusMonitor component.
 * 
 * Responsibilities:
 * - Progress calculation from frame events
 * - ETA (Estimated Time of Arrival) estimation
 * - FPS (Frames Per Second) tracking
 * - Frame completion monitoring
 * - Render session lifecycle management
 */

class RenderProgressTracker {
    constructor() {
        this.resetProgress();
    }

    /**
     * Reset progress to initial state
     */
    resetProgress() {
        this.progress = {
            isRendering: false,
            currentFrame: 0,
            totalFrames: 100,
            progress: 0,
            projectName: '',
            fps: 0,
            eta: '',
            startTime: null,
            avgRenderTime: 0,
            lastFrameTime: 0
        };
    }

    /**
     * Get current progress state
     * @returns {Object} Current progress state
     */
    getProgress() {
        return { ...this.progress };
    }

    /**
     * Handle render loop start event
     * @param {Object} eventData - Event data
     * @returns {Object} Updated progress state
     */
    handleRenderLoopStart(eventData) {
        console.log('🎬 RenderProgressTracker: Render loop started');
        
        this.progress = {
            ...this.progress,
            isRendering: true,
            progress: 0,
            currentFrame: 0,
            fps: 0,
            eta: '',
            startTime: Date.now(),
            projectName: eventData?.projectName || this.progress.projectName,
            totalFrames: this.progress.totalFrames || 100
        };

        return this.getProgress();
    }

    /**
     * Handle render loop complete event
     * @param {Object} eventData - Event data
     * @returns {Object} Updated progress state
     */
    handleRenderLoopComplete(eventData) {
        console.log('✅ RenderProgressTracker: Render loop completed');
        
        this.progress = {
            ...this.progress,
            isRendering: false,
            progress: 100
        };

        return this.getProgress();
    }

    /**
     * Handle render loop error event
     * @param {Object} eventData - Event data
     * @returns {Object} Updated progress state
     */
    handleRenderLoopError(eventData) {
        console.error('❌ RenderProgressTracker: Render loop error:', eventData);
        
        this.progress = {
            ...this.progress,
            isRendering: false
        };

        return this.getProgress();
    }

    /**
     * Handle frame completed event
     * @param {Object} eventData - Event data with frameNumber, totalFrames, renderTime, projectName
     * @returns {Object} Updated progress state
     */
    handleFrameCompleted(eventData) {
        const { frameNumber, totalFrames, renderTime, projectName } = eventData || {};
        const now = Date.now();

        // If we receive frameCompleted but aren't tracking rendering yet, start tracking
        const shouldStartRendering = !this.progress.isRendering && 
                                     (frameNumber !== undefined || totalFrames !== undefined);
        
        if (!this.progress.isRendering && !shouldStartRendering) {
            return this.getProgress();
        }

        // Calculate progress from frame completion
        const currentFrameNumber = frameNumber !== undefined ? frameNumber : this.progress.currentFrame;
        const currentTotalFrames = totalFrames || this.progress.totalFrames || 100;

        // Convert 0-indexed frameNumber to completed frames count
        const framesCompleted = currentFrameNumber + 1;

        // Calculate progress percentage (1-100)
        const calculatedProgress = Math.min(100, Math.max(1, 
            Math.round((framesCompleted / currentTotalFrames) * 100)
        ));

        // Initialize start time on first frame
        const startTime = this.progress.startTime || (framesCompleted === 1 ? now : now);
        const elapsedTime = (now - startTime) / 1000; // in seconds

        // Calculate FPS and ETA
        const fps = framesCompleted > 0 ? framesCompleted / elapsedTime : 0;
        const remainingFrames = currentTotalFrames - framesCompleted;
        const etaSeconds = fps > 0 ? remainingFrames / fps : 0;

        // Format ETA
        const etaFormatted = this.formatETA(etaSeconds);

        console.log(`🎯 RenderProgressTracker: Frame ${framesCompleted}/${currentTotalFrames} = ${calculatedProgress}%`);

        this.progress = {
            ...this.progress,
            isRendering: shouldStartRendering || this.progress.isRendering,
            currentFrame: currentFrameNumber,
            totalFrames: currentTotalFrames,
            progress: calculatedProgress,
            projectName: projectName || this.progress.projectName,
            fps: Math.round(fps * 10) / 10,
            eta: etaFormatted,
            lastFrameTime: renderTime || 0,
            avgRenderTime: framesCompleted > 0 ? Math.round(elapsedTime * 1000 / framesCompleted) : 0,
            startTime: shouldStartRendering ? now : startTime
        };

        return this.getProgress();
    }

    /**
     * Handle frame started event
     * @param {Object} eventData - Event data with frameNumber, totalFrames, projectName
     * @returns {Object} Updated progress state
     */
    handleFrameStarted(eventData) {
        const { frameNumber, totalFrames, projectName } = eventData || {};
        
        // If this is the first frame and we're not already rendering, start tracking
        const shouldStartRendering = !this.progress.isRendering && 
                                     (frameNumber === 0 || frameNumber === undefined);
        
        this.progress = {
            ...this.progress,
            isRendering: shouldStartRendering || this.progress.isRendering,
            totalFrames: totalFrames || this.progress.totalFrames,
            projectName: projectName || this.progress.projectName,
            startTime: shouldStartRendering ? Date.now() : this.progress.startTime
        };

        return this.getProgress();
    }

    /**
     * Format ETA seconds to human-readable string
     * @param {number} etaSeconds - ETA in seconds
     * @returns {string} Formatted ETA string
     */
    formatETA(etaSeconds) {
        if (etaSeconds <= 0) {
            return '';
        }

        const hours = Math.floor(etaSeconds / 3600);
        const minutes = Math.floor((etaSeconds % 3600) / 60);
        const seconds = Math.floor(etaSeconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Calculate FPS from elapsed time and frames completed
     * @param {number} framesCompleted - Number of frames completed
     * @param {number} elapsedTimeMs - Elapsed time in milliseconds
     * @returns {number} FPS (rounded to 1 decimal place)
     */
    calculateFPS(framesCompleted, elapsedTimeMs) {
        if (framesCompleted <= 0 || elapsedTimeMs <= 0) {
            return 0;
        }

        const elapsedSeconds = elapsedTimeMs / 1000;
        const fps = framesCompleted / elapsedSeconds;
        return Math.round(fps * 10) / 10;
    }

    /**
     * Calculate ETA in seconds
     * @param {number} framesCompleted - Number of frames completed
     * @param {number} totalFrames - Total number of frames
     * @param {number} fps - Current FPS
     * @returns {number} ETA in seconds
     */
    calculateETA(framesCompleted, totalFrames, fps) {
        if (fps <= 0 || framesCompleted >= totalFrames) {
            return 0;
        }

        const remainingFrames = totalFrames - framesCompleted;
        return remainingFrames / fps;
    }

    /**
     * Calculate progress percentage
     * @param {number} currentFrame - Current frame number (0-indexed)
     * @param {number} totalFrames - Total number of frames
     * @returns {number} Progress percentage (1-100)
     */
    calculateProgress(currentFrame, totalFrames) {
        if (totalFrames <= 0) {
            return 0;
        }

        const framesCompleted = currentFrame + 1;
        return Math.min(100, Math.max(1, Math.round((framesCompleted / totalFrames) * 100)));
    }

    /**
     * Stop render tracking
     * @returns {Object} Updated progress state
     */
    stopRendering() {
        console.log('🛑 RenderProgressTracker: Stopping render tracking');
        
        this.progress = {
            ...this.progress,
            isRendering: false,
            progress: 0,
            currentFrame: 0,
            fps: 0,
            eta: '',
            startTime: null
        };

        return this.getProgress();
    }

    /**
     * Check if currently rendering
     * @returns {boolean} True if rendering
     */
    isRendering() {
        return this.progress.isRendering;
    }

    /**
     * Get current frame number
     * @returns {number} Current frame number
     */
    getCurrentFrame() {
        return this.progress.currentFrame;
    }

    /**
     * Get total frames
     * @returns {number} Total frames
     */
    getTotalFrames() {
        return this.progress.totalFrames;
    }

    /**
     * Get current FPS
     * @returns {number} Current FPS
     */
    getFPS() {
        return this.progress.fps;
    }

    /**
     * Get current ETA
     * @returns {string} Current ETA formatted string
     */
    getETA() {
        return this.progress.eta;
    }

    /**
     * Get progress percentage
     * @returns {number} Progress percentage (0-100)
     */
    getProgressPercentage() {
        return this.progress.progress;
    }

    /**
     * Get project name
     * @returns {string} Project name
     */
    getProjectName() {
        return this.progress.projectName;
    }

    /**
     * Set total frames
     * @param {number} totalFrames - Total frames
     */
    setTotalFrames(totalFrames) {
        this.progress.totalFrames = totalFrames;
    }

    /**
     * Set project name
     * @param {string} projectName - Project name
     */
    setProjectName(projectName) {
        this.progress.projectName = projectName;
    }
}

// Export singleton instance
export default new RenderProgressTracker();