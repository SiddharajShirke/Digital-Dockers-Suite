import axios from 'axios';

// Use environment variable for production, fallback to localhost:5001 for local dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// We keep request interceptor for logging or other custom headers, but token is in cookie
api.interceptors.request.use(
    (config) => {
        // Token is handled via HttpOnly cookie automatically.
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Prevent infinite loops if the logout route itself returns 401
            if (error.config.url !== '/auth/logout') {
                try {
                    await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
                } catch (e) {
                    console.error('Logout failed to clear cookie', e);
                }
            }
            localStorage.removeItem('user');
            
            // Only redirect if not already on login page to prevent looping
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
