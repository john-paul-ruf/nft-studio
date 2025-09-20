import { createTheme } from '@mui/material';

// App theme definitions with same inspirations as color schemes
export const appThemes = {
    // Original themes
    dark: {
        name: 'Dark',
        palette: {
            mode: 'dark',
            primary: { main: '#4a90e2' },
            secondary: { main: '#ff8c00' },
            background: { default: '#1e1e1e', paper: '#323232' },
            text: { primary: '#fff', secondary: '#888' },
        }
    },
    light: {
        name: 'Light',
        palette: {
            mode: 'light',
            primary: { main: '#4a90e2' },
            secondary: { main: '#ff8c00' },
            background: { default: '#f5f5f5', paper: '#ffffff' },
            text: { primary: '#333', secondary: '#666' },
        }
    },

    // New Cool App Themes
    'neon-underground': {
        name: 'Neon Underground',
        palette: {
            mode: 'dark',
            primary: { main: '#00FF00' },
            secondary: { main: '#33FF33' },
            background: { default: '#000000', paper: '#001100' },
            text: { primary: '#00FF00', secondary: '#66FF66' },
            divider: '#002200',
            action: { hover: '#002200' },
        }
    },
    'mystic-ritual': {
        name: 'Mystic Ritual',
        palette: {
            mode: 'dark',
            primary: { main: '#9370DB' },
            secondary: { main: '#BA55D3' },
            background: { default: '#1a0033', paper: '#2d1b69' },
            text: { primary: '#E6E6FA', secondary: '#D8BFD8' },
            divider: '#301934',
            action: { hover: '#4B0082' },
        }
    },
    'street-canvas': {
        name: 'Street Canvas',
        palette: {
            mode: 'light',
            primary: { main: '#FF1493' },
            secondary: { main: '#FF4500' },
            background: { default: '#F5F5F5', paper: '#FFFFFF' },
            text: { primary: '#2C1810', secondary: '#654321' },
            divider: '#E0E0E0',
            action: { hover: '#FFE4E1' },
        }
    },
    'bass-drop': {
        name: 'Bass Drop',
        palette: {
            mode: 'dark',
            primary: { main: '#0080FF' },
            secondary: { main: '#FF0080' },
            background: { default: '#000000', paper: '#1a1a2e' },
            text: { primary: '#F0F8FF', secondary: '#A0A4A8' },
            divider: '#16213e',
            action: { hover: '#0f3460' },
        }
    },
    'vapor-dreams': {
        name: 'Vapor Dreams',
        palette: {
            mode: 'dark',
            primary: { main: '#FF1493' },
            secondary: { main: '#00FFFF' },
            background: { default: '#2D1B69', paper: '#4B0082' },
            text: { primary: '#FFF0F5', secondary: '#FFE4E1' },
            divider: '#483D8B',
            action: { hover: '#191970' },
        }
    }
};

export const createAppTheme = (themeKey = 'dark') => {
    const themeConfig = appThemes[themeKey] || appThemes.dark;

    return createTheme({
        palette: themeConfig.palette,
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
                        backgroundColor: themeConfig.palette.background.paper,
                        borderBottom: `1px solid ${themeConfig.palette.divider || (themeConfig.palette.mode === 'dark' ? '#444' : '#e0e0e0')}`,
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundColor: themeConfig.palette.background.paper,
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: themeConfig.palette.background.paper,
                    },
                },
            },
        },
    });
};