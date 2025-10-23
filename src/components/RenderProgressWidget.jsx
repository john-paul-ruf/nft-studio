import React from 'react';
import {
    Paper,
    Box,
    Typography,
    LinearProgress,
    IconButton,
    Tooltip
} from '@mui/material';
import { Stop } from '@mui/icons-material';
import './RenderProgressWidget.bem.css';
import './effects/effects-panel.bem.css';

export default function RenderProgressWidget({ 
    renderProgress, 
    onOpen, 
    onStop, 
    isStoppingRenderLoop,
    isRenderLoopActive = false
}) {
    // Show widget if either detailed progress is available OR render loop is active
    if (!renderProgress.isRendering && !isRenderLoopActive) return null;

    return (
        <Paper 
            className="render-progress-widget"
            onClick={onOpen}
        >
            <Box className="render-progress-widget__header">
                <Typography variant="subtitle2" className="render-progress-widget__title">
                    🎬 {renderProgress.projectName || 'Render Loop Active'}
                </Typography>
                <Box className="render-progress-widget__actions">
                    <Tooltip title="Stop Render Loop">
                        <IconButton 
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onStop();
                            }} 
                            disabled={isStoppingRenderLoop}
                            className="render-progress-widget__stop-button"
                        >
                            <Stop fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            
            <LinearProgress
                variant={renderProgress.isRendering ? "determinate" : "indeterminate"}
                value={renderProgress.isRendering ? renderProgress.progress : undefined}
                className="render-progress-widget__progress"
            />
            
            <Box className="render-progress-widget__footer">
                {renderProgress.isRendering ? (
                    <>
                        <Typography variant="caption" className="render-progress-widget__caption">
                            {renderProgress.currentFrame + 1}/{renderProgress.totalFrames} ({renderProgress.progress}%)
                        </Typography>
                        {renderProgress.eta && (
                            <Typography variant="caption" className="render-progress-widget__caption">
                                ETA: {renderProgress.eta}
                            </Typography>
                        )}
                    </>
                ) : (
                    <Typography variant="caption" className="render-progress-widget__caption">
                        Render loop is active
                    </Typography>
                )}
            </Box>
        </Paper>
    );
}