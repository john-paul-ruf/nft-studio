import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConfigIntrospector } from '../../utils/ConfigIntrospector.js';
import EffectFormRenderer from '../forms/EffectFormRenderer.jsx';
import AttachedEffectsDisplay from '../forms/AttachedEffectsDisplay.jsx';
import PercentChanceControl from '../forms/PercentChanceControl.jsx';
import PresetSelector from './PresetSelector.jsx';
import { serializeFieldValue } from '../forms/EffectFormSubmitter.js';
import CenterUtils from '../../utils/CenterUtils.js';
import { useServices } from '../../contexts/ServiceContext.js';
import PreferencesService from '../../services/PreferencesService.js';
import EffectFormValidator from '../../services/EffectFormValidator.js';
import EffectConfigurationManager from '../../services/EffectConfigurationManager.js';
import EffectEventCoordinator from '../../services/EffectEventCoordinator.js';
import EffectUpdateCoordinator from '../../services/EffectUpdateCoordinator.js';
import {
    Box,
    Typography,
    Paper,
    Button,
    useTheme
} from '@mui/material';
import { RestartAlt } from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';

/**
 * EffectConfigurer - Refactored Service Orchestrator
 * 
 * This component has been refactored from a 532-line god object into a service orchestrator
 * that coordinates four focused services:
 * 
 * 1. EffectFormValidator - Handles all form validation logic
 * 2. EffectConfigurationManager - Manages configuration schemas and defaults
 * 3. EffectEventCoordinator - Coordinates all event emission and handling
 * 4. EffectUpdateCoordinator - Orchestrates debounced updates and state synchronization
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
    
    // 🔒 CRITICAL: Store onConfigChange in ref for the update coordinator callback
    // The effect context is captured at schedule time and stored in metadata
    const onConfigChangeRef = useRef(onConfigChange);
    
    // Initialize services with dependency injection
    const [services] = useState(() => {
        const eventBus = eventBusService || { emit: () => {}, subscribe: () => {} };
        const logger = { log: console.log, error: console.error };
        
        const validator = new EffectFormValidator({ eventBus, logger });
        const configManager = new EffectConfigurationManager({ eventBus, logger });
        const eventCoordinator = new EffectEventCoordinator({ eventBus, logger });
        
        // 🔒 CRITICAL FIX: Set onUpdate callback ONCE during initialization
        // This callback uses the effect context stored WITH the config in metadata
        // Previously, setOnUpdate was called on every field change, overwriting the previous callback
        // This caused debounced updates to use the wrong effect context after reordering
        const updateCoordinator = new EffectUpdateCoordinator({
            eventBus,
            logger,
            debounceMs: 300,
            onUpdate: (config, metadata) => {
                // 🔒 CRITICAL: Use effect context from metadata (captured at schedule time)
                // This ensures the config is paired with the correct effect context
                // Even if the user has selected a different effect by the time this fires
                const effectContext = metadata.effectContext;
                const currentOnConfigChange = onConfigChangeRef.current;
                
                console.log('🔧 EffectConfigurer: Debounced update firing:', {
                    effectId: effectContext?.effectId,
                    effectIndex: effectContext?.effectIndex,
                    effectName: effectContext?.effectName,
                    configKeys: Object.keys(config),
                    metadata
                });
                
                eventCoordinator.coordinateConfigurationChange(
                    config,
                    effectContext,
                    currentOnConfigChange,
                    metadata
                );
            },
            enableBatching: true,
            maxBatchSize: 10
        });
        
        return {
            validator,
            configManager,
            eventCoordinator,
            updateCoordinator
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
    
    // 🔒 CRITICAL: Keep onConfigChange ref in sync with prop
    // The update coordinator callback reads this ref to get the current callback
    useEffect(() => {
        onConfigChangeRef.current = onConfigChange;
    }, [onConfigChange]);

    // Cleanup update coordinator on unmount
    useEffect(() => {
        return () => {
            // Destroy coordinator (automatically flushes pending updates)
            services.updateCoordinator.destroy();
        };
    }, [services.updateCoordinator]);

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
            // Deep comparison to avoid unnecessary updates
            const configChanged = JSON.stringify(initialConfig) !== JSON.stringify(configRef.current);
            
            // CRITICAL: Don't revert if user has modified the config (e.g., applied a preset)
            // Only sync if this is a genuine external change (like resolution scaling)
            if (configChanged && !services.updateCoordinator.getUserModified()) {
                console.log('📝 EffectConfigurer: Syncing with initialConfig (editing existing effect)', {
                    effect: selectedEffect?.registryKey,
                    initialConfig
                });
                setEffectConfig(initialConfig);
                configRef.current = initialConfig;
                // Mark that we're editing an existing effect and should never load defaults
                services.updateCoordinator.setEditingExistingEffect(true);
                defaultsLoadedForEffect.current = selectedEffect?.registryKey;
            } else if (configChanged && services.updateCoordinator.getUserModified()) {
                console.log('🚫 EffectConfigurer: Skipping sync - user has modified config', {
                    effect: selectedEffect?.registryKey
                });
            }
        } else if (!initialConfig || Object.keys(initialConfig).length === 0) {
            // Reset when switching to a new effect without initialConfig
            console.log('🆕 EffectConfigurer: Resetting config (new effect)', {
                effect: selectedEffect?.registryKey
            });
            setEffectConfig({});
            configRef.current = {};
            services.updateCoordinator.resetFlags(); // Reset all flags
            defaultsLoadedForEffect.current = null;
        }
    }, [initialConfig, selectedEffect?.registryKey, resolutionKey, services.updateCoordinator]);

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

    // ⚠️ REMOVED: Automatic defaults loading
    // Effects are now created with empty configuration - NO defaults applied automatically
    // Users must manually configure all effect parameters
    // This ensures complete control and prevents unexpected behavior from saved defaults

    // Field change handler - converts individual field changes to full config updates
    const handleFieldChange = useCallback((fieldName, fieldValue) => {

        // Create updated config with the new field value
        const updatedConfig = {
            ...configRef.current,
            [fieldName]: fieldValue
        };

        // Update local state IMMEDIATELY (for responsive UI)
        setEffectConfig(updatedConfig);
        configRef.current = updatedConfig;

        // Validate configuration using EffectFormValidator IMMEDIATELY
        if (schemaRef.current) {
            const validation = services.validator.validateConfiguration(updatedConfig, schemaRef.current);
            setValidationErrors(validation.errors);
            setIsConfigComplete(validation.isComplete);
        }

        // 🔒 CRITICAL FIX: Schedule DEBOUNCED update through EffectUpdateCoordinator
        // Store the effect context WITH the config so they stay paired together
        // This prevents the config from one effect being applied to a different effect
        services.updateCoordinator.scheduleUpdate(
            updatedConfig,
            { 
                fieldName, 
                fieldValue, 
                source: 'user-input', 
                timestamp: Date.now(),
                // 🔒 CRITICAL: Capture effect context at schedule time (not execution time)
                effectContext: {
                    effectId: selectedEffect?.effectId,
                    effectIndex: selectedEffect?.effectIndex,
                    effectName: selectedEffect?.effectName,
                    effectType: selectedEffect?.effectType
                }
            }
        );

    }, [services, selectedEffect]);

    // Configuration change handler with service coordination (for bulk updates)
    const handleConfigurationChange = useCallback((newConfig, metadata = {}) => {

        // Update local state IMMEDIATELY (for responsive UI)
        setEffectConfig(newConfig);
        configRef.current = newConfig;

        // Validate configuration using EffectFormValidator IMMEDIATELY
        if (schemaRef.current) {
            const validation = services.validator.validateConfiguration(newConfig, schemaRef.current);
            setValidationErrors(validation.errors);
            setIsConfigComplete(validation.isComplete);
        }

        // 🔒 CRITICAL FIX: Schedule DEBOUNCED update through EffectUpdateCoordinator
        // Store the effect context WITH the config so they stay paired together
        // This prevents the config from one effect being applied to a different effect
        services.updateCoordinator.scheduleUpdate(
            newConfig,
            { 
                ...metadata, 
                timestamp: Date.now(),
                // 🔒 CRITICAL: Capture effect context at schedule time (not execution time)
                effectContext: {
                    effectId: selectedEffect?.effectId,
                    effectIndex: selectedEffect?.effectIndex,
                    effectName: selectedEffect?.effectName,
                    effectType: selectedEffect?.effectType
                }
            }
        );

    }, [services, selectedEffect]);

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

    // Save user preset handler (replaces save as default)
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [saveError, setSaveError] = useState('');

    const openSavePresetDialog = useCallback(() => {
        if (!selectedEffect?.registryKey || !configRef.current) {
            console.warn('⚠️ Cannot save preset: missing effect or config');
            return;
        }
        setPresetName('');
        setSaveError('');
        setSaveDialogOpen(true);
    }, [selectedEffect?.registryKey]);

    const handleConfirmSavePreset = useCallback(async () => {
        const name = (presetName || '').trim();
        // Basic validation
        if (name.length < 1 || name.length > 64) {
            setSaveError('Name must be between 1 and 64 characters');
            return;
        }
        if (!/^[\w\-\s]+$/.test(name)) {
            setSaveError('Only letters, numbers, spaces, dashes and underscores are allowed');
            return;
        }
        try {
            const result = await window.api.saveUserPreset(selectedEffect.registryKey, name, configRef.current);
            if (!result?.success) {
                setSaveError(result?.error || 'Failed to save preset');
                return;
            }
            setSaveDialogOpen(false);
        } catch (error) {
            console.error('❌ Error saving user preset:', error);
            setSaveError('Error saving preset');
        }
    }, [presetName, selectedEffect?.registryKey]);

    // Reset defaults handler
    const handleResetDefaults = useCallback(async () => {
        if (!selectedEffect?.registryKey) {
            console.warn('⚠️ Cannot reset defaults: missing effect');
            return;
        }

        try {
            await services.configManager.resetDefaults(selectedEffect.registryKey);

            // Reset the user modification flag to allow fresh start
            userModifiedConfig.current = false;

            // Clear current configuration
            handleConfigurationChange({}, { source: 'reset' });
        } catch (error) {
            console.error('❌ Error resetting defaults:', error);
        }
    }, [selectedEffect?.registryKey, services.configManager, handleConfigurationChange]);

    // Preset selection handler
    const handlePresetSelect = useCallback((presetConfig, preset) => {
        if (!presetConfig) {
            console.warn('⚠️ Cannot apply preset: missing config');
            return;
        }

        console.log('✅ Applying preset configuration:', preset.name, presetConfig);
        
        // Apply the preset configuration using the configuration change handler
        // Note: presetConfig should already be deserialized by PresetSelector
        // (converted from __type metadata format to plain objects)
        // This will trigger validation and update the form
        handleConfigurationChange(presetConfig, {
            source: 'preset',
            presetName: preset.name,
            timestamp: Date.now()
        });
    }, [handleConfigurationChange]);

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
        <>
            <Box sx={{ p: 2 }}>
                {/* Effect Header */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        {selectedEffect.name} - {selectedEffect.id}
                    </Typography>
                </Box>

                {/* Preset Selector */}
                <PresetSelector
                    selectedEffect={selectedEffect}
                    onPresetSelect={handlePresetSelect}
                />

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

                    {/* Save Preset Button */}
                    <Button
                        variant="outlined"
                        onClick={openSavePresetDialog}
                        disabled={!isConfigComplete}
                        sx={{ minWidth: 120 }}
                    >
                        Save Preset
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
            </Box>

            {/* Save Preset Dialog */}
            <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Save Preset</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Preset name"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        error={!!saveError}
                        helperText={saveError || 'Enter a unique name'}
                        inputProps={{ maxLength: 64 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleConfirmSavePreset}>Save</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default EffectConfigurer;