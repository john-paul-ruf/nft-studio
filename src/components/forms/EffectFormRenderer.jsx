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
    Typography,
    CircularProgress
} from '@mui/material';
import './effect-form.bem.css';

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
    // Show loading state if schema is not yet loaded
    if (!configSchema || !configSchema.fields || configSchema.fields.length === 0) {
        return (
            <Box className="effect-form effect-form--loading">
                <Box className="effect-form__loading-container">
                    <CircularProgress
                        size={48}
                        className="effect-form__loading-spinner"
                    />
                    <Typography variant="h6" className="effect-form__loading-title">
                        Loading Configuration
                    </Typography>
                    <Typography variant="body2" className="effect-form__loading-subtitle">
                        Analyzing effect properties...
                    </Typography>
                </Box>
            </Box>
        );
    }

    // Render the form fields
    return (
        <Box className="effect-form">
            <Box className="effect-form__fields">
                {configSchema.fields.map(field => (
                    <ConfigInputFactory
                        key={field.name}
                        field={field}
                        value={effectConfig[field.name]}
                        onChange={onConfigChange}
                        projectState={projectState}
                    />
                ))}
            </Box>
        </Box>
    );
}

export default EffectFormRenderer;