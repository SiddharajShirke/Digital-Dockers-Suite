import { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

const ThemeContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useThemeMode = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [mode, setMode] = useState(() => {
        const savedMode = localStorage.getItem('themeMode');
        return savedMode || 'light';
    });

    useEffect(() => {
        localStorage.setItem('themeMode', mode);
    }, [mode]);

    // Sync 'dark' class on the root element so CSS .dark overrides work
    useEffect(() => {
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [mode]);

    const toggleTheme = () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    };

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    ...(mode === 'light'
                        ? {
                            // Light mode colors (Premium Indigo)
                            primary: {
                                main: '#4f46e5', // Indigo 600
                                light: '#818cf8',
                                dark: '#3730a3',
                                contrastText: '#FFFFFF',
                            },
                            secondary: {
                                main: '#ec4899', // Pink 500 (Vibrant accent)
                                light: '#f472b6',
                                dark: '#db2777',
                            },
                            background: {
                                default: '#f8fafc', // Slate 50
                                paper: '#ffffff',
                            },
                            text: {
                                primary: '#0f172a', // Slate 900
                                secondary: '#64748b', // Slate 500
                            },
                            divider: '#e2e8f0',
                        }
                        : {
                            // Dark mode colors (Deep Space)
                            primary: {
                                main: '#818cf8', // Indigo 400
                                light: '#a5b4fc',
                                dark: '#4338ca',
                                contrastText: '#0f172a',
                            },
                            secondary: {
                                main: '#f472b6', // Pink 400
                                light: '#fbcfe8',
                                dark: '#be185d',
                            },
                            background: {
                                default: '#0f172a', // Slate 900
                                paper: '#1e293b', // Slate 800
                            },
                            text: {
                                primary: '#f1f5f9', // Slate 100
                                secondary: '#94a3b8', // Slate 400
                            },
                            divider: '#334155',
                        }),
                },
                typography: {
                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    h4: {
                        fontSize: '1.75rem',
                        fontWeight: 600,
                        lineHeight: 1.4,
                    },
                    h5: {
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        lineHeight: 1.5,
                    },
                    h6: {
                        fontSize: '1rem',
                        fontWeight: 600,
                        lineHeight: 1.5,
                    },
                    body1: {
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                    },
                    body2: {
                        fontSize: '0.875rem',
                        lineHeight: 1.43,
                    },
                    button: {
                        textTransform: 'none',
                        fontWeight: 500,
                    },
                },
                shape: {
                    borderRadius: 3,
                },
                shadows: [
                    'none',
                    mode === 'light'
                        ? '0px 1px 1px rgba(9, 30, 66, 0.25), 0px 0px 1px rgba(9, 30, 66, 0.31)'
                        : '0px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(0, 0, 0, 0.4)',
                    mode === 'light'
                        ? '0px 2px 4px rgba(9, 30, 66, 0.25), 0px 0px 1px rgba(9, 30, 66, 0.31)'
                        : '0px 2px 4px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(0, 0, 0, 0.4)',
                    ...Array(22).fill(mode === 'light'
                        ? '0px 4px 8px rgba(9, 30, 66, 0.2), 0px 0px 1px rgba(9, 30, 66, 0.31)'
                        : '0px 4px 8px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(0, 0, 0, 0.4)'),
                ],
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                borderRadius: 3,
                                fontWeight: 500,
                                padding: '8px 12px',
                            },
                            contained: {
                                boxShadow: 'none',
                                '&:hover': {
                                    boxShadow: mode === 'light'
                                        ? '0px 2px 4px rgba(9, 30, 66, 0.25)'
                                        : '0px 2px 4px rgba(0, 0, 0, 0.5)',
                                },
                            },
                        },
                    },
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                borderRadius: 3,
                                backgroundImage: 'none',
                            },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                            },
                        },
                    },
                },
            }),
        [mode]
    );

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <MuiThemeProvider theme={theme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
