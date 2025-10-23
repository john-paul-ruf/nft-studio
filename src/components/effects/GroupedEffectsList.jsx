/**
 * GroupedEffectsList Component
 * 
 * Renders effects grouped by author with collapsible groups.
 * Used in EffectSubmenu to organize effects for selection.
 * 
 * @component
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Box, Typography } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import './GroupedEffectsList.bem.css';
import './effects-panel.bem.css';

/**
 * GroupedEffectsList Component
 * 
 * @param {Object} props
 * @param {Array} props.effects - All effects
 * @param {Object} props.groupedEffects - Effects grouped by author
 * @param {string} props.effectType - Type of effects
 * @param {Function} props.onSelectEffect - (effect) => void
 * @param {Function} props.onToggleAuthor - (author) => void
 * @param {string} props.expandedAuthor - Currently expanded author
 * @param {Object} props.currentTheme - Theme object
 * @returns {React.ReactElement}
 */
export default function GroupedEffectsList({
    effects = [],
    groupedEffects = {},
    effectType = 'primary',
    onSelectEffect = () => {},
    onToggleAuthor = () => {},
    expandedAuthor = null,
    currentTheme
}) {
    /**
     * Handle effect selection
     */
    const handleSelectEffect = useCallback((effect) => {
        onSelectEffect(effect);
    }, [onSelectEffect]);

    /**
     * Handle author group toggle
     */
    const handleToggleAuthor = useCallback((author) => {
        onToggleAuthor(author);
    }, [onToggleAuthor]);

    const authors = Object.keys(groupedEffects).sort();
    
    // DEBUG: Log what we're receiving
    console.log(`🎨 GroupedEffectsList (${effectType}):`, {
        effectsCount: effects.length,
        authorsCount: authors.length,
        authors: authors,
        groupedEffectsKeys: Object.keys(groupedEffects),
        expandedAuthor: expandedAuthor,
        groupedEffects: groupedEffects
    });

    return (
        <Box className="grouped-effects__container">
            {authors.map((author) => {
                const authorEffects = groupedEffects[author] || [];
                const isExpanded = expandedAuthor === author;

                return (
                    <Box key={author} className="grouped-effects__group">
                        {/* Author group header - Regular element, not Sub */}
                        <div
                            className="grouped-effects__author-header"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleToggleAuthor(author);
                            }}
                        >
                            <span>{author}</span>
                            <span className="grouped-effects__author-icon">
                                {isExpanded ? '▼' : '▶'}
                            </span>
                        </div>

                        {/* Effects in this group - rendered directly, not in SubContent */}
                        {isExpanded && (
                            <Box className="grouped-effects__container">
                                {authorEffects.map((effect) => (
                                    <DropdownMenu.Item
                                        key={effect.registryKey}
                                        className="grouped-effects__effect-item"
                                        onSelect={() => handleSelectEffect(effect)}
                                    >
                                        • {effect.name}
                                    </DropdownMenu.Item>
                                ))}
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}

GroupedEffectsList.propTypes = {
    effects: PropTypes.array.isRequired,
    groupedEffects: PropTypes.objectOf(PropTypes.array).isRequired,
    effectType: PropTypes.string.isRequired,
    onSelectEffect: PropTypes.func.isRequired,
    onToggleAuthor: PropTypes.func.isRequired,
    expandedAuthor: PropTypes.string,
    currentTheme: PropTypes.object.isRequired
};