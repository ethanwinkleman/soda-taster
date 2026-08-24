import { lazy, type ComponentType } from 'react';

/**
 * Recovering from a stale route chunk.
 *
 * Chunk filenames are content-hashed, and a tab only learns the current ones when it
 * loads index.html. Single-page navigation never refetches that, so a tab left open
 * across a deploy goes on asking for names the server has replaced. On a phone, where
 * tabs survive for days, that is most of the time.
 *
 * There was already recovery for this in main.tsx, listening on window 'error' and
 * 'unhandledrejection'. It could never fire for the case it was written for: React
 * catches a lazy import's rejection itself and re-throws it into the nearest error
 * boundary, so it never surfaces as either window event. What the user saw instead was
 * the boundary's "Something went wrong" screen with the MIME message printed under it.
 *
 * So the retry lives in three places that can actually see the failure:
 *   - lazyWithRetry, which catches the rejection before handing it back to React
 *   - the error boundary, as a backstop for anything else that imports at runtime
 *   - the window listeners, still useful for non-React dynamic imports
 *
 * All of them share one matcher and one guard, so a single reload is spent no matter
 * which path notices first.
 */

/** Browsers disagree on the wording; this covers what they actually emit. */
export function isChunkLoadError(message: string | undefined | null): boolean {
  if (!message) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /is not a valid JavaScript MIME type/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  );
}

const RELOAD_KEY = 'reload-on-chunk-error';
/**
 * Long enough that a reload which lands on the same broken build does not
 * immediately try again, short enough that a later genuine deploy still recovers.
 */
const GUARD_MS = 10_000;

/** Spend the one-reload budget. False means it was already spent. */
export function claimReloadBudget(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return false;
    sessionStorage.setItem(RELOAD_KEY, '1');
    setTimeout(() => {
      try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* storage gone */ }
    }, GUARD_MS);
    return true;
  } catch {
    // Private mode or storage disabled: fail closed rather than reload unguarded.
    return false;
  }
}

/**
 * Throw away everything this origin has cached, and the worker serving it.
 *
 * A plain reload could not fix this. While the SPA rewrite was answering missing
 * chunks with index.html and a 200, those HTML bodies were cacheable and got stored
 * under .js URLs. A cache entry that claims to be a script and is actually a document
 * survives every reload, which is why the app failed in a normal window and worked in
 * a private one — the private window simply had none of it.
 *
 * Unregistering the worker matters as much as emptying the caches: leaving it
 * installed means it can serve the same poisoned entries straight back. The next load
 * installs a clean one.
 *
 * Every step is best-effort. Recovery must not be the thing that throws.
 */
export async function purgeOrigin(): Promise<void> {
  try {
    if ('caches' in globalThis) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* storage partitioned or unavailable */ }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* no worker, or already gone */ }
}

/**
 * Recover once: empty the caches, drop the worker, reload.
 *
 * Returns whether it actually started recovering, so callers can decide what to
 * render while the document is being replaced.
 */
export async function recoverOnce(): Promise<boolean> {
  if (!claimReloadBudget()) return false;
  await purgeOrigin();
  window.location.reload();
  return true;
}

/**
 * The retry itself, separated from React so it can be tested directly. `reload` is
 * injectable for that reason and defaults to the guarded reload above.
 */
export async function loadChunk<T>(
  factory: () => Promise<T>,
  recover: () => boolean | Promise<boolean> = recoverOnce,
): Promise<T> {
  try {
    return await factory();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (!isChunkLoadError(message)) throw error;   // a real bug in the module, not a stale build
    if (!(await recover())) throw error;           // already spent our one attempt

    // The reload replaces the document. A promise that never settles keeps Suspense
    // showing its fallback until that happens, rather than flashing an error screen
    // the reload would discard a moment later.
    return new Promise<never>(() => {});
  }
}

/**
 * Drop-in for React.lazy that survives a deploy.
 *
 * Catches the import rejection here, before it is handed back to React — which is the
 * only place it can be caught, since React turns it into a boundary throw rather than
 * an unhandled rejection.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches React.lazy's own constraint
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() => loadChunk(factory));
}
