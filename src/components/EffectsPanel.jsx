import React, { useState, useEffect, useCallback } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useServices } from '../contexts/ServiceContext.js';
import PreferencesService from '../services/PreferencesService.js';
import SpecialtyEffectsModal from './effects/SpecialtyEffectsModal.jsx';
import BulkAddKeyframeModal from './effects/BulkAddKeyframeModal.jsx';
import EffectConfigurer from './effects/EffectConfigurer.jsx';
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
    ListItemSecondaryAction,
    Drawer
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
    Add,
    StarBorder,
    Schedule,
    ChevronRight,
    KeyboardArrowRight,
    PlaylistAdd,
    Refresh,
    ChevronLeft,
    Settings
} from '@mui/icons-material';

// Helper component for rendering grouped effects in context menus
function GroupedContextMenuEffects({ effects, onSelect, theme, itemStyles }) {
    const [expandedAuthors, setExpandedAuthors] = React.useState(new Set());

    // Group effects by author
    const groupedEffects = React.useMemo(() => {
        const groups = {};
        effects.forEach(effect => {
            const author = effect.author || 'NFT Studio';
            if (!groups[author]) {
                groups[author] = [];
            }
            groups[author].push(effect);
        });
        return groups;
    }, [effects]);

    const authorNames = Object.keys(groupedEffects).sort();

    const toggleAuthor = (authorName, e) => {
        e.preventDefault();
        e.stopPropagation();
        const newExpanded = new Set(expandedAuthors);
        if (newExpanded.has(authorName)) {
            newExpanded.delete(authorName);
        } else {
            newExpanded.add(authorName);
        }
        setExpandedAuthors(newExpanded);
    };

    return (
        <>
            {authorNames.map((authorName) => {
                const authorEffects = groupedEffects[authorName];
                const isExpanded = expandedAuthors.has(authorName);

                return (
                    <React.Fragment key={authorName}>
                        {/* Author Group Header */}
                        <div
                            onClick={(e) => toggleAuthor(authorName, e)}
                            style={{
                                ...itemStyles,
                                fontWeight: 600,
                                fontSize: '12px',
                                color: theme.palette.text.secondary,
                                backgroundColor: theme.palette.mode === 'dark' 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : 'rgba(0, 0, 0, 0.03)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '2px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.palette.mode === 'dark' 
                                    ? 'rgba(255, 255, 255, 0.08)' 
                                    : 'rgba(0, 0, 0, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme.palette.mode === 'dark' 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : 'rgba(0, 0, 0, 0.03)';
                            }}
                        >
                            <ChevronRight 
                                sx={{ 
                                    fontSize: 14,
                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }} 
                            />
                            <span>{authorName}</span>
                            <span style={{ 
                                marginLeft: 'auto', 
                                fontSize: '10px',
                                opacity: 0.7
                            }}>
                                ({authorEffects.length})
                            </span>
                        </div>

                        {/* Author Effects (collapsible) */}
                        {isExpanded && authorEffects.map((effect, index) => (
                            <ContextMenu.Item
                                key={index}
                                style={{
                                    ...itemStyles,
                                    paddingLeft: '32px'
                                }}
                                onSelect={() => onSelect(effect)}
                            >
                                {effect.displayName || effect.name}
                            </ContextMenu.Item>
                        ))}
                    </React.Fragment>
                );
            })}
        </>
    );
}

