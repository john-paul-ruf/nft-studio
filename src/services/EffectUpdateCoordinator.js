/**
 * EffectUpdateCoordinator Service
 * 
 * Orchestrates effect configuration updates with debouncing, batching, and state synchronization.
 * Extracted from EffectConfigurer to follow Single Responsibility Principle.
 * 
 * Responsibilities:
 * - Debounced update coordination (prevents race conditions from rapid typing)
 * - Update batching and optimization
 * - State synchronization between UI and ProjectState
 * - Update lifecycle management (pending updates, flush on cleanup)
 * - Update metadata tracking (source, timestamp, user modifications)
 * - Performance monitoring and metrics
 * 
 * Design Pattern: Strategy Pattern + Observer Pattern
 * - Strategy: Configurable debounce/throttle strategies
 * - Observer: Notifies subscribers of update lifecycle events
 * 
 * @example
 * const coordinator = new EffectUpdateCoordinator({
 *   eventBus,
 *   logger,
 *   debounceMs: 300,
 *   onUpdate: (config, metadata) => { ... }
 * });
 * 
 * // Schedule an update (debounced)
 * coordinator.scheduleUpdate(newConfig, { source: 'user-input', fieldName: 'x' });
 * 
 * // Flush pending updates immediately
 * coordinator.flush();
 * 
 * // Cleanup on unmount
 * coordinator.destroy();
 */

export class EffectUpdateCoordinator {
    constructor({ 
        eventBus, 
        logger = console,
        debounceMs = 300,
        onUpdate = null,
        enableBatching = true,
        maxBatchSize = 10
    } = {}) {
        this.eventBus = eventBus;
        this.logger = logger;
        this.debounceMs = debounceMs;
        this.onUpdate = onUpdate;
        this.enableBatching = enableBatching;
        this.maxBatchSize = maxBatchSize;
        
        // Update coordination state
        this.debounceTimer = null;
        this.pendingUpdate = null;
        this.updateBatch = [];
        this.isDestroyed = false;
        
        // Update tracking flags
        this.userModifiedConfig = false;
        this.isEditingExistingEffect = false;
        
        // Update lifecycle callbacks
        this.lifecycleCallbacks = {
            onSchedule: [],
            onFlush: [],
            onCancel: [],
            onBatch: []
        };
        
        // Performance metrics
        this.metrics = {
            updatesScheduled: 0,
            updatesFlushed: 0,
            updatesCancelled: 0,
            batchesProcessed: 0,
            totalDebounceTime: 0,
            totalUpdateTime: 0,
            averageDebounceTime: 0,
            averageUpdateTime: 0,
            updateHistory: []
        };
        
        // Performance baseline tracking
        this.performanceBaseline = {
            maxDebounceTime: 500, // ms
            maxUpdateTime: 100, // ms
            maxBatchSize: 10
        };
        
        this.logger.log('⏱️ EffectUpdateCoordinator: Initialized', {
            debounceMs,
            enableBatching,
            maxBatchSize
        });
    }

    /**
     * Schedule a configuration update (debounced)
     * @param {Object} config - Updated configuration
     * @param {Object} metadata - Update metadata (source, fieldName, timestamp, etc.)
     * @returns {boolean} True if update was scheduled, false if coordinator is destroyed
     */
    scheduleUpdate(config, metadata = {}) {
        if (this.isDestroyed) {
            this.logger.warn('⚠️ EffectUpdateCoordinator: Cannot schedule update - coordinator is destroyed');
            return false;
        }

        const scheduleTime = performance.now();
        
        try {
            this.logger.log('⏱️ EffectUpdateCoordinator: Scheduling update', {
                configKeys: Object.keys(config || {}),
                metadata
            });

            // Mark user modification flag (unless this is from defaults loading)
            if (metadata.source !== 'defaults' && metadata.source !== 'resolution-scaling') {
                this.userModifiedConfig = true;
            }

            // Clear existing debounce timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.metrics.updatesCancelled++;
            }

            // Store pending update
            this.pendingUpdate = {
                config,
                metadata: {
                    ...metadata,
                    scheduledAt: Date.now(),
                    scheduleTime
                }
            };

            // Add to batch if batching is enabled
            if (this.enableBatching) {
                this.updateBatch.push(this.pendingUpdate);
                
                // Trim batch if it exceeds max size
                if (this.updateBatch.length > this.maxBatchSize) {
                    this.updateBatch = this.updateBatch.slice(-this.maxBatchSize);
                }
                
                this._notifyLifecycleCallbacks('onBatch', this.updateBatch);
            }

            // Set new debounce timer
            this.debounceTimer = setTimeout(() => {
                this._flushPendingUpdate();
            }, this.debounceMs);

            // Update metrics
            this.metrics.updatesScheduled++;
            
            // Notify lifecycle callbacks
            this._notifyLifecycleCallbacks('onSchedule', this.pendingUpdate);

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('effectupdate:scheduled', {
                    config,
                    metadata,
                    debounceMs: this.debounceMs
                }, {
                    source: 'EffectUpdateCoordinator'
                });
            }

