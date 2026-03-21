import axios from 'axios';

// Use environment variable for production, fallback to localhost:5001 for local dev
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

const isAuthMeRequest = (requestUrl = '') => {
    return requestUrl === '/auth/me' || requestUrl.endsWith('/auth/me');
};

const isPublicPath = (pathname = '') => {
    const publicRoutes = ['/', '/login', '/register', '/auth/google/callback'];
    return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
};

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
            const requestUrl = error.config?.url || '';
            const currentPath = window.location.pathname;
            const authMeRequest = isAuthMeRequest(requestUrl);

            // Prevent infinite loops if the logout route itself returns 401
            if (!authMeRequest && requestUrl !== '/auth/logout') {
                try {
                    await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
                } catch (e) {
                    console.error('Logout failed to clear cookie', e);
                }
            }
            localStorage.removeItem('user');
            
            // Do not force redirect on auth bootstrap (/auth/me) or on public pages.
            if (!authMeRequest && !isPublicPath(currentPath) && !currentPath.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
