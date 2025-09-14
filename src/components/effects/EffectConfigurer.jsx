import React, { useState, useEffect } from 'react';
import ConfigInputFactory from './inputs/ConfigInputFactory';
import { ConfigIntrospector } from '../../utils/configIntrospector';

function EffectConfigurer({ selectedEffect, projectData, onConfigChange, onAddEffect }) {
    const [configSchema, setConfigSchema] = useState(null);
    const [effectConfig, setEffectConfig] = useState({});

    useEffect(() => {
        if (selectedEffect) {
            loadConfigSchema(selectedEffect);
            setEffectConfig({});
        }
    }, [selectedEffect]);

    const loadConfigSchema = async (effect) => {
        try {
            console.log('Loading config schema for effect:', effect);
            const schema = await ConfigIntrospector.analyzeConfigClass(effect);
            console.log('Generated schema:', schema);
            setConfigSchema(schema);

            // Use the default instance directly - it has all the correct defaults
            if (schema.defaultInstance) {
                console.log('Using config defaults from constructor:', schema.defaultInstance);
                setEffectConfig(schema.defaultInstance);
                onConfigChange(schema.defaultInstance);
            } else {
                console.warn('No default instance available, using empty config');
                setEffectConfig({});
                onConfigChange({});
            }
        } catch (error) {
            console.error('Error loading config schema:', error);
            setConfigSchema({ fields: [] });
        }
    };


    const handleConfigChange = (fieldName, value) => {
        const newConfig = { ...effectConfig, [fieldName]: value };
        setEffectConfig(newConfig);
        onConfigChange(newConfig);
    };

    const handleAddEffect = () => {
        onAddEffect({
            effectClass: selectedEffect,
            config: effectConfig
        });
    };

    if (!selectedEffect) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#cccccc',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px dashed rgba(255,255,255,0.2)'
            }}>
                <h3 style={{ marginBottom: '1rem', color: '#ffffff' }}>No Effect Selected</h3>
                <p>Select an effect to configure its properties</p>
            </div>
        );
    }

    return (
        <div style={{ color: '#ffffff' }}>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Configure {selectedEffect.name}</h3>

            <div style={{ marginTop: '1.5rem' }}>
                {configSchema?.fields?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {configSchema.fields.map(field => (
                            <ConfigInputFactory
                                key={field.name}
                                field={field}
                                value={effectConfig[field.name]}
                                onChange={handleConfigChange}
                                projectData={projectData}
                            />
                        ))}
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '2rem',
                        color: '#cccccc',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        border: '1px dashed rgba(255,255,255,0.2)'
                    }}>
                        <div style={{
                            border: '4px solid rgba(255,255,255,0.1)',
                            borderTop: '4px solid #667eea',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 1rem'
                        }} />
                        Loading configuration options...
                    </div>
                )}
            </div>

            {/* Configuration Preview */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h4 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>Configuration Preview:</h4>
                <pre style={{
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    margin: 0,
                    color: '#cccccc',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.5rem',
                    borderRadius: '4px'
                }}>
                    {JSON.stringify(effectConfig, null, 2)}
                </pre>
            </div>

            {/* Add Effect Button */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                    onClick={handleAddEffect}
                    className="btn"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                    }}
                >
                    Add Effect to Project
                </button>
            </div>
        </div>
    );
}

export default EffectConfigurer;