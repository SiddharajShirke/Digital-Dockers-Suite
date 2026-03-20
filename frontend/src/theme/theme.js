import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#3B82F6',      // Design system primary blue
            light: '#60A5FA',
            dark: '#2563EB',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#6B7280',      // Neutral gray
            light: '#9CA3AF',
            dark: '#374151',
        },
        success: {
            main: '#10B981',      // Design system success green
            light: '#34D399',
            dark: '#059669',
        },
        warning: {
            main: '#F59E0B',      // Design system warning amber
            light: '#FCD34D',
            dark: '#D97706',
        },
        error: {
            main: '#EF4444',      // Design system danger red
            light: '#F87171',
            dark: '#DC2626',
        },
        info: {
            main: '#3B82F6',
            light: '#60A5FA',
            dark: '#2563EB',
        },
        background: {
            default: '#F4F5F7',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#172B4D',
            secondary: '#6B7280',
            disabled: '#9CA3AF',
        },
        divider: '#E5E7EB',
    },
    typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
            lineHeight: 1.2,
            color: '#172B4D',
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 500,
            lineHeight: 1.3,
            color: '#172B4D',
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 500,
            lineHeight: 1.4,
            color: '#172B4D',
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.4,
            color: '#172B4D',
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.5,
            color: '#172B4D',
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.5,
            color: '#172B4D',
        },
        body1: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
            color: '#172B4D',
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.43,
            color: '#5E6C84',
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 8, // cards/modals = 8px per design system
    },
    shadows: [
        'none',
        '0 1px 3px rgba(0, 0, 0, 0.08)',               // --shadow-sm
        '0 4px 6px rgba(0, 0, 0, 0.1)',                // --shadow-md
        '0 10px 15px rgba(0, 0, 0, 0.1)',              // --shadow-lg
        '0 4px 8px rgba(9, 30, 66, 0.2), 0px 0px 1px rgba(9, 30, 66, 0.31)',
        '0px 5px 10px rgba(9, 30, 66, 0.2), 0px 0px 1px rgba(9, 30, 66, 0.31)',
        '0px 8px 12px rgba(9, 30, 66, 0.15), 0px 0px 1px rgba(9, 30, 66, 0.31)',
        '0px 10px 18px rgba(9, 30, 66, 0.15), 0px 0px 1px rgba(9, 30, 66, 0.31)',
        '0px 12px 24px rgba(9, 30, 66, 0.15), 0px 0px 1px rgba(9, 30, 66, 0.31)',
        ...Array(16).fill('0px 12px 24px rgba(9, 30, 66, 0.15), 0px 0px 1px rgba(9, 30, 66, 0.31)'),
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 6, // --radius-btn
                    fontWeight: 500,
                    padding: '8px 16px',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)',
                    },
                },
                outlined: {
                    borderWidth: '1px',
                    '&:hover': {
                        borderWidth: '1px',
                        backgroundColor: 'rgba(59, 130, 246, 0.04)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 8, // --radius-md
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)', // --shadow-sm
                    transition: 'box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // --shadow-md
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
                elevation1: {
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                            borderColor: '#DFE1E6',
                        },
                        '&:hover fieldset': {
                            borderColor: '#B3BAC5',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#0052CC',
                            borderWidth: '2px',
                        },
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 3,
                    fontWeight: 500,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 1px 0px rgba(9, 30, 66, 0.13)',
                },
            },
        },
    },
});

export default theme;
