import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConfigInputFactory from './inputs/ConfigInputFactory.jsx';
import { ConfigIntrospector } from '../../utils/configIntrospector.js';
import EffectAttachmentModal from './EffectAttachmentModal.jsx';
import PositionSerializer from '../../utils/PositionSerializer.js';
import CenterUtils from '../../utils/CenterUtils.js';
import { useServices } from '../../contexts/ServiceContext.js';
import {
    Box,
    Typography,
    Grid,
    Paper,
    useTheme
} from '@mui/material';


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
        <div style={{ color: '#ffffff' }}>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Configure {selectedEffect.name}</h3>

            <div style={{ marginTop: '1.5rem' }}>
                {configSchema?.fields?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {configSchema.fields.map(field => (
                            <ConfigInputFactory
                                key={field.name}
                                field={field}
                                value={effectConfig[field.name]}
                                onChange={handleConfigChange}
                                projectState={projectState}
                            />
                        ))}
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '2rem',
                        color: '#cccccc',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        border: '1px dashed rgba(255,255,255,0.2)'
                    }}>
                        <div style={{
                            border: '4px solid rgba(255,255,255,0.1)',
                            borderTop: '4px solid #667eea',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 1rem'
                        }} />
                        Loading configuration options...
                    </div>
                )}
            </div>

            {/* Attached Effects Display (for primary effects) */}
            {effectType === 'primary' && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(255, 193, 7, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 193, 7, 0.3)'
                }}>
                    <h4 style={{ color: '#ffc107', marginBottom: '1rem' }}>Attached Effects</h4>

                    {/* Secondary Effects */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem'
                        }}>
                            <h5 style={{ color: '#28a745', margin: 0, fontSize: '0.9rem' }}>
                                ✨ Secondary Effects ({(attachedEffects?.secondary || []).length})
                            </h5>
                            <button
                                onClick={() => handleOpenAttachmentModal('secondary')}
                                style={{
                                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.25rem 0.75rem',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                + Attach Secondary
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '2rem' }}>
                            {(attachedEffects?.secondary || []).map(effect => (
                                <div
                                    key={effect.id}
                                    style={{
                                        background: 'rgba(40, 167, 69, 0.2)',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#28a745',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => handleEditAttachedEffect('secondary', effect)}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(40, 167, 69, 0.3)';
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(40, 167, 69, 0.2)';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                    title="Click to edit this effect"
                                >
                                    <span>{effect.effectClass.name} ({effect.percentChance}%)</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveAttachedEffect && onRemoveAttachedEffect('secondary', effect.id);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#dc3545',
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            padding: '0',
                                            lineHeight: '1'
                                        }}
                                        title="Remove this effect"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {(attachedEffects?.secondary || []).length === 0 && (
                                <div style={{ color: '#888', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                                    No secondary effects attached
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Key Frame Effects */}
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem'
                        }}>
                            <h5 style={{ color: '#007bff', margin: 0, fontSize: '0.9rem' }}>
                                🔑 Key Frame Effects ({(attachedEffects?.keyFrame || []).length})
                            </h5>
                            <button
                                onClick={() => handleOpenAttachmentModal('keyFrame')}
                                style={{
                                    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.25rem 0.75rem',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                + Attach Key Frame
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '2rem' }}>
                            {(attachedEffects?.keyFrame || []).map(effect => (
                                <div
                                    key={effect.id}
                                    style={{
                                        background: 'rgba(0, 123, 255, 0.2)',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#007bff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => handleEditAttachedEffect('keyFrame', effect)}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 123, 255, 0.3)';
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 123, 255, 0.2)';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                    title="Click to edit this effect"
                                >
                                    <span>{effect.effectClass.name} ({effect.percentChance}%)</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveAttachedEffect && onRemoveAttachedEffect('keyFrame', effect.id);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#dc3545',
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            padding: '0',
                                            lineHeight: '1'
                                        }}
                                        title="Remove this effect"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {(attachedEffects?.keyFrame || []).length === 0 && (
                                <div style={{ color: '#888', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                                    No key frame effects attached
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Percent Chance Section */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(102, 126, 234, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(102, 126, 234, 0.3)'
            }}>
                <h4 style={{ color: '#ffffff', marginBottom: '1rem' }}>Effect Probability</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{
                        color: '#cccccc',
                        fontSize: '0.9rem',
                        minWidth: '120px'
                    }}>
                        Chance to occur:
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={percentChance}
                        onChange={(e) => setPercentChance(parseInt(e.target.value))}
                        style={{
                            flex: 1,
                            height: '6px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '3px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    />
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={percentChance}
                        onChange={(e) => setPercentChance(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        style={{
                            width: '60px',
                            padding: '0.25rem',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            color: '#ffffff',
                            textAlign: 'center'
                        }}
                    />
                    <span style={{ color: '#cccccc', fontSize: '0.9rem' }}>%</span>
                </div>
                <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    color: '#aaaaaa'
                }}>
                    {percentChance === 0 ? 'Effect will never occur' :
                     percentChance === 100 ? 'Effect will always occur' :
                     `Effect will occur ${percentChance}% of the time`}
                </div>
            </div>


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
        </div>
    );
}

export default EffectConfigurer;