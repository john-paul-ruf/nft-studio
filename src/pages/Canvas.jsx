import React, { useState, useEffect, useRef } from 'react';
import EffectPicker from '../components/EffectPicker';
import EffectsPanel from '../components/EffectsPanel';
import EffectConfigurer from '../components/effects/EffectConfigurer';
import EffectContextMenu from '../components/EffectContextMenu';
import ColorSchemeDropdown from '../components/ColorSchemeDropdown';
import ColorSchemeService from '../services/ColorSchemeService';
import PreferencesService from '../services/PreferencesService';
import ResolutionMapper from '../utils/ResolutionMapper';
import { useInitialResolution } from '../hooks/useInitialResolution';
import './Canvas.css';

export default function Canvas({ projectConfig, onUpdateConfig }) {
    console.log('🔍 Canvas received projectConfig:', projectConfig);
    const { initialResolution, isLoaded } = useInitialResolution(projectConfig);

    const [config, setConfig] = useState(() => {
        if (projectConfig) {
            return projectConfig;
        }
        // Initialize with default, will be updated when preferences load
        return {
            targetResolution: ResolutionMapper.getDefaultResolution(),
            isHorizontal: false,
            numFrames: 100,
            effects: [],
            colorScheme: null
        };
    });

    // All useState hooks must be called before any early returns
    const [showColorScheme, setShowColorScheme] = useState(false);
    const [showEffectPicker, setShowEffectPicker] = useState(false);
    const [editingEffect, setEditingEffect] = useState(null);
    const [selectedFrame, setSelectedFrame] = useState(0);
    const [renderResult, setRenderResult] = useState(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderTimer, setRenderTimer] = useState(0);
    const canvasRef = useRef(null);
    const renderTimerRef = useRef(null);
    const [contextMenuEffect, setContextMenuEffect] = useState(null);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const frameHolderRef = useRef(null);

    // Dropdown menu state
    const [showRenderMenu, setShowRenderMenu] = useState(false);
    const [showZoomMenu, setShowZoomMenu] = useState(false);
    const [showAddEffectMenu, setShowAddEffectMenu] = useState(false);
    const [showColorSchemeMenu, setShowColorSchemeMenu] = useState(false);

    // Effects state
    const [availableEffects, setAvailableEffects] = useState({
        primary: [],
        secondary: []
    });
    const [effectsLoaded, setEffectsLoaded] = useState(false);
    const [showSubmenu, setShowSubmenu] = useState(null); // 'primary' or 'secondary'
    const [submenuTimeout, setSubmenuTimeout] = useState(null);

    // Update config when initial resolution loads (for non-projectConfig cases)
    useEffect(() => {
        console.log('🔍 Resolution update effect:', {
            isLoaded,
            projectConfig: !!projectConfig,
            initialResolution,
            currentResolution: config.targetResolution,
            shouldUpdate: isLoaded && !projectConfig && initialResolution !== config.targetResolution
        });

        if (isLoaded && !projectConfig && initialResolution !== config.targetResolution) {
            console.log('🚀 Updating Canvas with user resolution:', initialResolution);
            setConfig(prev => ({ ...prev, targetResolution: initialResolution }));
        }
    }, [isLoaded, initialResolution, projectConfig, config.targetResolution]);

    // Show loading until resolution is loaded (only for non-projectConfig cases)
    if (!isLoaded && !projectConfig) {
        return <div className="canvas-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div>Loading...</div>
        </div>;
    }

    useEffect(() => {
        if (renderResult && canvasRef.current) {
            console.log('🖼️ Loading rendered image:', renderResult?.substring(0, 50) + '...');

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                console.log('✅ Image loaded successfully, dimensions:', img.width, 'x', img.height);

                // Clear canvas with black background first
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw the image to fit the canvas
                const canvasAspect = canvas.width / canvas.height;
                const imgAspect = img.width / img.height;

                let drawWidth, drawHeight, drawX, drawY;

                if (imgAspect > canvasAspect) {
                    // Image is wider than canvas ratio - fit by width
                    drawWidth = canvas.width;
                    drawHeight = canvas.width / imgAspect;
                    drawX = 0;
                    drawY = (canvas.height - drawHeight) / 2;
                } else {
                    // Image is taller than canvas ratio - fit by height
                    drawHeight = canvas.height;
                    drawWidth = canvas.height * imgAspect;
                    drawX = (canvas.width - drawWidth) / 2;
                    drawY = 0;
                }

                console.log('🎨 Drawing image at:', drawX, drawY, drawWidth, drawHeight);
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

                console.log('✅ Image successfully drawn to canvas');
            };

            img.onerror = (error) => {
                console.error('❌ Failed to load rendered image:', error);
                console.error('   Image src type:', typeof renderResult);
                console.error('   Image src length:', renderResult?.length);
                console.error('   Image src preview:', renderResult?.substring(0, 100));

                // Draw error message on canvas
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#440000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ff8888';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Image Load Failed', canvas.width / 2, canvas.height / 2 - 10);
                ctx.fillText('Check Console', canvas.width / 2, canvas.height / 2 + 10);
            };

            // Set crossOrigin for blob URLs and handle file:// URLs
            if (renderResult.startsWith('blob:')) {
                img.crossOrigin = 'anonymous';
            } else if (renderResult.startsWith('file://')) {
                console.log('📁 Loading from file system URL');
                // File URLs don't need crossOrigin
            }

            img.src = renderResult;
        } else if (renderResult) {
            console.warn('⚠️ renderResult exists but canvasRef is not ready:', !!canvasRef.current);
        }

        // Cleanup blob URLs to prevent memory leaks
        return () => {
            if (renderResult && renderResult.startsWith('blob:')) {
                console.log('🧹 Cleaning up blob URL');
                URL.revokeObjectURL(renderResult);
            }
        };
    }, [renderResult]);

    // Timer effect for rendering
    useEffect(() => {
        if (isRendering) {
            setRenderTimer(0);
            renderTimerRef.current = setInterval(() => {
                setRenderTimer(prev => prev + 1);
            }, 1000);
        } else {
            if (renderTimerRef.current) {
                clearInterval(renderTimerRef.current);
                renderTimerRef.current = null;
            }
        }

        return () => {
            if (renderTimerRef.current) {
                clearInterval(renderTimerRef.current);
                renderTimerRef.current = null;
            }
        };
    }, [isRendering]);

    const updateConfig = (updates) => {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        onUpdateConfig(newConfig);
    };

    // Load default color scheme on component mount
    useEffect(() => {
        const loadDefaultColorScheme = async () => {
            // Skip if colorScheme is already set (from projectConfig)
            if (config.colorScheme) {
                return;
            }

            try {
                // Try to get user's default scheme
                const defaultScheme = await PreferencesService.getDefaultColorScheme();
                if (defaultScheme) {
                    console.log('🎨 Loading user default color scheme:', defaultScheme);
                    updateConfig({ colorScheme: defaultScheme });
                    return;
                }

                // Fallback: get first available scheme
                const allSchemes = await ColorSchemeService.getAllColorSchemes();
                const schemeIds = Object.keys(allSchemes);
                if (schemeIds.length > 0) {
                    const firstScheme = schemeIds[0];
                    console.log('🎨 Loading first available color scheme:', firstScheme);
                    updateConfig({ colorScheme: firstScheme });
                } else {
                    console.warn('⚠️ No color schemes available');
                }
            } catch (error) {
                console.error('❌ Failed to load default color scheme:', error);
                // Fallback to a known scheme
                updateConfig({ colorScheme: 'neon-cyberpunk' });
            }
        };

        loadDefaultColorScheme();
    }, []); // Run only on mount

    // Resolution loading is now handled by useInitialResolution hook

    const handleResolutionChange = async (e) => {
        const baseResolution = parseInt(e.target.value);
        updateConfig({ targetResolution: baseResolution });

        // Save resolution preference
        try {
            // Save the actual pixel value as the preference
            await PreferencesService.saveLastProjectInfo(null, null, baseResolution.toString(), null);
            console.log('💾 Saved resolution preference:', baseResolution);
        } catch (error) {
            console.error('❌ Failed to save resolution preference:', error);
        }
    };

    const getResolutionDimensions = () => {
        return ResolutionMapper.getDimensions(config.targetResolution, config.isHorizontal);
    };

    const handleOrientationToggle = () => {
        updateConfig({ isHorizontal: !config.isHorizontal });
    };

    // Zoom and pan functions
    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev * 1.2, 10)); // Max zoom 10x
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev / 1.2, 0.1)); // Min zoom 0.1x
    };

    const handleZoomReset = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleMouseDown = (e) => {
        if (e.target === canvasRef.current || e.target === frameHolderRef.current) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            e.preventDefault();
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e) => {
        if (e.target === canvasRef.current || e.target.closest('.frame-holder')) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(prev => Math.max(0.1, Math.min(prev * delta, 10)));
        }
    };

    // Add global mouse event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'grabbing';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
        };
    }, [isDragging, dragStart]);

    const handleFramesChange = (e) => {
        const frames = parseInt(e.target.value);
        updateConfig({ numFrames: frames });
        if (selectedFrame >= frames) {
            setSelectedFrame(frames - 1);
        }
    };

    // Close all dropdown menus
    const closeAllDropdowns = () => {
        setShowRenderMenu(false);
        setShowZoomMenu(false);
        setShowAddEffectMenu(false);
        setShowColorSchemeMenu(false);
        setShowSubmenu(null);
        if (submenuTimeout) {
            clearTimeout(submenuTimeout);
            setSubmenuTimeout(null);
        }
    };

    // Enhanced submenu handlers with proper delays
    const handleSubmenuEnter = (submenuType) => {
        if (submenuTimeout) {
            clearTimeout(submenuTimeout);
            setSubmenuTimeout(null);
        }
        setShowSubmenu(submenuType);
    };

    const handleSubmenuLeave = () => {
        const timeout = setTimeout(() => {
            setShowSubmenu(null);
        }, 150); // 150ms delay before closing
        setSubmenuTimeout(timeout);
    };

    const handleSubmenuAreaEnter = () => {
        if (submenuTimeout) {
            clearTimeout(submenuTimeout);
            setSubmenuTimeout(null);
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                closeAllDropdowns();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleColorSchemeChange = (schemeId) => {
        updateConfig({
            colorScheme: schemeId
        });
    };

    // Load available effects
    const loadAvailableEffects = async () => {
        try {
            const result = await window.api.getAvailableEffects();
            if (result.success) {
                setAvailableEffects({
                    primary: result.effects.primary || [],
                    secondary: result.effects.secondary || []
                });
                setEffectsLoaded(true);
            }
        } catch (error) {
            console.error('Failed to load available effects:', error);
        }
    };

    // Load effects on component mount
    useEffect(() => {
        loadAvailableEffects();
    }, []);

    const handleAddEffect = (effect) => {
        const newEffects = [...(config.effects || []), effect];
        updateConfig({ effects: newEffects });
        setShowEffectPicker(false);
    };

    // Add effect directly from dropdown (without opening picker)
    const handleAddEffectDirect = async (effectName, effectType = 'primary') => {
        try {
            // Get effect defaults from backend
            const result = await window.api.getEffectDefaults(effectName);
            if (result.success) {
                // Find the effect in our available effects to get the className
                const effectCategory = availableEffects[effectType] || [];
                const effectData = effectCategory.find(e => e.name === effectName);

                console.log('🔍 Creating effect:', {
                    effectName,
                    effectType,
                    effectData,
                    foundInCategory: !!effectData
                });

                const effect = {
                    name: effectName, // Keep original name from registry
                    className: effectData?.className || effectName, // Use className from effect data or fallback to name
                    type: effectType,
                    config: result.defaults,
                    visible: true
                };

                console.log('🔍 Created effect object:', effect);

                const newEffects = [...(config.effects || []), effect];
                updateConfig({ effects: newEffects });
                setShowAddEffectMenu(false);

                console.log(`✅ Added ${effectType} effect: ${effectName}`, effect);
            } else {
                console.error('Failed to get effect defaults:', result.error);
                alert(`Failed to add effect: ${result.error}`);
            }
        } catch (error) {
            console.error('Error adding effect:', error);
            alert(`Error adding effect: ${error.message}`);
        }
    };

    const handleEffectUpdate = (index, updatedEffect) => {
        const newEffects = [...config.effects];
        newEffects[index] = updatedEffect;
        updateConfig({ effects: newEffects });
    };

    const handleEffectDelete = (index) => {
        const newEffects = config.effects.filter((_, i) => i !== index);
        updateConfig({ effects: newEffects });
    };

    const handleEffectReorder = (fromIndex, toIndex) => {
        const newEffects = [...config.effects];
        const [removed] = newEffects.splice(fromIndex, 1);
        newEffects.splice(toIndex, 0, removed);
        updateConfig({ effects: newEffects });
    };

    const handleEffectToggleVisibility = (index) => {
        const newEffects = [...config.effects];
        newEffects[index] = {
            ...newEffects[index],
            visible: newEffects[index].visible === false ? true : false
        };
        updateConfig({ effects: newEffects });
    };

    const handleRenderLoop = async () => {
        // TODO: Implement loop rendering functionality
        console.log('🔄 Render Loop functionality not yet implemented');
        alert('Render Loop functionality coming soon!');
    };

    const handleRender = async () => {
        setIsRendering(true);

        // Clear previous render result
        setRenderResult(null);

        try {
            console.log('🚀 Starting render for frame:', selectedFrame);

            const dimensions = getResolutionDimensions();

            // Fetch full color scheme data for backend
            let colorSchemeData = null;
            if (config.colorScheme) {
                const fullScheme = await ColorSchemeService.getColorScheme(config.colorScheme);
                if (fullScheme) {
                    colorSchemeData = {
                        name: fullScheme.name,
                        colors: fullScheme.lights || [], // Use lights as colors for colorBucket
                        lights: fullScheme.lights || [],
                        neutrals: fullScheme.neutrals || [],
                        backgrounds: fullScheme.backgrounds || []
                    };
                }
            }

            // Filter out hidden effects for rendering
            const visibleEffects = (config.effects || []).filter(effect => effect.visible !== false);

            const renderConfig = {
                ...config,
                effects: visibleEffects,
                width: dimensions.w,
                height: dimensions.h,
                renderStartFrame: selectedFrame,
                renderJumpFrames: config.numFrames + 1,
                colorSchemeData: colorSchemeData
            };

            console.log('📋 Frame values check:', {
                toolbarSelectedFrame: selectedFrame,
                toolbarTotalFrames: config.numFrames,
                renderConfigStartFrame: renderConfig.renderStartFrame,
                renderConfigJumpFrames: renderConfig.renderJumpFrames,
                renderConfigNumFrames: renderConfig.numFrames,
                framePassedToAPI: selectedFrame
            });

            console.log('📋 Resolution consistency check:', {
                pickerResolution: config.targetResolution,
                dimensionsFromPicker: dimensions,
                renderConfigWidth: renderConfig.width,
                renderConfigHeight: renderConfig.height,
                renderConfigTargetResolution: renderConfig.targetResolution
            });

            console.log('📋 Render config:', {
                width: dimensions.w,
                height: dimensions.h,
                frame: selectedFrame,
                totalEffects: config.effects?.length || 0,
                visibleEffects: visibleEffects.length,
                colorScheme: config.colorScheme,
                hasColorSchemeData: !!colorSchemeData
            });

            // Debug the actual effects being passed
            console.log('🔍 Effects debug:', {
                allEffects: config.effects,
                visibleEffects: visibleEffects,
                effectDetails: visibleEffects.map(effect => ({
                    name: effect.name,
                    className: effect.className,
                    type: effect.type,
                    visible: effect.visible,
                    hasConfig: !!effect.config,
                    configKeys: effect.config ? Object.keys(effect.config) : null
                }))
            });

            const result = await window.api.renderFrame(renderConfig, selectedFrame);

            console.log('🎯 Render result:', {
                success: result.success,
                hasFrameBuffer: !!result.frameBuffer,
                frameBufferType: typeof result.frameBuffer,
                frameBufferSize: result.frameBuffer?.length || 'unknown',
                bufferType: result.bufferType
            });

            if (result.success && (result.frameBuffer || result.fileUrl)) {
                // Handle file system method
                if (result.method === 'filesystem' || result.bufferType === 'filesystem') {
                    console.log('📁 Using file system method');
                    console.log('📋 File URL:', result.fileUrl);
                    setRenderResult(result.fileUrl);
                }
                // Handle base64 buffer type (our standard format)
                else if (result.bufferType === 'base64' || typeof result.frameBuffer === 'string') {
                    if (result.frameBuffer.startsWith('data:image')) {
                        // Already a data URL
                        console.log('✅ Using existing data URL');
                        setRenderResult(result.frameBuffer);
                    } else {
                        // Convert base64 string to data URL
                        console.log('🔄 Converting base64 to data URL (standard path)');
                        const imageUrl = `data:image/png;base64,${result.frameBuffer}`;
                        console.log('✅ Created data URL, length:', imageUrl.length);

                        // Validate the base64 string
                        try {
                            // Test if base64 is valid by attempting to decode a small portion
                            const testDecode = atob(result.frameBuffer.substring(0, 100));
                            console.log('✅ Base64 validation passed');
                            setRenderResult(imageUrl);
                        } catch (e) {
                            console.error('❌ Invalid base64 data:', e);
                            // Try direct rendering as fallback
                            setRenderResult(result.frameBuffer);
                        }
                    }
                } else if (result.frameBuffer instanceof ArrayBuffer || result.frameBuffer instanceof Uint8Array) {
                    // Legacy path - convert binary buffer to base64 data URL
                    console.log('🔄 Converting binary buffer to base64 data URL');

                    let uint8Array;
                    if (result.frameBuffer instanceof ArrayBuffer) {
                        uint8Array = new Uint8Array(result.frameBuffer);
                    } else {
                        uint8Array = result.frameBuffer;
                    }

                    // Convert to base64 using alternative method
                    let binary = '';
                    const chunkSize = 8192;
                    for (let i = 0; i < uint8Array.length; i += chunkSize) {
                        const chunk = uint8Array.slice(i, i + chunkSize);
                        binary += String.fromCharCode.apply(null, chunk);
                    }
                    const base64 = btoa(binary);
                    const imageUrl = `data:image/png;base64,${base64}`;

                    console.log('✅ Created data URL from binary, length:', imageUrl.length);
                    setRenderResult(imageUrl);
                } else {
                    console.error('❌ Unknown frameBuffer format:', typeof result.frameBuffer);
                    // Try to convert whatever it is to string and use as base64
                    const imageUrl = `data:image/png;base64,${result.frameBuffer}`;
                    console.warn('⚠️ Attempting fallback conversion');
                    setRenderResult(imageUrl);
                }
            } else if (result.success && !result.frameBuffer) {
                console.error('❌ Render succeeded but no frameBuffer returned');
                alert('Render completed but no image data was returned. Check the console for details.');
            } else {
                console.error('❌ Render failed:', result.error);
                alert(`Render failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Render error:', error);
            alert(`Render error: ${error.message}`);
        } finally {
            setIsRendering(false);
        }
    };

    const handleEffectRightClick = (effect, index, e) => {
        e.preventDefault();
        setContextMenuEffect({ effect, index });
        setContextMenuPos({ x: e.clientX, y: e.clientY });
    };

    const handleEditEffect = () => {
        if (contextMenuEffect) {
            setEditingEffect(contextMenuEffect.index);
            setContextMenuEffect(null);
        }
    };

    const handleAddSecondaryEffect = async (effect) => {
        if (contextMenuEffect) {
            try {
                const defaults = await window.api.getEffectDefaults(effect.name);
                const newSecondaryEffect = {
                    className: effect.name,
                    config: defaults || {}
                };

                const updatedEffect = {
                    ...contextMenuEffect.effect,
                    secondaryEffects: [
                        ...(contextMenuEffect.effect.secondaryEffects || []),
                        newSecondaryEffect
                    ]
                };
                handleEffectUpdate(contextMenuEffect.index, updatedEffect);
            } catch (error) {
                console.error('Failed to add secondary effect:', error);
            }
        }
        setContextMenuEffect(null);
    };

    const handleAddKeyframeEffect = async (effect) => {
        if (contextMenuEffect) {
            try {
                const defaults = await window.api.getEffectDefaults(effect.name);
                const frameNumber = selectedFrame; // Use current frame
                const newKeyframeEffect = {
                    frame: frameNumber,
                    className: effect.name,
                    config: defaults || {}
                };

                const updatedEffect = {
                    ...contextMenuEffect.effect,
                    keyframeEffects: [
                        ...(contextMenuEffect.effect.keyframeEffects || []),
                        newKeyframeEffect
                    ]
                };
                handleEffectUpdate(contextMenuEffect.index, updatedEffect);
            } catch (error) {
                console.error('Failed to add keyframe effect:', error);
            }
        }
        setContextMenuEffect(null);
    };

    return (
        <div className="canvas-container">
            <div className="toolbar">
                <div className="toolbar-group dropdown-container">
                    <button
                        className="toolbar-button"
                        onClick={() => {
                            closeAllDropdowns();
                            setShowRenderMenu(!showRenderMenu);
                        }}
                        disabled={isRendering}
                        title="Render options"
                    >
                        {isRendering ? 'Rendering...' : 'Render'} ▼
                    </button>
                    {showRenderMenu && (
                        <div className="dropdown-menu">
                            <button
                                className="dropdown-item"
                                onClick={() => {
                                    handleRender();
                                    setShowRenderMenu(false);
                                }}
                            >
                                🎬 Render Frame
                            </button>
                            <button
                                className="dropdown-item"
                                onClick={() => {
                                    handleRenderLoop();
                                    setShowRenderMenu(false);
                                }}
                            >
                                🔄 Render Loop
                            </button>
                        </div>
                    )}
                </div>

                <div className="toolbar-group">
                    <label className="toolbar-label"></label>
                    <select
                        className="toolbar-select"
                        value={config.targetResolution}
                        onChange={handleResolutionChange}
                    >
                        {Object.entries(ResolutionMapper.getAllResolutions()).map(([width, resolution]) => (
                            <option key={width} value={width}>
                                {ResolutionMapper.getDisplayName(parseInt(width))}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="toolbar-group">
                    <button
                        className={`toolbar-toggle ${config.isHorizontal ? 'active' : ''}`}
                        onClick={handleOrientationToggle}
                        title={config.isHorizontal ? 'Horizontal' : 'Vertical'}
                    >
                        {config.isHorizontal ? '↔' : '↕'}
                    </button>
                </div>

                <div className="toolbar-group">
                    <label className="toolbar-label">Frames</label>
                    <input
                        type="number"
                        className="toolbar-input"
                        value={config.numFrames}
                        onChange={handleFramesChange}
                        min="1"
                        max="10000"
                    />
                </div>

                <div className="toolbar-group">
                    <label className="toolbar-label">Frame</label>
                    <input
                        type="number"
                        className="toolbar-input"
                        value={selectedFrame}
                        onChange={(e) => setSelectedFrame(parseInt(e.target.value))}
                        min="0"
                        max={config.numFrames - 1}
                    />
                </div>

                <div className="toolbar-group dropdown-container">
                    <button
                        className="toolbar-button"
                        onClick={() => {
                            closeAllDropdowns();
                            setShowZoomMenu(!showZoomMenu);
                        }}
                        title="Zoom actions"
                    >
                        {Math.round(zoom * 100)}% ▼
                    </button>
                    {showZoomMenu && (
                        <div className="dropdown-menu">
                            <button
                                className="dropdown-item"
                                onClick={() => {
                                    handleZoomIn();
                                    setShowZoomMenu(false);
                                }}
                            >
                                🔍+ Zoom In
                            </button>
                            <button
                                className="dropdown-item"
                                onClick={() => {
                                    handleZoomOut();
                                    setShowZoomMenu(false);
                                }}
                            >
                                🔍− Zoom Out
                            </button>
                            <button
                                className="dropdown-item"
                                onClick={() => {
                                    handleZoomReset();
                                    setShowZoomMenu(false);
                                }}
                            >
                                ⌂ Reset
                            </button>
                        </div>
                    )}
                </div>

                <div className="toolbar-group dropdown-container">
                    <button
                        className="toolbar-button"
                        onClick={() => {
                            closeAllDropdowns();
                            setShowColorSchemeMenu(!showColorSchemeMenu);
                        }}
                        title="Select color scheme"
                    >
                        Color Scheme ▼
                    </button>
                    {showColorSchemeMenu && (
                        <div className="dropdown-menu" style={{
                            minWidth: '600px',
                            maxWidth: '700px',
                            maxHeight: '400px',
                            overflow: 'auto',
                            left: '-200px' // Offset to center it better
                        }}>
                            <ColorSchemeDropdown
                                value={config.colorScheme || 'neon-cyberpunk'}
                                onChange={(schemeId) => {
                                    handleColorSchemeChange(schemeId);
                                    setShowColorSchemeMenu(false);
                                }}
                                projectData={{
                                    resolution: 'hd',
                                    isHoz: config.isHorizontal
                                }}
                                showPreview={true}
                                isInDropdown={true}
                            />
                        </div>
                    )}
                </div>

                <div className="toolbar-group dropdown-container">
                    <button
                        className="toolbar-button"
                        onClick={() => {
                            closeAllDropdowns();
                            setShowAddEffectMenu(!showAddEffectMenu);
                        }}
                        title="Add effect options"
                    >
                        Add Effect ▼
                    </button>
                    {showAddEffectMenu && (
                        <div className="dropdown-menu" style={{ minWidth: '150px' }}>
                            {!effectsLoaded ? (
                                <div className="dropdown-item" style={{ color: '#888', fontStyle: 'italic' }}>
                                    Loading effects...
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="dropdown-item dropdown-submenu-trigger"
                                        onMouseEnter={() => handleSubmenuEnter('primary')}
                                        onMouseLeave={handleSubmenuLeave}
                                    >
                                        Primary ▶
                                        {showSubmenu === 'primary' && (
                                            <div
                                                className="dropdown-submenu"
                                                onMouseEnter={handleSubmenuAreaEnter}
                                                onMouseLeave={handleSubmenuLeave}
                                            >
                                                {availableEffects.primary.map((effect) => (
                                                    <div
                                                        key={effect.name}
                                                        className="dropdown-item submenu-item"
                                                        onClick={() => handleAddEffectDirect(effect.name, 'primary')}
                                                        title={effect.description}
                                                    >
                                                        {effect.displayName}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className="dropdown-item dropdown-submenu-trigger"
                                        onMouseEnter={() => handleSubmenuEnter('secondary')}
                                        onMouseLeave={handleSubmenuLeave}
                                    >
                                        Secondary ▶
                                        {showSubmenu === 'secondary' && (
                                            <div
                                                className="dropdown-submenu"
                                                onMouseEnter={handleSubmenuAreaEnter}
                                                onMouseLeave={handleSubmenuLeave}
                                            >
                                                {availableEffects.secondary.map((effect) => (
                                                    <div
                                                        key={effect.name}
                                                        className="dropdown-item submenu-item"
                                                        onClick={() => handleAddEffectDirect(effect.name, 'secondary')}
                                                        title={effect.description}
                                                    >
                                                        {effect.displayName}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="dropdown-divider"></div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="toolbar-spacer"></div>


            </div>

            <div className="canvas-main">
                <div className="canvas-area">
                    <div
                        ref={frameHolderRef}
                        className="frame-holder"
                        style={{
                            width: `${getResolutionDimensions().w}px`,
                            height: `${getResolutionDimensions().h}px`,
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: 'center',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            transition: isDragging ? 'none' : 'transform 0.1s ease'
                        }}
                        onMouseDown={handleMouseDown}
                        onWheel={handleWheel}
                    >
                        <canvas
                            ref={canvasRef}
                            width={getResolutionDimensions().w}
                            height={getResolutionDimensions().h}
                            className="render-canvas"
                        />
                        {isRendering && (
                            <div className="canvas-overlay">
                                <div className="render-spinner-container">
                                    <div className="render-spinner">
                                        <div className="spinner-circle"></div>
                                        <div className="spinner-timer">{renderTimer}s</div>
                                    </div>
                                    <div className="render-message">Generating frame...</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <EffectsPanel
                    effects={config.effects || []}
                    onEffectDelete={handleEffectDelete}
                    onEffectReorder={handleEffectReorder}
                    onEffectRightClick={handleEffectRightClick}
                    onEffectToggleVisibility={handleEffectToggleVisibility}
                />
            </div>


            {showEffectPicker && (
                <EffectPicker
                    onSelect={handleAddEffect}
                    onClose={() => setShowEffectPicker(false)}
                />
            )}

            {editingEffect !== null && config.effects[editingEffect] && (
                <div className="modal-overlay" onClick={() => setEditingEffect(null)}>
                    <div className="modal-content effect-config-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Configure {config.effects[editingEffect].className}</h3>
                            <button className="close-button" onClick={() => setEditingEffect(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <EffectConfigurer
                                selectedEffect={{
                                    name: config.effects[editingEffect].name,
                                    className: config.effects[editingEffect].className
                                }}
                                initialConfig={config.effects[editingEffect].config || {}}
                                projectData={{
                                    resolution: 'hd',
                                    isHoz: config.isHorizontal,
                                    colorScheme: config.colorScheme
                                }}
                                onConfigChange={(newConfig) => {
                                    const updatedEffect = {
                                        ...config.effects[editingEffect],
                                        config: newConfig
                                    };
                                    handleEffectUpdate(editingEffect, updatedEffect);
                                }}
                                readOnly={false}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setEditingEffect(null)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {contextMenuEffect && (
                <EffectContextMenu
                    position={contextMenuPos}
                    onAddSecondary={handleAddSecondaryEffect}
                    onAddKeyframe={handleAddKeyframeEffect}
                    onEdit={handleEditEffect}
                    onClose={() => setContextMenuEffect(null)}
                />
            )}
        </div>
    );
}