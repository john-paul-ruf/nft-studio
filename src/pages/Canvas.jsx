import React, { useState, useEffect, useRef, useCallback } from 'react';
import EffectPicker from '../components/EffectPicker.jsx';
import EventDrivenEffectsPanel from '../components/EventDrivenEffectsPanel.jsx';
import EventBusMonitor from '../components/EventBusMonitor.jsx';
import ImportProjectWizard from '../components/ImportProjectWizard.jsx';
import ProjectSettingsDialog from '../components/ProjectSettingsDialog.jsx';
import PluginManagerDialog from '../components/PluginManagerDialog.jsx';

// Canvas components and hooks
import { createAppTheme, appThemes } from '../components/canvas/theme.js';
import CanvasToolbar from '../components/canvas/CanvasToolbar.jsx';
import CanvasViewport from '../components/canvas/CanvasViewport.jsx';
import useZoomPan from '../components/canvas/useZoomPan.js';
import useEffectManagement from '../components/canvas/useEffectManagement.js';

// New clean hooks
import useRenderPipeline from '../hooks/useRenderPipeline.js';
import { useNavigation } from '../hooks/useNavigation.js';
import { useServices } from '../contexts/ServiceContext.js';
import PreferencesService from '../services/PreferencesService.js';
import ResolutionMapper from '../utils/ResolutionMapper.js';
import ConfigCloner from '../utils/ConfigCloner.js';

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
import './Canvas.bem.css';

// Event-driven components
import EventDrivenToolbarActions from '../components/EventDrivenToolbarActions.jsx';
import EventDrivenCanvasToolbar from '../components/EventDrivenCanvasToolbar.jsx';

