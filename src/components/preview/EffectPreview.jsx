import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

/**
 * Effect preview component that renders a single effect
 * Follows Single Responsibility Principle - only handles effect preview display
 */
function EffectPreview({
    effectClass,
    effectConfig,
    projectData,
    frameNumber = 0,
    size = 'medium',
    onPreviewUpdate
}) {
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const sizes = {
        small: 150,
        medium: 300,
        large: 500
    };

    const previewSize = sizes[size] || sizes.medium;

    useEffect(() => {
        if (effectClass && effectConfig) {
            loadPreview();
        }
    }, [effectClass, effectConfig, frameNumber, projectData]);

    const loadPreview = async () => {
        if (!effectClass) return;

        // Validate effect metadata before making the preview request
        if (!effectClass.effectFile || !effectClass.name) {
            setError('Invalid effect metadata: missing effectFile or name');
            console.error('Invalid effect metadata:', effectClass);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const projectSettings = {
                width: projectData?.resolution === '4k' ? 3840 : projectData?.resolution === 'square' ? 1080 : 1920,
                height: projectData?.resolution === '4k' ? 2160 : projectData?.resolution === 'square' ? 1080 : 1080,
                colorScheme: projectData?.colorScheme || {},
                neutrals: projectData?.customColors?.neutrals || ['#FFFFFF'],
                backgrounds: projectData?.customColors?.backgrounds || ['#000000'],
                lights: projectData?.customColors?.lights || ['#FFFF00', '#FF00FF', '#00FFFF']
            };

            const totalFrames = projectData?.numberOfFrames || 60;

            console.log('Requesting preview for effect:', effectClass);

            const result = await ipcRenderer.invoke('preview-effect-thumbnail', {
                effectClass,
                effectConfig,
                frameNumber,
                totalFrames,
                projectSettings,
                thumbnailSize: previewSize
            });

            if (result.success) {
                setPreviewData(result.imageData);
                onPreviewUpdate?.(result.imageData);
            } else {
                throw new Error(result.error || 'Preview generation failed');
            }
        } catch (err) {
            console.error('Preview error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadPreview();
    };

    if (!effectClass) {
        return (
            <div style={{
                width: previewSize,
                height: previewSize,
                border: '2px dashed #555',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: '0.9rem'
            }}>
                Select an effect to preview
            </div>
        );
    }

    return (
        <div style={{
            width: previewSize,
            height: previewSize,
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #333',
            background: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
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
                        width: '30px',
                        height: '30px',
                        animation: 'spin 1s linear infinite'
                    }} />
                </div>
            )}

            {error && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,0,0,0.1)',
                    color: '#ff6b6b',
                    padding: '1rem',
                    textAlign: 'center',
                    fontSize: '0.8rem'
                }}>
                    <div style={{ marginBottom: '0.5rem' }}>⚠️</div>
                    <div style={{ marginBottom: '0.5rem' }}>{error}</div>
                    <button
                        onClick={handleRefresh}
                        style={{
                            background: '#ff6b6b',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.25rem 0.5rem',
                            color: 'white',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {previewData && !loading && (
                <img
                    src={previewData}
                    alt={`${effectClass.displayName} preview`}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                    }}
                />
            )}

            {/* Controls overlay */}
            <div style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                display: 'flex',
                gap: '4px'
            }}>
                <button
                    onClick={handleRefresh}
                    style={{
                        background: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: 'white',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                    }}
                    title="Refresh preview"
                >
                    🔄
                </button>
            </div>
        </div>
    );
}

export default EffectPreview;