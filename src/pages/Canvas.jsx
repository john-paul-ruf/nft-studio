import React, { useState, useEffect, useRef } from 'react';
import EffectPicker from '../components/EffectPicker.jsx';
import EffectsPanel from '../components/EffectsPanel.jsx';
import EffectConfigurer from '../components/effects/EffectConfigurer.jsx';
import EventBusMonitor from '../components/EventBusMonitor.jsx';
import ColorSchemeService from '../services/ColorSchemeService.js';
import PreferencesService from '../services/PreferencesService.js';
import ProjectState from '../models/ProjectState.js';
import ProjectPersistenceService from '../services/ProjectPersistenceService.js';
import { useInitialResolution } from '../hooks/useInitialResolution.js';

// Canvas components and hooks
import { createAppTheme } from '../components/canvas/theme.js';
import CanvasToolbar from '../components/canvas/CanvasToolbar.jsx';
import CanvasViewport from '../components/canvas/CanvasViewport.jsx';
import useZoomPan from '../components/canvas/useZoomPan.js';
import useEffectManagement from '../components/canvas/useEffectManagement.js';
import useRenderManagement from '../components/canvas/useRenderManagement.js';

// Material-UI imports
import {
    ThemeProvider,
    CssBaseline,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    IconButton,
    Button
} from '@mui/material';
import { Close } from '@mui/icons-material';
import './Canvas.css';

