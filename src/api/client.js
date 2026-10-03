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
  // 45s — intentionally LONGER than Sequelize's 15s acquire timeout.
  // If a request fails at ~15s with a JSON 503 error → DB pool problem.
  // If a request hangs the full 45s with no response → proxy/Passenger problem.
  timeout: 45000,
});

// HTTP/2 workaround: the host's LiteSpeed does not pass request BODIES to Node over HTTP/2 (which
// phones use), so such requests hang until the 45 s timeout. Requests without a body pass, so small
// JSON payloads travel base64url-encoded in the X-Body header instead (server/middleware/headerBody.js).
// Larger payloads still go as a normal body. Remove both parts once the host fixes HTTP/2 bodies.
const WRITE_METHODS = ['post', 'put', 'patch', 'delete'];
const MAX_HEADER_BODY = 6000; // characters, well under typical 8–16 KB header limits

const toBase64Url = (text) => {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte); // UTF-8 safe (Sinhala names)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

// Automatically attach Bearer token from localStorage (works across all browsers, PWAs, & devices)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('fgi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (WRITE_METHODS.includes((config.method || 'get').toLowerCase()) && isPlainObject(config.data)) {
    const encoded = toBase64Url(JSON.stringify(config.data));
    if (encoded.length <= MAX_HEADER_BODY) {
      config.headers['X-Body'] = encoded;
      config.data = undefined;
    }
  }
  return config;
});

// Auto-redirect if 401 is received on protected operational calls,
// and auto-retry once on HTTP 408 / cold-start timeouts
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Auto-retry once if request failed due to closed keep-alive socket (LiteSpeed timeout while user typed),
    // network blip, 408 Request Timeout, or temporary gateway error
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

    // Only auto-retry on safe/idempotent methods (GET, HEAD, OPTIONS).
    // NEVER blind-retry POST/PUT/DELETE — the first attempt may have succeeded and
    // only the response was lost, causing double-writes (double loan grants, double payments).
    const isSafeMethod = config.method && ['get', 'head', 'options'].includes(config.method.toLowerCase());

    if (config && !config._retry && isStaleSocketOrNetworkError && !isLoginCall && isSafeMethod) {
      config._retry = true;
      // Prevent double serialization if Axios already stringified the body on the initial attempt
      if (typeof config.data === 'string') {
        try {
          config.data = JSON.parse(config.data);
        } catch {
          // keep as is
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
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
