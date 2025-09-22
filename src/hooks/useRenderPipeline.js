/**
 * Hook for consuming RenderPipelineService
 * Provides automatic rendering and render state management
 */

import { useState, useEffect, useCallback } from 'react';
import { useServices } from '../contexts/ServiceContext.js';

export function useRenderPipeline() {
    const { renderPipelineService } = useServices();
    const [renderResult, setRenderResult] = useState(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderError, setRenderError] = useState(null);
    const [renderTimer, setRenderTimer] = useState(0);

    // Timer effect for render progress
    useEffect(() => {
        let timerInterval;
        if (isRendering) {
            setRenderTimer(0);
            timerInterval = setInterval(() => {
                setRenderTimer(prev => prev + 1);
            }, 1000);
        } else {
            setRenderTimer(0);
        }

        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [isRendering]);

    // Subscribe to render pipeline
    useEffect(() => {
        if (!renderPipelineService) {
            console.warn('useRenderPipeline: No renderPipelineService available');
            return;
        }

        // Get initial state
        setRenderResult(renderPipelineService.getCurrentRenderResult());
        setIsRendering(renderPipelineService.getIsRendering());

        // Poll for render state changes since service doesn't emit state change events
        const pollInterval = setInterval(() => {
            const serviceIsRendering = renderPipelineService.getIsRendering();
            setIsRendering(serviceIsRendering);
        }, 100); // Poll every 100ms

        // Subscribe to render completion/errors
        const unsubscribe = renderPipelineService.onRenderComplete((result, error) => {
            if (error) {
                console.error('useRenderPipeline: Render error:', error);
                setRenderError(error);
                setIsRendering(false);
            } else {
                console.log('useRenderPipeline: Render complete:', result);
                setRenderResult(result);
                setRenderError(null);
                setIsRendering(false);
            }
        });

        return () => {
            clearInterval(pollInterval);
            unsubscribe();
        };
    }, [renderPipelineService]);

    // Manual render trigger (for user-initiated renders like button clicks)
    const triggerRender = useCallback((selectedFrame = 0) => {
        if (!renderPipelineService) {
            console.warn('useRenderPipeline: Cannot trigger render, no service available');
            return;
        }

        console.log('useRenderPipeline: Triggering manual render');
        setRenderError(null);
        renderPipelineService.triggerRender(selectedFrame);
        // isRendering state will be updated by the polling interval
    }, [renderPipelineService]);

    return {
        renderResult,
        isRendering,
        renderError,
        renderTimer,
        triggerRender
    };
}

export default useRenderPipeline;