import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CenterUtils from '../../../utils/CenterUtils.js';
import useDebounce from '../../../hooks/useDebounce.js';
import './EffectInput.bem.css';
import './PositionInput.bem.css';

function PositionInput({ field, value, onChange, projectState }) {
    const [showPresets, setShowPresets] = useState(false);
    const [positionType, setPositionType] = useState('position');
    const [selectedCategory, setSelectedCategory] = useState('basic');
    
    // Use a ref to track the latest value to avoid stale closures
    const valueRef = useRef(value);
    
    // Local state for display values to provide immediate feedback
    const [displayX, setDisplayX] = useState('0');
    const [displayY, setDisplayY] = useState('0');
    const [displayCenterX, setDisplayCenterX] = useState('0');
    const [displayCenterY, setDisplayCenterY] = useState('0');
    const [displayStartAngle, setDisplayStartAngle] = useState('0');
    const [displayEndAngle, setDisplayEndAngle] = useState('360');
    
    // Track if inputs are focused to prevent overwriting during typing
    const isXFocusedRef = useRef(false);
    const isYFocusedRef = useRef(false);
    const isCenterXFocusedRef = useRef(false);
    const isCenterYFocusedRef = useRef(false);
    const isStartAngleFocusedRef = useRef(false);
    const isEndAngleFocusedRef = useRef(false);

    // Debounce onChange (150ms for numbers)
    const debouncedOnChange = useDebounce(useCallback((name, val) => {
        onChange(name, val);
    }, [onChange]), 150);

    // SINGLE SOURCE: Get resolution data ONLY from ProjectState
    const { safeWidth, safeHeight, currentResolutionKey } = useMemo(() => {
        if (!projectState) {
            console.error('PositionInput: No ProjectState available - component cannot function');
            return { safeWidth: 0, safeHeight: 0, currentResolutionKey: 'error' }; // Fail fast - no fallbacks
        }

        const dimensions = projectState.getResolutionDimensions();
        const resolution = projectState.getTargetResolution();
        const isHorizontal = projectState.getIsHorizontal();
        const key = `${resolution}-${dimensions.w}x${dimensions.h}-${isHorizontal ? 'h' : 'v'}`;

        return {
            safeWidth: dimensions.w,
            safeHeight: dimensions.h,
            currentResolutionKey: key
        };
    }, [projectState]);

    // Update ref when value prop changes
    useEffect(() => {
        valueRef.current = value;
    }, [value]);
    
    // Initialize position type based on current value
    useEffect(() => {
        if (value?.name) {
            setPositionType(value.name);
        } else if (value?.x !== undefined && value?.y !== undefined) {
            // Legacy point2d format - convert to position
            setPositionType('position');
        }
    }, [value]);

    // Resolution tracking removed - ProjectState is the single source of truth
    // Canvas component handles all scaling globally


    // Generate default values using ProjectState dimensions ONLY
    const generateDefaultValue = (type) => {
        if (!projectState) {
            console.warn('⚠️ PositionInput: Attempted to generate default without ProjectState');
            return { x: 0, y: 0, __error: true };
        }

        const dimensions = projectState.getResolutionDimensions();
        const center = CenterUtils.getCenterPosition(dimensions.w, dimensions.h);

        // Add resolution metadata to all generated positions
        const resolution = projectState.getTargetResolution();
        const isHorizontal = projectState.getIsHorizontal();
        const resolutionKey = `${resolution}-${dimensions.w}x${dimensions.h}-${isHorizontal ? 'h' : 'v'}`;

        const metadata = {
            __generatedWithCorrectDimensions: true,
            __generatedAt: resolutionKey,
            __generatedTimestamp: Date.now()
        };

        switch (type) {
            case 'position':
                return {
                    name: 'position',
                    x: center.x,
                    y: center.y,
                    ...metadata
                };
            case 'arc-path':
                return {
                    name: 'arc-path',
                    center: { x: center.x, y: center.y },
                    radius: Math.min(dimensions.w, dimensions.h) * 0.2,
                    startAngle: 0,
                    endAngle: 360,
                    direction: 1,
                    ...metadata
                };
            default:
                return {
                    x: center.x,
                    y: center.y,
                    ...metadata
                };
        }
    };

    // Get current value with smart defaults - WAIT for ProjectState to be ready
    // Uses ref to always get the latest value and avoid stale closures
    const getCurrentValue = useCallback(() => {
        // Use value prop directly if available (this ensures preset changes are reflected)
        const latestValue = (value !== undefined && value !== null) ? value : valueRef.current;
        
        if (!latestValue) {
            if (!projectState) {
                // Return placeholder until ProjectState is ready
                return { x: 0, y: 0, __placeholder: true };
            }
            return generateDefaultValue(positionType);
        }

        // Handle legacy point2d format
        if (latestValue.x !== undefined && latestValue.y !== undefined && !latestValue.name) {
            return {
                name: 'position',
                x: latestValue.x,
                y: latestValue.y
            };
        }

        return latestValue;
    }, [value, projectState, positionType]);

    const currentValue = getCurrentValue();
    
    // Sync display values when currentValue changes externally, but ONLY if not actively typing
    useEffect(() => {
        if (positionType === 'position') {
            if (!isXFocusedRef.current) {
                setDisplayX(String(currentValue.x || 0));
            }
            if (!isYFocusedRef.current) {
                setDisplayY(String(currentValue.y || 0));
            }
        } else if (positionType === 'arc-path') {
            if (!isCenterXFocusedRef.current) {
                setDisplayCenterX(String(currentValue.center?.x || 0));
            }
            if (!isCenterYFocusedRef.current) {
                setDisplayCenterY(String(currentValue.center?.y || 0));
            }
            if (!isStartAngleFocusedRef.current) {
                setDisplayStartAngle(String(currentValue.startAngle || 0));
            }
            if (!isEndAngleFocusedRef.current) {
                setDisplayEndAngle(String(currentValue.endAngle || 360));
            }
        }
    }, [currentValue, positionType]);

    // Position presets - SPATIALLY ORGANIZED for visual grid layout
    const basicPresets = useMemo(() => [
        // Row 1: Top
        { name: 'Top Left', x: safeWidth * 0.25, y: safeHeight * 0.25, icon: '⌜' },
        { name: 'Top Center', x: safeWidth / 2, y: safeHeight * 0.25, icon: '⌐' },
        { name: 'Top Right', x: safeWidth * 0.75, y: safeHeight * 0.25, icon: '⌝' },

        // Row 2: Middle
        { name: 'Left Center', x: safeWidth * 0.25, y: safeHeight / 2, icon: '⊢' },
        { name: 'Center', x: safeWidth / 2, y: safeHeight / 2, icon: '⊙' },
        { name: 'Right Center', x: safeWidth * 0.75, y: safeHeight / 2, icon: '⊣' },

        // Row 3: Bottom
        { name: 'Bottom Left', x: safeWidth * 0.25, y: safeHeight * 0.75, icon: '⌞' },
        { name: 'Bottom Center', x: safeWidth / 2, y: safeHeight * 0.75, icon: '⌙' },
        { name: 'Bottom Right', x: safeWidth * 0.75, y: safeHeight * 0.75, icon: '⌟' }
    ], [currentResolutionKey, safeWidth, safeHeight]);

    // Rule of Thirds positions - SPATIALLY ORGANIZED for photography composition
    const thirdsPresets = useMemo(() => [
        // Row 1: Top third
        { name: 'Top Third Left', x: safeWidth * 0.33, y: safeHeight * 0.33, icon: '⚏' },
        { name: 'Top Third Right', x: safeWidth * 0.67, y: safeHeight * 0.33, icon: '⚎' },

        // Row 2: Middle third
        { name: 'Middle Third Left', x: safeWidth * 0.33, y: safeHeight / 2, icon: '⚋' },
        { name: 'Middle Third Right', x: safeWidth * 0.67, y: safeHeight / 2, icon: '⚊' },

        // Row 3: Bottom third
        { name: 'Bottom Third Left', x: safeWidth * 0.33, y: safeHeight * 0.67, icon: '⚍' },
        { name: 'Bottom Third Right', x: safeWidth * 0.67, y: safeHeight * 0.67, icon: '⚌' }
    ], [currentResolutionKey, safeWidth, safeHeight]);

    // Golden Ratio positions (1.618 ratio)
    const goldenPresets = useMemo(() => [
        { name: 'Golden Top Left', x: safeWidth * 0.382, y: safeHeight * 0.382, icon: '◗' },
        { name: 'Golden Top Right', x: safeWidth * 0.618, y: safeHeight * 0.382, icon: '◖' },
        { name: 'Golden Bottom Left', x: safeWidth * 0.382, y: safeHeight * 0.618, icon: '◥' },
        { name: 'Golden Bottom Right', x: safeWidth * 0.618, y: safeHeight * 0.618, icon: '◤' }
    ], [currentResolutionKey, safeWidth, safeHeight]);

    // Edge positions - SPATIALLY ORGANIZED for visual grid layout (3x3 grid)
    const edgePresets = useMemo(() => [
        // Row 1: Top edge and corners
        { name: 'Near Top Left Corner', x: safeWidth * 0.05, y: safeHeight * 0.05, icon: '◸' },
        { name: 'Near Top Edge', x: safeWidth / 2, y: safeHeight * 0.05, icon: '▲' },
        { name: 'Near Top Right Corner', x: safeWidth * 0.95, y: safeHeight * 0.05, icon: '◹' },

        // Row 2: Side edges and center
        { name: 'Near Left Edge', x: safeWidth * 0.05, y: safeHeight / 2, icon: '◀' },
        { name: 'Center', x: safeWidth / 2, y: safeHeight / 2, icon: '⊙' },
        { name: 'Near Right Edge', x: safeWidth * 0.95, y: safeHeight / 2, icon: '▶' },

        // Row 3: Bottom edge and corners
        { name: 'Near Bottom Left Corner', x: safeWidth * 0.05, y: safeHeight * 0.95, icon: '◺' },
        { name: 'Near Bottom Edge', x: safeWidth / 2, y: safeHeight * 0.95, icon: '▼' },
        { name: 'Near Bottom Right Corner', x: safeWidth * 0.95, y: safeHeight * 0.95, icon: '◿' }
    ], [currentResolutionKey, safeWidth, safeHeight]);

    // Category definitions - memoized to update when resolution changes
    const presetCategories = useMemo(() => ({
        basic: { name: 'Basic', presets: basicPresets, icon: '⊙' },
        thirds: { name: 'Rule of Thirds', presets: thirdsPresets, icon: '⚏' },
        golden: { name: 'Golden Ratio', presets: goldenPresets, icon: '◗' },
        edge: { name: 'Edge Positions', presets: edgePresets, icon: '▲' }
    }), [currentResolutionKey]);

    // Get current category presets - memoized to prevent unnecessary recalculations
    const getCurrentCategoryPresets = useMemo(() => {
        return presetCategories[selectedCategory]?.presets || basicPresets;
    }, [presetCategories, selectedCategory, basicPresets]);

    const handlePositionTypeChange = (newType) => {
        setPositionType(newType);
        const newValue = generateDefaultValue(newType);
        onChange(field.name, newValue);
    };

    // Helper function to create position with metadata
    const createPositionWithMetadata = (positionData, isUserSet = false) => {
        return {
            ...positionData,
            ...(isUserSet && {
                __userSet: true,
                __setAt: currentResolutionKey,
                __setTimestamp: Date.now()
            })
        };
    };

    const handlePresetSelect = (preset) => {
        if (positionType === 'position') {
            const newPosition = createPositionWithMetadata({
                name: 'position',
                x: Math.round(preset.x),
                y: Math.round(preset.y)
            }, true);
            onChange(field.name, newPosition);
        }
        setShowPresets(false);
    };

    const handleArcCenterPresetSelect = (preset) => {
        if (positionType === 'arc-path') {
            const latestValue = getCurrentValue();
            const newPosition = createPositionWithMetadata({
                ...latestValue,
                center: {
                    x: Math.round(preset.x),
                    y: Math.round(preset.y)
                }
            }, true);
            onChange(field.name, newPosition);
        }
        setShowPresets(false);
    };

    const handlePositionChange = (newX, newY) => {
        const latestValue = getCurrentValue();
        const newPosition = createPositionWithMetadata({
            ...latestValue,
            x: newX,
            y: newY
        }, true);
        debouncedOnChange(field.name, newPosition);
    };

    const handleArcPathChange = (property, newValue) => {
        const latestValue = getCurrentValue();
        const newPosition = createPositionWithMetadata({
            ...latestValue,
            [property]: newValue
        }, true);
        debouncedOnChange(field.name, newPosition);
    };

    const handleCenterChange = (newX, newY) => {
        const latestValue = getCurrentValue();
        const newPosition = createPositionWithMetadata({
            ...latestValue,
            center: { x: newX, y: newY }
        }, true);
        debouncedOnChange(field.name, newPosition);
    };

    return (
        <div className="effect-input effect-input__position">
            <label className="effect-input__position-label">{field.label}</label>

            {/* Position Type Selector */}
            <div className="position-input__type-selector">
                <label className="position-input__type-label">
                    Position Type
                </label>
                <select
                    value={positionType}
                    onChange={(e) => handlePositionTypeChange(e.target.value)}
                    className="position-input__type-select"
                >
                    <option value="position">Static Position</option>
                    <option value="arc-path">Arc Path</option>
                </select>
            </div>

            {/* Position Type Specific UI */}
            {positionType === 'position' && (
                <>
                    {/* Quick Position Presets */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowPresets(!showPresets)}
                            className="position-input__presets-trigger"
                        >
                            📍 Quick Positions
                        </button>

                        {showPresets && (
                            <div className="position-input__presets-dropdown">
                                {/* Category Tabs */}
                                <div className="position-input__category-tabs">
                                    {Object.entries(presetCategories).map(([key, category]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSelectedCategory(key)}
                                            className={`position-input__category-tab ${selectedCategory === key ? 'position-input__category-tab--active' : ''}`}
                                        >
                                            <span>{category.icon}</span>
                                            <span>{category.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Current Category Presets */}
                                <div className="position-input__presets-grid">
                                    {getCurrentCategoryPresets.map(preset => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => handlePresetSelect(preset)}
                                            className="position-input__preset-button"
                                            title={`${Math.round(preset.x)}, ${Math.round(preset.y)}`}
                                        >
                                            <span className="position-input__preset-button-icon">{preset.icon}</span>
                                            <span className="position-input__preset-button-name">{preset.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Category Description */}
                                <div className="position-input__category-description">
                                    {selectedCategory === 'basic' && 'Standard composition positions'}
                                    {selectedCategory === 'thirds' && 'Photography rule of thirds (33% / 67% points)'}
                                    {selectedCategory === 'golden' && 'Golden ratio composition (38.2% / 61.8% points)'}
                                    {selectedCategory === 'edge' && 'Positions near canvas edges (5% / 95% points)'}
                                </div>

                                <div className="position-input__canvas-info">
                                    Canvas: {safeWidth} × {safeHeight} {projectState &&
                                        (projectState.getIsHorizontal() ? '(Horizontal)' : '(Vertical)')}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Manual Position Input */}
                    <div className="position-input__manual-input-grid">
                        <div className="position-input__input-group">
                            <label className="position-input__input-label">X Position</label>
                            <input
                                type="number"
                                value={displayX}
                                onFocus={() => { isXFocusedRef.current = true; }}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setDisplayX(val); // Update display immediately
                                    // Allow empty string and partial numbers during typing
                                    if (val === '' || val === '-') return;
                                    const parsedVal = parseInt(val);
                                    if (!isNaN(parsedVal)) {
                                        handlePositionChange(parsedVal, currentValue.y);
                                    }
                                }}
                                onBlur={(e) => {
                                    isXFocusedRef.current = false;
                                    // On blur, restore current value if empty or invalid
                                    const val = e.target.value;
                                    if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                        setDisplayX(String(currentValue.x || 0));
                                    }
                                }}
                                className="position-input__coordinate-input"
                            />
                        </div>
                        <div className="position-input__input-group">
                            <label className="position-input__input-label">Y Position</label>
                            <input
                                type="number"
                                value={displayY}
                                onFocus={() => { isYFocusedRef.current = true; }}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setDisplayY(val); // Update display immediately
                                    // Allow empty string and partial numbers during typing
                                    if (val === '' || val === '-') return;
                                    const parsedVal = parseInt(val);
                                    if (!isNaN(parsedVal)) {
                                        handlePositionChange(currentValue.x, parsedVal);
                                    }
                                }}
                                onBlur={(e) => {
                                    isYFocusedRef.current = false;
                                    // On blur, restore current value if empty or invalid
                                    const val = e.target.value;
                                    if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                        setDisplayY(String(currentValue.y || 0));
                                    }
                                }}
                                className="position-input__coordinate-input"
                            />
                        </div>
                    </div>

                    {/* Current Position Display */}
                    <div className="position-input__current-position">
                        Current: ({currentValue.x}, {currentValue.y})
                    </div>
                </>
            )}

            {positionType === 'arc-path' && (
                <>
                    {/* Arc Path Center Quick Presets */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowPresets(!showPresets)}
                            className="position-input__presets-trigger"
                        >
                            📍 Center Quick Picks
                        </button>

                        {showPresets && (
                            <div className="position-input__presets-dropdown">
                                {/* Category Tabs */}
                                <div className="position-input__category-tabs">
                                    {Object.entries(presetCategories).map(([key, category]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSelectedCategory(key)}
                                            className={`position-input__category-tab ${selectedCategory === key ? 'position-input__category-tab--active' : ''}`}
                                        >
                                            <span>{category.icon}</span>
                                            <span>{category.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Current Category Presets */}
                                <div className="position-input__presets-grid">
                                    {getCurrentCategoryPresets.map(preset => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => handleArcCenterPresetSelect(preset)}
                                            className="position-input__preset-button"
                                            title={`Center: ${Math.round(preset.x)}, ${Math.round(preset.y)}`}
                                        >
                                            <span className="position-input__preset-button-icon">{preset.icon}</span>
                                            <span className="position-input__preset-button-name">{preset.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Category Description */}
                                <div className="position-input__category-description">
                                    {selectedCategory === 'basic' && 'Standard composition positions for arc center'}
                                    {selectedCategory === 'thirds' && 'Photography rule of thirds for arc center (33% / 67% points)'}
                                    {selectedCategory === 'golden' && 'Golden ratio composition for arc center (38.2% / 61.8% points)'}
                                    {selectedCategory === 'edge' && 'Arc center positions near canvas edges (5% / 95% points)'}
                                </div>

                                <div className="position-input__canvas-info">
                                    Canvas: {safeWidth} × {safeHeight} {projectState &&
                                        (projectState.getIsHorizontal() ? '(Horizontal)' : '(Vertical)')}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Arc Path Controls */}
                    <div className="position-input__arcpath-controls">
                        {/* Center Point */}
                        <div className="position-input__arcpath-group">
                            <label className="position-input__arcpath-group-label">
                                Center Point
                            </label>
                            <div className="position-input__center-point-grid">
                                <div>
                                    <label className="position-input__arcpath-group-label--small">X</label>
                                    <input
                                        type="number"
                                        value={displayCenterX}
                                        onFocus={() => { isCenterXFocusedRef.current = true; }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setDisplayCenterX(val); // Update display immediately
                                            // Allow empty string and partial numbers during typing
                                            if (val === '' || val === '-') return;
                                            const parsedVal = parseInt(val);
                                            if (!isNaN(parsedVal)) {
                                                handleCenterChange(parsedVal, currentValue.center?.y || 0);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            isCenterXFocusedRef.current = false;
                                            // On blur, restore current value if empty or invalid
                                            const val = e.target.value;
                                            if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                                setDisplayCenterX(String(currentValue.center?.x || 0));
                                            }
                                        }}
                                        className="position-input__coordinate-input"
                                    />
                                </div>
                                <div>
                                    <label className="position-input__arcpath-group-label--small">Y</label>
                                    <input
                                        type="number"
                                        value={displayCenterY}
                                        onFocus={() => { isCenterYFocusedRef.current = true; }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setDisplayCenterY(val); // Update display immediately
                                            // Allow empty string and partial numbers during typing
                                            if (val === '' || val === '-') return;
                                            const parsedVal = parseInt(val);
                                            if (!isNaN(parsedVal)) {
                                                handleCenterChange(currentValue.center?.x || 0, parsedVal);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            isCenterYFocusedRef.current = false;
                                            // On blur, restore current value if empty or invalid
                                            const val = e.target.value;
                                            if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                                setDisplayCenterY(String(currentValue.center?.y || 0));
                                            }
                                        }}
                                        className="position-input__coordinate-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Radius */}
                        <div className="position-input__arcpath-group">
                            <label className="position-input__arcpath-group-label">
                                Radius: {currentValue.radius || 0}px
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={Math.max(safeWidth, safeHeight)}
                                value={currentValue.radius || 100}
                                onChange={(e) => handleArcPathChange('radius', parseInt(e.target.value))}
                                className="position-input__radius-input"
                            />
                        </div>

                        {/* Angles */}
                        <div className="position-input__angles-grid">
                            <div className="position-input__angle-group">
                                <label className="position-input__angle-label">Start Angle (°)</label>
                                <input
                                    type="number"
                                    value={displayStartAngle}
                                    onFocus={() => { isStartAngleFocusedRef.current = true; }}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setDisplayStartAngle(val); // Update display immediately
                                        // Allow empty string and partial numbers during typing
                                        if (val === '' || val === '-') return;
                                        const parsedVal = parseInt(val);
                                        if (!isNaN(parsedVal)) {
                                            handleArcPathChange('startAngle', parsedVal);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        isStartAngleFocusedRef.current = false;
                                        // On blur, restore current value if empty or invalid
                                        const val = e.target.value;
                                        if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                            setDisplayStartAngle(String(currentValue.startAngle || 0));
                                        }
                                    }}
                                    className="position-input__angle-input"
                                />
                            </div>
                            <div className="position-input__angle-group">
                                <label className="position-input__angle-label">End Angle (°)</label>
                                <input
                                    type="number"
                                    value={displayEndAngle}
                                    onFocus={() => { isEndAngleFocusedRef.current = true; }}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setDisplayEndAngle(val); // Update display immediately
                                        // Allow empty string and partial numbers during typing
                                        if (val === '' || val === '-') return;
                                        const parsedVal = parseInt(val);
                                        if (!isNaN(parsedVal)) {
                                            handleArcPathChange('endAngle', parsedVal);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        isEndAngleFocusedRef.current = false;
                                        // On blur, restore current value if empty or invalid
                                        const val = e.target.value;
                                        if (val === '' || val === '-' || isNaN(parseInt(val))) {
                                            setDisplayEndAngle(String(currentValue.endAngle || 360));
                                        }
                                    }}
                                    className="position-input__angle-input"
                                />
                            </div>
                        </div>

                        {/* Direction */}
                        <div className="position-input__arcpath-group">
                            <label className="position-input__arcpath-group-label">
                                Direction
                            </label>
                            <select
                                value={currentValue.direction || 1}
                                onChange={(e) => handleArcPathChange('direction', parseInt(e.target.value))}
                                className="position-input__direction-select"
                            >
                                <option value={1}>Clockwise</option>
                                <option value={-1}>Counter-clockwise</option>
                            </select>
                        </div>
                    </div>

                    {/* Arc Path Info */}
                    <div className="position-input__arcpath-info">
                        Arc: {currentValue.radius || 0}px radius, {currentValue.startAngle || 0}° to {currentValue.endAngle || 360}°
                    </div>
                </>
            )}

            {/* Canvas Info */}
            <div className="position-input__global-canvas-info">
                Canvas: {safeWidth} × {safeHeight} {projectState &&
                    (projectState.getIsHorizontal() ? '(Horizontal)' : '(Vertical)')}
            </div>
        </div>
    );
}

export default PositionInput;