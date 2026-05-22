import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// When the user has an old tab open and a new version deploys, lazy-loaded
// chunks under their previous filenames stop existing. The browser then
// reports "text/html is not a valid JavaScript MIME type" (because the SW
// served index.html instead of the missing JS chunk). Detect that and reload
// once so the client picks up the new chunk names.
function isChunkLoadError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /is not a valid JavaScript MIME type/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message)
  );
}

function reloadOnce() {
  const key = 'reload-on-chunk-error';
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  setTimeout(() => sessionStorage.removeItem(key), 10_000);
  window.location.reload();
}

window.addEventListener('error', (e) => {
  if (isChunkLoadError(e.message)) reloadOnce();
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason instanceof Error ? e.reason.message : String(e.reason ?? '');
  if (isChunkLoadError(msg)) reloadOnce();
});

// When a new service worker takes control (skipWaiting + clientsClaim), reload
// the page so the browser fetches the new JS chunk filenames. This makes every
// deployment apply silently — no manual reload or force-quit needed.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Analytics />
  </StrictMode>,
)
