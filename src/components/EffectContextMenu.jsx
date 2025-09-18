import React, { useState, useEffect } from 'react';
import {
    Paper,
    MenuList,
    MenuItem,
    Divider,
    Typography,
    useTheme,
    ClickAwayListener,
    Popper,
    Grow,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    Edit,
    Add,
    ArrowRight,
    Schedule
} from '@mui/icons-material';

export default function EffectContextMenu({
    position,
    onAddSecondary,
    onAddKeyframe,
    onEdit,
    onClose
}) {
    const theme = useTheme();
    const [secondaryEffects, setSecondaryEffects] = useState([]);
    const [keyframeEffects, setKeyframeEffects] = useState([]);
    const [secondaryAnchor, setSecondaryAnchor] = useState(null);
    const [keyframeAnchor, setKeyframeAnchor] = useState(null);

    useEffect(() => {
        loadEffects();
    }, []);

    const loadEffects = async () => {
        try {
            const response = await window.api.discoverEffects();
            if (response.success && response.effects) {
                setSecondaryEffects(response.effects.secondary || []);
                setKeyframeEffects(response.effects.keyFrame || []);
            }
        } catch (error) {
            console.error('Failed to load effects:', error);
        }
    };

    const handleSecondaryHover = (event) => {
        setSecondaryAnchor(event.currentTarget);
    };

    const handleKeyframeHover = (event) => {
        setKeyframeAnchor(event.currentTarget);
    };

    const handleSubmenuClose = () => {
        setSecondaryAnchor(null);
        setKeyframeAnchor(null);
    };

    const virtualElement = {
        getBoundingClientRect: () => ({
            x: position.x,
            y: position.y,
            top: position.y,
            left: position.x,
            right: position.x,
            bottom: position.y,
            width: 0,
            height: 0,
        }),
    };

    return (
        <>
            <ClickAwayListener onClickAway={onClose}>
                <Popper
                    open={true}
                    anchorEl={virtualElement}
                    placement="bottom-start"
                    sx={{ zIndex: 1300 }}
                >
                    <Grow in={true}>
                        <Paper
                            elevation={8}
                            sx={{
                                bgcolor: theme.palette.mode === 'dark' ? '#323232' : theme.palette.background.paper,
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 1,
                                minWidth: 200,
                                overflow: 'hidden'
                            }}
                        >
                            <MenuList dense>
                                <MenuItem onClick={onEdit}>
                                    <ListItemIcon>
                                        <Edit fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Edit Effect"
                                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                                    />
                                </MenuItem>

                                <Divider />

                                <MenuItem
                                    onMouseEnter={handleSecondaryHover}
                                    onMouseLeave={() => setTimeout(() => setSecondaryAnchor(null), 100)}
                                    sx={{
                                        position: 'relative',
                                        '&:hover': {
                                            backgroundColor: theme.palette.action.hover,
                                        }
                                    }}
                                >
                                    <ListItemIcon>
                                        <Add fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Add Secondary Effect"
                                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                                    />
                                    <ArrowRight fontSize="small" sx={{ ml: 'auto' }} />
                                </MenuItem>

                                <Divider />

                                <MenuItem
                                    onMouseEnter={handleKeyframeHover}
                                    onMouseLeave={() => setTimeout(() => setKeyframeAnchor(null), 100)}
                                    sx={{
                                        position: 'relative',
                                        '&:hover': {
                                            backgroundColor: theme.palette.action.hover,
                                        }
                                    }}
                                >
                                    <ListItemIcon>
                                        <Schedule fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Add Keyframe Effect"
                                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                                    />
                                    <ArrowRight fontSize="small" sx={{ ml: 'auto' }} />
                                </MenuItem>
                            </MenuList>
                        </Paper>
                    </Grow>
                </Popper>
            </ClickAwayListener>

            {/* Secondary Effects Submenu */}
            <Popper
                open={Boolean(secondaryAnchor)}
                anchorEl={secondaryAnchor}
                placement="right-start"
                sx={{ zIndex: 1301 }}
                onMouseEnter={() => setSecondaryAnchor(secondaryAnchor)}
                onMouseLeave={handleSubmenuClose}
            >
                <Grow in={Boolean(secondaryAnchor)}>
                    <Paper
                        elevation={8}
                        sx={{
                            bgcolor: theme.palette.mode === 'dark' ? '#323232' : theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            minWidth: 180,
                            maxHeight: 300,
                            overflow: 'auto'
                        }}
                    >
                        <MenuList dense>
                            {secondaryEffects.length === 0 ? (
                                <MenuItem disabled>
                                    <ListItemText
                                        primary="No secondary effects available"
                                        primaryTypographyProps={{
                                            fontSize: '0.8125rem',
                                            fontStyle: 'italic',
                                            color: theme.palette.text.disabled
                                        }}
                                    />
                                </MenuItem>
                            ) : (
                                secondaryEffects.map((effect, index) => (
                                    <MenuItem
                                        key={index}
                                        onClick={() => {
                                            onAddSecondary(effect);
                                            onClose();
                                        }}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: theme.palette.primary.main,
                                                color: theme.palette.primary.contrastText,
                                            }
                                        }}
                                    >
                                        <ListItemText
                                            primary={effect.displayName || effect.name}
                                            primaryTypographyProps={{ fontSize: '0.8125rem' }}
                                        />
                                    </MenuItem>
                                ))
                            )}
                        </MenuList>
                    </Paper>
                </Grow>
            </Popper>

            {/* Keyframe Effects Submenu */}
            <Popper
                open={Boolean(keyframeAnchor)}
                anchorEl={keyframeAnchor}
                placement="right-start"
                sx={{ zIndex: 1301 }}
                onMouseEnter={() => setKeyframeAnchor(keyframeAnchor)}
                onMouseLeave={handleSubmenuClose}
            >
                <Grow in={Boolean(keyframeAnchor)}>
                    <Paper
                        elevation={8}
                        sx={{
                            bgcolor: theme.palette.mode === 'dark' ? '#323232' : theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            minWidth: 180,
                            maxHeight: 300,
                            overflow: 'auto'
                        }}
                    >
                        <MenuList dense>
                            {keyframeEffects.length === 0 ? (
                                <MenuItem disabled>
                                    <ListItemText
                                        primary="No keyframe effects available"
                                        primaryTypographyProps={{
                                            fontSize: '0.8125rem',
                                            fontStyle: 'italic',
                                            color: theme.palette.text.disabled
                                        }}
                                    />
                                </MenuItem>
                            ) : (
                                keyframeEffects.map((effect, index) => (
                                    <MenuItem
                                        key={index}
                                        onClick={() => {
                                            onAddKeyframe(effect);
                                            onClose();
                                        }}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: theme.palette.primary.main,
                                                color: theme.palette.primary.contrastText,
                                            }
                                        }}
                                    >
                                        <ListItemText
                                            primary={`${effect.displayName || effect.name} at frame`}
                                            primaryTypographyProps={{ fontSize: '0.8125rem' }}
                                        />
                                    </MenuItem>
                                ))
                            )}
                        </MenuList>
                    </Paper>
                </Grow>
            </Popper>
        </>
    );
}