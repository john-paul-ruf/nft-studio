import React, { useState } from 'react';

function Point2DInput({ field, value, onChange, projectData }) {
    const currentValue = value || field.default || { x: 0, y: 0 };
    const [showPresets, setShowPresets] = useState(false);

    // Get resolution from project data or use defaults - complete resolution mapping
    const resolution = projectData?.resolution || 'hd';
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
    const baseResolution = resolutions[resolution] || resolutions.hd;

    // Apply isHoz setting - same logic as EffectPreview
    const autoIsHoz = baseResolution.width > baseResolution.height;
    const isHoz = projectData?.isHoz !== null ? projectData.isHoz : autoIsHoz;

    // Determine actual dimensions based on orientation setting
    let width, height;
    if (isHoz) {
        // Use resolution as-is for horizontal
        width = baseResolution.width;
        height = baseResolution.height;
    } else {
        // Swap dimensions for vertical orientation
        width = baseResolution.height;
        height = baseResolution.width;
    }

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

    const handlePresetSelect = (preset) => {
        onChange(field.name, { x: Math.round(preset.x), y: Math.round(preset.y) });
        setShowPresets(false);
    };

    return (
        <div className="point2d-input">
            <label>{field.label}</label>

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
                                    title={`${preset.x}, ${preset.y}`}
                                >
                                    <span>{preset.icon}</span>
                                    <span>{preset.name}</span>
                                </button>
                            ))}
                        </div>
                        <div style={{
                            marginTop: '0.5rem',
                            fontSize: '0.6rem',
                            color: '#888',
                            textAlign: 'center'
                        }}>
                            Canvas: {width} × {height} {projectData?.isHoz !== null && (projectData.isHoz ? '(Forced Horizontal)' : '(Forced Vertical)')}
                        </div>
                    </div>
                )}
            </div>

            {/* Manual Input Fields */}
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
                        onChange={(e) => onChange(field.name, {
                            ...currentValue,
                            x: parseInt(e.target.value) || 0
                        })}
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
                        onChange={(e) => onChange(field.name, {
                            ...currentValue,
                            y: parseInt(e.target.value) || 0
                        })}
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
                {currentValue.x === Math.round(width / 2) && currentValue.y === Math.round(height / 2) && ' - Center'}
            </div>
        </div>
    );
}

export default Point2DInput;