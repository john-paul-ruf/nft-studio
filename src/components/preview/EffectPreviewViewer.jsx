import React, { useState } from 'react';
import EffectPreview from './EffectPreview';

/**
 * Enhanced Effect Preview Viewer with frame scrubbing and animation controls
 * Follows Open/Closed Principle - extends EffectPreview without modifying it
 */
function EffectPreviewViewer({
    effectClass,
    effectConfig,
    attachedEffects,
    projectData,
    size = 'medium',
    showControls = true
}) {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationSpeed, setAnimationSpeed] = useState(1);
    const [previewCache, setPreviewCache] = useState({});

    const totalFrames = projectData?.numberOfFrames || 60;
    const maxFrame = totalFrames - 1;

    const handleFrameChange = (newFrame) => {
        const clampedFrame = Math.max(0, Math.min(maxFrame, newFrame));
        setCurrentFrame(clampedFrame);
    };

    const handlePreviewUpdate = (frameNumber, imageData) => {
        setPreviewCache(prev => ({
            ...prev,
            [frameNumber]: imageData
        }));
    };

    const startAnimation = () => {
        if (isAnimating) return;

        setIsAnimating(true);
        const startTime = Date.now();
        const frameDuration = 1000 / (30 * animationSpeed); // 30 FPS base speed

        const animate = () => {
            if (!isAnimating) return;

            const elapsed = Date.now() - startTime;
            const frameIndex = Math.floor(elapsed / frameDuration) % totalFrames;
            setCurrentFrame(frameIndex);

            requestAnimationFrame(animate);
        };

        animate();
    };

    const stopAnimation = () => {
        setIsAnimating(false);
    };

    const toggleAnimation = () => {
        if (isAnimating) {
            stopAnimation();
        } else {
            startAnimation();
        }
    };

    if (!effectClass) {
        return (
            <div style={{
                padding: '3rem',
                textAlign: 'center',
                border: '2px dashed rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: '#cccccc',
                background: 'rgba(255,255,255,0.05)',
                height: '300px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>No Effect Preview</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>Select an effect to see live preview</div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
        }}>
            {/* Effect Preview */}
            <EffectPreview
                effectClass={effectClass}
                effectConfig={effectConfig}
                attachedEffects={attachedEffects}
                projectData={projectData}
                frameNumber={currentFrame}
                size={size}
                onPreviewUpdate={(imageData) => handlePreviewUpdate(currentFrame, imageData)}
            />

            {/* Preview Information */}
            <div style={{
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '6px',
                textAlign: 'center',
                minWidth: '200px'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {effectClass.displayName}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                    Frame {currentFrame + 1} of {totalFrames}
                </div>
            </div>

            {/* Animation Controls */}
            {showControls && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    alignItems: 'center',
                    minWidth: '250px'
                }}>
                    {/* Frame Scrubber */}
                    <div style={{ width: '100%' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            marginBottom: '0.25rem',
                            color: '#ccc'
                        }}>
                            Frame: {currentFrame}
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={maxFrame}
                            value={currentFrame}
                            onChange={(e) => handleFrameChange(parseInt(e.target.value))}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(to right, #667eea 0%, #764ba2 100%)',
                                height: '6px',
                                borderRadius: '3px'
                            }}
                        />
                    </div>

                    {/* Animation Controls */}
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center'
                    }}>
                        <button
                            onClick={() => handleFrameChange(currentFrame - 1)}
                            disabled={currentFrame === 0}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                color: 'white',
                                cursor: currentFrame === 0 ? 'not-allowed' : 'pointer',
                                opacity: currentFrame === 0 ? 0.5 : 1
                            }}
                        >
                            ⏮️
                        </button>

                        <button
                            onClick={toggleAnimation}
                            style={{
                                background: isAnimating ?
                                    'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)' :
                                    'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.5rem 1rem',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {isAnimating ? '⏸️ Stop' : '▶️ Play'}
                        </button>

                        <button
                            onClick={() => handleFrameChange(currentFrame + 1)}
                            disabled={currentFrame === maxFrame}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                color: 'white',
                                cursor: currentFrame === maxFrame ? 'not-allowed' : 'pointer',
                                opacity: currentFrame === maxFrame ? 0.5 : 1
                            }}
                        >
                            ⏭️
                        </button>
                    </div>

                    {/* Speed Control */}
                    <div style={{ width: '100%' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            marginBottom: '0.25rem',
                            color: '#ccc'
                        }}>
                            Speed: {animationSpeed}x
                        </label>
                        <input
                            type="range"
                            min={0.25}
                            max={4}
                            step={0.25}
                            value={animationSpeed}
                            onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Quick Frame Jumps */}
                    <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                        fontSize: '0.7rem'
                    }}>
                        <button
                            onClick={() => handleFrameChange(0)}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '3px',
                                padding: '0.25rem 0.5rem',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Start
                        </button>
                        <button
                            onClick={() => handleFrameChange(Math.floor(totalFrames * 0.25))}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '3px',
                                padding: '0.25rem 0.5rem',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            25%
                        </button>
                        <button
                            onClick={() => handleFrameChange(Math.floor(totalFrames * 0.5))}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '3px',
                                padding: '0.25rem 0.5rem',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            50%
                        </button>
                        <button
                            onClick={() => handleFrameChange(Math.floor(totalFrames * 0.75))}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '3px',
                                padding: '0.25rem 0.5rem',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            75%
                        </button>
                        <button
                            onClick={() => handleFrameChange(maxFrame)}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '3px',
                                padding: '0.25rem 0.5rem',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            End
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EffectPreviewViewer;