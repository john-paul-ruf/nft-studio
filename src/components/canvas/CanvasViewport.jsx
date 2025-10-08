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

    // Clear canvas and update dimensions when dimensions change (e.g., orientation flip)
    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Update canvas dimensions
            canvas.width = dimensions.w;
            canvas.height = dimensions.h;
            
            // Clear canvas to black (frame holder background will show through)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            console.log('🖼️ CanvasViewport: Canvas cleared due to dimension change:', dimensions);
        }
    }, [dimensions.w, dimensions.h]);

    // Draw renderResult to canvas when it changes
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (renderResult) {
            // Draw the render result
            const img = new Image();

            img.onload = () => {
                // Set canvas size to match project dimensions
                canvas.width = dimensions.w;
                canvas.height = dimensions.h;

                // Clear canvas first
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw image scaled to fit canvas dimensions exactly
                ctx.drawImage(img, 0, 0, dimensions.w, dimensions.h);
            };

            img.onerror = (error) => {
                console.error('Failed to load render result image:', error);
                // Clear canvas on error
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            };

            img.src = renderResult;
        } else {
            // No render result - clear canvas to show black background
            console.log('🖼️ CanvasViewport: No render result, clearing canvas');
            canvas.width = dimensions.w;
            canvas.height = dimensions.h;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [renderResult, dimensions]);

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