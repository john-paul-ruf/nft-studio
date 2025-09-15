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
            const resolutionMap = {
                'qvga': { width: 320, height: 240 },
                'vga': { width: 640, height: 480 },
                'svga': { width: 800, height: 600 },
                'xga': { width: 1024, height: 768 },
                'hd720': { width: 1280, height: 720 },
                'hd': { width: 1920, height: 1080 },
                'square_small': { width: 720, height: 720 },
                'square': { width: 1080, height: 1080 },
                'wqhd': { width: 2560, height: 1440 },
                '4k': { width: 3840, height: 2160 },
                '5k': { width: 5120, height: 2880 },
                '8k': { width: 7680, height: 4320 },
                'portrait_hd': { width: 1080, height: 1920 },
                'portrait_4k': { width: 2160, height: 3840 },
                'ultrawide': { width: 3440, height: 1440 },
                'cinema_2k': { width: 2048, height: 1080 },
                'cinema_4k': { width: 4096, height: 2160 }
            };

            const resolution = resolutionMap[projectData?.resolution] || resolutionMap['hd'];

            // Convert color scheme ID to actual color scheme data
            const predefinedColorSchemes = {
                'neon-cyberpunk': {
                    neutrals: ['#FFFFFF', '#CCCCCC', '#808080', '#333333'],
                    backgrounds: ['#000000', '#0a0a0a', '#1a1a1a', '#111111'],
                    lights: ['#00FFFF', '#FF00FF', '#FFFF00', '#FF0080', '#8000FF', '#00FF80'],
                    description: 'Electric blues, magentas, and cyans for futuristic vibes'
                },
                'neon': {
                    neutrals: ['#FFFFFF', '#E0E0E0', '#B0B0B0', '#404040'],
                    backgrounds: ['#000000', '#111111', '#1a0a1a', '#0a0a1a'],
                    lights: ['#FF1493', '#FF69B4', '#FF6347', '#00CED1', '#7FFF00', '#FFD700'],
                    description: 'Retro 80s neon with deep purples and hot pinks'
                }
            };

            const schemeId = projectData?.colorScheme || 'neon-cyberpunk';
            const colorSchemeData = predefinedColorSchemes[schemeId] || predefinedColorSchemes['neon-cyberpunk'];

            const projectSettings = {
                width: resolution.width,
                height: resolution.height,
                colorScheme: {
                    colorBucket: colorSchemeData.lights,
                    colorSchemeInfo: colorSchemeData.description
                },
                neutrals: projectData?.customColors?.neutrals || colorSchemeData.neutrals,
                backgrounds: projectData?.customColors?.backgrounds || colorSchemeData.backgrounds,
                lights: projectData?.customColors?.lights || colorSchemeData.lights
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