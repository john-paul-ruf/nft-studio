import React, { useState, useEffect } from 'react';
import './FindValueAlgorithmInput.bem.css';

/**
 * Input component for FindValueAlgorithm arrays
 * Dynamically loads algorithms from the engine and provides categorized selection
 */
function FindValueAlgorithmInput({ field, value, onChange }) {
    const [algorithmOptions, setAlgorithmOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const currentSelection = Array.isArray(value) ? value : [];

    // Load algorithms from the engine
    useEffect(() => {
        const loadAlgorithms = async () => {
            try {
                setLoading(true);
                const result = await window.api.getFindValueAlgorithms();
                if (result.success) {
                    setAlgorithmOptions(result.algorithms);
                    setError(null);
                } else {
                    setError(result.error);
                    // Fallback to basic algorithms
                    setAlgorithmOptions(['journeySin', 'heartbeat', 'breathing', 'elasticBounce']);
                }
            } catch (err) {
                console.error('Failed to load algorithms:', err);
                setError(err.message);
                // Fallback to basic algorithms
                setAlgorithmOptions(['journeySin', 'heartbeat', 'breathing', 'elasticBounce']);
            } finally {
                setLoading(false);
            }
        };

        loadAlgorithms();
    }, []);

    // Categorize algorithms for better organization
    const categorizeAlgorithms = (algorithms) => {
        const categories = {
            'Journey': algorithms.filter(algo => algo.startsWith('journey')),
            'Nature': algorithms.filter(algo => ['heartbeat', 'breathing', 'volcanic', 'oceanTide', 'mountainRange'].includes(algo)),
            'Physics': algorithms.filter(algo => ['elasticBounce', 'ripple', 'waveCrash', 'spiralOut', 'spiralIn'].includes(algo)),
            'Dynamics': algorithms.filter(algo => ['invertedBell', 'doublePeak', 'exponentialDecay', 'pulseWave', 'butterfly'].includes(algo)),
            'Other': algorithms.filter(algo =>
                !algo.startsWith('journey') &&
                !['heartbeat', 'breathing', 'volcanic', 'oceanTide', 'mountainRange', 'elasticBounce', 'ripple', 'waveCrash', 'spiralOut', 'spiralIn', 'invertedBell', 'doublePeak', 'exponentialDecay', 'pulseWave', 'butterfly'].includes(algo)
            )
        };

        // Filter out empty categories
        return Object.fromEntries(Object.entries(categories).filter(([_, algos]) => algos.length > 0));
    };

    const categories = categorizeAlgorithms(algorithmOptions);

    // Get algorithm descriptions
    const getAlgorithmDescription = (algorithm) => {
        const descriptions = {
            'journeySin': 'Smooth sine wave motion',
            'journeySinSquared': 'Emphasized sine wave with squared intensity',
            'journeyExpEnvelope': 'Exponential envelope with smooth curves',
            'journeySteepBell': 'Sharp bell curve with steep transitions',
            'journeyFlatTop': 'Bell curve with extended flat peak',
            'heartbeat': 'Rhythmic double-beat pattern like a heartbeat',
            'breathing': 'Gentle in-and-out breathing motion',
            'volcanic': 'Explosive eruption with gradual buildup',
            'oceanTide': 'Flowing tidal wave motion',
            'mountainRange': 'Irregular peaks like mountain silhouettes',
            'elasticBounce': 'Spring-like bouncing motion',
            'ripple': 'Expanding ripple effect from center',
            'waveCrash': 'Sudden impact with gradual decay',
            'spiralOut': 'Expanding spiral motion outward',
            'spiralIn': 'Contracting spiral motion inward',
            'invertedBell': 'Inverted bell curve (valley shape)',
            'doublePeak': 'Two distinct peaks in sequence',
            'exponentialDecay': 'Rapid start with exponential slowdown',
            'pulseWave': 'Sharp on/off pulsing pattern',
            'butterfly': 'Symmetrical butterfly wing motion'
        };
        return descriptions[algorithm] || 'Animation algorithm';
    };

    const unselectedOptions = algorithmOptions.filter(option => !currentSelection.includes(option));

    // Handle removing a selected algorithm
    const handleRemove = (algorithm) => {
        const newSelection = currentSelection.filter(a => a !== algorithm);
        onChange(field.name, newSelection);
    };

    // Handle adding an available algorithm
    const handleAdd = (algorithm) => {
        if (!currentSelection.includes(algorithm)) {
            const newSelection = [...currentSelection, algorithm];
            onChange(field.name, newSelection);
        }
    };

    if (loading) {
        return (
            <div className="find-value-algorithm-input">
                <label className="find-value-algorithm-input__label">
                    {field.label}
                </label>
                <div className="find-value-algorithm-input__loading">
                    Loading algorithms...
                </div>
            </div>
        );
    }

    return (
        <div className="find-value-algorithm-input">
            <label className="find-value-algorithm-input__label">
                {field.label}
            </label>

            {error && (
                <div className="find-value-algorithm-input__error-message">
                    ⚠️ Could not load algorithms from engine: {error}. Using fallback algorithms.
                </div>
            )}

            {/* Selected Algorithms Display */}
            {currentSelection.length > 0 && (
                <div className="find-value-algorithm-input__selected-container">
                    <div className="find-value-algorithm-input__section-label">
                        Selected Algorithms:
                    </div>
                    <div className="find-value-algorithm-input__selected-wrapper">
                        {currentSelection.map((algorithm) => (
                            <div
                                key={algorithm}
                                className="find-value-algorithm-input__tag"
                            >
                                <span className="find-value-algorithm-input__tag-name">{algorithm}</span>
                                <button
                                    className="find-value-algorithm-input__tag-remove"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRemove(algorithm);
                                    }}
                                    title={`Remove ${algorithm}`}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Available Algorithms by Category */}
            {Object.keys(categories).length > 0 && (
                <div className="find-value-algorithm-input__available-container">
                    <div className="find-value-algorithm-input__section-label">
                        Available Algorithms:
                    </div>

                    {Object.entries(categories).map(([category, categoryAlgorithms]) => {
                        const availableInCategory = categoryAlgorithms.filter(algo => unselectedOptions.includes(algo));

                        if (availableInCategory.length === 0) return null;

                        return (
                            <div key={category} className="find-value-algorithm-input__category-section">
                                <div className="find-value-algorithm-input__category-title">
                                    {category}
                                </div>
                                <div className="find-value-algorithm-input__category-grid">
                                    {availableInCategory.map(algorithm => (
                                        <button
                                            key={algorithm}
                                            className="find-value-algorithm-input__option-button"
                                            onClick={() => handleAdd(algorithm)}
                                        >
                                            <span className="find-value-algorithm-input__option-name">
                                                {algorithm}
                                            </span>
                                            <span className="find-value-algorithm-input__option-description">
                                                {getAlgorithmDescription(algorithm)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Status and Warnings */}
            <div className="find-value-algorithm-input__status-wrapper">
                {currentSelection.length === 0 && (
                    <div className="find-value-algorithm-input__warning-message">
                        ⚠️ At least one algorithm should be selected
                    </div>
                )}
                <div className="find-value-algorithm-input__status-text">
                    Selected: {currentSelection.length} algorithm{currentSelection.length !== 1 ? 's' : ''} • {unselectedOptions.length} available to add
                </div>
            </div>
        </div>
    );
}

export default FindValueAlgorithmInput;