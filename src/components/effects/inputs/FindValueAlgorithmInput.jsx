import React, { useState, useEffect } from 'react';

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
            <div style={{ marginBottom: '1rem' }}>
                <label style={{
                    color: '#ffffff',
                    marginBottom: '0.5rem',
                    display: 'block',
                    fontWeight: '500'
                }}>
                    {field.label}
                </label>
                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#ccc'
                }}>
                    Loading algorithms...
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{
                color: '#ffffff',
                marginBottom: '0.5rem',
                display: 'block',
                fontWeight: '500'
            }}>
                {field.label}
            </label>

            {error && (
                <div style={{
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '4px',
                    color: '#ffc107',
                    fontSize: '0.8rem'
                }}>
                    ⚠️ Could not load algorithms from engine: {error}. Using fallback algorithms.
                </div>
            )}

            {/* Selected Algorithms Display */}
            {currentSelection.length > 0 && (
                <div style={{
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{
                        fontSize: '0.8rem',
                        color: '#cccccc',
                        marginBottom: '0.5rem'
                    }}>
                        Selected Algorithms:
                    </div>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                    }}>
                        {currentSelection.map((algorithm) => (
                            <div
                                key={algorithm}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.3rem 0.6rem',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                <span>{algorithm}</span>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRemove(algorithm);
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '18px',
                                        height: '18px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        lineHeight: '1',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.3)';
                                        e.target.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.2)';
                                        e.target.style.transform = 'scale(1)';
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
                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '1rem'
                }}>
                    <div style={{
                        fontSize: '0.8rem',
                        color: '#cccccc',
                        marginBottom: '0.75rem'
                    }}>
                        Available Algorithms:
                    </div>

                    {Object.entries(categories).map(([category, categoryAlgorithms]) => {
                        const availableInCategory = categoryAlgorithms.filter(algo => unselectedOptions.includes(algo));

                        if (availableInCategory.length === 0) return null;

                        return (
                            <div key={category} style={{ marginBottom: '1rem' }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#999',
                                    fontWeight: 'bold',
                                    marginBottom: '0.5rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {category}
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '0.5rem'
                                }}>
                                    {availableInCategory.map(algorithm => (
                                        <button
                                            key={algorithm}
                                            onClick={() => handleAdd(algorithm)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                gap: '0.25rem',
                                                padding: '0.5rem',
                                                background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '4px',
                                                color: '#fff',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                transition: 'all 0.2s ease',
                                                textAlign: 'left'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = 'rgba(255,255,255,0.15)';
                                                e.target.style.borderColor = '#667eea';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = 'rgba(255,255,255,0.1)';
                                                e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                                            }}
                                        >
                                            <span style={{
                                                fontFamily: 'monospace',
                                                fontWeight: 'bold'
                                            }}>
                                                {algorithm}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                color: '#aaa',
                                                fontStyle: 'italic'
                                            }}>
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
            <div style={{ marginTop: '0.5rem' }}>
                {currentSelection.length === 0 && (
                    <div style={{
                        padding: '0.5rem',
                        background: 'rgba(255,69,0,0.1)',
                        border: '1px solid rgba(255,69,0,0.3)',
                        borderRadius: '4px',
                        color: '#ff6347',
                        fontSize: '0.8rem',
                        marginBottom: '0.5rem'
                    }}>
                        ⚠️ At least one algorithm should be selected
                    </div>
                )}
                <div style={{
                    fontSize: '0.75rem',
                    color: '#999'
                }}>
                    Selected: {currentSelection.length} algorithm{currentSelection.length !== 1 ? 's' : ''} • {unselectedOptions.length} available to add
                </div>
            </div>
        </div>
    );
}

export default FindValueAlgorithmInput;