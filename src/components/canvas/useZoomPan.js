import { useState, useEffect, useCallback } from 'react';
import { useServices } from '../../contexts/ServiceContext.js';

export default function useZoomPan() {
    const { eventBusService } = useServices();
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev * 1.2, 10)); // Max zoom 10x
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev / 1.2, 0.1)); // Min zoom 0.1x
    }, []);

    const handleZoomReset = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const handleMouseDown = useCallback((e, canvasRef, frameHolderRef) => {
        if (e.target === canvasRef.current || e.target === frameHolderRef.current) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            e.preventDefault();
        }
    }, [pan]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleWheel = useCallback((e) => {
        if (e.target.closest('.canvas-viewport__frame-holder') || e.target.closest('.canvas-viewport__render-canvas')) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(prev => Math.max(0.1, Math.min(prev * delta, 10)));
        }
    }, []);

    // Event listeners for zoom commands
    useEffect(() => {
        console.log('🔎 useZoomPan: Setting up event listeners');

        const unsubscribeZoomIn = eventBusService.subscribe('zoom:in', () => {
            console.log('🔎 useZoomPan: Zoom in event received');
            handleZoomIn();
        }, { component: 'useZoomPan' });

        const unsubscribeZoomOut = eventBusService.subscribe('zoom:out', () => {
            console.log('🔎 useZoomPan: Zoom out event received');
            handleZoomOut();
        }, { component: 'useZoomPan' });

        const unsubscribeZoomReset = eventBusService.subscribe('zoom:reset', () => {
            console.log('🔎 useZoomPan: Zoom reset event received');
            handleZoomReset();
        }, { component: 'useZoomPan' });

        return () => {
            console.log('🔎 useZoomPan: Cleaning up event listeners');
            unsubscribeZoomIn();
            unsubscribeZoomOut();
            unsubscribeZoomReset();
        };
    }, [eventBusService, handleZoomIn, handleZoomOut, handleZoomReset]);

    // Global mouse event listeners for dragging
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
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return {
        zoom,
        pan,
        isDragging,
        handleZoomIn,
        handleZoomOut,
        handleZoomReset,
        handleMouseDown,
        handleWheel
    };
}