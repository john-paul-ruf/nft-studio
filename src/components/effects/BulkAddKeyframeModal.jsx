import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Card,
    CardContent,
    CardActionArea,
    Grid,
    TextField,
    Slider,
    Stepper,
    Step,
    StepLabel,
    Chip,
    Divider,
    useTheme
} from '@mui/material';
import { PlayArrow, Settings, Schedule } from '@mui/icons-material';
import EffectConfigurer from './EffectConfigurer.jsx';
import BulkPositionQuickPick from './BulkPositionQuickPick.jsx';
import PreferencesService from '../../services/PreferencesService.js';
import ConfigIntrospector from '../../utils/ConfigIntrospector.js';
import useDebounce from '../../hooks/useDebounce.js';

const steps = ['Select Effect', 'Configure Effect', 'Set Keyframe Range'];

export default function BulkAddKeyframeModal({
    isOpen,
    onClose,
    onBulkAdd,
    keyframeEffects = [],
    projectState
}) {
    const theme = useTheme();
    const [activeStep, setActiveStep] = useState(0);
    const [selectedEffect, setSelectedEffect] = useState(null);
    const [effectConfig, setEffectConfig] = useState(null);
    const [configSchema, setConfigSchema] = useState(null);
    const [frameRange, setFrameRange] = useState([0, 10]);
    const [numEffects, setNumEffects] = useState(5);
    const [maxFrames, setMaxFrames] = useState(10);
    
    // Debounced setters for number inputs
    const debouncedSetFrameRange = useDebounce(useCallback((range) => {
        setFrameRange(range);
    }, []), 150);
    
    const debouncedSetNumEffects = useDebounce(useCallback((num) => {
        setNumEffects(num);
    }, []), 150);

    // Get max frames from project state
    useEffect(() => {
        if (projectState && projectState.getNumFrames) {
            const totalFrames = projectState.getNumFrames();
            setMaxFrames(totalFrames);
            setFrameRange([0, totalFrames]);
        }
    }, [projectState]);

    // Reset modal state when opened
    useEffect(() => {
        if (isOpen) {
            setActiveStep(0);
            setSelectedEffect(null);
            setEffectConfig(null);
            setNumEffects(5);
            if (projectState && projectState.getNumFrames) {
                const totalFrames = projectState.getNumFrames();
                setMaxFrames(totalFrames);
                setFrameRange([0, totalFrames]);
            }
        }
    }, [isOpen, projectState]);

    const handleNext = () => {
        setActiveStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    const handleEffectSelect = async (effect) => {
        // Ensure the effect has the required registryKey property
        const effectWithRegistryKey = {
            ...effect,
            registryKey: effect.registryKey || effect.name || effect.className
        };
        setSelectedEffect(effectWithRegistryKey);

        // Load the config schema for this effect
        try {
            const schema = await ConfigIntrospector.analyzeConfigClass(effectWithRegistryKey, projectState);
            setConfigSchema(schema);
            console.log('🎬 BulkAddKeyframeModal: Loaded config schema:', schema);
        } catch (error) {
            console.error('🎬 BulkAddKeyframeModal: Error loading config schema:', error);
            setConfigSchema(null);
        }

        // Initialize effectConfig with defaults (user preferences or effect defaults)
        try {
            // Try to get user-saved defaults first
            const savedDefaults = await PreferencesService.getEffectDefaults(effectWithRegistryKey.registryKey);
            const initialConfig = savedDefaults || effect.defaultConfig || {};

            console.log('🎬 BulkAddKeyframeModal: Initializing effect config:', {
                effectName: effectWithRegistryKey.registryKey,
                usingSavedDefaults: !!savedDefaults,
                configSource: savedDefaults ? 'User Preferences' : 'Default Config',
                config: initialConfig
            });

            setEffectConfig(initialConfig);
        } catch (error) {
            console.error('🎬 BulkAddKeyframeModal: Error loading preferences:', error);
            // Fallback to effect defaults
            setEffectConfig(effect.defaultConfig || {});
        }
    };

    const handleConfigChange = (config) => {
        setEffectConfig(config);
    };

    const handleFrameRangeChange = (event, newValue) => {
        setFrameRange(newValue);
        // Adjust numEffects if it exceeds the new range
        const maxPossible = newValue[1] - newValue[0] + 1;
        if (numEffects > maxPossible) {
            setNumEffects(maxPossible);
        }
    };

    const handleBulkAdd = () => {
        if (!selectedEffect || !effectConfig) return;

        // Generate unique random frames within the specified range
        const availableFrames = [];
        for (let i = frameRange[0]; i <= frameRange[1]; i++) {
            availableFrames.push(i);
        }
        
        // Shuffle the available frames and take the first numEffects
        const shuffledFrames = availableFrames.sort(() => Math.random() - 0.5);
        const uniqueFrames = shuffledFrames.slice(0, Math.min(numEffects, availableFrames.length));

        // Create keyframe effects data with frame in config
        const keyframeEffectsData = uniqueFrames.map(frame => ({
            registryKey: selectedEffect.registryKey || selectedEffect.name || selectedEffect.className,
            frame: frame,
            config: { 
                ...effectConfig,
                keyFrames: [frame] // Add frame to config as keyFrames array
            }
        }));

        onBulkAdd(keyframeEffectsData);
        onClose();
    };

    const canProceed = () => {
        switch (activeStep) {
            case 0:
                return selectedEffect !== null;
            case 1:
                return effectConfig !== null;
            case 2:
                return frameRange[0] >= 0 && frameRange[1] <= maxFrames && numEffects > 0;
            default:
                return false;
        }
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Select the keyframe effect you want to add multiple times:
                        </Typography>
                        <Grid container spacing={2}>
                            {keyframeEffects.map((effect, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                    <Card
                                        variant={selectedEffect?.registryKey === (effect.registryKey || effect.name || effect.className) ? "outlined" : "elevation"}
                                        sx={{
                                            border: selectedEffect?.registryKey === (effect.registryKey || effect.name || effect.className)
                                                ? `2px solid ${theme.palette.primary.main}` 
                                                : 'none',
                                            backgroundColor: selectedEffect?.registryKey === (effect.registryKey || effect.name || effect.className)
                                                ? theme.palette.primary.main + '10' 
                                                : 'inherit'
                                        }}
                                    >
                                        <CardActionArea onClick={() => handleEffectSelect(effect)}>
                                            <CardContent sx={{ textAlign: 'center', py: 3 }}>
                                                <Schedule 
                                                    sx={{ 
                                                        fontSize: 40, 
                                                        color: selectedEffect?.registryKey === (effect.registryKey || effect.name || effect.className)
                                                            ? theme.palette.primary.main 
                                                            : theme.palette.text.secondary,
                                                        mb: 1 
                                                    }} 
                                                />
                                                <Typography variant="h6" component="div">
                                                    {effect.displayName || effect.name || effect.className}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {effect.description || 'Keyframe effect'}
                                                </Typography>
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                        {keyframeEffects.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                No keyframe effects available
                            </Typography>
                        )}
                    </Box>
                );

            case 1:
                return (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Configure the settings for <strong>{selectedEffect?.displayName || selectedEffect?.name}</strong>:
                        </Typography>

                        {/* Quick Position Picker for effects that have position fields */}
                        {effectConfig && Object.keys(effectConfig).some(key =>
                            key.toLowerCase().includes('position') ||
                            key.toLowerCase().includes('location') ||
                            key.toLowerCase().includes('placement')
                        ) && (
                            <Box sx={{ mb: 3 }}>
                                <BulkPositionQuickPick
                                    projectState={projectState}
                                    onPositionSelect={(position) => {
                                        // Find the position field and update it
                                        const positionFields = Object.keys(effectConfig).filter(key =>
                                            key.toLowerCase().includes('position') ||
                                            key.toLowerCase().includes('location') ||
                                            key.toLowerCase().includes('placement')
                                        );

                                        if (positionFields.length > 0) {
                                            const updatedConfig = { ...effectConfig };
                                            positionFields.forEach(field => {
                                                // Check the field type from schema
                                                const fieldSchema = configSchema?.fields?.find(f => f.name === field);
                                                const fieldType = fieldSchema?.type;

                                                // Format position based on field type
                                                if (fieldType === 'point2d') {
                                                    // For point2d, only use x and y (no name property)
                                                    updatedConfig[field] = { x: position.x, y: position.y };
                                                } else {
                                                    // For position type or unknown, use the full position object
                                                    updatedConfig[field] = position;
                                                }

                                                console.log('🎯 BulkAddKeyframeModal: Setting position field', {
                                                    field,
                                                    fieldType,
                                                    value: updatedConfig[field]
                                                });
                                            });
                                            handleConfigChange(updatedConfig);
                                        }
                                    }}
                                />
                                <Divider sx={{ my: 3 }} />
                            </Box>
                        )}

                        {selectedEffect && (
                            <EffectConfigurer
                                selectedEffect={selectedEffect}
                                initialConfig={effectConfig}
                                onConfigChange={handleConfigChange}
                                projectState={projectState}
                                mode="keyframe"
                                showHeader={false}
                            />
                        )}
                    </Box>
                );

            case 2:
                return (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Set the frame range and number of keyframe effects to add:
                        </Typography>
                        
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                Frame Range: {frameRange[0]} - {frameRange[1]}
                            </Typography>
                            <Slider
                                value={frameRange}
                                onChange={handleFrameRangeChange}
                                valueLabelDisplay="auto"
                                min={0}
                                max={maxFrames}
                                marks={[
                                    { value: 0, label: '0' },
                                    { value: maxFrames, label: maxFrames.toString() }
                                ]}
                                sx={{ mb: 2 }}
                            />
                            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                <TextField
                                    label="Start Frame"
                                    type="number"
                                    value={frameRange[0]}
                                    onChange={(e) => {
                                        const value = Math.max(0, Math.min(parseInt(e.target.value) || 0, frameRange[1]));
                                        const newRange = [value, frameRange[1]];
                                        debouncedSetFrameRange(newRange);
                                        // Adjust numEffects if needed
                                        const maxPossible = newRange[1] - newRange[0] + 1;
                                        if (numEffects > maxPossible) {
                                            debouncedSetNumEffects(maxPossible);
                                        }
                                    }}
                                    size="small"
                                    inputProps={{ min: 0, max: frameRange[1] }}
                                />
                                <TextField
                                    label="End Frame"
                                    type="number"
                                    value={frameRange[1]}
                                    onChange={(e) => {
                                        const value = Math.min(maxFrames, Math.max(parseInt(e.target.value) || maxFrames, frameRange[0]));
                                        const newRange = [frameRange[0], value];
                                        debouncedSetFrameRange(newRange);
                                        // Adjust numEffects if needed
                                        const maxPossible = newRange[1] - newRange[0] + 1;
                                        if (numEffects > maxPossible) {
                                            debouncedSetNumEffects(maxPossible);
                                        }
                                    }}
                                    size="small"
                                    inputProps={{ min: frameRange[0], max: maxFrames }}
                                />
                            </Box>
                        </Box>

                        <Box sx={{ mb: 3 }}>
                            <TextField
                                label="Number of Effects to Add"
                                type="number"
                                value={numEffects}
                                onChange={(e) => {
                                    const maxPossible = frameRange[1] - frameRange[0] + 1;
                                    const value = Math.max(1, Math.min(parseInt(e.target.value) || 1, maxPossible));
                                    debouncedSetNumEffects(value);
                                }}
                                size="small"
                                inputProps={{ min: 1, max: frameRange[1] - frameRange[0] + 1 }}
                                helperText={`Each effect will be assigned a unique random frame within the specified range (max: ${frameRange[1] - frameRange[0] + 1})`}
                            />
                        </Box>

                        <Box sx={{ p: 2, backgroundColor: theme.palette.background.default, borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                <strong>Summary:</strong> Adding {numEffects} instances of{' '}
                                <Chip 
                                    label={selectedEffect?.displayName || selectedEffect?.name} 
                                    size="small" 
                                    sx={{ mx: 0.5 }}
                                />
                                with random frames between {frameRange[0]} and {frameRange[1]}
                            </Typography>
                        </Box>
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: theme.palette.background.paper,
                    backgroundImage: 'none'
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule color="primary" />
                    <Typography variant="h6">Bulk Add Keyframe Effects</Typography>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label, index) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {renderStepContent()}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                <Box sx={{ flex: 1 }} />
                {activeStep > 0 && (
                    <Button onClick={handleBack} color="inherit">
                        Back
                    </Button>
                )}
                {activeStep < steps.length - 1 ? (
                    <Button
                        onClick={handleNext}
                        variant="contained"
                        disabled={!canProceed()}
                        startIcon={<PlayArrow />}
                    >
                        Next
                    </Button>
                ) : (
                    <Button
                        onClick={handleBulkAdd}
                        variant="contained"
                        disabled={!canProceed()}
                        startIcon={<Schedule />}
                    >
                        Add {numEffects} Effects
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}