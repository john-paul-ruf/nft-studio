import React, { useState, useEffect } from 'react';

function PositionInput({ field, value, onChange, projectData }) {
    const [showPresets, setShowPresets] = useState(false);
    const [positionType, setPositionType] = useState('position');

    // Get resolution and dimensions (same logic as Point2DInput)
    let resolution = projectData?.targetResolution || projectData?.resolution || 'hd';
    const resolutionMap = {
        '320': 'qvga', '640': 'vga', '800': 'svga', '1024': 'xga',
        '1280': 'hd720', '1920': 'hd', '720': 'square_small', '1080': 'square',
        '2560': 'wqhd', '3840': '4k', '5120': '5k', '7680': '8k'
    };
    if (resolutionMap[resolution]) resolution = resolutionMap[resolution];

    const resolutions = {
        'qvga': { width: 320, height: 240 }, 'vga': { width: 640, height: 480 },
        'svga': { width: 800, height: 600 }, 'xga': { width: 1024, height: 768 },
        'hd720': { width: 1280, height: 720 }, 'hd': { width: 1920, height: 1080 },
        'square_small': { width: 720, height: 720 }, 'square': { width: 1080, height: 1080 },
        'wqhd': { width: 2560, height: 1440 }, '4k': { width: 3840, height: 2160 },
        '5k': { width: 5120, height: 2880 }, '8k': { width: 7680, height: 4320 },
        'portrait_hd': { width: 1080, height: 1920 }, 'portrait_4k': { width: 2160, height: 3840 },
        'ultrawide': { width: 3440, height: 1440 }, 'cinema_2k': { width: 2048, height: 1080 },
        'cinema_4k': { width: 4096, height: 2160 }
    };
    const baseResolution = resolutions[resolution] || resolutions.hd;

    const autoIsHoz = baseResolution.width > baseResolution.height;
    const isHoz = typeof projectData?.isHorizontal === 'boolean' ? projectData.isHorizontal :
                  typeof projectData?.isHoz === 'boolean' ? projectData.isHoz : autoIsHoz;

    let width, height;
    if (isHoz) {
        width = baseResolution.width;
        height = baseResolution.height;
    } else {
        width = baseResolution.height;
        height = baseResolution.width;
    }

    // Initialize position type based on current value
    useEffect(() => {
        if (value?.name) {
            setPositionType(value.name);
        } else if (value?.x !== undefined && value?.y !== undefined) {
            // Legacy point2d format - convert to position
            setPositionType('position');
        }
    }, [value]);

    // Generate default values based on position type
    const generateDefaultValue = (type) => {
        const centerX = Math.round(width / 2);
        const centerY = Math.round(height / 2);

        switch (type) {
            case 'position':
                return {
                    name: 'position',
                    x: centerX,
                    y: centerY
                };
            case 'arc-path':
                return {
                    name: 'arc-path',
                    center: { x: centerX, y: centerY },
                    radius: Math.min(width, height) * 0.2,
                    startAngle: 0,
                    endAngle: 360,
                    direction: 1
                };
            default:
                return { x: centerX, y: centerY };
        }
    };

    // Get current value with smart defaults
    const getCurrentValue = () => {
        if (!value) return generateDefaultValue(positionType);

        // Handle legacy point2d format
        if (value.x !== undefined && value.y !== undefined && !value.name) {
            return {
                name: 'position',
                x: value.x,
                y: value.y
            };
        }

        return value;
    };

    const currentValue = getCurrentValue();

    // Position presets for Position type
    const positionPresets = [
        { name: 'Center', x: width / 2, y: height / 2, icon: '⊙' },
        { name: 'Top Left', x: width * 0.25, y: height * 0.25, icon: '⌜' },
        { name: 'Top Right', x: width * 0.75, y: height * 0.25, icon: '⌝' },
        { name: 'Bottom Left', x: width * 0.25, y: height * 0.75, icon: '⌞' },
        { name: 'Bottom Right', x: width * 0.75, y: height * 0.75, icon: '⌟' },
        { name: 'Top Center', x: width / 2, y: height * 0.25, icon: '⌐' },
        { name: 'Bottom Center', x: width / 2, y: height * 0.75, icon: '⌙' },
        { name: 'Left Center', x: width * 0.25, y: height / 2, icon: '⊢' },
        { name: 'Right Center', x: width * 0.75, y: height / 2, icon: '⊣' }
    ];

    const handlePositionTypeChange = (newType) => {
        setPositionType(newType);
        const newValue = generateDefaultValue(newType);
        onChange(field.name, newValue);
    };

    const handlePresetSelect = (preset) => {
        if (positionType === 'position') {
            onChange(field.name, {
                name: 'position',
                x: Math.round(preset.x),
                y: Math.round(preset.y)
            });
        }
        setShowPresets(false);
    };

    const handlePositionChange = (newX, newY) => {
        onChange(field.name, {
            ...currentValue,
            x: newX,
            y: newY
        });
    };

    const handleArcPathChange = (property, newValue) => {
        onChange(field.name, {
            ...currentValue,
            [property]: newValue
        });
    };

    const handleCenterChange = (newX, newY) => {
        onChange(field.name, {
            ...currentValue,
            center: { x: newX, y: newY }
        });
    };

    return (
        <div className="position-input">
            <label>{field.label}</label>

            {/* Position Type Selector */}
            <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#ccc', display: 'block', marginBottom: '0.25rem' }}>
                    Position Type
                </label>
                <select
                    value={positionType}
                    onChange={(e) => handlePositionTypeChange(e.target.value)}
                    style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        color: '#ffffff'
                    }}
                >
                    <option value="position">Static Position</option>
                    <option value="arc-path">Arc Path</option>
                </select>
            </div>

            {/* Position Type Specific UI */}
            {positionType === 'position' && (
                <>
                    {/* Quick Position Presets */}
                    <div style={{ marginBottom: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowPresets(!showPresets)}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                color: 'white'
                            }}
                        >
                            📍 Quick Positions
                        </button>

                        {showPresets && (
                            <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '4px',
                                border: '1px solid #333'
                            }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '0.25rem',
                                    fontSize: '0.7rem'
                                }}>
                                    {positionPresets.map(preset => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => handlePresetSelect(preset)}
                                            style={{
                                                background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid #555',
                                                borderRadius: '3px',
                                                padding: '0.25rem',
                                                cursor: 'pointer',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <span>{preset.icon}</span>
                                            <span>{preset.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Manual Position Input */}
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
                                value={currentValue.x || 0}
                                onChange={(e) => handlePositionChange(parseInt(e.target.value) || 0, currentValue.y)}
                                style={{ width: '100%' }}
                                min={0}
                                max={width}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Y Position</label>
                            <input
                                type="number"
                                value={currentValue.y || 0}
                                onChange={(e) => handlePositionChange(currentValue.x, parseInt(e.target.value) || 0)}
                                style={{ width: '100%' }}
                                min={0}
                                max={height}
                            />
                        </div>
                    </div>

                    {/* Current Position Display */}
                    <div style={{
                        marginTop: '0.25rem',
                        fontSize: '0.7rem',
                        color: '#888',
                        textAlign: 'center'
                    }}>
                        Current: ({currentValue.x}, {currentValue.y})
                    </div>
                </>
            )}

            {positionType === 'arc-path' && (
                <>
                    {/* Arc Path Controls */}
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                    }}>
                        {/* Center Point */}
                        <div style={{ marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: '#ccc', display: 'block', marginBottom: '0.25rem' }}>
                                Center Point
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#999' }}>X</label>
                                    <input
                                        type="number"
                                        value={currentValue.center?.x || 0}
                                        onChange={(e) => handleCenterChange(parseInt(e.target.value) || 0, currentValue.center?.y || 0)}
                                        style={{ width: '100%' }}
                                        min={0}
                                        max={width}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#999' }}>Y</label>
                                    <input
                                        type="number"
                                        value={currentValue.center?.y || 0}
                                        onChange={(e) => handleCenterChange(currentValue.center?.x || 0, parseInt(e.target.value) || 0)}
                                        style={{ width: '100%' }}
                                        min={0}
                                        max={height}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Radius */}
                        <div style={{ marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: '#ccc', display: 'block', marginBottom: '0.25rem' }}>
                                Radius: {currentValue.radius || 0}px
                            </label>
                            <input
                                type="range"
                                min={10}
                                max={Math.min(width, height) / 2}
                                value={currentValue.radius || 100}
                                onChange={(e) => handleArcPathChange('radius', parseInt(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* Angles */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Start Angle (°)</label>
                                <input
                                    type="number"
                                    value={currentValue.startAngle || 0}
                                    onChange={(e) => handleArcPathChange('startAngle', parseInt(e.target.value) || 0)}
                                    style={{ width: '100%' }}
                                    min={0}
                                    max={360}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>End Angle (°)</label>
                                <input
                                    type="number"
                                    value={currentValue.endAngle || 360}
                                    onChange={(e) => handleArcPathChange('endAngle', parseInt(e.target.value) || 360)}
                                    style={{ width: '100%' }}
                                    min={0}
                                    max={360}
                                />
                            </div>
                        </div>

                        {/* Direction */}
                        <div>
                            <label style={{ fontSize: '0.8rem', color: '#ccc', display: 'block', marginBottom: '0.25rem' }}>
                                Direction
                            </label>
                            <select
                                value={currentValue.direction || 1}
                                onChange={(e) => handleArcPathChange('direction', parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid #333',
                                    borderRadius: '4px',
                                    padding: '0.25rem',
                                    color: '#ffffff'
                                }}
                            >
                                <option value={1}>Clockwise</option>
                                <option value={-1}>Counter-clockwise</option>
                            </select>
                        </div>
                    </div>

                    {/* Arc Path Info */}
                    <div style={{
                        fontSize: '0.7rem',
                        color: '#888',
                        textAlign: 'center'
                    }}>
                        Arc: {currentValue.radius || 0}px radius, {currentValue.startAngle || 0}° to {currentValue.endAngle || 360}°
                    </div>
                </>
            )}

            {/* Canvas Info */}
            <div style={{
                marginTop: '0.5rem',
                fontSize: '0.6rem',
                color: '#888',
                textAlign: 'center'
            }}>
                Canvas: {width} × {height} {(typeof projectData?.isHorizontal === 'boolean' || typeof projectData?.isHoz === 'boolean') &&
                    ((projectData?.isHorizontal ?? projectData?.isHoz) ? '(Forced Horizontal)' : '(Forced Vertical)')}
            </div>
        </div>
    );
}

export default PositionInput;