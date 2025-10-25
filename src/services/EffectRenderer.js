/**
 * EffectRenderer Service
 * 
 * Handles all effect rendering operations for the EffectsPanel component.
 * Follows Single Responsibility Principle by focusing solely on rendering logic.
 * 
 * Responsibilities:
 * - Primary effect rendering with drag/drop support
 * - Secondary effect rendering with proper indentation
 * - Keyframe effect rendering with frame indicators
 * - Context menu rendering for all effect types
 * - Effect formatting and display utilities
 * - Theme-aware styling and visual states
 * 
 * Dependencies:
 * - React and Material-UI components for rendering
 * - Theme provider for consistent styling
 * - Event bus for render event coordination
 * - Logger for render operation tracking
 */

import React from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Chip
} from '@mui/material';
import {
    Delete,
    Visibility,
    VisibilityOff,
    ExpandMore,
    SubdirectoryArrowRight,
    ArrowForward
} from '@mui/icons-material';
import * as ContextMenu from '@radix-ui/react-context-menu';

class EffectRenderer {
    /**
     * Initialize EffectRenderer with dependencies
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.theme - Material-UI theme object
     * @param {Object} dependencies.eventBus - Event bus for render coordination
     * @param {Object} dependencies.logger - Logger for render operations
     */
    constructor({ theme, eventBus, logger } = {}) {
        // Validate required dependencies
        if (!theme) {
            throw new Error('EffectRenderer requires theme dependency');
        }
        if (!eventBus) {
            throw new Error('EffectRenderer requires eventBus dependency');
        }
        if (!logger) {
            throw new Error('EffectRenderer requires logger dependency');
        }

        this.theme = theme;
        this.eventBus = eventBus;
        this.logger = logger;

        // Render state management
        this.renderMetrics = {
            primaryEffectsRendered: 0,
            secondaryEffectsRendered: 0,
            keyframeEffectsRendered: 0,
            contextMenusRendered: 0,
            renderStartTime: null,
            lastRenderDuration: 0
        };

        // Render configuration
        this.renderConfig = {
            enableDragDrop: true,
            enableContextMenus: true,
            enableVisibilityToggle: true,
            enableExpansion: true,
            maxRenderDepth: 3,
            renderTimeout: 5000
        };

        // Bind methods to preserve context
        this.renderPrimaryEffect = this.renderPrimaryEffect.bind(this);
        this.renderSecondaryEffects = this.renderSecondaryEffects.bind(this);
        this.renderKeyframeEffects = this.renderKeyframeEffects.bind(this);
        this.renderContextMenu = this.renderContextMenu.bind(this);
        this.formatEffectName = this.formatEffectName.bind(this);
        this.formatEffectId = this.formatEffectId.bind(this);
        this.formatKeyframeDisplay = this.formatKeyframeDisplay.bind(this);

        this.logger.info('EffectRenderer initialized successfully');
    }

