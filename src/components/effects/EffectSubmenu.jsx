/**
 * EffectSubmenu Component
 * 
 * Renders a submenu containing effects of a specific type (primary, secondary, final, keyframe).
 * Groups effects by author using GroupedEffectsList.
 * 
 * @component
 */

import React, { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Box, Typography } from '@mui/material';
import GroupedEffectsList from './GroupedEffectsList.jsx';
import './EffectSubmenu.bem.css';

/**
 * EffectSubmenu Component
 * 
 * @param {Object} props
 * @param {string} props.title - Submenu title (e.g., "Primary Effects (5)")
 * @param {Array} props.effects - List of effects to display
 * @param {string} props.effectType - Type of effects (primary|secondary|final|keyframe)
 * @param {Object} props.currentTheme - Theme object
 * @param {Function} props.onAddEffect - (effectName, effectType) => void
 * @param {Function} props.setAddEffectMenuOpen - Close parent dropdown
 * @param {Function} props.onOpenSpecialty - Open specialty modal (optional)
 * @returns {React.ReactElement}
 */
export default function EffectSubmenu({
    title = 'Effects',
    effects = [],
    effectType = 'primary',
    currentTheme,
    onAddEffect,
    setAddEffectMenuOpen,
    onOpenSpecialty
}) {
    // Initialize with first author expanded so effects are visible immediately
    const [expandedAuthor, setExpandedAuthor] = useState(() => {
        if (effects.length > 0) {
            const firstAuthor = effects[0].author || 'Uncategorized';
            return firstAuthor;
        }
        return null;
    });

    /**
     * Group effects by author
     */
    const groupedEffects = useMemo(() => {
        const groups = {};
        
        effects.forEach(effect => {
            const author = effect.author || 'Uncategorized';
            if (!groups[author]) {
                groups[author] = [];
            }
            groups[author].push(effect);
        });
        
        // DEBUG: Log grouping results
        console.log(`📦 EffectSubmenu (${effectType}): Grouped ${effects.length} effects:`, {
            effectType,
            totalEffects: effects.length,
            authorGroups: Object.keys(groups),
            groupCounts: Object.entries(groups).reduce((acc, [author, efx]) => {
                acc[author] = efx.length;
                return acc;
            }, {}),
            groupedEffects: groups
        });
        
        return groups;
    }, [effects, effectType]);

    /**
     * Handle effect selection
     */
    const handleSelectEffect = useCallback((effect) => {
        if (onAddEffect) {
            // Pass effect name and type (NOT index)
            onAddEffect(effect.name, effectType);
        }
        
        // Close parent dropdown after selection
        if (setAddEffectMenuOpen) {
            setAddEffectMenuOpen(false);
        }
    }, [effectType, onAddEffect, setAddEffectMenuOpen]);

    /**
     * Toggle author group expansion
     */
    const handleToggleAuthor = useCallback((author) => {
        setExpandedAuthor(expandedAuthor === author ? null : author);
    }, [expandedAuthor]);


    if (effects.length === 0) {
        return null;
    }

    return (
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
                className="effect-submenu__trigger"
            >
                {title}
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                    className="effect-submenu__content"
                >
                    {/* Use GroupedEffectsList for effect organization */}
                    <GroupedEffectsList
                        effects={effects}
                        groupedEffects={groupedEffects}
                        effectType={effectType}
                        onSelectEffect={handleSelectEffect}
                        onToggleAuthor={handleToggleAuthor}
                        expandedAuthor={expandedAuthor}
                        currentTheme={currentTheme}
                    />

                    {/* Specialty option for primary effects only */}
                    {effectType === 'primary' && onOpenSpecialty && (
                        <>
                            <DropdownMenu.Separator
                                className="effect-submenu__separator"
                            />
                            <DropdownMenu.Item
                                onSelect={onOpenSpecialty}
                                className="effect-submenu__specialty-item"
                            >
                                ✨ Specialty Effects
                            </DropdownMenu.Item>
                        </>
                    )}
                </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
        </DropdownMenu.Sub>
    );
}

EffectSubmenu.propTypes = {
    title: PropTypes.string.isRequired,
    effects: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            author: PropTypes.string,
            registryKey: PropTypes.string.isRequired
        })
    ).isRequired,
    effectType: PropTypes.oneOf(['primary', 'secondary', 'finalImage', 'keyFrame']).isRequired,
    currentTheme: PropTypes.object.isRequired,
    onAddEffect: PropTypes.func.isRequired,
    setAddEffectMenuOpen: PropTypes.func.isRequired,
    onOpenSpecialty: PropTypes.func
};