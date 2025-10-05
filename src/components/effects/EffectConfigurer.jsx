import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConfigIntrospector } from '../../utils/configIntrospector.js';
import EffectAttachmentModal from './EffectAttachmentModal.jsx';
import EffectFormRenderer from '../forms/EffectFormRenderer.jsx';
import AttachedEffectsDisplay from '../forms/AttachedEffectsDisplay.jsx';
import PercentChanceControl from '../forms/PercentChanceControl.jsx';
import { serializeFieldValue } from '../forms/EffectFormSubmitter.js';
import CenterUtils from '../../utils/CenterUtils.js';
import { useServices } from '../../contexts/ServiceContext.js';
import PreferencesService from '../../services/PreferencesService.js';
import EffectFormValidator from '../../services/EffectFormValidator.js';
import EffectConfigurationManager from '../../services/EffectConfigurationManager.js';
import EffectEventCoordinator from '../../services/EffectEventCoordinator.js';
import {
    Box,
    Typography,
    Paper,
    Button,
    useTheme
} from '@mui/material';
import { RestartAlt } from '@mui/icons-material';

/**
 * EffectConfigurer - Refactored Service Orchestrator
 * 
 * This component has been refactored from a 532-line god object into a service orchestrator
 * that coordinates three focused services:
 * 
 * 1. EffectFormValidator - Handles all form validation logic
 * 2. EffectConfigurationManager - Manages configuration schemas and defaults
 * 3. EffectEventCoordinator - Coordinates all event emission and handling
 * 
 * The component now focuses on:
 * - UI rendering and user interaction
 * - Service coordination and orchestration
 * - React state management and lifecycle
 * - Backward compatibility with existing props and callbacks
 */
