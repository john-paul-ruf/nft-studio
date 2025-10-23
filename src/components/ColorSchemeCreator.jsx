import React, { useState } from 'react';
import useDebounce from '../hooks/useDebounce.js';
import './ColorSchemeCreator.bem.css';

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
        <div className="color-scheme-creator__overlay">
            <div className="color-scheme-creator">
                <div className="color-scheme-creator__header">
                    <h2 className="color-scheme-creator__title">
                        {editingScheme ? 'Edit Color Scheme' : 'Custom Color Scheme'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="color-scheme-creator__close-button"
                    >
                        ×
                    </button>
                </div>

                {/* Scheme Info */}
                <div className="color-scheme-creator__section">
                    <div className="color-scheme-creator__field">
                        <label className="color-scheme-creator__label">
                            Scheme Name
                        </label>
                        <input
                            type="text"
                            className="color-scheme-creator__input"
                            value={schemeName}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSchemeName(value);
                                debouncedSetSchemeName(value);
                            }}
                            placeholder="Enter scheme name"
                        />
                    </div>
                    <div className="color-scheme-creator__field">
                        <label className="color-scheme-creator__label">
                            Description
                        </label>
                        <input
                            type="text"
                            className="color-scheme-creator__input"
                            value={schemeDescription}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSchemeDescription(value);
                                debouncedSetSchemeDescription(value);
                            }}
                            placeholder="Describe your color scheme"
                        />
                    </div>
                </div>

                {/* Preset Palettes */}
                <div className="color-scheme-creator__section">
                    <h3 className="color-scheme-creator__section-title">Quick Start Palettes</h3>
                    <div className="color-scheme-creator__preset-grid">
                        {presetPalettes.map(preset => (
                            <button
                                key={preset.name}
                                onClick={() => loadPreset(preset)}
                                className="color-scheme-creator__preset-button"
                            >
                                <div className="color-scheme-creator__preset-name">{preset.name}</div>
                                <div className="color-scheme-creator__preset-swatches">
                                    {preset.colors.lights.slice(0, 4).map((color, idx) => (
                                        <div
                                            key={idx}
                                            className="color-scheme-creator__preset-swatch"
                                            style={{ '--swatch-color': color }}
                                        />
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Buckets */}
                <div className="color-scheme-creator__section">
                    <h3 className="color-scheme-creator__section-title">Color Buckets</h3>
                    {colorBuckets.map(bucket => (
                        <div key={bucket.key} className="color-scheme-creator__bucket">
                            <div className="color-scheme-creator__bucket-header">
                                <h4 className="color-scheme-creator__bucket-title">{bucket.name}</h4>
                                <p className="color-scheme-creator__bucket-description">{bucket.description}</p>
                            </div>

                            <div className="color-scheme-creator__color-list">
                                {customColors[bucket.key].map((color, index) => (
                                    <div
                                        key={index}
                                        className="color-scheme-creator__color-chip"
                                    >
                                        <div
                                            className="color-scheme-creator__color-swatch"
                                            style={{ '--swatch-color': color }}
                                        />
                                        <span className="color-scheme-creator__color-value">{color}</span>
                                        <button
                                            onClick={() => removeColor(bucket.key, index)}
                                            disabled={customColors[bucket.key].length <= 1}
                                            className="color-scheme-creator__color-remove-btn"
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
                <div className="color-scheme-creator__section color-scheme-creator__bucket">
                    <h4 className="color-scheme-creator__bucket-title">Add New Color</h4>
                    <div className="color-scheme-creator__add-color-controls">
                        <select
                            value={selectedBucket}
                            onChange={(e) => setSelectedBucket(e.target.value)}
                            className="color-scheme-creator__select"
                        >
                            {colorBuckets.map(bucket => (
                                <option key={bucket.key} value={bucket.key}>{bucket.name}</option>
                            ))}
                        </select>

                        <input
                            type="color"
                            value={newColor}
                            onChange={(e) => setNewColor(e.target.value)}
                            className="color-scheme-creator__color-picker"
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
                            className="color-scheme-creator__color-input"
                        />

                        <button
                            onClick={addColor}
                            className="color-scheme-creator__add-button"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="color-scheme-creator__actions">
                    <button
                        onClick={onClose}
                        className="color-scheme-creator__button color-scheme-creator__button--secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="color-scheme-creator__button color-scheme-creator__button--primary"
                    >
                        {editingScheme ? 'Save Changes' : 'Save Color Scheme'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ColorSchemeCreator;