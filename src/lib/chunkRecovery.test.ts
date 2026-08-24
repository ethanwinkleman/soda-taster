import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isChunkLoadError, loadChunk } from './chunkRecovery';

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

// recoverOnce itself is not tested here: it touches caches, navigator.serviceWorker
// and window.location, and this suite runs without jsdom on purpose. That is why
// loadChunk takes `recover` as an argument — the decision logic is testable, the
// cache purge and page reload are not.
