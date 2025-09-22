import React, { useState, useEffect, useRef, useCallback } from 'react';
import EffectPicker from '../components/EffectPicker.jsx';
import EventDrivenEffectsPanel from '../components/EventDrivenEffectsPanel.jsx';
import EffectConfigurer from '../components/effects/EffectConfigurer.jsx';
import EventBusMonitor from '../components/EventBusMonitor.jsx';

// Canvas components and hooks
import { createAppTheme, appThemes } from '../components/canvas/theme.js';
import CanvasToolbar from '../components/canvas/CanvasToolbar.jsx';
import CanvasViewport from '../components/canvas/CanvasViewport.jsx';
import useZoomPan from '../components/canvas/useZoomPan.js';
import useEffectManagement from '../components/canvas/useEffectManagement.js';

// New clean hooks
import useRenderPipeline from '../hooks/useRenderPipeline.js';
import { useServices } from '../contexts/ServiceContext.js';
import PreferencesService from '../services/PreferencesService.js';
import ResolutionMapper from '../utils/ResolutionMapper.js';

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

// Event-driven components
import EventDrivenToolbarActions from '../components/EventDrivenToolbarActions.jsx';
import EventDrivenCanvasToolbar from '../components/EventDrivenCanvasToolbar.jsx';

/**
 * Clean Canvas Component - Pure Event-Driven View Layer
 * Zero callback props - all communication via EventBus
 * Perfect single source of truth architecture
 */
