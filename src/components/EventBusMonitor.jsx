import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    IconButton,
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
import './EventBusMonitor.bem.css';

export default function EventBusMonitor({ open, onClose, onOpen, isMinimized, setIsMinimized, isForResumedProject = false, renderLoopActive = false }) {
    const [events, setEvents] = useState([]);
    const [expandedEvents, setExpandedEvents] = useState(new Set());
    const [isStoppingRenderLoop, setIsStoppingRenderLoop] = useState(false);
    const [isRenderLoopActive, setIsRenderLoopActive] = useState(renderLoopActive);
    const [isBufferingPaused, setIsBufferingPaused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [renderKey, setRenderKey] = useState(0); // Force re-render key
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
    
    // UI Display Buffer - batches events before updating display
    const displayBufferRef = useRef([]);
    const displayBufferTimerRef = useRef(null);
    const [displayBufferDelay, setDisplayBufferDelay] = useState(100); // ms - configurable delay
    
    // Flush buffered events to display
    const flushDisplayBuffer = () => {
        if (displayBufferRef.current.length === 0) {
            return;
        }
        
        const eventsToAdd = [...displayBufferRef.current];
        displayBufferRef.current = [];
        
        setEvents(prev => {
            if (isClearingRef.current) {
                return prev;
            }
            const updated = [...eventsToAdd, ...prev].slice(0, maxEvents);
            return updated;
        });
    };
    
    // Helper to add event to display buffer
    const addEventToBuffer = (newEvent) => {
        if (isClearingRef.current) return;
        
        displayBufferRef.current.push(newEvent);
        
        // Schedule flush if not already scheduled
        if (!displayBufferTimerRef.current) {
            displayBufferTimerRef.current = setTimeout(() => {
                displayBufferTimerRef.current = null;
                flushDisplayBuffer();
            }, displayBufferDelay);
        }
    };

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
            
            // Create event object using EventFilterService for categorization
            const newEvent = {
                id: Date.now() + Math.random(),
                type: eventName,
                category: EventFilterService.detectCategory(eventName, data),
                timestamp: eventData.timestamp || new Date().toISOString(),
                data: data,
                eventData: eventData
            };
            
            // Add to display buffer instead of immediately updating state
            addEventToBuffer(newEvent);
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
            
            // Clean up display buffer timer
            if (displayBufferTimerRef.current) {
                clearTimeout(displayBufferTimerRef.current);
                displayBufferTimerRef.current = null;
            }
            
            // Flush any remaining buffered events
            flushDisplayBuffer();
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
                    addEventToBuffer(newEvent);
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
                    addEventToBuffer(newEvent);
                    
                    // Update render loop status
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
                    addEventToBuffer(newEvent);
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
            
            // Reset render loop status
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
            
            // Reset render loop status
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

    // CSS variables for event category colors (memoized to prevent re-renders)
    const eventCategoryColors = React.useMemo(() => ({
        ERROR: 'var(--event-bus-monitor-color-error)',
        WARNING: 'var(--event-bus-monitor-color-warning)',
        SUCCESS: 'var(--event-bus-monitor-color-success)',
        CONSOLE: 'var(--event-bus-monitor-color-info)',
        DEFAULT: 'var(--event-bus-monitor-text-secondary)'
    }), []);

    // Get console-style level color
    const getLevelColor = (category) => {
        const metadata = EventFilterService.getCategoryMetadata(category);
        if (!metadata) return eventCategoryColors.DEFAULT;
        
        // Map to console-style colors
        if (category === 'ERROR') return eventCategoryColors.ERROR;
        if (category === 'WARNING') return eventCategoryColors.WARNING;
        if (category === 'SUCCESS') return eventCategoryColors.SUCCESS;
        if (category === 'CONSOLE') return eventCategoryColors.CONSOLE;
        return metadata.color || eventCategoryColors.DEFAULT;
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
                className="event-bus-monitor__console"
            >
                {events.length === 0 && (
                    <Box className="event-bus-monitor__console-empty">
                        Console is empty. Waiting for events...
                    </Box>
                )}
                
                {events.length > 0 && filteredEvents.length === 0 && (
                    <Box className="event-bus-monitor__console-no-results">
                        No events match your search query "{searchQuery}"
                    </Box>
                )}
                
                {filteredEvents.map((event) => {
                    const isExpanded = expandedEvents.has(event.id);
                    const message = formatMessage(event);
                    const categoryClass = `event-bus-monitor__event-details--${event.category.toLowerCase()}`;
                    
                    return (
                        <Box 
                            key={event.id}
                            className="event-bus-monitor__event"
                        >
                            {/* Console line */}
                            <Box 
                                onClick={() => toggleEventExpansion(event.id)}
                                className="event-bus-monitor__event-line"
                            >
                                {/* Timestamp */}
                                <Typography 
                                    component="span"
                                    className="event-bus-monitor__event-timestamp"
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
                                    className="event-bus-monitor__event-message"
                                >
                                    {message}
                                </Typography>
                                
                                {/* Copy button */}
                                <IconButton
                                    className="event-bus-monitor__event-copy-button"
                                    size="small"
                                    onClick={(e) => copyEventToClipboard(event, e)}
                                >
                                    <ContentCopy className="event-bus-monitor__icon--small" />
                                </IconButton>
                                
                                {/* Expand indicator */}
                                <Typography 
                                    component="span"
                                    className="event-bus-monitor__event-expand-indicator"
                                >
                                    {isExpanded ? '▼' : '▶'}
                                </Typography>
                            </Box>
                            
                            {/* Expanded details */}
                            {isExpanded && (
                                <Box 
                                    className={`event-bus-monitor__event-details ${categoryClass}`}
                                >
                                    <Typography 
                                        component="pre"
                                        className="event-bus-monitor__event-details-json"
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
                    className: 'event-bus-monitor__dialog'
                }}
            >
            {/* Simplified toolbar */}
            <Box className={`event-bus-monitor__toolbar ${isRenderLoopActive ? 'event-bus-monitor__toolbar--active' : ''}`}>
                {/* Top row - Title and controls */}
                <Box className="event-bus-monitor__toolbar-top">
                    <Typography className="event-bus-monitor__title">
                        {isRenderLoopActive && (
                            <span className="event-bus-monitor__status-indicator" />
                        )}
                        Console ({filterEvents(events).length}{events.length !== filterEvents(events).length ? ` / ${events.length}` : ''} events)
                        {isRenderLoopActive && (
                            <span className="event-bus-monitor__status-label">
                                • RENDERING
                            </span>
                        )}
                    </Typography>

                    <Box className="event-bus-monitor__controls">
                        {/* Copy All Button */}
                        <Tooltip title="Copy all visible events to clipboard">
                            <IconButton 
                                onClick={copyAllToClipboard}
                                size="small"
                                disabled={filterEvents(events).length === 0}
                                className="event-bus-monitor__button"
                            >
                                <ContentCopy fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        
                        {/* Normal Stop Button - Only visible when render loop is active */}
                        {isRenderLoopActive && (
                            <Tooltip title={isStoppingRenderLoop ? "Stopping..." : "Stop Render Loop (Graceful)"}>
                                <IconButton 
                                    onClick={stopRenderLoop} 
                                    size="small"
                                    disabled={isStoppingRenderLoop}
                                    className="event-bus-monitor__button event-bus-monitor__button--error"
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
                                className="event-bus-monitor__button event-bus-monitor__button--warning"
                            >
                                <Warning fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        
                        <Tooltip title={isBufferingPaused ? "Resume event buffering" : "Pause event buffering"}>
                            <IconButton 
                                onClick={toggleBuffering}
                                size="small"
                                className={`event-bus-monitor__button ${isBufferingPaused ? 'event-bus-monitor__button--warning' : 'event-bus-monitor__button--success'}`}
                            >
                                {isBufferingPaused ? <PlayArrow fontSize="small" /> : <Pause fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        
                        {/* Display Buffer Delay Control */}
                        <Tooltip title={`UI update delay: ${displayBufferDelay}ms (click to cycle: 50ms → 100ms → 250ms → 500ms)`}>
                            <Box
                                onClick={() => {
                                    const delays = [50, 100, 250, 500];
                                    const currentIndex = delays.indexOf(displayBufferDelay);
                                    const nextIndex = (currentIndex + 1) % delays.length;
                                    setDisplayBufferDelay(delays[nextIndex]);
                                }}
                                className="event-bus-monitor__buffer-control"
                            >
                                <Typography className="event-bus-monitor__buffer-label">
                                    Buffer: {displayBufferDelay}ms
                                </Typography>
                            </Box>
                        </Tooltip>
                        
                        <Tooltip title="Clear console">
                            <IconButton 
                                onClick={clearEvents}
                                size="small"
                                className="event-bus-monitor__button"
                            >
                                <DeleteSweep fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Close">
                            <IconButton 
                                onClick={onClose}
                                size="small"
                                className="event-bus-monitor__button"
                            >
                                <Close fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
                
                {/* Search bar */}
                <Box className="event-bus-monitor__search-row">
                    <TextField
                        className="event-bus-monitor__search-field"
                        fullWidth
                        size="small"
                        placeholder="Filter console output..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search className="event-bus-monitor__icon--large" />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setSearchQuery('')}
                                        className="event-bus-monitor__search-clear-button"
                                    >
                                        <Clear className="event-bus-monitor__icon--medium" />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>
            </Box>

            <DialogContent className="event-bus-monitor__dialog-content">
                {/* Console output */}
                {renderConsole()}
            </DialogContent>
            </Dialog>
        </>
    );
}