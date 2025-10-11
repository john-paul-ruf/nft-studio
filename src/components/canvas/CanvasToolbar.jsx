import React, { useMemo } from 'react';
import {
    AppBar,
    Toolbar,
    Box,
    FormControl,
    Select,
    MenuItem,
    Typography,
    TextField,
    ToggleButton,
    Divider,
    Menu,
    ListItemIcon,
    ListItemText,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    PlayArrow,
    ZoomIn,
    ZoomOut,
    Add,
    Palette,
    Settings,
    LightMode,
    DarkMode,
    KeyboardArrowRight,
    SwapHoriz,
    SwapVert,
    Search,
    Save,
    Undo,
    Redo,
    FileUpload,
    BugReport,
    Extension,
    PushPin,
    PushPinOutlined
} from '@mui/icons-material';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import ResolutionMapper from '../../utils/ResolutionMapper.js';
import ColorSchemeDropdown from '../ColorSchemeDropdown.jsx';
import UndoRedoControls from '../UndoRedoControls.jsx';
import ProjectSelector from '../ProjectSelector.jsx';

export default function CanvasToolbar({
    config,
    currentResolution,
    isHorizontal,
    isRendering,
    selectedFrame,
    zoom,
    themeMode,
    currentTheme,
    isRenderLoopActive,
    lastSaveStatus,
    currentProjectPath,
    onRender,
    onRenderLoop,
    onResolutionChange,
    onOrientationToggle,
    onFramesChange,
    onFrameChange,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onColorSchemeChange,
    onThemeToggle,
    currentThemeKey,
    availableThemes,
    onForceSave,
    closeAllDropdowns,
    zoomMenuAnchor,
    setZoomMenuAnchor,
    colorSchemeMenuAnchor,
    setColorSchemeMenuAnchor,
    projectStateManager,
    onNewProject,
    onOpenProject,
    onImportProject,
    onProjectSettings,
    onEventBusMonitor,
    onPluginManager,
    isReadOnly = false,
    isProjectResuming = false,
    isPinned = false,
    onPinToggle

}) {
    // Use passed resolution value (single source of truth)
    const resolutionValue = useMemo(() => {
        return String(currentResolution || 1920);
    }, [currentResolution]);

    return (
        <AppBar position="static" elevation={0}>
            <Toolbar
                sx={{
                    backgroundColor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    color: 'text.primary',
                    gap: 2,
                    minHeight: '60px !important'
                }}
            >
                <Box className="toolbar-group">
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <IconButton
                                size="small"
                                sx={{
                                    color: 'primary.main',
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                    }
                                }}
                                title={isProjectResuming ? 'Resuming project...' : isRendering ? 'Rendering...' : 'Render'}
                            >
                                <PlayArrow />
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
                                    minWidth: '160px',
                                    boxShadow: '0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)',
                                    zIndex: 9999
                                }}
                            >
                                <DropdownMenu.Item
                                    className="radix-dropdown-item"
                                    onClick={onRender}
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
                                    <PlayArrow fontSize="small" style={{ marginRight: '8px' }} />
                                    <span>Render Frame</span>
                                </DropdownMenu.Item>
                                <Tooltip 
                                    title={!isRenderLoopActive && !isPinned ? "Pin settings first (render a frame, then click the pin button)" : ""}
                                    placement="right"
                                    arrow
                                >
                                    <div>
                                        <DropdownMenu.Item
                                            className="radix-dropdown-item"
                                            onClick={onRenderLoop}
                                            disabled={!isRenderLoopActive && !isPinned}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                cursor: (!isRenderLoopActive && !isPinned) ? 'not-allowed' : 'pointer',
                                                outline: 'none',
                                                borderRadius: '2px',
                                                color: (!isRenderLoopActive && !isPinned) ? currentTheme.palette.text.disabled : currentTheme.palette.text.primary,
                                                opacity: (!isRenderLoopActive && !isPinned) ? 0.5 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (isRenderLoopActive || isPinned) {
                                                    e.currentTarget.style.backgroundColor = currentTheme.palette.action.hover;
                                                }
                                            }}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <PlayArrow fontSize="small" style={{ marginRight: '8px' }} />
                                            <span>{isRenderLoopActive ? 'Stop' : 'Start'} Render Loop</span>
                                        </DropdownMenu.Item>
                                    </div>
                                </Tooltip>
                                <DropdownMenu.Item
                                    className="radix-dropdown-item"
                                    onClick={async () => {
                                        try {
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
                                                import('../../services/EventBusService.js').then(({ default: EventBusService }) => {
                                                    EventBusService.emit('project:resume', { settingsPath }, {
                                                        source: 'CanvasToolbar',
                                                        component: 'CanvasToolbar'
                                                    });
                                                });
                                            }
                                        } catch (error) {
                                            console.error('❌ Error resuming loop:', error);
                                        }
                                    }}
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
                                    <PlayArrow fontSize="small" style={{ marginRight: '8px' }} />
                                    <span>Resume Loop Run</span>
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </Box>

                {/* Project Selector */}
                <ProjectSelector
                    currentTheme={currentTheme}
                    projectStateManager={projectStateManager}
                    onNewProject={onNewProject}
                    onOpenProject={onOpenProject}
                    onImportProject={onImportProject}
                />

                {/* Undo/Redo Controls with History */}
                <UndoRedoControls />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                            value={resolutionValue}
                            onChange={onResolutionChange}
                            displayEmpty
                            variant="outlined"
                            disabled={isReadOnly || isProjectResuming}
                            sx={{ 
                                fontSize: '13px',
                                ...(isReadOnly && {
                                    '& .MuiSelect-select': {
                                        color: 'text.disabled'
                                    }
                                })
                            }}
                        >
                            {Object.entries(ResolutionMapper.getAllResolutions()).map(([width, resolution]) => (
                                <MenuItem key={width} value={String(width)}>
                                    {ResolutionMapper.getDisplayName(parseInt(width))}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Tooltip title={isReadOnly ? "Orientation is read-only" : (isHorizontal ? 'Switch to Vertical' : 'Switch to Horizontal')}>
                    <span>
                        <ToggleButton
                            value="orientation"
                            selected={isHorizontal}
                            onClick={onOrientationToggle}
                            disabled={isReadOnly || isProjectResuming}
                            size="small"
                            sx={{
                                borderRadius: 1,
                                minWidth: '40px',
                                height: '32px',
                                ...(isReadOnly && {
                                    color: 'text.disabled',
                                    '&.Mui-disabled': {
                                        color: 'text.disabled'
                                    }
                                })
                            }}
                        >
                            {isHorizontal ? <SwapHoriz /> : <SwapVert />}
                        </ToggleButton>
                    </span>
                </Tooltip>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: '50px' }}>
                        Frames
                    </Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={config.numFrames}
                        onChange={onFramesChange}
                        disabled={isReadOnly}
                        inputProps={{ min: 1, max: 10000 }}
                        sx={{ 
                            width: '80px',
                            ...(isReadOnly && {
                                '& .MuiInputBase-input': {
                                    color: 'text.disabled'
                                }
                            })
                        }}
                        variant="outlined"
                    />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: '40px' }}>
                        Frame
                    </Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={selectedFrame}
                        onChange={(e) => onFrameChange(parseInt(e.target.value))}
                        inputProps={{ min: 0, max: config.numFrames - 1 }}
                        sx={{ width: '80px' }}
                        variant="outlined"
                    />
                </Box>

                <Box sx={{ position: 'relative' }}>
                    <IconButton
                        size="small"
                        onClick={(event) => {
                            closeAllDropdowns();
                            setZoomMenuAnchor(event.currentTarget);
                        }}
                        sx={{
                            color: 'text.primary',
                            '&:hover': {
                                backgroundColor: 'primary.main',
                                color: 'white',
                            }
                        }}
                        title={`Zoom: ${Math.round(zoom * 100)}%`}
                    >
                        <Search />
                    </IconButton>
                    <Menu
                        anchorEl={zoomMenuAnchor}
                        open={Boolean(zoomMenuAnchor)}
                        onClose={() => setZoomMenuAnchor(null)}
                        PaperProps={{
                            sx: {
                                backgroundColor: 'background.paper',
                                border: '1px solid #444',
                            }
                        }}
                    >
                        <MenuItem onClick={() => { onZoomIn(); setZoomMenuAnchor(null); }}>
                            <ListItemIcon>
                                <ZoomIn fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Zoom In</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { onZoomOut(); setZoomMenuAnchor(null); }}>
                            <ListItemIcon>
                                <ZoomOut fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Zoom Out</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { onZoomReset(); setZoomMenuAnchor(null); }}>
                            <ListItemIcon>
                                <Settings fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Reset</ListItemText>
                        </MenuItem>
                    </Menu>
                </Box>

                <Box sx={{ position: 'relative' }}>
                    <Tooltip title={isReadOnly ? "Color scheme is read-only" : "Color Scheme"}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={(event) => {
                                    if (!isReadOnly) {
                                        closeAllDropdowns();
                                        setColorSchemeMenuAnchor(event.currentTarget);
                                    }
                                }}
                                disabled={isReadOnly || isProjectResuming}
                                sx={{
                                    color: isReadOnly ? 'text.disabled' : 'text.primary',
                                    '&:hover': {
                                        backgroundColor: isReadOnly ? 'transparent' : 'primary.main',
                                        color: isReadOnly ? 'text.disabled' : 'white',
                                    }
                                }}
                            >
                                <Palette />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Menu
                        anchorEl={colorSchemeMenuAnchor}
                        open={Boolean(colorSchemeMenuAnchor)}
                        onClose={() => setColorSchemeMenuAnchor(null)}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        sx={{
                            '& .MuiPaper-root': {
                                width: '500px',
                                minWidth: '500px',
                                maxHeight: 'calc(100vh - 100px)',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                mt: 1
                            }
                        }}
                    >
                        <Box sx={{ p: 0 }}>
                            <ColorSchemeDropdown
                                value={config.colorScheme || 'neon-cyberpunk'}
                                projectData={{
                                    resolution: 'hd',
                                    isHoz: isHorizontal
                                }}
                                showPreview={true}
                                isInDropdown={true}
                                onChange={() => setColorSchemeMenuAnchor(null)}
                            />
                        </Box>
                    </Menu>
                </Box>

                {/* Pin Button */}
                <Tooltip title={isPinned ? "Unpin Settings (Exit Audit Mode)" : "Pin Settings (Enter Audit Mode)"}>
                    <span>
                        <IconButton
                            size="small"
                            onClick={onPinToggle}
                            disabled={isRendering || isProjectResuming}
                            sx={{
                                color: isPinned ? 'warning.main' : 'text.primary',
                                backgroundColor: isPinned ? 'warning.dark' : 'transparent',
                                '&:hover': {
                                    backgroundColor: isPinned ? 'warning.main' : 'primary.main',
                                    color: 'white',
                                },
                                transition: 'all 0.2s ease',
                                ...(isPinned && {
                                    animation: 'pulse 2s ease-in-out infinite',
                                    '@keyframes pulse': {
                                        '0%, 100%': {
                                            opacity: 1,
                                        },
                                        '50%': {
                                            opacity: 0.7,
                                        },
                                    },
                                })
                            }}
                        >
                            {isPinned ? <PushPin /> : <PushPinOutlined />}
                        </IconButton>
                    </span>
                </Tooltip>

                <Box sx={{ flexGrow: 1 }} />

                {/* Auto-save status indicator */}
                {(lastSaveStatus || currentProjectPath) && (
                    <Box className="toolbar-group" sx={{ ml: 'auto', mr: 1 }}>
                        <Tooltip title={currentProjectPath ? `Auto-saving to: ${currentProjectPath}` : 'Project auto-save'}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {lastSaveStatus === 'saving' && (
                                    <Typography variant="caption" sx={{ color: 'warning.main' }}>
                                        💾 Saving...
                                    </Typography>
                                )}
                                {lastSaveStatus === 'saved' && (
                                    <Typography variant="caption" sx={{ color: 'success.main' }}>
                                        ✅ Saved
                                    </Typography>
                                )}
                                {onForceSave && (
                                    <IconButton
                                        size="small"
                                        onClick={onForceSave}
                                        sx={{
                                            color: 'text.primary',
                                            '&:hover': {
                                                backgroundColor: 'primary.main',
                                                color: 'white',
                                            }
                                        }}
                                        title="Force Save"
                                    >
                                        <Save />
                                    </IconButton>
                                )}
                            </Box>
                        </Tooltip>
                    </Box>
                )}

                <Box className="toolbar-group">
                    <Tooltip title="Project Settings">
                        <span>
                            <IconButton
                                onClick={onProjectSettings}
                                color="inherit"
                                size="small"
                                disabled={isReadOnly || isProjectResuming}
                                sx={{
                                    borderRadius: 1,
                                    padding: '8px',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                    },
                                    ...(isReadOnly && {
                                        color: 'text.disabled',
                                        '&.Mui-disabled': {
                                            color: 'text.disabled'
                                        }
                                    })
                                }}
                            >
                                <Settings />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Event Bus Monitor">
                        <IconButton
                            onClick={onEventBusMonitor}
                            color="inherit"
                            size="small"
                            sx={{
                                borderRadius: 1,
                                padding: '8px',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                }
                            }}
                        >
                            <BugReport />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Plugin Manager">
                        <span>
                            <IconButton
                                onClick={onPluginManager}
                                color="inherit"
                                size="small"
                                disabled={isReadOnly || isProjectResuming}
                                sx={{
                                    borderRadius: 1,
                                    padding: '8px',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                    },
                                    ...(isReadOnly && {
                                        color: 'text.disabled',
                                        '&.Mui-disabled': {
                                            color: 'text.disabled'
                                        }
                                    })
                                }}
                            >
                                <Extension />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title={`Current theme: ${availableThemes[currentThemeKey]?.name || currentThemeKey} (click to cycle)`}>
                        <IconButton
                            onClick={onThemeToggle}
                            color="inherit"
                            size="small"
                            sx={{
                                borderRadius: 1,
                                padding: '8px',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                }
                            }}
                        >
                            {/* Cyberpunk theme icon */}
                            <span style={{fontSize: '16px'}}>⚡</span>
                        </IconButton>
                    </Tooltip>
                </Box>
            </Toolbar>
        </AppBar>
    );
}


