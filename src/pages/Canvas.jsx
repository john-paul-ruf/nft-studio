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

// Material-UI imports
import {
    ThemeProvider,
    createTheme,
    CssBaseline,
    Button,
    ButtonGroup,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Menu,
    ListItemIcon,
    ListItemText,
    Divider,
    Chip,
    Box,
    Typography,
    Slider,
    IconButton,
    Tooltip,
    Toolbar,
    AppBar,
    TextField,
    ToggleButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Grid
} from '@mui/material';
import {
    PlayArrow,
    ZoomIn,
    ZoomOut,
    Add,
    Palette,
    Settings,
    Visibility,
    VisibilityOff,
    Delete,
    Edit,
    LightMode,
    DarkMode,
    Brightness4,
    KeyboardArrowDown,
    SwapHoriz,
    SwapVert,
    Search,
    Close
} from '@mui/icons-material';
import './Canvas.css';

// Create theme factory function
const createAppTheme = (mode) => createTheme({
    palette: {
        mode,
        primary: {
            main: '#4a90e2',
        },
        secondary: {
            main: '#ff8c00',
        },
        background: {
            default: mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
            paper: mode === 'dark' ? '#323232' : '#ffffff',
        },
        text: {
            primary: mode === 'dark' ? '#fff' : '#333',
            secondary: mode === 'dark' ? '#888' : '#666',
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 4,
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    fontSize: '13px',
                },
            },
        },
        MuiToolbar: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark' ? '#323232' : '#ffffff',
                    borderBottom: `1px solid ${mode === 'dark' ? '#444' : '#e0e0e0'}`,
                },
            },
        },
    },
});

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

    // Effects state
    const [availableEffects, setAvailableEffects] = useState({
        primary: [],
        secondary: [],
        finalImage: []
    });
    const [effectsLoaded, setEffectsLoaded] = useState(false);
    const [showSubmenu, setShowSubmenu] = useState(null); // 'primary' or 'finalImage'
    const [submenuTimeout, setSubmenuTimeout] = useState(null);

    // MUI Menu anchor elements
    const [renderMenuAnchor, setRenderMenuAnchor] = useState(null);
    const [zoomMenuAnchor, setZoomMenuAnchor] = useState(null);
    const [addEffectMenuAnchor, setAddEffectMenuAnchor] = useState(null);
    const [primaryEffectsAnchor, setPrimaryEffectsAnchor] = useState(null);
    const [finalImageEffectsAnchor, setFinalImageEffectsAnchor] = useState(null);
    const [colorSchemeMenuAnchor, setColorSchemeMenuAnchor] = useState(null);

    // Theme state
    const [themeMode, setThemeMode] = useState('dark');
    const currentTheme = createAppTheme(themeMode);

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
        setShowSubmenu(null);
        setColorSchemeMenuAnchor(null);
        setRenderMenuAnchor(null);
        setZoomMenuAnchor(null);
        setAddEffectMenuAnchor(null);
        setPrimaryEffectsAnchor(null);
        setFinalImageEffectsAnchor(null);
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
            console.log('🎭 Available effects result:', result);
            if (result.success) {
                console.log('🎭 Effects breakdown:', {
                    primary: result.effects.primary?.length || 0,
                    secondary: result.effects.secondary?.length || 0,
                    finalImage: result.effects.finalImage?.length || 0,
                    allKeys: Object.keys(result.effects || {})
                });
                setAvailableEffects({
                    primary: result.effects.primary || [],
                    secondary: result.effects.secondary || [],
                    finalImage: result.effects.finalImage || []
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
                isHorizontal: !config.isHorizontal,  // Invert for backend which interprets it opposite
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
        <ThemeProvider theme={currentTheme}>
            <CssBaseline />
            <div className="canvas-container">
            <AppBar position="static" elevation={0}>
                <Toolbar
                    sx={{
                        backgroundColor: 'background.paper',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        color: 'text.primary',
                        gap: 2,
                        minHeight: '60px !important'
                    }}
                >
                <Box className="toolbar-group">
                    <Button
                        variant="contained"
                        startIcon={<PlayArrow />}
                        onClick={(event) => {
                            closeAllDropdowns();
                            setRenderMenuAnchor(event.currentTarget);
                        }}
                        disabled={isRendering}
                        size="small"
                        sx={{
                            minWidth: '120px',
                            backgroundColor: 'primary.main',
                            '&:hover': {
                                backgroundColor: 'primary.dark',
                            }
                        }}
                    >
                        {isRendering ? 'Rendering...' : 'Render'}
                    </Button>
                    <Menu
                        anchorEl={renderMenuAnchor}
                        open={Boolean(renderMenuAnchor)}
                        onClose={() => setRenderMenuAnchor(null)}
                        PaperProps={{
                            sx: {
                                backgroundColor: 'background.paper',
                                border: '1px solid #444',
                            }
                        }}
                    >
                        <MenuItem
                            onClick={() => {
                                handleRender();
                                setRenderMenuAnchor(null);
                            }}
                        >
                            <ListItemIcon>
                                <PlayArrow fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Render Frame</ListItemText>
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                handleRenderLoop();
                                setRenderMenuAnchor(null);
                            }}
                        >
                            <ListItemIcon>
                                <PlayArrow fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Render Loop</ListItemText>
                        </MenuItem>
                    </Menu>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 2, backgroundColor: 'divider' }} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                            value={config.targetResolution}
                            onChange={handleResolutionChange}
                            displayEmpty
                            variant="outlined"
                            sx={{ fontSize: '13px' }}
                        >
                            {Object.entries(ResolutionMapper.getAllResolutions()).map(([width, resolution]) => (
                                <MenuItem key={width} value={width}>
                                    {ResolutionMapper.getDisplayName(parseInt(width))}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <ToggleButton
                    value="orientation"
                    selected={!config.isHorizontal}
                    onChange={handleOrientationToggle}
                    size="small"
                    sx={{
                        borderRadius: 1,
                        minWidth: '40px',
                        height: '32px'
                    }}
                    title={!config.isHorizontal ? 'Switch to Vertical' : 'Switch to Horizontal'}
                >
                    {!config.isHorizontal ? <SwapHoriz /> : <SwapVert />}
                </ToggleButton>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: '50px' }}>
                        Frames
                    </Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={config.numFrames}
                        onChange={handleFramesChange}
                        inputProps={{ min: 1, max: 10000 }}
                        sx={{ width: '80px' }}
                        variant="outlined"
                    />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: '40px' }}>
                        Frame
                    </Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={selectedFrame}
                        onChange={(e) => setSelectedFrame(parseInt(e.target.value))}
                        inputProps={{ min: 0, max: config.numFrames - 1 }}
                        sx={{ width: '80px' }}
                        variant="outlined"
                    />
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 2, backgroundColor: 'divider' }} />

                <Box sx={{ position: 'relative' }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Search />}
                        onClick={(event) => {
                            closeAllDropdowns();
                            setZoomMenuAnchor(event.currentTarget);
                        }}
                        endIcon={<KeyboardArrowDown />}
                        sx={{ minWidth: '110px' }}
                        title="Zoom actions"
                    >
                        {Math.round(zoom * 100)}%
                    </Button>
                    <Menu
                        anchorEl={zoomMenuAnchor}
                        open={Boolean(zoomMenuAnchor)}
                        onClose={() => setZoomMenuAnchor(null)}
                        PaperProps={{
                            sx: {
                                backgroundColor: 'background.paper',
                                border: '1px solid #444',
                            }
                        }}
                    >
                        <MenuItem onClick={() => { handleZoomIn(); setZoomMenuAnchor(null); }}>
                            <ListItemIcon>
                                <ZoomIn fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Zoom In</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { handleZoomOut(); setZoomMenuAnchor(null); }}>
                            <ListItemIcon>
                                <ZoomOut fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Zoom Out</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { handleZoomReset(); setZoomMenuAnchor(null); }}>
                            <ListItemIcon>
                                <Settings fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Reset</ListItemText>
                        </MenuItem>
                    </Menu>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 2, backgroundColor: 'divider' }} />

                <Box sx={{ position: 'relative' }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Palette />}
                        onClick={(event) => {
                            closeAllDropdowns();
                            setColorSchemeMenuAnchor(event.currentTarget);
                        }}
                        endIcon={<KeyboardArrowDown />}
                        sx={{ minWidth: '140px' }}
                        title="Select color scheme"
                    >
                        Color Scheme
                    </Button>
                    <Menu
                        anchorEl={colorSchemeMenuAnchor}
                        open={Boolean(colorSchemeMenuAnchor)}
                        onClose={() => setColorSchemeMenuAnchor(null)}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        sx={{
                            '& .MuiPaper-root': {
                                minWidth: '600px',
                                maxWidth: '700px',
                                maxHeight: '400px',
                                overflow: 'auto',
                                mt: 1
                            }
                        }}
                    >
                        <Box sx={{ p: 0 }}>
                            <ColorSchemeDropdown
                                value={config.colorScheme || 'neon-cyberpunk'}
                                onChange={(schemeId) => {
                                    handleColorSchemeChange(schemeId);
                                    setColorSchemeMenuAnchor(null);
                                }}
                                projectData={{
                                    resolution: 'hd',
                                    isHoz: config.isHorizontal
                                }}
                                showPreview={true}
                                isInDropdown={true}
                            />
                        </Box>
                    </Menu>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 2, backgroundColor: 'divider' }} />

                <Box sx={{ position: 'relative' }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Add />}
                        onClick={(event) => {
                            closeAllDropdowns();
                            setAddEffectMenuAnchor(event.currentTarget);
                        }}
                        endIcon={<KeyboardArrowDown />}
                        sx={{ minWidth: '120px' }}
                        title="Add effect options"
                    >
                        Add Effect
                    </Button>
                    <Menu
                        anchorEl={addEffectMenuAnchor}
                        open={Boolean(addEffectMenuAnchor)}
                        onClose={() => {
                            setAddEffectMenuAnchor(null);
                            setPrimaryEffectsAnchor(null);
                            setFinalImageEffectsAnchor(null);
                        }}
                        MenuListProps={{
                            onMouseLeave: () => {
                                // Only close submenus if we're leaving the entire menu area
                                setTimeout(() => {
                                    if (!primaryEffectsAnchor && !finalImageEffectsAnchor) {
                                        setPrimaryEffectsAnchor(null);
                                        setFinalImageEffectsAnchor(null);
                                    }
                                }, 100);
                            }
                        }}
                        PaperProps={{
                            sx: {
                                backgroundColor: 'background.paper',
                                border: '1px solid #444',
                                minWidth: '200px'
                            }
                        }}
                    >
                        {!effectsLoaded ? (
                            <MenuItem disabled>
                                <ListItemText>Loading effects...</ListItemText>
                            </MenuItem>
                        ) : (
                            <>
                                <MenuItem
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        if (primaryEffectsAnchor) {
                                            setPrimaryEffectsAnchor(null);
                                        } else {
                                            setPrimaryEffectsAnchor(event.currentTarget);
                                            setFinalImageEffectsAnchor(null);
                                        }
                                    }}
                                    onMouseEnter={(event) => {
                                        setPrimaryEffectsAnchor(event.currentTarget);
                                        setFinalImageEffectsAnchor(null);
                                    }}
                                    sx={{
                                        justifyContent: 'space-between',
                                        pr: 1,
                                        backgroundColor: primaryEffectsAnchor ? 'action.selected' : 'transparent'
                                    }}
                                >
                                    <ListItemText>Primary Effects</ListItemText>
                                    <Typography variant="body2" sx={{ ml: 3 }}>▶</Typography>
                                </MenuItem>
                                <MenuItem
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        if (finalImageEffectsAnchor) {
                                            setFinalImageEffectsAnchor(null);
                                        } else {
                                            setFinalImageEffectsAnchor(event.currentTarget);
                                            setPrimaryEffectsAnchor(null);
                                        }
                                    }}
                                    onMouseEnter={(event) => {
                                        setFinalImageEffectsAnchor(event.currentTarget);
                                        setPrimaryEffectsAnchor(null);
                                    }}
                                    sx={{
                                        justifyContent: 'space-between',
                                        pr: 1,
                                        backgroundColor: finalImageEffectsAnchor ? 'action.selected' : 'transparent'
                                    }}
                                >
                                    <ListItemText>Final Effects</ListItemText>
                                    <Typography variant="body2" sx={{ ml: 3 }}>▶</Typography>
                                </MenuItem>
                            </>
                        )}
                    </Menu>

                    {/* Primary Effects Submenu */}
                    <Menu
                        anchorEl={primaryEffectsAnchor}
                        open={Boolean(primaryEffectsAnchor)}
                        onClose={(event, reason) => {
                            if (reason !== 'backdropClick') {
                                setPrimaryEffectsAnchor(null);
                            }
                        }}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        MenuListProps={{
                            onMouseEnter: () => {
                                // Keep submenu open when mouse enters
                            },
                            onMouseLeave: () => {
                                // Close submenu when mouse leaves
                                setTimeout(() => {
                                    setPrimaryEffectsAnchor(null);
                                }, 300);
                            }
                        }}
                        slotProps={{
                            paper: {
                                sx: {
                                    backgroundColor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    minWidth: '240px',
                                    maxHeight: '80vh',
                                    ml: 0.5,
                                    overflowY: 'auto',
                                    '&::-webkit-scrollbar': {
                                        width: '8px',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        backgroundColor: 'transparent',
                                    }
                                }
                            }
                        }}
                    >
                        {availableEffects.primary.map((effect) => (
                            <MenuItem
                                key={effect.name}
                                onClick={() => {
                                    handleAddEffectDirect(effect.name, 'primary');
                                    setPrimaryEffectsAnchor(null);
                                    setAddEffectMenuAnchor(null);
                                }}
                                title={effect.description}
                                sx={{
                                    fontSize: '0.875rem',
                                    py: 0.75,
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    }
                                }}
                            >
                                <ListItemText primary={effect.displayName} />
                            </MenuItem>
                        ))}
                    </Menu>

                    {/* Final Effects Submenu */}
                    <Menu
                        anchorEl={finalImageEffectsAnchor}
                        open={Boolean(finalImageEffectsAnchor)}
                        onClose={(event, reason) => {
                            if (reason !== 'backdropClick') {
                                setFinalImageEffectsAnchor(null);
                            }
                        }}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        MenuListProps={{
                            onMouseEnter: () => {
                                // Keep submenu open when mouse enters
                            },
                            onMouseLeave: () => {
                                // Close submenu when mouse leaves
                                setTimeout(() => {
                                    setFinalImageEffectsAnchor(null);
                                }, 300);
                            }
                        }}
                        slotProps={{
                            paper: {
                                sx: {
                                    backgroundColor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    minWidth: '240px',
                                    maxHeight: '80vh',
                                    ml: 0.5,
                                    overflowY: 'auto',
                                    '&::-webkit-scrollbar': {
                                        width: '8px',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        backgroundColor: 'transparent',
                                    }
                                }
                            }
                        }}
                    >
                        {availableEffects.finalImage.map((effect) => (
                            <MenuItem
                                key={effect.name}
                                onClick={() => {
                                    handleAddEffectDirect(effect.name, 'finalImage');
                                    setFinalImageEffectsAnchor(null);
                                    setAddEffectMenuAnchor(null);
                                }}
                                title={effect.description}
                                sx={{
                                    fontSize: '0.875rem',
                                    py: 0.75,
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    }
                                }}
                            >
                                <ListItemText primary={effect.displayName} />
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 2, backgroundColor: 'divider' }} />

                <Box sx={{ flexGrow: 1 }} />

                {/* Theme Toggle */}
                <Box className="toolbar-group">
                    <Tooltip title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} theme`}>
                        <IconButton
                            onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                            color="inherit"
                            size="small"
                            sx={{
                                borderRadius: 1,
                                padding: '8px',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                }
                            }}
                        >
                            {themeMode === 'dark' ? <LightMode /> : <DarkMode />}
                        </IconButton>
                    </Tooltip>
                </Box>

                </Toolbar>
            </AppBar>

            <div className="canvas-main">
                <div
                    className="canvas-area"
                    style={{
                        backgroundColor: currentTheme.palette.background.default,
                        color: currentTheme.palette.text.primary,
                    }}
                >
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

            <Dialog
                open={editingEffect !== null && !!config.effects[editingEffect]}
                onClose={() => setEditingEffect(null)}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: {
                        width: '90vw',
                        maxWidth: '1400px',
                        height: '80vh',
                        backgroundColor: 'background.paper',
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'background.paper',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="h6" component="div">
                        Configure {editingEffect !== null && config.effects[editingEffect]
                            ? config.effects[editingEffect].className
                            : ''}
                    </Typography>
                    <IconButton
                        onClick={() => setEditingEffect(null)}
                        size="small"
                        sx={{ color: 'text.secondary' }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent
                    sx={{
                        padding: 3,
                        backgroundColor: 'background.default',
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: 'rgba(0,0,0,0.1)',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRadius: '4px',
                        },
                    }}
                >
                    <Box sx={{ width: '100%', height: '100%' }}>
                        {editingEffect !== null && config.effects[editingEffect] && (
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
                                useWideLayout={true}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions
                    sx={{
                        padding: 2,
                        backgroundColor: 'background.paper',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Button
                        onClick={() => setEditingEffect(null)}
                        variant="contained"
                        color="primary"
                    >
                        Done
                    </Button>
                </DialogActions>
            </Dialog>

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
        </ThemeProvider>
    );
}