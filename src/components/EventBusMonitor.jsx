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
    ToggleButtonGroup
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
    Timeline
} from '@mui/icons-material';

const EVENT_CATEGORIES = {
    FRAME: { label: 'Frame', color: '#4CAF50', icon: '🖼️' },
    EFFECT: { label: 'Effects', color: '#2196F3', icon: '✨' },
    VIDEO: { label: 'Video', color: '#E91E63', icon: '🎬' },
    FILE_IO: { label: 'File I/O', color: '#FF9800', icon: '📁' },
    PERFORMANCE: { label: 'Performance', color: '#9C27B0', icon: '⚡' },
    RESOURCE: { label: 'Resources', color: '#00BCD4', icon: '💾' },
    ERROR: { label: 'Errors', color: '#F44336', icon: '❌' },
    LIFECYCLE: { label: 'Lifecycle', color: '#607D8B', icon: '♻️' },
    WORKER: { label: 'Worker', color: '#3F51B5', icon: '⚙️' },
    PROGRESS: { label: 'Progress', color: '#8BC34A', icon: '📊' },
    RENDER_LOOP: { label: 'Render Loop', color: '#FF5722', icon: '🔄' },
    CONSOLE: { label: 'Console', color: '#FFC107', icon: '💬' },
    DEBUG: { label: 'Debug', color: '#795548', icon: '🐛' },
    TIMING: { label: 'Timing', color: '#009688', icon: '⏱️' },
    MEMORY: { label: 'Memory', color: '#673AB7', icon: '🧠' },
    CUSTOM: { label: 'Custom', color: '#9E9E9E', icon: '📌' }
};