export default function Canvas({ projectData, onUpdateConfig }) {
    console.log('🔍 Canvas received projectData:', projectData);

    // Initialize ProjectState instance with re-render trigger
    const [projectState] = useState(() => {
        if (projectData?.projectConfig) {
            // Legacy support: load from old projectConfig
            return ProjectState.fromLegacyConfig(projectData.projectConfig, onUpdateConfig);
        } else if (projectData?.projectState) {
            // New: load from serialized ProjectState
            return ProjectState.fromObject(projectData.projectState, onUpdateConfig);
        } else if (projectData?.filePath) {
            // Will be loaded async below
            return new ProjectState(null, onUpdateConfig);
        } else {
            // Default empty project
            return new ProjectState(null, onUpdateConfig);
        }
    });

    // Initialize persistence service
    const [persistenceService] = useState(() => {
        if (projectData?.persistenceService) {
            // Use existing persistence service from wizard
            return projectData.persistenceService;
        } else {
            // Create new persistence service
            const service = new ProjectPersistenceService();

            // Set up auto-saving if we have project directory
            const outputDirectory = projectState.getOutputDirectory();
            if (outputDirectory) {
                service.setCurrentProject(projectState, outputDirectory);
            }

            return service;
        }
    });

    // State for triggering re-renders when ProjectState updates
    const [configVersion, setConfigVersion] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSaveStatus, setLastSaveStatus] = useState(null);

    // Update ProjectState's onUpdate callback to trigger re-renders and auto-save
    useEffect(() => {
        const originalOnUpdate = projectState.onUpdate;

        projectState.onUpdate = (newState) => {
            // Call original callback first
            if (originalOnUpdate) {
                originalOnUpdate(newState);
            }

            if (onUpdateConfig) {
                onUpdateConfig(newState);
            }

            // Trigger re-render
            setConfigVersion(prev => prev + 1);

            // Show save status briefly
            setLastSaveStatus('saving');
            setTimeout(() => setLastSaveStatus('saved'), 1000);
            setTimeout(() => setLastSaveStatus(null), 3000);
        };
    }, [projectState, onUpdateConfig]);

    // Load project from file if filePath is provided
    useEffect(() => {
        if (projectData?.filePath && projectData?.loadedFromFile) {
            setIsLoading(true);
            ProjectState.loadFromFile(projectData.filePath, onUpdateConfig)
                .then(loadedProjectState => {
                    // Replace the current projectState with loaded one
                    Object.assign(projectState, loadedProjectState);
                    setConfigVersion(prev => prev + 1);
                    setIsLoading(false);
                })
                .catch(error => {
                    console.error('Failed to load project from file:', error);
                    setIsLoading(false);
                });
        }
    }, [projectData?.filePath, projectData?.loadedFromFile, projectState, onUpdateConfig]);

    const { initialResolution, isLoaded } = useInitialResolution(null); // No longer depend on projectConfig

    // Get current config from projectState
    const config = projectState.getState();

    // State hooks
    const [showEffectPicker, setShowEffectPicker] = useState(false);
    const [selectedFrame, setSelectedFrame] = useState(0);
    const canvasRef = useRef(null);
    const frameHolderRef = useRef(null);

    // Menu anchors
    const [zoomMenuAnchor, setZoomMenuAnchor] = useState(null);
    const [addEffectMenuOpen, setAddEffectMenuOpen] = useState(false);
    const [colorSchemeMenuAnchor, setColorSchemeMenuAnchor] = useState(null);

    // Theme state
    const [themeMode, setThemeMode] = useState('dark');
    const currentTheme = createAppTheme(themeMode);

    // Update config through ProjectState
    const updateConfig = (updates) => {
        projectState.update(updates);
    };

    // Custom hooks
    const {
        zoom,
        pan,
        isDragging,
        handleZoomIn,
        handleZoomOut,
        handleZoomReset,
        handleMouseDown,
        handleWheel
    } = useZoomPan();

    const {
        availableEffects,
        effectsLoaded,
        editingEffect,
        handleAddEffect,
        handleAddEffectDirect,
        handleEffectUpdate,
        handleEffectDelete,
        handleEffectReorder,
        handleEffectToggleVisibility,
        handleEffectRightClick,
        handleEditEffect,
        getEditingEffectData,
        handleSubEffectUpdate,
        handleAddSecondaryEffect,
        handleAddKeyframeEffect,
        setEditingEffect
    } = useEffectManagement(config, updateConfig);

    const getResolutionDimensions = () => {
        return projectState.getResolutionDimensions();
    };

    const {
        renderResult,
        isRendering,
        renderTimer,
        isRenderLoopActive,
        showEventMonitor,
        handleRender,
        handleRenderLoop,
        setShowEventMonitor
    } = useRenderManagement(config, getResolutionDimensions);

    // Update config when initial resolution loads (for empty projects)
    useEffect(() => {
        console.log('🔍 Resolution update effect:', {
            isLoaded,
            hasProjectData: !!projectData,
            initialResolution,
            currentResolution: config.targetResolution,
            shouldUpdate: isLoaded && !projectData && initialResolution !== config.targetResolution
        });

        if (isLoaded && !projectData && initialResolution !== config.targetResolution) {
            console.log('🚀 Updating Canvas with user resolution:', initialResolution);
            projectState.setTargetResolution(initialResolution);
        }
    }, [isLoaded, initialResolution, projectData, config.targetResolution, projectState]);

    // Show loading while project is being loaded or resolution is being determined
    if (isLoading || (!isLoaded && !projectData)) {
        return <div className="canvas-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div>Loading...</div>
        </div>;
    }

    // Render image to canvas
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

    // Close all dropdown menus
    const closeAllDropdowns = () => {
        setColorSchemeMenuAnchor(null);
        setZoomMenuAnchor(null);
        setAddEffectMenuOpen(false);
    };

    const handleColorSchemeChange = (schemeId) => {
        updateConfig({
            colorScheme: schemeId
        });
    };

    const handleAddKeyframeEffectWithFrame = (targetEffect, effectIndex, newKeyframeEffect) => {
        handleAddKeyframeEffect(targetEffect, effectIndex, newKeyframeEffect, selectedFrame);
    };

    const handleMouseDownWithRefs = (e) => {
        handleMouseDown(e, canvasRef, frameHolderRef);
    };

    return (
        <ThemeProvider theme={currentTheme}>
            <CssBaseline />
            <div className="canvas-container">
                <CanvasToolbar
                    config={config}
                    isRendering={isRendering}
                    selectedFrame={selectedFrame}
                    zoom={zoom}
                    themeMode={themeMode}
                    currentTheme={currentTheme}
                    availableEffects={availableEffects}
                    effectsLoaded={effectsLoaded}
                    isRenderLoopActive={isRenderLoopActive}
                    onRender={() => handleRender(selectedFrame)}
                    onRenderLoop={() => handleRenderLoop(selectedFrame)}
                    onResolutionChange={handleResolutionChange}
                    onOrientationToggle={handleOrientationToggle}
                    onFramesChange={handleFramesChange}
                    onFrameChange={setSelectedFrame}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onZoomReset={handleZoomReset}
                    onColorSchemeChange={handleColorSchemeChange}
                    onAddEffectDirect={handleAddEffectDirect}
                    onThemeToggle={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                    lastSaveStatus={lastSaveStatus}
                    currentProjectPath={persistenceService?.getCurrentProjectPath()}
                    onForceSave={() => persistenceService?.forceSave()}
                    closeAllDropdowns={closeAllDropdowns}
                    zoomMenuAnchor={zoomMenuAnchor}
                    setZoomMenuAnchor={setZoomMenuAnchor}
                    colorSchemeMenuAnchor={colorSchemeMenuAnchor}
                    setColorSchemeMenuAnchor={setColorSchemeMenuAnchor}
                    addEffectMenuOpen={addEffectMenuOpen}
                    setAddEffectMenuOpen={setAddEffectMenuOpen}
                />

                <div className="canvas-main">
                    <CanvasViewport
                        ref={{ canvasRef, frameHolderRef }}
                        dimensions={getResolutionDimensions()}
                        zoom={zoom}
                        pan={pan}
                        isDragging={isDragging}
                        isRendering={isRendering}
                        renderTimer={renderTimer}
                        onMouseDown={handleMouseDownWithRefs}
                        onWheel={handleWheel}
                        currentTheme={currentTheme}
                    />

                    <EffectsPanel
                        effects={config.effects || []}
                        onEffectDelete={handleEffectDelete}
                        onEffectReorder={handleEffectReorder}
                        onEffectRightClick={handleEffectRightClick}
                        onEffectToggleVisibility={handleEffectToggleVisibility}
                        onEffectEdit={handleEditEffect}
                        onEffectAddSecondary={handleAddSecondaryEffect}
                        onEffectAddKeyframe={handleAddKeyframeEffectWithFrame}
                    />
                </div>

                {showEffectPicker && (
                    <EffectPicker
                        onSelect={handleAddEffect}
                        onClose={() => setShowEffectPicker(false)}
                    />
                )}

                <Dialog
                    open={editingEffect !== null && getEditingEffectData() !== null}
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
                            Configure {(() => {
                                const effectData = getEditingEffectData();
                                return effectData ? effectData.className : '';
                            })()}
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
                            {(() => {
                                const effectData = getEditingEffectData();
                                return effectData && (
                                    <EffectConfigurer
                                        selectedEffect={{
                                            name: effectData.name || effectData.className,
                                            className: effectData.className
                                        }}
                                        initialConfig={effectData.config || {}}
                                        projectData={{
                                            resolution: 'hd',
                                            isHoz: config.isHorizontal,
                                            colorScheme: config.colorScheme
                                        }}
                                        onConfigChange={handleSubEffectUpdate}
                                        readOnly={false}
                                        useWideLayout={true}
                                    />
                                );
                            })()}
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

            </div>

            {/* Event Bus Monitor Modal */}
            <EventBusMonitor
                open={showEventMonitor}
                onClose={() => setShowEventMonitor(false)}
            />

        </ThemeProvider>
    );
}