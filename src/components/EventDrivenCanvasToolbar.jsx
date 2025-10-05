/**
 * EventDrivenCanvasToolbar - Wrapper that converts callback props to events
 * Eliminates ALL callback props by emitting events instead
 */

import React, { useState, useCallback, useEffect } from 'react';
import CanvasToolbar from './canvas/CanvasToolbar.jsx';
import { useServices } from '../contexts/ServiceContext.js';

export default function EventDrivenCanvasToolbar({
    config,
    projectState,
    selectedFrame,
    isRenderLoopActive,
    zoom,
    currentTheme,
    getResolutionDimensions,
    isRendering,
    projectStateManager,
    isReadOnly = false,
    isProjectResuming = false
}) {
    const { eventBusService, pinSettingService } = useServices();

    // Get current resolution directly from ProjectState (single source of truth)
    const currentResolution = projectState ? projectState.getTargetResolution() : null;

    // Get current orientation from ProjectState (single source of truth)
    const isHorizontal = projectState ? projectState.getIsHorizontal() : true;

    // UI-only state (not business logic)
    const [currentThemeKey, setCurrentThemeKey] = useState('cyberpunk');
    const [zoomMenuAnchor, setZoomMenuAnchor] = useState(null);
    const [colorSchemeMenuAnchor, setColorSchemeMenuAnchor] = useState(null);
    const [isPinned, setIsPinned] = useState(false);

    // Subscribe to pin state changes
    useEffect(() => {
        if (!pinSettingService) return;

        const handlePinStateChange = (data) => {
            setIsPinned(data.isPinned);
        };

        const unsubscribe = eventBusService.subscribe('pin:state:changed', handlePinStateChange);
        
        // Initialize with current state
        setIsPinned(pinSettingService.isPinned());

        return unsubscribe;
    }, [eventBusService, pinSettingService]);

    // Event-emitting callback converters
    const handleFrameChange = useCallback((frameIndex) => {
        eventBusService.emit('toolbar:frame:select', { frameIndex }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleRender = useCallback(() => {
        eventBusService.emit('toolbar:render:trigger', { selectedFrame }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService, selectedFrame]);

    const handleRenderLoop = useCallback(() => {
        eventBusService.emit('toolbar:renderloop:toggle', { isActive: !isRenderLoopActive }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService, isRenderLoopActive]);

    const handleResolutionChange = useCallback((event) => {
        const resolution = parseInt(event.target.value);
        eventBusService.emit('toolbar:resolution:change', { resolution }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleOrientationToggle = useCallback(() => {
        eventBusService.emit('toolbar:orientation:toggle', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleFramesChange = useCallback((event) => {
        const frameCount = parseInt(event.target.value);
        eventBusService.emit('toolbar:frames:change', { frameCount }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleZoomIn = useCallback(() => {
        eventBusService.emit('toolbar:zoom:in', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleZoomOut = useCallback(() => {
        eventBusService.emit('toolbar:zoom:out', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleZoomReset = useCallback(() => {
        eventBusService.emit('toolbar:zoom:reset', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleThemeChange = useCallback(() => {
        const themes = ['cyberpunk']; // Only cyberpunk theme
        const nextTheme = 'cyberpunk'; // Always cyberpunk
        setCurrentThemeKey(nextTheme);

        eventBusService.emit('toolbar:theme:change', { themeKey: nextTheme }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleColorSchemeChange = useCallback((schemeId) => {
        eventBusService.emit('toolbar:colorscheme:change', { schemeId }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleNewProject = useCallback(() => {
        eventBusService.emit('project:new', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleOpenProject = useCallback(() => {
        eventBusService.emit('project:open', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleImportProject = useCallback(() => {
        eventBusService.emit('project:import', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleProjectSettings = useCallback(() => {
        eventBusService.emit('project:settings:open', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handleEventBusMonitor = useCallback(() => {
        eventBusService.emit('eventbus:monitor:open', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handlePluginManager = useCallback(() => {
        eventBusService.emit('plugins:manager:open', {}, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);

    const handlePinToggle = useCallback(() => {
        eventBusService.emit('toolbar:pin:toggle', { isPinned: !isPinned }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService, isPinned]);

    const closeAllDropdowns = useCallback(() => {
        setZoomMenuAnchor(null);
        setColorSchemeMenuAnchor(null);
    }, []);

    return (
        <CanvasToolbar
            config={config}
            currentResolution={currentResolution}
            isHorizontal={isHorizontal}
            isRendering={isRendering}
            selectedFrame={selectedFrame}
            zoom={zoom}
            themeMode='dark'
            currentTheme={currentTheme}
            isRenderLoopActive={isRenderLoopActive}
            lastSaveStatus={null}
            currentProjectPath={null}
            onRender={handleRender}
            onRenderLoop={handleRenderLoop}
            onResolutionChange={handleResolutionChange}
            onOrientationToggle={handleOrientationToggle}
            onFramesChange={handleFramesChange}
            onFrameChange={handleFrameChange}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            onColorSchemeChange={handleColorSchemeChange}
            onThemeToggle={handleThemeChange}
            currentThemeKey={currentThemeKey}
            availableThemes={{
                cyberpunk: { name: 'Cyberpunk' }
            }}
            onForceSave={null}
            onLoopControlToggle={null}
            closeAllDropdowns={closeAllDropdowns}
            zoomMenuAnchor={zoomMenuAnchor}
            setZoomMenuAnchor={setZoomMenuAnchor}
            colorSchemeMenuAnchor={colorSchemeMenuAnchor}
            setColorSchemeMenuAnchor={setColorSchemeMenuAnchor}
            projectStateManager={projectStateManager}
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
            onImportProject={handleImportProject}
            onProjectSettings={handleProjectSettings}
            onEventBusMonitor={handleEventBusMonitor}
            onPluginManager={handlePluginManager}
            isReadOnly={isReadOnly || isPinned}
            isProjectResuming={isProjectResuming}
            isPinned={isPinned}
            onPinToggle={handlePinToggle}
        />
    );
}