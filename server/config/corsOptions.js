/**
 * Production CORS configuration.
 *
 * Reflects request origin so credentials: true (cookies & Bearer) works seamlessly
 * across all client devices (desktop browsers, tablet browsers, mobile tabs, PWAs,
 * WebViews, https://fgiloans.lk, and https://www.fgiloans.lk).
 */

const corsOptions = {
  origin: (origin, callback) => {
    // Reflect origin to allow any valid client (including origin: null from mobile PWAs/webviews)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 86400, // 24 hours preflight cache
};

module.exports = corsOptions;
