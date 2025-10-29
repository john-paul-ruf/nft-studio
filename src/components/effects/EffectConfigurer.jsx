import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ConfigIntrospector } from '../../utils/configIntrospector.js';
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
import ConfigCloner from '../../utils/ConfigCloner.js';
import {
    Box,
    Typography,
    Button,
    Alert,
    useTheme
} from '@mui/material';
import { RestartAlt } from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';

// CSS Import - Centralized styles organized by component
import './EffectsPanel.bem.css';
import './EffectConfigurer.bem.css';

/**
 * EffectConfigurer - Service-Orchestrated Form Configuration Component
 * 
 * Provides a comprehensive configuration interface for effects with full validation,
 * preset management, and coordinated state updates.
 * 
 * ## Architecture
 * - **Service Orchestration**: Coordinates four focused services (Validator, ConfigManager, EventCoordinator, UpdateCoordinator)
 * - **Debounced Updates**: Uses EffectUpdateCoordinator to prevent rapid-fire state changes
 * - **Automatic Validation**: Real-time form validation with error display
 * - **Preset System**: Save/load effect configurations as reusable presets
 * - **Theme Integration**: Uses Material-UI theme variables for consistent styling
 * 
 * ## Critical Patterns
 * 🔒 **Effect Context Storage**: Effect ID and metadata captured at schedule time (not execution time)
 *    to prevent stale reference bugs after effect reordering
 * 🔒 **Callback Ref**: `onConfigChangeRef` kept in sync to support dynamic callback updates
 *    while maintaining stable effect context pairing
 * 
 * ## Usage Example
 * ```jsx
 * <EffectConfigurer
 *   selectedEffect={{effectId: '123', name: 'Blur'}}
 *   projectState={projectState}
 *   onConfigChange={(config) => updateEffect(config)}
 *   initialConfig={{radius: 10}}
 * />
 * ```
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.selectedEffect - The currently selected effect
 * @param {string} props.selectedEffect.effectId - Stable unique identifier
 * @param {string} props.selectedEffect.registryKey - Effect type identifier
 * @param {Object} props.projectState - Project state for context
 * @param {Function} props.onConfigChange - Configuration change callback
 * @param {Function} [props.onAddEffect] - Add effect callback
 * @returns {React.ReactElement}
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
    const { eventBusService } = useServices();
    const theme = useTheme();

    // 🔒 CRITICAL: Verify eventBusService is available
    if (!eventBusService) {
        console.error('❌ EffectConfigurer: eventBusService is NOT available - config changes will NOT be persisted!');
    } else {
        console.log('✅ EffectConfigurer: eventBusService is available');
    }

    // 🔒 CRITICAL: Store onConfigChange in ref for the update coordinator callback
    // The effect context is captured at schedule time and stored in metadata
    const onConfigChangeRef = useRef(onConfigChange);
    
    // Initialize services with dependency injection
    const [services] = useState(() => {
        const eventBus = eventBusService || { emit: () => {}, subscribe: () => {} };
        if (!eventBusService) {
            console.error('⚠️ EffectConfigurer: Creating mock event bus - THIS IS A FALLBACK AND SHOULD NOT HAPPEN');
        }
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
                    effectType: effectContext?.effectType,
                    subIndex: effectContext?.subIndex,
                    configKeys: Object.keys(config),
                    fullEffectContext: effectContext,
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
    // 🔒 CRITICAL: Deep-clone initialConfig to prevent shared references between effects
    const [effectConfig, setEffectConfig] = useState(() => 
        ConfigCloner.deepClone(initialConfig || {})
    );
    
    // Refs for performance optimization
    const configRef = useRef(effectConfig);
    const schemaRef = useRef(null);
    const previousResolution = useRef(projectState?.targetResolution);
    const defaultsLoadedForEffect = useRef(null); // Track which effect (by ID) we've loaded defaults for
    const prevEffectIdRef = useRef(null); // Track last effect ID to detect selection changes
    
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
        const currentId = selectedEffect?.effectId || null;
        const effectChanged = prevEffectIdRef.current && currentId && prevEffectIdRef.current !== currentId;

        // If selection changed while a debounced update is pending, flush it so A's config is applied to A
        if (effectChanged) {
            try {
                console.log('🔄 EffectConfigurer: Effect selection changed, flushing pending updates:', {
                    prevEffectId: prevEffectIdRef.current,
                    currentId: currentId
                });
                const flushResult = services.updateCoordinator.flush?.();
                console.log('✅ EffectConfigurer: Flush completed with result:', flushResult);
            } catch (e) {
                console.error('❌ EffectConfigurer: flush on selection change failed', e);
            }
            // Reset user-modified flag when switching effects to avoid blocking sync to the new effect's config
            services.updateCoordinator.setUserModified?.(false);
            // Apply the newly selected effect's initial config immediately for UI correctness
            if (initialConfig && Object.keys(initialConfig).length > 0) {
                // 🔒 CRITICAL: Deep-clone initialConfig to prevent shared references
                const clonedConfig = ConfigCloner.deepClone(initialConfig);
                setEffectConfig(clonedConfig);
                configRef.current = clonedConfig;
                services.updateCoordinator.setEditingExistingEffect?.(true);
                defaultsLoadedForEffect.current = currentId;
            } else {
                setEffectConfig({});
                configRef.current = {};
                services.updateCoordinator.resetFlags?.();
                defaultsLoadedForEffect.current = null;
            }
            prevEffectIdRef.current = currentId;
            return; // Prevent further syncing logic in this run
        }
        prevEffectIdRef.current = currentId;

        if (initialConfig && Object.keys(initialConfig).length > 0) {
            // Deep comparison to avoid unnecessary updates
            const configChanged = JSON.stringify(initialConfig) !== JSON.stringify(configRef.current);
            
            // Only sync if this is a genuine external change (like resolution scaling)
            if (configChanged && !services.updateCoordinator.getUserModified()) {
                console.log('📝 EffectConfigurer: Syncing with initialConfig (editing existing effect)', {
                    effectId: selectedEffect?.effectId,
                    effect: selectedEffect?.registryKey,
                    initialConfig
                });
                // 🔒 CRITICAL: Deep-clone initialConfig to prevent shared references
                const clonedConfig = ConfigCloner.deepClone(initialConfig);
                setEffectConfig(clonedConfig);
                configRef.current = clonedConfig;
                // Mark that we're editing an existing effect and should never load defaults
                services.updateCoordinator.setEditingExistingEffect(true);
                defaultsLoadedForEffect.current = selectedEffect?.effectId;
            } else if (configChanged && services.updateCoordinator.getUserModified()) {
                console.log('🚫 EffectConfigurer: Skipping sync - user has modified config', {
                    effectId: selectedEffect?.effectId,
                    effect: selectedEffect?.registryKey
                });
            }
        } else if (!initialConfig || Object.keys(initialConfig).length === 0) {
            // Reset when switching to a new effect without initialConfig
            console.log('🆕 EffectConfigurer: Resetting config (new effect)', {
                effectId: selectedEffect?.effectId,
                effect: selectedEffect?.registryKey
            });
            setEffectConfig({});
            configRef.current = {};
            services.updateCoordinator.resetFlags(); // Reset all flags
            defaultsLoadedForEffect.current = null;
        }
    }, [initialConfig, selectedEffect?.effectId, resolutionKey, services.updateCoordinator]);

    // 🔒 CRITICAL: Sync Canvas.selectedEffect when editing nested effects (keyframe/secondary)
    // When EffectConfigurer is editing a keyframe/secondary, emit effect:selected so Canvas updates too
    // This ensures Canvas.selectedEffect has the correct effectType and subIndex for proper command routing
    useEffect(() => {
        if (!selectedEffect || !eventBusService) return;

        // Check if we're editing a nested effect (keyframe or secondary)
        const isNestedEffect = selectedEffect.effectType === 'keyframe' || 
                              selectedEffect.effectType === 'secondary' ||
                              (selectedEffect.subIndex !== null && selectedEffect.subIndex !== undefined);

        if (isNestedEffect) {
            console.log('🎯 EffectConfigurer: Syncing Canvas.selectedEffect for nested effect:', {
                effectId: selectedEffect.effectId,
                effectIndex: selectedEffect.effectIndex,
                effectType: selectedEffect.effectType,
                subIndex: selectedEffect.subIndex,
                name: selectedEffect.name
            });

            // Emit effect:selected to update Canvas.selectedEffect with correct nested effect context
            eventBusService.emit('effect:selected', {
                effectId: selectedEffect.effectId,
                effectIndex: selectedEffect.effectIndex,
                effectType: selectedEffect.effectType,
                subIndex: selectedEffect.subIndex,
                name: selectedEffect.name
            }, { component: 'EffectConfigurer' });
        }
    }, [selectedEffect?.effectId, selectedEffect?.effectType, selectedEffect?.subIndex, eventBusService]);

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
                    effectName: selectedEffect?.name || selectedEffect?.effectName,
                    effectType: selectedEffect?.effectType,
                    // 🔒 CRITICAL: Include subIndex for keyframe/secondary effects (identifies which nested effect to update)
                    // NOTE: Must use !== undefined check, not || null, because 0 is a valid falsy index value
                    subIndex: selectedEffect?.subIndex !== undefined ? selectedEffect.subIndex : null
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
                    effectName: selectedEffect?.name || selectedEffect?.effectName,
                    effectType: selectedEffect?.effectType,
                    // 🔒 CRITICAL: Include subIndex for keyframe/secondary effects (identifies which nested effect to update)
                    // NOTE: Must use !== undefined check, not || null, because 0 is a valid falsy index value
                    subIndex: selectedEffect?.subIndex !== undefined ? selectedEffect.subIndex : null
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

    // Render validation errors with theme-aware styling
    const renderValidationErrors = () => {
        if (Object.keys(validationErrors).length === 0) return null;

        return (
            <Alert 
                severity="error" 
                className="effect-configurer__error-alert"
                role="alert"
                aria-live="polite"
            >
                <Typography 
                    variant="subtitle2" 
                    className="effect-configurer__error-title"
                >
                    Configuration Errors:
                </Typography>
                {Object.entries(validationErrors).map(([field, error]) => (
                    <Typography 
                        key={field} 
                        variant="body2" 
                        className="effect-configurer__error-message"
                    >
                        • {field}: {error}
                    </Typography>
                ))}
            </Alert>
        );
    };

    // Render configuration status with theme-aware styling
    const renderConfigurationStatus = () => {
        const validationMetrics = getValidationMetrics();
        const configMetrics = getConfigurationMetrics();
        const eventMetrics = getEventMetrics();

        return (
            <Box
                className="effect-configurer__status"
                role="status"
            >
                <Typography 
                    variant="caption" 
                    className="effect-configurer__status-text"
                >
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
            <Box
                className="effect-configurer__empty-state"
                role="status"
                aria-label="No effect selected"
            >
                <Typography variant="body2" color="text.secondary">
                    Select an effect to configure
                </Typography>
            </Box>
        );
    }

    return (
        <>
            <Box
                className="effectConfigurer effect-configurer__container"
            >
                {/* Preset Selector */}
                <PresetSelector
                    selectedEffect={selectedEffect}
                    onPresetSelect={handlePresetSelect}
                />

                {/* Validation Errors */}
                {renderValidationErrors()}

                {/* Configuration Form - Scrollable Area */}
                {configSchema && (
                    <Box className="effect-configurer__form-area">
                        <EffectFormRenderer
                            configSchema={configSchema}
                            effectConfig={effectConfig}
                            onConfigChange={handleFieldChange}
                            projectState={projectState}
                            validationErrors={validationErrors}
                        />
                        
                        {/* Percent Chance Control - Now Part of Scrollable Area */}
                        {!isModal && (
                            <Box className="effect-configurer__percent-chance-wrapper">
                                <PercentChanceControl
                                    value={percentChance}
                                    onChange={setPercentChance}
                                />
                            </Box>
                        )}
                    </Box>
                )}

                {/* Attached Effects Display */}
                {attachedEffects && attachedEffects.length > 0 && (
                    <Box className="effect-configurer__attached-effects-wrapper">
                        <AttachedEffectsDisplay
                            effects={attachedEffects}
                            onRemove={onRemoveAttachedEffect}
                        />
                    </Box>
                )}

                {/* Action Buttons */}
                <Box
                    className="effect-configurer__actions"
                >
                    {/* Save Preset Button */}
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={openSavePresetDialog}
                        disabled={!isConfigComplete}
                        aria-label="Save current configuration as preset"
                        className="effect-configurer__save-preset-button"
                    >
                        Save Preset
                    </Button>

                    {/* Reset Defaults Button */}
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RestartAlt />}
                        onClick={handleResetDefaults}
                        aria-label="Reset configuration to defaults"
                        className="effect-configurer__reset-button"
                    >
                        Reset
                    </Button>
                </Box>
            </Box>

            {/* Save Preset Dialog */}
            <Dialog 
                open={saveDialogOpen} 
                onClose={() => setSaveDialogOpen(false)} 
                maxWidth="xs" 
                fullWidth
                aria-labelledby="save-preset-dialog"
            >
                <DialogTitle id="save-preset-dialog" className="effect-configurer__dialog-title">
                    Save Configuration as Preset
                </DialogTitle>
                <DialogContent className="effect-configurer__dialog-content">
                    <TextField
                        autoFocus
                        fullWidth
                        label="Preset name"
                        placeholder="Enter unique name"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        error={!!saveError}
                        helperText={saveError || 'Enter a unique name (1-64 characters)'}
                        inputProps={{ maxLength: 64 }}
                        size="small"
                        aria-label="Preset name input"
                    />
                </DialogContent>
                <DialogActions className="effect-configurer__dialog-actions">
                    <Button 
                        onClick={() => setSaveDialogOpen(false)}
                        variant="outlined"
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleConfirmSavePreset}
                        disabled={!presetName.trim()}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

