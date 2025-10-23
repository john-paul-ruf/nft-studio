import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Box, TextField, Typography, Button, Grid } from '@mui/material';
import PositionSerializer from '../../../utils/PositionSerializer.js';
import CenterUtils from '../../../utils/CenterUtils.js';
import useDebounce from '../../../hooks/useDebounce.js';
import './EffectInput.bem.css';

function Point2DInput({ field, value, onChange, projectState }) {
    const [showPresets, setShowPresets] = useState(false);
    
    // Use a ref to track the latest value to avoid stale closures
    const valueRef = useRef(value);
    
    // Local state for display values to provide immediate feedback
    const [displayX, setDisplayX] = useState('');
    const [displayY, setDisplayY] = useState('');
    
    // Track if inputs are focused to prevent overwriting during typing
    const isXFocusedRef = useRef(false);
    const isYFocusedRef = useRef(false);

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
        // Use value prop directly if available (this ensures preset changes are reflected)
        const val = (value !== undefined && value !== null) ? value : valueRef.current;
        
        const normalized = (() => {
            if (!val) return null;
            
            // If it's a Position object, convert to point2d format
            if (val.name === 'position' || val.name === 'arc-path') {
                return PositionSerializer.toPoint2D(val);
            }
            
            // Already in point2d format
            return val;
        })();
        
        return normalized || generateSmartDefault(field, width, height);
    }, [value, field, width, height]);
    
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
    
    // Sync display values when currentValue changes externally, but ONLY if not actively typing
    useEffect(() => {
        if (!isXFocusedRef.current) {
            setDisplayX(String(currentValue.x || 0));
        }
        if (!isYFocusedRef.current) {
            setDisplayY(String(currentValue.y || 0));
        }
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
        <Box className="effect-input effect-input__point2d">
            <Typography variant="subtitle2" className="effect-input__point2d-label">
                {field.label}
            </Typography>

            {/* Quick Position Presets */}
            <Box>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowPresets(!showPresets)}
                    className="effect-input__point2d-quick-button"
                >
                    📍 Quick Positions
                </Button>

                {showPresets && (
                    <Box className="effect-input__point2d-presets">
                        <Grid container spacing={0.5} className="effect-input__point2d-preset-grid">
                            {positionPresets.map(preset => (
                                <Grid item xs={4} key={preset.name}>
                                    <Button
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handlePresetSelect(preset)}
                                        className="effect-input__point2d-preset-button"
                                        title={`${preset.x}, ${preset.y}`}
                                    >
                                        <span>{preset.icon}</span>
                                    </Button>
                                </Grid>
                            ))}
                        </Grid>
                        <Typography 
                            variant="caption" 
                            className="effect-input__point2d-preset-info"
                        >
                            Canvas: {width} × {height} ({projectState?.getIsHorizontal() ? 'Horizontal' : 'Vertical'})
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Manual Input Fields */}
            <Grid container spacing={1} className="effect-input__point2d-inputs">
                <Grid item xs={6}>
                    <TextField
                        fullWidth
                        type="number"
                        size="small"
                        label="X Position"
                        value={displayX}
                        onFocus={() => {
                            isXFocusedRef.current = true;
                        }}
                        onChange={(e) => {
                            const val = e.target.value;
                            setDisplayX(val);
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
                            isXFocusedRef.current = false;
                            const val = e.target.value;
                            if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                const latestValue = getCurrentValue();
                                setDisplayX(String(latestValue.x || 0));
                            }
                        }}
                        variant="outlined"
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth
                        type="number"
                        size="small"
                        label="Y Position"
                        value={displayY}
                        onFocus={() => {
                            isYFocusedRef.current = true;
                        }}
                        onChange={(e) => {
                            const val = e.target.value;
                            setDisplayY(val);
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
                            isYFocusedRef.current = false;
                            const val = e.target.value;
                            if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                const latestValue = getCurrentValue();
                                setDisplayY(String(latestValue.y || 0));
                            }
                        }}
                        variant="outlined"
                    />
                </Grid>
            </Grid>

            {/* Current Position Display */}
            <Typography 
                variant="caption" 
                className="effect-input__point2d-position-display"
            >
                Current: ({currentValue.x}, {currentValue.y})
                {currentValue.x === Math.round(width / 2) && currentValue.y === Math.round(height / 2) && ' - Center'}
            </Typography>
        </Box>
    );
}

export default Point2DInput;