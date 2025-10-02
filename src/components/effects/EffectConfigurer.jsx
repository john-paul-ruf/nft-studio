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
    
    // Single source of truth: use initialConfig directly, no local state
    const effectConfig = initialConfig || {};
    
    // Refs for performance optimization
    const configRef = useRef(effectConfig);
    const schemaRef = useRef(null);
    
    // Debug logging for props
    console.log('🔧 EffectConfigurer: Props received:', {
        selectedEffect,
        selectedEffectRegistryKey: selectedEffect?.registryKey,
        selectedEffectName: selectedEffect?.name,
        effectType: selectedEffect?.effectType,
        projectState,
        initialConfig,
        initialPercentChance,
        isModal,
        useWideLayout
    });

    // Initialize percent chance from props
    useEffect(() => {
        if (initialPercentChance !== null && initialPercentChance !== undefined) {
            setPercentChance(initialPercentChance);
        }
    }, [initialPercentChance]);

    // Load configuration schema when effect changes
    useEffect(() => {
        const loadSchema = async () => {
            if (!selectedEffect) {
                setConfigSchema(null);
                schemaRef.current = null;
                return;
            }

            try {
                console.log('🔄 Loading schema for effect:', selectedEffect.registryKey);
                
                // Use EffectConfigurationManager to load schema
                const schema = await services.configManager.loadConfigSchema(selectedEffect);
                
                if (schema) {
                    console.log('✅ Schema loaded successfully:', schema);
                    setConfigSchema(schema);
                    schemaRef.current = schema;
                    
                    // Validate current configuration against new schema
                    const validation = services.validator.validateConfiguration(effectConfig, schema);
                    setValidationErrors(validation.errors);
                    setIsConfigComplete(validation.isComplete);
                } else {
                    console.warn('⚠️ No schema found for effect:', selectedEffect.registryKey);
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
    }, [selectedEffect, services.configManager, services.validator, effectConfig]);

    // Check for saved defaults when effect changes
    useEffect(() => {
        const checkDefaults = async () => {
            if (!selectedEffect?.registryKey) return;

            try {
                const defaults = await services.configManager.checkForDefaults(selectedEffect.registryKey);
                if (defaults) {
                    console.log('📋 Found saved defaults for effect:', selectedEffect.registryKey, defaults);
                    // Apply defaults through configuration change
                    handleConfigurationChange(defaults);
                }
            } catch (error) {
                console.error('❌ Error checking defaults:', error);
            }
        };

        checkDefaults();
    }, [selectedEffect?.registryKey, services.configManager]);

    // Configuration change handler with service coordination
    const handleConfigurationChange = useCallback((newConfig, metadata = {}) => {
        console.log('🔄 Configuration change:', newConfig);
        
        // Update refs
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
        
        console.log('✅ Effect added:', selectedEffect.name, finalConfig);
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
        
        console.log('✅ Effect attached:', effect.name, config);
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
                    console.log('🔄 Resolution changed:', oldRes, '->', newRes);
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
        const previousResolution = useRef(currentResolution);
        
        if (currentResolution && previousResolution.current && currentResolution !== previousResolution.current) {
            handleResolutionChange(previousResolution.current, currentResolution);
        }
        
        previousResolution.current = currentResolution;
    }, [projectState?.targetResolution, services.eventCoordinator]);

    // Save as default handler
    const handleSaveAsDefault = useCallback(async () => {
        if (!selectedEffect?.registryKey || !configRef.current) {
            console.warn('⚠️ Cannot save defaults: missing effect or config');
            return;
        }

        try {
            await services.configManager.saveAsDefault(selectedEffect.registryKey, configRef.current);
            console.log('✅ Configuration saved as default for:', selectedEffect.registryKey);
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
            console.log('✅ Defaults reset for:', selectedEffect.registryKey);
            
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
                    Configure {selectedEffect.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Effect Type: {selectedEffect.effectType || 'Unknown'}
                </Typography>
            </Box>

            {/* Configuration Status */}
            {renderConfigurationStatus()}

            {/* Validation Errors */}
            {renderValidationErrors()}

            {/* Configuration Form */}
            {configSchema && (
                <Box sx={{ mb: 3 }}>
                    <EffectFormRenderer
                        schema={configSchema}
                        config={effectConfig}
                        onConfigChange={handleConfigurationChange}
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