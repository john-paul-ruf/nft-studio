/**
 * EffectsPanelErrorBoundary - Phase 5.2
 * 
 * Error boundary component that wraps the refactored EffectsPanel.
 * Catches React errors, Electron/IPC failures, and component crashes.
 * Provides fallback UI and error logging for debugging.
 * 
 * @component
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Typography, Button } from '@mui/material';
import { ErrorOutline, RestartAlt } from '@mui/icons-material';
import './EffectsPanelErrorBoundary.bem.css';

class EffectsPanelErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0,
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        const { logger } = this.props;

        // Increment error count
        this.setState(prev => ({
            error,
            errorInfo,
            errorCount: prev.errorCount + 1,
        }));

        // Log the error
        if (logger && logger.logError) {
            logger.logError(
                'React error in EffectsPanel',
                error,
                {
                    componentStack: errorInfo.componentStack,
                    errorCount: this.state.errorCount + 1,
                }
            );
        } else {
            console.error('EffectsPanel Error:', error, errorInfo);
        }

        // In production, could send error to error tracking service
        if (process.env.NODE_ENV === 'production') {
            // TODO: Send to error tracking service
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleExportLogs = () => {
        const { logger } = this.props;
        if (logger && logger.exportLogs) {
            const logs = logger.exportLogs('json');
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(logs));
            element.setAttribute('download', `effects-panel-logs-${Date.now()}.json`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
    };

    render() {
        const { hasError, error, errorInfo, errorCount } = this.state;
        const { children } = this.props;

        if (hasError) {
            return <FallbackUI 
                error={error}
                errorInfo={errorInfo}
                errorCount={errorCount}
                onReset={this.handleReset}
                onExportLogs={this.handleExportLogs}
            />;
        }

        return children;
    }
}

/**
 * Fallback UI displayed when an error is caught
 */
function FallbackUI({ error, errorInfo, errorCount, onReset, onExportLogs }) {
    return (
        <Box className="error-boundary">
            <Paper className="error-boundary__paper">
                <ErrorOutline className="error-boundary__icon" />

                <Typography variant="h6" className="error-boundary__title">
                    Effects Panel Error
                </Typography>

                <Typography variant="body2" className="error-boundary__description">
                    An unexpected error occurred in the Effects Panel.
                    {errorCount > 1 && ` (Error #${errorCount})`}
                </Typography>

                {error && (
                    <Box className="error-boundary__error-display">
                        <div className="error-boundary__error-label">Error Message:</div>
                        <div className="error-boundary__error-message">
                            {error.toString()}
                        </div>

                        {errorInfo && (
                            <>
                                <div className="error-boundary__stack-label">
                                    Component Stack:
                                </div>
                                <div className="error-boundary__stack-trace">
                                    {errorInfo.componentStack}
                                </div>
                            </>
                        )}
                    </Box>
                )}

                <Box className="error-boundary__actions">
                    <Button
                        variant="contained"
                        size="small"
                        onClick={onReset}
                        className="error-boundary__button-reset"
                        startIcon={<RestartAlt />}
                    >
                        Reset Panel
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={onExportLogs}
                        className="error-boundary__button-export"
                    >
                        Export Logs
                    </Button>
                </Box>

                <Typography variant="caption" className="error-boundary__footer">
                    If the problem persists, try restarting the application.
                </Typography>
            </Paper>
        </Box>
    );
}

FallbackUI.propTypes = {
    error: PropTypes.object,
    errorInfo: PropTypes.object,
    errorCount: PropTypes.number,
    onReset: PropTypes.func.isRequired,
    onExportLogs: PropTypes.func.isRequired,
};

EffectsPanelErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    logger: PropTypes.object,
};

export default EffectsPanelErrorBoundary;