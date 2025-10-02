/**
 * EffectFormRenderer Component
 * 
 * Responsible for rendering effect configuration forms.
 * Extracted from EffectConfigurer as part of god object decomposition.
 * 
 * Responsibilities:
 * - Render configuration form fields
 * - Display loading states
 * - Handle form field changes
 * - Integrate with ConfigInputFactory
 */

import React from 'react';
import ConfigInputFactory from '../effects/inputs/ConfigInputFactory.jsx';
import {
    Box,
    Paper,
    Typography,
    Stack,
    CircularProgress,
    useTheme
} from '@mui/material';

/**
 * Renders the configuration form for an effect
 * 
 * @param {Object} props - Component props
 * @param {Object} props.configSchema - The configuration schema with fields
 * @param {Object} props.effectConfig - Current effect configuration values
 * @param {Function} props.onConfigChange - Callback when config field changes
 * @param {Object} props.projectState - Current project state
 * @returns {JSX.Element} The rendered form
 */
function EffectFormRenderer({
    configSchema,
    effectConfig,
    onConfigChange,
    projectState
}) {
    const theme = useTheme();

    // Show loading state if schema is not yet loaded
    if (!configSchema || !configSchema.fields || configSchema.fields.length === 0) {
        return (
            <Box mt={3}>
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        textAlign: 'center',
                        backgroundColor: theme.palette.action.hover,
                        border: `1px dashed ${theme.palette.divider}`,
                        borderRadius: 2,
                        minHeight: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <CircularProgress
                        size={48}
                        sx={{
                            mb: 3,
                            color: theme.palette.primary.main
                        }}
                    />
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        Loading Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Analyzing effect properties...
                    </Typography>
                </Paper>
            </Box>
        );
    }

    // Render the form fields
    return (
        <Box mt={3}>
            <Stack spacing={2}>
                {configSchema.fields.map(field => (
                    <ConfigInputFactory
                        key={field.name}
                        field={field}
                        value={effectConfig[field.name]}
                        onChange={onConfigChange}
                        projectState={projectState}
                    />
                ))}
            </Stack>
        </Box>
    );
}

export default EffectFormRenderer;