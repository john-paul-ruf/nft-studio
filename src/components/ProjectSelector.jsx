import React, { useState } from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import {
    FolderOpen,
    Add,
    PlayArrow,
    Settings
} from '@mui/icons-material';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useServices } from '../contexts/ServiceContext.js';

export default function ProjectSelector({
    currentTheme,
    projectStateManager,
    onNewProject,
    onOpenProject
}) {
    const { eventBusService } = useServices();
    const [menuAnchor, setMenuAnchor] = useState(null);

    const handleNewProject = () => {
        setMenuAnchor(null);
        if (onNewProject) {
            onNewProject();
        } else {
            // Emit event for new project
            eventBusService.emit('project:new', {}, {
                source: 'ProjectSelector',
                component: 'ProjectSelector'
            });
        }
    };

    const handleOpenProject = () => {
        setMenuAnchor(null);
        if (onOpenProject) {
            onOpenProject();
        } else {
            // Emit event for open project
            eventBusService.emit('project:open', {}, {
                source: 'ProjectSelector',
                component: 'ProjectSelector'
            });
        }
    };


    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <IconButton
                    size="small"
                    sx={{
                        color: 'text.primary',
                        '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white',
                        }
                    }}
                    title="Project Actions"
                >
                    <FolderOpen />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="radix-dropdown-content"
                    sideOffset={5}
                    style={{
                        backgroundColor: currentTheme.palette.background.paper,
                        border: '1px solid #444',
                        borderRadius: '4px',
                        padding: '5px',
                        minWidth: '200px',
                        boxShadow: '0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)',
                        zIndex: 9999
                    }}
                >
                    <DropdownMenu.Item
                        className="radix-dropdown-item"
                        onClick={handleNewProject}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            outline: 'none',
                            borderRadius: '2px',
                            color: currentTheme.palette.text.primary
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.palette.action.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <Add fontSize="small" style={{ marginRight: '8px' }} />
                        <span>New Project</span>
                    </DropdownMenu.Item>
                    
                    <DropdownMenu.Item
                        className="radix-dropdown-item"
                        onClick={handleOpenProject}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            outline: 'none',
                            borderRadius: '2px',
                            color: currentTheme.palette.text.primary
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.palette.action.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <FolderOpen fontSize="small" style={{ marginRight: '8px' }} />
                        <span>Open Existing Project</span>
                    </DropdownMenu.Item>

                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}