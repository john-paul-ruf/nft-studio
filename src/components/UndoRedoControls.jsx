/**
 * UndoRedoControls - Event-Driven Undo/Redo Component
 * Subscribes to CommandService events for state updates
 */

import React, { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Undo, Redo } from '@mui/icons-material';
import { useServices } from '../contexts/ServiceContext.js';

export default function UndoRedoControls() {
    const { eventBusService, commandService } = useServices();
    const [undoState, setUndoState] = useState({
        canUndo: false,
        canRedo: false,
        lastCommand: null
    });

    // Subscribe to command state changes
    useEffect(() => {
        // Get initial state
        setUndoState(commandService.getState());

        // Subscribe to command events
        const unsubscribeExecuted = eventBusService.subscribe(
            'command:executed',
            (payload) => {
                setUndoState({
                    canUndo: payload.canUndo,
                    canRedo: payload.canRedo,
                    lastCommand: payload.command
                });
            },
            { component: 'UndoRedoControls' }
        );

        const unsubscribeUndone = eventBusService.subscribe(
            'command:undone',
            (payload) => {
                setUndoState({
                    canUndo: payload.canUndo,
                    canRedo: payload.canRedo,
                    lastCommand: null
                });
            },
            { component: 'UndoRedoControls' }
        );

        const unsubscribeRedone = eventBusService.subscribe(
            'command:redone',
            (payload) => {
                setUndoState({
                    canUndo: payload.canUndo,
                    canRedo: payload.canRedo,
                    lastCommand: payload.command
                });
            },
            { component: 'UndoRedoControls' }
        );

        const unsubscribeCleared = eventBusService.subscribe(
            'command:cleared',
            () => {
                setUndoState({
                    canUndo: false,
                    canRedo: false,
                    lastCommand: null
                });
            },
            { component: 'UndoRedoControls' }
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
                source: 'UndoRedoControls',
                component: 'UndoRedoControls'
            });
        }
    };

    const handleRedo = () => {
        if (undoState.canRedo) {
            eventBusService.emit('command:redo', null, {
                source: 'UndoRedoControls',
                component: 'UndoRedoControls'
            });
        }
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={undoState.canUndo ? `Undo: ${undoState.lastCommand}` : 'Nothing to undo'}>
                <span>
                    <IconButton
                        size="small"
                        onClick={handleUndo}
                        disabled={!undoState.canUndo}
                        sx={{
                            color: undoState.canUndo ? 'text.primary' : 'text.disabled',
                            '&:hover': {
                                backgroundColor: undoState.canUndo ? 'primary.main' : 'transparent',
                                color: undoState.canUndo ? 'white' : 'text.disabled',
                            },
                            '&:disabled': {
                                color: 'text.disabled',
                                opacity: 0.4
                            }
                        }}
                        title="Undo last action"
                    >
                        <Undo />
                    </IconButton>
                </span>
            </Tooltip>

            <Tooltip title={undoState.canRedo ? 'Redo last undone action' : 'Nothing to redo'}>
                <span>
                    <IconButton
                        size="small"
                        onClick={handleRedo}
                        disabled={!undoState.canRedo}
                        sx={{
                            color: undoState.canRedo ? 'text.primary' : 'text.disabled',
                            '&:hover': {
                                backgroundColor: undoState.canRedo ? 'primary.main' : 'transparent',
                                color: undoState.canRedo ? 'white' : 'text.disabled',
                            },
                            '&:disabled': {
                                color: 'text.disabled',
                                opacity: 0.4
                            }
                        }}
                        title="Redo last action"
                    >
                        <Redo />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}