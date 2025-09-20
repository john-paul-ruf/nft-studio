import { createTheme } from '@mui/material';

// App theme definitions - Professional & Reduced Contrast
export const appThemes = {
    dark: {
        name: 'Dark',
        palette: {
            mode: 'dark',
            primary: { main: '#5a8bb5', contrastText: '#ffffff' },
            secondary: { main: '#d4977b', contrastText: '#ffffff' },
            background: { default: '#1a1a1a', paper: '#2a2a2a' },
            text: { primary: '#e0e0e0', secondary: '#a0a0a0' },
            divider: '#404040',
            action: { hover: '#353535' },
            success: { main: '#5d9c5d', contrastText: '#ffffff' },
            warning: { main: '#d49c3d', contrastText: '#ffffff' },
            error: { main: '#c76161', contrastText: '#ffffff' },
            info: { main: '#5a8bb5', contrastText: '#ffffff' },
        }
    },
    light: {
        name: 'Light',
        palette: {
            mode: 'light',
            primary: { main: '#4a7ba7', contrastText: '#ffffff' },
            secondary: { main: '#a67c52', contrastText: '#ffffff' },
            background: { default: '#fafafa', paper: '#f5f5f5' },
            text: { primary: '#2a2a2a', secondary: '#606060' },
            divider: '#d0d0d0',
            action: { hover: '#eeeeee' },
            success: { main: '#5a9e5a', contrastText: '#ffffff' },
            warning: { main: '#cc9543', contrastText: '#ffffff' },
            error: { main: '#b85555', contrastText: '#ffffff' },
            info: { main: '#4a7ba7', contrastText: '#ffffff' },
        }
    },
    cyberpunk: {
        name: 'Cyberpunk',
        palette: {
            mode: 'dark',
            primary: { main: '#6a7fdb', contrastText: '#ffffff' },
            secondary: { main: '#8b7cf6', contrastText: '#ffffff' },
            background: { default: '#151520', paper: '#1f1f2e' },
            text: { primary: '#e8f0ff', secondary: '#b8c5d6' },
            divider: '#2a2a40',
            action: { hover: '#252538' },
            success: { main: '#5dd45d', contrastText: '#000000' },
            warning: { main: '#ffa726', contrastText: '#000000' },
            error: { main: '#f06292', contrastText: '#ffffff' },
            info: { main: '#42a5f5', contrastText: '#ffffff' },
        }
    }
};

export const createAppTheme = (themeKey = 'dark') => {
    const themeConfig = appThemes[themeKey] || appThemes['dark'];

    const theme = createTheme({
        palette: themeConfig.palette,
        typography: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
            h1: { fontWeight: 600 },
            h2: { fontWeight: 600 },
            h3: { fontWeight: 600 },
            h4: { fontWeight: 600 },
            h5: { fontWeight: 600 },
            h6: { fontWeight: 600 },
            button: { fontWeight: 500 },
        },
        shape: {
            borderRadius: 6,
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        // CSS custom properties for dynamic theming
                        '--primary-main': themeConfig.palette.primary.main,
                        '--secondary-main': themeConfig.palette.secondary.main,
                        '--background-default': themeConfig.palette.background.default,
                        '--background-paper': themeConfig.palette.background.paper,
                        '--text-primary': themeConfig.palette.text.primary,
                        '--text-secondary': themeConfig.palette.text.secondary,
                        '--divider': themeConfig.palette.divider || (themeConfig.palette.mode === 'dark' ? '#424242' : '#e0e0e0'),
                        '--success-main': themeConfig.palette.success?.main || '#28A745',
                        '--warning-main': themeConfig.palette.warning?.main || '#FFC107',
                        '--error-main': themeConfig.palette.error?.main || '#DC3545',
                        '--info-main': themeConfig.palette.info?.main || '#17A2B8',
                        '--action-hover': themeConfig.palette.action?.hover || (themeConfig.palette.mode === 'dark' ? '#2C2C2C' : '#F5F5F5'),
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        borderRadius: 6,
                        fontWeight: 500,
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        },
                    },
                    contained: {
                        '&:hover': {
                            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                        },
                    },
                },
            },
            MuiSelect: {
                styleOverrides: {
                    root: {
                        fontSize: '14px',
                    },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 6,
                        },
                    },
                },
            },
            MuiToolbar: {
                styleOverrides: {
                    root: {
                        backgroundColor: themeConfig.palette.background.paper,
                        borderBottom: `1px solid ${themeConfig.palette.divider || (themeConfig.palette.mode === 'dark' ? '#424242' : '#e0e0e0')}`,
                        minHeight: '48px !important',
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundColor: themeConfig.palette.background.paper,
                        backgroundImage: 'none',
                    },
                    elevation1: {
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                    },
                    elevation2: {
                        boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: themeConfig.palette.background.paper,
                        color: themeConfig.palette.text.primary,
                        boxShadow: `0 1px 0 ${themeConfig.palette.divider || (themeConfig.palette.mode === 'dark' ? '#424242' : '#e0e0e0')}`,
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 4,
                        fontWeight: 500,
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                        '&:hover': {
                            backgroundColor: themeConfig.palette.action?.hover || (themeConfig.palette.mode === 'dark' ? '#2C2C2C' : '#F5F5F5'),
                        },
                    },
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                        margin: '2px 4px',
                        '&:hover': {
                            backgroundColor: themeConfig.palette.action?.hover || (themeConfig.palette.mode === 'dark' ? '#2C2C2C' : '#F5F5F5'),
                        },
                        '&.Mui-selected': {
                            backgroundColor: `${themeConfig.palette.primary.main}20`,
                            '&:hover': {
                                backgroundColor: `${themeConfig.palette.primary.main}30`,
                            },
                        },
                    },
                },
            },
        },
    });

    return theme;
};