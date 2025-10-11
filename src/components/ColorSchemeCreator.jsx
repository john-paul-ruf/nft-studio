import React, { useState } from 'react';
import useDebounce from '../hooks/useDebounce.js';

function ColorSchemeCreator({ onClose, onSave, editingScheme = null, initialColors = null }) {
    const [schemeName, setSchemeName] = useState(
        editingScheme?.name || `Custom Scheme ${Date.now()}`
    );
    const [schemeDescription, setSchemeDescription] = useState(
        editingScheme?.description || 'User-created color scheme'
    );
    const [customColors, setCustomColors] = useState(
        editingScheme ? {
            neutrals: editingScheme.neutrals || ['#FFFFFF'],
            backgrounds: editingScheme.backgrounds || ['#000000'],
            lights: editingScheme.lights || ['#FFFF00', '#FF00FF', '#00FFFF', '#FF0000', '#00FF00', '#0000FF']
        } : (initialColors || {
            neutrals: ['#FFFFFF'],
            backgrounds: ['#000000'],
            lights: ['#FFFF00', '#FF00FF', '#00FFFF', '#FF0000', '#00FF00', '#0000FF']
        })
    );

    const [newColor, setNewColor] = useState('#FF0000');
    const [selectedBucket, setSelectedBucket] = useState('lights');

    // Debounced handlers for text inputs (300ms delay)
    const debouncedSetSchemeName = useDebounce(setSchemeName, 300);
    const debouncedSetSchemeDescription = useDebounce(setSchemeDescription, 300);
    const debouncedSetNewColor = useDebounce(setNewColor, 300);

    const colorBuckets = [
        { key: 'neutrals', name: 'Neutral Colors', description: 'Whites, grays, blacks for subtle elements' },
        { key: 'backgrounds', name: 'Background Colors', description: 'Base colors for canvas backgrounds' },
        { key: 'lights', name: 'Light Colors', description: 'Bright, vibrant colors for main effects' }
    ];

    const presetPalettes = [
        {
            name: 'Neon Cyberpunk',
            colors: {
                neutrals: ['#FFFFFF', '#CCCCCC', '#808080'],
                backgrounds: ['#000000', '#0a0a0a', '#1a1a1a'],
                lights: ['#00FFFF', '#FF00FF', '#FFFF00', '#FF0080', '#8000FF', '#00FF80']
            }
        },
        {
            name: 'Warm Sunset',
            colors: {
                neutrals: ['#FFF8E1', '#F5F5DC', '#D3D3D3'],
                backgrounds: ['#2C1810', '#3D2817', '#4A3728'],
                lights: ['#FF6B35', '#F7931E', '#FFD23F', '#FF4081', '#E91E63', '#FF5722']
            }
        },
        {
            name: 'Ocean Deep',
            colors: {
                neutrals: ['#F0F8FF', '#E6F3FF', '#CCE7FF'],
                backgrounds: ['#001122', '#002244', '#003366'],
                lights: ['#00CED1', '#1E90FF', '#0099CC', '#20B2AA', '#4682B4', '#5F9EA0']
            }
        },
        {
            name: 'Forest Mystique',
            colors: {
                neutrals: ['#F5F5F0', '#E8E8E0', '#D0D0C0'],
                backgrounds: ['#0D1B0D', '#1A2E1A', '#2D4A2D'],
                lights: ['#32CD32', '#90EE90', '#98FB98', '#00FF7F', '#7CFC00', '#ADFF2F']
            }
        }
    ];

    const addColor = () => {
        if (newColor && !customColors[selectedBucket].includes(newColor)) {
            setCustomColors({
                ...customColors,
                [selectedBucket]: [...customColors[selectedBucket], newColor]
            });
        }
    };

    const removeColor = (bucket, colorIndex) => {
        if (customColors[bucket].length > 1) { // Keep at least one color
            setCustomColors({
                ...customColors,
                [bucket]: customColors[bucket].filter((_, index) => index !== colorIndex)
            });
        }
    };

    const loadPreset = (preset) => {
        setCustomColors(preset.colors);
    };

    const handleSave = () => {
        onSave({
            name: schemeName,
            description: schemeDescription,
            ...customColors
        });
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: '#1a1a1a',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '700px',
                maxHeight: '80vh',
                overflow: 'auto',
                border: '1px solid #333'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>
                        {editingScheme ? 'Edit Color Scheme' : 'Custom Color Scheme'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            fontSize: '1.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Scheme Info */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>
                            Scheme Name
                        </label>
                        <input
                            type="text"
                            value={schemeName}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSchemeName(value);
                                debouncedSetSchemeName(value);
                            }}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '0.75rem',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                            placeholder="Enter scheme name"
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>
                            Description
                        </label>
                        <input
                            type="text"
                            value={schemeDescription}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSchemeDescription(value);
                                debouncedSetSchemeDescription(value);
                            }}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '0.75rem',
                                color: 'white',
                                fontSize: '0.9rem'
                            }}
                            placeholder="Describe your color scheme"
                        />
                    </div>
                </div>

                {/* Preset Palettes */}
                <div style={{ marginBottom: '2rem' }}>
                    <h3>Quick Start Palettes</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                        {presetPalettes.map(preset => (
                            <button
                                key={preset.name}
                                onClick={() => loadPreset(preset)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid #333',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    color: 'white',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{preset.name}</div>
                                <div style={{ display: 'flex', gap: '2px', marginTop: '0.25rem', justifyContent: 'center' }}>
                                    {preset.colors.lights.slice(0, 4).map((color, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                width: '12px',
                                                height: '12px',
                                                background: color,
                                                borderRadius: '2px'
                                            }}
                                        />
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Buckets */}
                <div style={{ marginBottom: '2rem' }}>
                    <h3>Color Buckets</h3>
                    {colorBuckets.map(bucket => (
                        <div key={bucket.key} style={{
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            border: '1px solid #333'
                        }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: '0 0 0.25rem 0' }}>{bucket.name}</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>{bucket.description}</p>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                {customColors[bucket.key].map((color, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            background: 'rgba(255,255,255,0.1)',
                                            borderRadius: '20px',
                                            padding: '0.25rem'
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                background: color,
                                                borderRadius: '50%',
                                                marginRight: '0.5rem',
                                                border: '2px solid #333'
                                            }}
                                        />
                                        <span style={{ fontSize: '0.7rem', marginRight: '0.5rem' }}>{color}</span>
                                        <button
                                            onClick={() => removeColor(bucket.key, index)}
                                            disabled={customColors[bucket.key].length <= 1}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: customColors[bucket.key].length <= 1 ? '#555' : '#e53e3e',
                                                cursor: customColors[bucket.key].length <= 1 ? 'not-allowed' : 'pointer',
                                                fontSize: '1rem'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add New Color */}
                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <h4>Add New Color</h4>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select
                            value={selectedBucket}
                            onChange={(e) => setSelectedBucket(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                color: 'white'
                            }}
                        >
                            {colorBuckets.map(bucket => (
                                <option key={bucket.key} value={bucket.key}>{bucket.name}</option>
                            ))}
                        </select>

                        <input
                            type="color"
                            value={newColor}
                            onChange={(e) => setNewColor(e.target.value)}
                            style={{ width: '50px', height: '40px', border: 'none', borderRadius: '4px' }}
                        />

                        <input
                            type="text"
                            value={newColor}
                            onChange={(e) => {
                                const value = e.target.value;
                                setNewColor(value);
                                debouncedSetNewColor(value);
                            }}
                            placeholder="#FF0000"
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                color: 'white',
                                fontFamily: 'monospace'
                            }}
                        />

                        <button
                            onClick={addColor}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.5rem 1rem',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid #333',
                            borderRadius: '6px',
                            padding: '0.75rem 1.5rem',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem 1.5rem',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {editingScheme ? 'Save Changes' : 'Save Color Scheme'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ColorSchemeCreator;