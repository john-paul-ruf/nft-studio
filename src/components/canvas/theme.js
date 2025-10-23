import { createTheme } from '@mui/material';

// App theme definitions - Cyberpunk only
export const appThemes = {
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

export const createAppTheme = (themeKey = 'cyberpunk') => {
    const themeConfig = appThemes[themeKey] || appThemes['cyberpunk'];

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
                    // CSS variables are now managed by CSSThemeContext and styles.css
                    // Don't set inline body styles here - they block CSS variable cascade
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
                        backgroundColor: 'var(--background-paper)',
                        borderBottom: '1px solid var(--divider)',
                        minHeight: '48px !important',
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'var(--background-paper)',
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
                        backgroundColor: 'var(--background-paper)',
                        color: 'var(--text-primary)',
                        boxShadow: '0 1px 0 var(--divider)',
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
                            backgroundColor: 'var(--action-hover)',
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
                            backgroundColor: 'var(--action-hover)',
                        },
                        '&.Mui-selected': {
                            backgroundColor: 'color-mix(in srgb, var(--primary-main) 20%, transparent)',
                            '&:hover': {
                                backgroundColor: 'color-mix(in srgb, var(--primary-main) 30%, transparent)',
                            },
                        },
                    },
                },
            },
        },
    });

    return theme;
};