function EffectSubmenu({
    title,
    effects,
    effectType,
    currentTheme,
    onAddEffect,
    setAddEffectMenuOpen
}) {
    return (
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: currentTheme.palette.text.primary,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    outline: 'none',
                    gap: '8px',
                }}
            >
                <span>{title}</span>
                <KeyboardArrowRight sx={{ fontSize: 16 }} />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                    style={{
                        backgroundColor: currentTheme.palette.mode === 'dark' ? '#323232' : currentTheme.palette.background.paper,
                        border: `1px solid ${currentTheme.palette.divider}`,
                        borderRadius: '6px',
                        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.2)',
                        padding: '4px',
                        minWidth: '220px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 10000,
                    }}
                >
                    {effects.map((effect) => (
                        <DropdownMenu.Item
                            key={effect.name}
                            style={{
                                padding: 0,
                                borderRadius: '4px',
                                outline: 'none',
                            }}
                            onSelect={async (event) => {
                                event.preventDefault();
                                try {
                                    await onAddEffect(effect.name, effectType);
                                    setAddEffectMenuOpen(false);
                                } catch (error) {
                                    console.error('Error adding effect:', error);
                                }
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    color: currentTheme.palette.text.primary,
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    width: '100%',
                                }}
                            >
                                {effect.displayName || effect.name}
                            </div>
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
        </DropdownMenu.Sub>
    );
}