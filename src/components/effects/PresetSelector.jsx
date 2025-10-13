import React, { useState, useEffect } from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Tooltip
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';

/**
 * PresetSelector Component
 * 
 * Displays a dropdown to select and apply presets for an effect.
 * Follows Single Responsibility Principle - only handles preset selection UI.
 * 
 * @param {Object} props
 * @param {Object} props.selectedEffect - The currently selected effect
 * @param {Function} props.onPresetSelect - Callback when a preset is selected
 */
function PresetSelector({ selectedEffect, onPresetSelect }) {
    const [presets, setPresets] = useState([]);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasPresets, setHasPresets] = useState(false);

    // Load presets when effect changes
    useEffect(() => {
        const loadPresets = async () => {
            if (!selectedEffect?.registryKey) {
                console.log('🔍 PresetSelector: No effect selected');
                setPresets([]);
                setHasPresets(false);
                setSelectedPreset('');
                return;
            }

            console.log('🔍 PresetSelector: Loading presets for effect:', selectedEffect.registryKey);
            setLoading(true);
            try {
                // Check if effect has presets
                const hasPresetsResult = await window.api.hasPresets(selectedEffect.registryKey);
                console.log('🔍 PresetSelector: hasPresets result:', hasPresetsResult);
                
                if (hasPresetsResult.success && hasPresetsResult.hasPresets) {
                    // Get all presets for this effect
                    const presetsResult = await window.api.getEffectPresets(selectedEffect.registryKey);
                    console.log('🔍 PresetSelector: getEffectPresets result:', presetsResult);
                    
                    if (presetsResult.success && presetsResult.presets) {
                        console.log('✅ PresetSelector: Found', presetsResult.presets.length, 'presets');
                        setPresets(presetsResult.presets);
                        setHasPresets(true);
                    } else {
                        console.log('⚠️ PresetSelector: No presets in result');
                        setPresets([]);
                        setHasPresets(false);
                    }
                } else {
                    console.log('ℹ️ PresetSelector: Effect has no presets');
                    setPresets([]);
                    setHasPresets(false);
                }
            } catch (error) {
                console.error('❌ PresetSelector: Error loading presets:', error);
                setPresets([]);
                setHasPresets(false);
            } finally {
                setLoading(false);
            }
        };

        loadPresets();
    }, [selectedEffect?.registryKey]);

    // Handle preset selection
    const handlePresetChange = async (event) => {
        const presetName = event.target.value;
        setSelectedPreset(presetName);

        if (!presetName || presetName === '') {
            return;
        }

        try {
            // Get the full preset object
            const presetResult = await window.api.getPreset(selectedEffect.registryKey, presetName);
            
            if (presetResult.success && presetResult.preset) {
                const preset = presetResult.preset;
                
                // Extract the configuration from the preset
                // Presets have a 'currentEffectConfig' property with the actual config
                const config = preset.currentEffectConfig || {};
                
                console.log('✅ Applying preset:', presetName, config);
                
                // Call the callback with the preset configuration
                if (onPresetSelect) {
                    onPresetSelect(config, preset);
                }
            }
        } catch (error) {
            console.error('❌ Error applying preset:', error);
        }
    };

    // Don't render if no presets available
    if (!hasPresets || presets.length === 0) {
        return null;
    }

    return (
        <Box sx={{ mb: 2 }}>
            <FormControl fullWidth size="small">
                <InputLabel id="preset-selector-label">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AutoAwesome sx={{ fontSize: 16 }} />
                        <span>Apply Preset</span>
                    </Box>
                </InputLabel>
                <Select
                    labelId="preset-selector-label"
                    id="preset-selector"
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    disabled={loading}
                    label="Apply Preset"
                    sx={{
                        '& .MuiSelect-select': {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }
                    }}
                >
                    <MenuItem value="">
                        <em>Select a preset...</em>
                    </MenuItem>
                    {presets.map((preset) => (
                        <MenuItem key={preset.name} value={preset.name}>
                            <Tooltip 
                                title={`Chance: ${preset.percentChance || 100}%`}
                                placement="right"
                                arrow
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                    <AutoAwesome sx={{ fontSize: 16, opacity: 0.7 }} />
                                    <Typography variant="body2">
                                        {preset.name}
                                    </Typography>
                                </Box>
                            </Tooltip>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            
            {selectedPreset && (
                <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ mt: 0.5, display: 'block' }}
                >
                    Preset applied. You can further customize the values below.
                </Typography>
            )}
        </Box>
    );
}

export default PresetSelector;