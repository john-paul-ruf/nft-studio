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
import './EffectAttachmentModal.bem.css';

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
            colorVar: 'var(--effect-attachment-secondary-color)'
        },
        keyFrame: {
            title: isEditing ? '🔑 Edit Key Frame Effect' : '🔑 Attach Key Frame Effect',
            description: 'Time-based animation effects applied to the primary effect',
            colorVar: 'var(--effect-attachment-keyframe-color)'
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
                className={`effect-attachment__title ${attachmentType === 'keyFrame' ? 'effect-attachment__keyframe-type' : ''}`}
            >
                <Box>
                    <Typography variant="h6" className="effect-attachment__title-text">
                        {info.title}
                    </Typography>
                    <Typography variant="body2" className="effect-attachment__description">
                        {info.description}
                    </Typography>
                </Box>
                <IconButton
                    onClick={handleClose}
                    size="small"
                    className="effect-attachment__close-btn"
                >
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers className="effect-attachment__content">
                {step === 1 ? (
                    // Effect Selection
                    <Box>
                        {effects.length > 0 ? (
                            <Grid container spacing={2} className="effect-attachment__effects-grid">
                                {effects.map(effect => (
                                    <Grid item xs={12} sm={6} md={4} key={effect.name || effect.displayName}>
                                        <Card
                                            className={attachmentType === 'secondary' ? 'effect-attachment__secondary-card' : 'effect-attachment__keyframe-card'}
                                        >
                                            <CardActionArea
                                                onClick={() => handleEffectSelect(effect)}
                                                className="effect-attachment__effect-action-area"
                                            >
                                                <CardContent className="effect-attachment__effect-content">
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
                                className="effect-attachment__empty-alert"
                            >
                                <Box textAlign="center">
                                    <Typography variant="h3" className="effect-attachment__empty-icon">📭</Typography>
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
                    <Box className="effect-attachment__config-area">
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

            <DialogActions className="effect-attachment__actions">
                <Button
                    onClick={handleBack}
                    variant="outlined"
                    className="effect-attachment__back-btn"
                >
                    {step === 1 ? 'Cancel' : 'Back to Selection'}
                </Button>

                {step === 1 && effects.length === 0 && (
                    <Button
                        onClick={handleClose}
                        variant="contained"
                        className={attachmentType === 'secondary' ? 'effect-attachment__secondary-btn' : 'effect-attachment__keyframe-btn'}
                    >
                        Close
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default EffectAttachmentModal;