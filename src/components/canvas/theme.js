import { createTheme } from '@mui/material';

export const createAppTheme = (mode) => createTheme({
    palette: {
        mode,
        primary: {
            main: '#4a90e2',
        },
        secondary: {
            main: '#ff8c00',
        },
        background: {
            default: mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
            paper: mode === 'dark' ? '#323232' : '#ffffff',
        },
        text: {
            primary: mode === 'dark' ? '#fff' : '#333',
            secondary: mode === 'dark' ? '#888' : '#666',
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 4,
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    fontSize: '13px',
                },
            },
        },
        MuiToolbar: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark' ? '#323232' : '#ffffff',
                    borderBottom: `1px solid ${mode === 'dark' ? '#444' : '#e0e0e0'}`,
                },
            },
        },
    },
});