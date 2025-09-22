import React, { useState, useEffect } from 'react';
import EffectConfigurer from './EffectConfigurer.jsx';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActionArea,
    Alert,
    useTheme
} from '@mui/material';
import { Close } from '@mui/icons-material';

function EffectAttachmentModal({
    isOpen,
    onClose,
    attachmentType,
    availableEffects,
    onAttachEffect,
    projectState,
    editingEffect = null,
    isEditing = false
}) {
    const theme = useTheme();
    const [selectedEffect, setSelectedEffect] = useState(null);
    const [step, setStep] = useState(1); // 1: select effect, 2: configure effect

    // Handle editing mode setup
    useEffect(() => {
        if (isOpen && isEditing && editingEffect) {
            console.log('Modal opened in editing mode for effect:', editingEffect);
            setSelectedEffect(editingEffect.effectClass);
            setStep(2); // Go directly to configuration
        } else if (isOpen && !isEditing) {
            // Reset for new effect creation
            setSelectedEffect(null);
            setStep(1);
        }
    }, [isOpen, isEditing, editingEffect]);


    const typeInfo = {
        secondary: {
            title: isEditing ? '✨ Edit Secondary Effect' : '✨ Attach Secondary Effect',
            description: 'Secondary effects enhance the primary effect (glow, blur, fade, etc.)',
            color: '#28a745'
        },
        keyFrame: {
            title: isEditing ? '🔑 Edit Key Frame Effect' : '🔑 Attach Key Frame Effect',
            description: 'Time-based animation effects applied to the primary effect',
            color: '#007bff'
        }
    };

    const info = typeInfo[attachmentType] || typeInfo.secondary;
    const effects = availableEffects[attachmentType] || [];

    const handleEffectSelect = (effect) => {
        setSelectedEffect(effect);
        setStep(2);
    };

    const handleConfigComplete = (effectData) => {
        onAttachEffect(effectData, attachmentType);
        handleClose();
    };

    const handleClose = () => {
        setSelectedEffect(null);
        setStep(1);
        onClose();
    };

    const handleBack = () => {
        if (step === 2) {
            setSelectedEffect(null);
            setStep(1);
        } else {
            handleClose();
        }
    };

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            maxWidth={step === 2 ? 'xl' : 'md'}
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: theme.palette.background.paper,
                    backgroundImage: 'none'
                }
            }}
        >
            <DialogTitle
                sx={{
                    background: `linear-gradient(135deg, ${info.color}20 0%, ${info.color}10 100%)`,
                    borderBottom: `1px solid ${info.color}40`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Box>
                    <Typography variant="h6" sx={{ color: info.color }}>
                        {info.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
                        {info.description}
                    </Typography>
                </Box>
                <IconButton
                    onClick={handleClose}
                    size="small"
                    sx={{ color: theme.palette.text.secondary }}
                >
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3 }}>
                {step === 1 ? (
                    // Effect Selection
                    <Box>
                        {effects.length > 0 ? (
                            <Grid container spacing={2}>
                                {effects.map(effect => (
                                    <Grid item xs={12} sm={6} md={4} key={effect.name || effect.displayName}>
                                        <Card
                                            sx={{
                                                height: '100%',
                                                transition: 'all 0.2s',
                                                border: `1px solid ${theme.palette.divider}`,
                                                '&:hover': {
                                                    borderColor: info.color,
                                                    backgroundColor: `${info.color}10`
                                                }
                                            }}
                                        >
                                            <CardActionArea
                                                onClick={() => handleEffectSelect(effect)}
                                                sx={{ height: '100%', p: 2 }}
                                            >
                                                <CardContent sx={{ p: 0 }}>
                                                    <Typography variant="subtitle1" gutterBottom>
                                                        {effect.displayName || effect.name}
                                                    </Typography>
                                                    {effect.description && (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {effect.description}
                                                        </Typography>
                                                    )}
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <Alert
                                severity="info"
                                sx={{
                                    justifyContent: 'center',
                                    backgroundColor: 'transparent',
                                    color: theme.palette.text.secondary
                                }}
                            >
                                <Box textAlign="center">
                                    <Typography variant="h3" sx={{ mb: 2 }}>📭</Typography>
                                    <Typography variant="h6" gutterBottom>
                                        No {attachmentType} effects available
                                    </Typography>
                                    <Typography variant="body2">
                                        There are no {attachmentType} effects to attach at this time.
                                    </Typography>
                                </Box>
                            </Alert>
                        )}
                    </Box>
                ) : (
                    // Effect Configuration
                    <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                        <EffectConfigurer
                            selectedEffect={selectedEffect}
                            projectState={projectState}
                            onConfigChange={() => {}} // Not needed in modal
                            onAddEffect={handleConfigComplete}
                            isModal={true}
                            initialConfig={isEditing ? editingEffect?.config : undefined}
                            initialPercentChance={isEditing ? editingEffect?.percentChance : undefined}
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={handleBack}
                    variant="outlined"
                    sx={{ mr: 'auto' }}
                >
                    {step === 1 ? 'Cancel' : 'Back to Selection'}
                </Button>

                {step === 1 && effects.length === 0 && (
                    <Button
                        onClick={handleClose}
                        variant="contained"
                        sx={{
                            background: `linear-gradient(135deg, ${info.color} 0%, ${info.color}cc 100%)`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${info.color}dd 0%, ${info.color} 100%)`
                            }
                        }}
                    >
                        Close
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default EffectAttachmentModal;