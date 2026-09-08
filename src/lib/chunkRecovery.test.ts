import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isChunkLoadError, loadChunk, claimReloadBudget } from './chunkRecovery';

/**
 * This suite runs without jsdom, like the rest — so there is no `sessionStorage` global
 * and reaching for one is a ReferenceError, not an empty store. The reload budget is
 * the one piece of this module that needs somewhere to remember a flag, so it gets a
 * store of its own rather than a whole DOM.
 */
function memoryStorage(): Storage {
  let data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    clear: () => { data = new Map(); },
    key: (i) => [...data.keys()][i] ?? null,
    get length() { return data.size; },
  } as Storage;
}

vi.stubGlobal('sessionStorage', memoryStorage());

beforeEach(() => sessionStorage.clear());

describe('isChunkLoadError', () => {
  it('recognises the message the user actually saw', () => {
    expect(isChunkLoadError("'text/html' is not a valid JavaScript MIME type.")).toBe(true);
  });

  it('recognises the wording each engine uses', () => {
    for (const message of [
      'Failed to fetch dynamically imported module: https://x/assets/StashPage-abc.js',
      'Importing a module script failed.',
      'error loading dynamically imported module',
      'Loading chunk 42 failed.',
      'Unable to preload CSS for /assets/index-abc.css',
    ]) {
      expect(isChunkLoadError(message), message).toBe(true);
    }
  });

  it('does not claim ordinary application errors', () => {
    // Misfiring here would reload the tab on a real bug, hiding it and losing the
    // user's place — worse than showing the error screen.
    for (const message of [
      "Cannot read properties of undefined (reading 'name')",
      'supabase: JWT expired',
      'Maximum update depth exceeded',
      '',
    ]) {
      expect(isChunkLoadError(message), message).toBe(false);
    }
  });

  it('handles a missing message', () => {
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('loadChunk', () => {
  it('returns the module when the import works', async () => {
    const reload = vi.fn(async () => true);
    await expect(loadChunk(async () => 'mod', reload)).resolves.toBe('mod');
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads on a stale chunk instead of surfacing the error', async () => {
    const reload = vi.fn(async () => true);
    const pending = loadChunk(async () => {
      throw new Error("'text/html' is not a valid JavaScript MIME type.");
    }, reload);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

    // Never settles: Suspense keeps its fallback up while the document reloads,
    // rather than flashing an error screen the reload would discard.
    const settled = await Promise.race([pending.then(() => 'settled'), Promise.resolve('pending')]);
    expect(settled).toBe('pending');
  });

  it('rethrows a genuine module error rather than reloading', async () => {
    const reload = vi.fn(async () => true);
    await expect(
      loadChunk(async () => { throw new Error('boom in module top level'); }, reload),
    ).rejects.toThrow('boom in module top level');
    expect(reload).not.toHaveBeenCalled();
  });

  it('rethrows once the reload budget is spent, so the boundary can show something', async () => {
    const reload = vi.fn(async () => false); // budget already spent
    await expect(
      loadChunk(async () => { throw new Error('Failed to fetch dynamically imported module'); }, reload),
    ).rejects.toThrow('Failed to fetch dynamically imported module');
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('claimReloadBudget', () => {
  it('grants the reload once and refuses after that', () => {
    // The whole point of the guard: a reload that lands on the same broken build must
    // not reload again, or the tab spins.
    expect(claimReloadBudget()).toBe(true);
    expect(claimReloadBudget()).toBe(false);
  });

  it('fails closed when storage throws, rather than reloading unguarded', () => {
    // Private mode and blocked site data both throw on access. Without a place to
    // remember the flag there is no way to stop at one reload, so it does not start.
    vi.stubGlobal('sessionStorage', {
      getItem() { throw new DOMException('denied'); },
      setItem() { throw new DOMException('denied'); },
    } as unknown as Storage);
    try {
      expect(claimReloadBudget()).toBe(false);
    } finally {
      vi.stubGlobal('sessionStorage', memoryStorage());
    }
  });
});

// recoverOnce itself is not tested here: it touches caches, navigator.serviceWorker
// and window.location, and this suite runs without jsdom on purpose. That is why
// loadChunk takes `recover` as an argument — the decision logic is testable, the
// cache purge and page reload are not.
