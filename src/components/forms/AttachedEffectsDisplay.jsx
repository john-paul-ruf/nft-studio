import React from 'react';
import { Box, Paper, Typography, Button, Chip } from '@mui/material';
import './AttachedEffectsDisplay.bem.css';

/**
 * AttachedEffectsDisplay Component
 * 
 * Displays and manages attached effects (secondary and keyframe) for primary effects.
 * Provides UI for viewing, adding, editing, and removing attached effects.
 * 
 * Responsibilities:
 * - Display secondary effects with counts and chips
 * - Display keyframe effects with counts and chips
 * - Provide buttons to attach new effects
 * - Handle click events for editing attached effects
 * - Handle delete events for removing attached effects
 * 
 * @param {Object} props
 * @param {Object} props.attachedEffects - Object containing secondary and keyFrame arrays
 * @param {Function} props.onOpenAttachmentModal - Callback when "Attach" button is clicked
 * @param {Function} props.onEditAttachedEffect - Callback when an effect chip is clicked
 * @param {Function} props.onRemoveAttachedEffect - Callback when delete icon is clicked
 */
const AttachedEffectsDisplay = ({
    attachedEffects,
    onOpenAttachmentModal,
    onEditAttachedEffect,
    onRemoveAttachedEffect
}) => {
    return (
        <Paper
            elevation={2}
            className="attached-effects__container"
        >
            <Typography variant="h6" className="attached-effects__title">
                Attached Effects
            </Typography>

            {/* Secondary Effects */}
            <Box className="attached-effects__section attached-effects__section-spacing">
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    className="attached-effects__section-header attached-effects__section-header-spacing"
                >
                    <Typography variant="subtitle2" className="attached-effects__secondary-title">
                        ✨ Secondary Effects ({(attachedEffects?.secondary || []).length})
                    </Typography>
                    <Button
                        onClick={() => onOpenAttachmentModal('secondary')}
                        variant="contained"
                        size="small"
                        className="attached-effects__secondary-btn"
                    >
                        + Attach Secondary
                    </Button>
                </Box>
                <Box className="attached-effects__effects-container">
                    {(attachedEffects?.secondary || []).map(effect => (
                        <Chip
                            key={effect.id}
                            label={`${effect.effectClass.registryKey} (${effect.percentChance}%)`}
                            onClick={() => onEditAttachedEffect('secondary', effect)}
                            onDelete={() => onRemoveAttachedEffect && onRemoveAttachedEffect('secondary', effect.id)}
                            clickable
                            className="attached-effects__secondary-chip"
                        />
                    ))}
                    {(attachedEffects?.secondary || []).length === 0 && (
                        <Typography variant="body2" className="attached-effects__empty-state">
                            No secondary effects attached
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Key Frame Effects */}
            <Box className="attached-effects__section">
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    className="attached-effects__section-header attached-effects__section-header-spacing"
                >
                    <Typography variant="subtitle2" className="attached-effects__keyframe-title">
                        🔑 Key Frame Effects ({(attachedEffects?.keyFrame || []).length})
                    </Typography>
                    <Button
                        onClick={() => onOpenAttachmentModal('keyFrame')}
                        variant="contained"
                        size="small"
                        className="attached-effects__keyframe-btn"
                    >
                        + Attach Key Frame
                    </Button>
                </Box>
                <Box className="attached-effects__effects-container">
                    {(attachedEffects?.keyFrame || []).map(effect => (
                        <Chip
                            key={effect.id}
                            label={`${effect.effectClass.registryKey} (${effect.percentChance}%)`}
                            onClick={() => onEditAttachedEffect('keyFrame', effect)}
                            onDelete={() => onRemoveAttachedEffect && onRemoveAttachedEffect('keyFrame', effect.id)}
                            clickable
                            className="attached-effects__keyframe-chip"
                        />
                    ))}
                    {(attachedEffects?.keyFrame || []).length === 0 && (
                        <Typography variant="body2" className="attached-effects__empty-state">
                            No key frame effects attached
                        </Typography>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

export default AttachedEffectsDisplay;