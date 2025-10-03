import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    TextField,
    FormControlLabel,
    Checkbox,
    Chip,
    IconButton,
    Tabs,
    Tab,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    Badge,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup,
    LinearProgress,
    Collapse
} from '@mui/material';
import {
    Clear,
    Download,
    FilterList,
    Pause,
    PlayArrow,
    Search,
    Refresh,
    ExpandMore,
    ExpandLess,
    BugReport,
    Speed,
    Memory,
    Error,
    Info,
    CheckCircle,
    Warning,
    Timeline,
    Stop,
    Minimize,
    Maximize
} from '@mui/icons-material';
import RenderProgressWidget from './RenderProgressWidget';
import EventCaptureService from '../services/EventCaptureService';
import EventFilterService from '../services/EventFilterService';
import EventExportService from '../services/EventExportService';
import RenderProgressTracker from '../services/RenderProgressTracker';

export default function EventBusMonitor({ open, onClose, onOpen, isMinimized, setIsMinimized, isForResumedProject = false, renderLoopActive = false }) {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState(
        isForResumedProject ? EventFilterService.getDefaultCategories(true) : EventFilterService.getDefaultCategories(false)
    );
    const [expandedEvents, setExpandedEvents] = useState(new Set());
    const [autoScroll, setAutoScroll] = useState(true);
    const [showTimestamps, setShowTimestamps] = useState(true);
    const [eventStats, setEventStats] = useState({});
    const [isStoppingRenderLoop, setIsStoppingRenderLoop] = useState(false);
    const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);
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
            console.log('📂 EventBusMonitor: Loading buffered events from EventCaptureService');
            
            // Load all buffered events
            const bufferedEvents = EventCaptureService.getBufferedEvents();
            console.log(`📂 EventBusMonitor: Found ${bufferedEvents.length} buffered events`);
            
            // Convert buffered events to display format
            const displayEvents = bufferedEvents.map(eventData => {
                const eventName = eventData.eventName || 'unknown';
                const data = eventData.data || eventData;
                
                return {
                    id: Date.now() + Math.random(),
                    type: eventName,
                    category: EventFilterService.detectCategory(eventName, data),
                    timestamp: eventData.timestamp || new Date().toISOString(),
                    data: data,
                    raw: JSON.stringify(eventData, null, 2)
                };
            });
            
            setEvents(displayEvents);
            updateStats(displayEvents);
        }
    }, [open]);

    // Subscribe to live events (always active, not dependent on open state)
    useEffect(() => {
        // Event handler that processes incoming events
        const handleEvent = (eventData) => {
            console.log('📨 EventBusMonitor received event:', eventData);

            // Track render progress using RenderProgressTracker
            const eventName = eventData.eventName || 'unknown';
            const data = eventData.data || eventData;

            if (eventName === 'render.loop.start') {
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

            // Only update UI if monitor is open and not paused
            if (open && !isPaused) {
                // Create event object using EventFilterService for categorization
                const newEvent = {
                    id: Date.now() + Math.random(),
                    type: eventName,
                    category: EventFilterService.detectCategory(eventName, data),
                    timestamp: eventData.timestamp || new Date().toISOString(),
                    data: data,
                    raw: JSON.stringify(eventData, null, 2)
                };

                setEvents(prev => {
                    const updated = [newEvent, ...prev].slice(0, maxEvents);
                    updateStats(updated);
                    return updated;
                });
            }
        };

        // Register callback with EventCaptureService (always active)
        console.log('🔔 EventBusMonitor: Registering event callback');
        const unregister = EventCaptureService.registerCallback(handleEvent);

        return () => {
            console.log('🧹 EventBusMonitor: Unregistering event callback');
            unregister();
        };
    }, [open, isPaused]);

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
        // Filter events using EventFilterService
        const filtered = EventFilterService.applyFilters(events, searchTerm, selectedCategories);
        setFilteredEvents(filtered);
    }, [events, searchTerm, selectedCategories]);

    useEffect(() => {
        // Auto-scroll to latest event
        if (autoScroll && eventListRef.current && filteredEvents.length > 0) {
            eventListRef.current.scrollTop = 0;
        }
    }, [filteredEvents, autoScroll]);

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

    const updateStats = (eventList) => {
        const stats = {};
        eventList.forEach(event => {
            if (!stats[event.category]) {
                stats[event.category] = { count: 0, types: {} };
            }
            stats[event.category].count++;

            if (!stats[event.category].types[event.type]) {
                stats[event.category].types[event.type] = 0;
            }
            stats[event.category].types[event.type]++;
        });
        setEventStats(stats);
    };

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
        setFilteredEvents([]);
        setEventStats({});
        // Also clear the persistent buffer in EventCaptureService
        EventCaptureService.clearBuffer();
        console.log('🧹 EventBusMonitor: Cleared all events including buffer');
    };

    const exportEvents = () => {
        EventExportService.exportJSON(events);
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

    const formatEventData = (data) => {
        if (data === null || data === undefined) return 'null';
        if (typeof data === 'string') return data;
        if (typeof data === 'number') return data.toString();
        if (typeof data === 'boolean') return data ? 'true' : 'false';

        // Format arrays
        if (Array.isArray(data)) {
            if (data.length === 0) return '[]';
            if (data.length <= 3) {
                return `[${data.map(item => formatEventData(item)).join(', ')}]`;
            }
            return `[${data.length} items]`;
        }

        // Format objects
        if (typeof data === 'object') {
            // Format specific event data types
            if (data.frameNumber !== undefined) {
                return `Frame ${data.frameNumber}${data.effectName ? ` - ${data.effectName}` : ''}`;
            }
            if (data.progress !== undefined) {
                return `Progress: ${data.progress}%`;
            }
            if (data.error) {
                return `Error: ${data.error}`;
            }
            if (data.message) {
                return data.message;
            }

            // Default to showing key-value pairs properly formatted
            const keys = Object.keys(data).slice(0, 3);
            const formatted = keys.map(key => {
                const value = data[key];
                const formattedValue = typeof value === 'object'
                    ? (Array.isArray(value) ? `[${value.length} items]` : '{...}')
                    : (typeof value === 'string' ? `"${value}"` : String(value));
                return `${key}: ${formattedValue}`;
            }).join(', ');

            if (Object.keys(data).length > 3) {
                return `${formatted}, ...`;
            }
            return formatted;
        }

        return String(data);
    };

    const getCategoryIcon = (category) => {
        const metadata = EventFilterService.getCategoryMetadata(category);
        return metadata ? metadata.icon : '📝';
    };

    const renderEventList = () => (
        <List ref={eventListRef} sx={{ maxHeight: 500, overflow: 'auto', bgcolor: 'background.paper' }}>
            {filteredEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                    <ListItem
                        component="div"
                        onClick={() => toggleEventExpansion(event.id)}
                        sx={{
                            bgcolor: index % 2 === 0 ? 'action.hover' : 'transparent',
                            '&:hover': { bgcolor: 'action.selected' }
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                            <Typography sx={{ fontSize: '1.2em' }}>
                                {getCategoryIcon(event.category)}
                            </Typography>

                            {showTimestamps && (
                                <Typography variant="caption" sx={{ minWidth: 150, color: 'text.secondary' }}>
                                    {new Date(event.timestamp).toLocaleTimeString('en-US', {
                                        hour12: true,
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        fractionalSecondDigits: 3
                                    })}
                                </Typography>
                            )}

                            <Chip
                                label={event.category}
                                size="small"
                                sx={{
                                    bgcolor: EventFilterService.getCategoryMetadata(event.category)?.color + '33',
                                    color: EventFilterService.getCategoryMetadata(event.category)?.color,
                                    minWidth: 90
                                }}
                            />

                            <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                                <strong>{event.type}</strong>
                                {!expandedEvents.has(event.id) && event.data && (
                                    <span style={{ marginLeft: 8, color: '#888' }}>
                                        {formatEventData(event.data)}
                                    </span>
                                )}
                            </Typography>

                            <IconButton size="small">
                                {expandedEvents.has(event.id) ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                        </Box>
                    </ListItem>

                    {expandedEvents.has(event.id) && (
                        <ListItem sx={{ bgcolor: 'action.hover' }}>
                            <Paper sx={{ width: '100%', p: 2, bgcolor: 'background.default' }}>
                                <Typography variant="caption" component="pre" sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.8em',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all'
                                }}>
                                    {event.raw}
                                </Typography>
                            </Paper>
                        </ListItem>
                    )}

                    {index < filteredEvents.length - 1 && <Divider />}
                </React.Fragment>
            ))}

            {filteredEvents.length === 0 && (
                <ListItem>
                    <ListItemText
                        primary="No events to display"
                        secondary={isPaused ? "Event capture is paused" : "Waiting for events..."}
                        sx={{ textAlign: 'center' }}
                    />
                </ListItem>
            )}
        </List>
    );

    const renderStatsPanel = () => (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Event Statistics</Typography>
            {Object.entries(eventStats).map(([category, stats]) => (
                <Paper key={category} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography sx={{ fontSize: '1.2em' }}>
                            {getCategoryIcon(category)}
                        </Typography>
                        <Typography variant="subtitle1">
                            {EventFilterService.getCategoryMetadata(category)?.label || category}
                        </Typography>
                        <Chip label={stats.count} size="small" color="primary" />
                    </Box>

                    <Box sx={{ pl: 4 }}>
                        {Object.entries(stats.types).slice(0, 5).map(([type, count]) => (
                            <Typography key={type} variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                                {type}: {count}
                            </Typography>
                        ))}
                        {Object.keys(stats.types).length > 5 && (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                ...and {Object.keys(stats.types).length - 5} more
                            </Typography>
                        )}
                    </Box>
                </Paper>
            ))}

            {Object.keys(eventStats).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No events captured yet
                </Typography>
            )}
        </Box>
    );

    return (
        <>
            {/* Progress Widget - Show when modal is closed or minimized and render is active */}
            {(!open || isMinimized) && (renderProgress.isRendering || isRenderLoopActive) && (
                <RenderProgressWidget
                    renderProgress={renderProgress}
                    onOpen={() => {
                        if (setIsMinimized) setIsMinimized(false);
                        if (onOpen) onOpen();
                    }}
                    onStop={stopRenderLoop}
                    isStoppingRenderLoop={isStoppingRenderLoop}
                    isRenderLoopActive={isRenderLoopActive}
                />
            )}

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
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BugReport />
                        <Typography variant="h6">Rendering Loop</Typography>
                        <Badge badgeContent={events.length} color="primary" max={999}>
                            <Info />
                        </Badge>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {(renderProgress.isRendering || isRenderLoopActive) && (
                            <Tooltip title={isStoppingRenderLoop ? "Stopping..." : "Stop Render Loop"}>
                                <IconButton 
                                    onClick={stopRenderLoop} 
                                    color="error"
                                    disabled={isStoppingRenderLoop}
                                >
                                    <Stop />
                                </IconButton>
                            </Tooltip>
                        )}
                        {setIsMinimized && (
                            <Tooltip title="Minimize">
                                <IconButton onClick={() => setIsMinimized(true)}>
                                    <Minimize />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Progress Bar - Show detailed progress when available, or basic status when render loop is active */}
                {renderProgress.isRendering && (
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.dark', color: 'primary.contrastText' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                🎬 Rendering: {renderProgress.projectName}
                            </Typography>
                            <Typography variant="caption">
                                {renderProgress.currentFrame}/{renderProgress.totalFrames} frames
                            </Typography>
                        </Box>

                        <LinearProgress
                            variant="determinate"
                            value={renderProgress.progress}
                            sx={{
                                height: 8,
                                borderRadius: 1,
                                mb: 1,
                                bgcolor: 'rgba(255,255,255,0.2)',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 1,
                                    bgcolor: '#00ff88'
                                }
                            }}
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                {renderProgress.progress}% complete
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                {renderProgress.fps > 0 && (
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                        {renderProgress.fps} fps
                                    </Typography>
                                )}
                                {renderProgress.lastFrameTime > 0 && (
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                        {renderProgress.lastFrameTime}ms/frame
                                    </Typography>
                                )}
                                {renderProgress.eta && (
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                        ETA: {renderProgress.eta}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Paper>
                )}

                {/* Basic render loop status when active but no detailed progress */}
                {!renderProgress.isRendering && isRenderLoopActive && (
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.dark', color: 'warning.contrastText' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                🔄 Render Loop Active
                            </Typography>
                            <Typography variant="caption">
                                Waiting for progress data...
                            </Typography>
                        </Box>

                        <LinearProgress
                            variant="indeterminate"
                            sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: 'rgba(255,255,255,0.2)',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 1,
                                    bgcolor: '#ff9800'
                                }
                            }}
                        />
                    </Paper>
                )}

                <Collapse in={!isMinimized}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
                            <Tab label={`Live Events (${filteredEvents.length})`} />
                            <Tab label="Statistics" />
                        </Tabs>
                    </Box>

                    {selectedTab === 0 && (
                        <>
                            {/* Compact Filters Section */}
                            <Paper 
                                elevation={1}
                                sx={{ 
                                    p: 1.5, 
                                    mb: 2, 
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Box 
                                        sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 1,
                                            cursor: 'pointer',
                                            '&:hover': { opacity: 0.8 }
                                        }}
                                        onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                                    >
                                        <Typography 
                                            variant="subtitle2" 
                                            sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 1,
                                                fontWeight: 600,
                                                color: 'text.primary'
                                            }}
                                        >
                                            <FilterList fontSize="small" />
                                            Event Filters
                                        </Typography>
                                        <IconButton size="small">
                                            {isFiltersCollapsed ? <ExpandMore /> : <ExpandLess />}
                                        </IconButton>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => setSelectedCategories(EventFilterService.getAllCategoryKeys())}
                                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => setSelectedCategories([])}
                                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                        >
                                            Clear All
                                        </Button>
                                    </Box>
                                </Box>
                                
                                <Collapse in={!isFiltersCollapsed}>
                                    {/* Search and Options Row */}
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <TextField
                                            variant="outlined"
                                            size="small"
                                            placeholder="Search events..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            InputProps={{
                                                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                                            }}
                                            sx={{ 
                                                flex: 1, 
                                                minWidth: 250,
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1
                                                }
                                            }}
                                        />

                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={autoScroll}
                                                        onChange={(e) => setAutoScroll(e.target.checked)}
                                                        size="small"
                                                    />
                                                }
                                                label="Auto-scroll"
                                                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                                            />

                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={showTimestamps}
                                                        onChange={(e) => setShowTimestamps(e.target.checked)}
                                                        size="small"
                                                    />
                                                }
                                                label="Timestamps"
                                                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Category Filters */}
                                    <Box sx={{ mb: 1 }}>
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                mb: 1, 
                                                color: 'text.secondary',
                                                fontWeight: 500,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                                display: 'block'
                                            }}
                                        >
                                            Categories ({selectedCategories.length} selected)
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {EventFilterService.getAllCategories().map(([key, config]) => (
                                                <Chip
                                                    key={key}
                                                    label={`${config.icon} ${config.label}`}
                                                    variant={selectedCategories.includes(key) ? "filled" : "outlined"}
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedCategories(prev =>
                                                            prev.includes(key)
                                                                ? prev.filter(c => c !== key)
                                                                : [...prev, key]
                                                        );
                                                    }}
                                                    sx={{
                                                        borderRadius: 1,
                                                        fontWeight: 500,
                                                        fontSize: '0.7rem',
                                                        height: 24,
                                                        transition: 'all 0.2s ease-in-out',
                                                        ...(selectedCategories.includes(key) ? {
                                                            bgcolor: config.color,
                                                            color: 'white',
                                                            borderColor: config.color,
                                                            '&:hover': {
                                                                bgcolor: config.color,
                                                                opacity: 0.8
                                                            }
                                                        } : {
                                                            borderColor: config.color,
                                                            color: config.color,
                                                            '&:hover': {
                                                                bgcolor: config.color + '15',
                                                                borderColor: config.color
                                                            }
                                                        })
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                </Collapse>
                            </Paper>

                            {renderEventList()}
                        </>
                    )}

                    {selectedTab === 1 && renderStatsPanel()}
                </Collapse>
            </DialogContent>

                <DialogActions>
                    <Typography variant="caption" sx={{ flex: 1, pl: 2, color: 'text.secondary' }}>
                        {isPaused ? '⏸️ Paused' : '🔴 Recording'} |
                        Total: {events.length} |
                        Filtered: {filteredEvents.length}
                    </Typography>
                </DialogActions>
                </Dialog>
            )
        </>
    );
}