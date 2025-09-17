import React, { useState, useEffect } from 'react';
import './EffectEditor.css';

export default function EffectEditor({ effect, onUpdate, onClose }) {
    const [config, setConfig] = useState(effect.config || {});
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSchema();
    }, [effect.className]);

    const loadSchema = async () => {
        try {
            const effectSchema = await window.api.getEffectSchema(effect.className);
            setSchema(effectSchema);
        } catch (error) {
            console.error('Failed to load effect schema:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (key, value) => {
        setConfig({ ...config, [key]: value });
    };

    const handleSave = () => {
        onUpdate({ ...effect, config });
    };

    const renderField = (field) => {
        const value = config[field.name] ?? field.defaultValue;

        switch (field.type) {
            case 'boolean':
                return (
                    <label className="field-checkbox">
                        <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleConfigChange(field.name, e.target.checked)}
                        />
                        <span>{field.label || field.name}</span>
                    </label>
                );

            case 'number':
                return (
                    <div className="field-group">
                        <label className="field-label">
                            {field.label || field.name}
                            {field.description && (
                                <span className="field-hint">{field.description}</span>
                            )}
                        </label>
                        <input
                            type="number"
                            className="field-input"
                            value={value}
                            onChange={(e) => handleConfigChange(field.name, parseFloat(e.target.value))}
                            min={field.min}
                            max={field.max}
                            step={field.step || 1}
                        />
                    </div>
                );

            case 'string':
                return (
                    <div className="field-group">
                        <label className="field-label">
                            {field.label || field.name}
                            {field.description && (
                                <span className="field-hint">{field.description}</span>
                            )}
                        </label>
                        <input
                            type="text"
                            className="field-input"
                            value={value}
                            onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        />
                    </div>
                );

            case 'select':
                return (
                    <div className="field-group">
                        <label className="field-label">
                            {field.label || field.name}
                            {field.description && (
                                <span className="field-hint">{field.description}</span>
                            )}
                        </label>
                        <select
                            className="field-select"
                            value={value}
                            onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        >
                            {field.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                );

            case 'color':
                return (
                    <div className="field-group">
                        <label className="field-label">
                            {field.label || field.name}
                            {field.description && (
                                <span className="field-hint">{field.description}</span>
                            )}
                        </label>
                        <input
                            type="color"
                            className="field-color"
                            value={value}
                            onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        />
                    </div>
                );

            case 'range':
                return (
                    <div className="field-group">
                        <label className="field-label">
                            {field.label || field.name}: {value}
                            {field.description && (
                                <span className="field-hint">{field.description}</span>
                            )}
                        </label>
                        <input
                            type="range"
                            className="field-range"
                            value={value}
                            onChange={(e) => handleConfigChange(field.name, parseFloat(e.target.value))}
                            min={field.min}
                            max={field.max}
                            step={field.step || 1}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    const formatEffectName = (className) => {
        return className.replace(/([A-Z])/g, ' $1').trim();
    };

    return (
        <div className="effect-editor-overlay" onClick={onClose}>
            <div className="effect-editor" onClick={(e) => e.stopPropagation()}>
                <div className="effect-editor-header">
                    <h3>{formatEffectName(effect.className)}</h3>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="effect-editor-body">
                    {loading ? (
                        <div className="loading">Loading configuration...</div>
                    ) : schema && schema.fields ? (
                        <div className="effect-fields">
                            {schema.fields.map((field, index) => (
                                <div key={index} className="field-container">
                                    {renderField(field)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-config">
                            No configuration options available
                        </div>
                    )}
                </div>

                <div className="effect-editor-footer">
                    <button className="button-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="button-save" onClick={handleSave}>
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}