export default function Canvas({ projectStateManager, projectData, onUpdateConfig }) {
    console.log('🎨 CANVAS MOUNT: Starting clean Canvas component');
    console.log('🎨 CANVAS MOUNT: Props received:', { projectStateManager, projectData, onUpdateConfig });

    // Services
    const { renderPipelineService, eventBusService } = useServices();

    // State management through services only
    const [projectState, setProjectState] = useState(() => projectStateManager.getProjectState());
    const [updateCounter, setUpdateCounter] = useState(0); // Force re-renders
    const config = projectState ? projectState.getState() : {};

    // Debug config changes
    console.log('🎨 Canvas: Component render - config.effects:', config.effects?.length || 0, config.effects?.map(e => e.name || e.className) || []);
    console.log('🎨 Canvas: Update counter:', updateCounter);

    // Update when ProjectState changes
    useEffect(() => {
        const unsubscribe = projectStateManager.onUpdate((updatedState) => {
            console.log('🎨 Canvas: ProjectState updated via service');
            console.log('🎨 Canvas: Updated state effects count:', updatedState?.effects?.length || 0);
            console.log('🎨 Canvas: Updated state effects:', updatedState?.effects?.map(e => e.name || e.className) || []);

            const newProjectState = projectStateManager.getProjectState();
            console.log('🎨 Canvas: Getting fresh ProjectState from manager');
            console.log('🎨 Canvas: Fresh ProjectState effects count:', newProjectState?.getState()?.effects?.length || 0);

            setProjectState(newProjectState);
            setUpdateCounter(prev => prev + 1); // Force re-render
            console.log('🎨 Canvas: Forced re-render with counter increment');

            if (onUpdateConfig) onUpdateConfig(updatedState);
        });
        return unsubscribe;
    }, [projectStateManager, onUpdateConfig]);

    // Load theme preference on mount
    useEffect(() => {
        PreferencesService.getSelectedTheme().then(theme => {
            console.log('🎨 Canvas: Loading saved theme preference:', theme);
            setCurrentThemeKey(theme);
        }).catch(error => {
            console.warn('🎨 Canvas: Failed to load theme preference, using default:', error);
        });
    }, []);

    // Resolution tracking no longer needed - ProjectState handles everything

    // No longer need scaling callback - ProjectState handles scaling automatically
    // when setTargetResolution() or setIsHorizontal() are called

    // Render pipeline (automatic rendering, no manual triggers)
    const { renderResult, isRendering, renderError, renderTimer, triggerRender } = useRenderPipeline();

    // UI state only
    const [selectedFrame, setSelectedFrame] = useState(0);
    const [showEffectPicker, setShowEffectPicker] = useState(false);
    const [currentThemeKey, setCurrentThemeKey] = useState('dark');
    const [isRenderLoopActive, setIsRenderLoopActive] = useState(false);
    const [showEventMonitor, setShowEventMonitor] = useState(false);

    // UI refs
    const canvasRef = useRef(null);
    const frameHolderRef = useRef(null);

    // Theme
    const currentTheme = createAppTheme(currentThemeKey);
    const themeMode = appThemes[currentThemeKey]?.palette.mode || 'dark';

    // Canvas tools
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

    // Effect management (delegates to services)
    const {
        availableEffects,
        effectsLoaded,
        editingEffect,
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
        contextMenuEffect,
        contextMenuPos,
        setEditingEffect
    } = useEffectManagement(projectState);

    // SINGLE SOURCE: Get dimensions directly from ProjectState
    const getResolutionDimensions = useCallback(() => {
        if (!projectState) {
            console.warn('Canvas: No ProjectState available, using fallback');
            return { w: 1920, h: 1080 };
        }

        const dimensions = projectState.getResolutionDimensions();
        console.log('📐 Canvas: Using ProjectState dimensions:', dimensions);
        return dimensions;
    }, [projectState]);

    // User action handlers (delegate to services, don't manage state)
    const handleResolutionChange = useCallback((newResolution) => {
        console.log('🎨 Canvas: User changed resolution to:', newResolution);
        if (projectState) {
            // SINGLE SOURCE OF TRUTH: Only update ProjectState - it will handle auto-scaling
            projectState.setTargetResolution(newResolution);
            console.log('✅ Canvas: ProjectState updated with new resolution and auto-scaled');
        }
    }, [projectState]);

    const handleOrientationToggle = useCallback(() => {
        console.log('🎨 Canvas: User toggled orientation');
        if (projectState) {
            const currentConfig = projectState.getState();
            const newOrientation = !currentConfig.isHorizontal;

            // SINGLE SOURCE OF TRUTH: Only update ProjectState - it will handle auto-scaling
            projectState.setIsHorizontal(newOrientation);
            console.log('✅ Canvas: ProjectState updated with new orientation and auto-scaled');
        }
    }, [projectState]);

    const handleFramesChange = useCallback((newFrameCount) => {
        console.log('🎨 Canvas: User changed frame count to:', newFrameCount);
        if (projectState) {
            projectState.update({ numFrames: newFrameCount });
        }
    }, [projectState]);

    // NOTE: Render loop management is now fully event-driven via EventDrivenToolbarActions
    // The old handleRenderLoop callback has been removed in favor of event listeners below

    // Manual render trigger (user button click)
    const handleManualRender = useCallback(() => {
        console.log('🎨 Canvas: User triggered manual render');
        triggerRender(selectedFrame);
    }, [triggerRender, selectedFrame]);

    // Wrapper for mouse down with refs
    const handleCanvasMouseDown = useCallback((e) => {
        handleMouseDown(e, canvasRef, frameHolderRef);
    }, [handleMouseDown, canvasRef, frameHolderRef]);

    // Event listeners for UI state updates
    useEffect(() => {
        console.log('🎨 Canvas: Setting up UI event listeners');

        // Theme change events
        const unsubscribeTheme = eventBusService.subscribe('theme:changed', (payload) => {
            console.log('🎨 Canvas: Theme change event received:', payload);
            setCurrentThemeKey(payload.themeKey);
        }, { component: 'Canvas' });

        // Frame selection events
        const unsubscribeFrame = eventBusService.subscribe('frame:selected', (payload) => {
            console.log('🎨 Canvas: Frame selection event received:', payload);
            setSelectedFrame(payload.frameIndex);
        }, { component: 'Canvas' });

        // Resolution and orientation events - trigger re-render
        const unsubscribeResolution = eventBusService.subscribe('resolution:changed', (payload) => {
            console.log('🎨 Canvas: Resolution change event received:', payload);
            // The getResolutionDimensions function will automatically pick up the change
            // from config when the component re-renders due to ProjectState update
        }, { component: 'Canvas' });

        const unsubscribeOrientation = eventBusService.subscribe('orientation:changed', (payload) => {
            console.log('🎨 Canvas: Orientation change event received:', payload);
            // The getResolutionDimensions function will automatically pick up the change
            // from config when the component re-renders due to ProjectState update
        }, { component: 'Canvas' });

        // Render loop events - make modal truly event-driven
        const unsubscribeRenderLoopToggle = eventBusService.subscribe('renderloop:toggled', (payload) => {
            console.log('🎨 Canvas: Render loop toggle event received:', payload);
            setIsRenderLoopActive(payload.isActive);
            setShowEventMonitor(payload.isActive);
            console.log('🎨 Canvas: Updated render loop state and modal visibility:', {
                isActive: payload.isActive,
                showModal: payload.isActive
            });
        }, { component: 'Canvas' });

        const unsubscribeRenderLoopError = eventBusService.subscribe('renderloop:error', (payload) => {
            console.log('🎨 Canvas: Render loop error event received:', payload);
            // On error, ensure render loop is marked as inactive and modal is hidden
            setIsRenderLoopActive(false);
            setShowEventMonitor(false);
            console.log('🎨 Canvas: Render loop error - reset states to inactive');
        }, { component: 'Canvas' });

        return () => {
            console.log('🎨 Canvas: Cleaning up UI event listeners');
            unsubscribeTheme();
            unsubscribeFrame();
            unsubscribeResolution();
            unsubscribeOrientation();
            unsubscribeRenderLoopToggle();
            unsubscribeRenderLoopError();
        };
    }, [eventBusService]);

    // Load project from file (delegate to services)
    useEffect(() => {
        if (projectData?.filePath && projectData?.loadedFromFile) {
            console.log('🎨 Canvas: Loading project from file via services');
            // Services handle file loading automatically
        }
    }, [projectData?.filePath, projectData?.loadedFromFile]);

    return (
        <ThemeProvider theme={currentTheme}>
            <CssBaseline />

            {/* Event-driven action handler - no UI, pure event listening */}
            <EventDrivenToolbarActions projectState={projectState} />

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                background: themeMode === 'dark' ? '#121212' : '#f5f5f5'
            }}>
                {/* Event-Driven Toolbar - ZERO callback props! */}
                <EventDrivenCanvasToolbar
                    config={config}
                    projectState={projectState}
                    selectedFrame={selectedFrame}
                    isRenderLoopActive={isRenderLoopActive}
                    zoom={zoom}
                    currentTheme={currentTheme}
                    getResolutionDimensions={getResolutionDimensions}
                    isRendering={isRendering}
                />

                {/* Main content area */}
                <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Effects panel */}
                    <EventDrivenEffectsPanel
                        effects={projectState ? projectState.getState().effects || [] : []}
                        availableEffects={availableEffects}
                        effectsLoaded={effectsLoaded}
                        currentTheme={currentTheme}
                        projectState={projectState}
                    />

                    {/* Canvas viewport */}
                    <CanvasViewport
                        dimensions={getResolutionDimensions()}
                        zoom={zoom}
                        pan={pan}
                        isDragging={isDragging}
                        isRendering={isRendering}
                        renderTimer={renderTimer}
                        renderResult={renderResult}
                        onMouseDown={handleCanvasMouseDown}
                        onWheel={handleWheel}
                        currentTheme={currentTheme}
                        ref={{ canvasRef, frameHolderRef }}
                    />
                </Box>

                {/* Effect Picker Dialog */}
                <Dialog
                    open={showEffectPicker}
                    onClose={() => setShowEffectPicker(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        Add Effect
                        <IconButton
                            onClick={() => setShowEffectPicker(false)}
                            sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <EffectPicker
                            availableEffects={availableEffects}
                            onAddEffect={(effect) => {
                                handleAddEffectDirect(effect.name, effect.type);
                                setShowEffectPicker(false);
                            }}
                        />
                    </DialogContent>
                </Dialog>

                {/* Effect Configurer Dialog */}
                <Dialog
                    open={!!editingEffect}
                    onClose={() => setEditingEffect(null)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        Configure Effect
                        <IconButton
                            onClick={() => setEditingEffect(null)}
                            sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        {editingEffect && (() => {
                            console.log('🎨 CANVAS: Rendering EffectConfigurer with editingEffect:', {
                                editingEffect: editingEffect,
                                effectIndex: editingEffect.effectIndex,
                                effectType: editingEffect.effectType,
                                subIndex: editingEffect.subIndex
                            });

                            const editingEffectData = getEditingEffectData();

                            console.log('🎨 CANVAS: getEditingEffectData returned:', {
                                editingEffectData: editingEffectData,
                                hasData: !!editingEffectData,
                                registryKey: editingEffectData?.registryKey,
                                name: editingEffectData?.name,
                                config: editingEffectData?.config
                            });

                            // CRITICAL: Don't render EffectConfigurer if effect data is invalid
                            if (!editingEffectData) {
                                console.error('❌ CANVAS: Cannot render EffectConfigurer - editingEffectData is null');
                                console.error('❌ CANVAS: Debug info:', {
                                    editingEffect: editingEffect,
                                    projectState: projectState?.getState()?.effects?.length || 'no project state'
                                });
                                return (
                                    <div style={{ color: '#ff6b6b', padding: '1rem', textAlign: 'center' }}>
                                        <h4>Effect Configuration Error</h4>
                                        <p>Cannot edit this effect because it is missing required data.</p>
                                        <p>This may be an old effect that needs to be re-added.</p>
                                    </div>
                                );
                            }

                            return (
                                <EffectConfigurer
                                    selectedEffect={{
                                        ...editingEffectData,
                                        effectIndex: editingEffect.effectIndex,
                                        effectType: editingEffect.effectType,
                                        subEffectIndex: editingEffect.subIndex
                                    }}
                                    initialConfig={editingEffectData.config}
                                    projectState={projectState}
                                    getResolutionDimensions={getResolutionDimensions}
                                />
                            );
                        })()}
                    </DialogContent>
                </Dialog>

                {/* Event Monitor */}
                {showEventMonitor && (
                    <Dialog
                        open={showEventMonitor}
                        onClose={() => setShowEventMonitor(false)}
                        maxWidth="lg"
                        fullWidth
                    >
                        <DialogTitle>
                            Render Progress Monitor
                            <IconButton
                                onClick={() => setShowEventMonitor(false)}
                                sx={{ position: 'absolute', right: 8, top: 8 }}
                            >
                                <Close />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent>
                            <EventBusMonitor
                                open={showEventMonitor}
                                onClose={() => setShowEventMonitor(false)}
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </Box>
        </ThemeProvider>
    );
}