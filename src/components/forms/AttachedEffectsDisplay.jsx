import React from 'react';
import { Box, Paper, Typography, Button, Chip } from '@mui/material';

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
            sx={{
                mt: 3,
                p: 3,
                background: 'rgba(255, 193, 7, 0.1)',
                borderRadius: 2,
                border: '1px solid rgba(255, 193, 7, 0.3)'
            }}
        >
            <Typography variant="h6" sx={{ color: '#ffc107', mb: 2 }}>
                Attached Effects
            </Typography>

            {/* Secondary Effects */}
            <Box sx={{ mb: 2 }}>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                >
                    <Typography variant="subtitle2" sx={{ color: '#28a745', fontWeight: 600 }}>
                        ✨ Secondary Effects ({(attachedEffects?.secondary || []).length})
                    </Typography>
                    <Button
                        onClick={() => onOpenAttachmentModal('secondary')}
                        variant="contained"
                        size="small"
                        sx={{
                            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                            fontSize: '0.75rem',
                            py: 0.5,
                            px: 1.5,
                            '&:hover': {
                                background: 'linear-gradient(135deg, #20c997 0%, #28a745 100%)',
                            }
                        }}
                    >
                        + Attach Secondary
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: '2rem' }}>
                    {(attachedEffects?.secondary || []).map(effect => (
                        <Chip
                            key={effect.id}
                            label={`${effect.effectClass.registryKey} (${effect.percentChance}%)`}
                            onClick={() => onEditAttachedEffect('secondary', effect)}
                            onDelete={() => onRemoveAttachedEffect && onRemoveAttachedEffect('secondary', effect.id)}
                            clickable
                            sx={{
                                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                                color: '#28a745',
                                fontSize: '0.75rem',
                                '&:hover': {
                                    backgroundColor: 'rgba(40, 167, 69, 0.3)',
                                    transform: 'scale(1.05)',
                                },
                                '& .MuiChip-deleteIcon': {
                                    color: '#dc3545',
                                    '&:hover': {
                                        color: '#c82333',
                                    }
                                }
                            }}
                        />
                    ))}
                    {(attachedEffects?.secondary || []).length === 0 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 1 }}>
                            No secondary effects attached
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Key Frame Effects */}
            <Box>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                >
                    <Typography variant="subtitle2" sx={{ color: '#007bff', fontWeight: 600 }}>
                        🔑 Key Frame Effects ({(attachedEffects?.keyFrame || []).length})
                    </Typography>
                    <Button
                        onClick={() => onOpenAttachmentModal('keyFrame')}
                        variant="contained"
                        size="small"
                        sx={{
                            background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                            fontSize: '0.75rem',
                            py: 0.5,
                            px: 1.5,
                            '&:hover': {
                                background: 'linear-gradient(135deg, #0056b3 0%, #007bff 100%)',
                            }
                        }}
                    >
                        + Attach Key Frame
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: '2rem' }}>
                    {(attachedEffects?.keyFrame || []).map(effect => (
                        <Chip
                            key={effect.id}
                            label={`${effect.effectClass.registryKey} (${effect.percentChance}%)`}
                            onClick={() => onEditAttachedEffect('keyFrame', effect)}
                            onDelete={() => onRemoveAttachedEffect && onRemoveAttachedEffect('keyFrame', effect.id)}
                            clickable
                            sx={{
                                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                                color: '#007bff',
                                fontSize: '0.75rem',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 123, 255, 0.3)',
                                    transform: 'scale(1.05)',
                                },
                                '& .MuiChip-deleteIcon': {
                                    color: '#dc3545',
                                    '&:hover': {
                                        color: '#c82333',
                                    }
                                }
                            }}
                        />
                    ))}
                    {(attachedEffects?.keyFrame || []).length === 0 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 1 }}>
                            No key frame effects attached
                        </Typography>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

export default AttachedEffectsDisplay;