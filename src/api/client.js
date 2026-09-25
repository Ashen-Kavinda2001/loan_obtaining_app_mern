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

    // Auto-retry up to 2 times with progressive delay if request failed due to server cold start,
    // closed keep-alive socket (LiteSpeed timeout), 408 Request Timeout, or temporary 502/504 gateway error
    const isStaleSocketOrNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ECONNRESET' ||
      error.response?.status === 408 ||
      error.response?.status === 502 ||
      error.response?.status === 504;

    const isLoginCall = error.config?.url?.includes('/auth/login');

    config._retryCount = config._retryCount || 0;
    const MAX_RETRIES = 2;

    if (config && config._retryCount < MAX_RETRIES && isStaleSocketOrNetworkError && !isLoginCall) {
      config._retryCount += 1;
      // Progressive wait (1s, then 2.5s) to allow cPanel Passenger & MySQL enough time to boot
      const delay = config._retryCount === 1 ? 1000 : 2500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return client(config);
    }

    const isAuthCheck = error.config?.url?.includes('/auth/me');
    const isCredentialUpdate = error.config?.url?.includes('/auth/update-credentials');

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
