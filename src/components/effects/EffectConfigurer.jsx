import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConfigInputFactory from './inputs/ConfigInputFactory.jsx';
import { ConfigIntrospector } from '../../utils/configIntrospector.js';
import EffectAttachmentModal from './EffectAttachmentModal.jsx';
import PositionSerializer from '../../utils/PositionSerializer.js';
import CenterUtils from '../../utils/CenterUtils.js';
import { useServices } from '../../contexts/ServiceContext.js';
import PreferencesService from '../../services/PreferencesService.js';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Button,
    Card,
    CardContent,
    Chip,
    Alert,
    Slider,
    TextField,
    CircularProgress,
    Divider,
    Stack,
    useTheme
} from '@mui/material';
import { Add, Close } from '@mui/icons-material';


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
    const [configSchema, setConfigSchema] = useState(null);
    const [percentChance, setPercentChance] = useState(100);

    // Single source of truth: use initialConfig directly, no local state
    const effectConfig = initialConfig || {};

    // Debug logging for props
    console.log('🔧 EffectConfigurer: Props received:', {
        selectedEffect,
        selectedEffectRegistryKey: selectedEffect?.registryKey,
        selectedEffectName: selectedEffect?.name,
        effectType: selectedEffect?.effectType,
        subIndex: selectedEffect?.subEffectIndex,
        initialConfig,
        effectConfig,
        hasConfig: !!initialConfig,
        configKeys: initialConfig ? Object.keys(initialConfig) : 'none'
    });
    const [modalState, setModalState] = useState({
        isOpen: false,
        attachmentType: null,
        editingEffect: null,
        isEditing: false
    });

    // Cache to prevent repeated introspection calls for the same effect
    const introspectionCache = useRef(new Map());

    // Track when config has been updated by resolution changes
    const [configUpdateCounter, setConfigUpdateCounter] = useState(0);

    // Track if we're currently in live editing mode to prevent config reversion
    const [isLiveEditing, setIsLiveEditing] = useState(false);

    // Event-based handlers for config changes
    const handleConfigChangeEvent = useCallback((newConfig) => {
        console.log('🔧 EffectConfigurer: Emitting config change event:', { selectedEffect, newConfig });
        console.log('🔧 EffectConfigurer: selectedEffect details:', {
            effectIndex: selectedEffect?.effectIndex,
            effectType: selectedEffect?.effectType,
            subEffectIndex: selectedEffect?.subEffectIndex,
            registryKey: selectedEffect?.registryKey
        });

        // Extract effect identification from selectedEffect
        const effectContext = {
            effectIndex: selectedEffect?.effectIndex,
            effectType: selectedEffect?.effectType || 'primary',
            subEffectIndex: selectedEffect?.subEffectIndex,
            config: newConfig
        };

        console.log('🔧 EffectConfigurer: Emitting effectContext:', effectContext);

        eventBusService.emit('effectconfigurer:config:change', effectContext, {
            source: 'EffectConfigurer',
            component: 'EffectConfigurer'
        });

        // Also call the callback if provided (backward compatibility)
        if (onConfigChange) {
            onConfigChange(newConfig);
        }
    }, [eventBusService, selectedEffect, onConfigChange]);

    const handleAddEffectEvent = useCallback((effectData) => {
        console.log('🔧 EffectConfigurer: Emitting add effect event:', effectData);

        eventBusService.emit('effectconfigurer:effect:add', effectData, {
            source: 'EffectConfigurer',
            component: 'EffectConfigurer'
        });

        // Also call the callback if provided (backward compatibility)
        if (onAddEffect) {
            onAddEffect(effectData);
        }
    }, [eventBusService, onAddEffect]);

    const handleAttachEffectEvent = useCallback((effectData, attachmentType, isEditing = false) => {
        console.log('🔧 EffectConfigurer: Emitting attach effect event:', { effectData, attachmentType, isEditing });

        eventBusService.emit('effectconfigurer:effect:attach', {
            effectData,
            attachmentType,
            isEditing,
            parentEffect: selectedEffect
        }, {
            source: 'EffectConfigurer',
            component: 'EffectConfigurer'
        });

        // Also call the callback if provided (backward compatibility)
        if (onAttachEffect) {
            onAttachEffect(effectData, attachmentType, isEditing);
        }
    }, [eventBusService, selectedEffect, onAttachEffect]);

    /**
     * Apply center position defaults using unified CenterUtils
     * @param {Object} config - Default configuration instance
     * @param {Object} projectState - Project data with resolution info
     * @returns {Object} Configuration with center positions updated
     */
    const applyCenterDefaults = (config, projectState) => {
        console.log('🎯 EffectConfigurer: applyCenterDefaults called with:', {
            config: config,
            projectState: projectState,
            hasTargetResolution: !!projectState?.targetResolution,
            hasResolution: !!projectState?.resolution
        });

        const result = CenterUtils.detectAndApplyCenter(config, projectState);

        console.log('🎯 EffectConfigurer: applyCenterDefaults result:', {
            original: config,
            processed: result,
            changed: JSON.stringify(config) !== JSON.stringify(result)
        });

        return result;
    };

    useEffect(() => {
        console.log('🔧 EffectConfigurer: useEffect triggered with selectedEffect:', selectedEffect);
        console.log('🔧 EffectConfigurer: selectedEffect details:', {
            hasSelectedEffect: !!selectedEffect,
            name: selectedEffect?.name,
            className: selectedEffect?.className,
            config: selectedEffect?.config
        });

        if (selectedEffect) {
            loadConfigSchema(selectedEffect);
            // Only set percentChance here, let loadConfigSchema handle effectConfig
            setPercentChance(initialPercentChance || 100);
        } else {
            console.log('❌ EffectConfigurer: No selectedEffect, clearing config');
            setConfigSchema(null);
            setEffectConfig({});
        }
    }, [selectedEffect?.registryKey, initialPercentChance]); // Use registryKey only for consistency

    // Listen for resolution changes and refresh config if dialog is open
    useEffect(() => {
        if (!eventBusService) return;

        console.log('🔧 EffectConfigurer: Setting up resolution change listener');

        const unsubscribeResolution = eventBusService.subscribe('resolution:changed', (payload) => {
            console.log('🎯 EffectConfigurer: Resolution change detected while dialog open:', payload);

            if (selectedEffect && effectConfig && Object.keys(effectConfig).length > 0) {
                console.log('🔄 EffectConfigurer: Refreshing config for new resolution');

                // Re-apply center defaults to current config for new resolution
                const updatedConfig = applyCenterDefaults(effectConfig, projectState);
                console.log('🎯 EffectConfigurer: Updated config for resolution change:', {
                    original: effectConfig,
                    updated: updatedConfig,
                    changed: JSON.stringify(effectConfig) !== JSON.stringify(updatedConfig)
                });

                // Single source of truth: only notify parent, no local state
                handleConfigChangeEvent(updatedConfig);
                setConfigUpdateCounter(prev => prev + 1);
            }
        }, { component: 'EffectConfigurer' });

        const unsubscribeOrientation = eventBusService.subscribe('orientation:changed', (payload) => {
            console.log('🎯 EffectConfigurer: Orientation change detected while dialog open:', payload);

            if (selectedEffect && effectConfig && Object.keys(effectConfig).length > 0) {
                console.log('🔄 EffectConfigurer: Refreshing config for new orientation');

                // Re-apply center defaults to current config for new orientation
                const updatedConfig = applyCenterDefaults(effectConfig, projectState);
                console.log('🎯 EffectConfigurer: Updated config for orientation change:', {
                    original: effectConfig,
                    updated: updatedConfig,
                    changed: JSON.stringify(effectConfig) !== JSON.stringify(updatedConfig)
                });

                // Single source of truth: only notify parent, no local state
                handleConfigChangeEvent(updatedConfig);
                setConfigUpdateCounter(prev => prev + 1);
            }
        }, { component: 'EffectConfigurer' });

        return () => {
            console.log('🧹 EffectConfigurer: Cleaning up resolution change listeners');
            unsubscribeResolution();
            unsubscribeOrientation();
        };
    }, [eventBusService, selectedEffect, effectConfig, projectState, applyCenterDefaults, onConfigChange]);

    // No local state syncing needed - initialConfig IS the source of truth

    const loadConfigSchema = async (effect) => {
        try {
            console.log(`🔍 Loading config schema for effect:`, effect);
            console.log(`🔍 Effect registryKey:`, effect?.registryKey);
            console.log(`🔍 Effect name:`, effect?.name);
            console.log(`🔍 Effect keys:`, Object.keys(effect || {}));

            // CRITICAL: Fail fast if effect has no registryKey
            if (!effect || !effect.registryKey) {
                console.error('❌ loadConfigSchema: Effect missing registryKey, cannot proceed:', {
                    effect,
                    hasEffect: !!effect,
                    registryKey: effect?.registryKey,
                    name: effect?.name
                });
                setConfigSchema({ fields: [] });
                return;
            }

            // Create cache key based on effect registryKey only
            const cacheKey = effect.registryKey || 'unknown';

            // Check if we already have this schema cached
            if (introspectionCache.current.has(cacheKey)) {
                console.log(`🚀 Using cached schema for ${cacheKey}`);
                const schema = introspectionCache.current.get(cacheKey);
                setConfigSchema(schema);
            } else {
                console.log(`🔍 Loading new schema for ${cacheKey}`);
                console.log('🔍 Effect object being sent to analyzeConfigClass:', effect);
                const schema = await ConfigIntrospector.analyzeConfigClass(effect, projectState);

                // Cache the result
                introspectionCache.current.set(cacheKey, schema);
                setConfigSchema(schema);
            }

            // Get the current schema (from cache or fresh)
            const currentSchema = introspectionCache.current.get(cacheKey);

            // Use initial config if provided (editing mode), otherwise use defaults
            console.log('🔍 EffectConfigurer: Config decision branch:', {
                hasInitialConfig: !!(initialConfig && Object.keys(initialConfig).length > 0),
                hasDefaultInstance: !!currentSchema?.defaultInstance,
                initialConfig,
                currentSchema,
                defaultInstance: currentSchema?.defaultInstance
            });

            // Single source of truth: We no longer set local config here
            // The effectConfig is directly derived from initialConfig prop
            console.log('📝 EffectConfigurer: Schema loaded - relying on single source of truth (initialConfig prop)');
        } catch (error) {
            console.error('Error loading config schema:', error);
            setConfigSchema({ fields: [] });
        }
    };


    const handleConfigChange = (fieldName, value) => {
        // Serialize position objects before storing
        let serializedValue = value;
        if (value && typeof value === 'object' && value.name &&
            (value.name === 'position' || value.name === 'arc-path')) {
            serializedValue = PositionSerializer.serialize(value);
        }

        // Single source of truth: create new config and emit directly to ProjectState
        const newConfig = { ...effectConfig, [fieldName]: serializedValue };
        handleConfigChangeEvent(newConfig);
    };

    const handleAddEffect = () => {
        handleAddEffectEvent({
            effectClass: selectedEffect,
            config: effectConfig,
            percentChance: percentChance
        });
    };

    const handleOpenAttachmentModal = (attachmentType) => {
        setModalState({
            isOpen: true,
            attachmentType
        });
    };

    const handleCloseAttachmentModal = () => {
        setModalState({
            isOpen: false,
            attachmentType: null,
            editingEffect: null,
            isEditing: false
        });
    };

    const handleEditAttachedEffect = (attachmentType, effect) => {
        setModalState({
            isOpen: true,
            attachmentType,
            editingEffect: effect,
            isEditing: true
        });
    };

    const handleAttachEffect = (effectData, attachmentType) => {
        handleAttachEffectEvent(effectData, attachmentType);
    };

    const handleEditComplete = (effectData, attachmentType) => {
        // For editing mode, we need to handle the update differently
        // Pass along the original effect ID to identify which effect to update
        const updatedEffectData = {
            ...effectData,
            id: modalState.editingEffect?.id // Preserve the original ID
        };
        handleAttachEffectEvent(updatedEffectData, attachmentType, true); // true indicates editing mode
    };

    if (!selectedEffect) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#cccccc',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px dashed rgba(255,255,255,0.2)'
            }}>
                <h3 style={{ marginBottom: '1rem', color: '#ffffff' }}>No Effect Selected</h3>
                <p>Select an effect to configure its properties</p>
            </div>
        );
    }

    return (
        <Box sx={{ px: 3, py: 2 }}>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: theme.palette.background.default,
                    zIndex: 10,
                    py: 3,
                    px: 2,
                    mb: 3,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    boxShadow: `0 2px 4px ${theme.palette.action.hover}`,
                    borderRadius: '8px 8px 0 0'
                }}
            >
                <Typography variant="h5" component="h3">
                    Configure {selectedEffect.registryKey}
                </Typography>
                <Button
                    onClick={async () => {
                        const registryKey = selectedEffect.registryKey;
                        if (registryKey && effectConfig) {
                            const success = await PreferencesService.setEffectDefaults(registryKey, effectConfig);
                            if (success) {
                                console.log(`✅ Saved default config for ${registryKey}`);
                            } else {
                                console.error(`❌ Failed to save default config for ${registryKey}`);
                            }
                        }
                    }}
                    variant="contained"
                    size="small"
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                            transform: 'translateY(-1px)',
                        }
                    }}
                >
                    Set as Default
                </Button>
            </Box>

            <Box mt={3}>
                {configSchema?.fields?.length > 0 ? (
                    <Stack spacing={2}>
                        {configSchema.fields.map(field => (
                            <ConfigInputFactory
                                key={field.name}
                                field={field}
                                value={effectConfig[field.name]}
                                onChange={handleConfigChange}
                                projectState={projectState}
                            />
                        ))}
                    </Stack>
                ) : (
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            backgroundColor: theme.palette.action.hover,
                            border: `1px dashed ${theme.palette.divider}`,
                            borderRadius: 2,
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <CircularProgress
                            size={48}
                            sx={{
                                mb: 3,
                                color: theme.palette.primary.main
                            }}
                        />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                            Loading Configuration
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Analyzing effect properties...
                        </Typography>
                    </Paper>
                )}
            </Box>

            {/* Attached Effects Display (for primary effects) */}
            {effectType === 'primary' && (
                <Paper
                    elevation={2}
                    sx={{
                        mt: 3,
                        p: 3,
                        background: 'rgba(255, 193, 7, 0.1)',
                        borderRadius: 2,
                        border: '1px solid rgba(255, 193, 7, 0.3)'
                    }}
                >
                    <Typography variant="h6" sx={{ color: '#ffc107', mb: 2 }}>
                        Attached Effects
                    </Typography>

                    {/* Secondary Effects */}
                    <Box sx={{ mb: 2 }}>
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 1 }}
                        >
                            <Typography variant="subtitle2" sx={{ color: '#28a745', fontWeight: 600 }}>
                                ✨ Secondary Effects ({(attachedEffects?.secondary || []).length})
                            </Typography>
                            <Button
                                onClick={() => handleOpenAttachmentModal('secondary')}
                                variant="contained"
                                size="small"
                                sx={{
                                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                    fontSize: '0.75rem',
                                    py: 0.5,
                                    px: 1.5,
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #20c997 0%, #28a745 100%)',
                                    }
                                }}
                            >
                                + Attach Secondary
                            </Button>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: '2rem' }}>
                            {(attachedEffects?.secondary || []).map(effect => (
                                <Chip
                                    key={effect.id}
                                    label={`${effect.effectClass.registryKey} (${effect.percentChance}%)`}
                                    onClick={() => handleEditAttachedEffect('secondary', effect)}
                                    onDelete={() => onRemoveAttachedEffect && onRemoveAttachedEffect('secondary', effect.id)}
                                    clickable
                                    sx={{
                                        backgroundColor: 'rgba(40, 167, 69, 0.2)',
                                        color: '#28a745',
                                        fontSize: '0.75rem',
                                        '&:hover': {
                                            backgroundColor: 'rgba(40, 167, 69, 0.3)',
                                            transform: 'scale(1.05)',
                                        },
                                        '& .MuiChip-deleteIcon': {
                                            color: '#dc3545',
                                            '&:hover': {
                                                color: '#c82333',
                                            }
                                        }
                                    }}
                                />
                            ))}
                            {(attachedEffects?.secondary || []).length === 0 && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 1 }}>
                                    No secondary effects attached
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Key Frame Effects */}
                    <Box>
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 1 }}
                        >
                            <Typography variant="subtitle2" sx={{ color: '#007bff', fontWeight: 600 }}>
                                🔑 Key Frame Effects ({(attachedEffects?.keyFrame || []).length})
                            </Typography>
                            <Button
                                onClick={() => handleOpenAttachmentModal('keyFrame')}
                                variant="contained"
                                size="small"
                                sx={{
                                    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                                    fontSize: '0.75rem',
                                    py: 0.5,
                                    px: 1.5,
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #0056b3 0%, #007bff 100%)',
                                    }
                                }}
                            >
                                + Attach Key Frame
                            </Button>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: '2rem' }}>
                            {(attachedEffects?.keyFrame || []).map(effect => (
                                <Chip
                                    key={effect.id}
                                    label={`${effect.effectClass.registryKey} (${effect.percentChance}%)`}
                                    onClick={() => handleEditAttachedEffect('keyFrame', effect)}
                                    onDelete={() => onRemoveAttachedEffect && onRemoveAttachedEffect('keyFrame', effect.id)}
                                    clickable
                                    sx={{
                                        backgroundColor: 'rgba(0, 123, 255, 0.2)',
                                        color: '#007bff',
                                        fontSize: '0.75rem',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 123, 255, 0.3)',
                                            transform: 'scale(1.05)',
                                        },
                                        '& .MuiChip-deleteIcon': {
                                            color: '#dc3545',
                                            '&:hover': {
                                                color: '#c82333',
                                            }
                                        }
                                    }}
                                />
                            ))}
                            {(attachedEffects?.keyFrame || []).length === 0 && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 1 }}>
                                    No key frame effects attached
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Percent Chance Section */}
            <Paper
                elevation={2}
                sx={{
                    mt: 3,
                    p: 3,
                    background: 'rgba(102, 126, 234, 0.1)',
                    borderRadius: 2,
                    border: '1px solid rgba(102, 126, 234, 0.3)'
                }}
            >
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                    Effect Probability
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#cccccc',
                            minWidth: '120px'
                        }}
                    >
                        Chance to occur:
                    </Typography>
                    <Slider
                        value={percentChance}
                        onChange={(e, value) => setPercentChance(value)}
                        min={0}
                        max={100}
                        step={1}
                        sx={{
                            flex: 1,
                            color: 'rgba(102, 126, 234, 0.8)',
                            '& .MuiSlider-track': {
                                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                            },
                            '& .MuiSlider-rail': {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            }
                        }}
                    />
                    <TextField
                        type="number"
                        size="small"
                        value={percentChance}
                        onChange={(e) => setPercentChance(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        inputProps={{
                            min: 0,
                            max: 100,
                            style: { textAlign: 'center' }
                        }}
                        sx={{
                            width: '80px',
                            '& .MuiInputBase-root': {
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: '#ffffff'
                            }
                        }}
                    />
                    <Typography variant="body2" sx={{ color: '#cccccc' }}>%</Typography>
                </Box>
                <Typography
                    variant="body2"
                    sx={{
                        mt: 1,
                        color: '#aaaaaa',
                        fontStyle: 'italic'
                    }}
                >
                    {percentChance === 0 ? 'Effect will never occur' :
                     percentChance === 100 ? 'Effect will always occur' :
                     `Effect will occur ${percentChance}% of the time`}
                </Typography>
            </Paper>


            {/* Attachment Modal */}
            <EffectAttachmentModal
                isOpen={modalState.isOpen}
                onClose={handleCloseAttachmentModal}
                attachmentType={modalState.attachmentType}
                availableEffects={availableEffects || {}}
                onAttachEffect={modalState.isEditing ? handleEditComplete : handleAttachEffect}
                projectState={projectState}
                editingEffect={modalState.editingEffect}
                isEditing={modalState.isEditing}
            />
        </Box>
    );
}

export default EffectConfigurer;