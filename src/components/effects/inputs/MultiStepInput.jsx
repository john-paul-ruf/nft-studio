import React, { useState } from 'react';
import RangeInput from './RangeInput.jsx';
import useDebounce from '../../../hooks/useDebounce.js';

function MultiStepInput({ field, value, onChange, projectData }) {
    const [steps, setSteps] = useState(value || field.default || []);
    // Local state for percentage inputs to provide immediate feedback
    const [percentageInputs, setPercentageInputs] = useState({});

    // Available algorithm types for step types
    const algorithmTypes = [
        'journeySin', 'journeySinSquared', 'journeyExpEnvelope', 'journeySteepBell',
        'journeyFlatTop', 'invertedBell', 'doublePeak', 'exponentialDecay',
        'elasticBounce', 'breathing', 'pulseWave', 'ripple', 'heartbeat',
        'waveCrash', 'volcanic', 'spiralOut', 'spiralIn', 'mountainRange',
        'oceanTide', 'butterfly'
    ];

    // Debounced update for percentage changes
    const debouncedUpdateStep = useDebounce((index, property, newValue) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [property]: newValue };

        // Auto-adjust percentages if needed
        if (property === 'minPercentage' || property === 'maxPercentage') {
            newSteps[index] = validatePercentages(newSteps[index]);
        }

        setSteps(newSteps);
        onChange(field.name, newSteps);
    }, 150);

    const updateStep = (index, property, newValue) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [property]: newValue };

        // Auto-adjust percentages if needed
        if (property === 'minPercentage' || property === 'maxPercentage') {
            newSteps[index] = validatePercentages(newSteps[index]);
        }

        setSteps(newSteps);
        onChange(field.name, newSteps);
    };

    const validatePercentages = (step) => {
        // No validation - accept whatever values the user wants
        return step;
    };

    const addStep = () => {
        const lastStep = steps[steps.length - 1];
        const newMinPercentage = lastStep ? lastStep.maxPercentage : 0;
        const newMaxPercentage = newMinPercentage + 25;

        const newStep = {
            minPercentage: newMinPercentage,
            maxPercentage: newMaxPercentage,
            max: { lower: 5, upper: 15 },
            times: { lower: 1, upper: 3 },
            type: 'ripple'
        };

        const newSteps = [...steps, newStep];
        setSteps(newSteps);
        onChange(field.name, newSteps);
    };

    const removeStep = (index) => {
        if (steps.length <= 1) return; // Keep at least one step

        const newSteps = steps.filter((_, i) => i !== index);
        setSteps(newSteps);
        onChange(field.name, newSteps);
    };

    const calculateTotalPercentage = () => {
        return steps.reduce((total, step) => total + (step.maxPercentage - step.minPercentage), 0);
    };

    const normalizePercentages = () => {
        if (steps.length === 0) return;

        let currentPercentage = 0;
        const newSteps = steps.map((step, index) => {
            const duration = step.maxPercentage - step.minPercentage;
            const newMin = currentPercentage;
            const newMax = index === steps.length - 1 ? 100 : currentPercentage + duration;
            currentPercentage = newMax;

            return { ...step, minPercentage: newMin, maxPercentage: newMax };
        });

        setSteps(newSteps);
        onChange(field.name, newSteps);
    };

    const totalPercentage = calculateTotalPercentage();
    const isNormalized = Math.abs(totalPercentage - 100) < 0.01;

    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <label style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 'bold' }}>
                    {field.label}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={addStep}
                        style={{
                            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.25rem 0.5rem',
                            color: 'white',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        + Add Step
                    </button>
                    {!isNormalized && (
                        <button
                            onClick={normalizePercentages}
                            style={{
                                background: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem 0.5rem',
                                color: 'white',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            Normalize to 100%
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline Progress Bar */}
            <div style={{
                marginBottom: '1rem',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                border: `2px solid ${isNormalized ? '#28a745' : '#ffc107'}`
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                }}>
                    <span style={{ color: '#cccccc', fontSize: '0.9rem' }}>Timeline Coverage:</span>
                    <span style={{
                        color: isNormalized ? '#28a745' : '#ffc107',
                        fontWeight: 'bold'
                    }}>
                        {totalPercentage.toFixed(1)}%
                    </span>
                </div>
                <div style={{
                    height: '20px',
                    background: '#333',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    display: 'flex'
                }}>
                    {steps.map((step, index) => {
                        const stepDuration = step.maxPercentage - step.minPercentage;
                        const hue = (index * 137.5) % 360; // Golden angle for color distribution

                        return (
                            <div
                                key={index}
                                style={{
                                    width: `${stepDuration}%`,
                                    background: `hsl(${hue}, 70%, 50%)`,
                                    height: '100%',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    color: 'white',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                                }}
                                title={`Step ${index + 1}: ${step.minPercentage}% - ${step.maxPercentage}%`}
                            >
                                {stepDuration > 10 ? `${stepDuration.toFixed(0)}%` : ''}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Steps Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {steps.map((step, index) => {
                    const stepDuration = step.maxPercentage - step.minPercentage;
                    const hue = (index * 137.5) % 360;

                    return (
                        <div
                            key={index}
                            style={{
                                padding: '1rem',
                                border: `2px solid hsl(${hue}, 50%, 30%)`,
                                borderRadius: '8px',
                                background: `hsla(${hue}, 50%, 5%, 0.3)`
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem'
                            }}>
                                <h4 style={{
                                    color: `hsl(${hue}, 70%, 70%)`,
                                    margin: 0,
                                    fontSize: '1rem'
                                }}>
                                    Step {index + 1} ({stepDuration.toFixed(1)}% of timeline)
                                </h4>
                                {steps.length > 1 && (
                                    <button
                                        onClick={() => removeStep(index)}
                                        style={{
                                            background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.25rem 0.5rem',
                                            color: 'white',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            {/* Timeline Range */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '1rem',
                                marginBottom: '1rem'
                            }}>
                                <div>
                                    <label style={{ color: '#cccccc', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                                        Start %
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={percentageInputs[`${index}-min`] !== undefined 
                                            ? percentageInputs[`${index}-min`] 
                                            : step.minPercentage}
                                        onChange={(e) => {
                                            const inputValue = e.target.value;
                                            // Update local state immediately for instant feedback
                                            setPercentageInputs(prev => ({ ...prev, [`${index}-min`]: inputValue }));
                                            
                                            // Only trigger debounced change if it's a valid number
                                            const numValue = parseFloat(inputValue);
                                            if (inputValue !== '' && !isNaN(numValue)) {
                                                debouncedUpdateStep(index, 'minPercentage', numValue);
                                            }
                                        }}
                                        onBlur={() => {
                                            // On blur, restore current valid value if input is invalid
                                            const inputValue = percentageInputs[`${index}-min`];
                                            const numValue = parseFloat(inputValue);
                                            if (inputValue === '' || inputValue === undefined || isNaN(numValue)) {
                                                setPercentageInputs(prev => {
                                                    const newInputs = { ...prev };
                                                    delete newInputs[`${index}-min`];
                                                    return newInputs;
                                                });
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid #333',
                                            borderRadius: '4px',
                                            padding: '0.5rem',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: '#cccccc', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                                        End %
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={percentageInputs[`${index}-max`] !== undefined 
                                            ? percentageInputs[`${index}-max`] 
                                            : step.maxPercentage}
                                        onChange={(e) => {
                                            const inputValue = e.target.value;
                                            // Update local state immediately for instant feedback
                                            setPercentageInputs(prev => ({ ...prev, [`${index}-max`]: inputValue }));
                                            
                                            // Only trigger debounced change if it's a valid number
                                            const numValue = parseFloat(inputValue);
                                            if (inputValue !== '' && !isNaN(numValue)) {
                                                debouncedUpdateStep(index, 'maxPercentage', numValue);
                                            }
                                        }}
                                        onBlur={() => {
                                            // On blur, restore current valid value if input is invalid
                                            const inputValue = percentageInputs[`${index}-max`];
                                            const numValue = parseFloat(inputValue);
                                            if (inputValue === '' || inputValue === undefined || isNaN(numValue)) {
                                                setPercentageInputs(prev => {
                                                    const newInputs = { ...prev };
                                                    delete newInputs[`${index}-max`];
                                                    return newInputs;
                                                });
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid #333',
                                            borderRadius: '4px',
                                            padding: '0.5rem',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Algorithm Type */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ color: '#cccccc', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                                    Algorithm Type
                                </label>
                                <select
                                    value={step.type}
                                    onChange={(e) => updateStep(index, 'type', e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        color: '#ffffff'
                                    }}
                                >
                                    {algorithmTypes.map(type => (
                                        <option key={type} value={type} style={{ background: '#333', color: '#fff' }}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Max Range */}
                            <div style={{ marginBottom: '1rem' }}>
                                <RangeInput
                                    field={{
                                        name: `step-${index}-max`,
                                        label: 'Max Range',
                                        type: 'range'
                                    }}
                                    value={step.max}
                                    onChange={(_, newValue) => updateStep(index, 'max', newValue)}
                                    projectData={projectData}
                                />
                            </div>

                            {/* Times Range */}
                            <div>
                                <RangeInput
                                    field={{
                                        name: `step-${index}-times`,
                                        label: 'Times Range',
                                        type: 'range'
                                    }}
                                    value={step.times}
                                    onChange={(_, newValue) => updateStep(index, 'times', newValue)}
                                    projectData={projectData}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MultiStepInput;