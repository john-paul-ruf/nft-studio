import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    IconButton,
    LinearProgress,
    Tooltip
} from '@mui/material';
import {
    Clear,
    Stop,
    Close
} from '@mui/icons-material';
import EventCaptureService from '../services/EventCaptureService';
import EventFilterService from '../services/EventFilterService';
import RenderProgressTracker from '../services/RenderProgressTracker';

export default function EventBusMonitor({ open, onClose, onOpen, isMinimized, setIsMinimized, isForResumedProject = false, renderLoopActive = false }) {
    const [events, setEvents] = useState([]);
    const [expandedEvents, setExpandedEvents] = useState(new Set());
    const [isStoppingRenderLoop, setIsStoppingRenderLoop] = useState(false);
    const [isRenderLoopActive, setIsRenderLoopActive] = useState(renderLoopActive);
    // Progress tracking state - now managed by RenderProgressTracker
    const [renderProgress, setRenderProgress] = useState({
        isRendering: false,
        currentFrame: 0,
        totalFrames: 100,
        progress: 0,
        projectName: '',
        fps: 0,
        eta: '',
        startTime: null,
        avgRenderTime: 0,
        lastFrameTime: 0
    });
    const eventListRef = useRef(null);
    const maxEvents = 1000;

    // Load buffered events when monitor opens
    useEffect(() => {
        if (open) {
            // Use setTimeout to defer processing and prevent UI freeze
            setTimeout(() => {
                // Load all buffered events
                const bufferedEvents = EventCaptureService.getBufferedEvents();
                
                // Convert buffered events to display format
                const displayEvents = bufferedEvents.map((eventData, index) => {
                    const eventName = eventData.eventName || 'unknown';
                    const data = eventData.data || eventData;
                    
                    return {
                        id: Date.now() + Math.random() + index,
                        type: eventName,
                        category: EventFilterService.detectCategory(eventName, data),
                        timestamp: eventData.timestamp || new Date().toISOString(),
                        data: data,
                        eventData: eventData
                    };
                });
                
                setEvents(displayEvents);
            }, 0);
        }
    }, [open]);

    // Subscribe to live events (always active, not dependent on open state)
    useEffect(() => {
        // Start monitoring when component mounts
        EventCaptureService.startMonitoring({ enableDebug: true, captureAll: true });
        
        // Event handler that processes incoming events
        const handleEvent = (eventData) => {
            const eventName = eventData.eventName || 'unknown';
            const data = eventData.data || eventData;
            
            // Track render progress using RenderProgressTracker
            if (eventName === 'render.loop.start' || eventName === 'project.resume.start') {
                RenderProgressTracker.handleRenderLoopStart(data);
            } else if (eventName === 'render.loop.complete') {
                RenderProgressTracker.handleRenderLoopComplete();
            } else if (eventName === 'render.loop.error') {
                RenderProgressTracker.handleRenderLoopError();
            } else if (eventName === 'frameCompleted') {
                RenderProgressTracker.handleFrameCompleted(data);
            } else if (eventName === 'frameStarted') {
                RenderProgressTracker.handleFrameStarted(data);
            }
            // Update render progress state from tracker
            setRenderProgress({
                isRendering: RenderProgressTracker.isRendering(),
                currentFrame: RenderProgressTracker.getCurrentFrame(),
                totalFrames: RenderProgressTracker.getTotalFrames(),
                progress: RenderProgressTracker.getProgressPercentage(),
                projectName: RenderProgressTracker.getProjectName(),
                fps: RenderProgressTracker.getFPS(),
                eta: RenderProgressTracker.getETA(),
                startTime: RenderProgressTracker.getStartTime(),
                avgRenderTime: RenderProgressTracker.getAvgRenderTime(),
                lastFrameTime: 0
            });
            // Create event object using EventFilterService for categorization
            const newEvent = {
                id: Date.now() + Math.random(),
                type: eventName,
                category: EventFilterService.detectCategory(eventName, data),
                timestamp: eventData.timestamp || new Date().toISOString(),
                data: data,
                eventData: eventData
            };
            
            // Batch state updates to prevent UI freezing
            setEvents(prev => {
                const updated = [newEvent, ...prev].slice(0, maxEvents);
                return updated;
            });
        };
        // Register callback with EventCaptureService (always active)
        console.log('🔔 EventBusMonitor: Registering event callback');
        const unregister = EventCaptureService.registerCallback(handleEvent);
        return () => {
            console.log('🧹 EventBusMonitor: Unregistering event callback');
            unregister();
            EventCaptureService.stopMonitoring();
        };
    }, []); // Empty dependency array - only run once on mount

    // Set up event-driven worker event listeners
    useEffect(() => {
        if (open) {
            let unsubscribeWorkerStarted, unsubscribeWorkerKilled, unsubscribeWorkerKillFailed, unsubscribeRenderLoopToggle, unsubscribeRenderLoopError;

            // Import EventBusService and set up worker event listeners
            import('../services/EventBusService.js').then(({ default: EventBusService }) => {
                console.log('🎯 EventBusMonitor: Setting up event-driven worker listeners');

                // Listen for render loop toggle events to track render loop status
                unsubscribeRenderLoopToggle = EventBusService.subscribe('renderloop:toggled', (payload) => {
                    console.log('🎯 EventBusMonitor: Render loop toggle event received:', payload);
                    setIsRenderLoopActive(payload.isActive);
                }, { component: 'EventBusMonitor' });

                // Listen for render loop error events
                unsubscribeRenderLoopError = EventBusService.subscribe('renderloop:error', (payload) => {
                    console.log('🎯 EventBusMonitor: Render loop error event received:', payload);
                    setIsRenderLoopActive(false);
                }, { component: 'EventBusMonitor' });

                // Listen for worker started events
                unsubscribeWorkerStarted = EventBusService.subscribe('workerStarted', (data) => {
                    console.log('🎯 EventBusMonitor: Worker started event:', data);
                    const newEvent = {
                        id: Date.now() + Math.random(),
                        type: 'workerStarted',
                        category: 'WORKER',
                        timestamp: new Date().toISOString(),
                        data: data,
                        raw: JSON.stringify(data, null, 2)
                    };
                    setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
                }, { component: 'EventBusMonitor' });

                // Listen for worker killed events
                unsubscribeWorkerKilled = EventBusService.subscribe('workerKilled', (data) => {
                    console.log('🎯 EventBusMonitor: Worker killed event:', data);
                    const newEvent = {
                        id: Date.now() + Math.random(),
                        type: 'workerKilled',
                        category: 'WORKER',
                        timestamp: new Date().toISOString(),
                        data: data,
                        raw: JSON.stringify(data, null, 2)
                    };
                    setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
                    
                    // Update render progress to show stopped state
                    setRenderProgress(prev => ({
                        ...prev,
                        isRendering: false
                    }));
                    // Also update render loop status
                    setIsRenderLoopActive(false);
                }, { component: 'EventBusMonitor' });

                // Listen for worker kill failed events
                unsubscribeWorkerKillFailed = EventBusService.subscribe('workerKillFailed', (data) => {
                    console.log('🎯 EventBusMonitor: Worker kill failed event:', data);
                    const newEvent = {
                        id: Date.now() + Math.random(),
                        type: 'workerKillFailed',
                        category: 'ERROR',
                        timestamp: new Date().toISOString(),
                        data: data,
                        raw: JSON.stringify(data, null, 2)
                    };
                    setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
                }, { component: 'EventBusMonitor' });

            }).catch(error => {
                console.error('❌ EventBusMonitor: Failed to set up worker event listeners:', error);
            });

            return () => {
                console.log('🧹 EventBusMonitor: Cleaning up event-driven worker listeners');
                if (unsubscribeWorkerStarted) unsubscribeWorkerStarted();
                if (unsubscribeWorkerKilled) unsubscribeWorkerKilled();
                if (unsubscribeWorkerKillFailed) unsubscribeWorkerKillFailed();
                if (unsubscribeRenderLoopToggle) unsubscribeRenderLoopToggle();
                if (unsubscribeRenderLoopError) unsubscribeRenderLoopError();
            };
        }
    }, [open]);

    useEffect(() => {
        // Reset minimized state when modal is opened (only if setIsMinimized is available)
        if (open && setIsMinimized) {
            setIsMinimized(false);
        }
    }, [open, setIsMinimized]);

    // Sync internal render loop state with prop
    useEffect(() => {
        setIsRenderLoopActive(renderLoopActive);
    }, [renderLoopActive]);

    const toggleEventExpansion = (eventId) => {
        setExpandedEvents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    const clearEvents = () => {
        setEvents([]);
        // Also clear the persistent buffer in EventCaptureService
        EventCaptureService.clearBuffer();
        console.log('🧹 EventBusMonitor: Cleared all events including buffer');
    };

    const stopRenderLoop = async () => {
        if ((!renderProgress.isRendering && !isRenderLoopActive) || isStoppingRenderLoop) return;
        
        setIsStoppingRenderLoop(true);
        try {
            console.log('🛑 EventBusMonitor: Stopping render loop using new event-driven system');
            
            // Try the new event-driven approach first
            try {
                const { killAllWorkers } = await import('../core/events/LoopTerminator.js');
                console.log('🛑 EventBusMonitor: Using event-driven worker termination');
                killAllWorkers('SIGTERM');
                
                // Also call the API for backward compatibility
                const result = await window.api.stopRenderLoop();
                console.log('✅ EventBusMonitor: Render loop stopped via event system:', result);
            } catch (importError) {
                console.warn('⚠️ EventBusMonitor: Event-driven termination not available, using fallback:', importError);
                // Fallback to old method
                const result = await window.api.stopRenderLoop();
                console.log('✅ EventBusMonitor: Render loop stopped via fallback:', result);
            }
            
            // Reset render progress using RenderProgressTracker
            RenderProgressTracker.stopRendering();
            setRenderProgress({
                isRendering: false,
                currentFrame: 0,
                totalFrames: 100,
                progress: 0,
                projectName: '',
                fps: 0,
                eta: '',
                startTime: null,
                avgRenderTime: 0,
                lastFrameTime: 0
            });
            // Also reset render loop status
            setIsRenderLoopActive(false);
        } catch (error) {
            console.error('❌ EventBusMonitor: Failed to stop render loop:', error);
        } finally {
            setIsStoppingRenderLoop(false);
        }
    };

    // Get console-style level color
    const getLevelColor = (category) => {
        const metadata = EventFilterService.getCategoryMetadata(category);
        if (!metadata) return '#888';
        
        // Map to console-style colors
        if (category === 'ERROR') return '#f44336';
        if (category === 'WARNING') return '#ff9800';
        if (category === 'SUCCESS') return '#4caf50';
        if (category === 'CONSOLE') return '#2196f3';
        return metadata.color || '#888';
    };

    // Format message for console display
    const formatMessage = (event) => {
        const data = event.data;
        
        // For node console events, show the actual message
        if (event.type.startsWith('node.console.')) {
            if (data && data.message) return data.message;
            if (data && data.args && data.args.length > 0) {
                return data.args.join(' ');
            }
        }
        
        // For exceptions, show error message
        if (event.type === 'node.exception' && data) {
            if (data.error && data.error.message) return data.error.message;
            if (data.message) return data.message;
        }
        
        // For other events, show a summary
        if (data && data.message) return data.message;
        if (data && data.frameNumber !== undefined) {
            return `Frame ${data.frameNumber}${data.effectName ? ` - ${data.effectName}` : ''}`;
        }
        
        return event.type;
    };

    // Console-style rendering (Chrome DevTools inspired)
    const renderConsole = () => (
        <Box 
            ref={eventListRef}
            sx={{ 
                height: 'calc(100vh - 200px)',
                overflow: 'auto',
                bgcolor: '#1e1e1e',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '12px',
                color: '#cccccc',
                p: 1
            }}
        >
            {events.length === 0 && (
                <Box sx={{ p: 2, color: '#888', textAlign: 'center' }}>
                    Console is empty. Waiting for events...
                </Box>
            )}
            
            {events.map((event) => {
                const isExpanded = expandedEvents.has(event.id);
                const levelColor = getLevelColor(event.category);
                const message = formatMessage(event);
                
                return (
                    <Box 
                        key={event.id}
                        onClick={() => toggleEventExpansion(event.id)}
                        sx={{
                            py: 0.5,
                            px: 1,
                            cursor: 'pointer',
                            borderBottom: '1px solid #2d2d2d',
                            '&:hover': {
                                bgcolor: '#2d2d2d'
                            }
                        }}
                    >
                        {/* Console line */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            {/* Timestamp */}
                            <Typography 
                                component="span"
                                sx={{ 
                                    color: '#888',
                                    fontSize: '11px',
                                    minWidth: '80px',
                                    flexShrink: 0
                                }}
                            >
                                {new Date(event.timestamp).toLocaleTimeString('en-US', {
                                    hour12: false,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    fractionalSecondDigits: 3
                                })}
                            </Typography>
                            
                            {/* Event type badge */}
                            <Typography 
                                component="span"
                                sx={{ 
                                    color: levelColor,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    minWidth: '60px',
                                    flexShrink: 0
                                }}
                            >
                                {event.type.startsWith('node.console.') 
                                    ? event.type.replace('node.console.', '').toUpperCase()
                                    : event.category}
                            </Typography>
                            
                            {/* Message */}
                            <Typography 
                                component="span"
                                sx={{ 
                                    color: '#cccccc',
                                    flex: 1,
                                    wordBreak: 'break-word'
                                }}
                            >
                                {message}
                            </Typography>
                            
                            {/* Expand indicator */}
                            <Typography 
                                component="span"
                                sx={{ 
                                    color: '#888',
                                    fontSize: '10px',
                                    flexShrink: 0
                                }}
                            >
                                {isExpanded ? '▼' : '▶'}
                            </Typography>
                        </Box>
                        
                        {/* Expanded details */}
                        {isExpanded && (
                            <Box 
                                sx={{ 
                                    mt: 1,
                                    ml: 4,
                                    p: 1,
                                    bgcolor: '#252525',
                                    borderLeft: `3px solid ${levelColor}`,
                                    borderRadius: '2px'
                                }}
                            >
                                <Typography 
                                    component="pre"
                                    sx={{
                                        fontFamily: 'inherit',
                                        fontSize: '11px',
                                        color: '#d4d4d4',
                                        margin: 0,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }}
                                >
                                    {JSON.stringify(event.eventData, null, 2)}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Box>
    );

    return (
        <>
            {/* Main Dialog - Takes up most of the screen */}
            <Dialog 
                open={open && !isMinimized} 
                onClose={onClose} 
                maxWidth={false}
                fullWidth
                PaperProps={{
                    sx: {
                        width: '95vw',
                        height: '90vh',
                        maxWidth: 'none',
                        maxHeight: 'none'
                    }
                }}
            >
            {/* Simplified toolbar */}
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: '#2d2d2d',
                color: '#cccccc',
                px: 2,
                py: 1,
                borderBottom: '1px solid #1e1e1e'
            }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 500 }}>
                    Console ({events.length} events)
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Clear console">
                        <IconButton 
                            onClick={clearEvents}
                            size="small"
                            sx={{ color: '#cccccc', '&:hover': { bgcolor: '#3d3d3d' } }}
                        >
                            Clear Console
                        </IconButton>
                    </Tooltip>
                    
                    {(renderProgress.isRendering || isRenderLoopActive) && (
                        <Tooltip title={isStoppingRenderLoop ? "Stopping..." : "Stop Render Loop"}>
                            <IconButton 
                                onClick={stopRenderLoop} 
                                size="small"
                                disabled={isStoppingRenderLoop}
                                sx={{ color: '#f44336', '&:hover': { bgcolor: '#3d3d3d' } }}
                            >
                                <Stop fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    
                    <Tooltip title="Close">
                        <IconButton 
                            onClick={onClose}
                            size="small"
                            sx={{ color: '#cccccc', '&:hover': { bgcolor: '#3d3d3d' } }}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <DialogContent sx={{ p: 0, bgcolor: '#1e1e1e' }}>
                {/* Progress Bar - Simplified */}
                {renderProgress.isRendering && (
                    <Box sx={{ bgcolor: '#2d2d2d', p: 1.5, borderBottom: '1px solid #1e1e1e' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: '12px', color: '#4caf50', fontWeight: 600 }}>
                                🎬 Rendering: {renderProgress.projectName}
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#888' }}>
                                {renderProgress.currentFrame}/{renderProgress.totalFrames} frames • {renderProgress.progress}%
                            </Typography>
                        </Box>

                        <LinearProgress
                            variant="determinate"
                            value={renderProgress.progress}
                            sx={{
                                height: 4,
                                borderRadius: 1,
                                bgcolor: '#1e1e1e',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 1,
                                    bgcolor: '#4caf50'
                                }
                            }}
                        />
                    </Box>
                )}

                {/* Basic render loop status */}
                {!renderProgress.isRendering && isRenderLoopActive && (
                    <Box sx={{ bgcolor: '#2d2d2d', p: 1.5, borderBottom: '1px solid #1e1e1e' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: '12px', color: '#ff9800', fontWeight: 600 }}>
                                🔄 Render Loop Active
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#888' }}>
                                Waiting for progress data...
                            </Typography>
                        </Box>

                        <LinearProgress
                            variant="indeterminate"
                            sx={{
                                height: 4,
                                borderRadius: 1,
                                bgcolor: '#1e1e1e',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 1,
                                    bgcolor: '#ff9800'
                                }
                            }}
                        />
                    </Box>
                )}

                {/* Console output */}
                {renderConsole()}
            </DialogContent>
            </Dialog>
        </>
    );
}