/**
 * EnhancedUndoRedoControls - Improved Undo/Redo with Action History Dropdown
 * Shows up to 50 actions with human-readable descriptions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    IconButton,
    Tooltip,
    Menu,
    MenuItem,
    Divider,
    Typography,
    ListItemIcon,
    ListItemText,
    Paper
} from '@mui/material';
import {
    Undo,
    Redo,
    ArrowDropDown,
    History,
    CheckCircleOutline
} from '@mui/icons-material';
import { useServices } from '../contexts/ServiceContext.js';

export default function EnhancedUndoRedoControls() {
    const { eventBusService, commandService } = useServices();
    const [undoState, setUndoState] = useState({
        canUndo: false,
        canRedo: false,
        lastCommand: null,
        lastCommandDescription: null,
        undoStack: [],
        redoStack: []
    });

    const [undoMenuAnchor, setUndoMenuAnchor] = useState(null);
    const [redoMenuAnchor, setRedoMenuAnchor] = useState(null);

    // Subscribe to command state changes
    useEffect(() => {
        // Get initial state
        const initialState = commandService.getState();
        setUndoState(initialState);

        // Subscribe to command events
        const unsubscribeExecuted = eventBusService.subscribe(
            'command:executed',
            (payload) => {
                setUndoState({
                    canUndo: payload.canUndo,
                    canRedo: payload.canRedo,
                    lastCommand: payload.command,
                    lastCommandDescription: payload.description,
                    undoStack: payload.undoStack || [],
                    redoStack: payload.redoStack || []
                });
            },
            { component: 'EnhancedUndoRedoControls' }
        );

        const unsubscribeUndone = eventBusService.subscribe(
            'command:undone',
            (payload) => {
                setUndoState({
                    canUndo: payload.canUndo,
                    canRedo: payload.canRedo,
                    lastCommand: null,
                    lastCommandDescription: null,
                    undoStack: payload.undoStack || [],
                    redoStack: payload.redoStack || []
                });
            },
            { component: 'EnhancedUndoRedoControls' }
        );

        const unsubscribeRedone = eventBusService.subscribe(
            'command:redone',
            (payload) => {
                setUndoState({
                    canUndo: payload.canUndo,
                    canRedo: payload.canRedo,
                    lastCommand: payload.command,
                    lastCommandDescription: payload.description,
                    undoStack: payload.undoStack || [],
                    redoStack: payload.redoStack || []
                });
            },
            { component: 'EnhancedUndoRedoControls' }
        );

        const unsubscribeCleared = eventBusService.subscribe(
            'command:cleared',
            () => {
                setUndoState({
                    canUndo: false,
                    canRedo: false,
                    lastCommand: null,
                    lastCommandDescription: null,
                    undoStack: [],
                    redoStack: []
                });
            },
            { component: 'EnhancedUndoRedoControls' }
        );

        // Cleanup subscriptions
        return () => {
            unsubscribeExecuted();
            unsubscribeUndone();
            unsubscribeRedone();
            unsubscribeCleared();
        };
    }, [eventBusService, commandService]);

    const handleUndo = () => {
        if (undoState.canUndo) {
            eventBusService.emit('command:undo', null, {
                source: 'EnhancedUndoRedoControls',
                component: 'EnhancedUndoRedoControls'
            });
        }
    };

    const handleRedo = () => {
        if (undoState.canRedo) {
            eventBusService.emit('command:redo', null, {
                source: 'EnhancedUndoRedoControls',
                component: 'EnhancedUndoRedoControls'
            });
        }
    };

    const handleUndoToIndex = (index) => {
        setUndoMenuAnchor(null);
        eventBusService.emit('command:undo-to-index', { index }, {
            source: 'EnhancedUndoRedoControls',
            component: 'EnhancedUndoRedoControls'
        });
    };

    const handleRedoToIndex = (index) => {
        setRedoMenuAnchor(null);
        eventBusService.emit('command:redo-to-index', { index }, {
            source: 'EnhancedUndoRedoControls',
            component: 'EnhancedUndoRedoControls'
        });
    };

    const formatTimestamp = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (seconds > 30) return `${seconds} seconds ago`;
        return 'Just now';
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Undo Button Group */}
            <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Tooltip title={undoState.canUndo ? `Undo: ${undoState.lastCommandDescription}` : 'Nothing to undo'}>
                    <span>
                        <IconButton
                            size="small"
                            onClick={handleUndo}
                            disabled={!undoState.canUndo}
                            sx={{
                                color: undoState.canUndo ? 'text.primary' : 'text.disabled',
                                borderRadius: 0,
                                '&:hover': {
                                    backgroundColor: undoState.canUndo ? 'action.hover' : 'transparent',
                                },
                                '&:disabled': {
                                    color: 'text.disabled',
                                    opacity: 0.4
                                }
                            }}
                        >
                            <Undo fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                <Tooltip title="Undo history">
                    <span>
                        <IconButton
                            size="small"
                            onClick={(e) => setUndoMenuAnchor(e.currentTarget)}
                            disabled={!undoState.canUndo}
                            sx={{
                                color: undoState.canUndo ? 'text.primary' : 'text.disabled',
                                borderRadius: 0,
                                minWidth: 24,
                                px: 0.5,
                                '&:hover': {
                                    backgroundColor: undoState.canUndo ? 'action.hover' : 'transparent',
                                },
                                '&:disabled': {
                                    color: 'text.disabled',
                                    opacity: 0.4
                                }
                            }}
                        >
                            <ArrowDropDown fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {/* Redo Button Group */}
            <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Tooltip title={undoState.canRedo ? `Redo: ${undoState.redoStack[0]?.description}` : 'Nothing to redo'}>
                    <span>
                        <IconButton
                            size="small"
                            onClick={handleRedo}
                            disabled={!undoState.canRedo}
                            sx={{
                                color: undoState.canRedo ? 'text.primary' : 'text.disabled',
                                borderRadius: 0,
                                '&:hover': {
                                    backgroundColor: undoState.canRedo ? 'action.hover' : 'transparent',
                                },
                                '&:disabled': {
                                    color: 'text.disabled',
                                    opacity: 0.4
                                }
                            }}
                        >
                            <Redo fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                <Tooltip title="Redo history">
                    <span>
                        <IconButton
                            size="small"
                            onClick={(e) => setRedoMenuAnchor(e.currentTarget)}
                            disabled={!undoState.canRedo}
                            sx={{
                                color: undoState.canRedo ? 'text.primary' : 'text.disabled',
                                borderRadius: 0,
                                minWidth: 24,
                                px: 0.5,
                                '&:hover': {
                                    backgroundColor: undoState.canRedo ? 'action.hover' : 'transparent',
                                },
                                '&:disabled': {
                                    color: 'text.disabled',
                                    opacity: 0.4
                                }
                            }}
                        >
                            <ArrowDropDown fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {/* Undo History Menu */}
            <Menu
                anchorEl={undoMenuAnchor}
                open={Boolean(undoMenuAnchor)}
                onClose={() => setUndoMenuAnchor(null)}
                PaperProps={{
                    sx: {
                        maxHeight: 400,
                        minWidth: 300,
                        '& .MuiMenuItem-root': {
                            px: 2,
                            py: 1
                        }
                    }
                }}
            >
                <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Undo History ({undoState.undoStack.length} action{undoState.undoStack.length !== 1 ? 's' : ''})
                    </Typography>
                </Box>
                {undoState.undoStack.length === 0 ? (
                    <MenuItem disabled>
                        <Typography variant="body2" color="text.disabled">
                            No actions to undo
                        </Typography>
                    </MenuItem>
                ) : (
                    undoState.undoStack.map((action, index) => (
                        <MenuItem
                            key={`undo-${action.timestamp}`}
                            onClick={() => handleUndoToIndex(undoState.undoStack.length - index - 1)}
                            sx={{
                                '&:hover': {
                                    backgroundColor: 'action.hover'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <History fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary={action.description}
                                secondary={formatTimestamp(action.timestamp)}
                                primaryTypographyProps={{
                                    fontSize: '0.875rem'
                                }}
                                secondaryTypographyProps={{
                                    fontSize: '0.75rem'
                                }}
                            />
                        </MenuItem>
                    ))
                )}
            </Menu>

            {/* Redo History Menu */}
            <Menu
                anchorEl={redoMenuAnchor}
                open={Boolean(redoMenuAnchor)}
                onClose={() => setRedoMenuAnchor(null)}
                PaperProps={{
                    sx: {
                        maxHeight: 400,
                        minWidth: 300,
                        '& .MuiMenuItem-root': {
                            px: 2,
                            py: 1
                        }
                    }
                }}
            >
                <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Redo History ({undoState.redoStack.length} action{undoState.redoStack.length !== 1 ? 's' : ''})
                    </Typography>
                </Box>
                {undoState.redoStack.length === 0 ? (
                    <MenuItem disabled>
                        <Typography variant="body2" color="text.disabled">
                            No actions to redo
                        </Typography>
                    </MenuItem>
                ) : (
                    undoState.redoStack.map((action, index) => (
                        <MenuItem
                            key={`redo-${action.timestamp}`}
                            onClick={() => handleRedoToIndex(undoState.redoStack.length - index - 1)}
                            sx={{
                                '&:hover': {
                                    backgroundColor: 'action.hover'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <CheckCircleOutline fontSize="small" color="success" />
                            </ListItemIcon>
                            <ListItemText
                                primary={action.description}
                                secondary={formatTimestamp(action.timestamp)}
                                primaryTypographyProps={{
                                    fontSize: '0.875rem'
                                }}
                                secondaryTypographyProps={{
                                    fontSize: '0.75rem'
                                }}
                            />
                        </MenuItem>
                    ))
                )}
            </Menu>
        </Box>
    );
}