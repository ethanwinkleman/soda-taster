import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { isChunkLoadError, recoverOnce } from './lib/chunkRecovery'
import { installUpdateChecks } from './lib/appUpdate'

// A tab left open across a deploy asks for chunk filenames that no longer exist.
// These two listeners cover dynamic imports React is not managing; route chunks
// are handled in lazyWithRetry, because React converts a lazy import's rejection
// into an error-boundary throw and it never reaches either of these.
window.addEventListener('error', (e) => {
  if (isChunkLoadError(e.message)) void recoverOnce();
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason instanceof Error ? e.reason.message : String(e.reason ?? '');
  if (isChunkLoadError(msg)) void recoverOnce();
});

// Checks for a new build when the app comes back to the foreground, and applies one
// the moment doing so will not throw away something the user is typing. Registering on
// page load — all the generated registration does — never fires again for an installed
// PWA resumed from the app switcher, which is what made force-quitting the only way to
// get the latest version.
installUpdateChecks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Analytics />
  </StrictMode>,
)
