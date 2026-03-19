import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  server: {
    // COEP/COOP removed — these headers break mobile browsers via the service worker.
    // They are now scoped only to /ai-setup in netlify.toml where SharedArrayBuffer is needed.
  },
  build: {
    rollupOptions: {
      external: ['@mlc-ai/web-llm'],
      // No manualChunks needed — React.lazy() in App.jsx handles code splitting automatically
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', '*.svg'],
      manifest: {
        name: 'Elimu Learn',
        short_name: 'Elimu',
        description: 'Offline Science Learning for Ugandan Students',
        theme_color: '#0D9488',
        background_color: '#0F172A',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Only precache app shell — NOT curriculum JSON (too large, loaded at runtime)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Raise limit for JS bundles which can be large
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Curriculum JSON: cache on first fetch, serve from cache offline
          {
            urlPattern: /\/curriculum\/.*\.json$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'curriculum-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 }, // 90 days
              cacheableResponse: { statuses: [0, 200] },
            }
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ]
})
