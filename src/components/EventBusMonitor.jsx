import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    IconButton,
    LinearProgress,
    Tooltip,
    TextField,
    InputAdornment
} from '@mui/material';
import {
    Clear,
    Stop,
    Close,
    Pause,
    PlayArrow,
    Search,
    ContentCopy,
    DeleteSweep,
    Warning
} from '@mui/icons-material';
import EventCaptureService from '../services/EventCaptureService';
import EventFilterService from '../services/EventFilterService';
import RenderProgressTracker from '../services/RenderProgressTracker';

export default function EventBusMonitor({ open, onClose, onOpen, isMinimized, setIsMinimized, isForResumedProject = false, renderLoopActive = false }) {
    const [events, setEvents] = useState([]);
    const [expandedEvents, setExpandedEvents] = useState(new Set());
    const [isStoppingRenderLoop, setIsStoppingRenderLoop] = useState(false);
    const [isRenderLoopActive, setIsRenderLoopActive] = useState(renderLoopActive);
    const [isBufferingPaused, setIsBufferingPaused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [renderKey, setRenderKey] = useState(0); // Force re-render key
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
    const isClearingRef = useRef(false);
    const clearTimeoutRef = useRef(null);
    const unregisterCallbackRef = useRef(null);
    const handleEventRef = useRef(null);
    // Store EventBusService unsubscribe functions so clearEvents can temporarily disconnect them
    const eventBusUnsubscribersRef = useRef({
        workerStarted: null,
        workerKilled: null,
        workerKillFailed: null,
        renderLoopToggle: null,
        renderLoopError: null,
        renderLoopStart: null
    });
    const eventBusHandlersRef = useRef({});
    const maxEvents = 1000;

    // Load buffered events when monitor opens
    useEffect(() => {
        if (open) {
            // Sync buffering state with service
            setIsBufferingPaused(EventCaptureService.isBufferingPausedState());
            
            // Use setTimeout to defer processing and prevent UI freeze
            setTimeout(() => {
                // Skip if we're currently clearing
                if (isClearingRef.current) {
                    return;
                }
                
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
            // Skip processing if we're currently clearing
            if (isClearingRef.current) {
                return;
            }
            
            const eventName = eventData.eventName || 'unknown';
            const data = eventData.data || eventData;
            
            // Handle buffer:cleared meta-event - clear UI state
            if (eventName === 'buffer:cleared') {
                console.log('🧹 EventBusMonitor: Received buffer:cleared event, clearing UI');
                setEvents([]);
                setExpandedEvents(new Set());
                return; // Don't add this meta-event to the display
            }
            
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
                // Double-check clearing flag inside state updater to prevent race conditions
                if (isClearingRef.current) {
                    return prev; // Don't modify state if clearing
                }
                const updated = [newEvent, ...prev].slice(0, maxEvents);
                return updated;
            });
        };
        
        // Store handler in ref so clearEvents can access it
        handleEventRef.current = handleEvent;
        
        // Register callback with EventCaptureService (always active)
        console.log('🔔 EventBusMonitor: Registering event callback');
        const unregister = EventCaptureService.registerCallback(handleEvent);
        unregisterCallbackRef.current = unregister;
        
        return () => {
            console.log('🧹 EventBusMonitor: Unregistering event callback');
            unregister();
            EventCaptureService.stopMonitoring();
            
            // Clean up clear timeout
            if (clearTimeoutRef.current) {
                clearTimeout(clearTimeoutRef.current);
            }
        };
    }, []); // Empty dependency array - only run once on mount

    // Set up event-driven worker event listeners
    useEffect(() => {
        if (open) {
            // Import EventBusService and set up worker event listeners
            import('../services/EventBusService.js').then(({ default: EventBusService }) => {
                console.log('🎯 EventBusMonitor: Setting up event-driven worker listeners');

                // Create handlers and store them in refs so clearEvents can re-subscribe
                const renderLoopToggleHandler = (payload) => {
                    console.log('🎯 EventBusMonitor: Render loop toggle event received:', payload);
                    setIsRenderLoopActive(payload.isActive);
                };
                
                const renderLoopErrorHandler = (payload) => {
                    console.log('🎯 EventBusMonitor: Render loop error event received:', payload);
                    setIsRenderLoopActive(false);
                };
                
                const renderLoopStartHandler = (payload) => {
                    console.log('🎯 EventBusMonitor: Render loop start event received:', payload);
                    setIsRenderLoopActive(true);
                };
                
                const workerStartedHandler = (data) => {
                    if (isClearingRef.current) return;
                    console.log('🎯 EventBusMonitor: Worker started event:', data);
                    const newEvent = {
                        id: Date.now() + Math.random(),
                        type: 'workerStarted',
                        category: 'WORKER',
                        timestamp: new Date().toISOString(),
                        data: data,
                        raw: JSON.stringify(data, null, 2)
                    };
                    setEvents(prev => {
                        if (isClearingRef.current) return prev;
                        return [newEvent, ...prev].slice(0, maxEvents);
                    });
                };
                
                const workerKilledHandler = (data) => {
                    if (isClearingRef.current) return;
                    console.log('🎯 EventBusMonitor: Worker killed event:', data);
                    const newEvent = {
                        id: Date.now() + Math.random(),
                        type: 'workerKilled',
                        category: 'WORKER',
                        timestamp: new Date().toISOString(),
                        data: data,
                        raw: JSON.stringify(data, null, 2)
                    };
                    setEvents(prev => {
                        if (isClearingRef.current) return prev;
                        return [newEvent, ...prev].slice(0, maxEvents);
                    });
                    
                    // Update render progress to show stopped state
                    setRenderProgress(prev => ({
                        ...prev,
                        isRendering: false
                    }));
                    // Also update render loop status
                    setIsRenderLoopActive(false);
                };
                
                const workerKillFailedHandler = (data) => {
                    if (isClearingRef.current) return;
                    console.log('🎯 EventBusMonitor: Worker kill failed event:', data);
                    const newEvent = {
                        id: Date.now() + Math.random(),
                        type: 'workerKillFailed',
                        category: 'ERROR',
                        timestamp: new Date().toISOString(),
                        data: data,
                        raw: JSON.stringify(data, null, 2)
                    };
                    setEvents(prev => {
                        if (isClearingRef.current) return prev;
                        return [newEvent, ...prev].slice(0, maxEvents);
                    });
                };

                // Store handlers in ref so clearEvents can re-subscribe
                eventBusHandlersRef.current = {
                    renderLoopToggle: renderLoopToggleHandler,
                    renderLoopError: renderLoopErrorHandler,
                    renderLoopStart: renderLoopStartHandler,
                    workerStarted: workerStartedHandler,
                    workerKilled: workerKilledHandler,
                    workerKillFailed: workerKillFailedHandler,
                    EventBusService: EventBusService // Store service reference too
                };

                // Subscribe and store unsubscribe functions in refs
                eventBusUnsubscribersRef.current.renderLoopToggle = EventBusService.subscribe(
                    'renderloop:toggled', 
                    renderLoopToggleHandler, 
                    { component: 'EventBusMonitor' }
                );

                eventBusUnsubscribersRef.current.renderLoopError = EventBusService.subscribe(
                    'renderloop:error', 
                    renderLoopErrorHandler, 
                    { component: 'EventBusMonitor' }
                );

                eventBusUnsubscribersRef.current.renderLoopStart = EventBusService.subscribe(
                    'render.loop.start', 
                    renderLoopStartHandler, 
                    { component: 'EventBusMonitor' }
                );

                eventBusUnsubscribersRef.current.workerStarted = EventBusService.subscribe(
                    'workerStarted', 
                    workerStartedHandler, 
                    { component: 'EventBusMonitor' }
                );

                eventBusUnsubscribersRef.current.workerKilled = EventBusService.subscribe(
                    'workerKilled', 
                    workerKilledHandler, 
                    { component: 'EventBusMonitor' }
                );

                eventBusUnsubscribersRef.current.workerKillFailed = EventBusService.subscribe(
                    'workerKillFailed', 
                    workerKillFailedHandler, 
                    { component: 'EventBusMonitor' }
                );

            }).catch(error => {
                console.error('❌ EventBusMonitor: Failed to set up worker event listeners:', error);
            });

            return () => {
                console.log('🧹 EventBusMonitor: Cleaning up event-driven worker listeners');
                const unsubs = eventBusUnsubscribersRef.current;
                if (unsubs.workerStarted) unsubs.workerStarted();
                if (unsubs.workerKilled) unsubs.workerKilled();
                if (unsubs.workerKillFailed) unsubs.workerKillFailed();
                if (unsubs.renderLoopToggle) unsubs.renderLoopToggle();
                if (unsubs.renderLoopError) unsubs.renderLoopError();
                if (unsubs.renderLoopStart) unsubs.renderLoopStart();
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
        // Prevent multiple simultaneous clear operations
        if (isClearingRef.current) {
            console.log('⚠️ EventBusMonitor: Clear already in progress, ignoring...');
            return;
        }
        
        console.log('🧹🧹🧹 EventBusMonitor: Starting NUCLEAR clear operation...');
        
        // Clear any pending timeout
        if (clearTimeoutRef.current) {
            clearTimeout(clearTimeoutRef.current);
        }
        
        // STEP 1A: Completely unregister the EventCaptureService callback FIRST
        // This must happen BEFORE setting the clearing flag to prevent race conditions
        if (unregisterCallbackRef.current) {
            console.log('🛑 EventBusMonitor: Unregistering EventCaptureService callback');
            unregisterCallbackRef.current();
            unregisterCallbackRef.current = null;
        }
        
        // STEP 1B: Completely unregister ALL EventBusService subscriptions
        console.log('🛑 EventBusMonitor: Unregistering ALL EventBusService subscriptions');
        const unsubs = eventBusUnsubscribersRef.current;
        if (unsubs.workerStarted) {
            unsubs.workerStarted();
            unsubs.workerStarted = null;
        }
        if (unsubs.workerKilled) {
            unsubs.workerKilled();
            unsubs.workerKilled = null;
        }
        if (unsubs.workerKillFailed) {
            unsubs.workerKillFailed();
            unsubs.workerKillFailed = null;
        }
        if (unsubs.renderLoopToggle) {
            unsubs.renderLoopToggle();
            unsubs.renderLoopToggle = null;
        }
        if (unsubs.renderLoopError) {
            unsubs.renderLoopError();
            unsubs.renderLoopError = null;
        }
        if (unsubs.renderLoopStart) {
            unsubs.renderLoopStart();
            unsubs.renderLoopStart = null;
        }
        
        console.log('🔇 EventBusMonitor: ALL event sources disconnected');
        
        // STEP 1C: NOW set the clearing flag after callbacks are unregistered
        isClearingRef.current = true;
        
        // STEP 2: Remember if buffering was already paused
        const wasBufferingPaused = EventCaptureService.isBufferingPausedState();
        
        // STEP 3: Pause buffering to stop new events from being stored
        if (!wasBufferingPaused) {
            EventCaptureService.pauseBuffering();
        }
        
        // STEP 4: Clear the service buffer
        EventCaptureService.clearBuffer(true);
        
        // STEP 5: Use flushSync to force IMMEDIATE synchronous state updates
        // This bypasses React's batching and applies changes instantly
        console.log('🧹 EventBusMonitor: Forcing SYNCHRONOUS state clear with flushSync...');
        flushSync(() => {
            setEvents([]);
            setExpandedEvents(new Set());
            setSearchQuery('');
            setRenderKey(prev => prev + 1); // Force complete re-render
        });
        console.log('✅ EventBusMonitor: First synchronous clear complete');
        
        // STEP 6: Set up CONTINUOUS clearing loop - clear every 25ms for 1.5 seconds
        // This aggressively catches any stragglers that slip through
        const clearIntervalId = setInterval(() => {
            flushSync(() => {
                setEvents([]);
                setExpandedEvents(new Set());
                setRenderKey(prev => prev + 1); // Force re-render on each clear
            });
        }, 25); // Clear every 25ms
        
        console.log('🔄 EventBusMonitor: Started continuous clearing loop (every 25ms)');
        console.log('✅ EventBusMonitor: All events cleared (UI + buffer + ALL callbacks unregistered)');
        
        // STEP 7: Wait for a long time before re-registering to ensure complete silence
        clearTimeoutRef.current = setTimeout(() => {
            // Stop the continuous clearing loop
            clearInterval(clearIntervalId);
            console.log('🛑 EventBusMonitor: Stopped continuous clearing loop');
            
            // One final flushSync clear before re-registration
            flushSync(() => {
                setEvents([]);
                setExpandedEvents(new Set());
                setRenderKey(prev => prev + 1); // Force final re-render
            });
            console.log('🧹 EventBusMonitor: Final clear before re-registration');
            
            console.log('🔓 EventBusMonitor: Clear operation complete, re-registering ALL callbacks...');
            
            // Re-register the EventCaptureService callback
            if (handleEventRef.current) {
                const newUnregister = EventCaptureService.registerCallback(handleEventRef.current);
                unregisterCallbackRef.current = newUnregister;
                console.log('✅ EventBusMonitor: EventCaptureService callback re-registered');
            }
            
            // Re-register ALL EventBusService subscriptions
            const handlers = eventBusHandlersRef.current;
            if (handlers.EventBusService) {
                const EventBusService = handlers.EventBusService;
                
                eventBusUnsubscribersRef.current.renderLoopToggle = EventBusService.subscribe(
                    'renderloop:toggled', 
                    handlers.renderLoopToggle, 
                    { component: 'EventBusMonitor' }
                );
                
                eventBusUnsubscribersRef.current.renderLoopError = EventBusService.subscribe(
                    'renderloop:error', 
                    handlers.renderLoopError, 
                    { component: 'EventBusMonitor' }
                );
                
                eventBusUnsubscribersRef.current.renderLoopStart = EventBusService.subscribe(
                    'render.loop.start', 
                    handlers.renderLoopStart, 
                    { component: 'EventBusMonitor' }
                );
                
                eventBusUnsubscribersRef.current.workerStarted = EventBusService.subscribe(
                    'workerStarted', 
                    handlers.workerStarted, 
                    { component: 'EventBusMonitor' }
                );
                
                eventBusUnsubscribersRef.current.workerKilled = EventBusService.subscribe(
                    'workerKilled', 
                    handlers.workerKilled, 
                    { component: 'EventBusMonitor' }
                );
                
                eventBusUnsubscribersRef.current.workerKillFailed = EventBusService.subscribe(
                    'workerKillFailed', 
                    handlers.workerKillFailed, 
                    { component: 'EventBusMonitor' }
                );
                
                console.log('✅ EventBusMonitor: ALL EventBusService subscriptions re-registered');
            }
            
            // Resume buffering if it wasn't paused before
            if (!wasBufferingPaused) {
                EventCaptureService.resumeBuffering();
                console.log('▶️ EventBusMonitor: Buffering resumed after clear');
            }
            
            // Clear the clearing flag
            isClearingRef.current = false;
            console.log('🎉 EventBusMonitor: NUCLEAR clear complete - all systems restored');
        }, 1500);
    };
    
    const toggleBuffering = () => {
        if (isBufferingPaused) {
            EventCaptureService.resumeBuffering();
            setIsBufferingPaused(false);
            console.log('▶️ EventBusMonitor: Event buffering resumed');
        } else {
            EventCaptureService.pauseBuffering();
            setIsBufferingPaused(true);
            console.log('⏸️ EventBusMonitor: Event buffering paused');
        }
    };

    const stopRenderLoop = async () => {
        if (isStoppingRenderLoop) return;
        
        setIsStoppingRenderLoop(true);
        try {
            console.log('🛑 EventBusMonitor: Stopping render loop gracefully...');
            
            // Try the new event-driven approach first - graceful termination only
            try {
                const { killAllWorkers } = await import('../core/events/LoopTerminator.js');
                console.log('🛑 EventBusMonitor: Using graceful worker termination');
                killAllWorkers('SIGTERM');
                
                // Also call the API for backward compatibility
                const result = await window.api.stopRenderLoop();
                console.log('✅ EventBusMonitor: Render loop stopped gracefully:', result);
            } catch (importError) {
                console.warn('⚠️ EventBusMonitor: Enhanced termination not available, using fallback:', importError);
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
            
            // Emit event to notify other components
            import('../services/EventBusService.js').then(({ default: EventBusService }) => {
                EventBusService.emit('renderloop:toggled', {
                    isActive: false
                }, { source: 'EventBusMonitor', reason: 'manual_stop' });
            });
        } catch (error) {
            console.error('❌ EventBusMonitor: Failed to stop render loop:', error);
        } finally {
            setIsStoppingRenderLoop(false);
        }
    };

    // Emergency stop function (brute force)
    const emergencyStopRenderLoop = async () => {
        if (isStoppingRenderLoop) {
            console.log('⚠️ EventBusMonitor: Already stopping render loop, ignoring emergency request');
            return;
        }
        
        console.log('🚨 EventBusMonitor: EMERGENCY STOP - Killing all workers with brute force...');
        setIsStoppingRenderLoop(true);
        
        try {
            // Use brute force termination immediately
            try {
                const { emergencyStopAll, performBruteForceCleanup } = await import('../core/events/LoopTerminator.js');
                console.log('🚨 EventBusMonitor: Using brute force worker termination');
                
                // Emergency stop - use brute force immediately
                emergencyStopAll('user_emergency_stop');
                
                // Perform immediate brute force cleanup
                await performBruteForceCleanup();
                
                // Additional cleanup for resumed projects
                console.log('🚨 EventBusMonitor: Performing additional cleanup for resumed projects...');
                
                // Call the API stop method which should trigger killResumedProjectProcesses
                const result = await window.api.stopRenderLoop();
                console.log('✅ EventBusMonitor: Emergency stop completed:', result);
                
                // Wait a bit more then do final cleanup
                setTimeout(async () => {
                    await performBruteForceCleanup();
                }, 1000);
                
            } catch (importError) {
                console.warn('⚠️ EventBusMonitor: Enhanced emergency termination not available, using fallback:', importError);
                // Fallback to old method
                const result = await window.api.stopRenderLoop();
                console.log('✅ EventBusMonitor: Emergency stop via fallback:', result);
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
            
            // Emit event to notify other components
            import('../services/EventBusService.js').then(({ default: EventBusService }) => {
                EventBusService.emit('renderloop:toggled', {
                    isActive: false
                }, { source: 'EventBusMonitor', reason: 'emergency_stop' });
            });
            
        } catch (error) {
            console.error('❌ EventBusMonitor: Error during emergency stop:', error);
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

    // Filter events based on search query
    const filterEvents = (events) => {
        if (!searchQuery.trim()) return events;
        
        const query = searchQuery.toLowerCase();
        return events.filter(event => {
            const message = formatMessage(event).toLowerCase();
            const type = event.type.toLowerCase();
            const category = event.category.toLowerCase();
            const timestamp = new Date(event.timestamp).toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3
            }).toLowerCase();
            const dataStr = JSON.stringify(event.data).toLowerCase();
            
            return message.includes(query) || 
                   type.includes(query) || 
                   category.includes(query) ||
                   timestamp.includes(query) ||
                   dataStr.includes(query);
        });
    };

    // Copy event to clipboard
    const copyEventToClipboard = (event, e) => {
        e.stopPropagation();
        const timestamp = new Date(event.timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
        const message = formatMessage(event);
        const text = `[${timestamp}] ${message}`;
        
        navigator.clipboard.writeText(text).then(() => {
            console.log('✅ Event copied to clipboard');
        }).catch(err => {
            console.error('❌ Failed to copy event:', err);
        });
    };

    // Copy all visible events to clipboard
    const copyAllToClipboard = () => {
        const filteredEvents = filterEvents(events);
        const text = filteredEvents.map(event => {
            const timestamp = new Date(event.timestamp).toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3
            });
            const message = formatMessage(event);
            return `[${timestamp}] ${message}`;
        }).join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            console.log('✅ All events copied to clipboard');
        }).catch(err => {
            console.error('❌ Failed to copy events:', err);
        });
    };

    // Console-style rendering (Chrome DevTools inspired)
    const renderConsole = () => {
        const filteredEvents = filterEvents(events);
        
        return (
            <Box 
                key={renderKey} // Force complete re-render when renderKey changes
                ref={eventListRef}
                sx={{ 
                    height: 'calc(100vh - 200px)',
                    overflow: 'auto',
                    bgcolor: '#1e1e1e',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '12px',
                    color: '#cccccc',
                    userSelect: 'text',
                    cursor: 'text'
                }}
            >
                {events.length === 0 && (
                    <Box sx={{ p: 2, color: '#888', textAlign: 'center' }}>
                        Console is empty. Waiting for events...
                    </Box>
                )}
                
                {events.length > 0 && filteredEvents.length === 0 && (
                    <Box sx={{ p: 2, color: '#888', textAlign: 'center' }}>
                        No events match your search query "{searchQuery}"
                    </Box>
                )}
                
                {filteredEvents.map((event) => {
                    const isExpanded = expandedEvents.has(event.id);
                    const levelColor = getLevelColor(event.category);
                    const message = formatMessage(event);
                    
                    return (
                        <Box 
                            key={event.id}
                            sx={{
                                borderBottom: '1px solid #2a2a2a',
                                '&:hover': {
                                    bgcolor: '#252525'
                                },
                                '&:hover .copy-button': {
                                    opacity: 1
                                }
                            }}
                        >
                            {/* Console line */}
                            <Box 
                                onClick={() => toggleEventExpansion(event.id)}
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'flex-start', 
                                    gap: 1.5,
                                    py: 0.5,
                                    px: 1,
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                            >
                                {/* Timestamp */}
                                <Typography 
                                    component="span"
                                    sx={{ 
                                        color: '#6e7681',
                                        fontSize: '11px',
                                        minWidth: '90px',
                                        flexShrink: 0,
                                        fontFamily: 'inherit',
                                        userSelect: 'text'
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
                                
                                {/* Message */}
                                <Typography 
                                    component="span"
                                    sx={{ 
                                        color: '#d4d4d4',
                                        flex: 1,
                                        wordBreak: 'break-word',
                                        fontFamily: 'inherit',
                                        userSelect: 'text',
                                        lineHeight: 1.5
                                    }}
                                >
                                    {message}
                                </Typography>
                                
                                {/* Copy button */}
                                <IconButton
                                    className="copy-button"
                                    size="small"
                                    onClick={(e) => copyEventToClipboard(event, e)}
                                    sx={{
                                        opacity: 0,
                                        transition: 'opacity 0.2s',
                                        color: '#6e7681',
                                        padding: '2px',
                                        '&:hover': {
                                            color: '#d4d4d4',
                                            bgcolor: '#3a3a3a'
                                        }
                                    }}
                                >
                                    <ContentCopy sx={{ fontSize: '14px' }} />
                                </IconButton>
                                
                                {/* Expand indicator */}
                                <Typography 
                                    component="span"
                                    sx={{ 
                                        color: '#6e7681',
                                        fontSize: '10px',
                                        flexShrink: 0,
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    {isExpanded ? '▼' : '▶'}
                                </Typography>
                            </Box>
                            
                            {/* Expanded details */}
                            {isExpanded && (
                                <Box 
                                    sx={{ 
                                        mt: 0.5,
                                        mb: 0.5,
                                        ml: 4,
                                        mr: 1,
                                        p: 1.5,
                                        bgcolor: '#0d1117',
                                        borderLeft: `3px solid ${levelColor}`,
                                        borderRadius: '4px',
                                        border: '1px solid #30363d'
                                    }}
                                >
                                    <Typography 
                                        component="pre"
                                        sx={{
                                            fontFamily: 'inherit',
                                            fontSize: '11px',
                                            color: '#8b949e',
                                            margin: 0,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            userSelect: 'text',
                                            lineHeight: 1.6
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
    };

    return (
        <>
            {/* CSS Animation for pulsing indicator */}
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% {
                            opacity: 1;
                            transform: scale(1);
                        }
                        50% {
                            opacity: 0.5;
                            transform: scale(1.2);
                        }
                    }
                `}
            </style>
            
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
                flexDirection: 'column',
                bgcolor: (renderProgress.isRendering || isRenderLoopActive) ? '#3d2d2d' : '#2d2d2d',
                color: '#cccccc',
                borderBottom: '1px solid #1e1e1e',
                transition: 'background-color 0.3s ease'
            }}>
                {/* Top row - Title and controls */}
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1
                }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {(renderProgress.isRendering || isRenderLoopActive) && (
                            <span style={{ 
                                display: 'inline-block', 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                backgroundColor: '#f44336',
                                animation: 'pulse 1.5s ease-in-out infinite'
                            }} />
                        )}
                        Console ({filterEvents(events).length}{events.length !== filterEvents(events).length ? ` / ${events.length}` : ''} events)
                        {(renderProgress.isRendering || isRenderLoopActive) && (
                            <span style={{ color: '#f44336', fontSize: '11px', fontWeight: 600 }}>
                                • RENDERING
                            </span>
                        )}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {/* Copy All Button */}
                        <Tooltip title="Copy all visible events to clipboard">
                            <IconButton 
                                onClick={copyAllToClipboard}
                                size="small"
                                disabled={filterEvents(events).length === 0}
                                sx={{ 
                                    color: '#cccccc',
                                    '&:hover': { bgcolor: '#3d3d3d' },
                                    '&:disabled': { color: '#555' }
                                }}
                            >
                                <ContentCopy fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        
                        {/* Normal Stop Button - Only visible when render loop is active */}
                        {(renderProgress.isRendering || isRenderLoopActive) && (
                            <Tooltip title={isStoppingRenderLoop ? "Stopping..." : "Stop Render Loop (Graceful)"}>
                                <IconButton 
                                    onClick={stopRenderLoop} 
                                    size="small"
                                    disabled={isStoppingRenderLoop}
                                    sx={{ 
                                        color: '#f44336',
                                        '&:hover': { bgcolor: '#3d3d3d' },
                                        '&:disabled': { color: '#555' }
                                    }}
                                >
                                    <Stop fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        
                        {/* Emergency Stop Button - Always visible for force kill */}
                        <Tooltip title={isStoppingRenderLoop ? "Stopping..." : "Emergency Stop (Force Kill All Workers)"}>
                            <IconButton 
                                onClick={emergencyStopRenderLoop} 
                                size="small"
                                disabled={isStoppingRenderLoop}
                                sx={{ 
                                    color: '#ff5722',
                                    '&:hover': { bgcolor: '#3d3d3d' },
                                    '&:disabled': { color: '#555' }
                                }}
                            >
                                <Warning fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        
                        <Tooltip title={isBufferingPaused ? "Resume event buffering" : "Pause event buffering"}>
                            <IconButton 
                                onClick={toggleBuffering}
                                size="small"
                                sx={{ 
                                    color: isBufferingPaused ? '#ff9800' : '#4caf50',
                                    '&:hover': { bgcolor: '#3d3d3d' }
                                }}
                            >
                                {isBufferingPaused ? <PlayArrow fontSize="small" /> : <Pause fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Clear console">
                            <IconButton 
                                onClick={clearEvents}
                                size="small"
                                sx={{ 
                                    color: '#ffa726',
                                    '&:hover': { 
                                        bgcolor: '#3d3d3d',
                                        color: '#ffb74d'
                                    } 
                                }}
                            >
                                <DeleteSweep fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        
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
                
                {/* Search bar */}
                <Box sx={{ px: 2, pb: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Filter console output..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search sx={{ fontSize: '18px', color: '#6e7681' }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setSearchQuery('')}
                                        sx={{ 
                                            padding: '4px',
                                            color: '#6e7681',
                                            '&:hover': { color: '#d4d4d4' }
                                        }}
                                    >
                                        <Clear sx={{ fontSize: '16px' }} />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#1e1e1e',
                                color: '#d4d4d4',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                fontSize: '12px',
                                '& fieldset': {
                                    borderColor: '#30363d'
                                },
                                '&:hover fieldset': {
                                    borderColor: '#6e7681'
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#58a6ff'
                                }
                            },
                            '& .MuiOutlinedInput-input': {
                                padding: '6px 8px'
                            }
                        }}
                    />
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