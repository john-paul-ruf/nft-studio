import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    IconButton,
    Divider
} from '@mui/material';
import { Close, FolderOpen } from '@mui/icons-material';
import useDebounce from '../hooks/useDebounce.js';

/**
 * ProjectSettingsDialog - Edit project settings using ProjectState as single source of truth
 * Follows event-driven architecture and single responsibility principle
 */
export default function ProjectSettingsDialog({
    open,
    onClose,
    projectState,
    currentTheme
}) {
    const [formData, setFormData] = useState({
        projectName: '',
        artist: '',
        outputDirectory: ''
    });

    // Initialize form data from ProjectState when dialog opens
    useEffect(() => {
        if (open && projectState) {
            const state = projectState.getState();
            setFormData({
                projectName: state.projectName || '',
                artist: state.artist || '',
                outputDirectory: state.outputDirectory || ''
            });
        }
    }, [open, projectState]);

    // Debounced input handler (300ms delay)
    const debouncedInputChange = useDebounce((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, 300);

    const handleInputChange = (field, value) => {
        // Update immediately for display
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Debounce the actual state update
        debouncedInputChange(field, value);
    };

    const handleSelectOutputDirectory = async () => {
        try {
            const result = await window.api.selectDirectory({
                defaultPath: formData.outputDirectory || undefined,
                properties: ['openDirectory']
            });

            if (!result.canceled && result.filePaths?.[0]) {
                handleInputChange('outputDirectory', result.filePaths[0]);
            }
        } catch (error) {
            console.error('Error selecting output directory:', error);
        }
    };

    const handleSave = () => {
        if (!projectState) return;

        // Update ProjectState with new values (single source of truth)
        projectState.update({
            projectName: formData.projectName.trim(),
            artist: formData.artist.trim(),
            outputDirectory: formData.outputDirectory.trim() || null
        });

        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    const isFormValid = formData.projectName.trim().length > 0;

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: currentTheme?.palette?.background?.paper || 'background.paper',
                    color: currentTheme?.palette?.text?.primary || 'text.primary'
                }
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pb: 1
                }}
            >
                <Typography variant="h6">Project Settings</Typography>
                <IconButton
                    onClick={handleCancel}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                >
                    <Close />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                        label="Project Name"
                        value={formData.projectName}
                        onChange={(e) => handleInputChange('projectName', e.target.value)}
                        fullWidth
                        required
                        variant="outlined"
                        helperText="Enter a name for your project"
                    />

                    <TextField
                        label="Artist"
                        value={formData.artist}
                        onChange={(e) => handleInputChange('artist', e.target.value)}
                        fullWidth
                        variant="outlined"
                        helperText="Enter the artist name"
                    />

                    <Box>
                        <TextField
                            label="Output Directory"
                            value={formData.outputDirectory}
                            onChange={(e) => handleInputChange('outputDirectory', e.target.value)}
                            fullWidth
                            variant="outlined"
                            helperText="Directory where rendered files will be saved"
                            InputProps={{
                                endAdornment: (
                                    <IconButton
                                        onClick={handleSelectOutputDirectory}
                                        edge="end"
                                        sx={{ mr: 1 }}
                                    >
                                        <FolderOpen />
                                    </IconButton>
                                )
                            }}
                        />
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button
                    onClick={handleCancel}
                    color="inherit"
                    variant="outlined"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    color="primary"
                    variant="contained"
                    disabled={!isFormValid}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}