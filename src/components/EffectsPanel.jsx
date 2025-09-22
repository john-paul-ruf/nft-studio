import React, { useState, useEffect, useCallback } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useServices } from '../contexts/ServiceContext.js';
import {
    Box,
    Typography,
    IconButton,
    Paper,
    Collapse,
    Divider,
    Chip,
    useTheme,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemSecondaryAction
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    Visibility,
    VisibilityOff,
    Delete,
    DragIndicator,
    SubdirectoryArrowRight,
    ArrowForward,
    Edit,
    Add,
    Schedule,
    ChevronRight,
    KeyboardArrowRight
} from '@mui/icons-material';

export default function EffectsPanel({
    effects,
    onEffectDelete,
    onEffectReorder,
    onEffectRightClick,
    onEffectToggleVisibility,
    onEffectEdit,
    onEffectAddSecondary,
    onEffectAddKeyframe,
    onSecondaryEffectReorder,
    onKeyframeEffectReorder,
    // Add Effect props
    availableEffects,
    effectsLoaded,
    currentTheme
}) {
    const theme = useTheme();
    const { eventBusService } = useServices();
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [draggedSecondaryIndex, setDraggedSecondaryIndex] = useState(null);
    const [draggedKeyframeIndex, setDraggedKeyframeIndex] = useState(null);
    const [addEffectMenuOpen, setAddEffectMenuOpen] = useState(false);

    // Debug effects prop changes
    console.log('📋 EffectsPanel: Component render - received effects:', effects?.length || 0, effects?.map(e => e.name || e.className) || []);
    const [expandedEffects, setExpandedEffects] = useState(new Set());
    const [secondaryEffects, setSecondaryEffects] = useState([]);
    const [keyframeEffects, setKeyframeEffects] = useState([]);

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

    // Event-driven Add Effect handler
    const handleAddEffectEvent = useCallback((effectName, effectType) => {
        console.log('🔥 EffectsPanel: Emitting effect add event:', { effectName, effectType });
        eventBusService.emit('effectspanel:effect:add', {
            effectName,
            effectType
        }, {
            source: 'EffectsPanel',
            component: 'EffectsPanel'
        });
        setAddEffectMenuOpen(false);
    }, [eventBusService]);

    const handleDragStart = (e, index, section) => {
        setDraggedIndex({ index, section });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex, section) => {
        e.preventDefault();
        if (draggedIndex !== null &&
            draggedIndex.index !== dropIndex &&
            draggedIndex.section === section) {
            onEffectReorder(draggedIndex.index, dropIndex);
        }
        setDraggedIndex(null);
    };

    // Sub-effect drag handlers
    const handleSecondaryDragStart = (e, parentIndex, subIndex) => {
        setDraggedSecondaryIndex({ parentIndex, subIndex });
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation(); // Prevent parent drag
    };

    const handleSecondaryDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.stopPropagation();
    };

    const handleSecondaryDrop = (e, parentIndex, dropIndex) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedSecondaryIndex !== null &&
            draggedSecondaryIndex.parentIndex === parentIndex &&
            draggedSecondaryIndex.subIndex !== dropIndex) {
            onSecondaryEffectReorder && onSecondaryEffectReorder(parentIndex, draggedSecondaryIndex.subIndex, dropIndex);
        }
        setDraggedSecondaryIndex(null);
    };

    const handleKeyframeDragStart = (e, parentIndex, subIndex) => {
        setDraggedKeyframeIndex({ parentIndex, subIndex });
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation(); // Prevent parent drag
    };

    const handleKeyframeDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.stopPropagation();
    };

    const handleKeyframeDrop = (e, parentIndex, dropIndex) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedKeyframeIndex !== null &&
            draggedKeyframeIndex.parentIndex === parentIndex &&
            draggedKeyframeIndex.subIndex !== dropIndex) {
            onKeyframeEffectReorder && onKeyframeEffectReorder(parentIndex, draggedKeyframeIndex.subIndex, dropIndex);
        }
        setDraggedKeyframeIndex(null);
    };

    const toggleExpanded = (index) => {
        const newExpanded = new Set(expandedEffects);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedEffects(newExpanded);
    };

    const formatEffectName = (effect) => {
        const registryKey = effect?.registryKey || effect;
        if (!registryKey || typeof registryKey !== 'string') {
            return 'Unknown Effect';
        }
        return registryKey.replace(/([A-Z])/g, ' $1').trim();
    };

    const renderSecondaryEffects = (effect, parentOriginalIndex) => {
        if (!effect.secondaryEffects || effect.secondaryEffects.length === 0) return null;

        return (
            <Box sx={{ ml: 2, mt: 0.5 }}>
                {effect.secondaryEffects.map((secondary, idx) => (
                    <ContextMenu.Root key={idx}>
                        <ContextMenu.Trigger asChild>
                            <Box
                                draggable={true}
                                onDragStart={(e) => handleSecondaryDragStart(e, parentOriginalIndex, idx)}
                                onDragOver={handleSecondaryDragOver}
                                onDrop={(e) => handleSecondaryDrop(e, parentOriginalIndex, idx)}
                                sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        backgroundColor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f8f8',
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 1,
                                        p: 1,
                                        mb: 0.25,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            backgroundColor: theme.palette.action.hover,
                                    }
                                }}
                            >
                                <SubdirectoryArrowRight
                                    sx={{
                                        fontSize: 14,
                                        color: theme.palette.text.secondary,
                                        mr: 1
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: theme.palette.text.primary,
                                        fontSize: '13px'
                                    }}
                                >
                                    {formatEffectName(secondary)}
                                </Typography>
                                </Paper>
                            </Box>
                        </ContextMenu.Trigger>
                        <ContextMenu.Portal>
                            <ContextMenu.Content style={menuStyles}>
                                <ContextMenu.Item
                                    style={itemStyles}
                                    onSelect={() => onEffectEdit && onEffectEdit(parentOriginalIndex, 'secondary', idx)}
                                >
                                    <Edit fontSize="small" />
                                    Edit Secondary Effect
                                </ContextMenu.Item>
                            </ContextMenu.Content>
                        </ContextMenu.Portal>
                    </ContextMenu.Root>
                ))}
            </Box>
        );
    };

    const renderKeyframeEffects = (effect, parentOriginalIndex) => {
        if (!effect.keyframeEffects || effect.keyframeEffects.length === 0) return null;

        return (
            <Box sx={{ ml: 2, mt: 0.5 }}>
                {effect.keyframeEffects.map((keyframe, idx) => (
                    <ContextMenu.Root key={idx}>
                        <ContextMenu.Trigger asChild>
                            <Box
                                draggable={true}
                                onDragStart={(e) => handleKeyframeDragStart(e, parentOriginalIndex, idx)}
                                onDragOver={handleKeyframeDragOver}
                                onDrop={(e) => handleKeyframeDrop(e, parentOriginalIndex, idx)}
                                sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        backgroundColor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f8f8',
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 1,
                                        p: 1,
                                        mb: 0.25,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            backgroundColor: theme.palette.action.hover,
                                        }
                                    }}
                                >
                                    <ArrowForward
                                        sx={{
                                            fontSize: 14,
                                            color: theme.palette.text.secondary,
                                            mr: 1
                                        }}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: theme.palette.text.primary,
                                            fontSize: '13px'
                                        }}
                                    >
                                        Frame {keyframe.frame}: {formatEffectName(keyframe)}
                                    </Typography>
                                </Paper>
                            </Box>
                        </ContextMenu.Trigger>
                        <ContextMenu.Portal>
                            <ContextMenu.Content style={menuStyles}>
                                <ContextMenu.Item
                                    style={itemStyles}
                                    onSelect={() => onEffectEdit && onEffectEdit(parentOriginalIndex, 'keyframe', idx)}
                                >
                                    <Edit fontSize="small" />
                                    Edit Keyframe Effect
                                </ContextMenu.Item>
                            </ContextMenu.Content>
                        </ContextMenu.Portal>
                    </ContextMenu.Root>
                ))}
            </Box>
        );
    };

    const isFinalEffect = (effect) => {
        if (!effect) return false;

        // Explicitly exclude secondary and keyframe effects from final effects
        if (effect.type === 'secondary' || effect.type === 'keyframe') {
            console.log('📋 EffectsPanel: Excluding from final effects:', effect.name || effect.className, 'type:', effect.type);
            return false;
        }

        // Only allow actual final image effects
        const isFinal = effect.type === 'finalImage';
        console.log('📋 EffectsPanel: Effect categorization:', {
            name: effect.name || effect.className,
            type: effect.type,
            isFinal
        });

        return isFinal;
    };

    // Context menu styles
    const menuStyles = {
        backgroundColor: theme.palette.mode === 'dark' ? '#323232' : theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '6px',
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.2)',
        padding: '4px',
        minWidth: '200px',
        zIndex: 1300,
    };

    const itemStyles = {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        fontSize: '14px',
        color: theme.palette.text.primary,
        cursor: 'pointer',
        borderRadius: '4px',
        outline: 'none',
        gap: '8px',
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
        '&:focus': {
            backgroundColor: theme.palette.action.hover,
        },
    };

    const separatorStyles = {
        height: '1px',
        backgroundColor: theme.palette.divider,
        margin: '4px 0',
    };

    const renderContextMenu = (effect, originalIndex) => {
        const isEffectFinal = isFinalEffect(effect);
        console.log('📋 EffectsPanel: Rendering context menu for effect:', {
            name: effect.name || effect.className,
            type: effect.type,
            isFinal: isEffectFinal
        });

        return (
            <ContextMenu.Portal>
                <ContextMenu.Content style={menuStyles}>
                    <ContextMenu.Item
                        style={itemStyles}
                        onSelect={() => onEffectEdit && onEffectEdit(originalIndex)}
                    >
                        <Edit fontSize="small" />
                        Edit Effect
                    </ContextMenu.Item>

                    {/* Only show secondary and keyframe options for non-final effects */}
                    {!isEffectFinal && (
                        <>
                            <ContextMenu.Separator style={separatorStyles} />

                            <ContextMenu.Sub>
                                <ContextMenu.SubTrigger style={{...itemStyles, justifyContent: 'space-between'}}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Add fontSize="small" />
                                        Add Secondary Effect
                                    </div>
                                    <ChevronRight fontSize="small" />
                                </ContextMenu.SubTrigger>
                                <ContextMenu.Portal>
                                    <ContextMenu.SubContent style={{...menuStyles, minWidth: '180px'}}>
                                        {secondaryEffects.length === 0 ? (
                                            <ContextMenu.Item
                                                disabled
                                                style={{
                                                    ...itemStyles,
                                                    fontStyle: 'italic',
                                                    color: theme.palette.text.disabled,
                                                    cursor: 'default'
                                                }}
                                            >
                                                No secondary effects available
                                            </ContextMenu.Item>
                                        ) : (
                                            secondaryEffects.map((secondaryEffect, index) => (
                                                <ContextMenu.Item
                                                    key={index}
                                                    style={itemStyles}
                                                    onSelect={() => onEffectAddSecondary && onEffectAddSecondary(secondaryEffect.name || secondaryEffect.className, 'secondary', originalIndex)}
                                                >
                                                    {secondaryEffect.displayName || secondaryEffect.name}
                                                </ContextMenu.Item>
                                            ))
                                        )}
                                    </ContextMenu.SubContent>
                                </ContextMenu.Portal>
                            </ContextMenu.Sub>

                            <ContextMenu.Separator style={separatorStyles} />

                            <ContextMenu.Sub>
                                <ContextMenu.SubTrigger style={{...itemStyles, justifyContent: 'space-between'}}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Schedule fontSize="small" />
                                        Add Keyframe Effect
                                    </div>
                                    <ChevronRight fontSize="small" />
                                </ContextMenu.SubTrigger>
                                <ContextMenu.Portal>
                                    <ContextMenu.SubContent style={{...menuStyles, minWidth: '180px'}}>
                                        {keyframeEffects.length === 0 ? (
                                            <ContextMenu.Item
                                                disabled
                                                style={{
                                                    ...itemStyles,
                                                    fontStyle: 'italic',
                                                    color: theme.palette.text.disabled,
                                                    cursor: 'default'
                                                }}
                                            >
                                                No keyframe effects available
                                            </ContextMenu.Item>
                                        ) : (
                                            keyframeEffects.map((keyframeEffect, index) => (
                                                <ContextMenu.Item
                                                    key={index}
                                                    style={itemStyles}
                                                    onSelect={() => onEffectAddKeyframe && onEffectAddKeyframe(keyframeEffect.name || keyframeEffect.className, 'keyframe', originalIndex)}
                                                >
                                                    {keyframeEffect.displayName || keyframeEffect.name} at frame
                                                </ContextMenu.Item>
                                            ))
                                        )}
                                    </ContextMenu.SubContent>
                                </ContextMenu.Portal>
                            </ContextMenu.Sub>
                        </>
                    )}
                </ContextMenu.Content>
            </ContextMenu.Portal>
        );
    };

    // Split effects into Primary and Final sections
    const effectsWithIndices = effects.map((effect, originalIndex) => ({ effect, originalIndex }));
    console.log('📋 EffectsPanel: effectsWithIndices:', effectsWithIndices.map(({ effect, originalIndex }) => `${originalIndex}: ${effect.name || effect.className}`));

    const primaryEffects = effectsWithIndices.filter(({ effect }) => !isFinalEffect(effect));
    const finalEffects = effectsWithIndices.filter(({ effect }) => isFinalEffect(effect));
    console.log('📋 EffectsPanel: primaryEffects count:', primaryEffects.length);
    console.log('📋 EffectsPanel: finalEffects count:', finalEffects.length);

    // Reusable effect rendering function
    const renderEffect = ({ effect, originalIndex }, sortedIndex, section) => {
        const isExpanded = expandedEffects.has(`${section}-${sortedIndex}`);
        const hasChildren =
            (effect.secondaryEffects?.length > 0) ||
            (effect.keyframeEffects?.length > 0);

        return (
            <ContextMenu.Root key={`${section}-${originalIndex}`}>
                <ContextMenu.Trigger asChild>
                    <Box
                        sx={{ mb: 0.25 }}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, originalIndex, section)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, originalIndex, section)}
                    >
                        <Paper
                            elevation={0}
                            sx={{
                                backgroundColor: theme.palette.background.default,
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 1,
                                p: 1,
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                userSelect: 'none',
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                    borderColor: theme.palette.primary.main,
                                }
                            }}
                        >
                            {hasChildren && (
                                <IconButton
                                    size="small"
                                    onClick={() => toggleExpanded(`${section}-${sortedIndex}`)}
                                    sx={{
                                        p: 0,
                                        mr: 1,
                                        color: theme.palette.text.secondary,
                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }}
                                >
                                    <ExpandMore sx={{ fontSize: 16 }} />
                                </IconButton>
                            )}
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEffectToggleVisibility && onEffectToggleVisibility(originalIndex);
                                }}
                                title={effect.visible !== false ? 'Hide layer' : 'Show layer'}
                                sx={{
                                    p: 0,
                                    mr: 1,
                                    color: effect.visible !== false
                                        ? theme.palette.primary.main
                                        : theme.palette.text.disabled,
                                    opacity: effect.visible !== false ? 1 : 0.5,
                                    '&:hover': {
                                        color: theme.palette.primary.main,
                                        opacity: 1
                                    }
                                }}
                            >
                                {effect.visible !== false ? <Visibility sx={{ fontSize: 16 }} /> : <VisibilityOff sx={{ fontSize: 16 }} />}
                            </IconButton>
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: theme.palette.text.primary,
                                        fontSize: '13px'
                                    }}
                                >
                                    {formatEffectName(effect)}
                                </Typography>
                                {isFinalEffect(effect) && (
                                    <Chip
                                        label="Final"
                                        size="small"
                                        sx={{
                                            height: 18,
                                            fontSize: '10px',
                                            backgroundColor: '#5cb85c',
                                            color: '#fff',
                                            '& .MuiChip-label': {
                                                px: 0.5
                                            }
                                        }}
                                    />
                                )}
                            </Box>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('🗑️ EffectsPanel: Delete button clicked for originalIndex:', originalIndex);
                                    console.log('🗑️ EffectsPanel: Effect being deleted:', effect.name || effect.className);
                                    onEffectDelete(originalIndex);
                                }}
                                title="Delete layer"
                                sx={{
                                    p: 0,
                                    color: theme.palette.text.secondary,
                                    opacity: 0.7,
                                    '&:hover': {
                                        opacity: 1,
                                        transform: 'scale(1.1)',
                                        color: theme.palette.error.main
                                    }
                                }}
                            >
                                <Delete sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Paper>
                        {isExpanded && (
                            <>
                                {renderSecondaryEffects(effect, originalIndex)}
                                {renderKeyframeEffects(effect, originalIndex)}
                            </>
                        )}
                    </Box>
                </ContextMenu.Trigger>
                {renderContextMenu(effect, originalIndex)}
            </ContextMenu.Root>
        );
    };

    return (
        <Paper
            elevation={0}
            sx={{
                width: 300,
                backgroundColor: theme.palette.background.paper,
                borderLeft: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}
        >
            <Box
                sx={{
                    backgroundColor: theme.palette.background.default,
                    p: 2,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Typography
                    variant="subtitle2"
                    sx={{
                        color: theme.palette.text.primary,
                        fontWeight: 400,
                        textTransform: 'uppercase',
                        letterSpacing: 1
                    }}
                >
                    Layers
                </Typography>
                {/* Add Effect Button */}
                {availableEffects && effectsLoaded && (
                    <AddEffectDropdown
                        addEffectMenuOpen={addEffectMenuOpen}
                        setAddEffectMenuOpen={setAddEffectMenuOpen}
                        availableEffects={availableEffects}
                        effectsLoaded={effectsLoaded}
                        currentTheme={currentTheme || theme}
                        onAddEffect={handleAddEffectEvent}
                    />
                )}
            </Box>
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 1
                }}
            >
                {effects.length === 0 ? (
                    <Typography
                        variant="body2"
                        sx={{
                            color: theme.palette.text.secondary,
                            textAlign: 'center',
                            p: 5,
                            fontSize: '13px'
                        }}
                    >
                        No effects added yet
                    </Typography>
                ) : (
                    <>
                        {/* Primary Effects Section */}
                        {primaryEffects.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: 1,
                                        fontSize: '10px',
                                        mb: 1,
                                        display: 'block',
                                        px: 1
                                    }}
                                >
                                    Primary Effects
                                </Typography>
                                {primaryEffects.map((effectData, index) =>
                                    renderEffect(effectData, index, 'primary')
                                )}
                            </Box>
                        )}

                        {/* Final Effects Section */}
                        {finalEffects.length > 0 && (
                            <Box>
                                {primaryEffects.length > 0 && (
                                    <Divider sx={{ mb: 2, borderColor: theme.palette.divider }} />
                                )}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: 1,
                                        fontSize: '10px',
                                        mb: 1,
                                        display: 'block',
                                        px: 1
                                    }}
                                >
                                    Final Effects
                                </Typography>
                                {finalEffects.map((effectData, index) =>
                                    renderEffect(effectData, index, 'final')
                                )}
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Paper>
    );
}

