/**
 * EffectEventCoordinator Service
 * 
 * Handles all event coordination and emission for effect operations.
 * Extracted from EffectConfigurer to follow Single Responsibility Principle.
 * 
 * Responsibilities:
 * - Effect addition event coordination
 * - Effect attachment event coordination
 * - Configuration change event coordination
 * - Event bus integration
 * - Backward compatibility with callbacks
 */

export class EffectEventCoordinator {
    constructor({ eventBus, logger = console } = {}) {
        this.eventBus = eventBus;
        this.logger = logger;
        
        // Event coordination metrics
        this.eventMetrics = {
            eventsEmitted: 0,
            addEffectEvents: 0,
            attachEffectEvents: 0,
            configChangeEvents: 0,
            eventTime: 0,
            effectsAdded: 0,
            effectsAttached: 0,
            configurationChanges: 0,
            resolutionChanges: 0,
            callbacksExecuted: 0,
            eventHistory: []
        };
        
        // Performance baseline tracking
        this.performanceBaseline = {
            maxEventTime: 10, // ms
            maxInstanceProperties: 15
        };
        
        this.logger.log('📡 EffectEventCoordinator: Initialized with event coordination capabilities');
    }

    /**
     * Coordinate effect addition event
     * @param {Object} effectData - Effect data to add
     * @param {Object} selectedEffect - Currently selected effect context
     * @param {Function} onAddEffect - Optional callback for backward compatibility
     */
    coordinateAddEffectEvent(effectData, selectedEffect, onAddEffect = null) {
        const startTime = performance.now();
        
        try {
            this.logger.log('📡 EffectEventCoordinator: Coordinating add effect event:', effectData);

            // Emit through event bus
            if (this.eventBus) {
                this.eventBus.emit('effectconfigurer:effect:add', effectData, {
                    source: 'EffectEventCoordinator',
                    component: 'EffectConfigurer',
                    selectedEffect: selectedEffect
                });
            }

            // Call backward compatibility callback
            if (onAddEffect) {
                onAddEffect(effectData);
            }

            const eventTime = performance.now() - startTime;
            this.eventMetrics.eventTime += eventTime;
            this.eventMetrics.eventsEmitted++;

            // Track event in history
            if (!this.eventMetrics.eventHistory) {
                this.eventMetrics.eventHistory = [];
            }
            this.eventMetrics.eventHistory.push({
                eventName: 'effectconfigurer:effect:add',
                timestamp: Date.now(),
                eventTime
            });
            this.eventMetrics.addEffectEvents++;
            this.eventMetrics.effectsAdded++;
            
            this.logger.log(`📡 EffectEventCoordinator: Add effect event coordinated in ${eventTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.logger.error('❌ EffectEventCoordinator: Failed to coordinate add effect event:', error);
            throw error;
        }
    }

    /**
     * Coordinate effect attachment event
     * @param {Object} effectData - Effect data to attach
     * @param {string} attachmentType - Type of attachment (secondary, keyframe)
     * @param {boolean} isEditing - Whether this is an edit operation
     * @param {Object} selectedEffect - Currently selected effect context
     * @param {Function} onAttachEffect - Optional callback for backward compatibility
     */
    coordinateAttachEffectEvent(effectData, attachmentType, isEditing = false, selectedEffect, onAttachEffect = null) {
        const startTime = performance.now();
        
        try {
            this.logger.log('📡 EffectEventCoordinator: Coordinating attach effect event:', { 
                effectData, 
                attachmentType, 
                isEditing 
            });

            // Emit through event bus
            if (this.eventBus) {
                this.eventBus.emit('effectconfigurer:effect:attach', {
                    effectData,
                    attachmentType,
                    isEditing,
                    parentEffect: selectedEffect
                }, {
                    source: 'EffectEventCoordinator',
                    component: 'EffectConfigurer'
                });
            }

            // Call backward compatibility callback
            if (onAttachEffect) {
                onAttachEffect(effectData, attachmentType, isEditing);
            }

            const eventTime = performance.now() - startTime;
            this.eventMetrics.eventTime += eventTime;
            this.eventMetrics.eventsEmitted++;

            // Track event in history
            if (!this.eventMetrics.eventHistory) {
                this.eventMetrics.eventHistory = [];
            }
            this.eventMetrics.eventHistory.push({
                eventName: 'effectconfigurer:effect:attach',
                timestamp: Date.now(),
                eventTime
            });
            this.eventMetrics.attachEffectEvents++;
            this.eventMetrics.effectsAttached++;
            
            this.logger.log(`📡 EffectEventCoordinator: Attach effect event coordinated in ${eventTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.logger.error('❌ EffectEventCoordinator: Failed to coordinate attach effect event:', error);
            throw error;
        }
    }

    /**
     * Coordinate configuration change event
     * @param {Object} newConfig - New configuration
     * @param {Object} selectedEffect - Currently selected effect
     * @param {Function} onConfigChange - Optional callback for backward compatibility
     */
    coordinateConfigChangeEvent(newConfig, selectedEffect, onConfigChange = null) {
        const startTime = performance.now();
        
        try {
            this.logger.log('📡 EffectEventCoordinator: Coordinating config change event:', {
                effectId: selectedEffect?.effectId,
                effectIndex: selectedEffect?.effectIndex,
                effectName: selectedEffect?.effectName || selectedEffect?.name,
                configKeys: Object.keys(newConfig || {}),
                config: newConfig
            });

            // Emit through event bus with proper payload structure
            // 🔒 CRITICAL: Match the payload structure expected by useEffectManagement
            // The payload must have: effectId, effectIndex, config, effectType, subEffectIndex
            if (this.eventBus) {
                this.eventBus.emit('effectconfigurer:config:change', {
                    config: newConfig,
                    effectId: selectedEffect?.effectId,
                    effectIndex: selectedEffect?.effectIndex,
                    effectType: selectedEffect?.effectType || 'primary',
                    effectName: selectedEffect?.effectName || selectedEffect?.name,
                    subEffectIndex: selectedEffect?.subIndex,
                    // Keep 'effect' for backward compatibility
                    effect: selectedEffect,
                    timestamp: new Date().toISOString()
                }, {
                    source: 'EffectEventCoordinator',
                    component: 'EffectConfigurer'
                });
                this.logger.log('📡 EffectEventCoordinator: Event emitted to event bus with proper payload structure');
            } else {
                this.logger.warn('⚠️ EffectEventCoordinator: No event bus available - event not emitted!');
            }

            // Call backward compatibility callback
            if (onConfigChange) {
                this.logger.log('📡 EffectEventCoordinator: Calling backward compatibility callback');
                onConfigChange(newConfig);
            } else {
                this.logger.log('📡 EffectEventCoordinator: No callback provided');
            }

            const eventTime = performance.now() - startTime;
            this.eventMetrics.eventTime += eventTime;
            this.eventMetrics.eventsEmitted++;

            // Track event in history
            if (!this.eventMetrics.eventHistory) {
                this.eventMetrics.eventHistory = [];
            }
            this.eventMetrics.eventHistory.push({
                eventName: 'effectconfigurer:config:change',
                timestamp: Date.now(),
                eventTime
            });
            this.eventMetrics.configChangeEvents++;
            this.eventMetrics.configurationChanges++;
            
            this.logger.log(`📡 EffectEventCoordinator: Config change event coordinated in ${eventTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.logger.error('❌ EffectEventCoordinator: Failed to coordinate config change event:', error);
            throw error;
        }
    }

    /**
     * Coordinate resolution change event handling
     * @param {Object} payload - Resolution change payload
     * @param {Object} selectedEffect - Currently selected effect
     * @param {Object} effectConfig - Current effect configuration
     * @param {Function} refreshCallback - Callback to refresh configuration
     */
    coordinateResolutionChangeEvent(payload, selectedEffect, effectConfig, refreshCallback) {
        const startTime = performance.now();
        
        try {
            this.logger.log('📡 EffectEventCoordinator: Coordinating resolution change event:', payload);

            if (selectedEffect && effectConfig && Object.keys(effectConfig).length > 0) {
                this.logger.log('🔄 EffectEventCoordinator: Triggering config refresh for new resolution');
                
                if (refreshCallback) {
                    refreshCallback();
                }

                // Emit notification event
                if (this.eventBus) {
                    this.eventBus.emit('effectconfigurer:resolution:refreshed', {
                        effect: selectedEffect,
                        newResolution: payload,
                        timestamp: new Date().toISOString()
                    }, {
                        source: 'EffectEventCoordinator',
                        component: 'EffectConfigurer'
                    });
                }
            }

            const eventTime = performance.now() - startTime;
            this.eventMetrics.eventTime += eventTime;
            this.eventMetrics.eventsEmitted++;

            // Track event in history
            if (!this.eventMetrics.eventHistory) {
                this.eventMetrics.eventHistory = [];
            }
            this.eventMetrics.eventHistory.push({
                eventName: 'effectconfigurer:resolution:refresh',
                timestamp: Date.now(),
                eventTime
            });
            this.eventMetrics.resolutionChanges++;

            this.logger.log(`📡 EffectEventCoordinator: Resolution change event coordinated in ${eventTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.logger.error('❌ EffectEventCoordinator: Failed to coordinate resolution change event:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners for resolution changes
     * @param {Function} resolutionChangeHandler - Handler for resolution changes
     * @returns {Function} Cleanup function to remove listeners
     */
    setupResolutionChangeListener(resolutionChangeHandler) {
        try {
            if (!this.eventBus) {
                this.logger.warn('⚠️ EffectEventCoordinator: No event bus available for resolution listener');
                return () => {}; // Return no-op cleanup function
            }

            this.logger.log('📡 EffectEventCoordinator: Setting up resolution change listener');

            const unsubscribe = this.eventBus.subscribe('resolution:changed', resolutionChangeHandler);
            
            this.logger.log('✅ EffectEventCoordinator: Resolution change listener set up successfully');
            
            return unsubscribe;
            
        } catch (error) {
            this.logger.error('❌ EffectEventCoordinator: Failed to set up resolution change listener:', error);
            return () => {}; // Return no-op cleanup function
        }
    }

    /**
     * Emit custom event with coordination
     * @param {string} eventName - Name of the event
     * @param {Object} eventData - Event data
     * @param {Object} metadata - Event metadata
     */
    emitCoordinatedEvent(eventName, eventData, metadata = {}) {
        const startTime = performance.now();
        
        try {
            this.logger.log(`📡 EffectEventCoordinator: Emitting coordinated event: ${eventName}`);

            if (this.eventBus) {
                this.eventBus.emit(eventName, eventData, {
                    source: 'EffectEventCoordinator',
                    component: 'EffectConfigurer',
                    ...metadata
                });
            }

            const eventTime = performance.now() - startTime;
            this.eventMetrics.eventTime += eventTime;
            this.eventMetrics.eventsEmitted++;

            // Track event in history
            if (!this.eventMetrics.eventHistory) {
                this.eventMetrics.eventHistory = [];
            }
            this.eventMetrics.eventHistory.push({
                eventName,
                timestamp: Date.now(),
                eventTime
            });
            
            this.logger.log(`📡 EffectEventCoordinator: Event ${eventName} emitted in ${eventTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.logger.error(`❌ EffectEventCoordinator: Failed to emit event ${eventName}:`, error);
            throw error;
        }
    }

    /**
     * Get event coordination metrics for monitoring
     * @returns {Object} Current event metrics
     */
    getEventMetrics() {
        return {
            ...this.eventMetrics,
            averageEventTime: this.eventMetrics.eventsEmitted > 0
                ? this.eventMetrics.eventTime / this.eventMetrics.eventsEmitted
                : 0,
            eventHistory: this.eventMetrics.eventHistory || []
        };
    }

    /**
     * Reset event metrics
     */
    resetMetrics() {
        this.eventMetrics = {
            eventsEmitted: 0,
            addEffectEvents: 0,
            attachEffectEvents: 0,
            configChangeEvents: 0,
            eventTime: 0,
            effectsAdded: 0,
            effectsAttached: 0,
            configurationChanges: 0,
            resolutionChanges: 0,
            callbacksExecuted: 0,
            eventHistory: []
        };
        this.logger.log('📡 EffectEventCoordinator: Metrics reset');
    }

    /**
     * Check if service meets performance baselines
     * @returns {Object} Performance check result
     */
    checkPerformanceBaseline() {
        const metrics = this.getEventMetrics();
        const instanceProperties = Object.keys(this).length;

        return {
            meetsBaseline: metrics.averageEventTime <= this.performanceBaseline.maxEventTime &&
                          instanceProperties <= this.performanceBaseline.maxInstanceProperties,
            averageEventTime: metrics.averageEventTime,
            maxEventTime: this.performanceBaseline.maxEventTime,
            instanceProperties,
            maxInstanceProperties: this.performanceBaseline.maxInstanceProperties
        };
    }

    // Alias methods for backward compatibility with tests
    coordinateEffectAddition(effect, config, callback) {
        // Emit event first, then call callback
        const result = this.coordinateAddEffectEvent({ effect, config }, null);
        // Call callback with effect and config as expected by tests
        if (callback) {
            callback(effect, config);
        }
        return result;
    }

    coordinateEffectAttachment(effect, config, projectState, callback) {
        // Validate inputs
        if (!effect) {
            throw new Error('Effect is required for attachment coordination');
        }
        
        // Update metrics
        this.eventMetrics.effectsAttached++;
        this.eventMetrics.eventsEmitted++;
        
        // Emit event with expected structure
        if (this.eventBus) {
            this.eventBus.emit('effectconfigurer:effect:attach', {
                effect,
                config,
                projectState
            }, {
                source: 'EffectEventCoordinator',
                component: 'EffectConfigurer'
            });
        }
        
        // Call callback as expected by tests
        if (callback) {
            callback(effect, config, projectState);
        }
        
        return true;
    }

    coordinateConfigurationChange(config, selectedEffect, callback) {
        // Emit event first, then call callback
        const result = this.coordinateConfigChangeEvent(config, selectedEffect);
        // Call callback with config and selectedEffect as expected by tests
        if (callback) {
            callback(config, selectedEffect);
        }
        return result;
    }

    coordinateResolutionChange(oldResolution, newResolution, projectState, callback) {
        // Update metrics
        this.eventMetrics.resolutionChanges++;
        this.eventMetrics.eventsEmitted++;
        
        // Emit the event with correct event name for backward compatibility
        if (this.eventBus) {
            this.eventBus.emit('effectconfigurer:resolution:change', {
                oldResolution,
                newResolution,
                projectState
            }, {
                source: 'EffectEventCoordinator',
                component: 'EffectConfigurer'
            });
        }
        
        // Call callback with old and new resolution as expected by tests
        if (callback) {
            callback(oldResolution, newResolution, projectState);
        }
        return true;
    }

    // Callback registry for backward compatibility
    callbackRegistry = {};

    registerCallback(eventType, callback) {
        if (!this.callbackRegistry[eventType]) {
            this.callbackRegistry[eventType] = [];
        }
        this.callbackRegistry[eventType].push(callback);
        // Return a string ID for the callback using a delimiter that won't conflict
        const index = this.callbackRegistry[eventType].length - 1;
        return `${eventType}::${index}`;
    }

    executeCallback(callbackId) {
        // Parse the callback ID to get event type and index
        const lastDelimiterIndex = callbackId.lastIndexOf('::');
        if (lastDelimiterIndex === -1) return false;
        
        const eventType = callbackId.substring(0, lastDelimiterIndex);
        const index = parseInt(callbackId.substring(lastDelimiterIndex + 2));
        
        if (this.callbackRegistry[eventType] && this.callbackRegistry[eventType][index]) {
            const callback = this.callbackRegistry[eventType][index];
            if (callback) {
                callback();
                this.eventMetrics.callbacksExecuted++;
                return true;
            }
        }
        return false;
    }

    unregisterCallback(callbackId) {
        const lastDelimiterIndex = callbackId.lastIndexOf('::');
        if (lastDelimiterIndex === -1) return false;
        
        const eventType = callbackId.substring(0, lastDelimiterIndex);
        const index = parseInt(callbackId.substring(lastDelimiterIndex + 2));
        
        if (this.callbackRegistry[eventType] && this.callbackRegistry[eventType][index]) {
            this.callbackRegistry[eventType][index] = null;
            return true;
        }
        return false;
    }

    getCallbackRegistrySize() {
        let size = 0;
        for (const eventType in this.callbackRegistry) {
            size += this.callbackRegistry[eventType].filter(cb => cb !== null).length;
        }
        return size;
    }

    clearCallbacks() {
        this.callbackRegistry = {};
    }
}

export default EffectEventCoordinator;