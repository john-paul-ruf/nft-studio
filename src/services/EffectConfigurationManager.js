/**
 * EffectConfigurationManager Service
 * 
 * Handles all effect configuration management logic.
 * Extracted from EffectConfigurer to follow Single Responsibility Principle.
 * 
 * Responsibilities:
 * - Configuration schema loading and caching
 * - Default configuration management
 * - Configuration change handling
 * - Center position application
 * - Configuration serialization
 */

import { ConfigIntrospector } from '../utils/ConfigIntrospector.js';
import CenterUtils from '../utils/CenterUtils.js';
import PreferencesService from './PreferencesService.js';

export class EffectConfigurationManager {
    constructor({ eventBus, logger = console } = {}) {
        this.eventBus = eventBus;
        this.logger = logger;
        
        // Configuration caching
        this.schemaCache = new Map();
        this.defaultsCache = new Map();
        
        // Configuration metrics
        this.configMetrics = {
            schemasLoaded: 0,
            configurationsProcessed: 0,
            defaultsApplied: 0,
            centerPositionsApplied: 0,
            configurationTime: 0
        };
        
        // Performance baseline tracking
        this.performanceBaseline = {
            maxConfigurationTime: 100, // ms
            maxInstanceProperties: 15
        };
        
        this.logger.log('⚙️ EffectConfigurationManager: Initialized with configuration management capabilities');
    }

    /**
     * Load configuration schema for an effect
     * @param {Object} selectedEffect - The effect to load schema for
     * @param {Object} projectState - The project state for context
     * @returns {Promise<Object>} Configuration schema
     */
    async loadConfigSchema(selectedEffect, projectState = null) {
        const startTime = performance.now();
        
        try {
            if (!selectedEffect) {
                throw new Error('Selected effect is required');
            }

            const cacheKey = selectedEffect.registryKey || selectedEffect.className;
            
            // Check cache first
            if (this.schemaCache.has(cacheKey)) {
                this.logger.log(`⚙️ EffectConfigurationManager: Using cached schema for ${cacheKey}`);
                return this.schemaCache.get(cacheKey);
            }

            this.logger.log(`⚙️ EffectConfigurationManager: Loading schema for ${selectedEffect.name || selectedEffect.className}`);

            // Load schema using ConfigIntrospector
            const configSchema = await ConfigIntrospector.analyzeConfigClass(selectedEffect, projectState);
            
            if (!configSchema) {
                throw new Error(`Failed to load config schema for ${selectedEffect.name}`);
            }

            // Cache the schema
            this.schemaCache.set(cacheKey, configSchema);
            this.configMetrics.schemasLoaded++;
            
            const configurationTime = performance.now() - startTime;
            this.configMetrics.configurationTime += configurationTime;
            
            this.logger.log(`⚙️ EffectConfigurationManager: Schema loaded successfully in ${configurationTime.toFixed(2)}ms`, {
                effectName: selectedEffect.name,
                schemaFields: configSchema.fields ? configSchema.fields.length : 0
            });

            return configSchema;
            
        } catch (error) {
            this.logger.error('❌ EffectConfigurationManager: Failed to load config schema:', error);
            throw error;
        }
    }

