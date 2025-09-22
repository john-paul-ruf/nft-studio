import React, { forwardRef, useEffect } from 'react';

const CanvasViewport = forwardRef(({
    dimensions,
    zoom,
    pan,
    isDragging,
    isRendering,
    renderTimer,
    renderResult,
    onMouseDown,
    onWheel,
    currentTheme
}, ref) => {
    const { canvasRef, frameHolderRef } = ref;

    // Draw renderResult to canvas when it changes
    useEffect(() => {
        if (renderResult && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Clear canvas first
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Draw image to fill the canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };

            img.onerror = (error) => {
                console.error('Failed to load render result image:', error);
                // Clear canvas on error
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            };

            img.src = renderResult;
        }
    }, [renderResult]);

    return (
        <div
            className="canvas-area"
            style={{
                backgroundColor: currentTheme.palette.background.default,
                color: currentTheme.palette.text.primary,
            }}
        >
            <div
                ref={frameHolderRef}
                className="frame-holder"
                style={{
                    width: `${dimensions.w}px`,
                    height: `${dimensions.h}px`,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transition: isDragging ? 'none' : 'transform 0.1s ease'
                }}
                onMouseDown={onMouseDown}
                onWheel={onWheel}
            >
                <canvas
                    ref={canvasRef}
                    width={dimensions.w}
                    height={dimensions.h}
                    className="render-canvas"
                />
                {isRendering && (
                    <div className="canvas-overlay">
                        <div className="render-spinner-container">
                            <div className="render-spinner">
                                <div className="spinner-circle"></div>
                                <div className="spinner-timer">{renderTimer}s</div>
                            </div>
                            <div className="render-message">Generating frame...</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

CanvasViewport.displayName = 'CanvasViewport';

export default CanvasViewport;