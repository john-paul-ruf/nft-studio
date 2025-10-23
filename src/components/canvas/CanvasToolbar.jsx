import React, { useMemo, useCallback, useState, useEffect } from 'react';
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
import RenderSelector from '../RenderSelector.jsx';
import useDebounce from '../../hooks/useDebounce.js';
import './CanvasToolbar.bem.css';

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

    // Local state for frames input (for immediate UI feedback)
    const [framesInputValue, setFramesInputValue] = useState(String(config.numFrames));
    
    // Local state for frame input (for immediate UI feedback)
    const [frameInputValue, setFrameInputValue] = useState(String(selectedFrame));

    // Sync local state when config changes externally
    useEffect(() => {
        setFramesInputValue(String(config.numFrames));
    }, [config.numFrames]);
    
    // Sync frame input when selectedFrame changes externally
    useEffect(() => {
        setFrameInputValue(String(selectedFrame));
    }, [selectedFrame]);

    // Debounced handler for frames change
    const debouncedFramesChange = useDebounce((value) => {
        // Validate and parse the value
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
            return; // Don't update if invalid
        }
        
        // Create a synthetic event object that matches what the handler expects
        const syntheticEvent = {
            target: {
                value: String(numValue)
            }
        };
        onFramesChange(syntheticEvent);
    }, 150);

    // Handler for frames input change
    const handleFramesInputChange = useCallback((e) => {
        const newValue = e.target.value;
        setFramesInputValue(newValue); // Update UI immediately
        
        // Only trigger debounced change if it's a valid number
        if (newValue !== '' && !isNaN(parseInt(newValue))) {
            debouncedFramesChange(newValue);
        }
    }, [debouncedFramesChange]);
    
    // Handler for frames input blur - restore current value if invalid
    const handleFramesInputBlur = useCallback(() => {
        const numValue = parseInt(framesInputValue);
        if (framesInputValue === '' || isNaN(numValue) || numValue < 1) {
            // Restore the current valid value
            setFramesInputValue(String(config.numFrames));
        }
    }, [framesInputValue, config.numFrames]);

    // Debounced handler for frame change
    const debouncedFrameChange = useDebounce((value) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 0) {
            onFrameChange(numValue);
        }
    }, 150);
    
    // Handler for frame input change
    const handleFrameInputChange = useCallback((e) => {
        const newValue = e.target.value;
        setFrameInputValue(newValue); // Update UI immediately
        
        // Only trigger debounced change if it's a valid number
        if (newValue !== '' && !isNaN(parseInt(newValue))) {
            debouncedFrameChange(newValue);
        }
    }, [debouncedFrameChange]);
    
    // Handler for frame input blur - restore current value if invalid
    const handleFrameInputBlur = useCallback(() => {
        const numValue = parseInt(frameInputValue);
        if (frameInputValue === '' || isNaN(numValue) || numValue < 0) {
            // Restore the current valid value
            setFrameInputValue(String(selectedFrame));
        }
    }, [frameInputValue, selectedFrame]);

    return (
        <AppBar position="static" elevation={0} className="canvas-toolbar-appbar">
            <Toolbar className="canvas-toolbar">
                <Box className="canvas-toolbar__group">
                    <RenderSelector
                        currentTheme={currentTheme}
                        isRendering={isRendering}
                        isProjectResuming={isProjectResuming}
                        isRenderLoopActive={isRenderLoopActive}
                        isPinned={isPinned}
                        projectStateManager={projectStateManager}
                        onRender={onRender}
                        onRenderLoop={onRenderLoop}
                        closeAllDropdowns={closeAllDropdowns}
                    />
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

                <Box className="canvas-toolbar__resolution-group">
                    <FormControl size="small" className="canvas-toolbar__resolution-form">
                        <Select
                            value={resolutionValue}
                            onChange={onResolutionChange}
                            displayEmpty
                            variant="outlined"
                            disabled={isReadOnly || isProjectResuming}
                            className={`canvas-toolbar__resolution-select ${isReadOnly ? 'canvas-toolbar__resolution-select--readonly' : ''}`}
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
                            className={`canvas-toolbar__icon-button canvas-toolbar__icon-button--orientation ${isReadOnly ? 'canvas-toolbar__icon-button--readonly' : ''}`}
                        >
                            {isHorizontal ? <SwapHoriz /> : <SwapVert />}
                        </ToggleButton>
                    </span>
                </Tooltip>

                <Box className="canvas-toolbar__frames-group">
                    <Typography variant="caption" className="canvas-toolbar__frames-label">
                        Frames
                    </Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={framesInputValue}
                        onChange={handleFramesInputChange}
                        onBlur={handleFramesInputBlur}
                        disabled={isReadOnly}
                        inputProps={{ min: 1, max: 10000 }}
                        className={`canvas-toolbar__frames-input ${isReadOnly ? 'canvas-toolbar__frames-input--readonly' : ''}`}
                        variant="outlined"
                    />
                </Box>

                <Box className="canvas-toolbar__frame-group">
                    <Typography variant="caption" className="canvas-toolbar__frame-label">
                        Frame
                    </Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={frameInputValue}
                        onChange={handleFrameInputChange}
                        onBlur={handleFrameInputBlur}
                        inputProps={{ min: 0, max: config.numFrames - 1 }}
                        className="canvas-toolbar__frame-input"
                        variant="outlined"
                    />
                </Box>

                <Box className="canvas-toolbar__menu-wrapper">
                    <IconButton
                        size="small"
                        onClick={(event) => {
                            closeAllDropdowns();
                            setZoomMenuAnchor(event.currentTarget);
                        }}
                        className="canvas-toolbar__zoom-button"
                        title={`Zoom: ${Math.round(zoom * 100)}%`}
                    >
                        <Search />
                    </IconButton>
                    <Menu
                        anchorEl={zoomMenuAnchor}
                        open={Boolean(zoomMenuAnchor)}
                        onClose={() => setZoomMenuAnchor(null)}
                        PaperProps={{
                            className: 'canvas-toolbar__zoom-menu'
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

                <Box className="canvas-toolbar__menu-wrapper">
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
                                className={`canvas-toolbar__color-scheme-button ${isReadOnly ? 'canvas-toolbar__color-scheme-button--readonly' : ''}`}
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
                    >
                        <Box>
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
                            className={`canvas-toolbar__pin-button ${isPinned ? 'canvas-toolbar__pin-button--pinned' : ''}`}
                        >
                            {isPinned ? <PushPin /> : <PushPinOutlined />}
                        </IconButton>
                    </span>
                </Tooltip>

                <Box className="canvas-toolbar__spacer" />

                {/* Auto-save status indicator */}
                {(lastSaveStatus || currentProjectPath) && (
                    <Box className="canvas-toolbar__status">
                        <Tooltip title={currentProjectPath ? `Auto-saving to: ${currentProjectPath}` : 'Project auto-save'}>
                            <Box className="canvas-toolbar__group">
                                {lastSaveStatus === 'saving' && (
                                    <Typography variant="caption" className="canvas-toolbar__status-text canvas-toolbar__status-text--saving">
                                        💾 Saving...
                                    </Typography>
                                )}
                                {lastSaveStatus === 'saved' && (
                                    <Typography variant="caption" className="canvas-toolbar__status-text canvas-toolbar__status-text--saved">
                                        ✅ Saved
                                    </Typography>
                                )}
                                {onForceSave && (
                                    <IconButton
                                        size="small"
                                        onClick={onForceSave}
                                        className="canvas-toolbar__save-button"
                                        title="Force Save"
                                    >
                                        <Save />
                                    </IconButton>
                                )}
                            </Box>
                        </Tooltip>
                    </Box>
                )}

                <Box className="canvas-toolbar__group">
                    <Tooltip title="Project Settings">
                        <span>
                            <IconButton
                                onClick={onProjectSettings}
                                color="inherit"
                                size="small"
                                disabled={isReadOnly || isProjectResuming}
                                className={`canvas-toolbar__utility-button ${isReadOnly ? 'canvas-toolbar__utility-button--readonly' : ''}`}
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
                            className="canvas-toolbar__utility-button"
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
                                className={`canvas-toolbar__utility-button ${isReadOnly ? 'canvas-toolbar__utility-button--readonly' : ''}`}
                            >
                                <Extension />
                            </IconButton>
                        </span>
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
            <DropdownMenu.SubTrigger className="radix-dropdown-item">
                <span>{title}</span>
                <KeyboardArrowRight className="canvas-toolbar__dropdown-arrow" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
                <DropdownMenu.SubContent className="radix-dropdown-submenu-content">
                    {effects.map((effect) => (
                        <DropdownMenu.Item
                            key={effect.name}
                            className="radix-dropdown-item"
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
                            <div className="canvas-toolbar__effect-item">
                                {effect.displayName || effect.name}
                            </div>
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
        </DropdownMenu.Sub>
    );
}