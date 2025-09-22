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
    Redo
} from '@mui/icons-material';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import ResolutionMapper from '../../utils/ResolutionMapper.js';
import ColorSchemeDropdown from '../ColorSchemeDropdown.jsx';
import UndoRedoControls from '../UndoRedoControls.jsx';

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
                                disabled={isRendering}
                                size="small"
                                sx={{
                                    color: 'primary.main',
                                    backgroundColor: isRendering ? 'action.disabled' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                    }
                                }}
                                title={isRendering ? 'Rendering...' : 'Render'}
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
                                <DropdownMenu.Item
                                    className="radix-dropdown-item"
                                    onClick={onRenderLoop}
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
                                    <span>{isRenderLoopActive ? 'Stop' : 'Start'} Render Loop</span>
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </Box>

                {/* Undo/Redo Controls */}
                <UndoRedoControls />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                            value={resolutionValue}
                            onChange={onResolutionChange}
                            displayEmpty
                            variant="outlined"
                            sx={{ fontSize: '13px' }}
                        >
                            {Object.entries(ResolutionMapper.getAllResolutions()).map(([width, resolution]) => (
                                <MenuItem key={width} value={String(width)}>
                                    {ResolutionMapper.getDisplayName(parseInt(width))}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <ToggleButton
                    value="orientation"
                    selected={isHorizontal}
                    onClick={onOrientationToggle}
                    size="small"
                    sx={{
                        borderRadius: 1,
                        minWidth: '40px',
                        height: '32px'
                    }}
                    title={isHorizontal ? 'Switch to Vertical' : 'Switch to Horizontal'}
                >
                    {isHorizontal ? <SwapHoriz /> : <SwapVert />}
                </ToggleButton>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: '50px' }}>
                        Frames
                    </Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={config.numFrames}
                        onChange={onFramesChange}
                        inputProps={{ min: 1, max: 10000 }}
                        sx={{ width: '80px' }}
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
                    <IconButton
                        size="small"
                        onClick={(event) => {
                            closeAllDropdowns();
                            setColorSchemeMenuAnchor(event.currentTarget);
                        }}
                        sx={{
                            color: 'text.primary',
                            '&:hover': {
                                backgroundColor: 'primary.main',
                                color: 'white',
                            }
                        }}
                        title="Color Scheme"
                    >
                        <Palette />
                    </IconButton>
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
                                minWidth: '600px',
                                maxWidth: '700px',
                                maxHeight: '400px',
                                overflow: 'auto',
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
                            {/* Icon changes based on theme */}
                            {currentThemeKey === 'light' && <LightMode />}
                            {currentThemeKey === 'dark' && <DarkMode />}
                            {currentThemeKey === 'neon-underground' && <span style={{fontSize: '16px'}}>🔋</span>}
                            {currentThemeKey === 'mystic-ritual' && <span style={{fontSize: '16px'}}>🔮</span>}
                            {currentThemeKey === 'street-canvas' && <span style={{fontSize: '16px'}}>🎨</span>}
                            {currentThemeKey === 'bass-drop' && <span style={{fontSize: '16px'}}>🎧</span>}
                            {currentThemeKey === 'vapor-dreams' && <span style={{fontSize: '16px'}}>🌈</span>}
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