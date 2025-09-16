import React, { useState, useEffect } from 'react';
import EffectTypeSelector from './effects/EffectTypeSelector';
import EffectSelector from './effects/EffectSelector';
import EffectConfigurer from './effects/EffectConfigurer';
import EffectSummary from './effects/EffectSummary';
import EffectPreviewViewer from './preview/EffectPreviewViewer';
import { EffectLibrary } from '../data/effectLibrary';

function EffectWizard({ onBack, onEffectsCreated, projectData }) {
    const [step, setStep] = useState(1);
    const [effectType, setEffectType] = useState('primary');
    const [selectedEffect, setSelectedEffect] = useState(null);
    const [effectConfig, setEffectConfig] = useState({});
    const [effects, setEffects] = useState({
        primary: [], // Each primary effect will have attachedEffects: { secondary: [], keyFrame: [] }
        final: []
    });
    const [currentPrimaryEffect, setCurrentPrimaryEffect] = useState(null); // For attaching secondary/keyframe
    const [stagedPrimaryEffect, setStagedPrimaryEffect] = useState(null); // Primary effect being built before adding to project
    const [availableEffects, setAvailableEffects] = useState({
        primary: [],
        secondary: [],
        keyFrame: [],
        final: []
    });
    const [loadingEffects, setLoadingEffects] = useState(true);

    // Load available effects on component mount
    useEffect(() => {
        loadAvailableEffects();
    }, []);

    const loadAvailableEffects = async () => {
        try {
            setLoadingEffects(true);
            const effects = await EffectLibrary.getAvailableEffects();
            setAvailableEffects(effects);
        } catch (error) {
            console.error('Error loading available effects:', error);
            // Set fallback effects
            setAvailableEffects({
                primary: [],
                secondary: [],
                keyFrame: [],
                final: []
            });
        } finally {
            setLoadingEffects(false);
        }
    };

    const handleEffectTypeChange = (newEffectType) => {
        setEffectType(newEffectType);
        setSelectedEffect(null);
        setEffectConfig({});
        setStep(2); // Automatically advance to effect selection
    };

    const handleEffectSelect = (effect) => {
        console.log('EffectWizard: Effect selected:', effect);
        setSelectedEffect(effect);
        setEffectConfig({});

        // If selecting a primary effect, create staged effect immediately to show attachment UI
        if (effectType === 'primary') {
            const stagedEffect = {
                id: Date.now(),
                effectClass: effect,
                config: {},
                percentChance: 100,
                attachedEffects: {
                    secondary: [],
                    keyFrame: []
                }
            };
            setStagedPrimaryEffect(stagedEffect);
            setCurrentPrimaryEffect(stagedEffect);
            console.log('Created initial staged primary effect for attachment UI');
        }

        setStep(3); // Move to configuration step
        console.log('EffectWizard: Moving to step 3 (configuration)');
    };

    const handleConfigChange = (config) => {
        setEffectConfig(config);

        // Update staged primary effect configuration in real-time
        if (effectType === 'primary' && stagedPrimaryEffect) {
            const updatedStagedEffect = {
                ...stagedPrimaryEffect,
                config: config
            };
            setStagedPrimaryEffect(updatedStagedEffect);
            setCurrentPrimaryEffect(updatedStagedEffect);
        }
    };

    const handleAddEffect = (effectData) => {
        console.log('handleAddEffect received effectData:', effectData);

        if (effectType === 'primary' && stagedPrimaryEffect) {
            // Update existing staged primary effect with new configuration
            const updatedStagedEffect = {
                ...stagedPrimaryEffect,
                config: effectData.config,
                percentChance: effectData.percentChance || 100
            };

            console.log('Updated staged primary effect:', updatedStagedEffect);

            // Update staged effect
            setStagedPrimaryEffect(updatedStagedEffect);
            setCurrentPrimaryEffect(updatedStagedEffect);
            // Stay on step 3 to allow attachment
        } else if (effectType === 'final') {
            const newEffect = {
                id: Date.now(),
                effectClass: effectData.effectClass,
                config: effectData.config,
                percentChance: effectData.percentChance || 100
            };

            setEffects(prev => ({
                ...prev,
                final: [...prev.final, newEffect]
            }));

            // Reset for next effect
            setSelectedEffect(null);
            setEffectConfig({});
            setStep(2);
        }
    };

    const handleRemoveEffect = (type, effectId) => {
        setEffects(prev => ({
            ...prev,
            [type]: prev[type].filter(e => e.id !== effectId)
        }));
    };

    const handleAttachEffect = (effectData, attachmentType, isEditing = false) => {
        if (!stagedPrimaryEffect) return;

        if (isEditing && effectData.id) {
            // Update existing attached effect
            console.log('Updating existing attached effect:', effectData);
            const updatedStagedEffect = {
                ...stagedPrimaryEffect,
                attachedEffects: {
                    ...stagedPrimaryEffect.attachedEffects,
                    [attachmentType]: stagedPrimaryEffect.attachedEffects[attachmentType].map(effect =>
                        effect.id === effectData.id ? {
                            ...effect,
                            config: effectData.config,
                            percentChance: effectData.percentChance || 100
                        } : effect
                    )
                }
            };

            setStagedPrimaryEffect(updatedStagedEffect);
            setCurrentPrimaryEffect(updatedStagedEffect);
            console.log('Updated attached effect in staged primary:', updatedStagedEffect);
        } else {
            // Add new attached effect
            const newAttachedEffect = {
                id: Date.now(),
                effectClass: effectData.effectClass,
                config: effectData.config,
                percentChance: effectData.percentChance || 100
            };

            const updatedStagedEffect = {
                ...stagedPrimaryEffect,
                attachedEffects: {
                    ...stagedPrimaryEffect.attachedEffects,
                    [attachmentType]: [...stagedPrimaryEffect.attachedEffects[attachmentType], newAttachedEffect]
                }
            };

            setStagedPrimaryEffect(updatedStagedEffect);
            setCurrentPrimaryEffect(updatedStagedEffect);
            console.log('Attached effect to staged primary:', updatedStagedEffect);
        }
    };


    const handleRemoveAttachedEffect = (attachmentType, effectId) => {
        if (!stagedPrimaryEffect) return;

        const updatedStagedEffect = {
            ...stagedPrimaryEffect,
            attachedEffects: {
                ...stagedPrimaryEffect.attachedEffects,
                [attachmentType]: stagedPrimaryEffect.attachedEffects[attachmentType].filter(e => e.id !== effectId)
            }
        };

        setStagedPrimaryEffect(updatedStagedEffect);
        setCurrentPrimaryEffect(updatedStagedEffect);
        console.log('Removed attached effect from staged primary:', updatedStagedEffect);
    };

    const handleAddCompleteEffectToProject = () => {
        if (!stagedPrimaryEffect) return;

        console.log('Adding complete staged effect to project:', stagedPrimaryEffect);

        // Add the staged primary effect with all attachments to the project
        setEffects(prev => ({
            ...prev,
            primary: [...prev.primary, stagedPrimaryEffect]
        }));

        // Clear staging area and reset
        setStagedPrimaryEffect(null);
        setCurrentPrimaryEffect(null);
        setSelectedEffect(null);
        setEffectConfig({});
        setStep(2); // Go back to effect selection
    };

    // Transform nested effect structure back to flat structure for backend compatibility
    const transformEffectsForBackend = (nestedEffects) => {
        console.log('transformEffectsForBackend input:', JSON.stringify(nestedEffects, null, 2));

        const flatEffects = {
            primary: [],
            secondary: [],
            keyFrame: [],
            final: (nestedEffects.final || []).map(effect => {
                console.log('Processing final effect:', effect);
                return {
                    ...effect,
                    percentChance: effect.percentChance || 100
                };
            })
        };

        // Process primary effects and extract attached effects
        if (nestedEffects.primary) {
            nestedEffects.primary.forEach(primaryEffect => {
                console.log('Processing primary effect:', primaryEffect);
                // Add the primary effect itself
                const transformedPrimary = {
                    id: primaryEffect.id,
                    effectClass: primaryEffect.effectClass,
                    config: primaryEffect.config,
                    percentChance: primaryEffect.percentChance || 100
                };
                console.log('Transformed primary effect:', transformedPrimary);
                flatEffects.primary.push(transformedPrimary);

                // Extract attached secondary effects
                if (primaryEffect.attachedEffects?.secondary) {
                    primaryEffect.attachedEffects.secondary.forEach(effect => {
                        console.log('Processing attached secondary effect:', effect);
                        flatEffects.secondary.push({
                            ...effect,
                            percentChance: effect.percentChance || 100
                        });
                    });
                }

                // Extract attached keyframe effects
                if (primaryEffect.attachedEffects?.keyFrame) {
                    primaryEffect.attachedEffects.keyFrame.forEach(effect => {
                        console.log('Processing attached keyFrame effect:', effect);
                        flatEffects.keyFrame.push({
                            ...effect,
                            percentChance: effect.percentChance || 100
                        });
                    });
                }
            });
        }

        console.log('transformEffectsForBackend output:', JSON.stringify(flatEffects, null, 2));
        return flatEffects;
    };

    const handleNext = () => {
        if (step < 4) {
            setStep(step + 1);
        } else {
            // Final step - transform and return effects to parent
            const backendCompatibleEffects = transformEffectsForBackend(effects);
            onEffectsCreated(backendCompatibleEffects);
        }
    };

    const handlePrevious = () => {
        if (step === 3 && selectedEffect) {
            // If we're configuring an effect, go back to effect selection
            setStep(2);
        } else if (step > 1) {
            setStep(step - 1);
        } else {
            onBack();
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <EffectTypeSelector
                        effectType={effectType}
                        onEffectTypeChange={handleEffectTypeChange}
                    />
                );

            case 2:
                return (
                    <EffectSelector
                        effectType={effectType}
                        availableEffects={availableEffects}
                        effects={effects}
                        onEffectSelect={handleEffectSelect}
                        onEffectRemove={handleRemoveEffect}
                    />
                );

            case 3:
                return (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 350px',
                        gap: '2rem',
                        minHeight: '500px',
                        maxHeight: '70vh',
                        overflow: 'auto'
                    }}>
                        <div style={{ overflow: 'auto' }}>
                            <EffectConfigurer
                                selectedEffect={selectedEffect}
                                projectData={projectData}
                                onConfigChange={handleConfigChange}
                                onAddEffect={handleAddEffect}
                                onAddCompleteEffect={handleAddCompleteEffectToProject}
                                effectType={effectType}
                                availableEffects={availableEffects}
                                attachedEffects={currentPrimaryEffect?.attachedEffects}
                                onAttachEffect={handleAttachEffect}
                                onRemoveAttachedEffect={handleRemoveAttachedEffect}
                            />
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.02)',
                            maxHeight: '70vh',
                            overflow: 'auto'
                        }}>
                            <h4 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Live Preview</h4>
                            <EffectPreviewViewer
                                effectClass={selectedEffect}
                                effectConfig={effectConfig}
                                attachedEffects={stagedPrimaryEffect?.attachedEffects}
                                projectData={projectData}
                                size="medium"
                                showControls={true}
                            />
                        </div>
                    </div>
                );

            case 4:
                return (
                    <EffectSummary
                        effects={effects}
                        onStartGeneration={() => onEffectsCreated(transformEffectsForBackend(effects))}
                    />
                );

            default:
                return null;
        }
    };

    const getStepTitle = () => {
        switch (step) {
            case 1: return '1. Effect Type';
            case 2: return '2. Select Effect';
            case 3: return '3. Configure';
            case 4: return '4. Review';
            default: return '';
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1: return effectType !== null;
            case 2: return true; // Can always skip to review
            case 3: return selectedEffect !== null;
            case 4: return true;
            default: return false;
        }
    };

    if (loadingEffects) {
        return (
            <div className="wizard">
                <div className="wizard-header">
                    <h2>Effect Wizard</h2>
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    gap: '1rem'
                }}>
                    <div style={{
                        border: '4px solid #333',
                        borderTop: '4px solid #667eea',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <div style={{ color: '#ccc' }}>Discovering available effects...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="wizard">
            <div className="wizard-header">
                <h2>Effect Wizard</h2>
                <div className="wizard-steps">
                    {[1, 2, 3, 4].map(stepNum => {
                        const stepTitle = (() => {
                            switch (stepNum) {
                                case 1: return '1. Effect Type';
                                case 2: return '2. Select Effect';
                                case 3: return '3. Configure';
                                case 4: return '4. Review';
                                default: return '';
                            }
                        })();

                        return (
                            <div
                                key={stepNum}
                                className={`wizard-step ${step >= stepNum ? 'active' : ''} ${step > stepNum ? 'completed' : ''}`}
                            >
                                {stepTitle}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{
                minHeight: '400px',
                maxHeight: 'calc(100vh - 200px)',
                padding: '1rem 0',
                overflow: 'auto'
            }}>
                {renderStep()}
            </div>

            <div className="wizard-navigation">
                <button
                    className="btn btn-secondary"
                    onClick={handlePrevious}
                >
                    {step === 1 ? 'Back to Project' : 'Previous'}
                </button>

                {step === 2 && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setStep(4)}
                        style={{ marginLeft: 'auto', marginRight: '1rem' }}
                    >
                        Skip to Review
                    </button>
                )}

                {step < 4 && step !== 3 && step !== 1 && (
                    <button
                        className={`btn ${
                            !canProceed()
                                ? ''
                                : step === 2
                                    ? 'btn-ready'
                                    : 'btn-input-required'
                        }`}
                        onClick={handleNext}
                        disabled={!canProceed()}
                    >
                        Next
                    </button>
                )}

                {step === 4 && (
                    Object.values(effects).flat().length === 0 ? (
                        <button
                            className="btn btn-secondary"
                            onClick={() => onEffectsCreated(transformEffectsForBackend(effects))}
                        >
                            Generate Anyway
                        </button>
                    ) : (
                        <button
                            className="btn btn-ready"
                            onClick={() => onEffectsCreated(transformEffectsForBackend(effects))}
                        >
                            Complete Effects Setup
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

export default EffectWizard;