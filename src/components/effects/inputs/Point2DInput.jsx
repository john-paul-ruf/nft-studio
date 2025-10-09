import React, { useState, useMemo } from 'react';
import PositionSerializer from '../../../utils/PositionSerializer.js';
import CenterUtils from '../../../utils/CenterUtils.js';

function Point2DInput({ field, value, onChange, projectState }) {
    const [showPresets, setShowPresets] = useState(false);

    // SINGLE SOURCE: Get dimensions ONLY from ProjectState
    const { width, height, currentResolutionKey } = useMemo(() => {
        if (!projectState) {
            console.error('Point2DInput: No ProjectState available - component cannot function');
            return { width: 0, height: 0, currentResolutionKey: 'error' }; // Fail fast - no fallbacks
        }

        const dimensions = projectState.getResolutionDimensions();
        const resolution = projectState.getTargetResolution();
        const isHorizontal = projectState.getIsHorizontal();
        const key = `${resolution}-${dimensions.w}x${dimensions.h}-${isHorizontal ? 'h' : 'v'}`;

        console.log('📐 Point2DInput: Using ProjectState dimensions:', {
            dimensions,
            resolution,
            isHorizontal,
            resolutionKey: key
        });

        return {
            width: dimensions.w,
            height: dimensions.h,
            currentResolutionKey: key
        };
    }, [projectState]);

    // Resolution tracking removed - ProjectState is the single source of truth

    // Generate smart defaults using unified CenterUtils
    const generateSmartDefault = (field, width, height) => {
        console.log('📍 Point2DInput: generateSmartDefault called with:', {
            fieldName: field.name,
            fieldDefault: field.default,
            dimensions: { width, height }
        });

        if (!projectState) {
            console.warn('⚠️ Point2DInput: Attempted to generate default without ProjectState');
            return { x: 0, y: 0, __error: true };
        }

        // Create resolution info for CenterUtils using ProjectState
        const resolutionInfo = {
            width,
            height,
            resolution: projectState.getTargetResolution(),
            isHorizontal: projectState.getIsHorizontal()
        };

        // Use the unified center processing logic
        const processedValue = CenterUtils.processFieldValue(
            field.name,
            field.default || { x: 0, y: 0 },
            resolutionInfo
        );

        console.log('📍 Point2DInput: generateSmartDefault result:', {
            fieldName: field.name,
            resolutionInfo,
            inputValue: field.default || { x: 0, y: 0 },
            processedValue,
            isCenterField: CenterUtils.shouldApplyCenter(field.name, field.default)
        });

        return processedValue;
    };

    // Handle Position objects by converting to point2d format
    const normalizedValue = (() => {
        if (!value) return null;

        // If it's a Position object, convert to point2d format
        if (value.name === 'position' || value.name === 'arc-path') {
            return PositionSerializer.toPoint2D(value);
        }

        // Already in point2d format
        return value;
    })();

    // Calculate current value with smart defaults, ensuring we react to changes
    const currentValue = useMemo(() => {
        const resolved = normalizedValue || generateSmartDefault(field, width, height);
        console.log('📍 Point2DInput currentValue calculated:', {
            fieldName: field.name,
            normalizedValue,
            resolved,
            dimensions: { width, height },
            resolutionKey: currentResolutionKey
        });
        return resolved;
    }, [normalizedValue, field, width, height, currentResolutionKey]);

    // Memoize position presets - SPATIALLY ORGANIZED for 3x3 grid
    const positionPresets = useMemo(() => [
        // Row 1: Top
        { name: 'Top Left', x: width * 0.25, y: height * 0.25, icon: '⌜' },
        { name: 'Top Center', x: width / 2, y: height * 0.25, icon: '⌐' },
        { name: 'Top Right', x: width * 0.75, y: height * 0.25, icon: '⌝' },

        // Row 2: Middle
        { name: 'Left Center', x: width * 0.25, y: height / 2, icon: '⊢' },
        { name: 'Center', x: width / 2, y: height / 2, icon: '⊙' },
        { name: 'Right Center', x: width * 0.75, y: height / 2, icon: '⊣' },

        // Row 3: Bottom
        { name: 'Bottom Left', x: width * 0.25, y: height * 0.75, icon: '⌞' },
        { name: 'Bottom Center', x: width / 2, y: height * 0.75, icon: '⌙' },
        { name: 'Bottom Right', x: width * 0.75, y: height * 0.75, icon: '⌟' }
    ], [width, height]);

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
                            Canvas: {width} × {height} ({projectState?.getIsHorizontal() ? 'Horizontal' : 'Vertical'})
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
                        onChange={(e) => {
                            const val = e.target.value;
                            // Allow empty string during typing
                            if (val === '') return;
                            onChange(field.name, {
                                ...currentValue,
                                x: parseInt(val) || 0
                            });
                        }}
                        onBlur={(e) => {
                            // On blur, ensure we have a valid value
                            const val = e.target.value;
                            if (val === '') {
                                onChange(field.name, {
                                    ...currentValue,
                                    x: 0
                                });
                            }
                        }}
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
                        onChange={(e) => {
                            const val = e.target.value;
                            // Allow empty string during typing
                            if (val === '') return;
                            onChange(field.name, {
                                ...currentValue,
                                y: parseInt(val) || 0
                            });
                        }}
                        onBlur={(e) => {
                            // On blur, ensure we have a valid value
                            const val = e.target.value;
                            if (val === '') {
                                onChange(field.name, {
                                    ...currentValue,
                                    y: 0
                                });
                            }
                        }}
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