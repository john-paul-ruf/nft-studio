import React, { useState, useEffect, useRef } from 'react';
import EffectPicker from '../components/EffectPicker';
import EffectsPanel from '../components/EffectsPanel';
import EffectConfigurer from '../components/effects/EffectConfigurer';
import EffectContextMenu from '../components/EffectContextMenu';
import ColorSchemeDropdown from '../components/ColorSchemeDropdown';
import ColorSchemeService from '../services/ColorSchemeService';
import PreferencesService from '../services/PreferencesService';
import './Canvas.css';

export default function Canvas({ projectConfig, onUpdateConfig }) {
    const [config, setConfig] = useState(projectConfig || {
        targetResolution: 512,
        isHorizontal: false,
        numFrames: 100,
        effects: [],
        colorScheme: null // Will be set by useEffect
    });
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

    const handleResolutionChange = (e) => {
        const baseResolution = parseInt(e.target.value);
        updateConfig({ targetResolution: baseResolution });
    };

    const getResolutionDimensions = () => {
        const base = config.targetResolution;
        const resolutionMap = {
            640: { w: 640, h: 480 },
            854: { w: 854, h: 480 },
            1280: { w: 1280, h: 720 },
            1920: { w: 1920, h: 1080 },
            2560: { w: 2560, h: 1440 },
            3840: { w: 3840, h: 2160 },
            7680: { w: 7680, h: 4320 }
        };

        const dims = resolutionMap[base] || { w: 1920, h: 1080 };
        return config.isHorizontal ? dims : { w: dims.h, h: dims.w };
    };

    const handleOrientationToggle = () => {
        updateConfig({ isHorizontal: !config.isHorizontal });
    };

    const handleFramesChange = (e) => {
        const frames = parseInt(e.target.value);
        updateConfig({ numFrames: frames });
        if (selectedFrame >= frames) {
            setSelectedFrame(frames - 1);
        }
    };

    const handleColorSchemeChange = (schemeId) => {
        updateConfig({
            colorScheme: schemeId
        });
    };

    const handleAddEffect = (effect) => {
        const newEffects = [...(config.effects || []), effect];
        updateConfig({ effects: newEffects });
        setShowEffectPicker(false);
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

            const renderConfig = {
                ...config,
                width: dimensions.w,
                height: dimensions.h,
                renderStartFrame: selectedFrame,
                renderJumpFrames: config.numFrames + 1,
                colorSchemeData: colorSchemeData
            };

            console.log('📋 Render config:', {
                width: dimensions.w,
                height: dimensions.h,
                frame: selectedFrame,
                effects: config.effects?.length || 0,
                colorScheme: config.colorScheme,
                hasColorSchemeData: !!colorSchemeData
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
                <div className="toolbar-group">
                    <label className="toolbar-label">Resolution</label>
                    <select
                        className="toolbar-select"
                        value={config.targetResolution}
                        onChange={handleResolutionChange}
                    >
                        <option value="640">640x480 (VGA)</option>
                        <option value="854">854x480 (FWVGA)</option>
                        <option value="1280">1280x720 (HD)</option>
                        <option value="1920">1920x1080 (Full HD)</option>
                        <option value="2560">2560x1440 (QHD)</option>
                        <option value="3840">3840x2160 (4K UHD)</option>
                        <option value="7680">7680x4320 (8K UHD)</option>
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

                <div className="color-scheme-group">
                    <ColorSchemeDropdown
                        value={config.colorScheme || 'neon-cyberpunk'}
                        onChange={handleColorSchemeChange}
                        projectData={{
                            resolution: 'hd',
                            isHoz: config.isHorizontal
                        }}
                        showPreview={true}
                    />
                </div>

                <div className="toolbar-group">
                    <button
                        className="toolbar-button add-effect"
                        onClick={() => setShowEffectPicker(true)}
                    >
                        + Add Effect
                    </button>
                </div>

                <div className="toolbar-spacer"></div>

                <div className="toolbar-group">
                    <button
                        className="toolbar-button render"
                        onClick={handleRender}
                        disabled={isRendering}
                    >
                        {isRendering ? 'Rendering...' : 'Render'}
                    </button>
                </div>
            </div>

            <div className="canvas-main">
                <div className="canvas-area">
                    <canvas
                        ref={canvasRef}
                        width={config.targetResolution}
                        height={config.targetResolution}
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

                <EffectsPanel
                    effects={config.effects || []}
                    onEffectDelete={handleEffectDelete}
                    onEffectReorder={handleEffectReorder}
                    onEffectRightClick={handleEffectRightClick}
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
                                    name: config.effects[editingEffect].className,
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