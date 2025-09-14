import React from 'react';

/**
 * Input component for FindValueAlgorithm arrays
 * These are typically used for selecting which animation algorithms to use
 */
function FindValueAlgorithmInput({ field, value, onChange }) {
    // Common algorithm options (these would ideally be loaded dynamically)
    const algorithmOptions = [
        'linearFind',
        'easeInFind',
        'easeOutFind',
        'easeInOutFind',
        'bounceFind',
        'elasticFind'
    ];

    const currentSelection = Array.isArray(value) ? value : [];

    const handleToggleAlgorithm = (algorithm) => {
        const newSelection = currentSelection.includes(algorithm)
            ? currentSelection.filter(a => a !== algorithm)
            : [...currentSelection, algorithm];

        onChange(field.name, newSelection);
    };

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
                padding: '1rem'
            }}>
                <div style={{
                    fontSize: '0.8rem',
                    color: '#cccccc',
                    marginBottom: '0.75rem'
                }}>
                    Select animation algorithms to use:
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '0.5rem'
                }}>
                    {algorithmOptions.map(algorithm => (
                        <label
                            key={algorithm}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                background: currentSelection.includes(algorithm)
                                    ? 'rgba(102, 126, 234, 0.2)'
                                    : 'rgba(255,255,255,0.05)',
                                border: currentSelection.includes(algorithm)
                                    ? '1px solid #667eea'
                                    : '1px solid rgba(255,255,255,0.1)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={currentSelection.includes(algorithm)}
                                onChange={() => handleToggleAlgorithm(algorithm)}
                                style={{
                                    accentColor: '#667eea'
                                }}
                            />
                            <span style={{
                                color: '#ffffff',
                                fontSize: '0.85rem',
                                fontFamily: 'monospace'
                            }}>
                                {algorithm}
                            </span>
                        </label>
                    ))}
                </div>
                {currentSelection.length === 0 && (
                    <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        background: 'rgba(255,69,0,0.1)',
                        border: '1px solid rgba(255,69,0,0.3)',
                        borderRadius: '4px',
                        color: '#ff6347',
                        fontSize: '0.8rem'
                    }}>
                        ⚠️ At least one algorithm should be selected
                    </div>
                )}
                <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#999'
                }}>
                    Selected: {currentSelection.length} algorithm{currentSelection.length !== 1 ? 's' : ''}
                </div>
            </div>
        </div>
    );
}

export default FindValueAlgorithmInput;