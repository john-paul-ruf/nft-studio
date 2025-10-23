import React, { useState, useMemo } from 'react';
import {
    IconButton,
    Tooltip
} from '@mui/material';
import {
    PlayArrow
} from '@mui/icons-material';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useServices } from '../contexts/ServiceContext.js';
import './RenderSelector.bem.css';

export default function RenderSelector({
    currentTheme,
    isRendering,
    isProjectResuming,
    isRenderLoopActive,
    isPinned,
    projectStateManager,
    onRender,
    onRenderLoop,
    closeAllDropdowns
}) {
    const { eventBusService } = useServices();
    const [isOpen, setIsOpen] = useState(false);

    const handleRender = () => {
        setIsOpen(false);
        if (onRender) {
            onRender();
        }
    };

    const handleRenderLoop = () => {
        setIsOpen(false);
        if (onRenderLoop) {
            onRenderLoop();
        }
    };

    const handleResumeLoop = async () => {
        try {
            setIsOpen(false);
            
            // Get current project directory if available
            const currentProjectPath = projectStateManager?.getCurrentProjectPath();
            const defaultPath = currentProjectPath ?
                currentProjectPath.substring(0, currentProjectPath.lastIndexOf('/')) :
                undefined;

            // Open file dialog for *-settings.json files
            const result = await window.api.selectFile({
                filters: [
                    { name: 'Settings Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                defaultPath: defaultPath,
                properties: ['openFile']
            });

            if (!result.canceled && result.filePaths?.[0]) {
                const settingsPath = result.filePaths[0];

                // Validate it's a settings file
                if (!settingsPath.includes('-settings.json')) {
                    console.warn('⚠️ Selected file is not a settings file:', settingsPath);
                    // Still proceed - user might have renamed the file
                }

                // Use event-driven approach instead of callback
                closeAllDropdowns();
                // Import EventBusService and emit project:resume event
                import('../services/EventBusService.js').then(({ default: EventBusService }) => {
                    EventBusService.emit('project:resume', { settingsPath }, {
                        source: 'RenderSelector',
                        component: 'RenderSelector'
                    });
                });
            }
        } catch (error) {
            console.error('❌ Error resuming loop:', error);
        }
    };

    const isRenderLoopDisabled = !isRenderLoopActive && !isPinned;

    return (
        <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger asChild>
                <IconButton
                    size="small"
                    className="canvas-toolbar__render-button render-selector__button"
                    title={isProjectResuming ? 'Resuming project...' : isRendering ? 'Rendering...' : 'Render'}
                >
                    <PlayArrow />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="render-selector__content"
                    sideOffset={5}
                >
                    <DropdownMenu.Item
                        className="render-selector__item"
                        onClick={handleRender}
                    >
                        <PlayArrow fontSize="small" className="render-selector__icon" />
                        <span>Render Frame</span>
                    </DropdownMenu.Item>

                    <Tooltip
                        title={isRenderLoopDisabled ? "Pin settings first (render a frame, then click the pin button)" : ""}
                        placement="right"
                        arrow
                    >
                        <div>
                            <DropdownMenu.Item
                                className={`render-selector__item${isRenderLoopDisabled ? ' render-selector__item--disabled' : ''}`}
                                onClick={handleRenderLoop}
                                disabled={isRenderLoopDisabled}
                            >
                                <PlayArrow fontSize="small" className="render-selector__icon" />
                                <span>{isRenderLoopActive ? 'Stop' : 'Start'} Render Loop</span>
                            </DropdownMenu.Item>
                        </div>
                    </Tooltip>

                    <DropdownMenu.Item
                        className="render-selector__item"
                        onClick={handleResumeLoop}
                    >
                        <PlayArrow fontSize="small" className="render-selector__icon" />
                        <span>Resume Loop Run</span>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}