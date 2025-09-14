import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function EffectWizard({ onBack, onEffectsCreated, projectData }) {
    const [step, setStep] = useState(1);
    const [effectType, setEffectType] = useState('primary');
    const [selectedEffectClass, setSelectedEffectClass] = useState(null);
    const [effectConfig, setEffectConfig] = useState({});
    const [effects, setEffects] = useState({
        primary: [],
        secondary: [],
        keyFrame: [],
        final: []
    });
    const [availableEffects, setAvailableEffects] = useState([]);
    const [configSchema, setConfigSchema] = useState(null);

    // Load available effects from my-nft-effects-core
    useEffect(() => {
        loadAvailableEffects();
    }, []);

    const loadAvailableEffects = async () => {
        // This would dynamically load effects from my-nft-effects-core
        // For now, I'll create a mock structure based on the known effects
        const mockEffects = {
            primary: [
                {
                    name: 'FuzzFlareEffect',
                    displayName: 'Fuzz Flare',
                    description: 'Creates dynamic energy patterns with customizable colors and animations',
                    configClass: 'FuzzFlareConfig'
                },
                {
                    name: 'LayeredHexEffect',
                    displayName: 'Layered Hex',
                    description: 'Generates hexagonal patterns with layered complexity',
                    configClass: 'LayeredHexConfig'
                },
                {
                    name: 'GatesEffect',
                    displayName: 'Gates',
                    description: 'Creates portal-like geometric structures',
                    configClass: 'GatesConfig'
                },
                {
                    name: 'HexEffect',
                    displayName: 'Hex',
                    description: 'Basic hexagonal pattern generator',
                    configClass: 'HexConfig'
                },
                {
                    name: 'RedEyeEffect',
                    displayName: 'Red Eye',
                    description: 'Creates mystical eye patterns with customizable colors',
                    configClass: 'RedEyeConfig'
                },
                {
                    name: 'LensFlareEffect',
                    displayName: 'Lens Flare',
                    description: 'Realistic lens flare effects with rays and rings',
                    configClass: 'LensFlareConfig'
                },
                {
                    name: 'ViewportEffect',
                    displayName: 'Viewport',
                    description: 'Creates viewing window effects with borders',
                    configClass: 'ViewportConfig'
                }
            ],
            secondary: [
                {
                    name: 'GlowEffect',
                    displayName: 'Glow',
                    description: 'Adds glow effects to primary layers',
                    configClass: 'GlowConfig'
                },
                {
                    name: 'FadeEffect',
                    displayName: 'Fade',
                    description: 'Applies fade transitions',
                    configClass: 'FadeConfig'
                },
                {
                    name: 'BlurEffect',
                    displayName: 'Blur',
                    description: 'Adds blur effects with customizable radius',
                    configClass: 'BlurConfig'
                }
            ],
            keyFrame: [
                {
                    name: 'KeyFrameEffect',
                    displayName: 'Key Frame Animation',
                    description: 'Creates keyframe-based animations',
                    configClass: 'KeyFrameConfig'
                }
            ],
            final: [
                {
                    name: 'CRTEffect',
                    displayName: 'CRT Monitor',
                    description: 'Applies retro CRT monitor effects',
                    configClass: 'CRTConfig'
                },
                {
                    name: 'GlitchEffect',
                    displayName: 'Glitch',
                    description: 'Adds digital glitch artifacts',
                    configClass: 'GlitchConfig'
                },
                {
                    name: 'PixelateEffect',
                    displayName: 'Pixelate',
                    description: 'Applies pixelation effects',
                    configClass: 'PixelateConfig'
                },
                {
                    name: 'ModulateEffect',
                    displayName: 'Modulate',
                    description: 'Color modulation and transformation',
                    configClass: 'ModulateConfig'
                }
            ]
        };

        setAvailableEffects(mockEffects);
    };

    const loadConfigSchema = async (effectClass, configClass) => {
        // This would dynamically introspect the config class to build a form schema
        // For now, I'll create schemas for the most common config types
        const schemas = {
            FuzzFlareConfig: {
                fields: [
                    { name: 'invertLayers', type: 'boolean', default: false, label: 'Invert Layers' },
                    { name: 'innerColor', type: 'colorpicker', bucketType: 'colorBucket', label: 'Inner Color' },
                    { name: 'outerColor', type: 'colorpicker', bucketType: 'colorBucket', label: 'Outer Color' },
                    { name: 'layerOpacity', type: 'percentage', default: 0.7, label: 'Layer Opacity' },
                    { name: 'center', type: 'point2d', default: { x: 540, y: 960 }, label: 'Center Point' },
                    { name: 'numberOfFlareRings', type: 'range', min: 10, max: 50, default: { lower: 25, upper: 25 }, label: 'Number of Flare Rings' },
                    { name: 'flareRingsSizeRange', type: 'percentagerange', default: { min: 0.05, max: 1.0 }, label: 'Flare Rings Size Range' },
                    { name: 'flareRingStroke', type: 'range', min: 1, max: 5, default: { lower: 1, upper: 1 }, label: 'Flare Ring Stroke' },
                    { name: 'flareRingThickness', type: 'range', min: 1, max: 10, default: { lower: 1, upper: 3 }, label: 'Flare Ring Thickness' },
                    { name: 'numberOfFlareRays', type: 'range', min: 10, max: 100, default: { lower: 50, upper: 50 }, label: 'Number of Flare Rays' },
                    { name: 'flareRaysSizeRange', type: 'percentagerange', default: { min: 0.7, max: 1.0 }, label: 'Flare Rays Size Range' },
                    { name: 'flareRaysStroke', type: 'range', min: 1, max: 5, default: { lower: 1, upper: 1 }, label: 'Flare Rays Stroke' },
                    { name: 'flareRayThickness', type: 'range', min: 1, max: 10, default: { lower: 1, upper: 3 }, label: 'Flare Ray Thickness' },
                    { name: 'flareOffset', type: 'percentagerange', default: { min: 0.01, max: 0.06 }, label: 'Flare Offset' },
                    { name: 'accentRange', type: 'dynamicrange', default: { bottom: { lower: 2, upper: 6 }, top: { lower: 8, upper: 14 } }, label: 'Accent Range' },
                    { name: 'blurRange', type: 'dynamicrange', default: { bottom: { lower: 4, upper: 6 }, top: { lower: 8, upper: 12 } }, label: 'Blur Range' },
                    { name: 'featherTimes', type: 'range', min: 1, max: 20, default: { lower: 2, upper: 8 }, label: 'Feather Times' }
                ]
            },
            RedEyeConfig: {
                fields: [
                    { name: 'layerOpacity', type: 'range', min: 0, max: 1, step: 0.1, default: 0.8, label: 'Layer Opacity' },
                    { name: 'underLayerOpacity', type: 'range', min: 0, max: 1, step: 0.1, default: 0.7, label: 'Under Layer Opacity' },
                    { name: 'center', type: 'point2d', default: { x: 540, y: 960 }, label: 'Center Point' },
                    { name: 'innerColor', type: 'colorpicker', bucketType: 'neutralBucket', label: 'Inner Color' },
                    { name: 'outerColor', type: 'colorpicker', bucketType: 'colorBucket', label: 'Outer Color' },
                    { name: 'stroke', type: 'number', min: 1, max: 10, default: 1, label: 'Stroke Width' },
                    { name: 'innerRadius', type: 'percentage', default: 0.1, label: 'Inner Radius %' },
                    { name: 'outerRadius', type: 'percentage', default: 0.3, label: 'Outer Radius %' }
                ]
            },
            LensFlareConfig: {
                fields: [
                    { name: 'layerOpacity', type: 'range', min: 0, max: 1, step: 0.1, default: 0.8, label: 'Layer Opacity' },
                    { name: 'center', type: 'point2d', default: { x: 540, y: 960 }, label: 'Center Point' },
                    { name: 'flareColor', type: 'colorpicker', bucketType: 'colorBucket', label: 'Flare Color' },
                    { name: 'numberOfFlareRings', type: 'range', min: 1, max: 200, default: 100, label: 'Number of Rings' },
                    { name: 'numberOfFlareRays', type: 'range', min: 1, max: 500, default: 250, label: 'Number of Rays' },
                    { name: 'flareRingStroke', type: 'number', min: 1, max: 10, default: 2, label: 'Ring Stroke' },
                    { name: 'flareRaysStroke', type: 'number', min: 1, max: 10, default: 2, label: 'Ray Stroke' }
                ]
            },
            CRTConfig: {
                fields: [
                    { name: 'scanlineIntensity', type: 'range', min: 0, max: 1, step: 0.1, default: 0.5, label: 'Scanline Intensity' },
                    { name: 'curvature', type: 'range', min: 0, max: 0.2, step: 0.01, default: 0.05, label: 'Screen Curvature' },
                    { name: 'brightness', type: 'range', min: 0.5, max: 2, step: 0.1, default: 1, label: 'Brightness' },
                    { name: 'contrast', type: 'range', min: 0.5, max: 2, step: 0.1, default: 1, label: 'Contrast' }
                ]
            }
        };

        setConfigSchema(schemas[configClass] || { fields: [] });
    };

    const handleEffectSelection = (effect) => {
        setSelectedEffectClass(effect);
        loadConfigSchema(effect.name, effect.configClass);
        setStep(3); // Move to config step
    };

    const renderConfigField = (field) => {
        const value = effectConfig[field.name] || field.default;

        switch (field.type) {
            case 'range':
                // Enhanced range input with visual feedback
                return (
                    <div key={field.name} className="form-group">
                        <label>{field.label}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="range"
                                min={field.min}
                                max={field.max}
                                step={field.step || 0.01}
                                value={value}
                                onChange={(e) => setEffectConfig({
                                    ...effectConfig,
                                    [field.name]: parseFloat(e.target.value)
                                })}
                                style={{
                                    flex: 1,
                                    background: 'linear-gradient(to right, #667eea 0%, #764ba2 100%)',
                                    height: '6px',
                                    borderRadius: '3px',
                                    outline: 'none'
                                }}
                            />
                            <input
                                type="number"
                                value={value}
                                onChange={(e) => setEffectConfig({
                                    ...effectConfig,
                                    [field.name]: parseFloat(e.target.value) || 0
                                })}
                                style={{ width: '80px', textAlign: 'center' }}
                                step={field.step || 0.01}
                                min={field.min}
                                max={field.max}
                            />
                        </div>
                    </div>
                );

            case 'number':
                return (
                    <div key={field.name} className="form-group">
                        <label>{field.label}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="range"
                                min={field.min || 0}
                                max={field.max || 100}
                                value={value}
                                onChange={(e) => setEffectConfig({
                                    ...effectConfig,
                                    [field.name]: parseInt(e.target.value)
                                })}
                                style={{ flex: 1 }}
                            />
                            <input
                                type="number"
                                min={field.min}
                                max={field.max}
                                value={value}
                                onChange={(e) => setEffectConfig({
                                    ...effectConfig,
                                    [field.name]: parseInt(e.target.value) || 0
                                })}
                                style={{ width: '80px', textAlign: 'center' }}
                            />
                        </div>
                    </div>
                );

            case 'point2d':
                return (
                    <div key={field.name} className="form-group">
                        <label>{field.label}</label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '0.5rem',
                            borderRadius: '4px'
                        }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>X Position</label>
                                <input
                                    type="number"
                                    value={value?.x || field.default?.x || 0}
                                    onChange={(e) => setEffectConfig({
                                        ...effectConfig,
                                        [field.name]: {
                                            ...value,
                                            x: parseInt(e.target.value) || 0
                                        }
                                    })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Y Position</label>
                                <input
                                    type="number"
                                    value={value?.y || field.default?.y || 0}
                                    onChange={(e) => setEffectConfig({
                                        ...effectConfig,
                                        [field.name]: {
                                            ...value,
                                            y: parseInt(e.target.value) || 0
                                        }
                                    })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'colorpicker':
                const currentSelection = effectConfig[field.name] || { selectionType: field.bucketType || 'colorBucket' };
                return (
                    <div key={field.name} className="form-group">
                        <label>{field.label}</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <select
                                value={currentSelection.selectionType || 'colorBucket'}
                                onChange={(e) => setEffectConfig({
                                    ...effectConfig,
                                    [field.name]: {
                                        ...currentSelection,
                                        selectionType: e.target.value
                                    }
                                })}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid #333',
                                    borderRadius: '4px',
                                    padding: '0.5rem'
                                }}
                            >
                                <option value="colorBucket">🎨 Color Bucket (Random from theme colors)</option>
                                <option value="neutralBucket">⚪ Neutral Bucket (Whites, grays, blacks)</option>
                                <option value="color">🎯 Specific Color</option>
                            </select>
                            {currentSelection.selectionType === 'color' && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={currentSelection.colorValue || '#ff0000'}
                                        onChange={(e) => setEffectConfig({
                                            ...effectConfig,
                                            [field.name]: {
                                                ...currentSelection,
                                                colorValue: e.target.value
                                            }
                                        })}
                                        style={{ width: '60px', height: '40px', border: 'none', borderRadius: '4px' }}
                                    />
                                    <input
                                        type="text"
                                        value={currentSelection.colorValue || '#ff0000'}
                                        onChange={(e) => setEffectConfig({
                                            ...effectConfig,
                                            [field.name]: {
                                                ...currentSelection,
                                                colorValue: e.target.value
                                            }
                                        })}
                                        placeholder="#ff0000"
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'percentage':
                return (
                    <div key={field.name} className="form-group">
                        <label>{field.label}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={value}
                                onChange={(e) => setEffectConfig({
                                    ...effectConfig,
                                    [field.name]: parseFloat(e.target.value)
                                })}
                                style={{
                                    flex: 1,
                                    background: 'linear-gradient(to right, #667eea 0%, #764ba2 100%)',
                                    height: '6px',
                                    borderRadius: '3px'
                                }}
                            />
                            <div style={{
                                minWidth: '80px',
                                textAlign: 'center',
                                background: 'rgba(255,255,255,0.1)',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                            }}>
                                {Math.round(value * 100)}%
                            </div>
                        </div>
                    </div>
                );

            case 'percentagerange':
                // Handle percentage ranges (min/max percentage values)
                const percentRange = value || { min: 0.1, max: 0.9 };
                return (
                    <div key={field.name} className="form-group">
                        <label>{field.label}</label>
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '0.75rem',
                            borderRadius: '4px'
                        }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>
                                    Minimum: {Math.round(percentRange.min * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={percentRange.min}
                                    onChange={(e) => setEffectConfig({
                                        ...effectConfig,
                                        [field.name]: {
                                            ...percentRange,
                                            min: parseFloat(e.target.value)
                                        }
                                    })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>
                                    Maximum: {Math.round(percentRange.max * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={percentRange.max}
                                    onChange={(e) => setEffectConfig({
                                        ...effectConfig,
                                        [field.name]: {
                                            ...percentRange,
                                            max: parseFloat(e.target.value)
                                        }
                                    })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'dynamicrange':
                // Handle dynamic ranges (bottom/top with lower/upper)
                const dynRange = value || {
                    bottom: { lower: 0, upper: 5 },
                    top: { lower: 5, upper: 10 }
                };
                return (
                    <div key={field.name} className="form-group">
                        <label>{field.label}</label>
                        <div style={{
                            border: '1px solid #333',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#9ae6b4' }}>
                                    Bottom Range
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', color: '#ccc' }}>Lower</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={dynRange.bottom?.lower || 0}
                                            onChange={(e) => setEffectConfig({
                                                ...effectConfig,
                                                [field.name]: {
                                                    ...dynRange,
                                                    bottom: {
                                                        ...dynRange.bottom,
                                                        lower: parseFloat(e.target.value) || 0
                                                    }
                                                }
                                            })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', color: '#ccc' }}>Upper</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={dynRange.bottom?.upper || 0}
                                            onChange={(e) => setEffectConfig({
                                                ...effectConfig,
                                                [field.name]: {
                                                    ...dynRange,
                                                    bottom: {
                                                        ...dynRange.bottom,
                                                        upper: parseFloat(e.target.value) || 0
                                                    }
                                                }
                                            })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fbb6ce' }}>
                                    Top Range
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', color: '#ccc' }}>Lower</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={dynRange.top?.lower || 0}
                                            onChange={(e) => setEffectConfig({
                                                ...effectConfig,
                                                [field.name]: {
                                                    ...dynRange,
                                                    top: {
                                                        ...dynRange.top,
                                                        lower: parseFloat(e.target.value) || 0
                                                    }
                                                }
                                            })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', color: '#ccc' }}>Upper</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={dynRange.top?.upper || 0}
                                            onChange={(e) => setEffectConfig({
                                                ...effectConfig,
                                                [field.name]: {
                                                    ...dynRange,
                                                    top: {
                                                        ...dynRange.top,
                                                        upper: parseFloat(e.target.value) || 0
                                                    }
                                                }
                                            })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div key={field.name} className="form-group">
                        <label>{field.label}</label>
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => setEffectConfig({
                                ...effectConfig,
                                [field.name]: e.target.value
                            })}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '0.5rem'
                            }}
                        />
                    </div>
                );
        }
    };

    const addEffect = () => {
        const newEffect = {
            id: Date.now(),
            effectClass: selectedEffectClass,
            config: effectConfig
        };

        setEffects({
            ...effects,
            [effectType]: [...effects[effectType], newEffect]
        });

        // Reset for next effect
        setSelectedEffectClass(null);
        setEffectConfig({});
        setConfigSchema(null);
        setStep(2);
    };

    const removeEffect = (type, effectId) => {
        setEffects({
            ...effects,
            [type]: effects[type].filter(e => e.id !== effectId)
        });
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3>Effect Type Selection</h3>
                        <p>Choose the type of effect you want to add:</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div
                                className={`welcome-card ${effectType === 'primary' ? 'selected' : ''}`}
                                onClick={() => setEffectType('primary')}
                                style={{ cursor: 'pointer' }}
                            >
                                <h4>🎨 Primary Effects</h4>
                                <p>Core visual effects that create the main imagery</p>
                            </div>
                            <div
                                className={`welcome-card ${effectType === 'secondary' ? 'selected' : ''}`}
                                onClick={() => setEffectType('secondary')}
                                style={{ cursor: 'pointer' }}
                            >
                                <h4>✨ Secondary Effects</h4>
                                <p>Effects that enhance primary effects (glow, blur, etc.)</p>
                            </div>
                            <div
                                className={`welcome-card ${effectType === 'keyFrame' ? 'selected' : ''}`}
                                onClick={() => setEffectType('keyFrame')}
                                style={{ cursor: 'pointer' }}
                            >
                                <h4>🔑 Key Frame Effects</h4>
                                <p>Time-based animation effects</p>
                            </div>
                            <div
                                className={`welcome-card ${effectType === 'final' ? 'selected' : ''}`}
                                onClick={() => setEffectType('final')}
                                style={{ cursor: 'pointer' }}
                            >
                                <h4>🎭 Final Effects</h4>
                                <p>Post-processing effects applied to the entire image</p>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div>
                        <h3>Select {effectType} Effect</h3>
                        <p>Choose an effect from the {effectType} category:</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {availableEffects[effectType]?.map(effect => (
                                <div
                                    key={effect.name}
                                    className="welcome-card"
                                    onClick={() => handleEffectSelection(effect)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <h4>{effect.displayName}</h4>
                                    <p>{effect.description}</p>
                                </div>
                            ))}
                        </div>

                        {/* Show current effects */}
                        {effects[effectType].length > 0 && (
                            <div style={{ marginTop: '2rem' }}>
                                <h4>Current {effectType} Effects:</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {effects[effectType].map(effect => (
                                        <div
                                            key={effect.id}
                                            style={{
                                                background: 'rgba(102, 126, 234, 0.2)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <span>{effect.effectClass.displayName}</span>
                                            <button
                                                onClick={() => removeEffect(effectType, effect.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#e53e3e',
                                                    cursor: 'pointer',
                                                    fontSize: '1.2rem'
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 3:
                return (
                    <div>
                        <h3>Configure {selectedEffectClass?.displayName}</h3>
                        <p>{selectedEffectClass?.description}</p>

                        <div style={{ marginTop: '1.5rem' }}>
                            {configSchema?.fields.map(renderConfigField)}
                        </div>

                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                            <h4>Preview Configuration:</h4>
                            <pre style={{ fontSize: '0.8rem', overflow: 'auto', maxHeight: '200px' }}>
                                {JSON.stringify(effectConfig, null, 2)}
                            </pre>
                        </div>
                    </div>
                );

            case 4:
                const totalEffects = Object.values(effects).flat().length;
                return (
                    <div>
                        <h3>Effect Summary</h3>
                        <p>Review all the effects you've configured:</p>

                        <div style={{ marginTop: '1.5rem' }}>
                            {Object.entries(effects).map(([type, effectList]) => {
                                if (effectList.length === 0) return null;
                                return (
                                    <div key={type} style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ textTransform: 'capitalize' }}>{type} Effects ({effectList.length}):</h4>
                                        <ul style={{ marginLeft: '1rem' }}>
                                            {effectList.map(effect => (
                                                <li key={effect.id}>{effect.effectClass.displayName}</li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>

                        {totalEffects === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,0,0.1)', borderRadius: '8px' }}>
                                <p><strong>⚠️ No effects configured</strong></p>
                                <p>Your project will generate, but it may appear blank without any effects.</p>
                            </div>
                        ) : (
                            <div style={{ padding: '1rem', background: 'rgba(0,255,0,0.1)', borderRadius: '8px' }}>
                                <p><strong>✅ Ready to generate!</strong></p>
                                <p>Total effects configured: {totalEffects}</p>
                            </div>
                        )}
                    </div>
                );
        }
    };

    const handleNext = () => {
        if (step === 3) {
            addEffect();
        } else if (step < 4) {
            setStep(step + 1);
        } else {
            // Final step - return effects to parent
            onEffectsCreated(effects);
        }
    };

    const handlePrevious = () => {
        if (step === 3) {
            setStep(2);
        } else if (step > 1) {
            setStep(step - 1);
        } else {
            onBack();
        }
    };

    return (
        <div className="wizard">
            <div className="wizard-header">
                <h2>Effect Wizard</h2>
                <div className="wizard-steps">
                    <div className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        1. Effect Type
                    </div>
                    <div className={`wizard-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        2. Select Effect
                    </div>
                    <div className={`wizard-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                        3. Configure
                    </div>
                    <div className={`wizard-step ${step >= 4 ? 'active' : ''}`}>
                        4. Review
                    </div>
                </div>
            </div>

            {renderStep()}

            <div className="wizard-navigation">
                <button className="btn btn-secondary" onClick={handlePrevious}>
                    {step === 1 ? 'Back to Project' : 'Previous'}
                </button>

                {step === 2 && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setStep(4)}
                        style={{ marginLeft: 'auto', marginRight: '1rem' }}
                    >
                        Skip to Review
                    </button>
                )}

                <button
                    className="btn"
                    onClick={handleNext}
                    disabled={step === 2 && !selectedEffectClass}
                >
                    {step === 3 ? 'Add Effect' : step === 4 ? 'Start Generation' : 'Next'}
                </button>
            </div>
        </div>
    );
}

export default EffectWizard;