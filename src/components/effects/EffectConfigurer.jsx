import React, { useState, useEffect, useRef } from 'react';
import ConfigInputFactory from './inputs/ConfigInputFactory';
import { ConfigIntrospector } from '../../utils/configIntrospector';
import EffectAttachmentModal from './EffectAttachmentModal';

/**
 * Override Point2D center properties to use the current project resolution center
 * @param {Object} config - The effect config object
 * @param {Object} projectData - Project data containing resolution information
 * @returns {Object} Updated config with project-based center defaults
 */
function overridePoint2DCenterDefaults(config, projectData) {
    if (!config || !projectData?.resolution) {
        return config || {};
    }

    // Resolution mapping - same as used in Point2DInput and EffectPreview
    const resolutions = {
        'qvga': { width: 320, height: 240 },
        'vga': { width: 640, height: 480 },
        'svga': { width: 800, height: 600 },
        'xga': { width: 1024, height: 768 },
        'hd720': { width: 1280, height: 720 },
        'hd': { width: 1920, height: 1080 },
        'square_small': { width: 720, height: 720 },
        'square': { width: 1080, height: 1080 },
        'wqhd': { width: 2560, height: 1440 },
        '4k': { width: 3840, height: 2160 },
        '5k': { width: 5120, height: 2880 },
        '8k': { width: 7680, height: 4320 },
        'portrait_hd': { width: 1080, height: 1920 },
        'portrait_4k': { width: 2160, height: 3840 },
        'ultrawide': { width: 3440, height: 1440 },
        'cinema_2k': { width: 2048, height: 1080 },
        'cinema_4k': { width: 4096, height: 2160 }
    };

    const baseResolution = resolutions[projectData.resolution] || resolutions.hd;

    // Apply isHoz setting - same logic as EffectPreview and Point2DInput
    const autoIsHoz = baseResolution.width > baseResolution.height;
    const isHoz = projectData?.isHoz !== null ? projectData.isHoz : autoIsHoz;

    // Determine actual dimensions based on orientation setting
    let width, height;
    if (isHoz) {
        width = baseResolution.width;
        height = baseResolution.height;
    } else {
        width = baseResolution.height;
        height = baseResolution.width;
    }

    const projectCenter = {
        x: width / 2,
        y: height / 2
    };

    // Deep clone the config to avoid mutations
    // If config is still null/undefined after the check above, return empty object
    if (!config) {
        return {};
    }
    const updatedConfig = JSON.parse(JSON.stringify(config));

    // Find and override Point2D properties that look like center points
    // Common naming patterns: center, centerPoint, position, etc.
    for (const [key, value] of Object.entries(updatedConfig)) {
        if (value && typeof value === 'object' &&
            typeof value.x === 'number' && typeof value.y === 'number') {

            // Check if this looks like a center property
            const isCenter = key.toLowerCase().includes('center') ||
                           key.toLowerCase().includes('position') ||
                           key.toLowerCase().includes('point');

            if (isCenter) {
                updatedConfig[key] = projectCenter;
            }
        }
    }

    return updatedConfig;
}

function EffectConfigurer({
    selectedEffect,
    projectData,
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
    initialPercentChance = null
}) {
    const [configSchema, setConfigSchema] = useState(null);
    const [effectConfig, setEffectConfig] = useState({});
    const [percentChance, setPercentChance] = useState(100);
    const [modalState, setModalState] = useState({
        isOpen: false,
        attachmentType: null,
        editingEffect: null,
        isEditing: false
    });

    // Cache to prevent repeated introspection calls for the same effect
    const introspectionCache = useRef(new Map());

    useEffect(() => {
        if (selectedEffect) {
            loadConfigSchema(selectedEffect);
            // Only set percentChance here, let loadConfigSchema handle effectConfig
            setPercentChance(initialPercentChance || 100);
        }
    }, [selectedEffect?.name, selectedEffect?.className, initialPercentChance]); // Remove initialConfig from dependencies to prevent loops

    const loadConfigSchema = async (effect) => {
        try {
            // Create cache key based on effect name
            const cacheKey = effect.name || effect.className || 'unknown';

            // Check if we already have this schema cached
            if (introspectionCache.current.has(cacheKey)) {
                console.log(`🚀 Using cached schema for ${cacheKey}`);
                const schema = introspectionCache.current.get(cacheKey);
                setConfigSchema(schema);
            } else {
                console.log(`🔍 Loading new schema for ${cacheKey}`);
                const schema = await ConfigIntrospector.analyzeConfigClass(effect, projectData);

                // Cache the result
                introspectionCache.current.set(cacheKey, schema);
                setConfigSchema(schema);
            }

            // Get the current schema (from cache or fresh)
            const currentSchema = introspectionCache.current.get(cacheKey);

            // Use initial config if provided (editing mode), otherwise use defaults
            if (initialConfig && Object.keys(initialConfig).length > 0) {
                setEffectConfig(initialConfig);
                onConfigChange(initialConfig);
            } else if (initialConfig && Object.keys(initialConfig).length === 0) {
                const updatedConfig = overridePoint2DCenterDefaults(currentSchema.defaultInstance, projectData);
                setEffectConfig(updatedConfig);
                onConfigChange(updatedConfig);
            } else if (currentSchema?.defaultInstance) {
                // Override Point2D center properties with current project resolution center
                const updatedConfig = overridePoint2DCenterDefaults(currentSchema.defaultInstance, projectData);

                setEffectConfig(updatedConfig);
                onConfigChange(updatedConfig);
            } else {
                console.warn('No default instance available, using empty config');
                setEffectConfig({});
                onConfigChange({});
            }
        } catch (error) {
            console.error('Error loading config schema:', error);
            setConfigSchema({ fields: [] });
        }
    };


    const handleConfigChange = (fieldName, value) => {
        const newConfig = { ...effectConfig, [fieldName]: value };
        setEffectConfig(newConfig);
        onConfigChange(newConfig);
    };

    const handleAddEffect = () => {
        onAddEffect({
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
        if (onAttachEffect) {
            onAttachEffect(effectData, attachmentType);
        }
    };

    const handleEditComplete = (effectData, attachmentType) => {
        // For editing mode, we need to handle the update differently
        if (onAttachEffect) {
            // Pass along the original effect ID to identify which effect to update
            const updatedEffectData = {
                ...effectData,
                id: modalState.editingEffect?.id // Preserve the original ID
            };
            onAttachEffect(updatedEffectData, attachmentType, true); // true indicates editing mode
        }
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
                                projectData={projectData}
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

            {/* Configuration Preview */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h4 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>Configuration Preview:</h4>
                <pre style={{
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    margin: 0,
                    color: '#cccccc',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.5rem',
                    borderRadius: '4px'
                }}>
                    {JSON.stringify(effectConfig, null, 2)}
                </pre>
            </div>

            {/* Attachment Modal */}
            <EffectAttachmentModal
                isOpen={modalState.isOpen}
                onClose={handleCloseAttachmentModal}
                attachmentType={modalState.attachmentType}
                availableEffects={availableEffects || {}}
                onAttachEffect={modalState.isEditing ? handleEditComplete : handleAttachEffect}
                projectData={projectData}
                editingEffect={modalState.editingEffect}
                isEditing={modalState.isEditing}
            />
        </div>
    );
}

export default EffectConfigurer;