/**
 * PropTypes validation for EffectConfigurer
 * 
 * Documents expected prop shapes and validates at runtime.
 * Following patterns from refactored EffectsPanel components.
 */
EffectConfigurer.propTypes = {
    /** Currently selected effect for configuration */
    selectedEffect: PropTypes.shape({
        effectId: PropTypes.string.isRequired,
        registryKey: PropTypes.string,
        name: PropTypes.string,
        effectType: PropTypes.string,
        effectIndex: PropTypes.number,
        id: PropTypes.string, // Fallback for legacy prop name
    }),
    
    /** Project state for context and resolution information */
    projectState: PropTypes.shape({
        targetResolution: PropTypes.string,
        getTargetResolution: PropTypes.func,
        getIsHorizontal: PropTypes.func,
    }),
    
    /** Callback when configuration changes */
    onConfigChange: PropTypes.func,
    
    /** Callback when effect should be added */
    onAddEffect: PropTypes.func,
    
    /** Is this component running in modal mode */
    isModal: PropTypes.bool,
    
    /** Effect type for new effect creation */
    effectType: PropTypes.string,
    
    /** Available effects for selection */
    availableEffects: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string,
    })),
    
    /** Attached sub-effects */
    attachedEffects: PropTypes.array,
    
    /** Callback to attach effects */
    onAttachEffect: PropTypes.func,
    
    /** Callback to remove attached effects */
    onRemoveAttachedEffect: PropTypes.func,
    
    /** Initial configuration values */
    initialConfig: PropTypes.object,
    
    /** Initial percent chance value */
    initialPercentChance: PropTypes.number,
    
    /** Use wide layout instead of standard */
    useWideLayout: PropTypes.bool,
};

/**
 * Default props
 */
EffectConfigurer.defaultProps = {
    selectedEffect: null,
    projectState: null,
    onConfigChange: () => {},
    onAddEffect: null,
    isModal: false,
    effectType: null,
    availableEffects: null,
    attachedEffects: null,
    onAttachEffect: null,
    onRemoveAttachedEffect: null,
    initialConfig: null,
    initialPercentChance: null,
    useWideLayout: false,
};

export default EffectConfigurer;