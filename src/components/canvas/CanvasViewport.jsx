import React, { forwardRef } from 'react';

const CanvasViewport = forwardRef(({
    dimensions,
    zoom,
    pan,
    isDragging,
    isRendering,
    renderTimer,
    onMouseDown,
    onWheel,
    currentTheme
}, ref) => {
    const { canvasRef, frameHolderRef } = ref;

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