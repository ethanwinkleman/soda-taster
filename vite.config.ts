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
        // Explicitly off. vite-plugin-pwa defaults this to 'index.html' and merges
        // with Object.assign, so omitting the key is not enough — the default comes
        // back and registers its route *before* ours, which would win.
        //
        // navigateFallback registers a *precache* route for the shell, so
        // every navigation is served the index.html captured at install time — which
        // names the chunk filenames of that build. A client on an old service worker
        // therefore reloads into the same dead chunk names it just failed on, and
        // stays pinned to a build that no longer exists on the server. Reloading is
        // the user's only recovery, and it was the one thing that could not work.
        //
        // The navigation handler below replaces it: network first, so a reload always
        // learns the current chunk names, with the cached shell kept for offline.
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/__/, /^\/api/, /^\/assets\//, /\.\w+$/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // The app shell. Network first so a deploy is picked up on the next
            // navigation rather than whenever the service worker happens to update.
            // The 3s timeout keeps a slow or offline network from stalling the app —
            // it falls back to the last shell that loaded, which is what makes the
            // PWA still open on a plane.
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
              // Offline, or slower than 3s: serve the precached shell. index.html is
              // in the precache from globPatterns regardless of navigateFallback, so
              // a deep link that has never been opened offline still resolves — which
              // is what navigateFallback used to provide, without pinning the online
              // path to an install-time copy.
              precacheFallback: { fallbackURL: '/index.html' },
              cacheableResponse: { statuses: [200] },
            },
          },
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
