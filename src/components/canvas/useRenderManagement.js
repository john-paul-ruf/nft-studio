import { useState, useEffect, useRef, useCallback } from 'react';
import ColorSchemeService from '../../services/ColorSchemeService.js';
import PreferencesService from '../../services/PreferencesService.js';

export default function useRenderManagement(config, getResolutionDimensions) {
    const [renderResult, setRenderResult] = useState(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderTimer, setRenderTimer] = useState(0);
    const [isRenderLoopActive, setIsRenderLoopActive] = useState(false);
    const [showEventMonitor, setShowEventMonitor] = useState(false);
    const renderTimerRef = useRef(null);

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

    const handleRender = useCallback(async (selectedFrame) => {
        setIsRendering(true);
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
                        colors: fullScheme.lights || [],
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
                isHorizontal: config.isHorizontal,
                effects: visibleEffects,
                width: dimensions.w,
                height: dimensions.h,
                renderStartFrame: selectedFrame,
                renderJumpFrames: config.numFrames + 1,
                colorSchemeData: colorSchemeData
            };

            const result = await window.api.renderFrame(renderConfig, selectedFrame);

            if (result.success && (result.frameBuffer || result.fileUrl)) {
                // Handle file system method
                if (result.method === 'filesystem' || result.bufferType === 'filesystem') {
                    console.log('📁 Using file system method');
                    setRenderResult(result.fileUrl);
                }
                // Handle base64 buffer type
                else if (result.bufferType === 'base64' || typeof result.frameBuffer === 'string') {
                    if (result.frameBuffer.startsWith('data:image')) {
                        setRenderResult(result.frameBuffer);
                    } else {
                        const imageUrl = `data:image/png;base64,${result.frameBuffer}`;
                        try {
                            atob(result.frameBuffer.substring(0, 100));
                            setRenderResult(imageUrl);
                        } catch (e) {
                            console.error('❌ Invalid base64 data:', e);
                            setRenderResult(result.frameBuffer);
                        }
                    }
                } else if (result.frameBuffer instanceof ArrayBuffer || result.frameBuffer instanceof Uint8Array) {
                    // Legacy path - convert binary buffer to base64
                    let uint8Array;
                    if (result.frameBuffer instanceof ArrayBuffer) {
                        uint8Array = new Uint8Array(result.frameBuffer);
                    } else {
                        uint8Array = result.frameBuffer;
                    }

                    let binary = '';
                    const chunkSize = 8192;
                    for (let i = 0; i < uint8Array.length; i += chunkSize) {
                        const chunk = uint8Array.slice(i, i + chunkSize);
                        binary += String.fromCharCode.apply(null, chunk);
                    }
                    const base64 = btoa(binary);
                    const imageUrl = `data:image/png;base64,${base64}`;
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
    }, [config, getResolutionDimensions]);

    const handleRenderLoop = useCallback(async (selectedFrame) => {
        console.log('🔄 Render loop button clicked, isRenderLoopActive:', isRenderLoopActive);

        if (isRenderLoopActive) {
            // Stop render loop
            try {
                await window.api.stopRenderLoop();
                setIsRenderLoopActive(false);
                console.log('🛑 Render loop stopped');
            } catch (error) {
                console.error('Failed to stop render loop:', error);
            }
        } else {
            // Get preferences for output directory
            const preferences = await PreferencesService.getPreferences();
            const outputDirectory = preferences.outputDirectory || '/tmp/render-loop';
            console.log('📁 Render loop output directory:', outputDirectory);

            // Fetch full color scheme data for backend
            let colorSchemeData = null;
            if (config.colorScheme) {
                const fullScheme = await ColorSchemeService.getColorScheme(config.colorScheme);
                if (fullScheme) {
                    colorSchemeData = {
                        name: fullScheme.name,
                        colors: fullScheme.lights || [],
                        lights: fullScheme.lights || [],
                        neutrals: fullScheme.neutrals || [],
                        backgrounds: fullScheme.backgrounds || []
                    };
                }
            }

            // Filter out hidden effects for rendering
            const visibleEffects = (config.effects || []).filter(effect => effect.visible !== false);

            const projectName = `render-loop-${Date.now()}`;
            const renderLoopConfig = {
                ...config,
                projectName: projectName,
                projectDirectory: outputDirectory,
                isHorizontal: config.isHorizontal,
                effects: visibleEffects,
                width: getResolutionDimensions().w,
                height: getResolutionDimensions().h,
                numberOfFrames: config.numFrames,
                startFrame: selectedFrame,
                jumpFrames: 1,
                colorSchemeData: colorSchemeData
            };

            console.log('🚀 Starting render loop with config:', renderLoopConfig);

            try {
                const result = await window.api.startRenderLoop(renderLoopConfig);
                if (result.success) {
                    setIsRenderLoopActive(true);
                    setShowEventMonitor(true);
                    console.log('✅ Render loop started successfully');
                } else {
                    console.error('Failed to start render loop:', result.error);
                    alert(`Failed to start render loop: ${result.error}`);
                }
            } catch (error) {
                console.error('Failed to start render loop:', error);
                alert(`Failed to start render loop: ${error.message}`);
            }
        }
    }, [config, getResolutionDimensions, isRenderLoopActive]);

    return {
        renderResult,
        isRendering,
        renderTimer,
        isRenderLoopActive,
        showEventMonitor,
        handleRender,
        handleRenderLoop,
        setShowEventMonitor
    };
}