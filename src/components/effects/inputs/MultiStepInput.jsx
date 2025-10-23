import React, { useState } from 'react';
import RangeInput from './RangeInput.jsx';
import useDebounce from '../../../hooks/useDebounce.js';
import './MultiStepInput.bem.css';

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
        <div className="multi-step-input">
            <div className="multi-step-input__header">
                <label className="multi-step-input__label">
                    {field.label}
                </label>
                <div className="multi-step-input__button-group">
                    <button
                        onClick={addStep}
                        className="multi-step-input__button multi-step-input__button--add"
                    >
                        + Add Step
                    </button>
                    {!isNormalized && (
                        <button
                            onClick={normalizePercentages}
                            className="multi-step-input__button multi-step-input__button--normalize"
                        >
                            Normalize to 100%
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline Progress Bar */}
            <div className={`multi-step-input__timeline ${isNormalized ? 'multi-step-input__timeline--normalized' : 'multi-step-input__timeline--incomplete'}`}>
                <div className="multi-step-input__timeline-header">
                    <span className="multi-step-input__timeline-label">Timeline Coverage:</span>
                    <span className={`multi-step-input__timeline-percentage ${isNormalized ? 'multi-step-input__timeline-percentage--normalized' : 'multi-step-input__timeline-percentage--incomplete'}`}>
                        {totalPercentage.toFixed(1)}%
                    </span>
                </div>
                <div className="multi-step-input__progress-bar">
                    {steps.map((step, index) => {
                        const stepDuration = step.maxPercentage - step.minPercentage;
                        const hue = (index * 137.5) % 360; // Golden angle for color distribution

                        return (
                            <div
                                key={index}
                                className="multi-step-input__step-segment"
                                style={{
                                    width: `${stepDuration}%`,
                                    background: `hsl(${hue}, 70%, 50%)`
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
            <div className="multi-step-input__steps-container">
                {steps.map((step, index) => {
                    const stepDuration = step.maxPercentage - step.minPercentage;
                    const hue = (index * 137.5) % 360;

                    return (
                        <div
                            key={index}
                            className="multi-step-input__step-card"
                            style={{
                                borderColor: `hsl(${hue}, 50%, 30%)`,
                                backgroundColor: `hsla(${hue}, 50%, 5%, 0.3)`
                            }}
                        >
                            <div className="multi-step-input__step-header">
                                <h4 
                                    className="multi-step-input__step-title"
                                    style={{ color: `hsl(${hue}, 70%, 70%)` }}
                                >
                                    Step {index + 1} ({stepDuration.toFixed(1)}% of timeline)
                                </h4>
                                {steps.length > 1 && (
                                    <button
                                        onClick={() => removeStep(index)}
                                        className="multi-step-input__button multi-step-input__button--remove"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            {/* Timeline Range */}
                            <div className="multi-step-input__timeline-range">
                                <div className="multi-step-input__range-section">
                                    <label className="multi-step-input__range-label">
                                        Start %
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="multi-step-input__range-input"
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
                                    />
                                </div>
                                <div className="multi-step-input__range-section">
                                    <label className="multi-step-input__range-label">
                                        End %
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="multi-step-input__range-input"
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
                                    />
                                </div>
                            </div>

                            {/* Algorithm Type */}
                            <div className="multi-step-input__algorithm-section">
                                <label className="multi-step-input__algorithm-label">
                                    Algorithm Type
                                </label>
                                <select
                                    value={step.type}
                                    onChange={(e) => updateStep(index, 'type', e.target.value)}
                                    className="multi-step-input__algorithm-select"
                                >
                                    {algorithmTypes.map(type => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Max Range */}
                            <div className="multi-step-input__max-range-section">
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
                            <div className="multi-step-input__times-range-section">
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