    /**
     * Apply center position defaults to configuration
     * @param {Object} config - Configuration to process
     * @param {Object} projectState - Project state with resolution info
     * @param {boolean} isNewEffect - Whether this is a new effect being added (not an edit)
     * @returns {Object} Configuration with center positions applied
     */
    applyCenterDefaults(config, projectState, isNewEffect = false) {
        const startTime = performance.now();

        try {
            // Only apply center defaults for new effects that don't have position values yet
            // For existing effects being edited, return the config as-is
            if (!isNewEffect) {
                this.logger.log('🎯 EffectConfigurationManager: Skipping center defaults (editing existing effect)');
                return config;
            }

            this.logger.log('🎯 EffectConfigurationManager: Applying center defaults for new effect', {
                config: config,
                projectState: projectState,
                hasTargetResolution: !!projectState?.targetResolution,
                hasResolution: !!projectState?.resolution
            });

            const result = CenterUtils.detectAndApplyCenter(config, projectState);

            const configurationTime = performance.now() - startTime;
            this.configMetrics.configurationTime += configurationTime;
            this.configMetrics.centerPositionsApplied++;

            this.logger.log('🎯 EffectConfigurationManager: Center defaults applied', {
                original: config,
                processed: result,
                changed: JSON.stringify(config) !== JSON.stringify(result),
                processingTime: configurationTime.toFixed(2) + 'ms'
            });

            return result;

        } catch (error) {
            this.logger.error('❌ EffectConfigurationManager: Failed to apply center defaults:', error);
            return config; // Return original config on error
        }
    }