export default function EffectsPanel({
    effects,
    onEffectDelete,
    onEffectReorder,
    onEffectRightClick,
    onEffectToggleVisibility,
    onEffectAddSecondary,
    onEffectAddKeyframe,
    onSecondaryEffectReorder,
    onKeyframeEffectReorder,
    onSecondaryEffectDelete,
    onKeyframeEffectDelete,
    onSecondaryEffectToggleVisibility,
    onKeyframeEffectToggleVisibility,
    // Add Effect props
    availableEffects,
    effectsLoaded,
    currentTheme,
    projectState,
    isReadOnly = false,
    refreshAvailableEffects
}) {
    const theme = useTheme();
    const { eventBusService } = useServices();
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [draggedSecondaryIndex, setDraggedSecondaryIndex] = useState(null);
    const [draggedKeyframeIndex, setDraggedKeyframeIndex] = useState(null);
    const [addEffectMenuOpen, setAddEffectMenuOpen] = useState(false);
    const [specialtyModalOpen, setSpecialtyModalOpen] = useState(false);
    const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false);
    const [bulkAddTargetIndex, setBulkAddTargetIndex] = useState(null);
    
    // Selection state: stores { effectIndex, effectType, subIndex }
    const [selectedEffect, setSelectedEffect] = useState(null);
    
    // Config panel state
    const [configPanelOpen, setConfigPanelOpen] = useState(false);
    const [configPanelWidth, setConfigPanelWidth] = useState(400);

    // Debug effects prop changes
    const [expandedEffects, setExpandedEffects] = useState(new Set());
    const [secondaryEffects, setSecondaryEffects] = useState([]);
    const [keyframeEffects, setKeyframeEffects] = useState([]);

    // Check if all effects are visible
    const areAllEffectsVisible = effects.every(effect => effect.visible !== false);

    // Debug: Log isReadOnly prop changes
    useEffect(() => {
        console.log('🎨 EffectsPanel: isReadOnly prop changed to:', isReadOnly);
    }, [isReadOnly]);

    useEffect(() => {
        loadEffects();
    }, []);

    // Collapse all effects and close config panel when entering read-only mode (pinned)
    useEffect(() => {
        if (isReadOnly) {
            console.log('🎨 EffectsPanel: Entering read-only mode - collapsing effects and closing config panel');
            setExpandedEffects(new Set());
            setConfigPanelOpen(false);
        }
    }, [isReadOnly]);

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
        eventBusService.emit('effectspanel:effect:add', {
            effectName,
            effectType
        }, {
            source: 'EffectsPanel',
            component: 'EffectsPanel'
        });
        setAddEffectMenuOpen(false);
    }, [eventBusService]);

    // Handle effect selection
    const handleEffectSelect = useCallback((effectIndex, effectType = 'primary', subIndex = null) => {
        const selectionData = {
            effectIndex,
            effectType,
            subIndex
        };
        
        setSelectedEffect(selectionData);
        
        // Open config panel when an effect is selected
        if (!isReadOnly) {
            setConfigPanelOpen(true);
        }
        
        // Emit selection event for other components to react
        eventBusService.emit('effect:selected', selectionData, {
            source: 'EffectsPanel',
            component: 'EffectsPanel'
        });
    }, [eventBusService, isReadOnly]);

    // Check if an effect is selected
    const isEffectSelected = useCallback((effectIndex, effectType = 'primary', subIndex = null) => {
        if (!selectedEffect) return false;
        
        return selectedEffect.effectIndex === effectIndex &&
               selectedEffect.effectType === effectType &&
               selectedEffect.subIndex === subIndex;
    }, [selectedEffect]);

    // Get the selected effect data for the config panel
    // CRITICAL FIX: Always fetch fresh data from ProjectState to avoid stale config
    const getSelectedEffectData = useCallback(() => {
        if (!selectedEffect || !projectState) return null;
        
        // Get FRESH effects directly from ProjectState (single source of truth)
        const freshEffects = projectState.getState().effects || [];
        
        const { effectIndex, effectType, subIndex } = selectedEffect;
        const effect = freshEffects[effectIndex];
        
        if (!effect) return null;
        
        // Handle different effect types
        if (effectType === 'secondary' && subIndex !== null) {
            const secondaryEffect = effect.secondaryEffects?.[subIndex];
            return secondaryEffect ? {
                ...secondaryEffect,
                effectIndex,
                effectType: 'secondary',
                subEffectIndex: subIndex
            } : null;
        } else if (effectType === 'keyframe' && subIndex !== null) {
            const keyframeEffect = effect.keyframeEffects?.[subIndex];
            return keyframeEffect ? {
                ...keyframeEffect,
                effectIndex,
                effectType: 'keyframe',
                subEffectIndex: subIndex
            } : null;
        } else {
            // Primary or final effect
            return {
                ...effect,
                effectIndex,
                effectType: effect.type || 'primary',
                subEffectIndex: null
            };
        }
    }, [selectedEffect, projectState]);

    // Handle config changes from the config panel
    const handleConfigPanelChange = useCallback((updatedConfig) => {
        if (!selectedEffect) return;
        
        const { effectIndex, effectType, subIndex } = selectedEffect;
        
        // Emit config change event (matches listener in useEffectManagement.js)
        eventBusService.emit('effect:config:change', {
            effectIndex,
            effectType,
            subEffectIndex: subIndex, // Use subEffectIndex to match listener expectations
            config: updatedConfig
        }, {
            source: 'EffectsPanel',
            component: 'ConfigPanel'
        });
    }, [selectedEffect, eventBusService]);

    // Toggle all effects visibility
    const handleToggleAllVisibility = useCallback(() => {
        const shouldHide = areAllEffectsVisible;
        effects.forEach((_, index) => {
            if ((effects[index].visible !== false) === shouldHide) {
                onEffectToggleVisibility(index);
            }
        });
    }, [effects, areAllEffectsVisible, onEffectToggleVisibility]);

    // Specialty effects creation handler
    const handleCreateSpecialty = useCallback(async (specialtyData) => {
        // Detect position property name from effect's default config
        const detectPositionProperty = (effectClass) => {
            const defaultConfig = effectClass.defaultConfig || {};

            // Check for common position property names
            if (defaultConfig.center !== undefined) return 'center';
            if (defaultConfig.position !== undefined) return 'position';
            if (defaultConfig.point !== undefined) return 'point';
            if (defaultConfig.location !== undefined) return 'location';

            // Fallback to 'center' for most effects
            return 'center';
        };

        const positionPropertyName = detectPositionProperty(specialtyData.effectClass);

        // Get effect configuration in priority order:
        // 1. Custom config from wizard (highest priority)
        // 2. User-saved defaults
        // 3. Effect's default config (fallback)
        const registryKey = specialtyData.effectClass.registryKey;
        const savedDefaults = await PreferencesService.getEffectDefaults(registryKey);

        let baseConfig;
        let configSource;

        if (specialtyData.effectConfig) {
            // Use custom configuration from the wizard
            baseConfig = specialtyData.effectConfig;
            configSource = 'Wizard Configuration';
        } else if (savedDefaults) {
            // Use user-saved defaults
            baseConfig = savedDefaults;
            configSource = 'User Preferences';
        } else {
            // Fallback to raw defaults
            baseConfig = specialtyData.effectClass.defaultConfig;
            configSource = 'Default Configuration';
        }

        console.log('🌟 EffectsPanel: Using effect configuration:', {
            registryKey,
            hasWizardConfig: !!specialtyData.effectConfig,
            hasUserPreferences: !!savedDefaults,
            configSource,
            finalConfig: configSource
        });

        // Create individual effects for each position
        specialtyData.positions.forEach((position, index) => {
            // Create proper Position object structure
            const positionObject = {
                name: 'position',
                x: Math.round(position.x),
                y: Math.round(position.y),
                __className: 'Position'
            };

            const effectData = {
                effectName: specialtyData.effectClass.registryKey,
                effectType: 'primary',
                config: {
                    // Use user preferences first, fallback to raw defaults
                    ...baseConfig,
                    // Override position with calculated position using correct property name
                    [positionPropertyName]: positionObject,
                    // Add specialty metadata
                    specialtyGroup: `${specialtyData.effectClass.registryKey}_${Date.now()}`,
                    specialtyIndex: index,
                    specialtyTotal: specialtyData.positions.length
                },
                percentChance: 100 // Specialty effects always occur
            };

            console.log('🌟 EffectsPanel: Creating effect with position:', {
                effectName: specialtyData.effectClass.registryKey,
                positionPropertyName,
                positionObject,
                originalPosition: position,
                usingUserDefaults: !!savedDefaults
            });

            // Emit individual effect creation events
            eventBusService.emit('effectspanel:effect:add', effectData, {
                source: 'EffectsPanel',
                component: 'SpecialtyCreator'
            });
        });

        // Close the modal
        setSpecialtyModalOpen(false);
    }, [eventBusService]);

    // Bulk Add Keyframes handler
    const handleBulkAddKeyframes = useCallback((keyframeEffectsData) => {
        if (bulkAddTargetIndex === null || !keyframeEffectsData || keyframeEffectsData.length === 0) {
            return;
        }

        // Emit events for each keyframe effect using the standard event format
        keyframeEffectsData.forEach(keyframeData => {
            eventBusService.emit('effectspanel:effect:addkeyframe', {
                effectName: keyframeData.registryKey,
                effectType: 'keyframe',
                parentIndex: bulkAddTargetIndex,
                frame: keyframeData.frame,
                config: keyframeData.config
            }, {
                source: 'EffectsPanel',
                component: 'BulkAddKeyframes'
            });
        });

        // Close the modal and reset state
        setBulkAddModalOpen(false);
        setBulkAddTargetIndex(null);
    }, [eventBusService, bulkAddTargetIndex]);

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
        // Prevent expansion when in read-only mode (pinned)
        if (isReadOnly) {
            return;
        }
        
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

    const formatEffectId = (id) => {
        if (!id || typeof id !== 'string') {
            return null;
        }
        
        // If it's a UUID-like string, show only the first 8 characters
        if (id.length > 16 && id.includes('-')) {
            return id.substring(0, 8).toUpperCase();
        }
        
        // If it's a long string, truncate and add ellipsis
        if (id.length > 12) {
            return id.substring(0, 8).toUpperCase() + '...';
        }
        
        // For shorter IDs, just uppercase them
        return id.toUpperCase();
    };

    const formatKeyframeDisplay = (keyframe) => {
        // Check if keyframe has config with keyFrames array
        if (keyframe.config && keyframe.config.keyFrames && Array.isArray(keyframe.config.keyFrames)) {
            const frames = keyframe.config.keyFrames;
            if (frames.length === 1) {
                return `Frame ${frames[0]}`;
            } else if (frames.length > 1) {
                return `Frames ${frames.join(', ')}`;
            }
        }
        
        // Fallback to the old single frame display
        return `Frame ${keyframe.frame || 0}`;
    };

    // Context menu styles (defined early for use in render functions)
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

    const renderSecondaryEffects = (effect, parentOriginalIndex) => {
        if (!effect.secondaryEffects || effect.secondaryEffects.length === 0) return null;

        return (
            <Box sx={{ ml: 2, mt: 0.5 }}>
                {effect.secondaryEffects.map((secondary, idx) => {
                    const isSelected = isEffectSelected(parentOriginalIndex, 'secondary', idx);
                    
                    return (
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
                                        onClick={() => handleEffectSelect(parentOriginalIndex, 'secondary', idx)}
                                        onContextMenu={() => handleEffectSelect(parentOriginalIndex, 'secondary', idx)}
                                        sx={{
                                            backgroundColor: isSelected
                                                ? theme.palette.mode === 'dark'
                                                    ? 'rgba(255, 183, 77, 0.24)'
                                                    : 'rgba(255, 152, 0, 0.12)'
                                                : theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f8f8',
                                            border: isSelected
                                                ? `2px solid ${theme.palette.mode === 'dark' ? '#ffb74d' : '#f57c00'}`
                                                : `1px solid ${theme.palette.divider}`,
                                            borderRadius: 1,
                                            p: 1,
                                            mb: 0.25,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                backgroundColor: isSelected
                                                    ? theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 183, 77, 0.32)'
                                                        : 'rgba(255, 152, 0, 0.16)'
                                                    : theme.palette.action.hover,
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                            {secondary.id && (
                                                <Chip
                                                    label={formatEffectId(secondary.id)}
                                                    size="small"
                                                    title={`Full ID: ${secondary.id}`}
                                                    sx={{
                                                        height: 16,
                                                        fontSize: '9px',
                                                        fontWeight: 500,
                                                        backgroundColor: theme.palette.mode === 'dark' 
                                                            ? 'rgba(255, 183, 77, 0.16)' 
                                                            : 'rgba(255, 152, 0, 0.08)',
                                                        color: theme.palette.mode === 'dark' 
                                                            ? '#ffb74d' 
                                                            : '#f57c00',
                                                        border: `1px solid ${theme.palette.mode === 'dark' 
                                                            ? 'rgba(255, 183, 77, 0.3)' 
                                                            : 'rgba(255, 152, 0, 0.2)'}`,
                                                        fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                                                        letterSpacing: '0.3px',
                                                        '& .MuiChip-label': {
                                                            px: 0.5,
                                                            py: 0.2
                                                        },
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.mode === 'dark' 
                                                                ? 'rgba(255, 183, 77, 0.24)' 
                                                                : 'rgba(255, 152, 0, 0.12)',
                                                            transform: 'scale(1.05)',
                                                            transition: 'all 0.2s ease-in-out'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconButton
                                                size="small"
                                                disabled={isReadOnly}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isReadOnly) return;
                                                    onSecondaryEffectToggleVisibility && onSecondaryEffectToggleVisibility(parentOriginalIndex, idx);
                                                }}
                                                title={isReadOnly ? "Read-only mode" : (secondary.visible !== false ? 'Hide secondary effect' : 'Show secondary effect')}
                                                sx={{
                                                    p: 0,
                                                    color: isReadOnly 
                                                        ? theme.palette.text.disabled 
                                                        : (secondary.visible !== false
                                                            ? theme.palette.primary.main
                                                            : theme.palette.text.disabled),
                                                    opacity: isReadOnly ? 0.3 : (secondary.visible !== false ? 1 : 0.5),
                                                    '&:hover': !isReadOnly ? {
                                                        color: theme.palette.primary.main,
                                                        opacity: 1
                                                    } : {}
                                                }}
                                            >
                                                {secondary.visible !== false ? <Visibility sx={{ fontSize: 14 }} /> : <VisibilityOff sx={{ fontSize: 14 }} />}
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                disabled={isReadOnly}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isReadOnly) return;
                                                    onSecondaryEffectDelete && onSecondaryEffectDelete(parentOriginalIndex, idx);
                                                }}
                                                title={isReadOnly ? "Read-only mode" : "Delete secondary effect"}
                                                sx={{
                                                    p: 0,
                                                    color: isReadOnly ? theme.palette.text.disabled : theme.palette.text.secondary,
                                                    opacity: isReadOnly ? 0.3 : 0.7,
                                                    '&:hover': !isReadOnly ? {
                                                        opacity: 1,
                                                        transform: 'scale(1.1)',
                                                        color: theme.palette.error.main
                                                    } : {}
                                                }}
                                            >
                                                <Delete sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Box>
                                    </Paper>
                                </Box>
                            </ContextMenu.Trigger>
                            <ContextMenu.Portal>
                                <ContextMenu.Content style={menuStyles}>
                                    <ContextMenu.Item
                                        disabled={isReadOnly}
                                        style={{
                                            ...itemStyles,
                                            color: isReadOnly ? theme.palette.text.disabled : itemStyles.color,
                                            cursor: isReadOnly ? 'default' : 'pointer'
                                        }}
                                        onSelect={() => !isReadOnly && onSecondaryEffectDelete && onSecondaryEffectDelete(parentOriginalIndex, idx)}
                                    >
                                        <Delete fontSize="small" />
                                        {isReadOnly ? 'Delete Secondary Effect (Read-only)' : 'Delete Secondary Effect'}
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Portal>
                        </ContextMenu.Root>
                    );
                })}
            </Box>
        );
    };

    const renderKeyframeEffects = (effect, parentOriginalIndex) => {
        const keyframeEffects = effect.keyframeEffects || [];
        if (!keyframeEffects || keyframeEffects.length === 0) return null;

        return (
            <Box sx={{ ml: 2, mt: 0.5 }}>
                {keyframeEffects.map((keyframe, idx) => {
                    const isSelected = isEffectSelected(parentOriginalIndex, 'keyframe', idx);
                    
                    return (
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
                                        onClick={() => handleEffectSelect(parentOriginalIndex, 'keyframe', idx)}
                                        onContextMenu={() => handleEffectSelect(parentOriginalIndex, 'keyframe', idx)}
                                        sx={{
                                            backgroundColor: isSelected
                                                ? theme.palette.mode === 'dark'
                                                    ? 'rgba(129, 199, 132, 0.24)'
                                                    : 'rgba(76, 175, 80, 0.12)'
                                                : theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f8f8',
                                            border: isSelected
                                                ? `2px solid ${theme.palette.mode === 'dark' ? '#81c784' : '#388e3c'}`
                                                : `1px solid ${theme.palette.divider}`,
                                            borderRadius: 1,
                                            p: 1,
                                            mb: 0.25,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                backgroundColor: isSelected
                                                    ? theme.palette.mode === 'dark'
                                                        ? 'rgba(129, 199, 132, 0.32)'
                                                        : 'rgba(76, 175, 80, 0.16)'
                                                    : theme.palette.action.hover,
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                                {formatKeyframeDisplay(keyframe)}: {formatEffectName(keyframe)}
                                            </Typography>
                                            {keyframe.id && (
                                                <Chip
                                                    label={formatEffectId(keyframe.id)}
                                                    size="small"
                                                    title={`Full ID: ${keyframe.id}`}
                                                    sx={{
                                                        height: 16,
                                                        fontSize: '9px',
                                                        fontWeight: 500,
                                                        backgroundColor: theme.palette.mode === 'dark' 
                                                            ? 'rgba(129, 199, 132, 0.16)' 
                                                            : 'rgba(76, 175, 80, 0.08)',
                                                        color: theme.palette.mode === 'dark' 
                                                            ? '#81c784' 
                                                            : '#388e3c',
                                                        border: `1px solid ${theme.palette.mode === 'dark' 
                                                            ? 'rgba(129, 199, 132, 0.3)' 
                                                            : 'rgba(76, 175, 80, 0.2)'}`,
                                                        fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                                                        letterSpacing: '0.3px',
                                                        '& .MuiChip-label': {
                                                            px: 0.5,
                                                            py: 0.2
                                                        },
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.mode === 'dark' 
                                                                ? 'rgba(129, 199, 132, 0.24)' 
                                                                : 'rgba(76, 175, 80, 0.12)',
                                                            transform: 'scale(1.05)',
                                                            transition: 'all 0.2s ease-in-out'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconButton
                                                size="small"
                                                disabled={isReadOnly}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isReadOnly) return;
                                                    onKeyframeEffectToggleVisibility && onKeyframeEffectToggleVisibility(parentOriginalIndex, idx);
                                                }}
                                                title={isReadOnly ? "Read-only mode" : (keyframe.visible !== false ? 'Hide keyframe effect' : 'Show keyframe effect')}
                                                sx={{
                                                    p: 0,
                                                    color: isReadOnly 
                                                        ? theme.palette.text.disabled 
                                                        : (keyframe.visible !== false
                                                            ? theme.palette.primary.main
                                                            : theme.palette.text.disabled),
                                                    opacity: isReadOnly ? 0.3 : (keyframe.visible !== false ? 1 : 0.5),
                                                    '&:hover': !isReadOnly ? {
                                                        color: theme.palette.primary.main,
                                                        opacity: 1
                                                    } : {}
                                                }}
                                            >
                                                {keyframe.visible !== false ? <Visibility sx={{ fontSize: 14 }} /> : <VisibilityOff sx={{ fontSize: 14 }} />}
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                disabled={isReadOnly}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isReadOnly) return;
                                                    onKeyframeEffectDelete && onKeyframeEffectDelete(parentOriginalIndex, idx);
                                                }}
                                                title={isReadOnly ? "Read-only mode" : "Delete keyframe effect"}
                                                sx={{
                                                    p: 0,
                                                    color: isReadOnly ? theme.palette.text.disabled : theme.palette.text.secondary,
                                                    opacity: isReadOnly ? 0.3 : 0.7,
                                                    '&:hover': !isReadOnly ? {
                                                        opacity: 1,
                                                        transform: 'scale(1.1)',
                                                        color: theme.palette.error.main
                                                    } : {}
                                                }}
                                            >
                                                <Delete sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Box>
                                    </Paper>
                                </Box>
                            </ContextMenu.Trigger>
                            <ContextMenu.Portal>
                                <ContextMenu.Content style={menuStyles}>
                                    <ContextMenu.Item
                                        disabled={isReadOnly}
                                        style={{
                                            ...itemStyles,
                                            color: isReadOnly ? theme.palette.text.disabled : itemStyles.color,
                                            cursor: isReadOnly ? 'default' : 'pointer'
                                        }}
                                        onSelect={() => !isReadOnly && onKeyframeEffectDelete && onKeyframeEffectDelete(parentOriginalIndex, idx)}
                                    >
                                        <Delete fontSize="small" />
                                        {isReadOnly ? 'Delete Keyframe Effect (Read-only)' : 'Delete Keyframe Effect'}
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Portal>
                        </ContextMenu.Root>
                    );
                })}
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
                    {/* Only show secondary and keyframe options for non-final effects and not in read-only mode */}
                    {!isEffectFinal && !isReadOnly && (
                        <>

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
                                            <GroupedContextMenuEffects
                                                effects={secondaryEffects}
                                                onSelect={(secondaryEffect) => onEffectAddSecondary && onEffectAddSecondary(secondaryEffect.name || secondaryEffect.className, 'secondary', originalIndex)}
                                                theme={theme}
                                                itemStyles={itemStyles}
                                            />
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
                                            <GroupedContextMenuEffects
                                                effects={keyframeEffects}
                                                onSelect={(keyframeEffect) => onEffectAddKeyframe && onEffectAddKeyframe(keyframeEffect.name || keyframeEffect.className, 'keyframe', originalIndex)}
                                                theme={theme}
                                                itemStyles={itemStyles}
                                            />
                                        )}
                                    </ContextMenu.SubContent>
                                </ContextMenu.Portal>
                            </ContextMenu.Sub>

                            <ContextMenu.Separator style={separatorStyles} />

                            <ContextMenu.Item
                                style={itemStyles}
                                onSelect={() => {
                                    setBulkAddTargetIndex(originalIndex);
                                    setBulkAddModalOpen(true);
                                }}
                            >
                                <PlaylistAdd fontSize="small" />
                                Bulk Add Keyframes
                            </ContextMenu.Item>
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
            (effect.keyframeEffects?.length > 0) ||
            false;
        
        // CRITICAL FIX: Use actual effect type instead of hardcoded 'primary'
        // This ensures final image effects are treated correctly when applying presets
        const effectType = effect.type || 'primary';
        const isSelected = isEffectSelected(originalIndex, effectType, null);

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
                            onClick={() => handleEffectSelect(originalIndex, effectType, null)}
                            onContextMenu={() => handleEffectSelect(originalIndex, effectType, null)}
                            sx={{
                                backgroundColor: isSelected 
                                    ? theme.palette.mode === 'dark'
                                        ? 'rgba(144, 202, 249, 0.16)'
                                        : 'rgba(25, 118, 210, 0.08)'
                                    : theme.palette.background.default,
                                border: isSelected
                                    ? `2px solid ${theme.palette.primary.main}`
                                    : `1px solid ${theme.palette.divider}`,
                                borderRadius: 1,
                                p: 1,
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                userSelect: 'none',
                                '&:hover': {
                                    backgroundColor: isSelected
                                        ? theme.palette.mode === 'dark'
                                            ? 'rgba(144, 202, 249, 0.24)'
                                            : 'rgba(25, 118, 210, 0.12)'
                                        : theme.palette.action.hover,
                                    borderColor: theme.palette.primary.main,
                                }
                            }}
                        >
                            {hasChildren && (
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpanded(`${section}-${sortedIndex}`);
                                    }}
                                    disabled={isReadOnly}
                                    title={isReadOnly ? "Cannot expand effects while pinned" : (isExpanded ? "Collapse" : "Expand")}
                                    sx={{
                                        p: 0,
                                        mr: 1,
                                        color: isReadOnly ? theme.palette.text.disabled : theme.palette.text.secondary,
                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                        opacity: isReadOnly ? 0.3 : 1,
                                        cursor: isReadOnly ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <ExpandMore sx={{ fontSize: 16 }} />
                                </IconButton>
                            )}
                            <IconButton
                                size="small"
                                disabled={isReadOnly}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isReadOnly) return;
                                    onEffectToggleVisibility && onEffectToggleVisibility(originalIndex);
                                }}
                                title={isReadOnly ? "Read-only mode" : (effect.visible !== false ? 'Hide layer' : 'Show layer')}
                                sx={{
                                    p: 0,
                                    mr: 1,
                                    color: isReadOnly 
                                        ? theme.palette.text.disabled 
                                        : (effect.visible !== false
                                            ? theme.palette.primary.main
                                            : theme.palette.text.disabled),
                                    opacity: isReadOnly ? 0.3 : (effect.visible !== false ? 1 : 0.5),
                                    '&:hover': !isReadOnly ? {
                                        color: theme.palette.primary.main,
                                        opacity: 1
                                    } : {}
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
                                {effect.id && (
                                    <Chip
                                        label={formatEffectId(effect.id)}
                                        size="small"
                                        title={`Full ID: ${effect.id}`}
                                        sx={{
                                            height: 18,
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            backgroundColor: theme.palette.mode === 'dark' 
                                                ? 'rgba(144, 202, 249, 0.16)' 
                                                : 'rgba(25, 118, 210, 0.08)',
                                            color: theme.palette.mode === 'dark' 
                                                ? '#90caf9' 
                                                : '#1976d2',
                                            border: `1px solid ${theme.palette.mode === 'dark' 
                                                ? 'rgba(144, 202, 249, 0.3)' 
                                                : 'rgba(25, 118, 210, 0.2)'}`,
                                            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                                            letterSpacing: '0.5px',
                                            '& .MuiChip-label': {
                                                px: 0.75,
                                                py: 0.25
                                            },
                                            '&:hover': {
                                                backgroundColor: theme.palette.mode === 'dark' 
                                                    ? 'rgba(144, 202, 249, 0.24)' 
                                                    : 'rgba(25, 118, 210, 0.12)',
                                                transform: 'scale(1.05)',
                                                transition: 'all 0.2s ease-in-out'
                                            }
                                        }}
                                    />
                                )}
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
                                disabled={isReadOnly}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isReadOnly) return;
                                    console.log('🗑️ EffectsPanel: Delete button clicked for originalIndex:', originalIndex);
                                    console.log('🗑️ EffectsPanel: Effect being deleted:', effect.name || effect.className);
                                    onEffectDelete(originalIndex);
                                }}
                                title={isReadOnly ? "Read-only mode" : "Delete layer"}
                                sx={{
                                    p: 0,
                                    color: isReadOnly ? theme.palette.text.disabled : theme.palette.text.secondary,
                                    opacity: isReadOnly ? 0.3 : 0.7,
                                    '&:hover': !isReadOnly ? {
                                        opacity: 1,
                                        transform: 'scale(1.1)',
                                        color: theme.palette.error.main
                                    } : {}
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

    const selectedEffectData = getSelectedEffectData();

    return (
        <Box
            sx={{
                display: 'flex',
                height: '100%',
                position: 'relative'
            }}
        >
            {/* Main Effects List Panel */}
            <Paper
                elevation={0}
                sx={{
                    width: configPanelOpen ? 300 : 300,
                    backgroundColor: theme.palette.background.paper,
                    borderLeft: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    transition: 'width 0.3s ease'
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Refresh Effects Button */}
                    {refreshAvailableEffects && !isReadOnly && (
                        <IconButton
                            size="small"
                            onClick={refreshAvailableEffects}
                            title="Refresh available effects"
                            sx={{
                                color: theme.palette.text.primary,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                }
                            }}
                        >
                            <Refresh />
                        </IconButton>
                    )}
                    {/* Toggle All Visibility Button */}
                    {effects.length > 0 && !isReadOnly && (
                        <IconButton
                            size="small"
                            onClick={handleToggleAllVisibility}
                            title={areAllEffectsVisible ? 'Hide all layers' : 'Show all layers'}
                            sx={{
                                color: theme.palette.text.primary,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                }
                            }}
                        >
                            {areAllEffectsVisible ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                    )}
                    {/* Toggle Config Panel Button */}
                    {selectedEffect && !isReadOnly && (
                        <IconButton
                            size="small"
                            onClick={() => setConfigPanelOpen(!configPanelOpen)}
                            title={configPanelOpen ? 'Hide config panel' : 'Show config panel'}
                            sx={{
                                color: configPanelOpen ? theme.palette.primary.main : theme.palette.text.primary,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                }
                            }}
                        >
                            <Settings />
                        </IconButton>
                    )}
                    {/* Add Effect Button - Hidden in read-only mode */}
                    {availableEffects && effectsLoaded && !isReadOnly && (
                        <AddEffectDropdown
                            addEffectMenuOpen={addEffectMenuOpen}
                            setAddEffectMenuOpen={setAddEffectMenuOpen}
                            availableEffects={availableEffects}
                            effectsLoaded={effectsLoaded}
                            currentTheme={currentTheme || theme}
                            onAddEffect={handleAddEffectEvent}
                            onOpenSpecialty={() => setSpecialtyModalOpen(true)}
                        />
                    )}
                    {/* Read-only indicator */}
                    {isReadOnly && (
                        <Chip
                            label="Read Only"
                            size="small"
                            sx={{
                                backgroundColor: theme.palette.warning.main,
                                color: theme.palette.warning.contrastText,
                                fontSize: '0.75rem'
                            }}
                        />
                    )}
                </Box>
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

            {/* Specialty Effects Modal */}
            <SpecialtyEffectsModal
                isOpen={specialtyModalOpen}
                onClose={() => setSpecialtyModalOpen(false)}
                availableEffects={availableEffects || {}}
                onCreateSpecialty={handleCreateSpecialty}
                projectState={projectState}
            />

            {/* Bulk Add Keyframe Modal */}
            <BulkAddKeyframeModal
                isOpen={bulkAddModalOpen}
                onClose={() => {
                    setBulkAddModalOpen(false);
                    setBulkAddTargetIndex(null);
                }}
                onBulkAdd={handleBulkAddKeyframes}
                keyframeEffects={keyframeEffects}
                projectState={projectState}
            />
        </Paper>

        {/* Collapsible Config Panel */}
        {configPanelOpen && selectedEffectData && (
            <Paper
                elevation={0}
                sx={{
                    width: configPanelWidth,
                    backgroundColor: theme.palette.background.paper,
                    borderLeft: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden'
                }}
            >
                {/* Config Panel Header */}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Settings sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                        <Typography
                            variant="subtitle2"
                            sx={{
                                color: theme.palette.text.primary,
                                fontWeight: 400,
                                textTransform: 'uppercase',
                                letterSpacing: 1
                            }}
                        >
                            {selectedEffectData?.className || selectedEffectData?.name || 'Effect'} - {selectedEffectData?.id || 'N/A'}
                        </Typography>
                    </Box>
                    <IconButton
                        size="small"
                        onClick={() => setConfigPanelOpen(false)}
                        title="Close config panel"
                        sx={{
                            color: theme.palette.text.primary,
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                            }
                        }}
                    >
                        <ChevronLeft />
                    </IconButton>
                </Box>

                {/* Config Panel Content */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: 2
                    }}
                >
                    <EffectConfigurer
                        key={`${selectedEffectData.id}-${selectedEffectData.effectType}-${selectedEffectData.subEffectIndex || 'primary'}`}
                        selectedEffect={selectedEffectData}
                        initialConfig={selectedEffectData.config}
                        initialPercentChance={selectedEffectData.percentChance}
                        projectState={projectState}
                        onConfigChange={handleConfigPanelChange}
                        isModal={false}
                        effectType={selectedEffectData.effectType}
                        availableEffects={availableEffects || { primary: [], secondary: [], keyFrame: [], finalImage: [] }}
                        attachedEffects={{
                            secondary: selectedEffectData.secondaryEffects || [],
                            keyFrame: selectedEffectData.keyframeEffects || []
                        }}
                        onAttachEffect={onEffectAddSecondary}
                        onRemoveAttachedEffect={onSecondaryEffectDelete}
                        useWideLayout={false}
                    />
                </Box>
            </Paper>
        )}
    </Box>
    );
}