export default function EventBusMonitor({ open, onClose }) {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState(Object.keys(EVENT_CATEGORIES));
    const [expandedEvents, setExpandedEvents] = useState(new Set());
    const [autoScroll, setAutoScroll] = useState(true);
    const [showTimestamps, setShowTimestamps] = useState(true);
    const [eventStats, setEventStats] = useState({});
    const eventListRef = useRef(null);
    const maxEvents = 1000;

    useEffect(() => {
        if (open && !isPaused) {
            // Subscribe to all events via IPC
            const handleEvent = (eventData) => {
                console.log('📨 EventBusMonitor received IPC event:', eventData);

                const newEvent = {
                    id: Date.now() + Math.random(),
                    type: eventData.eventName || 'unknown',
                    category: detectCategory(eventData.eventName || 'unknown'),
                    timestamp: new Date().toISOString(),
                    data: eventData.data || eventData,
                    raw: JSON.stringify(eventData, null, 2)
                };

                setEvents(prev => {
                    const updated = [newEvent, ...prev].slice(0, maxEvents);
                    updateStats(updated);
                    return updated;
                });
            };

            // Listen to worker events from IPC (render loop events)
            const handleWorkerEvent = (data) => {
                console.log('🎯 Worker event received:', data);
                handleEvent(data);
            };

            // Listen to eventbus messages from IPC
            const handleEventBusMessage = (event, data) => {
                console.log('🎯 EventBus message received:', data);
                handleEvent(data);
            };

            // Subscribe to IPC events
            if (window.api) {
                // Subscribe to worker events (from render loop)
                window.api.onWorkerEvent(handleWorkerEvent);

                // Subscribe to eventbus messages
                window.api.onEventBusMessage(handleEventBusMessage);

                console.log('✅ EventBusMonitor subscribed to IPC events');
            } else {
                console.error('❌ window.api not available for event monitoring');
            }

            return () => {
                // Cleanup IPC listeners
                if (window.api) {
                    window.api.removeWorkerEventListener();
                    window.api.offEventBusMessage(handleEventBusMessage);
                    console.log('🧹 EventBusMonitor unsubscribed from IPC events');
                }
            };
        }
    }, [open, isPaused]);

    useEffect(() => {
        // Filter events based on search and categories
        const filtered = events.filter(event => {
            const matchesSearch = !searchTerm ||
                event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                JSON.stringify(event.data).toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = selectedCategories.includes(event.category);

            return matchesSearch && matchesCategory;
        });

        setFilteredEvents(filtered);
    }, [events, searchTerm, selectedCategories]);

    useEffect(() => {
        // Auto-scroll to latest event
        if (autoScroll && eventListRef.current && filteredEvents.length > 0) {
            eventListRef.current.scrollTop = 0;
        }
    }, [filteredEvents, autoScroll]);

    const detectCategory = (eventType) => {
        const lowerType = eventType.toLowerCase();

        // Frame events
        if (lowerType.includes('frame')) return 'FRAME';

        // Effect events
        if (lowerType.includes('effect')) return 'EFFECT';

        // Video events
        if (lowerType.includes('video') || lowerType.includes('mp4') ||
            lowerType.includes('encode') || lowerType.includes('ffmpeg') ||
            lowerType.includes('codec')) return 'VIDEO';

        // File I/O events
        if (lowerType.includes('file') || lowerType.includes('write') ||
            lowerType.includes('read') || lowerType.includes('save') ||
            lowerType.includes('load')) return 'FILE_IO';

        // Memory-specific events
        if (lowerType.includes('memory') || lowerType.includes('heap') ||
            lowerType.includes('allocation')) return 'MEMORY';

        // Timing-specific events
        if (lowerType.includes('timing') || lowerType.includes('duration') ||
            lowerType.includes('elapsed')) return 'TIMING';

        // Performance events (general)
        if (lowerType.includes('performance') || lowerType.includes('perf')) return 'PERFORMANCE';

        // Resource events
        if (lowerType.includes('buffer') || lowerType.includes('canvas') ||
            lowerType.includes('resource') || lowerType.includes('cache')) return 'RESOURCE';

        // Error events
        if (lowerType.includes('error') || lowerType.includes('fail') ||
            lowerType.includes('exception') || lowerType.includes('crash')) return 'ERROR';

        // Worker-specific events
        if (lowerType.includes('worker')) return 'WORKER';

        // Lifecycle events
        if (lowerType.includes('start') || lowerType.includes('complete') ||
            lowerType.includes('init') || lowerType.includes('terminate') ||
            lowerType.includes('destroy')) return 'LIFECYCLE';

        // Progress events
        if (lowerType.includes('progress')) return 'PROGRESS';

        // Render loop events
        if (lowerType.includes('render') && lowerType.includes('loop')) return 'RENDER_LOOP';
        if (lowerType.includes('render.loop')) return 'RENDER_LOOP';

        // Console events
        if (lowerType.includes('console') || lowerType.startsWith('console.')) return 'CONSOLE';

        // Debug events
        if (lowerType.includes('debug') || lowerType.includes('log') ||
            lowerType.includes('trace')) return 'DEBUG';

        // Category-specific events (e.g., "category.frame")
        if (lowerType.startsWith('category.')) {
            const category = lowerType.substring(9).toUpperCase();
            if (EVENT_CATEGORIES[category]) return category;
        }

        return 'CUSTOM';
    };

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
    };

    const exportEvents = () => {
        const dataStr = JSON.stringify(events, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `event-bus-log-${new Date().toISOString()}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
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
        const cat = EVENT_CATEGORIES[category];
        return cat ? cat.icon : '📝';
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
                                        hour12: false,
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
                                    bgcolor: EVENT_CATEGORIES[event.category]?.color + '33',
                                    color: EVENT_CATEGORIES[event.category]?.color,
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
                            {EVENT_CATEGORIES[category]?.label || category}
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
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
                        <IconButton onClick={() => setIsPaused(!isPaused)} color={isPaused ? 'error' : 'primary'}>
                            {isPaused ? <PlayArrow /> : <Pause />}
                        </IconButton>
                        <IconButton onClick={clearEvents}>
                            <Clear />
                        </IconButton>
                        <IconButton onClick={exportEvents}>
                            <Download />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
                        <Tab label={`Live Events (${filteredEvents.length})`} />
                        <Tab label="Statistics" />
                        <Tab label="Filters" />
                    </Tabs>
                </Box>

                {selectedTab === 0 && (
                    <>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <TextField
                                size="small"
                                placeholder="Search events..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                                }}
                                sx={{ flex: 1 }}
                            />

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={autoScroll}
                                        onChange={(e) => setAutoScroll(e.target.checked)}
                                    />
                                }
                                label="Auto-scroll"
                            />

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={showTimestamps}
                                        onChange={(e) => setShowTimestamps(e.target.checked)}
                                    />
                                }
                                label="Timestamps"
                            />
                        </Box>

                        {renderEventList()}
                    </>
                )}

                {selectedTab === 1 && renderStatsPanel()}

                {selectedTab === 2 && (
                    <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Filter by Category</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {Object.entries(EVENT_CATEGORIES).map(([key, config]) => (
                                <Chip
                                    key={key}
                                    label={`${config.icon} ${config.label}`}
                                    onClick={() => {
                                        setSelectedCategories(prev =>
                                            prev.includes(key)
                                                ? prev.filter(c => c !== key)
                                                : [...prev, key]
                                        );
                                    }}
                                    sx={{
                                        bgcolor: selectedCategories.includes(key)
                                            ? config.color + '33'
                                            : 'action.disabledBackground',
                                        color: selectedCategories.includes(key)
                                            ? config.color
                                            : 'text.disabled',
                                        '&:hover': {
                                            bgcolor: config.color + '55'
                                        }
                                    }}
                                />
                            ))}
                        </Box>

                        <Box sx={{ mt: 2 }}>
                            <Button
                                size="small"
                                onClick={() => setSelectedCategories(Object.keys(EVENT_CATEGORIES))}
                            >
                                Select All
                            </Button>
                            <Button
                                size="small"
                                onClick={() => setSelectedCategories([])}
                            >
                                Clear All
                            </Button>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Typography variant="caption" sx={{ flex: 1, pl: 2, color: 'text.secondary' }}>
                    {isPaused ? '⏸️ Paused' : '🔴 Recording'} |
                    Total: {events.length} |
                    Filtered: {filteredEvents.length}
                </Typography>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}