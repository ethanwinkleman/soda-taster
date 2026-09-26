import { describe, it, expect } from 'vitest';
import {
  shouldReport, truncate, normalisePath, isDuplicate, budgetLeft, MAX_REPORTS_PER_SESSION,
} from './errorReporting';

describe('shouldReport', () => {
  it('reports a real error', () => {
    expect(shouldReport("Cannot read properties of undefined (reading 'name')")).toBe(true);
  });

  it('ignores a chunk-load failure', () => {
    // chunkRecovery already reloads into the new build; filing these would mean a
    // burst of rows on every deploy that needs no action.
    expect(shouldReport('Failed to fetch dynamically imported module: /assets/StashPage-abc.js')).toBe(false);
    expect(shouldReport("'text/html' is not a valid JavaScript MIME type.")).toBe(false);
  });

  it('ignores messages with nothing to act on', () => {
    expect(shouldReport('Script error.')).toBe(false);          // cross-origin, no detail
    expect(shouldReport('ResizeObserver loop limit exceeded')).toBe(false);
    expect(shouldReport('')).toBe(false);
    expect(shouldReport('   ')).toBe(false);
    expect(shouldReport(undefined)).toBe(false);
    expect(shouldReport(null)).toBe(false);
  });
});

describe('normalisePath', () => {
  it('redacts an invite code, which is a working credential', () => {
    expect(normalisePath('/join/ABC123')).toBe('/join/:code');
  });

  it('redacts a username', () => {
    expect(normalisePath('/u/ethan')).toBe('/u/:username');
  });

  it('collapses ids so one broken page is one row, not one per soda', () => {
    expect(normalisePath('/stash/3f8c7d2e-1a2b-4c3d-8e9f-0a1b2c3d4e5f'))
      .toBe('/stash/:id');
    expect(normalisePath('/stash/3f8c7d2e-1a2b-4c3d-8e9f-0a1b2c3d4e5f/soda/9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d'))
      .toBe('/stash/:id/soda/:id');
  });

  it('leaves route words alone', () => {
    expect(normalisePath('/')).toBe('/');
    expect(normalisePath('/admin')).toBe('/admin');
  });
});

describe('truncate', () => {
  it('leaves short values as they are', () => {
    expect(truncate('boom', 10)).toBe('boom');
  });

  it('caps long ones with a marker, within the limit', () => {
    const out = truncate('x'.repeat(50), 10);
    expect(out).toHaveLength(10);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('session limits', () => {
  it('files a message once per session', () => {
    const seen = new Set(['boom']);
    expect(isDuplicate('boom', seen)).toBe(true);
    expect(isDuplicate('other', seen)).toBe(false);
  });

  it('stops after the session budget, so a render loop cannot flood', () => {
    expect(budgetLeft(0)).toBe(true);
    expect(budgetLeft(MAX_REPORTS_PER_SESSION - 1)).toBe(true);
    expect(budgetLeft(MAX_REPORTS_PER_SESSION)).toBe(false);
    expect(budgetLeft(MAX_REPORTS_PER_SESSION + 10)).toBe(false);
  });
});