    /**
     * Render a primary effect with all its children
     * @param {Object} effectData - Effect data with effect and originalIndex
     * @param {number} sortedIndex - Sorted index for display
     * @param {string} section - Section identifier
     * @param {Object} handlers - Event handlers for interactions
     * @param {Set} expandedEffects - Set of expanded effect IDs
     * @param {boolean} isReadOnly - Whether the panel is in read-only mode
     * @returns {React.Element} Rendered primary effect component
     */
    renderPrimaryEffect(effectData, sortedIndex, section, handlers, expandedEffects, isReadOnly = false) {
        const startTime = performance.now();
        
        try {
            const { effect, originalIndex } = effectData;
            const isExpanded = expandedEffects.has(`${section}-${sortedIndex}`);
            const hasChildren = this._hasChildEffects(effect);

            const renderedEffect = (
                <ContextMenu.Root key={`${section}-${originalIndex}`}>
                    <ContextMenu.Trigger asChild>
                        <Box
                            sx={{ mb: 0.25 }}
                            draggable={this.renderConfig.enableDragDrop}
                            onDragStart={(e) => handlers.handleDragStart?.(e, originalIndex, section)}
                            onDragOver={handlers.handleDragOver}
                            onDrop={(e) => handlers.handleDrop?.(e, originalIndex, section)}
                        >
                            <Paper
                                elevation={0}
                                sx={this._getPrimaryEffectStyles()}
                            >
                                {this._renderExpandButton(hasChildren, isExpanded, section, sortedIndex, handlers)}
                                {this._renderVisibilityButton(effect, originalIndex, handlers, isReadOnly)}
                                {this._renderEffectContent(effect)}
                                {this._renderDeleteButton(effect, originalIndex, handlers, isReadOnly)}
                            </Paper>
                            {isExpanded && this._renderChildEffects(effect, originalIndex, handlers, isReadOnly)}
                        </Box>
                    </ContextMenu.Trigger>
                    {this.renderContextMenu(effect, originalIndex, handlers)}
                </ContextMenu.Root>
            );

            this.renderMetrics.primaryEffectsRendered++;
            this.renderMetrics.lastRenderDuration = performance.now() - startTime;
            
            this.eventBus.emit('effectRenderer:primaryEffectRendered', {
                effectName: effect.name || effect.className,
                originalIndex,
                renderTime: this.renderMetrics.lastRenderDuration
            });

            return renderedEffect;

        } catch (error) {
            this.logger.error('Error rendering primary effect:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'primary',
                effectData,
                error: error.message
            });
            return this._renderErrorFallback('primary effect', error);
        }
    }

    /**
     * Render secondary effects for a parent effect
     * @param {Object} effect - Parent effect containing secondary effects
     * @param {number} parentOriginalIndex - Parent effect's original index
     * @param {Object} handlers - Event handlers for interactions
     * @param {boolean} isReadOnly - Whether the panel is in read-only mode
     * @returns {React.Element|null} Rendered secondary effects or null
     */
    renderSecondaryEffects(effect, parentOriginalIndex, handlers, isReadOnly = false) {
        if (!effect.secondaryEffects || effect.secondaryEffects.length === 0) {
            return null;
        }

        const startTime = performance.now();

        try {
            const renderedSecondaries = (
                <Box sx={{ ml: 2, mt: 0.5 }}>
                    {effect.secondaryEffects.map((secondary, idx) => (
                        <ContextMenu.Root key={idx}>
                            <ContextMenu.Trigger asChild>
                                <Box
                                    draggable={this.renderConfig.enableDragDrop}
                                    onDragStart={(e) => handlers.handleSecondaryDragStart?.(e, parentOriginalIndex, idx)}
                                    onDragOver={handlers.handleSecondaryDragOver}
                                    onDrop={(e) => handlers.handleSecondaryDrop?.(e, parentOriginalIndex, idx)}
                                    sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={this._getSecondaryEffectStyles()}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <SubdirectoryArrowRight
                                                sx={{
                                                    fontSize: 14,
                                                    color: this.theme.palette.text.secondary,
                                                    mr: 1
                                                }}
                                            />
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: this.theme.palette.text.primary,
                                                    fontSize: '13px'
                                                }}
                                            >
                                                {this.formatEffectName(secondary)}
                                            </Typography>
                                            {secondary.id && this._renderEffectIdChip(secondary.id, 'secondary')}
                                        </Box>
                                        {this._renderSecondaryDeleteButton(parentOriginalIndex, idx, handlers, isReadOnly)}
                                    </Paper>
                                </Box>
                            </ContextMenu.Trigger>
                            {this.renderContextMenu(secondary, `${parentOriginalIndex}-${idx}`, handlers, 'secondary')}
                        </ContextMenu.Root>
                    ))}
                </Box>
            );

            this.renderMetrics.secondaryEffectsRendered += effect.secondaryEffects.length;
            const renderTime = performance.now() - startTime;
            
            this.eventBus.emit('effectRenderer:secondaryEffectsRendered', {
                parentEffect: effect.name || effect.className,
                count: effect.secondaryEffects.length,
                renderTime
            });

            return renderedSecondaries;

        } catch (error) {
            this.logger.error('Error rendering secondary effects:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'secondary',
                parentEffect: effect.name || effect.className,
                error: error.message
            });
            return this._renderErrorFallback('secondary effects', error);
        }
    }

    /**
     * Render keyframe effects for a parent effect
     * @param {Object} effect - Parent effect containing keyframe effects
     * @param {number} parentOriginalIndex - Parent effect's original index
     * @param {Object} handlers - Event handlers for interactions
     * @param {boolean} isReadOnly - Whether the panel is in read-only mode
     * @returns {React.Element|null} Rendered keyframe effects or null
     */
    renderKeyframeEffects(effect, parentOriginalIndex, handlers, isReadOnly = false) {
        // CRITICAL FIX: Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
        const keyframeEffects = effect.keyframeEffects || effect.attachedEffects?.keyFrame || [];
        if (!keyframeEffects || keyframeEffects.length === 0) {
            return null;
        }

        const startTime = performance.now();

        try {
            const renderedKeyframes = (
                <Box sx={{ ml: 2, mt: 0.5 }}>
                    {keyframeEffects.map((keyframe, idx) => (
                        <ContextMenu.Root key={idx}>
                            <ContextMenu.Trigger asChild>
                                <Box
                                    draggable={this.renderConfig.enableDragDrop}
                                    onDragStart={(e) => handlers.handleKeyframeDragStart?.(e, parentOriginalIndex, idx)}
                                    onDragOver={handlers.handleKeyframeDragOver}
                                    onDrop={(e) => handlers.handleKeyframeDrop?.(e, parentOriginalIndex, idx)}
                                    sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={this._getKeyframeEffectStyles()}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ArrowForward
                                                sx={{
                                                    fontSize: 14,
                                                    color: this.theme.palette.text.secondary,
                                                    mr: 1
                                                }}
                                            />
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: this.theme.palette.text.primary,
                                                    fontSize: '13px'
                                                }}
                                            >
                                                {this.formatKeyframeDisplay(keyframe)}: {this.formatEffectName(keyframe)}
                                            </Typography>
                                            {keyframe.id && this._renderEffectIdChip(keyframe.id, 'keyframe')}
                                        </Box>
                                        {this._renderKeyframeDeleteButton(parentOriginalIndex, idx, handlers, isReadOnly)}
                                    </Paper>
                                </Box>
                            </ContextMenu.Trigger>
                            {this.renderContextMenu(keyframe, `${parentOriginalIndex}-keyframe-${idx}`, handlers, 'keyframe')}
                        </ContextMenu.Root>
                    ))}
                </Box>
            );

            this.renderMetrics.keyframeEffectsRendered += keyframeEffects.length;
            const renderTime = performance.now() - startTime;
            
            this.eventBus.emit('effectRenderer:keyframeEffectsRendered', {
                parentEffect: effect.name || effect.className,
                count: keyframeEffects.length,
                renderTime
            });

            return renderedKeyframes;

        } catch (error) {
            this.logger.error('Error rendering keyframe effects:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'keyframe',
                parentEffect: effect.name || effect.className,
                error: error.message
            });
            return this._renderErrorFallback('keyframe effects', error);
        }
    }

    /**
     * Render context menu for an effect
     * @param {Object} effect - Effect to render context menu for
     * @param {string|number} effectId - Unique identifier for the effect
     * @param {Object} handlers - Event handlers for menu actions
     * @param {string} type - Type of effect ('primary', 'secondary', 'keyframe')
     * @returns {React.Element} Rendered context menu component
     */
    renderContextMenu(effect, effectId, handlers, type = 'primary') {
        if (!this.renderConfig.enableContextMenus) {
            return null;
        }

        try {
            const contextMenu = (
                <ContextMenu.Portal>
                    <ContextMenu.Content
                        className="context-menu-content"
                        sideOffset={5}
                        align="start"
                    >
                        {this._renderContextMenuItems(effect, effectId, handlers, type)}
                    </ContextMenu.Content>
                </ContextMenu.Portal>
            );

            this.renderMetrics.contextMenusRendered++;
            
            this.eventBus.emit('effectRenderer:contextMenuRendered', {
                effectName: effect.name || effect.className,
                effectId,
                type
            });

            return contextMenu;

        } catch (error) {
            this.logger.error('Error rendering context menu:', error);
            this.eventBus.emit('effectRenderer:renderError', {
                type: 'contextMenu',
                effect: effect.name || effect.className,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Format effect name for display
     * @param {Object} effect - Effect object
     * @returns {string} Formatted effect name
     */
    formatEffectName(effect) {
        if (!effect) return 'Unknown Effect';
        
        // Priority order: displayName > name > className > registryKey
        return effect.displayName || 
               effect.name || 
               effect.className || 
               effect.registryKey || 
               'Unnamed Effect';
    }

    /**
     * Format effect ID for display in chips
     * @param {string} id - Full effect ID
     * @returns {string} Truncated ID for display
     */
    formatEffectId(id) {
        if (!id) return '';
        
        // Show first 8 characters for readability
        return id.length > 8 ? `${id.substring(0, 8)}...` : id;
    }

    /**
     * Format keyframe display text
     * @param {Object} keyframe - Keyframe effect object
     * @returns {string} Formatted keyframe display text
     */
    formatKeyframeDisplay(keyframe) {
        if (!keyframe) return 'Frame ?';
        
        const frame = keyframe.frame !== undefined ? keyframe.frame : '?';
        return `Frame ${frame}`;
    }

    /**
     * Get current render metrics
     * @returns {Object} Current render metrics
     */
    getRenderMetrics() {
        return {
            ...this.renderMetrics,
            totalEffectsRendered: this.renderMetrics.primaryEffectsRendered + 
                                 this.renderMetrics.secondaryEffectsRendered + 
                                 this.renderMetrics.keyframeEffectsRendered
        };
    }

    /**
     * Reset render metrics
     */
    resetRenderMetrics() {
        this.renderMetrics = {
            primaryEffectsRendered: 0,
            secondaryEffectsRendered: 0,
            keyframeEffectsRendered: 0,
            contextMenusRendered: 0,
            renderStartTime: null,
            lastRenderDuration: 0
        };
        
        this.eventBus.emit('effectRenderer:metricsReset');
        this.logger.info('EffectRenderer metrics reset');
    }

    /**
     * Update render configuration
     * @param {Object} config - New configuration options
     */
    updateRenderConfig(config) {
        this.renderConfig = { ...this.renderConfig, ...config };
        
        this.eventBus.emit('effectRenderer:configUpdated', this.renderConfig);
        this.logger.info('EffectRenderer configuration updated', this.renderConfig);
    }

    // Private helper methods

    /**
     * Check if effect has child effects
     * @private
     */
    _hasChildEffects(effect) {
        // CRITICAL FIX: Use new keyframeEffects property (backward compatible with attachedEffects.keyFrame)
        return (effect.secondaryEffects?.length > 0) ||
               (effect.keyframeEffects?.length > 0);
    }

    /**
     * Get primary effect styles
     * @private
     */
    _getPrimaryEffectStyles() {
        return {
            backgroundColor: this.theme.palette.background.default,
            border: `1px solid ${this.theme.palette.divider}`,
            borderRadius: 1,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            userSelect: 'none',
            '&:hover': {
                backgroundColor: this.theme.palette.action.hover,
                borderColor: this.theme.palette.primary.main,
            }
        };
    }

    /**
     * Get secondary effect styles
     * @private
     */
    _getSecondaryEffectStyles() {
        return {
            backgroundColor: this.theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f8f8',
            border: `1px solid ${this.theme.palette.divider}`,
            borderRadius: 1,
            p: 1,
            mb: 0.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': {
                backgroundColor: this.theme.palette.action.hover,
            }
        };
    }

    /**
     * Get keyframe effect styles
     * @private
     */
    _getKeyframeEffectStyles() {
        return {
            backgroundColor: this.theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f8f8',
            border: `1px solid ${this.theme.palette.divider}`,
            borderRadius: 1,
            p: 1,
            mb: 0.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': {
                backgroundColor: this.theme.palette.action.hover,
            }
        };
    }

    /**
     * Render expand/collapse button
     * @private
     */
    _renderExpandButton(hasChildren, isExpanded, section, sortedIndex, handlers) {
        if (!hasChildren || !this.renderConfig.enableExpansion) return null;

        return (
            <IconButton
                size="small"
                onClick={() => handlers.toggleExpanded?.(`${section}-${sortedIndex}`)}
                sx={{
                    p: 0,
                    mr: 1,
                    color: this.theme.palette.text.secondary,
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                }}
            >
                <ExpandMore sx={{ fontSize: 16 }} />
            </IconButton>
        );
    }

    /**
     * Render visibility toggle button
     * @private
     */
    _renderVisibilityButton(effect, originalIndex, handlers, isReadOnly) {
        if (!this.renderConfig.enableVisibilityToggle) return null;

        return (
            <IconButton
                size="small"
                onClick={(e) => {
                    e.stopPropagation();
                    handlers.onEffectToggleVisibility?.(originalIndex);
                }}
                title={effect.visible !== false ? 'Hide layer' : 'Show layer'}
                sx={{
                    p: 0,
                    mr: 1,
                    color: effect.visible !== false
                        ? this.theme.palette.primary.main
                        : this.theme.palette.text.disabled,
                    opacity: effect.visible !== false ? 1 : 0.5,
                    '&:hover': {
                        color: this.theme.palette.primary.main,
                        opacity: 1
                    }
                }}
            >
                {effect.visible !== false ? 
                    <Visibility sx={{ fontSize: 16 }} /> : 
                    <VisibilityOff sx={{ fontSize: 16 }} />
                }
            </IconButton>
        );
    }

    /**
     * Render effect content (name and chips)
     * @private
     */
    _renderEffectContent(effect) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                    variant="body2"
                    sx={{
                        color: this.theme.palette.text.primary,
                        fontSize: '13px'
                    }}
                >
                    {this.formatEffectName(effect)}
                </Typography>
                {effect.id && this._renderEffectIdChip(effect.id, 'primary')}
                {this._isFinalEffect(effect) && this._renderFinalChip()}
            </Box>
        );
    }

    /**
     * Render delete button for primary effects
     * @private
     */
    _renderDeleteButton(effect, originalIndex, handlers, isReadOnly) {
        return (
            <IconButton
                size="small"
                disabled={isReadOnly}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isReadOnly) return;
                    handlers.onEffectDelete?.(originalIndex);
                }}
                title={isReadOnly ? "Read-only mode" : "Delete layer"}
                sx={{
                    p: 0,
                    color: isReadOnly ? this.theme.palette.text.disabled : this.theme.palette.text.secondary,
                    opacity: isReadOnly ? 0.3 : 0.7,
                    '&:hover': !isReadOnly ? {
                        opacity: 1,
                        transform: 'scale(1.1)',
                        color: this.theme.palette.error.main
                    } : {}
                }}
            >
                <Delete sx={{ fontSize: 16 }} />
            </IconButton>
        );
    }

    /**
     * Render child effects (secondary and keyframe)
     * @private
     */
    _renderChildEffects(effect, originalIndex, handlers, isReadOnly) {
        return (
            <>
                {this.renderSecondaryEffects(effect, originalIndex, handlers, isReadOnly)}
                {this.renderKeyframeEffects(effect, originalIndex, handlers, isReadOnly)}
            </>
        );
    }

    /**
     * Render effect ID chip with type-specific styling
     * @private
     */
    _renderEffectIdChip(id, type) {
        const typeStyles = this._getChipStylesForType(type);
        
        return (
            <Chip
                label={this.formatEffectId(id)}
                size="small"
                title={`Full ID: ${id}`}
                sx={{
                    height: type === 'primary' ? 18 : 16,
                    fontSize: type === 'primary' ? '10px' : '9px',
                    fontWeight: type === 'primary' ? 600 : 500,
                    fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                    letterSpacing: type === 'primary' ? '0.5px' : '0.3px',
                    '& .MuiChip-label': {
                        px: type === 'primary' ? 0.75 : 0.5,
                        py: type === 'primary' ? 0.25 : 0.2
                    },
                    '&:hover': {
                        transform: 'scale(1.05)',
                        transition: 'all 0.2s ease-in-out'
                    },
                    ...typeStyles
                }}
            />
        );
    }

    /**
     * Get chip styles for different effect types
     * @private
     */
    _getChipStylesForType(type) {
        const isDark = this.theme.palette.mode === 'dark';
        
        switch (type) {
            case 'primary':
                return {
                    backgroundColor: isDark ? 'rgba(144, 202, 249, 0.16)' : 'rgba(25, 118, 210, 0.08)',
                    color: isDark ? '#90caf9' : '#1976d2',
                    border: `1px solid ${isDark ? 'rgba(144, 202, 249, 0.3)' : 'rgba(25, 118, 210, 0.2)'}`,
                    '&:hover': {
                        backgroundColor: isDark ? 'rgba(144, 202, 249, 0.24)' : 'rgba(25, 118, 210, 0.12)'
                    }
                };
            case 'secondary':
                return {
                    backgroundColor: isDark ? 'rgba(255, 183, 77, 0.16)' : 'rgba(255, 152, 0, 0.08)',
                    color: isDark ? '#ffb74d' : '#f57c00',
                    border: `1px solid ${isDark ? 'rgba(255, 183, 77, 0.3)' : 'rgba(255, 152, 0, 0.2)'}`,
                    '&:hover': {
                        backgroundColor: isDark ? 'rgba(255, 183, 77, 0.24)' : 'rgba(255, 152, 0, 0.12)'
                    }
                };
            case 'keyframe':
                return {
                    backgroundColor: isDark ? 'rgba(129, 199, 132, 0.16)' : 'rgba(76, 175, 80, 0.08)',
                    color: isDark ? '#81c784' : '#388e3c',
                    border: `1px solid ${isDark ? 'rgba(129, 199, 132, 0.3)' : 'rgba(76, 175, 80, 0.2)'}`,
                    '&:hover': {
                        backgroundColor: isDark ? 'rgba(129, 199, 132, 0.24)' : 'rgba(76, 175, 80, 0.12)'
                    }
                };
            default:
                return {};
        }
    }

    /**
     * Render final effect chip
     * @private
     */
    _renderFinalChip() {
        return (
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
        );
    }

    /**
     * Check if effect is a final effect
     * @private
     */
    _isFinalEffect(effect) {
        // Implementation depends on how final effects are identified
        return effect.isFinal || effect.final || false;
    }

    /**
     * Render delete button for secondary effects
     * @private
     */
    _renderSecondaryDeleteButton(parentIndex, secondaryIndex, handlers, isReadOnly) {
        return (
            <IconButton
                size="small"
                disabled={isReadOnly}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isReadOnly) return;
                    handlers.onSecondaryEffectDelete?.(parentIndex, secondaryIndex);
                }}
                title={isReadOnly ? "Read-only mode" : "Delete secondary effect"}
                sx={{
                    p: 0,
                    color: isReadOnly ? this.theme.palette.text.disabled : this.theme.palette.text.secondary,
                    opacity: isReadOnly ? 0.3 : 0.7,
                    '&:hover': !isReadOnly ? {
                        opacity: 1,
                        transform: 'scale(1.1)',
                        color: this.theme.palette.error.main
                    } : {}
                }}
            >
                <Delete sx={{ fontSize: 14 }} />
            </IconButton>
        );
    }

    /**
     * Render delete button for keyframe effects
     * @private
     */
    _renderKeyframeDeleteButton(parentIndex, keyframeIndex, handlers, isReadOnly) {
        return (
            <IconButton
                size="small"
                disabled={isReadOnly}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isReadOnly) return;
                    handlers.onKeyframeEffectDelete?.(parentIndex, keyframeIndex);
                }}
                title={isReadOnly ? "Read-only mode" : "Delete keyframe effect"}
                sx={{
                    p: 0,
                    color: isReadOnly ? this.theme.palette.text.disabled : this.theme.palette.text.secondary,
                    opacity: isReadOnly ? 0.3 : 0.7,
                    '&:hover': !isReadOnly ? {
                        opacity: 1,
                        transform: 'scale(1.1)',
                        color: this.theme.palette.error.main
                    } : {}
                }}
            >
                <Delete sx={{ fontSize: 14 }} />
            </IconButton>
        );
    }

    /**
     * Render context menu items
     * @private
     */
    _renderContextMenuItems(effect, effectId, handlers, type) {
        // Context menu items would be rendered here
        // This is a placeholder for the actual context menu implementation
        return (
            <div>
                <div>Edit Effect</div>
                <div>Duplicate Effect</div>
                <div>Delete Effect</div>
            </div>
        );
    }

    /**
     * Render error fallback component
     * @private
     */
    _renderErrorFallback(componentType, error) {
        return (
            <Box
                sx={{
                    p: 1,
                    border: `1px solid ${this.theme.palette.error.main}`,
                    borderRadius: 1,
                    backgroundColor: this.theme.palette.error.light,
                    color: this.theme.palette.error.contrastText
                }}
            >
                <Typography variant="caption">
                    Error rendering {componentType}: {error.message}
                </Typography>
            </Box>
        );
    }
}

export default EffectRenderer;