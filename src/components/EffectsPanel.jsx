import React, { useState } from 'react';
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
    ArrowForward
} from '@mui/icons-material';

export default function EffectsPanel({
    effects,
    onEffectDelete,
    onEffectReorder,
    onEffectRightClick,
    onEffectToggleVisibility
}) {
    const theme = useTheme();
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [expandedEffects, setExpandedEffects] = useState(new Set());

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            onEffectReorder(draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
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

    const formatEffectName = (className) => {
        if (!className || typeof className !== 'string') {
            return 'Unknown Effect';
        }
        return className.replace(/([A-Z])/g, ' $1').trim();
    };

    const renderSecondaryEffects = (effect, parentOriginalIndex) => {
        if (!effect.secondaryEffects || effect.secondaryEffects.length === 0) return null;

        return (
            <Box sx={{ ml: 2, mt: 0.5 }}>
                {effect.secondaryEffects.map((secondary, idx) => (
                    <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                            backgroundColor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f8f8',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            p: 1,
                            mb: 0.25,
                            display: 'flex',
                            alignItems: 'center',
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
                            {formatEffectName(secondary.className)}
                        </Typography>
                    </Paper>
                ))}
            </Box>
        );
    };

    const renderKeyframeEffects = (effect, parentOriginalIndex) => {
        if (!effect.keyframeEffects || effect.keyframeEffects.length === 0) return null;

        return (
            <Box sx={{ ml: 2, mt: 0.5 }}>
                {effect.keyframeEffects.map((keyframe, idx) => (
                    <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                            backgroundColor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f8f8',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            p: 1,
                            mb: 0.25,
                            display: 'flex',
                            alignItems: 'center',
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
                            Frame {keyframe.frame}: {formatEffectName(keyframe.className)}
                        </Typography>
                    </Paper>
                ))}
            </Box>
        );
    };

    const isFinalEffect = (className) => {
        return className && className.toLowerCase().includes('final');
    };

    const sortedEffectsWithIndices = effects
        .map((effect, originalIndex) => ({ effect, originalIndex }))
        .sort((a, b) => {
            const aIsFinal = isFinalEffect(a.effect.className);
            const bIsFinal = isFinalEffect(b.effect.className);
            if (aIsFinal && !bIsFinal) return 1;
            if (!aIsFinal && bIsFinal) return -1;
            return 0;
        });

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
                    borderBottom: `1px solid ${theme.palette.divider}`
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
            </Box>
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 1
                }}
            >
                {sortedEffectsWithIndices.length === 0 ? (
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
                    sortedEffectsWithIndices.map(({ effect, originalIndex }, sortedIndex) => {
                        const isExpanded = expandedEffects.has(sortedIndex);
                        const hasChildren =
                            (effect.secondaryEffects?.length > 0) ||
                            (effect.keyframeEffects?.length > 0);

                        return (
                            <Box
                                key={originalIndex}
                                sx={{ mb: 0.25 }}
                                draggable={!isFinalEffect(effect.className)}
                                onDragStart={(e) => handleDragStart(e, originalIndex)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, originalIndex)}
                                onContextMenu={(e) => onEffectRightClick(effect, originalIndex, e)}
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
                                            onClick={() => toggleExpanded(sortedIndex)}
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
                                            {formatEffectName(effect.className)}
                                        </Typography>
                                        {isFinalEffect(effect.className) && (
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
                        );
                    })
                )}
            </Box>
        </Paper>
    );
}