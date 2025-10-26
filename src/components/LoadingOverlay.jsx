import React from 'react';
import { Box, CircularProgress, LinearProgress, Typography, Paper } from '@mui/material';

/**
 * Loading Overlay Component
 *
 * Purpose: Display plugin operation progress (install, uninstall, reload, bulk load)
 * Shows current phase, message, and progress percentage
 * CRITICAL: Blocks ALL user interaction while visible
 *
 * Created in Phase 5 of plugin refactor
 */
function LoadingOverlay({ operation, visible }) {
    if (!visible || !operation) {
        return null;
    }

    const { phase, message, percent, plugin } = operation;

    // Prevent all interactions with the overlay
    const handleMouseDown = (e) => e.preventDefault();
    const handleClick = (e) => e.stopPropagation();
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => e.preventDefault();

    // Phase-specific emoji and color
    const phaseConfig = {
        validating: { emoji: '🔍', color: '#2196f3', label: 'Validating' },
        downloading: { emoji: '⬇️', color: '#4caf50', label: 'Downloading' },
        configuring: { emoji: '⚙️', color: '#ff9800', label: 'Configuring' },
        loading: { emoji: '📦', color: '#9c27b0', label: 'Plugins Loading' },
        processing: { emoji: '⚡', color: '#00bcd4', label: 'Processing' },
        registering: { emoji: '📝', color: '#3f51b5', label: 'Registering' },
        updating: { emoji: '🔄', color: '#607d8b', label: 'Updating' },
        complete: { emoji: '✅', color: '#4caf50', label: 'Complete' },
        error: { emoji: '❌', color: '#f44336', label: 'Error' },
        finding: { emoji: '🔍', color: '#2196f3', label: 'Finding' },
        unregistering: { emoji: '🗑️', color: '#ff5722', label: 'Unregistering' },
        'cleaning-symlinks': { emoji: '🔗', color: '#795548', label: 'Cleaning Symlinks' },
        'cleaning-temp': { emoji: '🧹', color: '#9e9e9e', label: 'Cleaning Temp' },
        'removing-config': { emoji: '📋', color: '#607d8b', label: 'Removing Config' },
        deleting: { emoji: '🗑️', color: '#f44336', label: 'Deleting' },
        'updating-cache': { emoji: '💾', color: '#00bcd4', label: 'Updating Cache' },
        cleaning: { emoji: '🧹', color: '#9e9e9e', label: 'Cleaning' },
        caching: { emoji: '💾', color: '#00bcd4', label: 'Caching' },
        discovering: { emoji: '🔍', color: '#2196f3', label: 'Discovering' },
        'bulk-load': { emoji: '📦', color: '#9c27b0', label: 'Bulk Loading' }
    };

    const config = phaseConfig[phase] || { emoji: '⏳', color: '#757575', label: 'Processing' };

    return (
        <Box
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(4px)',
                pointerEvents: 'auto', // Lock: capture all pointer events
                cursor: 'wait', // Indicate app is locked
                userSelect: 'none', // Prevent text selection
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
            }}
        >
            <Paper
                elevation={8}
                sx={{
                    padding: 4,
                    minWidth: 400,
                    maxWidth: 600,
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                    pointerEvents: 'auto', // Ensure the modal paper itself is also interactive
                    border: '2px solid #2196f3',
                    boxShadow: '0 0 30px rgba(33, 150, 243, 0.5)' // Glow effect to emphasize locked state
                }}
            >
                {/* Header with emoji and phase */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Typography variant="h3" component="span">
                        {config.emoji}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ color: config.color, fontWeight: 600 }}>
                            {config.label}
                        </Typography>
                        {plugin && (
                            <Typography variant="body2" color="text.secondary">
                                Plugin: {plugin}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Progress message */}
                <Typography
                    variant="body1"
                    sx={{
                        mb: 3,
                        color: 'text.primary',
                        minHeight: 24
                    }}
                >
                    {message || 'Processing...'}
                </Typography>

                {/* Progress bar */}
                {typeof percent === 'number' && percent > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <LinearProgress
                            variant="determinate"
                            value={percent}
                            sx={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: config.color,
                                    borderRadius: 4
                                }
                            }}
                        />
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, display: 'block', textAlign: 'right' }}
                        >
                            {percent}%
                        </Typography>
                    </Box>
                )}

                {/* Indeterminate spinner when no progress percentage */}
                {(typeof percent !== 'number' || percent === 0) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <CircularProgress
                            size={48}
                            sx={{ color: config.color }}
                        />
                    </Box>
                )}

                {/* Helper text */}
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 3, display: 'block', textAlign: 'center', fontStyle: 'italic' }}
                >
                    {phase === 'complete' ? '🎉 Operation completed successfully!' :
                     phase === 'error' ? '⚠️ An error occurred during the operation' :
                     'Please wait, this may take a moment...'}
                </Typography>
            </Paper>
        </Box>
    );
}

export default LoadingOverlay;