function AddEffectDropdown({
    addEffectMenuOpen,
    setAddEffectMenuOpen,
    availableEffects,
    effectsLoaded,
    currentTheme,
    onAddEffect
}) {
    return (
        <Box sx={{ position: 'relative' }}>
            <DropdownMenu.Root
                open={addEffectMenuOpen}
                onOpenChange={setAddEffectMenuOpen}
            >
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
                        title="Add Effect"
                    >
                        <Add />
                    </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        side="bottom"
                        align="start"
                        sideOffset={5}
                        style={{
                            backgroundColor: currentTheme.palette.mode === 'dark' ? '#323232' : currentTheme.palette.background.paper,
                            border: `1px solid ${currentTheme.palette.divider}`,
                            borderRadius: '6px',
                            boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.2)',
                            padding: '4px',
                            minWidth: '200px',
                            zIndex: 9999,
                        }}
                    >
                        {!effectsLoaded ? (
                            <DropdownMenu.Item
                                disabled
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    color: currentTheme.palette.text.disabled,
                                    cursor: 'default',
                                    borderRadius: '4px',
                                    outline: 'none',
                                    gap: '8px',
                                    fontStyle: 'italic'
                                }}
                            >
                                Loading effects...
                            </DropdownMenu.Item>
                        ) : (
                            <>
                                {/* Primary Effects Submenu */}
                                <EffectSubmenu
                                    title={`Primary Effects (${availableEffects.primary.length})`}
                                    effects={availableEffects.primary}
                                    effectType="primary"
                                    currentTheme={currentTheme}
                                    onAddEffect={onAddEffect}
                                    setAddEffectMenuOpen={setAddEffectMenuOpen}
                                />

                                {/* Final Effects Submenu */}
                                <EffectSubmenu
                                    title={`Final Effects (${availableEffects.finalImage.length})`}
                                    effects={availableEffects.finalImage}
                                    effectType="finalImage"
                                    currentTheme={currentTheme}
                                    onAddEffect={onAddEffect}
                                    setAddEffectMenuOpen={setAddEffectMenuOpen}
                                />

                                {/* Keyframe Effects Submenu */}
                                {availableEffects.keyFrame?.length > 0 && (
                                    <EffectSubmenu
                                        title={`Keyframe Effects (${availableEffects.keyFrame.length})`}
                                        effects={availableEffects.keyFrame}
                                        effectType="keyFrame"
                                        currentTheme={currentTheme}
                                        onAddEffect={onAddEffect}
                                        setAddEffectMenuOpen={setAddEffectMenuOpen}
                                    />
                                )}
                            </>
                        )}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </Box>
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