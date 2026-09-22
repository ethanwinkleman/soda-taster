/**
 * Noticing that a new build exists, and applying it without a force-quit.
 *
 * The busting itself was never the problem: filenames are content-hashed, navigations
 * are network-first, and the worker is generated with skipWaiting + clientsClaim, so a
 * new worker takes over the moment it is found. What was missing is the *finding*.
 *
 * vite-plugin-pwa's generated registration is one line — register on window 'load' — so
 * a page load was the only thing that ever asked whether a new version existed. An
 * installed PWA resumed from the app switcher is not a page load: measured against a
 * real build, an open app saw zero update checks across a deploy, and none on returning
 * to it. It kept running old code until the OS evicted the page, which is exactly why
 * force-quitting was the way to get the latest version.
 *
 * So: check when the app comes back to the foreground, and occasionally while it stays
 * open. Everything after that already existed.
 */

/**
 * Minimum gap between checks. Returning to the app should check, but app-switching is
 * something people do constantly and every check is a request.
 */
export const CHECK_MIN_INTERVAL_MS = 60_000;

/** How often to look while the app just sits open. */
export const CHECK_POLL_MS = 15 * 60_000;

/** How often to retry a reload that was held back because the moment was wrong. */
export const PENDING_RELOAD_RETRY_MS = 30_000;

export function shouldCheckForUpdate(
  lastCheckedAt: number | null,
  now: number,
  minIntervalMs = CHECK_MIN_INTERVAL_MS,
): boolean {
  if (lastCheckedAt === null) return true;
  return now - lastCheckedAt >= minIntervalMs;
}

export interface ReloadContext {
  /** A text field or contenteditable has focus. */
  editableFocused: boolean;
  /** A modal is open — an add form, a rename, the photo picker. */
  dialogOpen: boolean;
}

/**
 * A reload throws away anything the page is holding that has not been written yet.
 *
 * Ratings save on tap and queued writes survive a reload, so those are safe. Typing is
 * not: tasting notes live in the textarea until they are saved, and a modal usually has
 * a half-filled form behind it. Losing either to a silent reload is worse than running
 * yesterday's build for another minute — the update waits for a better moment.
 */
export function isSafeToReload(ctx: ReloadContext): boolean {
  return !ctx.editableFocused && !ctx.dialogOpen;
}

function readContext(): ReloadContext {
  const el = document.activeElement as HTMLElement | null;
  const editableFocused = !!el && (
    el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true
  );
  return { editableFocused, dialogOpen: !!document.querySelector('[role="dialog"]') };
}

/**
 * Wires the checks up. Returns a teardown, so tests and hot reloads can undo it.
 */
export function installUpdateChecks(): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};

  // On a first-ever visit the worker installs and claims the page, firing
  // controllerchange with no newer code to pick up — reloading for that is a wasted
  // round trip. Only that *first* claim is exempt: every controllerchange after it is a
  // genuinely new worker taking over, which is precisely the update we are here for.
  // Suppressing them all for the page's lifetime, as an earlier version of this did,
  // means a first-time visitor never picks up a deploy until they navigate.
  let sawInitialClaim = !!navigator.serviceWorker.controller;

  let lastCheckedAt: number | null = null;
  let reloadPending = false;
  let reloading = false;

  async function checkForUpdate() {
    if (!shouldCheckForUpdate(lastCheckedAt, Date.now())) return;
    lastCheckedAt = Date.now();
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    } catch {
      // Offline, or the registration is gone. The next check will try again.
    }
  }

  function applyWhenSafe() {
    if (reloading) return;
    if (!isSafeToReload(readContext())) {
      reloadPending = true;
      return;
    }
    reloading = true;
    window.location.reload();
  }

  function onControllerChange() {
    if (!sawInitialClaim) {
      sawInitialClaim = true;
      return;
    }
    applyWhenSafe();
  }

  function onVisibility() {
    if (document.visibilityState !== 'visible') return;
    void checkForUpdate();
    if (reloadPending) applyWhenSafe();
  }

  // Focus moving out of a field is the most common moment a held-back reload becomes
  // safe. Deferred, because focus is briefly on nothing while it moves between fields.
  function onFocusOut() {
    if (!reloadPending) return;
    setTimeout(() => { if (reloadPending) applyWhenSafe(); }, 0);
  }

  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('focusout', onFocusOut);

  const pollTimer = setInterval(() => { void checkForUpdate(); }, CHECK_POLL_MS);
  // Closing a modal fires no event of its own, so a held-back reload needs a slow retry
  // to catch that case.
  const retryTimer = setInterval(() => { if (reloadPending) applyWhenSafe(); }, PENDING_RELOAD_RETRY_MS);

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('focusout', onFocusOut);
    clearInterval(pollTimer);
    clearInterval(retryTimer);
  };
}
