import React, { useState, useEffect } from 'react';
import ConfigInputFactory from './inputs/ConfigInputFactory';
import { ConfigIntrospector } from '../../utils/configIntrospector';

/**
 * Override Point2D center properties to use the current project resolution center
 * @param {Object} config - The effect config object
 * @param {Object} projectData - Project data containing resolution information
 * @returns {Object} Updated config with project-based center defaults
 */
function overridePoint2DCenterDefaults(config, projectData) {
    if (!projectData?.resolution) {
        return config;
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
                console.log(`Overriding Point2D ${key} from {x: ${value.x}, y: ${value.y}} to {x: ${projectCenter.x}, y: ${projectCenter.y}}`);
                updatedConfig[key] = projectCenter;
            }
        }
    }

    return updatedConfig;
}

function EffectConfigurer({ selectedEffect, projectData, onConfigChange, onAddEffect }) {
    const [configSchema, setConfigSchema] = useState(null);
    const [effectConfig, setEffectConfig] = useState({});
    const [percentChance, setPercentChance] = useState(100);

    useEffect(() => {
        if (selectedEffect) {
            loadConfigSchema(selectedEffect);
            setEffectConfig({});
            setPercentChance(100);
        }
    }, [selectedEffect]);

    const loadConfigSchema = async (effect) => {
        try {
            console.log('Loading config schema for effect:', effect);
            const schema = await ConfigIntrospector.analyzeConfigClass(effect, projectData);
            console.log('Generated schema:', schema);
            setConfigSchema(schema);

            // Use the default instance directly - it has all the correct defaults
            if (schema.defaultInstance) {
                console.log('Using config defaults from constructor:', schema.defaultInstance);

                // Override Point2D center properties with current project resolution center
                const updatedConfig = overridePoint2DCenterDefaults(schema.defaultInstance, projectData);
                console.log('Config after Point2D center override:', updatedConfig);

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

            {/* Add Effect Button */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                    onClick={handleAddEffect}
                    className="btn"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                    }}
                >
                    Add Effect to Project
                </button>
            </div>
        </div>
    );
}

export default EffectConfigurer;