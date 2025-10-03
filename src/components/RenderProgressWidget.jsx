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
            sx={{ 
                position: 'fixed', 
                top: 16, 
                right: 16, 
                p: 2, 
                minWidth: 300,
                bgcolor: 'primary.dark', 
                color: 'primary.contrastText',
                zIndex: 1300,
                cursor: 'pointer',
                '&:hover': {
                    bgcolor: 'primary.main'
                }
            }}
            onClick={onOpen}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    🎬 {renderProgress.projectName || 'Render Loop Active'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Stop Render Loop">
                        <IconButton 
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onStop();
                            }} 
                            sx={{ color: 'inherit' }}
                            disabled={isStoppingRenderLoop}
                        >
                            <Stop fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            
            <LinearProgress
                variant={renderProgress.isRendering ? "determinate" : "indeterminate"}
                value={renderProgress.isRendering ? renderProgress.progress : undefined}
                sx={{
                    height: 6,
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 1,
                        bgcolor: '#00ff88'
                    }
                }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {renderProgress.isRendering ? (
                    <>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            {renderProgress.currentFrame + 1}/{renderProgress.totalFrames} ({renderProgress.progress}%)
                        </Typography>
                        {renderProgress.eta && (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                ETA: {renderProgress.eta}
                            </Typography>
                        )}
                    </>
                ) : (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        Render loop is active
                    </Typography>
                )}
            </Box>
        </Paper>
    );
}