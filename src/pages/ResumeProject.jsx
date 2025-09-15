import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function ResumeProject({ onBack, onEventBusCreated }) {
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [settingsFiles, setSettingsFiles] = useState([]);
    const [selectedSettings, setSelectedSettings] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);

    // Listen for worker events from main process
    useEffect(() => {
        const handleWorkerEvent = (event, { eventName, data }) => {
            const timestamp = new Date().toLocaleTimeString();
            setEvents(prev => [...prev.slice(-99), { // Keep last 100 events
                id: Date.now() + Math.random(),
                timestamp,
                eventName,
                data,
                category: data.category || 'unknown'
            }]);
        };

        ipcRenderer.on('worker-event', handleWorkerEvent);

        return () => {
            ipcRenderer.removeListener('worker-event', handleWorkerEvent);
        };
    }, []);

    const handleSelectFolder = async () => {
        try {
            const result = await ipcRenderer.invoke('select-folder');
            if (!result.canceled && result.filePaths.length > 0) {
                const folderPath = result.filePaths[0];
                setSelectedFolder(folderPath);

                // Look for settings files in the folder
                await scanForSettingsFiles(folderPath);
            }
        } catch (err) {
            setError(`Failed to select folder: ${err.message}`);
        }
    };

    const scanForSettingsFiles = async (folderPath) => {
        try {
            // This is a simplified version - in real implementation you'd use fs to scan the folder
            // For now, let's assume we can construct the settings path
            const settingsPath = `${folderPath}/settings.json`;

            // Try to read the settings file
            const result = await ipcRenderer.invoke('read-file', settingsPath);
            if (result.success) {
                const settings = JSON.parse(result.content);
                setSettingsFiles([{
                    path: settingsPath,
                    name: settings.config?.finalFileName || 'Unnamed Project',
                    config: settings.config
                }]);
            }
        } catch (err) {
            setError(`Failed to scan for settings: ${err.message}`);
        }
    };

    const handleResumeGeneration = async () => {
        if (!selectedSettings) return;

        setIsGenerating(true);
        setError(null);
        setEvents([]);

        try {
            const result = await ipcRenderer.invoke('resume-project', selectedSettings.path);

            if (result.success) {
                console.log('Generation completed successfully:', result.metrics);
            } else {
                setError(`Generation failed: ${result.error}`);
            }
        } catch (err) {
            setError(`Failed to start generation: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const formatEventData = (eventName, data) => {
        switch (eventName) {
            case 'frameCompleted':
                if (data) {
                    const progress = Math.round((data.progress || 0) * 100);
                    const timeStr = data.durationMs ? ` - ${data.durationMs}ms` : '';
                    const frameInfo = `🖼️ Frame ${data.frameNumber}/${data.totalFrames} completed (${progress}%)${timeStr}`;
                    const fileInfo = data.outputPath ? `\n   💾 Saved: ${data.outputPath.split('/').pop()}` : '';
                    return frameInfo + fileInfo;
                }
                return `🖼️ Frame completed`;

            case 'workerStarted':
                if (data && data.config) {
                    const { frameStart, frameEnd, totalFrames } = data.config;
                    return `🔨 Worker started: frames ${frameStart}-${frameEnd} (${totalFrames} total) - ${data.workerId}`;
                }
                return `🔨 Worker started`;

            case 'workerCompleted':
                if (data) {
                    const avgTime = data.avgFrameTimeMs ? ` (${data.avgFrameTimeMs}ms avg)` : '';
                    return `✅ Worker completed: ${data.framesProcessed} frames in ${data.totalDurationMs}ms${avgTime} - ${data.workerId}`;
                }
                return `✅ Worker completed`;

            case 'projectProgress':
                if (data) {
                    const progress = Math.round((data.completedFrames / data.totalFrames) * 100);
                    const eta = data.estimatedTimeRemaining ? `\n   ⏱️ ETA: ${data.estimatedTimeRemaining}` : '';
                    return `📊 Project Progress: ${data.completedFrames}/${data.totalFrames} frames (${progress}%)${eta}`;
                }
                return `📊 Project Progress`;

            case 'GENERATION_ERROR':
                return `❌ Generation Error: ${data?.error || 'Unknown error'}`;

            case 'effectApplied':
                if (data) {
                    return `🎨 Effect applied: ${data.effectName} on frame ${data.frameNumber}`;
                }
                return `🎨 Effect applied`;

            case 'frameStarted':
                return `🎬 Frame ${data.frameNumber}/${data.totalFrames} started`;
            case 'effectStarted':
                return `🎨 Effect ${data.effectName} started`;
            case 'effectCompleted':
                return `✨ Effect ${data.effectName} completed`;

            default:
                // Enhanced default formatting for unknown events
                const essentialData = {};
                if (data && typeof data === 'object') {
                    if (data.frameNumber !== undefined) essentialData.frame = data.frameNumber;
                    if (data.progress !== undefined) essentialData.progress = `${Math.round(data.progress * 100)}%`;
                    if (data.durationMs !== undefined) essentialData.duration = `${data.durationMs}ms`;
                    if (data.workerId !== undefined) essentialData.worker = data.workerId.split('-').pop();
                }

                if (Object.keys(essentialData).length > 0) {
                    return `🔔 ${eventName}: ${JSON.stringify(essentialData)}`;
                }

                return `🔔 ${eventName}`;
        }
    };

    return (
        <div className="wizard">
            <div className="wizard-header">
                <h2>Resume Project</h2>
                <p>Select a project folder to continue generation</p>
            </div>

            {error && (
                <div style={{
                    background: '#fed7d7',
                    color: '#c53030',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                }}>
                    {error}
                </div>
            )}

            <div className="form-group">
                <label>Project Folder</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={selectedFolder || ''}
                        placeholder="No folder selected"
                        readOnly
                        style={{ flex: 1 }}
                    />
                    <button
                        type="button"
                        className="btn"
                        onClick={handleSelectFolder}
                        disabled={isGenerating}
                    >
                        Browse
                    </button>
                </div>
            </div>

            {settingsFiles.length > 0 && (
                <div className="form-group">
                    <label>Available Projects</label>
                    <select
                        value={selectedSettings?.path || ''}
                        onChange={(e) => {
                            const settings = settingsFiles.find(s => s.path === e.target.value);
                            setSelectedSettings(settings);
                        }}
                        disabled={isGenerating}
                    >
                        <option value="">Select a project...</option>
                        {settingsFiles.map(settings => (
                            <option key={settings.path} value={settings.path}>
                                {settings.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedSettings && (
                <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                }}>
                    <h4>Project Details</h4>
                    <p><strong>Name:</strong> {selectedSettings.name}</p>
                    <p><strong>Frames:</strong> {selectedSettings.config?.numberOfFrame || 'Unknown'}</p>
                    <p><strong>Resolution:</strong> {selectedSettings.config?.longestSideInPixels}x{selectedSettings.config?.shortestSideInPixels}</p>
                </div>
            )}

            {isGenerating && events.length > 0 && (
                <div className="event-bus-display" style={{ marginBottom: '1rem' }}>
                    <h3>🔄 Generation Progress</h3>
                    <div className="event-log" style={{ height: '200px', overflowY: 'auto' }}>
                        {events.map(event => (
                            <div key={event.id} className="event-entry">
                                <span style={{ color: '#a0aec0' }}>[{event.timestamp}] </span>
                                {formatEventData(event.eventName, event.data)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="wizard-navigation">
                <button
                    className="btn btn-secondary"
                    onClick={onBack}
                    disabled={isGenerating}
                >
                    Back
                </button>

                <button
                    className="btn"
                    onClick={handleResumeGeneration}
                    disabled={!selectedSettings || isGenerating}
                >
                    {isGenerating ? '⏳ Generating...' : '▶️ Resume Generation'}
                </button>
            </div>
        </div>
    );
}

export default ResumeProject;