import React, { useState, useEffect } from 'react';
import EffectConfigurer from './EffectConfigurer.jsx';

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

    if (!isOpen) return null;

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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#1a1a1a',
                border: `2px solid ${info.color}`,
                borderRadius: '12px',
                width: step === 2 ? '90vw' : '600px',
                maxWidth: step === 2 ? '1200px' : '600px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    background: `linear-gradient(135deg, ${info.color}20 0%, ${info.color}10 100%)`,
                    padding: '1.5rem',
                    borderBottom: `1px solid ${info.color}40`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{
                            margin: 0,
                            color: info.color,
                            fontSize: '1.25rem'
                        }}>
                            {info.title}
                        </h3>
                        <p style={{
                            margin: '0.5rem 0 0 0',
                            color: '#aaa',
                            fontSize: '0.9rem'
                        }}>
                            {info.description}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#999',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '4px'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.target.style.background = 'none'}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '1.5rem'
                }}>
                    {step === 1 ? (
                        // Effect Selection
                        <div>
                            {effects.length > 0 ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                    gap: '1rem'
                                }}>
                                    {effects.map(effect => (
                                        <div
                                            key={effect.name || effect.displayName}
                                            className="welcome-card"
                                            onClick={() => handleEffectSelect(effect)}
                                            style={{
                                                cursor: 'pointer',
                                                padding: '1rem',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = `${info.color}20`;
                                                e.currentTarget.style.borderColor = `${info.color}60`;
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                            }}
                                        >
                                            <h4 style={{
                                                margin: '0 0 0.5rem 0',
                                                color: '#fff',
                                                fontSize: '1rem'
                                            }}>
                                                {effect.displayName || effect.name}
                                            </h4>
                                            {effect.description && (
                                                <p style={{
                                                    margin: 0,
                                                    color: '#aaa',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {effect.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '3rem',
                                    color: '#888'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                                    <h4 style={{ color: '#aaa', margin: '0 0 0.5rem 0' }}>
                                        No {attachmentType} effects available
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                        There are no {attachmentType} effects to attach at this time.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Effect Configuration
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '1rem',
                            maxHeight: '60vh',
                            overflow: 'auto'
                        }}>
                            <EffectConfigurer
                                selectedEffect={selectedEffect}
                                projectState={projectState}
                                onConfigChange={() => {}} // Not needed in modal
                                onAddEffect={handleConfigComplete}
                                isModal={true}
                                initialConfig={isEditing ? editingEffect?.config : undefined}
                                initialPercentChance={isEditing ? editingEffect?.percentChance : undefined}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <button
                        onClick={handleBack}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            padding: '0.75rem 1.5rem',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        {step === 1 ? 'Cancel' : 'Back to Selection'}
                    </button>

                    {step === 1 && effects.length === 0 && (
                        <button
                            onClick={handleClose}
                            style={{
                                background: `linear-gradient(135deg, ${info.color} 0%, ${info.color}cc 100%)`,
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.75rem 1.5rem',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EffectAttachmentModal;