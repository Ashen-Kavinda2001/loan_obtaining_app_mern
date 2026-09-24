import axios from 'axios';

// In production or browser, use relative '/api' so requests always match the exact host
// (fgiloans.lk or www.fgiloans.lk) without CORS preflights or cross-origin restrictions.
const getBaseURL = () => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  }
  return '/api';
};

const client = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Enables browser to automatically transmit HttpOnly session cookies
  timeout: 30000,        // 30-second safety timeout
});

// Automatically attach Bearer token from localStorage (works across all browsers, PWAs, & devices)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('fgi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect if 401 is received on protected operational calls,
// and auto-retry once on HTTP 408 / cold-start timeouts
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Auto-retry once if server returned 408 Request Timeout (handles LiteSpeed wake-up & stale sockets)
    if (config && !config._retry && (error.response?.status === 408 || error.code === 'ECONNABORTED')) {
      config._retry = true;
      await new Promise((resolve) => setTimeout(resolve, 800));
      return client(config);
    }

    const isAuthCheck = error.config?.url?.includes('/auth/me');
    const isCredentialUpdate = error.config?.url?.includes('/auth/update-credentials');
    const isLoginCall = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isCredentialUpdate && !isAuthCheck && !isLoginCall) {
      localStorage.removeItem('fgi_token');
      localStorage.removeItem('fgi_user');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default client;
