import React, { useState, useEffect } from 'react';
import EffectTypeSelector from './effects/EffectTypeSelector';
import EffectSelector from './effects/EffectSelector';
import EffectConfigurer from './effects/EffectConfigurer';
import EffectAttacher from './effects/EffectAttacher';
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
        setStep(3); // Move to configuration step
        console.log('EffectWizard: Moving to step 3 (configuration)');
    };

    const handleConfigChange = (config) => {
        setEffectConfig(config);
    };

    const handleAddEffect = (effectData) => {
        const newEffect = {
            id: Date.now(),
            effectClass: effectData.effectClass,
            config: effectData.config,
            percentChance: effectData.percentChance || 100
        };

        if (effectType === 'primary') {
            // Primary effects get attached effects structure
            newEffect.attachedEffects = {
                secondary: [],
                keyFrame: []
            };

            setEffects(prev => ({
                ...prev,
                primary: [...prev.primary, newEffect]
            }));

            // Set this as current primary effect and move to attach effects step
            setCurrentPrimaryEffect(newEffect);
            setSelectedEffect(null);
            setEffectConfig({});
            setStep(4); // Skip to attach effects step
        } else if (effectType === 'final') {
            setEffects(prev => ({
                ...prev,
                final: [...prev.final, newEffect]
            }));

            // Reset for next effect
            setSelectedEffect(null);
            setEffectConfig({});
            setStep(2);
        } else if (currentPrimaryEffect && (effectType === 'secondary' || effectType === 'keyFrame')) {
            // Attach to current primary effect
            const updatedEffects = effects.primary.map(effect => {
                if (effect.id === currentPrimaryEffect.id) {
                    return {
                        ...effect,
                        attachedEffects: {
                            ...effect.attachedEffects,
                            [effectType]: [...effect.attachedEffects[effectType], newEffect]
                        }
                    };
                }
                return effect;
            });

            setEffects(prev => ({
                ...prev,
                primary: updatedEffects
            }));

            // Update current primary effect reference
            const updatedCurrentPrimary = updatedEffects.find(e => e.id === currentPrimaryEffect.id);
            setCurrentPrimaryEffect(updatedCurrentPrimary);

            // Reset for next attachment
            setSelectedEffect(null);
            setEffectConfig({});
            setStep(4); // Stay on attach effects step
        }
    };

    const handleRemoveEffect = (type, effectId) => {
        setEffects(prev => ({
            ...prev,
            [type]: prev[type].filter(e => e.id !== effectId)
        }));
    };

    const handleAttachEffect = (effect, attachmentType) => {
        setEffectType(attachmentType);
        setSelectedEffect(effect);
        setEffectConfig({});
        setStep(3); // Go to configuration step
    };

    const handleSkipAttachment = () => {
        setCurrentPrimaryEffect(null);
        setStep(2); // Go back to effect selection
    };

    const handleRemoveAttachedEffect = (attachmentType, effectId) => {
        if (!currentPrimaryEffect) return;

        const updatedEffects = effects.primary.map(effect => {
            if (effect.id === currentPrimaryEffect.id) {
                return {
                    ...effect,
                    attachedEffects: {
                        ...effect.attachedEffects,
                        [attachmentType]: effect.attachedEffects[attachmentType].filter(e => e.id !== effectId)
                    }
                };
            }
            return effect;
        });

        setEffects(prev => ({
            ...prev,
            primary: updatedEffects
        }));

        // Update current primary effect reference
        const updatedCurrentPrimary = updatedEffects.find(e => e.id === currentPrimaryEffect.id);
        setCurrentPrimaryEffect(updatedCurrentPrimary);
    };

    // Transform nested effect structure back to flat structure for backend compatibility
    const transformEffectsForBackend = (nestedEffects) => {
        const flatEffects = {
            primary: [],
            secondary: [],
            keyFrame: [],
            final: (nestedEffects.final || []).map(effect => ({
                ...effect,
                percentChance: effect.percentChance || 100
            }))
        };

        // Process primary effects and extract attached effects
        if (nestedEffects.primary) {
            nestedEffects.primary.forEach(primaryEffect => {
                // Add the primary effect itself
                flatEffects.primary.push({
                    id: primaryEffect.id,
                    effectClass: primaryEffect.effectClass,
                    config: primaryEffect.config,
                    percentChance: primaryEffect.percentChance || 100
                });

                // Extract attached secondary effects
                if (primaryEffect.attachedEffects?.secondary) {
                    flatEffects.secondary.push(...primaryEffect.attachedEffects.secondary.map(effect => ({
                        ...effect,
                        percentChance: effect.percentChance || 100
                    })));
                }

                // Extract attached keyframe effects
                if (primaryEffect.attachedEffects?.keyFrame) {
                    flatEffects.keyFrame.push(...primaryEffect.attachedEffects.keyFrame.map(effect => ({
                        ...effect,
                        percentChance: effect.percentChance || 100
                    })));
                }
            });
        }

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
                                projectData={projectData}
                                size="medium"
                                showControls={true}
                            />
                        </div>
                    </div>
                );

            case 4:
                return currentPrimaryEffect ? (
                    <EffectAttacher
                        primaryEffect={currentPrimaryEffect}
                        availableEffects={availableEffects}
                        onAttachEffect={handleAttachEffect}
                        onSkip={handleSkipAttachment}
                        onRemoveAttachedEffect={handleRemoveAttachedEffect}
                    />
                ) : (
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
            case 4: return currentPrimaryEffect ? '4. Attach Effects' : '4. Review';
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
                                case 4: return step === 4 && currentPrimaryEffect ? '4. Attach Effects' : '4. Review';
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