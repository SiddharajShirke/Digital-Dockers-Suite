import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            try {
                // Remove legacy token if it exists
                localStorage.removeItem('token');

                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }

                // Verify session with backend if we expected to be logged in, or check anyway
                const res = await api.get('/auth/me');
                if (res.data) {
                    setUser(res.data);
                    localStorage.setItem('user', JSON.stringify(res.data));
                }
            } catch (error) {
                // If 401, it just means no active session, which is normal for initial load.
                if (error.response?.status !== 401) {
                    console.error('Session check failed', error);
                } else {
                    console.log('No active session found (normal for first-time visitors)');
                }
                localStorage.removeItem('user');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            const userData = { ...res.data };
            delete userData.token;
            // Token is handled via HttpOnly cookie
            localStorage.setItem('user', JSON.stringify(userData)); // Save user data
            setUser(userData);
            return userData;
        } catch (error) {
            throw error.response?.data?.message || 'Login failed';
        }
    };

    const register = async (userData) => {
        try {
            const res = await api.post('/auth/register', userData);
            const user = { ...res.data };
            delete user.token;
            // Token is handled via HttpOnly cookie
            localStorage.setItem('user', JSON.stringify(user)); // Save user data
            setUser(user);
            return user;
        } catch (error) {
            throw error.response?.data?.message || 'Registration failed';
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error', error);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const setUserFromGoogle = useCallback((userData) => {
        localStorage.removeItem('token');
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, setUserFromGoogle }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
