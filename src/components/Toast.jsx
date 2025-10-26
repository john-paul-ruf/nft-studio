import React from 'react';
import { Snackbar, Alert } from '@mui/material';

/**
 * Toast notification component
 * Displays success and error messages from the application
 */
function Toast({ notification, onClose }) {
    if (!notification) {
        return null;
    }

    return (
        <Snackbar
            open={notification.open}
            autoHideDuration={notification.type === 'error' ? 7000 : 5000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert
                onClose={onClose}
                severity={notification.type}
                variant="filled"
                sx={{
                    width: '100%',
                    boxShadow: 2
                }}
            >
                {notification.message}
            </Alert>
        </Snackbar>
    );
}

export default Toast;