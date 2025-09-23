/**
 * EventDrivenCanvasToolbar - Wrapper that converts callback props to events
 * Eliminates ALL callback props by emitting events instead
 */

import React, { useState, useCallback } from 'react';
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
    isRendering
}) {
    const { eventBusService } = useServices();

    // Get current resolution directly from ProjectState (single source of truth)
    const currentResolution = projectState ? projectState.getTargetResolution() : null;

    // Get current orientation from ProjectState (single source of truth)
    const isHorizontal = projectState ? projectState.getIsHorizontal() : true;

    // UI-only state (not business logic)
    const [currentThemeKey, setCurrentThemeKey] = useState('dark');
    const [zoomMenuAnchor, setZoomMenuAnchor] = useState(null);
    const [colorSchemeMenuAnchor, setColorSchemeMenuAnchor] = useState(null);

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
        const themes = ['dark', 'light', 'cyberpunk']; // Only 3 themes as requested
        const currentIndex = themes.indexOf(currentThemeKey);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        setCurrentThemeKey(nextTheme);

        eventBusService.emit('toolbar:theme:change', { themeKey: nextTheme }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService, currentThemeKey]);

    const handleColorSchemeChange = useCallback((schemeId) => {
        eventBusService.emit('toolbar:colorscheme:change', { schemeId }, {
            source: 'EventDrivenCanvasToolbar',
            component: 'EventDrivenCanvasToolbar'
        });
    }, [eventBusService]);



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
            themeMode={currentThemeKey === 'dark' ? 'dark' : 'light'}
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
                dark: { name: 'Dark' },
                light: { name: 'Light' },
                cyberpunk: { name: 'Cyberpunk' }
            }}
            onForceSave={null}
            onLoopControlToggle={null}
            closeAllDropdowns={closeAllDropdowns}
            zoomMenuAnchor={zoomMenuAnchor}
            setZoomMenuAnchor={setZoomMenuAnchor}
            colorSchemeMenuAnchor={colorSchemeMenuAnchor}
            setColorSchemeMenuAnchor={setColorSchemeMenuAnchor}
        />
    );
}