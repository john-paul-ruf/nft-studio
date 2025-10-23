import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    useTheme,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    TextField,
    Divider,
    Paper
} from '@mui/material';
import { Close, ArrowBack, ArrowForward } from '@mui/icons-material';
import './SpecialtyEffectsModal.bem.css';
import NumberInput from './inputs/NumberInput.jsx';
import Point2DInput from './inputs/Point2DInput.jsx';
import EffectConfigurer from './EffectConfigurer.jsx';
import SpecialtyDistribution from '../../utils/SpecialtyDistribution.js';
import PreferencesService from '../../services/PreferencesService.js';

function SpecialtyEffectsModal({
    isOpen,
    onClose,
    availableEffects,
    onCreateSpecialty,
    projectState
}) {
    const theme = useTheme();
    const dialogPaperRef = useRef(null);

    // Update CSS variables dynamically based on theme changes
    useEffect(() => {
        if (dialogPaperRef.current) {
            dialogPaperRef.current.style.setProperty('--specialty-modal-bg', theme.palette.background.paper);
            dialogPaperRef.current.style.setProperty('--specialty-modal-text-secondary', theme.palette.text.secondary);
            dialogPaperRef.current.style.setProperty('--specialty-modal-divider', theme.palette.divider);
            dialogPaperRef.current.style.setProperty('--specialty-modal-preview-bg', theme.palette.action.hover);
        }
    }, [theme]);

    const [step, setStep] = useState(1); // 1: select effect, 2: configure effect, 3: distribution config, 4: position config
    const [selectedEffect, setSelectedEffect] = useState(null);
    const [effectConfig, setEffectConfig] = useState(null);

    // Distribution configuration
    const [effectCount, setEffectCount] = useState(3);
    const [distributionType, setDistributionType] = useState('line');

    // Position configuration
    const [startPoint, setStartPoint] = useState({ x: 100, y: 100 });
    const [endPoint, setEndPoint] = useState({ x: 300, y: 300 });
    const [centerPoint, setCenterPoint] = useState({ x: 200, y: 200 });
    const [radius, setRadius] = useState(100);

    // Helper function to calculate resolution-aware defaults
    const calculateSmartDefaults = () => {
        if (!projectState) {
            // Fallback to hardcoded values if no project state
            return {
                startPoint: { x: 100, y: 100 },
                endPoint: { x: 300, y: 300 },
                centerPoint: { x: 200, y: 200 },
                radius: 100
            };
        }

        const dimensions = projectState.getResolutionDimensions();
        const { w: width, h: height } = dimensions;

        console.log('🌟 SpecialtyEffectsModal: Calculating smart defaults for resolution:', dimensions);

        // Calculate proportional positions
        const smartDefaults = {
            startPoint: {
                x: Math.round(width * 0.25),
                y: Math.round(height * 0.25)
            },
            endPoint: {
                x: Math.round(width * 0.75),
                y: Math.round(height * 0.75)
            },
            centerPoint: {
                x: Math.round(width * 0.5),
                y: Math.round(height * 0.5)
            },
            radius: Math.round(Math.min(width, height) * 0.15)
        };

        console.log('🌟 SpecialtyEffectsModal: Smart defaults calculated:', smartDefaults);
        return smartDefaults;
    };

    // Reset when modal opens with resolution-aware defaults
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedEffect(null);
            setEffectConfig(null);
            setEffectCount(3);
            setDistributionType('line');

            // Calculate and apply smart defaults based on current resolution
            const defaults = calculateSmartDefaults();
            setStartPoint(defaults.startPoint);
            setEndPoint(defaults.endPoint);
            setCenterPoint(defaults.centerPoint);
            setRadius(defaults.radius);
        }
    }, [isOpen, projectState]);

    const effects = availableEffects?.primary || [];

    const typeInfo = {
        title: '⭐ Create Specialty Effects',
        description: 'Distribute multiple effects along geometric patterns',
        colorVar: 'var(--specialty-modal-accent-color)'
    };

    const handleEffectSelect = async (effect) => {
        setSelectedEffect(effect);

        // Initialize effectConfig with defaults (user preferences or effect defaults)
        try {
            // Try to get user-saved defaults first
            const savedDefaults = await PreferencesService.getEffectDefaults(effect.registryKey);
            const initialConfig = savedDefaults || effect.defaultConfig || {};

            console.log('🌟 SpecialtyEffectsModal: Initializing effect config:', {
                effectName: effect.registryKey,
                usingSavedDefaults: !!savedDefaults,
                configSource: savedDefaults ? 'User Preferences' : 'Default Config'
            });

            setEffectConfig(initialConfig);
        } catch (error) {
            console.error('🌟 SpecialtyEffectsModal: Error loading preferences:', error);
            // Fallback to effect defaults
            setEffectConfig(effect.defaultConfig || {});
        }

        setStep(2);
    };

    const handleNext = () => {
        if (step < 4) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setStep(1);
        setSelectedEffect(null);
        onClose();
    };

    const handleCreate = () => {
        // Calculate positions based on distribution type
        let positions = [];
        if (distributionType === 'line') {
            positions = SpecialtyDistribution.distributeAlongLine(startPoint, endPoint, effectCount);
        } else if (distributionType === 'circle') {
            positions = SpecialtyDistribution.distributeAlongCircle(centerPoint, radius, effectCount);
        }

        // Create the specialty effect data with custom configuration
        const specialtyData = {
            effectClass: selectedEffect,
            distributionType,
            effectCount,
            positions,
            config: distributionType === 'line' ?
                { startPoint, endPoint } :
                { centerPoint, radius },
            effectConfig: effectConfig // Include the custom effect configuration
        };

        onCreateSpecialty(specialtyData);
        handleClose();
    };

    const getPreviewPositions = () => {
        if (distributionType === 'line') {
            return SpecialtyDistribution.getPreviewPositions('line', {
                startPoint,
                endPoint,
                count: effectCount
            });
        } else {
            return SpecialtyDistribution.getPreviewPositions('circle', {
                centerPoint,
                radius,
                count: effectCount
            });
        }
    };

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                ref: dialogPaperRef,
                className: 'specialty-modal__paper',
                sx: {
                    backgroundImage: 'none',
                    minHeight: '60vh'
                }
            }}
        >
            <DialogTitle className="specialty-modal__title">
                <Box>
                    <Typography variant="h6" className="specialty-modal__title-text">
                        {typeInfo.title}
                    </Typography>
                    <Typography variant="body2" className="specialty-modal__secondary-text">
                        Step {step} of 4: {
                            step === 1 ? 'Select Effect' :
                            step === 2 ? 'Configure Effect' :
                            step === 3 ? 'Configure Distribution' :
                            'Set Positions'
                        }
                    </Typography>
                </Box>
                <IconButton
                    onClick={handleClose}
                    size="small"
                    className="specialty-modal__close-button"
                >
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers className="specialty-modal__content">
                {step === 1 && (
                    // Effect Selection
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Choose Effect Type
                        </Typography>
                        <Typography variant="body2" color="text.secondary" className="specialty-modal__section-subtitle">
                            Select the effect you want to distribute along a geometric pattern
                        </Typography>
                        {effects.length > 0 ? (
                            <Grid container spacing={2}>
                                {effects.map(effect => (
                                    <Grid item xs={12} sm={6} md={4} key={effect.registryKey}>
                                        <Card className="specialty-modal__effect-card">
                                            <CardActionArea
                                                onClick={() => handleEffectSelect(effect)}
                                                className="specialty-modal__effect-card-action"
                                            >
                                                <CardContent className="specialty-modal__effect-card-content">
                                                    <Typography variant="subtitle1" gutterBottom>
                                                        {effect.displayName || effect.registryKey}
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
                            <Alert severity="info">
                                No effects available for specialty distribution
                            </Alert>
                        )}
                    </Box>
                )}

                {step === 2 && (
                    // Effect Configuration
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Configure Effect
                        </Typography>
                        <Typography variant="body2" color="text.secondary" className="specialty-modal__section-subtitle">
                            Configure the settings for this effect. These settings will be applied to all distributed instances.
                        </Typography>

                        {selectedEffect && (
                            <EffectConfigurer
                                selectedEffect={selectedEffect}
                                initialConfig={effectConfig}
                                onConfigChange={(config) => setEffectConfig(config)}
                                projectState={projectState}
                                mode="specialty"
                                showHeader={false}
                            />
                        )}

                        <Box className="specialty-modal__section-box">
                            <Typography variant="body2" color="text.secondary">
                                Effect: <strong>{selectedEffect?.displayName || selectedEffect?.registryKey}</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Configuration: {effectConfig ? 'Ready' : 'Pending...'}
                            </Typography>
                        </Box>
                    </Box>
                )}

                {step === 3 && (
                    // Distribution Configuration
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Configure Distribution
                        </Typography>
                        <Typography variant="body2" color="text.secondary" className="specialty-modal__section-subtitle">
                            Set up how many effects to create and their distribution pattern
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <NumberInput
                                    field={{
                                        name: 'effectCount',
                                        label: 'Number of Effects',
                                        min: 1,
                                        max: 20,
                                        step: 1,
                                        default: 3
                                    }}
                                    value={effectCount}
                                    onChange={(name, value) => setEffectCount(value)}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl component="fieldset">
                                    <FormLabel component="legend" className="specialty-modal__form-label">
                                        Distribution Pattern
                                    </FormLabel>
                                    <RadioGroup
                                        value={distributionType}
                                        onChange={(e) => setDistributionType(e.target.value)}
                                    >
                                        <FormControlLabel
                                            value="line"
                                            control={<Radio />}
                                            label="Line (between two points)"
                                        />
                                        <FormControlLabel
                                            value="circle"
                                            control={<Radio />}
                                            label="Circle (around center point)"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <Box className="specialty-modal__section-box">
                            <Typography variant="body2" color="text.secondary">
                                Selected: <strong>{selectedEffect?.displayName || selectedEffect?.registryKey}</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Will create <strong>{effectCount}</strong> effects along a <strong>{distributionType}</strong>
                            </Typography>
                        </Box>
                    </Box>
                )}

                {step === 4 && (
                    // Position Configuration
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Set Positions
                        </Typography>
                        <Typography variant="body2" color="text.secondary" className="specialty-modal__section-subtitle">
                            Define the {distributionType === 'line' ? 'start and end points' : 'center point and radius'}
                        </Typography>

                        <Grid container spacing={3}>
                            {distributionType === 'line' ? (
                                <>
                                    <Grid item xs={12} md={6}>
                                        <Point2DInput
                                            field={{
                                                name: 'startPoint',
                                                label: 'Start Point'
                                            }}
                                            value={startPoint}
                                            onChange={(name, value) => setStartPoint(value)}
                                            projectState={projectState}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Point2DInput
                                            field={{
                                                name: 'endPoint',
                                                label: 'End Point'
                                            }}
                                            value={endPoint}
                                            onChange={(name, value) => setEndPoint(value)}
                                            projectState={projectState}
                                        />
                                    </Grid>
                                </>
                            ) : (
                                <>
                                    <Grid item xs={12} md={6}>
                                        <Point2DInput
                                            field={{
                                                name: 'centerPoint',
                                                label: 'Center Point'
                                            }}
                                            value={centerPoint}
                                            onChange={(name, value) => setCenterPoint(value)}
                                            projectState={projectState}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <NumberInput
                                            field={{
                                                name: 'radius',
                                                label: 'Radius',
                                                min: 10,
                                                max: 500,
                                                step: 5,
                                                default: 100
                                            }}
                                            value={radius}
                                            onChange={(name, value) => setRadius(value)}
                                        />
                                    </Grid>
                                </>
                            )}
                        </Grid>

                        <Divider className="specialty-modal__divider" />

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Preview Summary
                            </Typography>
                            <Paper className="specialty-modal__preview">
                                <Typography variant="body2">
                                    <strong>Effect:</strong> {selectedEffect?.displayName || selectedEffect?.registryKey}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Count:</strong> {effectCount} effects
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Pattern:</strong> {distributionType === 'line' ?
                                        `Line from (${Math.round(startPoint.x)}, ${Math.round(startPoint.y)}) to (${Math.round(endPoint.x)}, ${Math.round(endPoint.y)})` :
                                        `Circle centered at (${Math.round(centerPoint.x)}, ${Math.round(centerPoint.y)}) with radius ${radius}`
                                    }
                                </Typography>
                            </Paper>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions className="specialty-modal__actions">
                <Button
                    onClick={handleBack}
                    variant="outlined"
                    startIcon={step > 1 ? <ArrowBack /> : <Close />}
                    className="specialty-modal__cancel-button"
                >
                    {step > 1 ? 'Back' : 'Cancel'}
                </Button>

                {step < 4 ? (
                    <Button
                        onClick={handleNext}
                        variant="contained"
                        endIcon={<ArrowForward />}
                        disabled={(step === 1 && !selectedEffect) || (step === 2 && !effectConfig)}
                        className="specialty-modal__gradient-button"
                    >
                        Next
                    </Button>
                ) : (
                    <Button
                        onClick={handleCreate}
                        variant="contained"
                        className="specialty-modal__gradient-button"
                    >
                        Create Specialty Effects
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default SpecialtyEffectsModal;