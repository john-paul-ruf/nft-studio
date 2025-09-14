import React, { useState, useEffect, useRef } from 'react';

function EventBusDisplay({ eventBus }) {
    const [events, setEvents] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const logRef = useRef(null);

    useEffect(() => {
        if (!eventBus) return;

        const handleEvent = (eventName, data) => {
            const timestamp = new Date().toLocaleTimeString();
            const eventEntry = {
                id: Date.now() + Math.random(),
                timestamp,
                eventName,
                data,
                category: data.category || 'unknown'
            };

            setEvents(prev => [...prev.slice(-99), eventEntry]); // Keep last 100 events

            // Auto-scroll to bottom
            setTimeout(() => {
                if (logRef.current) {
                    logRef.current.scrollTop = logRef.current.scrollHeight;
                }
            }, 10);
        };

        // Subscribe to all events
        const originalEmit = eventBus.emit;
        eventBus.emit = function(eventName, data) {
            const result = originalEmit.apply(this, arguments);
            handleEvent(eventName, data);
            return result;
        };

        // Update metrics every 2 seconds
        const metricsInterval = setInterval(() => {
            if (eventBus.getMetrics) {
                setMetrics(eventBus.getMetrics());
            }
        }, 2000);

        return () => {
            clearInterval(metricsInterval);
            // Restore original emit (simplified cleanup)
            eventBus.emit = originalEmit;
        };
    }, [eventBus]);

    const formatEventData = (eventName, data) => {
        switch (eventName) {
            case 'frameStarted':
                return `🎬 Frame ${data.frameNumber}/${data.totalFrames} started (${Math.round(data.progress * 100)}%)`;
            case 'frameCompleted':
                const duration = data.durationMs ? ` in ${data.durationMs}ms` : '';
                return `✅ Frame ${data.frameNumber}/${data.totalFrames} completed${duration}`;
            case 'effectStarted':
                return `🎨 Effect ${data.effectName} started on frame ${data.frameNumber}`;
            case 'effectCompleted':
                const effectDuration = data.durationMs ? ` (${data.durationMs}ms)` : '';
                return `✨ Effect ${data.effectName} completed${effectDuration}`;
            case 'fileWriteCompleted':
                const size = data.fileSizeBytes ? ` (${Math.round(data.fileSizeBytes/1024/1024*100)/100}MB)` : '';
                return `💾 File written for frame ${data.frameNumber}${size}`;
            case 'workerStarted':
                return `🚀 Worker thread started`;
            case 'workerCompleted':
                const totalTime = data.totalDurationMs ? ` in ${Math.round(data.totalDurationMs/1000)}s` : '';
                return `🎉 Worker completed${totalTime}`;
            case 'workerError':
                return `❌ Error: ${data.error}`;
            case 'generationStarted':
                return `🎬 Generation started for ${data.projectName}`;
            case 'generationCompleted':
                return `🎊 Generation completed: ${data.finalFileName}`;
            default:
                return `${eventName}: ${JSON.stringify(data, null, 2)}`;
        }
    };

    const getCategoryClass = (category) => {
        switch (category) {
            case 'frame': return 'frame';
            case 'effect': return 'effect';
            case 'lifecycle': return 'lifecycle';
            case 'error': return 'error';
            case 'performance': return 'performance';
            default: return '';
        }
    };

    return (
        <div className="event-bus-display">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>🔄 Live Generation Log</h3>
                {metrics && (
                    <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
                        {metrics.totalEvents} events processed
                    </div>
                )}
            </div>

            <div className="event-log" ref={logRef}>
                {events.length === 0 ? (
                    <div style={{ color: '#a0aec0', fontStyle: 'italic' }}>
                        Waiting for events... Start a generation to see real-time progress here.
                    </div>
                ) : (
                    events.map(event => (
                        <div
                            key={event.id}
                            className={`event-entry ${getCategoryClass(event.category)}`}
                        >
                            <span style={{ color: '#a0aec0' }}>[{event.timestamp}] </span>
                            {formatEventData(event.eventName, event.data)}
                        </div>
                    ))
                )}
            </div>

            {metrics && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                }}>
                    <strong>Event Breakdown:</strong> {JSON.stringify(metrics.eventCounts, null, 2)}
                </div>
            )}
        </div>
    );
}

export default EventBusDisplay;