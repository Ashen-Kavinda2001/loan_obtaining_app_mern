import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'FGI Loan Management System',
        short_name: 'FGI Loans',
        description: 'Admin portal for FGI Loan Management System',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Immediately activate updated service worker on client tabs
        skipWaiting: true,
        clientsClaim: true,
        // Cache all static build assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // ── Runtime Caching Strategy ──────────────────────────────────────────
        runtimeCaching: [
          {
            // CRITICAL: All API routes must NEVER be cached or handled by SW
            // Financial data (loans, payments, members) must always be live across all host variants
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkOnly',
            options: { cacheName: 'api-no-cache' },
          },
          {
            // Google Fonts — cache for performance
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        // SPA navigation fallback — ensures React Router routes load correctly on mobile
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/api\//],
      },
      devOptions: {
        enabled: false, // Disable SW in dev to avoid caching issues during development
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
});

