/**
 * AddEffectDropdown Component
 * 
 * Dropdown menu for adding effects to the project.
 * Organizes effects by type (primary, secondary, final, keyframe).
 * Includes specialty effects option.
 * 
 * @component
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Add } from '@mui/icons-material';
import { IconButton, Box } from '@mui/material';
import EffectSubmenu from './EffectSubmenu.jsx';
import './AddEffectDropdown.bem.css';
import './effects-panel.bem.css';

/**
 * AddEffectDropdown Component
 * 
 * @param {Object} props
 * @param {boolean} props.addEffectMenuOpen - Menu open state
 * @param {Function} props.setAddEffectMenuOpen - Menu open state setter
 * @param {Object} props.availableEffects - Available effects by type
 * @param {boolean} props.effectsLoaded - Whether effects are loaded
 * @param {Object} props.currentTheme - Theme object
 * @param {Function} props.onAddEffect - (effectName, effectType) => void
 * @param {Function} props.onOpenSpecialty - () => void - Open specialty modal
 * @returns {React.ReactElement}
 */
export default function AddEffectDropdown({
    addEffectMenuOpen,
    setAddEffectMenuOpen,
    availableEffects = {},
    effectsLoaded = false,
    currentTheme,
    onAddEffect,
    onOpenSpecialty
}) {
    // DEBUG: Log what we're receiving
    console.log('➕ AddEffectDropdown: Received props:', {
        effectsLoaded,
        availableEffects: {
            primary: availableEffects.primary?.length || 0,
            secondary: availableEffects.secondary?.length || 0,
            finalImage: availableEffects.finalImage?.length || 0,
            keyFrame: availableEffects.keyFrame?.length || 0
        },
        fullAvailableEffects: availableEffects
    });
    
    return (
        <Box className="add-effect-dropdown__wrapper">
            <DropdownMenu.Root
                open={addEffectMenuOpen}
                onOpenChange={setAddEffectMenuOpen}
            >
                <DropdownMenu.Trigger asChild>
                    <IconButton
                        size="small"
                        className="add-effect-dropdown__trigger-button"
                        title="Add effect"
                    >
                        <Add />
                    </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className="add-effect-dropdown__content"
                    >
                        {effectsLoaded && availableEffects && (
                            <>
                                {/* Primary Effects Submenu */}
                                <EffectSubmenu
                                    title={`Primary Effects (${availableEffects.primary?.length || 0})`}
                                    effects={availableEffects.primary || []}
                                    effectType="primary"
                                    currentTheme={currentTheme}
                                    onAddEffect={onAddEffect}
                                    setAddEffectMenuOpen={setAddEffectMenuOpen}
                                    onOpenSpecialty={onOpenSpecialty}
                                />

                                {/* Final Effects Submenu */}
                                <EffectSubmenu
                                    title={`Final Effects (${availableEffects.finalImage?.length || 0})`}
                                    effects={availableEffects.finalImage || []}
                                    effectType="finalImage"
                                    currentTheme={currentTheme}
                                    onAddEffect={onAddEffect}
                                    setAddEffectMenuOpen={setAddEffectMenuOpen}
                                />

                                {/* Note: Secondary and Keyframe effects are now only available 
                                    from the context menu of primary effects */}
                            </>
                        )}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </Box>
    );
}

AddEffectDropdown.propTypes = {
    addEffectMenuOpen: PropTypes.bool.isRequired,
    setAddEffectMenuOpen: PropTypes.func.isRequired,
    availableEffects: PropTypes.shape({
        primary: PropTypes.array,
        secondary: PropTypes.array,
        finalImage: PropTypes.array,
        keyFrame: PropTypes.array,
    }),
    effectsLoaded: PropTypes.bool,
    currentTheme: PropTypes.object.isRequired,
    onAddEffect: PropTypes.func.isRequired,
    onOpenSpecialty: PropTypes.func,
};