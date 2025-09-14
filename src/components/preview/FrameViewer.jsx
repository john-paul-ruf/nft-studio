import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

/**
 * Frame viewer component for displaying completed animation frames
 * Follows Single Responsibility Principle - only handles frame viewing
 */
function FrameViewer({ projectDirectory, onFrameSelect }) {
    const [frames, setFrames] = useState([]);
    const [selectedFrame, setSelectedFrame] = useState(null);
    const [selectedFrameImage, setSelectedFrameImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectDirectory) {
            loadFrames();

            // Set up periodic refresh to show new frames as they're generated
            const interval = setInterval(loadFrames, 2000);
            return () => clearInterval(interval);
        }
    }, [projectDirectory]);

    const loadFrames = async () => {
        if (!projectDirectory) return;

        try {
            const result = await ipcRenderer.invoke('list-completed-frames', projectDirectory);

            if (result.success) {
                setFrames(result.frames);
                setError(null);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('Error loading frames:', err);
            setError(err.message);
        }
    };

    const handleFrameClick = async (frame) => {
        setSelectedFrame(frame);
        setLoading(true);

        try {
            const result = await ipcRenderer.invoke('read-frame-image', frame.path);

            if (result.success) {
                setSelectedFrameImage(result.imageData);
                onFrameSelect?.(frame, result.imageData);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('Error loading frame image:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString();
    };

    if (!projectDirectory) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                No project directory specified
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '600px', gap: '1rem' }}>
            {/* Frame List */}
            <div style={{
                flex: '0 0 300px',
                border: '1px solid #333',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.1)',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h4 style={{ margin: 0 }}>Completed Frames</h4>
                    <div style={{
                        background: 'rgba(102, 126, 234, 0.2)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                    }}>
                        {frames.length} frames
                    </div>
                </div>

                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '0.5rem'
                }}>
                    {error && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(255,0,0,0.1)',
                            border: '1px solid rgba(255,0,0,0.3)',
                            borderRadius: '4px',
                            color: '#ff6b6b',
                            marginBottom: '0.5rem'
                        }}>
                            Error: {error}
                        </div>
                    )}

                    {frames.length === 0 ? (
                        <div style={{
                            padding: '2rem 1rem',
                            textAlign: 'center',
                            color: '#888'
                        }}>
                            No frames generated yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {frames.map(frame => (
                                <div
                                    key={frame.path}
                                    onClick={() => handleFrameClick(frame)}
                                    style={{
                                        padding: '0.75rem',
                                        background: selectedFrame?.path === frame.path ?
                                            'rgba(102, 126, 234, 0.2)' : 'rgba(255,255,255,0.05)',
                                        border: selectedFrame?.path === frame.path ?
                                            '1px solid #667eea' : '1px solid #333',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '0.25rem'
                                    }}>
                                        <span style={{ fontWeight: 'bold' }}>
                                            Frame {frame.frameNumber}
                                        </span>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: '#888'
                                        }}>
                                            {formatFileSize(frame.size)}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '0.7rem',
                                        color: '#aaa'
                                    }}>
                                        {formatTime(frame.modified)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Frame Display */}
            <div style={{
                flex: 1,
                border: '1px solid #333',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.1)',
                    borderBottom: '1px solid #333'
                }}>
                    <h4 style={{ margin: 0 }}>
                        {selectedFrame ? `Frame ${selectedFrame.frameNumber}` : 'Select a frame to view'}
                    </h4>
                    {selectedFrame && (
                        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                            {selectedFrame.filename} • {formatFileSize(selectedFrame.size)}
                        </div>
                    )}
                </div>

                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    position: 'relative'
                }}>
                    {loading && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            zIndex: 2
                        }}>
                            <div style={{
                                border: '3px solid #333',
                                borderTop: '3px solid #667eea',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                animation: 'spin 1s linear infinite'
                            }} />
                        </div>
                    )}

                    {!selectedFrame && !loading && (
                        <div style={{
                            textAlign: 'center',
                            color: '#888',
                            fontSize: '1.1rem'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
                            <div>Select a frame from the list to view it</div>
                        </div>
                    )}

                    {selectedFrameImage && !loading && (
                        <img
                            src={selectedFrameImage}
                            alt={`Frame ${selectedFrame.frameNumber}`}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                borderRadius: '4px'
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default FrameViewer;