    /**
     * Process configuration change and emit events
     * @param {Object} newConfig - New configuration
     * @param {Object} selectedEffect - Current selected effect
     * @param {Function} onConfigChange - Optional callback for backward compatibility
     */
    processConfigurationChange(newConfig, selectedEffect, onConfigChange = null) {
        const startTime = performance.now();
        
        try {
            this.logger.log('⚙️ EffectConfigurationManager: Processing configuration change', {
                effectName: selectedEffect?.name,
                configKeys: Object.keys(newConfig || {})
            });

            // Emit event through event bus
            if (this.eventBus) {
                this.eventBus.emit('effectconfigurer:config:change', {
                    config: newConfig,
                    effect: selectedEffect,
                    timestamp: new Date().toISOString()
                }, {
                    source: 'EffectConfigurationManager',
                    component: 'EffectConfigurationManager'
                });
            }

            // Call backward compatibility callback
            if (onConfigChange) {
                onConfigChange(newConfig);
            }

            const configurationTime = performance.now() - startTime;
            this.configMetrics.configurationTime += configurationTime;
            this.configMetrics.configurationsProcessed++;
            
            this.logger.log(`⚙️ EffectConfigurationManager: Configuration change processed in ${configurationTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.logger.error('❌ EffectConfigurationManager: Failed to process configuration change:', error);
            throw error;
        }
    }

    /**
     * Check for saved default configuration
     * @param {string} registryKey - Effect registry key
     * @returns {Promise<Object|null>} Saved defaults or null
     */
    async checkForDefaults(registryKey) {
        try {
            if (!registryKey) {
                return null;
            }

            // Check cache first
            if (this.defaultsCache.has(registryKey)) {
                this.logger.log(`⚙️ EffectConfigurationManager: Using cached defaults for ${registryKey}`);
                return this.defaultsCache.get(registryKey);
            }

            this.logger.log(`⚙️ EffectConfigurationManager: Checking for saved defaults: ${registryKey}`);
            
            const defaults = await PreferencesService.getEffectDefaults(registryKey);
            
            if (defaults) {
                // Cache the defaults
                this.defaultsCache.set(registryKey, defaults);
                this.configMetrics.defaultsApplied++;
                
                this.logger.log(`✅ EffectConfigurationManager: Found saved defaults for ${registryKey}`, {
                    defaultKeys: Object.keys(defaults)
                });
                
                return defaults;
            } else {
                this.logger.log(`ℹ️ EffectConfigurationManager: No saved defaults found for ${registryKey}`);
                return null;
            }
            
        } catch (error) {
            this.logger.error(`❌ EffectConfigurationManager: Failed to check defaults for ${registryKey}:`, error);
            return null;
        }
    }

    /**
     * Save configuration as default
     * @param {string} registryKey - Effect registry key
     * @param {Object} config - Configuration to save as default
     * @returns {Promise<boolean>} Success status
     */
    async saveAsDefault(registryKey, config) {
        // Validate inputs first (throw immediately, don't catch)
        if (!registryKey || !config) {
            throw new Error('Registry key and config are required');
        }

        try {
            this.logger.log(`⚙️ EffectConfigurationManager: Saving default config for ${registryKey}`);
            
            const success = await PreferencesService.setEffectDefaults(registryKey, config);
            
            if (success) {
                // Update cache
                this.defaultsCache.set(registryKey, config);
                
                this.logger.log(`✅ EffectConfigurationManager: Default config saved for ${registryKey}`);
                
                // Emit event
                if (this.eventBus) {
                    this.eventBus.emit('effectconfigurer:defaults:saved', {
                        registryKey,
                        config,
                        timestamp: new Date().toISOString()
                    });
                }
                
                return true;
            } else {
                this.logger.error(`❌ EffectConfigurationManager: Failed to save default config for ${registryKey}`);
                return false;
            }
            
        } catch (error) {
            this.logger.error(`❌ EffectConfigurationManager: Error saving defaults for ${registryKey}:`, error);
            return false;
        }
    }

    /**
     * Reset default configuration
     * @param {string} registryKey - Effect registry key
     * @returns {Promise<boolean>} Success status
     */
    async resetDefaults(registryKey) {
        try {
            if (!registryKey) {
                throw new Error('Registry key is required');
            }

            this.logger.log(`⚙️ EffectConfigurationManager: Resetting defaults for ${registryKey}`);
            
            const success = await PreferencesService.removeEffectDefaults(registryKey);
            
            if (success) {
                // Clear from cache
                this.defaultsCache.delete(registryKey);
                
                this.logger.log(`✅ EffectConfigurationManager: Defaults reset for ${registryKey}`);
                
                // Emit event
                if (this.eventBus) {
                    this.eventBus.emit('effectconfigurer:defaults:reset', {
                        registryKey,
                        timestamp: new Date().toISOString()
                    });
                }
                
                return true;
            } else {
                this.logger.error(`❌ EffectConfigurationManager: Failed to reset defaults for ${registryKey}`);
                return false;
            }
            
        } catch (error) {
            this.logger.error(`❌ EffectConfigurationManager: Error resetting defaults for ${registryKey}:`, error);
            return false;
        }
    }

    /**
     * Clear all caches
     */
    clearCaches() {
        this.schemaCache.clear();
        this.defaultsCache.clear();
        this.logger.log('⚙️ EffectConfigurationManager: All caches cleared');
    }

    /**
     * Get configuration metrics for monitoring
     * @returns {Object} Current configuration metrics
     */
    getConfigurationMetrics() {
        return {
            ...this.configMetrics,
            averageConfigurationTime: this.configMetrics.configurationsProcessed > 0 
                ? this.configMetrics.configurationTime / this.configMetrics.configurationsProcessed 
                : 0,
            cacheHitRate: {
                schemas: this.schemaCache.size,
                defaults: this.defaultsCache.size
            }
        };
    }

    /**
     * Reset configuration metrics
     */
    resetMetrics() {
        this.configMetrics = {
            schemasLoaded: 0,
            configurationsProcessed: 0,
            defaultsApplied: 0,
            centerPositionsApplied: 0,
            configurationTime: 0
        };
        this.logger.log('⚙️ EffectConfigurationManager: Metrics reset');
    }

    /**
     * Check if service meets performance baselines
     * @returns {Object} Performance check result
     */
    checkPerformanceBaseline() {
        const metrics = this.getConfigurationMetrics();
        const instanceProperties = Object.keys(this).length;
        
        return {
            meetsBaseline: metrics.averageConfigurationTime <= this.performanceBaseline.maxConfigurationTime &&
                          instanceProperties <= this.performanceBaseline.maxInstanceProperties,
            averageConfigurationTime: metrics.averageConfigurationTime,
            maxConfigurationTime: this.performanceBaseline.maxConfigurationTime,
            instanceProperties,
            maxInstanceProperties: this.performanceBaseline.maxInstanceProperties
        };
    }
}

export default EffectConfigurationManager;