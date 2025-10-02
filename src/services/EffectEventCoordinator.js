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
            eventTime: 0
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
            this.eventMetrics.addEffectEvents++;
            
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
            this.eventMetrics.attachEffectEvents++;
            
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
                effectName: selectedEffect?.name,
                configKeys: Object.keys(newConfig || {})
            });

            // Emit through event bus
            if (this.eventBus) {
                this.eventBus.emit('effectconfigurer:config:change', {
                    config: newConfig,
                    effect: selectedEffect,
                    timestamp: new Date().toISOString()
                }, {
                    source: 'EffectEventCoordinator',
                    component: 'EffectConfigurer'
                });
            }

            // Call backward compatibility callback
            if (onConfigChange) {
                onConfigChange(newConfig);
            }

            const eventTime = performance.now() - startTime;
            this.eventMetrics.eventTime += eventTime;
            this.eventMetrics.eventsEmitted++;
            this.eventMetrics.configChangeEvents++;
            
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
                : 0
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
            eventTime: 0
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
}

export default EffectEventCoordinator;