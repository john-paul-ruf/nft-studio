/**
 * Interface for Render Coordination and Management
 * 
 * This interface defines the contract for coordinating render operations,
 * managing render queues, and handling render lifecycle events.
 * 
 * @interface IRenderCoordinator
 */
export class IRenderCoordinator {
    /**
     * Starts the render process for a project
     * 
     * @param {Object} project - Project to render
     * @param {Object} [options] - Render options
     * @param {string} [options.outputFormat] - Output format (png, jpg, gif, etc.)
     * @param {number} [options.quality] - Render quality (0-100)
     * @param {boolean} [options.preview] - Whether this is a preview render
     * @returns {Promise<RenderResult>} Render operation result
     * @throws {RenderError} When render operation fails
     */
    async startRender(project, options = {}) {
        throw new Error('IRenderCoordinator.startRender() must be implemented');
    }

    /**
     * Pauses the current render operation
     * 
     * @returns {Promise<void>}
     * @throws {RenderError} When no render is in progress
     */
    async pauseRender() {
        throw new Error('IRenderCoordinator.pauseRender() must be implemented');
    }

    /**
     * Resumes a paused render operation
     * 
     * @returns {Promise<void>}
     * @throws {RenderError} When no render is paused
     */
    async resumeRender() {
        throw new Error('IRenderCoordinator.resumeRender() must be implemented');
    }

    /**
     * Cancels the current render operation and cleans up resources
     * 
     * @returns {Promise<void>}
     */
    async cancelRender() {
        throw new Error('IRenderCoordinator.cancelRender() must be implemented');
    }

    /**
     * Gets the current render status
     * 
     * @returns {RenderStatus} Current render status
     */
    getRenderStatus() {
        throw new Error('IRenderCoordinator.getRenderStatus() must be implemented');
    }

    /**
     * Gets render progress information
     * 
     * @returns {RenderProgress} Current render progress
     */
    getRenderProgress() {
        throw new Error('IRenderCoordinator.getRenderProgress() must be implemented');
    }

    /**
     * Adds a render job to the queue
     * 
     * @param {Object} renderJob - Render job configuration
     * @returns {Promise<string>} Job ID for tracking
     */
    async queueRender(renderJob) {
        throw new Error('IRenderCoordinator.queueRender() must be implemented');
    }

    /**
     * Removes a render job from the queue
     * 
     * @param {string} jobId - Job ID to remove
     * @returns {Promise<boolean>} True if job was removed
     */
    async removeFromQueue(jobId) {
        throw new Error('IRenderCoordinator.removeFromQueue() must be implemented');
    }

    /**
     * Gets all jobs in the render queue
     * 
     * @returns {Array<Object>} Array of queued render jobs
     */
    getQueuedJobs() {
        throw new Error('IRenderCoordinator.getQueuedJobs() must be implemented');
    }

    /**
     * Clears all jobs from the render queue
     * 
     * @returns {Promise<void>}
     */
    async clearQueue() {
        throw new Error('IRenderCoordinator.clearQueue() must be implemented');
    }

    /**
     * Sets render event listeners
     * 
     * @param {Object} listeners - Event listener functions
     * @param {Function} [listeners.onProgress] - Progress update callback
     * @param {Function} [listeners.onComplete] - Completion callback
     * @param {Function} [listeners.onError] - Error callback
     * @param {Function} [listeners.onCancel] - Cancellation callback
     */
    setEventListeners(listeners) {
        throw new Error('IRenderCoordinator.setEventListeners() must be implemented');
    }
}

/**
 * Render result structure
 * @typedef {Object} RenderResult
 * @property {boolean} success - Whether render completed successfully
 * @property {string} outputPath - Path to rendered output
 * @property {number} duration - Render duration in milliseconds
 * @property {Object} metadata - Render metadata (dimensions, format, etc.)
 * @property {Array<string>} warnings - Any warnings during render
 */

/**
 * Render status enumeration
 * @typedef {string} RenderStatus
 * @enum {string}
 */
export const RenderStatus = {
    IDLE: 'idle',
    QUEUED: 'queued',
    RENDERING: 'rendering',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ERROR: 'error'
};

/**
 * Render progress structure
 * @typedef {Object} RenderProgress
 * @property {number} percentage - Completion percentage (0-100)
 * @property {number} currentFrame - Current frame being rendered
 * @property {number} totalFrames - Total frames to render
 * @property {number} elapsedTime - Elapsed time in milliseconds
 * @property {number} estimatedTimeRemaining - Estimated time remaining in milliseconds
 * @property {string} currentOperation - Description of current operation
 */