import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true, // Enables browser to automatically transmit HttpOnly session cookies
});

// Automatically attach Bearer token from localStorage (works across all browsers, PWAs, & devices)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('fgi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect if 401 is received on protected operational calls
// (do not redirect on initial /auth/me check or /auth/update-credentials validation errors)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCheck = error.config?.url?.includes('/auth/me');
    const isCredentialUpdate = error.config?.url?.includes('/auth/update-credentials');
    const isLoginCall = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isCredentialUpdate && !isAuthCheck && !isLoginCall) {
      localStorage.removeItem('fgi_token');
      localStorage.removeItem('fgi_user');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
