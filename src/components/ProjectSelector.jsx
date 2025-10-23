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
    Settings,
    FileUpload
} from '@mui/icons-material';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useServices } from '../contexts/ServiceContext.js';
import './ProjectSelector.bem.css';

export default function ProjectSelector({
    currentTheme,
    projectStateManager,
    onNewProject,
    onOpenProject,
    onImportProject
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

    const handleImportProject = () => {
        setMenuAnchor(null);
        if (onImportProject) {
            onImportProject();
        } else {
            // Emit event for import project
            eventBusService.emit('project:import', {}, {
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
                    title="Project Actions"
                    className="project-selector__trigger"
                >
                    <FolderOpen />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="project-selector__content"
                    sideOffset={5}
                >
                    <DropdownMenu.Item
                        className="project-selector__item"
                        onClick={handleNewProject}
                    >
                        <Add fontSize="small" className="project-selector__icon" />
                        <span>New Project</span>
                    </DropdownMenu.Item>
                    
                    <DropdownMenu.Item
                        className="project-selector__item"
                        onClick={handleOpenProject}
                    >
                        <FolderOpen fontSize="small" className="project-selector__icon" />
                        <span>Edit Project</span>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                        className="project-selector__item"
                        onClick={handleImportProject}
                    >
                        <FileUpload fontSize="small" className="project-selector__icon" />
                        <span>Import from Settings</span>
                    </DropdownMenu.Item>

                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}