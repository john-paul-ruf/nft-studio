import React, { useState, useEffect } from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Tooltip,
    Button,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import PresetConfigDeserializer from '../../utils/PresetConfigDeserializer';
import './PresetSelector.bem.css';

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
    const [builtIn, setBuiltIn] = useState([]);
    const [user, setUser] = useState([]);

    // Snackbar state
    const [snackbar, setSnackbar] = useState({ open: false, severity: 'info', message: '' });

    const showSnackbar = (severity, message) => setSnackbar({ open: true, severity, message });
    const closeSnackbar = () => setSnackbar({ ...snackbar, open: false });

    // Delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const openDeleteDialog = () => setDeleteDialogOpen(true);
    const closeDeleteDialog = () => setDeleteDialogOpen(false);

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
                        const all = presetsResult.presets;
                        const built = all.filter(p => p?.metadata?.source === 'builtin');
                        const usr = all.filter(p => p?.metadata?.source === 'user');
                        setPresets(all);
                        setBuiltIn(built);
                        setUser(usr);
                        setHasPresets(all.length > 0);
                    } else {
                        console.log('⚠️ PresetSelector: No presets in result');
                        setPresets([]);
                        setBuiltIn([]);
                        setUser([]);
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

    // Helper to reload the presets from API
    const reloadPresets = async () => {
        if (!selectedEffect?.registryKey) return;
        try {
            const hasRes = await window.api.hasPresets(selectedEffect.registryKey);
            if (!(hasRes?.success)) return;
            if (hasRes.hasPresets) {
                const presetsResult = await window.api.getEffectPresets(selectedEffect.registryKey);
                if (presetsResult?.success && presetsResult.presets) {
                    const all = presetsResult.presets;
                    const built = all.filter(p => p?.metadata?.source === 'builtin');
                    const usr = all.filter(p => p?.metadata?.source === 'user');
                    setPresets(all);
                    setBuiltIn(built);
                    setUser(usr);
                    setHasPresets(all.length > 0);
                }
            } else {
                setPresets([]);
                setBuiltIn([]);
                setUser([]);
                setHasPresets(false);
            }
        } catch (e) {
            // Silent error; snackbar shown by callers if needed
        }
    };

    // Handle preset selection
    const handlePresetChange = async (event) => {
        const presetName = event.target.value;
        setSelectedPreset(presetName);

        if (!presetName || presetName === '') {
            return;
        }

        try {
            const presetResult = await window.api.getPreset(selectedEffect.registryKey, presetName);
            if (presetResult.success && presetResult.preset) {
                const preset = presetResult.preset;
                const serializedConfig = preset.currentEffectConfig || {};
                
                // Deserialize the config to remove __type metadata and convert to plain objects
                const config = PresetConfigDeserializer.deserialize(serializedConfig);
                
                console.log('[PresetSelector] Deserialized config:', config);
                
                if (onPresetSelect) onPresetSelect(config, preset);
            } else {
                showSnackbar('error', presetResult.error || 'Failed to load preset');
            }
        } catch (error) {
            console.error('❌ Error applying preset:', error);
            showSnackbar('error', 'Error applying preset');
        }
    };

    // Delete a user preset
    const handleDeleteUserPreset = async () => {
        if (!selectedEffect?.registryKey || !selectedPreset) return;
        try {
            // Only allow deletion for user presets
            const isUser = user.some(p => p.name === selectedPreset);
            if (!isUser) {
                showSnackbar('warning', 'Only user presets can be deleted');
                return;
            }
            const res = await window.api.deleteUserPreset(selectedEffect.registryKey, selectedPreset);
            if (res?.success) {
                showSnackbar('success', 'Preset deleted');
                // Refresh presets list
                await reloadPresets();
                setSelectedPreset('');
            } else {
                showSnackbar('error', res?.error || 'Failed to delete preset');
            }
        } catch (e) {
            showSnackbar('error', 'Error deleting preset');
        }
    };

    // Rename a user preset (simple prompt)
    const handleRenameUserPreset = async () => {
        if (!selectedEffect?.registryKey || !selectedPreset) return;
        const isUser = user.some(p => p.name === selectedPreset);
        if (!isUser) {
            showSnackbar('warning', 'Only user presets can be renamed');
            return;
        }
        const newName = window.prompt('Enter new name for the preset', selectedPreset);
        if (!newName) return;
        const trimmed = newName.trim();
        // Basic validation
        if (trimmed.length < 1 || trimmed.length > 64) {
            showSnackbar('warning', 'Name must be between 1 and 64 characters');
            return;
        }
        if (!/^[\w\-\s]+$/.test(trimmed)) {
            showSnackbar('warning', 'Only letters, numbers, spaces, dashes and underscores are allowed');
            return;
        }
        if (user.some(p => p.name === trimmed)) {
            showSnackbar('error', 'Duplicate preset name');
            return;
        }
        try {
            // To rename: read the preset config then save as new and delete old
            const presetResult = await window.api.getPreset(selectedEffect.registryKey, selectedPreset);
            const config = presetResult?.preset?.currentEffectConfig;
            if (!config) {
                showSnackbar('error', 'Could not fetch current preset');
                return;
            }
            const save = await window.api.saveUserPreset(selectedEffect.registryKey, trimmed, config);
            if (!save?.success) {
                showSnackbar('error', save?.error || 'Failed to save renamed preset');
                return;
            }
            const del = await window.api.deleteUserPreset(selectedEffect.registryKey, selectedPreset);
            if (!del?.success) {
                showSnackbar('warning', 'Saved new name but failed to remove old');
            }
            showSnackbar('success', 'Preset renamed');
            await reloadPresets();
            setSelectedPreset(trimmed);
        } catch (e) {
            showSnackbar('error', 'Error renaming preset');
        }
    };

    // Don't render if no presets available
    if (!hasPresets || presets.length === 0) {
        return null;
    }

    return (
        <Box className="preset-selector">
            <FormControl fullWidth size="small">
                <InputLabel id="preset-selector-label">
                    <Box className="preset-selector__label-content">
                        <AutoAwesome className="preset-selector__label-icon" />
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
                    className="preset-selector__select-input"
                >
                    <MenuItem value="">
                        <em>Select a preset...</em>
                    </MenuItem>

                    {builtIn.length > 0 && (
                        <MenuItem disabled value="__divider_builtin">
                            <Typography variant="caption" color="text.secondary">Built-in</Typography>
                        </MenuItem>
                    )}
                    {builtIn.map((preset) => (
                        <MenuItem key={`builtin-${preset.name}`} value={preset.name}>
                            <Tooltip 
                                title={`Chance: ${preset.percentChance || 100}%`}
                                placement="right"
                                arrow
                            >
                                <Box className="preset-selector__menu-item-content">
                                    <AutoAwesome className="preset-selector__menu-item-icon" />
                                    <Typography variant="body2">
                                        {preset.name}
                                    </Typography>
                                </Box>
                            </Tooltip>
                        </MenuItem>
                    ))}

                    {user.length > 0 && (
                        <MenuItem disabled value="__divider_user">
                            <Typography variant="caption" color="text.secondary">Your Presets</Typography>
                        </MenuItem>
                    )}
                    {user.map((preset) => (
                        <MenuItem key={`user-${preset.name}`} value={preset.name}>
                            <Tooltip 
                                title={`Chance: ${preset.percentChance || 100}%`}
                                placement="right"
                                arrow
                            >
                                <Box className="preset-selector__menu-item-content">
                                    <AutoAwesome className="preset-selector__menu-item-icon" />
                                    <Typography variant="body2">
                                        {preset.name}
                                    </Typography>
                                </Box>
                            </Tooltip>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Actions for user presets: rename / delete */}
            <Box className="preset-selector__actions">
                <Button
                    size="small"
                    variant="outlined"
                    onClick={handleRenameUserPreset}
                    disabled={!selectedPreset || !user.some(p => p.name === selectedPreset)}
                >
                    Rename preset
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={openDeleteDialog}
                    disabled={!selectedPreset || !user.some(p => p.name === selectedPreset)}
                >
                    Delete preset
                </Button>
            </Box>
            
            {selectedPreset && (
                <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    className="preset-selector__applied-message"
                >
                    Preset applied. You can further customize the values below.
                </Typography>
            )}

            {/* Delete confirmation dialog */}
            <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
                <DialogTitle>Delete preset?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Are you sure you want to delete the user preset "{selectedPreset}"? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteDialog}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={async () => {
                        await handleDeleteUserPreset();
                        closeDeleteDialog();
                    }}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={closeSnackbar}>
                <Alert onClose={closeSnackbar} severity={snackbar.severity} className="preset-selector__alert">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default PresetSelector;