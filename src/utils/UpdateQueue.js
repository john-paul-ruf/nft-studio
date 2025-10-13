/**
 * UpdateQueue - Sequential Update Processing
 * 
 * Ensures that state updates are processed sequentially to prevent race conditions
 * where rapid updates might read stale state and overwrite each other.
 * 
 * This is critical for effect config updates where users might make rapid changes
 * (e.g., dragging sliders, typing quickly) and we need to ensure each update
 * sees the result of the previous update.
 */

export class UpdateQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.metrics = {
            totalUpdates: 0,
            queuedUpdates: 0,
            processedUpdates: 0,
            droppedUpdates: 0,
            maxQueueSize: 0,
            averageProcessingTime: 0
        };
    }

    /**
     * Enqueue an update operation
     * @param {Function} updateFn - Async function that performs the update
     * @param {Object} options - Options for the update
     * @param {string} options.key - Optional key for deduplication
     * @param {boolean} options.replace - If true, replace pending updates with same key
     * @returns {Promise} Promise that resolves when update is complete
     */
    async enqueue(updateFn, options = {}) {
        const { key = null, replace = false } = options;

        this.metrics.totalUpdates++;

        // If replace is true and key is provided, remove pending updates with same key
        if (replace && key) {
            const beforeLength = this.queue.length;
            this.queue = this.queue.filter(item => item.key !== key);
            const removed = beforeLength - this.queue.length;
            if (removed > 0) {
                this.metrics.droppedUpdates += removed;
                console.log(`🔄 UpdateQueue: Replaced ${removed} pending update(s) with key: ${key}`);
            }
        }

        return new Promise((resolve, reject) => {
            const queueItem = {
                updateFn,
                key,
                resolve,
                reject,
                timestamp: Date.now()
            };

            this.queue.push(queueItem);
            this.metrics.queuedUpdates++;
            this.metrics.maxQueueSize = Math.max(this.metrics.maxQueueSize, this.queue.length);

            console.log(`📥 UpdateQueue: Enqueued update (queue size: ${this.queue.length}, key: ${key || 'none'})`);

            // Start processing if not already processing
            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process queued updates sequentially
     */
    async processQueue() {
        if (this.processing) {
            console.warn('⚠️ UpdateQueue: Already processing queue');
            return;
        }

        this.processing = true;
        console.log('🔄 UpdateQueue: Started processing queue');

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            const startTime = performance.now();

            try {
                console.log(`⚙️ UpdateQueue: Processing update (${this.queue.length} remaining, key: ${item.key || 'none'})`);
                
                // Execute the update function
                const result = await item.updateFn();
                
                const processingTime = performance.now() - startTime;
                this.updateAverageProcessingTime(processingTime);
                this.metrics.processedUpdates++;

                console.log(`✅ UpdateQueue: Update completed in ${processingTime.toFixed(2)}ms`);
                
                // Resolve the promise
                item.resolve(result);
            } catch (error) {
                console.error('❌ UpdateQueue: Update failed:', error);
                item.reject(error);
            }
        }

        this.processing = false;
        console.log('✅ UpdateQueue: Finished processing queue');
    }

    /**
     * Update average processing time metric
     * @param {number} newTime - New processing time to include
     */
    updateAverageProcessingTime(newTime) {
        const totalProcessed = this.metrics.processedUpdates;
        if (totalProcessed === 0) {
            this.metrics.averageProcessingTime = newTime;
        } else {
            this.metrics.averageProcessingTime = 
                (this.metrics.averageProcessingTime * (totalProcessed - 1) + newTime) / totalProcessed;
        }
    }

    /**
     * Clear all pending updates
     */
    clear() {
        const cleared = this.queue.length;
        this.queue.forEach(item => {
            item.reject(new Error('Update queue cleared'));
        });
        this.queue = [];
        this.metrics.droppedUpdates += cleared;
        console.log(`🗑️ UpdateQueue: Cleared ${cleared} pending update(s)`);
    }

    /**
     * Get queue metrics
     * @returns {Object} Queue metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            currentQueueSize: this.queue.length,
            isProcessing: this.processing
        };
    }

    /**
     * Check if queue is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.queue.length === 0 && !this.processing;
    }

    /**
     * Wait for queue to be empty
     * @param {number} timeout - Optional timeout in ms
     * @returns {Promise<boolean>} True if queue emptied, false if timeout
     */
    async waitForEmpty(timeout = 5000) {
        const startTime = Date.now();
        
        while (!this.isEmpty()) {
            if (Date.now() - startTime > timeout) {
                console.warn('⚠️ UpdateQueue: Timeout waiting for queue to empty');
                return false;
            }
            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        return true;
    }
}

// Export singleton instance for global use
export const globalUpdateQueue = new UpdateQueue();

export default UpdateQueue;