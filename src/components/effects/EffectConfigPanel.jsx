/**
 * EffectConfigPanel Component (Flyout Drawer Version)
 * 
 * Flyout drawer configuration panel for effects.
 * Slides in from the right within the content area (between effects panel and canvas).
 * 
 * Architecture:
 * - ID-based effect access
 * - Smooth slide-in/slide-out animation via CSS transitions
 * - Keyboard support (Esc to close)
 * - Read-only mode support
 * - Part of the main layout, not a full-screen overlay
 * 
 * @component
 */

import React, { useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Typography,
    IconButton,
    useTheme,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import EffectConfigurer from './EffectConfigurer.jsx';

// CSS Import
import './EffectsPanel.bem.css';
import './EffectConfigPanel.bem.css';

/**
 * EffectConfigPanel Component (Flyout from Effects Panel)
 * 
 * @param {Object} props
 * @param {boolean} props.isExpanded - Panel expanded state (drawer open/closed)
 * @param {Function} props.onToggleExpand - () => void - Toggle expand/collapse
 * @param {Object} props.selectedEffect - Selected effect data
 * @param {string} props.selectedEffect.effectId - Effect ID (stable identifier)
 * @param {Object} props.projectState - Project state
 * @param {boolean} props.isReadOnly - Read-only mode
 * @param {Function} props.onConfigChange - (config) => void
 * @param {Function} props.onAddEffect - (effect, config) => void
 * @returns {React.ReactElement}
 */
export default function EffectConfigPanel({
    isExpanded = false,
    onToggleExpand = () => {},
    selectedEffect = null,
    projectState = null,
    isReadOnly = false,
    onConfigChange = () => {},
    onAddEffect = () => {}
}) {
    const theme = useTheme();
    
    /**
     * 🔒 CRITICAL: Keep reference to last valid effect
     * This prevents content from disappearing when switching effects.
     * Only the 'isExpanded' prop controls visibility.
     */
    const lastValidEffectRef = useRef(null);
    
    useEffect(() => {
        if (selectedEffect && selectedEffect.effectId) {
            lastValidEffectRef.current = selectedEffect;
        }
    }, [selectedEffect]);

    const displayEffect = selectedEffect && selectedEffect.effectId ? selectedEffect : lastValidEffectRef.current;

    /**
     * Handle toggle expand
     */
    const handleToggleExpand = useCallback(() => {
        onToggleExpand();
    }, [onToggleExpand]);

    /**
     * Handle Escape key to close drawer
     */
    const handleEscapeKey = useCallback((e) => {
        if (e.key === 'Escape' && isExpanded) {
            handleToggleExpand();
        }
    }, [isExpanded, handleToggleExpand]);

    // Only show drawer if there's an effect selected
    if (!displayEffect?.effectId) {
        return null;
    }

    return (
        <Box
            onKeyDown={handleEscapeKey}
            className="effect-config-panel"
        >
            {/* Flyout Container */}
            <Box
                className="effect-config-panel__flyout"
            >

                {/* Configuration Content - Scrollable */}
                <Box
                    className="effect-config-panel__content"
                >
                    {displayEffect && displayEffect.effectId ? (
                        <EffectConfigurer
                            selectedEffect={displayEffect}
                            projectState={projectState}
                            isReadOnly={isReadOnly}
                            onConfigChange={onConfigChange}
                            onAddEffect={onAddEffect}
                            initialConfig={displayEffect.config || {}}
                        />
                    ) : (
                        <Box className="effect-config-panel__loading">
                            Loading effect configuration...
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

EffectConfigPanel.propTypes = {
    isExpanded: PropTypes.bool.isRequired,
    onToggleExpand: PropTypes.func.isRequired,
    selectedEffect: PropTypes.shape({
        effectId: PropTypes.string.isRequired,
        name: PropTypes.string
    }),
    projectState: PropTypes.object,
    isReadOnly: PropTypes.bool,
    onConfigChange: PropTypes.func,
    onAddEffect: PropTypes.func
};