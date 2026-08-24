import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // og.png is fetched by link-preview scrapers, never by the app — precaching it
        // would put 350 KB into every install for nothing.
        globIgnores: ['**/og.png'],
        navigateFallback: '/index.html',
        // Never fall back to index.html for asset / API requests — that's what
        // caused "text/html is not a valid JavaScript MIME type" when a stale
        // client requested a chunk filename that no longer exists.
        navigateFallbackDenylist: [/^\/__/, /^\/api/, /^\/assets\//, /\.\w+$/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Soda photos from Supabase storage — cache-first so they render offline
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'soda-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
        ],
      },
      manifest: {
        name: 'Soda Taster',
        short_name: 'Soda Taster',
        description: "The soda enthusiast's journal. Rate every soda you try, build unlimited shared collections, and track your fridge inventory.",
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#15101c',
        theme_color: '#ff3d78',
        categories: ['food', 'lifestyle', 'utilities'],
        icons: [
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: '/icon-192.png',         sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png',         sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