function AddEffectDropdown({
    addEffectMenuOpen,
    setAddEffectMenuOpen,
    availableEffects,
    effectsLoaded,
    currentTheme,
    onAddEffect,
    onOpenSpecialty
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
                            width: '100%',
                            minWidth: '300px',
                            maxHeight: 'calc(100vh - 150px)',
                            overflowY: 'auto',
                            overflowX: 'hidden',
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
                                    onOpenSpecialty={onOpenSpecialty}
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
    setAddEffectMenuOpen,
    onOpenSpecialty
}) {
    const [expandedAuthors, setExpandedAuthors] = React.useState(new Set());

    // Group effects by author
    const groupedEffects = React.useMemo(() => {
        const groups = {};
        effects.forEach(effect => {
            const author = effect.author || 'NFT Studio';
            if (!groups[author]) {
                groups[author] = [];
            }
            groups[author].push(effect);
        });
        return groups;
    }, [effects]);

    const authorNames = Object.keys(groupedEffects).sort();

    const toggleAuthor = (authorName) => {
        const newExpanded = new Set(expandedAuthors);
        if (newExpanded.has(authorName)) {
            newExpanded.delete(authorName);
        } else {
            newExpanded.add(authorName);
        }
        setExpandedAuthors(newExpanded);
    };

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
                        width: '100%',
                        minWidth: '300px',
                        maxHeight: 'calc(100vh - 150px)',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        zIndex: 10000,
                    }}
                >
                    {/* Add Specialty option for primary effects */}
                    {effectType === 'primary' && onOpenSpecialty && (
                        <DropdownMenu.Item
                            style={{
                                padding: 0,
                                borderRadius: '4px',
                                outline: 'none',
                            }}
                            onSelect={(event) => {
                                event.preventDefault();
                                onOpenSpecialty();
                                setAddEffectMenuOpen(false);
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    color: '#9c27b0',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    width: '100%',
                                    gap: '8px',
                                    borderBottom: `1px solid ${currentTheme.palette.divider}`,
                                    marginBottom: '4px',
                                    fontWeight: 600
                                }}
                            >
                                <StarBorder sx={{ fontSize: 16 }} />
                                Specialty...
                            </div>
                        </DropdownMenu.Item>
                    )}

                    {/* Render grouped effects by author */}
                    {authorNames.map((authorName) => {
                        const authorEffects = groupedEffects[authorName];
                        const isExpanded = expandedAuthors.has(authorName);

                        return (
                            <div key={authorName} style={{ marginBottom: '2px' }}>
                                {/* Author Group Header */}
                                <div
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleAuthor(authorName);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '6px 8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: currentTheme.palette.text.secondary,
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        backgroundColor: currentTheme.palette.mode === 'dark' 
                                            ? 'rgba(255, 255, 255, 0.05)' 
                                            : 'rgba(0, 0, 0, 0.03)',
                                        gap: '6px',
                                        userSelect: 'none',
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = currentTheme.palette.mode === 'dark' 
                                            ? 'rgba(255, 255, 255, 0.08)' 
                                            : 'rgba(0, 0, 0, 0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = currentTheme.palette.mode === 'dark' 
                                            ? 'rgba(255, 255, 255, 0.05)' 
                                            : 'rgba(0, 0, 0, 0.03)';
                                    }}
                                >
                                    <ChevronRight 
                                        sx={{ 
                                            fontSize: 14,
                                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s'
                                        }} 
                                    />
                                    <span>{authorName}</span>
                                    <span style={{ 
                                        marginLeft: 'auto', 
                                        fontSize: '10px',
                                        opacity: 0.7
                                    }}>
                                        ({authorEffects.length})
                                    </span>
                                </div>

                                {/* Author Effects (collapsible) */}
                                {isExpanded && authorEffects.map((effect) => (
                                    <DropdownMenu.Item
                                        key={effect.name}
                                        style={{
                                            padding: 0,
                                            borderRadius: '4px',
                                            outline: 'none',
                                            marginLeft: '16px',
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
                            </div>
                        );
                    })}
                </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
        </DropdownMenu.Sub>
    );
}