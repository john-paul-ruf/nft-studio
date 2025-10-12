import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import PositionSerializer from '../../../utils/PositionSerializer.js';
import CenterUtils from '../../../utils/CenterUtils.js';
import useDebounce from '../../../hooks/useDebounce.js';

function Point2DInput({ field, value, onChange, projectState }) {
    const [showPresets, setShowPresets] = useState(false);
    
    // Use a ref to track the latest value to avoid stale closures
    const valueRef = useRef(value);
    
    // Local state for display values to provide immediate feedback
    const [displayX, setDisplayX] = useState('');
    const [displayY, setDisplayY] = useState('');

    // Debounce onChange (150ms for numbers)
    const debouncedOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 150);

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

    // Update ref when value prop changes
    useEffect(() => {
        valueRef.current = value;
    }, [value]);
    
    // Helper to get the latest value from ref
    const getCurrentValue = useCallback(() => {
        const normalized = (() => {
            const val = valueRef.current;
            if (!val) return null;
            
            // If it's a Position object, convert to point2d format
            if (val.name === 'position' || val.name === 'arc-path') {
                return PositionSerializer.toPoint2D(val);
            }
            
            // Already in point2d format
            return val;
        })();
        
        return normalized || generateSmartDefault(field, width, height);
    }, [field, width, height]);
    
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
    
    // Sync display values when currentValue changes externally
    useEffect(() => {
        setDisplayX(String(currentValue.x || 0));
        setDisplayY(String(currentValue.y || 0));
    }, [currentValue.x, currentValue.y]);

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
                        value={displayX}
                        onChange={(e) => {
                            const val = e.target.value;
                            setDisplayX(val); // Update display immediately
                            // Allow empty string and partial numbers during typing
                            if (val === '' || val === '-') return;
                            const parsedVal = parseInt(val);
                            if (!isNaN(parsedVal)) {
                                const latestValue = getCurrentValue();
                                debouncedOnChange(field.name, {
                                    ...latestValue,
                                    x: parsedVal
                                });
                            }
                        }}
                        onBlur={(e) => {
                            // On blur, restore current value if empty or invalid
                            const val = e.target.value;
                            if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                const latestValue = getCurrentValue();
                                setDisplayX(String(latestValue.x || 0));
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
                        value={displayY}
                        onChange={(e) => {
                            const val = e.target.value;
                            setDisplayY(val); // Update display immediately
                            // Allow empty string and partial numbers during typing
                            if (val === '' || val === '-') return;
                            const parsedVal = parseInt(val);
                            if (!isNaN(parsedVal)) {
                                const latestValue = getCurrentValue();
                                debouncedOnChange(field.name, {
                                    ...latestValue,
                                    y: parsedVal
                                });
                            }
                        }}
                        onBlur={(e) => {
                            // On blur, restore current value if empty or invalid
                            const val = e.target.value;
                            if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                const latestValue = getCurrentValue();
                                setDisplayY(String(latestValue.y || 0));
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