function EffectConfigurer({
    selectedEffect,
    projectState,
    onConfigChange,
    onAddEffect,
    onAddCompleteEffect = null,
    isModal = false,
    effectType = null,
    availableEffects = null,
    attachedEffects = null,
    onAttachEffect = null,
    onRemoveAttachedEffect = null,
    initialConfig = null,
    initialPercentChance = null,
    useWideLayout = false
}) {
    const theme = useTheme();
    const { eventBusService } = useServices();
    
    // Initialize services with dependency injection
    const [services] = useState(() => {
        const eventBus = eventBusService || { emit: () => {}, subscribe: () => {} };
        const logger = { log: console.log, error: console.error };
        
        return {
            validator: new EffectFormValidator({ eventBus, logger }),
            configManager: new EffectConfigurationManager({ eventBus, logger }),
            eventCoordinator: new EffectEventCoordinator({ eventBus, logger })
        };
    });
    
    // React state management
    const [configSchema, setConfigSchema] = useState(null);
    const [percentChance, setPercentChance] = useState(100);
    const [validationErrors, setValidationErrors] = useState({});
    const [isConfigComplete, setIsConfigComplete] = useState(false);
    const [effectConfig, setEffectConfig] = useState(initialConfig || {});
    
    // Refs for performance optimization
    const configRef = useRef(effectConfig);
    const schemaRef = useRef(null);
    const previousResolution = useRef(projectState?.targetResolution);
    const defaultsLoadedForEffect = useRef(null); // Track which effect we've loaded defaults for

    // Initialize percent chance from props
    useEffect(() => {
        if (initialPercentChance !== null && initialPercentChance !== undefined) {
            setPercentChance(initialPercentChance);
        }
    }, [initialPercentChance]);

    // Track resolution changes to detect when positions have been scaled
    const currentResolution = projectState ? projectState.getTargetResolution() : null;
    const currentOrientation = projectState ? projectState.getIsHorizontal() : null;
    const resolutionKey = `${currentResolution}-${currentOrientation}`;

    // Sync effectConfig with initialConfig when it changes OR when resolution changes
    // This ensures that when editing an existing effect, we use the config from ProjectState
    // and that we pick up scaled positions after resolution changes
    useEffect(() => {
        if (initialConfig && Object.keys(initialConfig).length > 0) {
            setEffectConfig(initialConfig);
            configRef.current = initialConfig;
            // Mark that we're using initialConfig, so we don't load defaults
            defaultsLoadedForEffect.current = selectedEffect?.registryKey;
        } else if (!initialConfig || Object.keys(initialConfig).length === 0) {
            // Reset when switching to a new effect without initialConfig
            setEffectConfig({});
            configRef.current = {};
            defaultsLoadedForEffect.current = null;
        }
    }, [initialConfig, selectedEffect?.registryKey, resolutionKey]);

    // Load configuration schema when effect changes
    useEffect(() => {
        const loadSchema = async () => {
            if (!selectedEffect) {
                setConfigSchema(null);
                schemaRef.current = null;
                return;
            }

            try {

                // Use EffectConfigurationManager to load schema
                const schema = await services.configManager.loadConfigSchema(selectedEffect, projectState);
                
                if (schema) {
                    setConfigSchema(schema);
                    schemaRef.current = schema;
                    
                    // Validate current configuration against new schema
                    const validation = services.validator.validateConfiguration(effectConfig, schema);
                    setValidationErrors(validation.errors);
                    setIsConfigComplete(validation.isComplete);
                } else {
                    setConfigSchema(null);
                    schemaRef.current = null;
                }
            } catch (error) {
                console.error('❌ Error loading schema:', error);
                setConfigSchema(null);
                schemaRef.current = null;
            }
        };

        loadSchema();
    }, [selectedEffect, projectState, services.configManager, services.validator, effectConfig]);

    // Check for saved defaults when effect changes
    // ONLY apply defaults when there's no initialConfig (i.e., when adding a new effect)
    useEffect(() => {
        const checkDefaults = async () => {
            if (!selectedEffect?.registryKey) return;
            
            // Don't apply defaults if we've already loaded initialConfig for this effect
            if (defaultsLoadedForEffect.current === selectedEffect.registryKey) {
                console.log('📋 Skipping defaults - already using initialConfig for:', selectedEffect.registryKey);
                return;
            }
            
            // Don't apply defaults if we have an initialConfig (editing existing effect)
            if (initialConfig && Object.keys(initialConfig).length > 0) {
                console.log('📋 Skipping defaults - using initialConfig for existing effect:', selectedEffect.registryKey);
                return;
            }

            try {
                const defaults = await services.configManager.checkForDefaults(selectedEffect.registryKey);
                if (defaults) {
                    // Mark that we've loaded defaults for this effect
                    defaultsLoadedForEffect.current = selectedEffect.registryKey;
                    // Apply defaults through configuration change
                    handleConfigurationChange(defaults);
                }
            } catch (error) {
                console.error('❌ Error checking defaults:', error);
            }
        };

        checkDefaults();
    }, [selectedEffect?.registryKey, services.configManager, initialConfig, handleConfigurationChange]);

    // Field change handler - converts individual field changes to full config updates
    const handleFieldChange = useCallback((fieldName, fieldValue) => {

        // Create updated config with the new field value
        const updatedConfig = {
            ...configRef.current,
            [fieldName]: fieldValue
        };
        
        // Update local state
        setEffectConfig(updatedConfig);
        configRef.current = updatedConfig;
        
        // Validate configuration using EffectFormValidator
        if (schemaRef.current) {
            const validation = services.validator.validateConfiguration(updatedConfig, schemaRef.current);
            setValidationErrors(validation.errors);
            setIsConfigComplete(validation.isComplete);
        }
        
        // Apply center defaults using EffectConfigurationManager
        const configWithDefaults = services.configManager.applyCenterDefaults(updatedConfig, projectState);
        
        // Process configuration change using EffectConfigurationManager
        services.configManager.processConfigurationChange(configWithDefaults, selectedEffect, onConfigChange);
        
        // Coordinate event emission using EffectEventCoordinator
        services.eventCoordinator.coordinateConfigurationChange(
            configWithDefaults, 
            selectedEffect, 
            onConfigChange,
            { fieldName, fieldValue, source: 'user-input', timestamp: Date.now() }
        );
        
    }, [selectedEffect, projectState, onConfigChange, services]);

    // Configuration change handler with service coordination (for bulk updates)
    const handleConfigurationChange = useCallback((newConfig, metadata = {}) => {

        // Update local state
        setEffectConfig(newConfig);
        configRef.current = newConfig;
        
        // Validate configuration using EffectFormValidator
        if (schemaRef.current) {
            const validation = services.validator.validateConfiguration(newConfig, schemaRef.current);
            setValidationErrors(validation.errors);
            setIsConfigComplete(validation.isComplete);
        }
        
        // Apply center defaults using EffectConfigurationManager
        const configWithDefaults = services.configManager.applyCenterDefaults(newConfig, projectState);
        
        // Process configuration change using EffectConfigurationManager
        services.configManager.processConfigurationChange(configWithDefaults, selectedEffect, onConfigChange);
        
        // Coordinate event emission using EffectEventCoordinator
        services.eventCoordinator.coordinateConfigurationChange(
            configWithDefaults, 
            selectedEffect, 
            onConfigChange,
            { ...metadata, source: 'user-input', timestamp: Date.now() }
        );
        
    }, [selectedEffect, projectState, onConfigChange, services]);

    // Effect addition handler with service coordination
    const handleAddEffect = useCallback(() => {
        if (!selectedEffect || !isConfigComplete) {
            console.warn('⚠️ Cannot add effect: missing effect or incomplete config');
            return;
        }

        const finalConfig = configRef.current;
        
        // Coordinate effect addition using EffectEventCoordinator
        services.eventCoordinator.coordinateEffectAddition(
            selectedEffect,
            finalConfig,
            onAddEffect
        );
        
    }, [selectedEffect, isConfigComplete, onAddEffect, services.eventCoordinator]);

    // Effect attachment handler with service coordination
    const handleAttachEffect = useCallback((effect, config) => {
        if (!effect || !config) {
            console.warn('⚠️ Cannot attach effect: missing effect or config');
            return;
        }

        // Coordinate effect attachment using EffectEventCoordinator
        services.eventCoordinator.coordinateEffectAttachment(
            effect,
            config,
            projectState,
            onAttachEffect
        );
        
    }, [projectState, onAttachEffect, services.eventCoordinator]);

    // Resolution change handler with service coordination
    useEffect(() => {
        const handleResolutionChange = (oldResolution, newResolution) => {
            // Coordinate resolution change using EffectEventCoordinator
            services.eventCoordinator.coordinateResolutionChange(
                oldResolution,
                newResolution,
                projectState,
                (oldRes, newRes, state) => {
                    // Re-validate configuration with new resolution
                    if (schemaRef.current) {
                        const validation = services.validator.validateConfiguration(configRef.current, schemaRef.current);
                        setValidationErrors(validation.errors);
                        setIsConfigComplete(validation.isComplete);
                    }
                }
            );
        };

        // Listen for resolution changes (if project state changes)
        const currentResolution = projectState?.targetResolution;

        if (currentResolution && previousResolution.current && currentResolution !== previousResolution.current) {
            handleResolutionChange(previousResolution.current, currentResolution);
        }

        previousResolution.current = currentResolution;
    }, [projectState?.targetResolution, services.eventCoordinator, services.validator]);

    // Save as default handler
    const handleSaveAsDefault = useCallback(async () => {
        if (!selectedEffect?.registryKey || !configRef.current) {
            console.warn('⚠️ Cannot save defaults: missing effect or config');
            return;
        }

        try {
            await services.configManager.saveAsDefault(selectedEffect.registryKey, configRef.current);
        } catch (error) {
            console.error('❌ Error saving defaults:', error);
        }
    }, [selectedEffect?.registryKey, services.configManager]);

    // Reset defaults handler
    const handleResetDefaults = useCallback(async () => {
        if (!selectedEffect?.registryKey) {
            console.warn('⚠️ Cannot reset defaults: missing effect');
            return;
        }

        try {
            await services.configManager.resetDefaults(selectedEffect.registryKey);

            // Clear current configuration
            handleConfigurationChange({});
        } catch (error) {
            console.error('❌ Error resetting defaults:', error);
        }
    }, [selectedEffect?.registryKey, services.configManager, handleConfigurationChange]);

    // Get validation metrics for debugging
    const getValidationMetrics = useCallback(() => {
        return services.validator.getValidationMetrics();
    }, [services.validator]);

    // Get configuration metrics for debugging
    const getConfigurationMetrics = useCallback(() => {
        return services.configManager.getConfigurationMetrics();
    }, [services.configManager]);

    // Get event metrics for debugging
    const getEventMetrics = useCallback(() => {
        return services.eventCoordinator.getEventMetrics();
    }, [services.eventCoordinator]);

    // Render validation errors
    const renderValidationErrors = () => {
        if (Object.keys(validationErrors).length === 0) return null;

        return (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="error.contrastText">
                    Configuration Errors:
                </Typography>
                {Object.entries(validationErrors).map(([field, error]) => (
                    <Typography key={field} variant="body2" color="error.contrastText">
                        • {field}: {error}
                    </Typography>
                ))}
            </Box>
        );
    };

    // Render configuration status
    const renderConfigurationStatus = () => {
        const validationMetrics = getValidationMetrics();
        const configMetrics = getConfigurationMetrics();
        const eventMetrics = getEventMetrics();

        return (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="caption" color="info.contrastText">
                    Status: {isConfigComplete ? '✅ Complete' : '⚠️ Incomplete'} | 
                    Validations: {validationMetrics.validationsPerformed} | 
                    Configs: {configMetrics.configurationsProcessed} | 
                    Events: {eventMetrics.eventsEmitted}
                </Typography>
            </Box>
        );
    };

    // Early return if no effect selected
    if (!selectedEffect) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                    Select an effect to configure
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            {/* Effect Header */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {selectedEffect.name} - {selectedEffect.id}
                </Typography>
            </Box>


            {/* Validation Errors */}
            {renderValidationErrors()}

            {/* Configuration Form */}
            {configSchema && (
                <Box sx={{ mb: 3 }}>
                    <EffectFormRenderer
                        configSchema={configSchema}
                        effectConfig={effectConfig}
                        onConfigChange={handleFieldChange}
                        projectState={projectState}
                        validationErrors={validationErrors}
                    />
                </Box>
            )}

            {/* Percent Chance Control */}
            {!isModal && (
                <Box sx={{ mb: 3 }}>
                    <PercentChanceControl
                        value={percentChance}
                        onChange={setPercentChance}
                    />
                </Box>
            )}

            {/* Attached Effects Display */}
            {attachedEffects && attachedEffects.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <AttachedEffectsDisplay
                        effects={attachedEffects}
                        onRemove={onRemoveAttachedEffect}
                    />
                </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Add Effect Button */}
                {onAddEffect && (
                    <Button
                        variant="contained"
                        onClick={handleAddEffect}
                        disabled={!isConfigComplete}
                        sx={{ minWidth: 120 }}
                    >
                        Add Effect
                    </Button>
                )}

                {/* Save as Default Button */}
                <Button
                    variant="outlined"
                    onClick={handleSaveAsDefault}
                    disabled={!isConfigComplete}
                    sx={{ minWidth: 120 }}
                >
                    Save as Default
                </Button>

                {/* Reset Defaults Button */}
                <Button
                    variant="outlined"
                    startIcon={<RestartAlt />}
                    onClick={handleResetDefaults}
                    sx={{ minWidth: 120 }}
                >
                    Reset Defaults
                </Button>
            </Box>

            {/* Effect Attachment Modal */}
            {availableEffects && (
                <EffectAttachmentModal
                    open={isModal}
                    effects={availableEffects}
                    onAttach={handleAttachEffect}
                    onClose={() => {}}
                />
            )}
        </Box>
    );
}

export default EffectConfigurer;