import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { isChunkLoadError, recoverOnce } from './lib/chunkRecovery'
import { installUpdateChecks } from './lib/appUpdate'
import { installErrorReporting } from './lib/errorReporter'

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

// Reports what breaks. Chunk-load failures are filtered out inside: those are already
// self-healing above, and they would otherwise fill the log on every deploy.
installErrorReporting();

// The splash covers the window before this bundle existed. Retire it only after React
// has actually painted, or the screen goes blank again between the two.
function dismissBootSplash() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    boot.classList.add('boot-done');
    boot.addEventListener('transitionend', () => boot.remove(), { once: true });
    // A tab in the background gets no transitionend, so it would linger forever.
    setTimeout(() => boot.remove(), 600);
  }));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Analytics />
  </StrictMode>,
)

dismissBootSplash();
