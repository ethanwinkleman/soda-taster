import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { isChunkLoadError, reloadOnce } from './lib/chunkRecovery'

// A tab left open across a deploy asks for chunk filenames that no longer exist.
// These two listeners cover dynamic imports React is not managing; route chunks
// are handled in lazyWithRetry, because React converts a lazy import's rejection
// into an error-boundary throw and it never reaches either of these.
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
