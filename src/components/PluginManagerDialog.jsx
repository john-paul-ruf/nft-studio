import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Switch,
    TextField,
    Box,
    Typography,
    Tabs,
    Tab,
    Alert,
    CircularProgress,
    Chip,
    Divider,
    Tooltip
} from '@mui/material';
import {
    Delete,
    Add,
    GetApp,
    FolderOpen,
    Extension,
    Check,
    Close,
    Refresh
} from '@mui/icons-material';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`plugin-tabpanel-${index}`}
            aria-labelledby={`plugin-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
        </div>
    );
}

export default function PluginManagerDialog({ open, onClose }) {
    const [plugins, setPlugins] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [npmPackage, setNpmPackage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadPlugins = useCallback(async () => {
        try {
            setLoading(true);
            const result = await window.api.plugins.getAll();
            if (result.success) {
                setPlugins(result.plugins || []);
            } else {
                setError(result.error || 'Failed to load plugins');
            }
        } catch (err) {
            setError('Error loading plugins: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            loadPlugins();
        }
    }, [open, loadPlugins]);

    const handleTogglePlugin = async (pluginName) => {
        try {
            const result = await window.api.plugins.toggle(pluginName);
            if (result.success) {
                await loadPlugins();
                setSuccess(`Plugin ${result.enabled ? 'enabled' : 'disabled'}: ${pluginName}`);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(result.message || 'Failed to toggle plugin');
            }
        } catch (err) {
            setError('Error toggling plugin: ' + err.message);
        }
    };

    const handleRemovePlugin = async (pluginName) => {
        try {
            const result = await window.api.plugins.remove(pluginName);
            if (result.success) {
                await loadPlugins();
                setSuccess(`Plugin removed: ${pluginName}`);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(result.message || 'Failed to remove plugin');
            }
        } catch (err) {
            setError('Error removing plugin: ' + err.message);
        }
    };

    const handleInstallNpmPlugin = async () => {
        if (!npmPackage.trim()) {
            setError('Please enter a package name');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const result = await window.api.plugins.installFromNpm(npmPackage);
            if (result.success) {
                setSuccess(result.message + ' Refreshing effects...');
                setNpmPackage('');
                await loadPlugins();

                // Refresh the effect registry to include the new plugin
                // Pass false to reload plugins since we just installed a new one
                const refreshResult = await window.api.refreshEffectRegistry(false);
                if (refreshResult.success) {
                    setSuccess('Plugin installed and effects refreshed successfully!');
                } else {
                    setSuccess('Plugin installed (refresh effects list to see new effects)');
                }

                setTimeout(() => setSuccess(''), 5000);
            } else {
                setError(result.error || 'Failed to install plugin');
            }
        } catch (err) {
            setError('Error installing plugin: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectLocalPlugin = async () => {
        try {
            const result = await window.api.plugins.selectLocal();
            if (result.success) {
                const pluginData = {
                    name: result.info.name || result.path.split('/').pop(),
                    path: result.path,
                    type: 'local',
                    version: result.info.version,
                    description: result.info.description,
                    enabled: true
                };

                const addResult = await window.api.plugins.add(pluginData);
                if (addResult.success) {
                    setSuccess('Local plugin added successfully. Refreshing effects...');
                    await loadPlugins();

                    // Refresh the effect registry to include the new plugin
                    // Pass false to reload plugins since we just added a new one
                    const refreshResult = await window.api.refreshEffectRegistry(false);
                    if (refreshResult.success) {
                        setSuccess('Plugin added and effects refreshed successfully!');
                    } else {
                        setSuccess('Plugin added (refresh effects list to see new effects)');
                    }

                    setTimeout(() => setSuccess(''), 5000);
                } else {
                    setError(addResult.error || 'Failed to add plugin');
                }
            } else if (!result.canceled) {
                setError(result.error || 'Failed to select plugin');
            }
        } catch (err) {
            setError('Error selecting plugin: ' + err.message);
        }
    };

    const handleRefresh = () => {
        loadPlugins();
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setError('');
        setSuccess('');
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: 'background.paper',
                    minHeight: '600px'
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Extension />
                Plugin Manager
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Refresh plugin list">
                    <IconButton onClick={handleRefresh} size="small">
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
                        {success}
                    </Alert>
                )}

                <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Installed Plugins" />
                    <Tab label="Add Plugin" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : plugins.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ p: 4 }}>
                            No plugins installed. Go to "Add Plugin" tab to install plugins.
                        </Typography>
                    ) : (
                        <List>
                            {plugins.map((plugin) => (
                                <React.Fragment key={plugin.name}>
                                    <ListItem>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {plugin.name}
                                                    {plugin.version && (
                                                        <Chip label={plugin.version} size="small" />
                                                    )}
                                                    {plugin.type && (
                                                        <Chip
                                                            label={plugin.type}
                                                            size="small"
                                                            color={plugin.type === 'npm' ? 'primary' : 'default'}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    {plugin.description && (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {plugin.description}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="caption" color="text.secondary">
                                                        Path: {plugin.path}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Tooltip title={plugin.enabled ? 'Disable plugin' : 'Enable plugin'}>
                                                <Switch
                                                    edge="end"
                                                    checked={plugin.enabled}
                                                    onChange={() => handleTogglePlugin(plugin.name)}
                                                />
                                            </Tooltip>
                                            <Tooltip title="Remove plugin">
                                                <IconButton
                                                    edge="end"
                                                    aria-label="delete"
                                                    onClick={() => handleRemovePlugin(plugin.name)}
                                                    sx={{ ml: 1 }}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Tooltip>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <Divider />
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Install from NPM
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Install a plugin package from the NPM registry
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                <TextField
                                    fullWidth
                                    label="NPM Package Name"
                                    placeholder="e.g., my-nft-effects-plugin"
                                    value={npmPackage}
                                    onChange={(e) => setNpmPackage(e.target.value)}
                                    disabled={loading}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleInstallNpmPlugin();
                                        }
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    startIcon={<GetApp />}
                                    onClick={handleInstallNpmPlugin}
                                    disabled={loading || !npmPackage.trim()}
                                >
                                    Install
                                </Button>
                            </Box>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Add Local Plugin
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Select a local plugin file or directory from your computer
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<FolderOpen />}
                                onClick={handleSelectLocalPlugin}
                                disabled={loading}
                                sx={{ mt: 2 }}
                            >
                                Browse Local Files
                            </Button>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Note: Plugins extend the NFT generation capabilities by adding new effects and features.
                                Make sure to only install plugins from trusted sources.
                            </Typography>
                        </Box>
                    </Box>
                </TabPanel>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}