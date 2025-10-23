import React, { useState, useEffect, useCallback } from 'react';
import ColorSchemeService from '../services/ColorSchemeService.js';
import PreferencesService from '../services/PreferencesService.js';
import ColorSchemeCreator from './ColorSchemeCreator.jsx';
import { useServices } from '../contexts/ServiceContext.js';
import useDebounce from '../hooks/useDebounce.js';
import './ColorSchemeDropdown.bem.css';

function ColorSchemeDropdown({ value, onChange, projectData, showPreview = true, isInDropdown = false }) {
    const { eventBusService } = useServices();
    const [allSchemes, setAllSchemes] = useState({});
    const [categorizedSchemes, setCategorizedSchemes] = useState({});
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCreator, setShowCreator] = useState(false);
    const [editingScheme, setEditingScheme] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [favorites, setFavorites] = useState([]);
    const [defaultScheme, setDefaultScheme] = useState(null);

    // Debounced search handler (300ms delay)
    const debouncedSetSearchTerm = useDebounce(setSearchTerm, 300);

    // Event-based color scheme change handler
    const handleColorSchemeChange = useCallback((schemeId) => {
        console.log('🎨 ColorSchemeDropdown: Emitting color scheme change event:', schemeId);
        eventBusService.emit('colorscheme:change', { schemeId }, {
            source: 'ColorSchemeDropdown',
            component: 'ColorSchemeDropdown'
        });

        // Also call the callback if provided (backward compatibility)
        if (onChange) {
            onChange(schemeId);
        }
    }, [eventBusService, onChange]);

    useEffect(() => {
        loadColorSchemes();
    }, []);

    const loadColorSchemes = async () => {
        try {
            const [schemes, categorized, favs, defaultSch] = await Promise.all([
                ColorSchemeService.getAllColorSchemes(),
                ColorSchemeService.getColorSchemesByCategory(),
                PreferencesService.getFavoriteColorSchemes(),
                PreferencesService.getDefaultColorScheme()
            ]);

            setAllSchemes(schemes);
            setCategorizedSchemes(categorized);
            setFavorites(favs);
            setDefaultScheme(defaultSch);
        } catch (error) {
            console.error('Error loading color schemes:', error);
        }
    };

    const handleToggleFavorite = async (schemeId, event) => {
        event.stopPropagation();
        const isFavorited = await PreferencesService.toggleFavoriteColorScheme(schemeId);
        await loadColorSchemes(); // Refresh to update favorites list
    };

    const handleSetDefault = async (schemeId, event) => {
        event.stopPropagation();
        const success = await PreferencesService.setDefaultColorScheme(schemeId);
        if (success) {
            setDefaultScheme(schemeId);
        }
    };

    const selectedScheme = allSchemes[value];

    const handleSchemeSelect = (schemeId) => {
        handleColorSchemeChange(schemeId);
        setShowDropdown(false);
    };

    const handleCustomSchemeCreated = async (schemeData) => {
        let newScheme;

        if (editingScheme) {
            // Editing existing scheme or saving a copy
            newScheme = {
                ...editingScheme,
                name: schemeData.name,
                description: schemeData.description,
                neutrals: schemeData.neutrals,
                backgrounds: schemeData.backgrounds,
                lights: schemeData.lights
            };
        } else {
            // Creating new scheme
            newScheme = {
                name: schemeData.name,
                description: schemeData.description,
                neutrals: schemeData.neutrals,
                backgrounds: schemeData.backgrounds,
                lights: schemeData.lights
            };
        }

        const success = await ColorSchemeService.saveCustomScheme(newScheme);
        if (success) {
            await loadColorSchemes();
            handleColorSchemeChange(newScheme.id);
        }

        // Clear editing state
        setEditingScheme(null);
    };

    const renderColorSwatch = (colors, maxColors = 6) => {
        const displayColors = colors.slice(0, maxColors);
        return (
            <div className="color-scheme-dropdown__swatch-list">
                {displayColors.map((color, index) => (
                    <div
                        key={index}
                        className="color-scheme-dropdown__swatch"
                        style={{ '--swatch-color': color }}
                        title={color}
                    />
                ))}
                {colors.length > maxColors && (
                    <div className="color-scheme-dropdown__swatch color-scheme-dropdown__swatch--more">
                        +{colors.length - maxColors}
                    </div>
                )}
            </div>
        );
    };

    const handleEditScheme = (scheme, event) => {
        event.stopPropagation();
        setShowCreator(true);
        setShowDropdown(false);
        // Pass the scheme to edit in the creator
        setEditingScheme(scheme);
    };

    const handleCopyScheme = (scheme, event) => {
        event.stopPropagation();
        const copiedScheme = {
            ...scheme,
            name: `${scheme.name} (Copy)`,
            id: undefined // Will be auto-generated
        };
        setShowCreator(true);
        setShowDropdown(false);
        setEditingScheme(copiedScheme);
    };

    const renderSchemeOption = (scheme) => {
        const isSelected = value === scheme.id;
        const isFavorited = favorites.includes(scheme.id);
        const isDefault = defaultScheme === scheme.id;

        return (
            <div
                key={scheme.id}
                className={`color-scheme-dropdown__option${isSelected ? ' color-scheme-dropdown__option--selected' : ''}`}
            >
                <div
                    onClick={() => handleSchemeSelect(scheme.id)}
                    className="color-scheme-dropdown__option-body"
                >
                    <div className="color-scheme-dropdown__option-header">
                    <div>
                        <div className="color-scheme-dropdown__title">
                            {isFavorited && (
                                <span className="color-scheme-dropdown__icon color-scheme-dropdown__icon--favorite">⭐</span>
                            )}
                            {isDefault && (
                                <span className="color-scheme-dropdown__icon color-scheme-dropdown__icon--default">🎯</span>
                            )}
                            {scheme.name}
                            {scheme.isCustom && (
                                <span className="color-scheme-dropdown__badge">
                                    Custom
                                </span>
                            )}
                        </div>
                        <div className="color-scheme-dropdown__meta">
                            {scheme.description}
                        </div>
                    </div>
                </div>

                {/* Color swatches */}
                <div className="color-scheme-dropdown__section">
                    <div className="color-scheme-dropdown__meta">
                        Lights ({scheme.lights?.length || 0})
                    </div>
                    {renderColorSwatch(scheme.lights || [])}

                    <div className="color-scheme-dropdown__meta color-scheme-dropdown__meta--spaced">
                        Neutrals ({scheme.neutrals?.length || 0}) • Backgrounds ({scheme.backgrounds?.length || 0})
                    </div>
                    <div className="color-scheme-dropdown__swatch-row">
                        {renderColorSwatch(scheme.neutrals || [], 3)}
                        {renderColorSwatch(scheme.backgrounds || [], 3)}
                    </div>
                </div>
                </div>

                {/* Action buttons */}
                <div className="color-scheme-dropdown__actions">
                    {/* Favorite and Default buttons */}
                    <div className="color-scheme-dropdown__btn-row">
                        <button
                            onClick={(e) => handleToggleFavorite(scheme.id, e)}
                            className={`color-scheme-dropdown__btn ${isFavorited ? 'color-scheme-dropdown__btn--favorite' : ''}`}
                            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            ⭐
                        </button>
                        <button
                            onClick={(e) => handleSetDefault(scheme.id, e)}
                            className={`color-scheme-dropdown__btn ${isDefault ? 'color-scheme-dropdown__btn--default' : ''}`}
                            title={isDefault ? 'Current default' : 'Set as default'}
                        >
                            🎯
                        </button>
                    </div>

                    {/* Edit/Copy buttons */}
                    <div className="color-scheme-dropdown__btn-row">
                        <button
                            onClick={(e) => handleCopyScheme(scheme, e)}
                            className="color-scheme-dropdown__btn color-scheme-dropdown__btn--copy"
                            title="Copy and edit"
                        >
                            Copy
                        </button>
                        {scheme.isCustom && (
                            <button
                                onClick={(e) => handleEditScheme(scheme, e)}
                                className="color-scheme-dropdown__btn color-scheme-dropdown__btn--edit"
                                title="Edit"
                            >
                                Edit
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const filteredSchemes = {};
    if (searchTerm) {
        // Filter schemes by search term
        for (const [category, schemes] of Object.entries(categorizedSchemes)) {
            const filtered = schemes.filter(scheme =>
                scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                scheme.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filtered.length > 0) {
                filteredSchemes[category] = filtered;
            }
        }
    } else {
        Object.assign(filteredSchemes, categorizedSchemes);
    }


    // If embedded in dropdown, just return the content without wrapper
    if (isInDropdown) {
        return (
            <div>
                {/* Search and Create */}
                <div className="color-scheme-dropdown__menu-header">
                    <input
                        className="color-scheme-dropdown__search"
                        type="text"
                        placeholder="Search color schemes..."
                        value={searchTerm}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearchTerm(value);
                            debouncedSetSearchTerm(value);
                        }}
                    />
                    <button
                        className="color-scheme-dropdown__create-btn"
                        onClick={() => {
                            setEditingScheme(null);
                            setShowCreator(true);
                        }}
                    >
                        + Create Custom Scheme
                    </button>
                </div>

                {/* Scheme Categories */}
                <div className="color-scheme-dropdown__categories">
                    {Object.entries(filteredSchemes).map(([category, schemes]) => {
                        if (schemes.length === 0) return null;
                        return (
                            <div key={category} className="color-scheme-dropdown__category-group">
                                <div className="color-scheme-dropdown__category">
                                    {category}
                                </div>
                                {schemes.map(renderSchemeOption)}
                            </div>
                        );
                    })}
                </div>

                {/* Color Scheme Creator Modal */}
                {showCreator && (
                    <ColorSchemeCreator
                        onClose={() => {
                            setShowCreator(false);
                            setEditingScheme(null);
                        }}
                        onSave={handleCustomSchemeCreated}
                        editingScheme={editingScheme}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="color-scheme-dropdown">
            {/* Selected Scheme Display */}
            <div
                className="color-scheme-dropdown__trigger"
                onClick={() => setShowDropdown(!showDropdown)}
            >
                <div className="color-scheme-dropdown__trigger-main">
                    {selectedScheme ? (
                        <div>
                            <div className="color-scheme-dropdown__label">
                                {selectedScheme.name}
                                {selectedScheme.isCustom && (
                                    <span className="color-scheme-dropdown__badge">
                                        Custom
                                    </span>
                                )}
                            </div>
                            {showPreview && (
                                <div className="color-scheme-dropdown__preview">
                                    {renderColorSwatch([
                                        ...(selectedScheme.lights?.slice(0, 4) || []),
                                        ...(selectedScheme.neutrals?.slice(0, 2) || [])
                                    ])}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="color-scheme-dropdown__meta color-scheme-dropdown__meta--placeholder">Select a color scheme</div>
                    )}
                </div>
                <div className="color-scheme-dropdown__chevron">
                    {showDropdown ? '▲' : '▼'}
                </div>
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <div className="color-scheme-dropdown__menu">
                    {/* Search and Create */}
                    <div className="color-scheme-dropdown__menu-header">
                        <input
                            className="color-scheme-dropdown__search"
                            type="text"
                            placeholder="Search color schemes..."
                            value={searchTerm}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSearchTerm(value);
                                debouncedSetSearchTerm(value);
                            }}
                        />
                        <button
                            className="color-scheme-dropdown__create-btn"
                            onClick={() => {
                                setEditingScheme(null);
                                setShowCreator(true);
                                setShowDropdown(false);
                            }}
                        >
                            + Create Custom Scheme
                        </button>
                    </div>

                    {/* Scheme Categories */}
                    <div className="color-scheme-dropdown__categories">
                        {Object.entries(filteredSchemes).map(([category, schemes]) => {
                            if (schemes.length === 0) return null;
                            return (
                                <div key={category} className="color-scheme-dropdown__category-group">
                                    <div className="color-scheme-dropdown__category">
                                        {category}
                                    </div>
                                    {schemes.map(renderSchemeOption)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Color Scheme Creator Modal */}
            {showCreator && (
                <ColorSchemeCreator
                    onClose={() => {
                        setShowCreator(false);
                        setEditingScheme(null);
                    }}
                    onSave={handleCustomSchemeCreated}
                    editingScheme={editingScheme}
                />
            )}
        </div>
    );
}

export default ColorSchemeDropdown;