import React, { useState, useEffect } from 'react';
import ColorSchemeService from '../services/ColorSchemeService';
import PreferencesService from '../services/PreferencesService';
import ColorSchemeCreator from './ColorSchemeCreator';

function ColorSchemeDropdown({ value, onChange, projectData, showPreview = true }) {
    const [allSchemes, setAllSchemes] = useState({});
    const [categorizedSchemes, setCategorizedSchemes] = useState({});
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCreator, setShowCreator] = useState(false);
    const [editingScheme, setEditingScheme] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [favorites, setFavorites] = useState([]);
    const [defaultScheme, setDefaultScheme] = useState(null);

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
        onChange(schemeId);
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
            onChange(newScheme.id);
        }

        // Clear editing state
        setEditingScheme(null);
    };

    const renderColorSwatch = (colors, maxColors = 6) => {
        const displayColors = colors.slice(0, maxColors);
        return (
            <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                {displayColors.map((color, index) => (
                    <div
                        key={index}
                        style={{
                            width: '16px',
                            height: '16px',
                            background: color,
                            borderRadius: '2px',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}
                        title={color}
                    />
                ))}
                {colors.length > maxColors && (
                    <div style={{
                        width: '16px',
                        height: '16px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: '#ccc'
                    }}>
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
                style={{
                    padding: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                    border: isSelected ? '1px solid #667eea' : '1px solid transparent',
                    borderRadius: '6px',
                    margin: '2px 0',
                    position: 'relative'
                }}
            >
                <div
                    onClick={() => handleSchemeSelect(scheme.id)}
                    style={{ flex: 1 }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '6px'
                    }}>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                            {isFavorited && (
                                <span style={{ color: '#ffd700', marginRight: '4px' }}>⭐</span>
                            )}
                            {isDefault && (
                                <span style={{ color: '#22c55e', marginRight: '4px' }}>🎯</span>
                            )}
                            {scheme.name}
                            {scheme.isCustom && (
                                <span style={{
                                    marginLeft: '6px',
                                    fontSize: '0.7rem',
                                    background: 'rgba(102, 126, 234, 0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '10px'
                                }}>
                                    Custom
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '2px' }}>
                            {scheme.description}
                        </div>
                    </div>
                </div>

                {/* Color swatches */}
                <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>
                        Lights ({scheme.lights?.length || 0})
                    </div>
                    {renderColorSwatch(scheme.lights || [])}

                    <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '6px', marginBottom: '4px' }}>
                        Neutrals ({scheme.neutrals?.length || 0}) • Backgrounds ({scheme.backgrounds?.length || 0})
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {renderColorSwatch(scheme.neutrals || [], 3)}
                        {renderColorSwatch(scheme.backgrounds || [], 3)}
                    </div>
                </div>
                </div>

                {/* Action buttons */}
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    opacity: 0.8
                }}>
                    {/* Favorite and Default buttons */}
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                            onClick={(e) => handleToggleFavorite(scheme.id, e)}
                            style={{
                                background: isFavorited ? 'rgba(255, 215, 0, 0.8)' : 'rgba(128, 128, 128, 0.6)',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '3px 6px',
                                color: isFavorited ? '#000' : '#fff',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            ⭐
                        </button>
                        <button
                            onClick={(e) => handleSetDefault(scheme.id, e)}
                            style={{
                                background: isDefault ? 'rgba(34, 197, 94, 0.8)' : 'rgba(128, 128, 128, 0.6)',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '3px 6px',
                                color: 'white',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                            title={isDefault ? 'Current default' : 'Set as default'}
                        >
                            🎯
                        </button>
                    </div>

                    {/* Edit/Copy buttons */}
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                            onClick={(e) => handleCopyScheme(scheme, e)}
                            style={{
                                background: 'rgba(102, 126, 234, 0.8)',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '3px 6px',
                                color: 'white',
                                fontSize: '0.7rem',
                                cursor: 'pointer'
                            }}
                            title="Copy and edit"
                        >
                            Copy
                        </button>
                        {scheme.isCustom && (
                            <button
                                onClick={(e) => handleEditScheme(scheme, e)}
                                style={{
                                    background: 'rgba(34, 197, 94, 0.8)',
                                    border: 'none',
                                    borderRadius: '3px',
                                    padding: '3px 6px',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer'
                                }}
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


    return (
        <div style={{ position: 'relative' }}>
            {/* Selected Scheme Display */}
            <div
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <div style={{ flex: 1 }}>
                    {selectedScheme ? (
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                {selectedScheme.name}
                                {selectedScheme.isCustom && (
                                    <span style={{
                                        marginLeft: '6px',
                                        fontSize: '0.7rem',
                                        background: 'rgba(102, 126, 234, 0.3)',
                                        padding: '2px 6px',
                                        borderRadius: '10px'
                                    }}>
                                        Custom
                                    </span>
                                )}
                            </div>
                            {showPreview && (
                                <div style={{ marginTop: '6px' }}>
                                    {renderColorSwatch([
                                        ...(selectedScheme.lights?.slice(0, 4) || []),
                                        ...(selectedScheme.neutrals?.slice(0, 2) || [])
                                    ])}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ color: '#888' }}>Select a color scheme</div>
                    )}
                </div>
                <div style={{ color: '#888', fontSize: '0.8rem' }}>
                    {showDropdown ? '▲' : '▼'}
                </div>
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    marginTop: '4px',
                    maxHeight: '400px',
                    overflow: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}>
                    {/* Search and Create */}
                    <div style={{
                        padding: '12px',
                        borderBottom: '1px solid #333',
                        background: '#0f0f0f'
                    }}>
                        <input
                            type="text"
                            placeholder="Search color schemes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                padding: '8px',
                                color: 'white',
                                marginBottom: '8px'
                            }}
                        />
                        <button
                            onClick={() => {
                                setEditingScheme(null);
                                setShowCreator(true);
                                setShowDropdown(false);
                            }}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            + Create Custom Scheme
                        </button>
                    </div>

                    {/* Scheme Categories */}
                    <div style={{ padding: '8px' }}>
                        {Object.entries(filteredSchemes).map(([category, schemes]) => {
                            if (schemes.length === 0) return null;
                            return (
                                <div key={category} style={{ marginBottom: '16px' }}>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        color: '#667eea',
                                        marginBottom: '8px',
                                        paddingLeft: '8px'
                                    }}>
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