// Effects components
import EffectConfigPanel from '../components/effects/EffectConfigPanel.jsx';


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
    const { navigateToWizard } = useNavigation();

    // State management through services only
    const [projectState, setProjectState] = useState(() => projectStateManager.getProjectState());
    const [updateCounter, setUpdateCounter] = useState(0); // Force re-renders
    const config = projectState ? projectState.getState() : {};

    // Check if this Canvas was loaded for a resuming project
    const isLoadedForResuming = projectData?.isResuming || false;

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

    // Handle initial state when Canvas is loaded for a resuming project
    useEffect(() => {
        if (isLoadedForResuming) {
            console.log('🎨 Canvas: Loaded for resuming project - setting initial state and opening monitor');
            setIsProjectResuming(true);
            setIsEventMonitorForResumedProject(true);
            setShowEventMonitor(true);
        }
    }, [isLoadedForResuming]);

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
    const [currentThemeKey, setCurrentThemeKey] = useState('cyberpunk');
    const [isRenderLoopActive, setIsRenderLoopActive] = useState(false);
    const [showEventMonitor, setShowEventMonitor] = useState(false);
    const [isEventMonitorMinimized, setIsEventMonitorMinimized] = useState(false);
    const [isProjectResuming, setIsProjectResuming] = useState(false);
    const [showPluginManager, setShowPluginManager] = useState(false);
    const [isEventMonitorForResumedProject, setIsEventMonitorForResumedProject] = useState(false);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [showProjectSettings, setShowProjectSettings] = useState(false);
    
    // Config panel state (docked on right side)
    const [configPanelExpanded, setConfigPanelExpanded] = useState(false);
    const [selectedEffect, setSelectedEffect] = useState(null);


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
        handleAddEffectDirect,
        handleEffectUpdate,
        handleEffectDelete,
        handleEffectReorder,
        handleEffectToggleVisibility,
        handleEffectRightClick,
        handleEditEffect,
        handleSubEffectUpdate,
        handleAddSecondaryEffect,
        handleAddKeyframeEffect,
        contextMenuEffect,
        contextMenuPos,
        refreshAvailableEffects
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

    // Debug: Track isRenderLoopActive changes
    useEffect(() => {
        console.log('🎨 Canvas: isRenderLoopActive state changed to:', isRenderLoopActive);
    }, [isRenderLoopActive]);

    // Event listeners for UI state updates
    useEffect(() => {
        console.log('🎨 Canvas: Setting up UI event listeners');
        console.log('🎨 Canvas: Initial isRenderLoopActive state:', isRenderLoopActive);

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

        // Effect selection events - update config panel
        const unsubscribeEffectSelected = eventBusService.subscribe('effect:selected', (payload) => {
            console.log('🎨 Canvas: Effect selection event received:', payload);
            // Enrich the selected effect with full data from ProjectState
            if (projectState) {
                const state = projectState.getState?.();
                const effects = state?.effects || [];
                let effect = null;
                let effectData = null;
                
                // Try to find effect by ID
                if (payload.effectId) {
                    effect = effects.find(e => e.id === payload.effectId);
                }
                
                if (effect) {
                    // For nested effects (secondary/keyframe), extract the nested effect data
                    effectData = effect;
                    
                    if (payload.effectType === 'secondary' && payload.subIndex !== null && payload.subIndex !== undefined) {
                        const secondaryEffect = effect.secondaryEffects?.[payload.subIndex];
                        console.log('🎨 Canvas: Looking for secondary effect at subIndex:', {
                            subIndex: payload.subIndex,
                            found: !!secondaryEffect,
                            secondaryName: secondaryEffect?.name,
                            secondaryEffectsCount: effect.secondaryEffects?.length
                        });
                        if (secondaryEffect) {
                            effectData = secondaryEffect;
                            console.log('✅ Canvas: Secondary effect successfully extracted:', {
                                effectId: secondaryEffect.id,
                                effectName: secondaryEffect.name,
                                hasConfig: !!secondaryEffect.config
                            });
                        } else {
                            console.error('❌ Canvas: Secondary effect NOT found at subIndex:', payload.subIndex);
                        }
                    } else if (payload.effectType === 'keyframe' && payload.subIndex !== null && payload.subIndex !== undefined) {
                        const keyframeEffect = effect.keyframeEffects?.[payload.subIndex];
                        console.log('🎨 Canvas: Looking for keyframe effect at subIndex:', {
                            subIndex: payload.subIndex,
                            found: !!keyframeEffect,
                            keyframeName: keyframeEffect?.name,
                            keyframeEffectsCount: effect.keyframeEffects?.length
                        });
                        if (keyframeEffect) {
                            effectData = keyframeEffect;
                            console.log('✅ Canvas: Keyframe effect successfully extracted:', {
                                effectId: keyframeEffect.id,
                                effectName: keyframeEffect.name,
                                hasConfig: !!keyframeEffect.config
                            });
                        } else {
                            console.error('❌ Canvas: Keyframe effect NOT found at subIndex:', payload.subIndex);
                        }
                    }
                    
                    // Use effectData (which is the nested effect if applicable)
                    console.log('🎨 Canvas: Setting selected effect with data:', {
                        effectId: payload.effectId,
                        effectType: payload.effectType,
                        subIndex: payload.subIndex,
                        effectName: effectData.name || effectData.className,
                        effectDataName: effectData.name,
                        effectDataClassName: effectData.className,
                        effectDataId: effectData.id,
                        configKeys: Object.keys(effectData.config || {}).slice(0, 3),
                        configType: typeof effectData.config,
                        hasConfig: !!effectData.config,
                        fullEffectData: {
                            name: effectData.name,
                            className: effectData.className,
                            registryKey: effectData.registryKey,
                            id: effectData.id,
                            config: effectData.config
                        }
                    });
                    
                    // Ensure config is always an object (fallback to empty if missing)
                    const effectConfig = effectData.config || {};
                    if (typeof effectConfig !== 'object') {
                        console.warn('⚠️ Canvas: effectData.config is not an object:', typeof effectConfig);
                    }
                    
                    // 🔒 CRITICAL: Deep-clone config to prevent multiple effects of same type from sharing references
                    // This prevents "changes in UI affect other effects" bug when toggling effects off/on
                    // For nested effects, use the nested effect's registryKey, not parent's
                    const selectedEffectData = {
                        effectId: payload.effectId,
                        effectIndex: payload.effectIndex,
                        effectType: payload.effectType,
                        subIndex: payload.subIndex,
                        name: effectData.name || effectData.className || 'Unknown',
                        registryKey: effectData.registryKey || effectData.name || effectData.className || 'Unknown',
                        className: effectData.className || 'Unknown',
                        id: effectData.id,
                        config: ConfigCloner.deepClone(effectConfig),
                    };
                    
                    console.log('🎨 Canvas: Selected effect data prepared:', {
                        effectId: selectedEffectData.effectId,
                        effectType: selectedEffectData.effectType,
                        subIndex: selectedEffectData.subIndex,
                        name: selectedEffectData.name,
                        registryKey: selectedEffectData.registryKey,
                        className: selectedEffectData.className,
                        id: selectedEffectData.id,
                        configIsValid: !!selectedEffectData.config && typeof selectedEffectData.config === 'object',
                        configKeys: Object.keys(selectedEffectData.config || {})
                    });
                    
                    setSelectedEffect(selectedEffectData);
                    // Auto-expand config panel when effect is selected
                    setConfigPanelExpanded(true);
                    console.log('✅ Canvas: Config panel expanded for effect selection');
                } else {
                    console.error('❌ Canvas: Effect not found for effectId:', payload.effectId);
                }
            } else {
                console.error('❌ Canvas: projectState not available for effect selection');
            }
        }, { component: 'Canvas' });

        // Effect deselection event - clear config panel
        const unsubscribeEffectDeselected = eventBusService.subscribe('effect:deselected', (payload) => {
            console.log('🎨 Canvas: Effect deselection event received:', payload);
            setSelectedEffect(null);
            setConfigPanelExpanded(false);
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
            console.log('🎨 Canvas: Setting isRenderLoopActive to:', payload.isActive);
            setIsRenderLoopActive(payload.isActive);
            // Only auto-manage EventBusMonitor visibility for regular render loop toggles
            // Don't override manual showEventMonitor state for resumed projects
            if (payload.source !== 'resumed-project') {
                setShowEventMonitor(payload.isActive);
            }
            console.log('🎨 Canvas: Updated render loop state and modal visibility:', {
                isActive: payload.isActive,
                showModal: payload.isActive,
                source: payload.source
            });
        }, { component: 'Canvas' });

        const unsubscribeRenderLoopError = eventBusService.subscribe('renderloop:error', (payload) => {
            console.log('🎨 Canvas: Render loop error event received:', payload);
            // On error, ensure render loop is marked as inactive and modal is hidden
            setIsRenderLoopActive(false);
            setShowEventMonitor(false);
            console.log('🎨 Canvas: Render loop error - reset states to inactive');
        }, { component: 'Canvas' });

        // Listen for actual render loop start from RenderCoordinator
        const unsubscribeRenderLoopStart = eventBusService.subscribe('render.loop.start', (payload) => {
            console.log('🎨 Canvas: Render loop START event received from RenderCoordinator:', payload);
            console.log('🎨 Canvas: Setting isRenderLoopActive to TRUE');
            setIsRenderLoopActive(true);
        }, { component: 'Canvas' });

        // Listen for render loop stop
        const unsubscribeRenderLoopStop = eventBusService.subscribe('render.loop.stop', (payload) => {
            console.log('🎨 Canvas: Render loop STOP event received from RenderCoordinator:', payload);
            console.log('🎨 Canvas: Setting isRenderLoopActive to FALSE');
            setIsRenderLoopActive(false);
        }, { component: 'Canvas' });

        // Project management events
        const unsubscribeProjectNew = eventBusService.subscribe('project:new', (payload) => {
            console.log('🎨 Canvas: New project event received:', payload);
            // Navigate to project wizard or create new project
            navigateToWizard();
        }, { component: 'Canvas' });

        const unsubscribeProjectOpen = eventBusService.subscribe('project:open', async (payload) => {
            console.log('🎨 Canvas: Open project event received:', payload);
            try {
                // Use the dialog service to open file dialog - support both .nftproject and JSON files
                const result = await window.api.selectFile({
                    title: 'Open Project',
                    filters: [
                        { name: 'NFT Project Files', extensions: ['nftproject'] },
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    console.log('🎨 Canvas: Loading project from:', filePath);

                    // Check if it's a .nftproject file
                    if (filePath.endsWith('.nftproject')) {
                        // Load as ProjectState using the same approach as intro wizard
                        const ProjectState = (await import('../models/ProjectState.js')).default;
                        const loadedProjectState = await ProjectState.loadFromFile(filePath);

                        if (loadedProjectState) {
                            console.log('✅ Project loaded successfully:', loadedProjectState.getProjectName());

                            // Get the directory from the file path
                            const projectDirectory = filePath.substring(0, filePath.lastIndexOf('/'));

                            // Initialize the shared ProjectStateManager with the loaded project
                            await projectStateManager.initialize(loadedProjectState, projectDirectory);

                            // Update local project state
                            setProjectState(loadedProjectState);

                            // NOTE: Auto-render on project load DISABLED - user must manually trigger render
                            console.log('📝 Project loaded - waiting for manual render trigger');
                        } else {
                            console.error('❌ Failed to load project from file');
                        }
                    } else {
                        // Legacy JSON file handling
                        const projectData = await window.api.loadProject(filePath);
                        if (projectData.success) {
                            // Update project state with loaded data
                            if (projectState) {
                                projectState.loadFromData(projectData.data);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('🎨 Canvas: Error opening project:', error);
            }
        }, { component: 'Canvas' });

        // Listen for project resume start to disable toolbar AND open monitor
        const unsubscribeProjectResume = eventBusService.subscribe('project:resume', async (payload) => {
            console.log('🎨 Canvas: Project resume event received - disabling toolbar and opening monitor:', payload);
            setIsProjectResuming(true);
            setIsEventMonitorForResumedProject(true);
            setShowEventMonitor(true);
        }, { component: 'Canvas' });

        // Listen for project resume start (when already on Canvas) to disable toolbar AND open monitor
        const unsubscribeProjectResumeStart = eventBusService.subscribe('project:resume:start', async (payload) => {
            console.log('🎨 Canvas: Project resume start event received - disabling toolbar and opening monitor:', payload);
            setIsProjectResuming(true);
            setIsEventMonitorForResumedProject(true);
            setShowEventMonitor(true);
        }, { component: 'Canvas' });

        // Listen for successful project resume to just re-enable toolbar (monitor already open)
        const unsubscribeProjectResumeSuccess = eventBusService.subscribe('project:resume:success', async (payload) => {
            console.log('🎨 Canvas: Project resume success event received - re-enabling toolbar:', payload);
            setIsProjectResuming(false);
        }, { component: 'Canvas' });

        // Listen for import wizard show request
        const unsubscribeShowImportWizard = eventBusService.subscribe('ui:show-import-wizard', (payload) => {
            console.log('🎨 Canvas: Show import wizard event received:', payload);
            setShowImportWizard(true);
        }, { component: 'Canvas' });

        // Listen for project settings dialog show request
        const unsubscribeShowProjectSettings = eventBusService.subscribe('project:settings:open', (payload) => {
            console.log('🎨 Canvas: Show project settings event received:', payload);
            setShowProjectSettings(true);
        }, { component: 'Canvas' });

        // Listen for event bus monitor show request
        const unsubscribeShowEventBusMonitor = eventBusService.subscribe('eventbus:monitor:open', (payload) => {
            console.log('🎨 Canvas: Show event bus monitor event received:', payload);
            setShowEventMonitor(true);
        }, { component: 'Canvas' });

        // Listen for plugin manager show request
        const unsubscribeShowPluginManager = eventBusService.subscribe('plugins:manager:open', (payload) => {
            console.log('🎨 Canvas: Show plugin manager event received:', payload);
            setShowPluginManager(true);
        }, { component: 'Canvas' });

        return () => {
            console.log('🎨 Canvas: Cleaning up UI event listeners');
            unsubscribeTheme();
            unsubscribeFrame();
            unsubscribeEffectSelected();
            unsubscribeEffectDeselected();
            unsubscribeResolution();
            unsubscribeOrientation();
            unsubscribeRenderLoopToggle();
            unsubscribeRenderLoopError();
            unsubscribeRenderLoopStart();
            unsubscribeRenderLoopStop();
            unsubscribeProjectNew();
            unsubscribeProjectOpen();
            unsubscribeProjectResume();
            unsubscribeProjectResumeStart();
            unsubscribeProjectResumeSuccess();
            unsubscribeShowImportWizard();
            unsubscribeShowProjectSettings();
            unsubscribeShowEventBusMonitor();
            unsubscribeShowPluginManager();
        };
    }, [eventBusService, projectState]);

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

            <div className="page-canvas">
                {/* Event-Driven Toolbar - ZERO callback props! */}
                <div className="page-canvas__header">
                    <EventDrivenCanvasToolbar
                        config={config}
                        projectState={projectState}
                        selectedFrame={selectedFrame}
                        isRenderLoopActive={isRenderLoopActive}
                        zoom={zoom}
                        currentTheme={currentTheme}
                        getResolutionDimensions={getResolutionDimensions}
                        isRendering={isRendering}
                        isReadOnly={projectState ? projectState.getState().isReadOnly || false : false}
                        isProjectResuming={isProjectResuming}
                    />
                </div>

                {/* Main content area */}
                <div className="page-canvas__body">
                    {/* Effects panel */}
                    <div className="page-canvas__sidebar">
                        <EventDrivenEffectsPanel
                            effects={projectState ? projectState.getState().effects || [] : []}
                            availableEffects={availableEffects}
                            effectsLoaded={effectsLoaded}
                            currentTheme={currentTheme}
                            projectState={projectState}
                            isReadOnly={projectState ? projectState.getState().isReadOnly || false : false}
                            isRenderLoopActive={isRenderLoopActive}
                            isRendering={isRendering}
                            refreshAvailableEffects={refreshAvailableEffects}
                        />
                    </div>

                    {/* Effect Configuration Panel - docked between effects panel and canvas */}
                    {selectedEffect && (
                        <div className="page-canvas__effect-config">
                            <div className="page-canvas__effect-config__header">
                                <div>
                                    <h3 className="page-canvas__effect-config__title">
                                        {selectedEffect?.name || 'Effect Configuration'}
                                    </h3>
                                    <div className="page-canvas__effect-config__id">
                                        ID: {selectedEffect?.effectId?.substring(0, 12)}
                                    </div>
                                </div>
                                <button
                                    className="page-canvas__effect-config__close-btn"
                                    onClick={() => {
                                        setSelectedEffect(null);
                                        setConfigPanelExpanded(false);
                                    }}
                                    aria-label="Close configuration"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="page-canvas__effect-config__content">
                                <EffectConfigPanel
                                    isExpanded={true}
                                    onToggleExpand={() => {
                                        setSelectedEffect(null);
                                        setConfigPanelExpanded(false);
                                    }}
                                    selectedEffect={selectedEffect}
                                    projectState={projectState}
                                    isReadOnly={projectState ? projectState.getState().isReadOnly || false : false}
                                />
                            </div>
                        </div>
                    )}

                    {/* Canvas viewport */}
                    <div className="page-canvas__viewport">
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
                    </div>
                </div>

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
                            className="page-canvas__close-button page-canvas__close-button--dialog"
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <EffectPicker
                            onSelect={(effect) => {
                                console.log('🎯 Canvas: EffectPicker onSelect called with:', effect);
                                try {
                                    // Use the AddEffectCommand through the event system instead
                                    console.log('🎯 Canvas: Emitting effect:add event with:', {
                                        effectName: effect.className,
                                        effectType: effect.type
                                    });
                                    eventBusService.emit('effect:add', {
                                        effectName: effect.className,
                                        effectType: effect.type
                                    });
                                    console.log('🎯 Canvas: Event emitted, closing picker');
                                    setShowEffectPicker(false);
                                } catch (error) {
                                    console.error('🎯 Canvas: Error in onSelect handler:', error);
                                }
                            }}
                            onClose={() => setShowEffectPicker(false)}
                        />
                    </DialogContent>
                </Dialog>

                {/* Event Monitor */}
                <EventBusMonitor
                    open={showEventMonitor}
                    onClose={() => {
                        setShowEventMonitor(false);
                        setIsEventMonitorForResumedProject(false);
                    }}
                    onOpen={() => setShowEventMonitor(true)}
                    isMinimized={isEventMonitorMinimized}
                    setIsMinimized={setIsEventMonitorMinimized}
                    isForResumedProject={isEventMonitorForResumedProject}
                    renderLoopActive={isRenderLoopActive}
                />

                {/* Plugin Manager */}
                <PluginManagerDialog
                    open={showPluginManager}
                    onClose={() => setShowPluginManager(false)}
                />

                {/* Import Project Wizard */}
                {showImportWizard && (
                    <ImportProjectWizard
                        onComplete={async (result) => {
                            try {
                                // Initialize the shared ProjectStateManager with the imported project
                                await projectStateManager.initialize(result.projectState, result.projectDirectory);

                                // Update local state to reflect the new project
                                setProjectState(result.projectState);
                                setUpdateCounter(prev => prev + 1);

                                // Close the wizard
                                setShowImportWizard(false);

                                // Force a re-render by updating the update counter
                                setUpdateCounter(prev => prev + 1);
                            } catch (error) {
                                console.error('Error loading imported project:', error);
                                alert('Error loading imported project: ' + error.message);
                            }
                        }}
                        onCancel={() => setShowImportWizard(false)}
                    />
                )}

                {/* Project Settings Dialog */}
                {showProjectSettings && (
                    <ProjectSettingsDialog
                        open={showProjectSettings}
                        onClose={() => setShowProjectSettings(false)}
                        projectState={projectState}
                    />
                )}

            </div>
        </ThemeProvider>
    );
}