import React, { useState, useEffect, useRef } from 'react';
import ColorSchemeDropdown from '../components/ColorSchemeDropdown';
import EffectWizard from '../components/EffectWizard';
import PreferencesService from '../services/PreferencesService';

const { ipcRenderer } = window.require('electron');

function NewProjectWizard({ onBack, onProjectCreated, onEventBusCreated }) {
    const [step, setStep] = useState(1);
    const [projectData, setProjectData] = useState({
        projectName: '',
        artist: '',
        colorScheme: 'neon-cyberpunk', // Will be updated with default preference
        numberOfFrames: 1800,
        resolution: 'hd',
        isHoz: null, // null = auto-detect, true = horizontal, false = vertical
        projectDirectory: '',
        customColors: {
            neutrals: ['#FFFFFF'],
            backgrounds: ['#000000'],
            lights: ['#FFFF00', '#FF00FF', '#00FFFF', '#FF0000', '#00FF00', '#0000FF']
        }
    });
    const [showColorCreator, setShowColorCreator] = useState(false);
    const [effects, setEffects] = useState({
        primary: [],
        secondary: [],
        keyFrame: [],
        final: []
    });
    const [events, setEvents] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const logContainerRef = useRef(null);

    // Enhanced event formatting function
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

    // Load default preferences on component mount
    useEffect(() => {
        const loadDefaults = async () => {
            try {
                const [defaultScheme, lastProjectInfo] = await Promise.all([
                    PreferencesService.getDefaultColorScheme(),
                    PreferencesService.getLastProjectInfo()
                ]);

                setProjectData(prev => ({
                    ...prev,
                    colorScheme: defaultScheme,
                    projectName: lastProjectInfo.lastProjectName,
                    artist: lastProjectInfo.lastArtist,
                    resolution: lastProjectInfo.lastResolution || 'hd',
                    projectDirectory: lastProjectInfo.lastProjectDirectory || ''
                }));
            } catch (error) {
                console.error('Error loading default preferences:', error);
            }
        };

        loadDefaults();
    }, []);

    // Listen for worker events from main process
    useEffect(() => {
        const handleWorkerEvent = (event, { eventName, data }) => {
            console.log(`Worker event received: ${eventName}`, data);
            const timestamp = new Date().toLocaleTimeString();
            setEvents(prev => {
                const newEvents = [...prev.slice(-99), { // Keep last 100 events
                    id: Date.now() + Math.random(),
                    timestamp,
                    eventName,
                    data,
                    category: data.category || 'unknown'
                }];
                console.log(`Events updated, count: ${newEvents.length}`);
                return newEvents;
            });

            // Update generation state based on events
            if (eventName === 'GENERATION_STARTED') {
                setIsGenerating(true);
            } else if (eventName === 'GENERATION_COMPLETED' || eventName === 'GENERATION_ERROR') {
                setIsGenerating(false);
            }

            // Auto-scroll to bottom
            setTimeout(() => {
                if (logContainerRef.current) {
                    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
                }
            }, 10);
        };

        ipcRenderer.on('worker-event', handleWorkerEvent);

        return () => {
            ipcRenderer.removeListener('worker-event', handleWorkerEvent);
        };
    }, []);

    const colorSchemes = [
        { id: 'neon', name: 'Neon Lights', description: 'Vibrant cyberpunk colors' },
        { id: 'earth', name: 'Earthen Tones', description: 'Natural, organic colors' },
        { id: 'celestial', name: 'Celestial Vault', description: 'Deep space colors' },
        { id: 'custom', name: 'Custom', description: 'Define your own colors' }
    ];

    const resolutions = [
        { id: 'qvga', name: '320x240 (QVGA)', width: 320, height: 240 },
        { id: 'vga', name: '640x480 (VGA)', width: 640, height: 480 },
        { id: 'svga', name: '800x600 (SVGA)', width: 800, height: 600 },
        { id: 'xga', name: '1024x768 (XGA)', width: 1024, height: 768 },
        { id: 'hd720', name: '1280x720 (HD 720p)', width: 1280, height: 720 },
        { id: 'hd', name: '1920x1080 (HD 1080p)', width: 1920, height: 1080 },
        { id: 'square_small', name: '720x720 (Square HD)', width: 720, height: 720 },
        { id: 'square', name: '1080x1080 (Square FHD)', width: 1080, height: 1080 },
        { id: 'wqhd', name: '2560x1440 (WQHD)', width: 2560, height: 1440 },
        { id: '4k', name: '3840x2160 (4K UHD)', width: 3840, height: 2160 },
        { id: '5k', name: '5120x2880 (5K)', width: 5120, height: 2880 },
        { id: '8k', name: '7680x4320 (8K UHD)', width: 7680, height: 4320 },
        { id: 'portrait_hd', name: '1080x1920 (Portrait HD)', width: 1080, height: 1920 },
        { id: 'portrait_4k', name: '2160x3840 (Portrait 4K)', width: 2160, height: 3840 },
        { id: 'ultrawide', name: '3440x1440 (Ultrawide)', width: 3440, height: 1440 },
        { id: 'cinema_2k', name: '2048x1080 (Cinema 2K)', width: 2048, height: 1080 },
        { id: 'cinema_4k', name: '4096x2160 (Cinema 4K)', width: 4096, height: 2160 }
    ];

    const handleSelectDirectory = async () => {
        try {
            const result = await ipcRenderer.invoke('select-folder');
            if (!result.canceled && result.filePaths.length > 0) {
                setProjectData({...projectData, projectDirectory: result.filePaths[0]});
            }
        } catch (error) {
            console.error('Failed to select directory:', error);
        }
    };

    const handleNext = () => {
        console.log(`handleNext called at step ${step}`);
        if (step < 5) {
            setStep(step + 1);
        } else if (step === 5) {
            // Create project and move to generation step
            createProject();
        } else {
            console.warn(`Unexpected handleNext at step ${step}`);
        }
    };

    const createProject = async () => {
        try {
            const fullProjectData = {
                ...projectData,
                effects,
                createdAt: new Date().toISOString()
            };

            // Save project configuration
            const projectConfigPath = `${projectData.projectDirectory}/${projectData.projectName}-config.json`;
            const saveResult = await ipcRenderer.invoke('write-file', projectConfigPath, JSON.stringify(fullProjectData, null, 2));

            if (saveResult.success) {
                // Save project info for future use
                await PreferencesService.saveLastProjectInfo(
                    projectData.projectName,
                    projectData.artist,
                    projectData.resolution,
                    projectData.projectDirectory
                );

                // Move to generation step
                setStep(6);

                // Start NFT generation
                try {
                    const generationResult = await ipcRenderer.invoke('start-new-project', fullProjectData);
                    if (generationResult.success) {
                        console.log('Generation started successfully');
                    } else {
                        console.error('Failed to start generation:', generationResult.error);
                        alert('Failed to start generation: ' + generationResult.error);
                    }
                } catch (invokeError) {
                    console.error('Error invoking start-new-project:', invokeError);
                    alert('Error starting generation: ' + invokeError.message);
                }

                onProjectCreated(fullProjectData);
            } else {
                console.error('Failed to save project:', saveResult.error);
                alert('Failed to save project configuration: ' + saveResult.error);
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Error creating project: ' + error.message);
        }
    };

    const handlePrevious = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            onBack();
        }
    };

    const renderStep = () => {
        console.log(`Rendering step ${step}, events count: ${events.length}`);
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3>Project Settings</h3>
                        <div className="form-group">
                            <label>Project Name</label>
                            <input
                                type="text"
                                value={projectData.projectName}
                                onChange={(e) => setProjectData({...projectData, projectName: e.target.value})}
                                placeholder="My Awesome NFT Project"
                            />
                        </div>
                        <div className="form-group">
                            <label>Artist Name</label>
                            <input
                                type="text"
                                value={projectData.artist}
                                onChange={(e) => setProjectData({...projectData, artist: e.target.value})}
                                placeholder="Your Name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Number of Frames</label>
                            <select
                                value={projectData.numberOfFrames}
                                onChange={(e) => setProjectData({...projectData, numberOfFrames: parseInt(e.target.value)})}
                            >
                                <option value={900}>900 frames (30s at 30fps)</option>
                                <option value={1800}>1800 frames (60s at 30fps)</option>
                                <option value={3600}>3600 frames (120s at 30fps)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Resolution</label>
                            <select
                                value={projectData.resolution}
                                onChange={(e) => setProjectData({...projectData, resolution: e.target.value})}
                            >
                                {resolutions.map(res => (
                                    <option key={res.id} value={res.id}>
                                        {res.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Orientation (Step One)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => setProjectData({...projectData, isHoz: null})}
                                    style={{
                                        background: projectData.isHoz === null ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        padding: '0.5rem 1rem',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Auto-detect
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProjectData({...projectData, isHoz: true})}
                                    style={{
                                        background: projectData.isHoz === true ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        padding: '0.5rem 1rem',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⬌ Force Horizontal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProjectData({...projectData, isHoz: false})}
                                    style={{
                                        background: projectData.isHoz === false ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        padding: '0.5rem 1rem',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⬍ Force Vertical
                                </button>
                            </div>
                            <small style={{ color: '#aaa', fontSize: '0.7rem', marginTop: '0.25rem', display: 'block' }}>
                                Choose how to determine orientation. This affects all effect previews and generation.
                            </small>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h3>Project Location</h3>
                        <p>Choose where to save your NFT project files</p>
                        <div className="form-group">
                            <label>Project Directory</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={projectData.projectDirectory}
                                    placeholder="No directory selected"
                                    readOnly
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={handleSelectDirectory}
                                >
                                    Browse
                                </button>
                            </div>
                            {!projectData.projectDirectory && (
                                <p style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                    Please select a directory to save your project files
                                </p>
                            )}
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div>
                        <h3>Color Scheme</h3>
                        <p>Choose a color palette for your NFT project:</p>
                        <div style={{ marginTop: '1.5rem', maxWidth: '500px' }}>
                            <ColorSchemeDropdown
                                value={projectData.colorScheme}
                                onChange={(schemeId) => setProjectData({...projectData, colorScheme: schemeId})}
                                projectData={projectData}
                                showPreview={true}
                            />
                        </div>

                        {projectData.colorScheme && (
                            <div style={{
                                marginTop: '2rem',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                border: '1px solid #333'
                            }}>
                                <h4 style={{ margin: '0 0 1rem 0' }}>Selected Color Scheme Preview</h4>
                                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                    Your chosen colors will be used throughout the NFT generation process.
                                    Effects will randomly select from these color buckets to create dynamic variations.
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 4:
                return (
                    <EffectWizard
                        onBack={() => setStep(3)}
                        onEffectsCreated={(createdEffects) => {
                            setEffects(createdEffects);
                            setStep(5);
                        }}
                        projectData={projectData}
                    />
                );
            case 5:
                const totalEffects = Object.values(effects).flat().length;
                return (
                    <div>
                        <h3>Review & Create Project</h3>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '8px' }}>
                            <h4>Project Summary</h4>
                            <p><strong>Name:</strong> {projectData.projectName}</p>
                            <p><strong>Artist:</strong> {projectData.artist}</p>
                            <p><strong>Directory:</strong> {projectData.projectDirectory}</p>
                            <p><strong>Frames:</strong> {projectData.numberOfFrames}</p>
                            <p><strong>Resolution:</strong> {resolutions.find(r => r.id === projectData.resolution)?.name}</p>
                            <p><strong>Color Scheme:</strong> {projectData.colorScheme}</p>
                            <p><strong>Effects:</strong> {totalEffects} total effects configured</p>
                        </div>

                        {totalEffects > 0 ? (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,255,0,0.1)', borderRadius: '8px' }}>
                                <p><strong>✅ Ready to Generate!</strong></p>
                                <p>Your project is fully configured with {totalEffects} effects. Click "Create Project" to save the configuration and start generation.</p>
                            </div>
                        ) : (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,0,0.1)', borderRadius: '8px' }}>
                                <p><strong>⚠️ No Effects Configured</strong></p>
                                <p>Your project will generate, but it may appear blank without any effects. You can add effects later or go back to configure them now.</p>
                            </div>
                        )}
                    </div>
                );
            case 6:
                try {
                    return (
                        <div>
                            <h3>Project Generation</h3>
                        {isGenerating ? (
                            <div style={{ background: 'rgba(0,255,0,0.1)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                <h4>🎨 Generating Your NFT Collection...</h4>
                                <p>Generation is running in the background. This may take hours or days depending on your settings.</p>
                                <p>You can safely close this window - generation will continue.</p>
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                <h4>✅ Generation Complete!</h4>
                                <p>Your NFT collection has been generated successfully.</p>
                            </div>
                        )}

                        <div ref={logContainerRef} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', height: '400px', overflowY: 'auto' }}>
                            <h4>Live Generation Log</h4>
                            {events.length === 0 ? (
                                <p style={{ color: '#888' }}>No events yet...</p>
                            ) : (
                                <div>
                                    {events.map(event => (
                                        <div key={event.id} style={{
                                            marginBottom: '0.5rem',
                                            padding: '0.5rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem'
                                        }}>
                                            <span style={{ color: '#888' }}>[{event.timestamp}] </span>
                                            <div style={{ color: '#ddd' }}>
                                                {formatEventData(event.eventName, event.data)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
                } catch (error) {
                    console.error('Error rendering step 6:', error);
                    return (
                        <div>
                            <h3>Error in Generation View</h3>
                            <p>An error occurred while displaying the generation log:</p>
                            <pre>{error.message}</pre>
                        </div>
                    );
                }
            default:
                console.error(`Unexpected step: ${step}`);
                return (
                    <div>
                        <h3>Error: Invalid Step</h3>
                        <p>An unexpected error occurred. Step {step} is not defined.</p>
                    </div>
                );
        }
    };

    return (
        <div className="wizard">
            <div className="wizard-header">
                <h2>New Project Wizard</h2>
                <div className="wizard-steps">
                    <div className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        1. Project Settings
                    </div>
                    <div className={`wizard-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        2. Location
                    </div>
                    <div className={`wizard-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                        3. Color Scheme
                    </div>
                    <div className={`wizard-step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
                        4. Effects
                    </div>
                    <div className={`wizard-step ${step >= 5 ? 'active' : ''} ${step > 5 ? 'completed' : ''}`}>
                        5. Review
                    </div>
                    <div className={`wizard-step ${step >= 6 ? 'active' : ''}`}>
                        6. Generation
                    </div>
                </div>
            </div>

            {renderStep()}

            <div className="wizard-navigation">
                <button className="btn btn-secondary" onClick={handlePrevious}>
                    {step === 1 ? 'Back to Home' : 'Previous'}
                </button>
                <button
                    className={`btn ${
                        (step === 1 && (!projectData.projectName || !projectData.artist)) ||
                        (step === 2 && !projectData.projectDirectory)
                            ? ''
                            : (step === 1 && projectData.projectName && projectData.artist) ||
                              (step === 2 && projectData.projectDirectory) ||
                              (step === 3) ||
                              (step === 4)
                                ? 'btn-ready'
                                : 'btn-input-required'
                    }`}
                    onClick={handleNext}
                    disabled={
                        (step === 1 && (!projectData.projectName || !projectData.artist)) ||
                        (step === 2 && !projectData.projectDirectory) ||
                        step === 6 // Disable on final step
                    }
                    style={{
                        display: step === 6 ? 'none' : 'block' // Hide button on generation step
                    }}
                >
                    {step === 5 ? 'Create Project' : 'Next'}
                </button>
            </div>
        </div>
    );
}

export default NewProjectWizard;