            this.logger.log('✅ EffectUpdateCoordinator: Update scheduled successfully');
            return true;
            
        } catch (error) {
            this.logger.error('❌ EffectUpdateCoordinator: Failed to schedule update:', error);
            return false;
        }
    }

    /**
     * Flush pending update immediately (bypasses debounce)
     * @returns {boolean} True if update was flushed, false if no pending update
     */
    flush() {
        if (this.isDestroyed) {
            this.logger.warn('⚠️ EffectUpdateCoordinator: Cannot flush - coordinator is destroyed');
            return false;
        }

        if (!this.pendingUpdate) {
            this.logger.log('⏱️ EffectUpdateCoordinator: No pending update to flush');
            return false;
        }

        try {
            this.logger.log('⏱️ EffectUpdateCoordinator: Flushing pending update immediately');
            
            // Clear debounce timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }

            // Flush the update
            this._flushPendingUpdate();
            
            return true;
            
        } catch (error) {
            this.logger.error('❌ EffectUpdateCoordinator: Failed to flush update:', error);
            return false;
        }
    }

    /**
     * Cancel pending update
     * @returns {boolean} True if update was cancelled, false if no pending update
     */
    cancel() {
        if (!this.pendingUpdate) {
            return false;
        }

        try {
            this.logger.log('⏱️ EffectUpdateCoordinator: Cancelling pending update');
            
            // Clear debounce timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }

            // Clear pending update
            const cancelledUpdate = this.pendingUpdate;
            this.pendingUpdate = null;

            // Update metrics
            this.metrics.updatesCancelled++;
            
            // Notify lifecycle callbacks
            this._notifyLifecycleCallbacks('onCancel', cancelledUpdate);

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('effectupdate:cancelled', {
                    update: cancelledUpdate
                }, {
                    source: 'EffectUpdateCoordinator'
                });
            }

            return true;
            
        } catch (error) {
            this.logger.error('❌ EffectUpdateCoordinator: Failed to cancel update:', error);
            return false;
        }
    }

    /**
     * Internal method to flush pending update
     * @private
     */
    _flushPendingUpdate() {
        if (!this.pendingUpdate) {
            return;
        }

        const startTime = performance.now();
        
        try {
            const { config, metadata } = this.pendingUpdate;
            
            // Calculate debounce time
            const debounceTime = Date.now() - metadata.scheduledAt;
            this.metrics.totalDebounceTime += debounceTime;

            this.logger.log('⏱️ EffectUpdateCoordinator: Flushing update', {
                configKeys: Object.keys(config || {}),
                debounceTime: `${debounceTime}ms`,
                metadata
            });

            // Execute update callback
            if (this.onUpdate) {
                this.onUpdate(config, {
                    ...metadata,
                    flushedAt: Date.now(),
                    debounceTime
                });
            }

            // Calculate update time
            const updateTime = performance.now() - startTime;
            this.metrics.totalUpdateTime += updateTime;
            this.metrics.updatesFlushed++;

            // Update averages
            this.metrics.averageDebounceTime = this.metrics.totalDebounceTime / this.metrics.updatesFlushed;
            this.metrics.averageUpdateTime = this.metrics.totalUpdateTime / this.metrics.updatesFlushed;

            // Track in history (keep last 50)
            this.metrics.updateHistory.push({
                config,
                metadata,
                debounceTime,
                updateTime,
                timestamp: Date.now()
            });
            if (this.metrics.updateHistory.length > 50) {
                this.metrics.updateHistory.shift();
            }

            // Notify lifecycle callbacks
            this._notifyLifecycleCallbacks('onFlush', {
                config,
                metadata,
                debounceTime,
                updateTime
            });

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('effectupdate:flushed', {
                    config,
                    metadata,
                    debounceTime,
                    updateTime
                }, {
                    source: 'EffectUpdateCoordinator'
                });
            }

            // Clear pending update
            this.pendingUpdate = null;
            this.debounceTimer = null;

            // Process batch if enabled
            if (this.enableBatching && this.updateBatch.length > 0) {
                this.metrics.batchesProcessed++;
                this.updateBatch = []; // Clear batch after processing
            }

            this.logger.log(`✅ EffectUpdateCoordinator: Update flushed in ${updateTime.toFixed(2)}ms (debounced ${debounceTime}ms)`);
            
        } catch (error) {
            this.logger.error('❌ EffectUpdateCoordinator: Failed to flush update:', error);
            throw error;
        }
    }

    /**
     * Set user modification flag
     * @param {boolean} modified - Whether user has modified config
     */
    setUserModified(modified) {
        this.userModifiedConfig = modified;
        this.logger.log(`⏱️ EffectUpdateCoordinator: User modified flag set to ${modified}`);
    }

    /**
     * Get user modification flag
     * @returns {boolean} Whether user has modified config
     */
    getUserModified() {
        return this.userModifiedConfig;
    }

    /**
     * Set editing existing effect flag
     * @param {boolean} isEditing - Whether editing existing effect
     */
    setEditingExistingEffect(isEditing) {
        this.isEditingExistingEffect = isEditing;
        this.logger.log(`⏱️ EffectUpdateCoordinator: Editing existing effect flag set to ${isEditing}`);
    }

    /**
     * Get editing existing effect flag
     * @returns {boolean} Whether editing existing effect
     */
    getEditingExistingEffect() {
        return this.isEditingExistingEffect;
    }

    /**
     * Reset all tracking flags
     */
    resetFlags() {
        this.userModifiedConfig = false;
        this.isEditingExistingEffect = false;
        this.logger.log('⏱️ EffectUpdateCoordinator: Flags reset');
    }

    /**
     * Register lifecycle callback
     * @param {string} event - Event name (onSchedule, onFlush, onCancel, onBatch)
     * @param {Function} callback - Callback function
     * @returns {Function} Unregister function
     */
    onLifecycle(event, callback) {
        if (!this.lifecycleCallbacks[event]) {
            this.logger.warn(`⚠️ EffectUpdateCoordinator: Unknown lifecycle event: ${event}`);
            return () => {};
        }

        this.lifecycleCallbacks[event].push(callback);
        
        // Return unregister function
        return () => {
            const index = this.lifecycleCallbacks[event].indexOf(callback);
            if (index > -1) {
                this.lifecycleCallbacks[event].splice(index, 1);
            }
        };
    }

    /**
     * Notify lifecycle callbacks
     * @private
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    _notifyLifecycleCallbacks(event, data) {
        if (!this.lifecycleCallbacks[event]) {
            return;
        }

        for (const callback of this.lifecycleCallbacks[event]) {
            try {
                callback(data);
            } catch (error) {
                this.logger.error(`❌ EffectUpdateCoordinator: Lifecycle callback error (${event}):`, error);
            }
        }
    }

    /**
     * Get pending update
     * @returns {Object|null} Pending update or null
     */
    getPendingUpdate() {
        return this.pendingUpdate;
    }

    /**
     * Check if update is pending
     * @returns {boolean} True if update is pending
     */
    hasPendingUpdate() {
        return this.pendingUpdate !== null;
    }

    /**
     * Get update batch
     * @returns {Array} Current update batch
     */
    getUpdateBatch() {
        return [...this.updateBatch];
    }

    /**
     * Get performance metrics
     * @returns {Object} Current metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            hasPendingUpdate: this.hasPendingUpdate(),
            batchSize: this.updateBatch.length,
            userModified: this.userModifiedConfig,
            isEditingExisting: this.isEditingExistingEffect
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            updatesScheduled: 0,
            updatesFlushed: 0,
            updatesCancelled: 0,
            batchesProcessed: 0,
            totalDebounceTime: 0,
            totalUpdateTime: 0,
            averageDebounceTime: 0,
            averageUpdateTime: 0,
            updateHistory: []
        };
        this.logger.log('⏱️ EffectUpdateCoordinator: Metrics reset');
    }

    /**
     * Update debounce delay
     * @param {number} debounceMs - New debounce delay in milliseconds
     */
    setDebounceMs(debounceMs) {
        this.debounceMs = debounceMs;
        this.logger.log(`⏱️ EffectUpdateCoordinator: Debounce delay updated to ${debounceMs}ms`);
    }

    /**
     * Get current debounce delay
     * @returns {number} Current debounce delay in milliseconds
     */
    getDebounceMs() {
        return this.debounceMs;
    }

    /**
     * Update onUpdate callback
     * @param {Function} callback - New update callback
     */
    setOnUpdate(callback) {
        this.onUpdate = callback;
        this.logger.log('⏱️ EffectUpdateCoordinator: Update callback updated');
    }

    /**
     * Destroy coordinator and cleanup resources
     * Flushes any pending updates before destroying
     */
    destroy() {
        if (this.isDestroyed) {
            this.logger.warn('⚠️ EffectUpdateCoordinator: Already destroyed');
            return;
        }

        try {
            this.logger.log('⏱️ EffectUpdateCoordinator: Destroying coordinator');

            // Flush any pending updates
            if (this.pendingUpdate) {
                this.logger.log('⏱️ EffectUpdateCoordinator: Flushing pending update before destroy');
                this.flush();
            }

            // Clear debounce timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }

            // Clear state
            this.pendingUpdate = null;
            this.updateBatch = [];
            this.lifecycleCallbacks = {
                onSchedule: [],
                onFlush: [],
                onCancel: [],
                onBatch: []
            };

            // Mark as destroyed
            this.isDestroyed = true;

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('effectupdate:destroyed', {
                    metrics: this.getMetrics()
                }, {
                    source: 'EffectUpdateCoordinator'
                });
            }

            this.logger.log('✅ EffectUpdateCoordinator: Destroyed successfully');
            
        } catch (error) {
            this.logger.error('❌ EffectUpdateCoordinator: Failed to destroy:', error);
            throw error;
        }
    }

    /**
     * Check if coordinator is destroyed
     * @returns {boolean} True if destroyed
     */
    isDestroyed() {
        return this.isDestroyed;
    }
}

export default EffectUpdateCoordinator;