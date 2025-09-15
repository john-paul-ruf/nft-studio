import React, { useState, useEffect, useCallback } from 'react';
import { predefinedColorSchemes } from '../../data/colorSchemes';

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
    const [fullSizeData, setFullSizeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingFullSize, setLoadingFullSize] = useState(false);
    const [error, setError] = useState(null);
    const [showFullSize, setShowFullSize] = useState(false);

    const sizes = {
        small: 150,
        medium: 300,
        large: 500
    };

    const maxPreviewSize = sizes[size] || sizes.medium;

    // Resolution mapping - centralized for consistency
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

    // Calculate preview dimensions based on project resolution
    const getPreviewDimensions = () => {
        const resolution = resolutionMap[projectData?.resolution] || resolutionMap['hd'];

        // Step one: choose if isHoz or not (from project settings)
        const autoIsHoz = resolution.width > resolution.height;
        const isHoz = projectData?.isHoz !== undefined && projectData?.isHoz !== null ? projectData.isHoz : autoIsHoz;

        // Always calculate aspect ratio the same way regardless of orientation
        const aspectRatio = resolution.width / resolution.height;

        console.log('Preview dimensions calculation:', {
            resolution,
            projectIsHoz: projectData?.isHoz,
            autoIsHoz,
            finalIsHoz: isHoz,
            aspectRatio,
            maxPreviewSize
        });

        let previewWidth, previewHeight;

        if (isHoz) {
            // Horizontal (landscape) - constrain width to maxPreviewSize
            previewWidth = maxPreviewSize;
            previewHeight = maxPreviewSize / aspectRatio;
        } else {
            // Vertical (portrait) - constrain height to maxPreviewSize
            previewHeight = maxPreviewSize;
            previewWidth = maxPreviewSize * aspectRatio;
        }

        return {
            width: Math.round(previewWidth),
            height: Math.round(previewHeight),
            aspectRatio,
            isHoz
        };
    };

    const previewDimensions = getPreviewDimensions();

    const loadPreview = async () => {
        if (!effectClass) return;

        // Validate effect metadata before making the preview request
        if (!effectClass.name) {
            setError('Invalid effect metadata: missing name');
            console.error('Invalid effect metadata:', effectClass);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const resolution = resolutionMap[projectData?.resolution] || resolutionMap['hd'];

            // Convert color scheme ID to actual color scheme data
            const schemeId = projectData?.colorScheme || 'neon-cyberpunk';
            const colorSchemeData = predefinedColorSchemes[schemeId] || predefinedColorSchemes['neon-cyberpunk'];

            console.log('Preview using color scheme:', schemeId, colorSchemeData);

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

            console.log('Requesting full-resolution preview for effect:', effectClass);

            const result = await ipcRenderer.invoke('preview-effect', {
                effectClass,
                effectConfig,
                frameNumber,
                totalFrames,
                projectSettings: {
                    ...projectSettings,
                    width: resolution.width,
                    height: resolution.height,
                    isHorizontal: previewDimensions.isHoz
                }
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

    const loadFullSizePreview = async () => {
        if (!effectClass || loadingFullSize || fullSizeData) return;

        setLoadingFullSize(true);

        try {
            // Since preview is now rendered at full resolution, just use the same data
            if (previewData) {
                console.log('Using existing full-resolution preview data');
                setFullSizeData(previewData);
            } else {
                console.log('No preview data available, regenerating...');
                await loadPreview();
                setFullSizeData(previewData);
            }
        } catch (err) {
            console.error('Full-size preview error:', err);
            setFullSizeData(previewData);
        } finally {
            setLoadingFullSize(false);
        }
    };

    const handleRender = () => {
        loadPreview();
    };

    const handleViewFullSize = async () => {
        setShowFullSize(true);
        if (!fullSizeData && !loadingFullSize) {
            await loadFullSizePreview();
        }
    };

    if (!effectClass) {
        return (
            <div style={{
                width: previewDimensions.width,
                height: previewDimensions.height,
                border: '2px dashed #555',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: '0.9rem',
                position: 'relative'
            }}>
                Select an effect to preview
            </div>
        );
    }

    return (
        <div style={{
            width: previewDimensions.width,
            height: previewDimensions.height,
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #333',
            backgroundColor: '#1a1a1a',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
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
                        onClick={handleRender}
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
                        objectFit: 'contain',
                        cursor: 'zoom-in'
                    }}
                    onClick={handleViewFullSize}
                />
            )}

            {/* Render Button - shows when no preview data is available */}
            {!previewData && !loading && !error && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        fontSize: '2rem',
                        opacity: 0.5
                    }}>🎨</div>
                    <button
                        onClick={handleRender}
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem 1.5rem',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Render Preview
                    </button>
                    <div style={{
                        fontSize: '0.8rem',
                        color: '#aaa',
                        textAlign: 'center'
                    }}>
                        {previewDimensions.width} × {previewDimensions.height}
                        <br />
                        {previewDimensions.isHoz ? 'Landscape' : 'Portrait'} • {previewDimensions.aspectRatio.toFixed(2)}:1
                    </div>
                </div>
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
                    onClick={handleRender}
                    style={{
                        background: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: 'white',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                    }}
                    title="Re-render preview"
                >
                    🔄
                </button>
                {previewData && (
                    <button
                        onClick={handleViewFullSize}
                        style={{
                            background: 'rgba(0,0,0,0.7)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: 'white',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                        title="View full size"
                    >
                        🔍
                    </button>
                )}
            </div>

            {/* Full-size preview modal */}
            {showFullSize && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        cursor: loadingFullSize ? 'wait' : 'zoom-out'
                    }}
                    onClick={() => !loadingFullSize && setShowFullSize(false)}
                >
                    {loadingFullSize ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <div style={{
                                border: '3px solid #333',
                                borderTop: '3px solid #667eea',
                                borderRadius: '50%',
                                width: '50px',
                                height: '50px',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <div style={{ color: 'white', fontSize: '1rem' }}>
                                Generating full resolution preview...
                            </div>
                            <div style={{ color: '#aaa', fontSize: '0.8rem' }}>
                                {resolutionMap[projectData?.resolution]?.width || 1920} × {resolutionMap[projectData?.resolution]?.height || 1080}
                            </div>
                        </div>
                    ) : (
                        <img
                            src={fullSizeData || previewData}
                            alt={`${effectClass.displayName} full size`}
                            style={{
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}
                        />
                    )}
                    <button
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            color: 'white',
                            fontSize: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!loadingFullSize) {
                                setShowFullSize(false);
                                setFullSizeData(null); // Clear full-size data when closing
                            }
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}

export default EffectPreview;