import { describe, it, expect } from 'vitest';
import {
  shouldCheckForUpdate,
  isSafeToReload,
  CHECK_MIN_INTERVAL_MS,
  type ReloadContext,
} from './appUpdate';

const ctx = (over: Partial<ReloadContext> = {}): ReloadContext => ({
  editableFocused: false, dialogOpen: false, ...over,
});

describe('shouldCheckForUpdate', () => {
  it('checks the first time it is asked', () => {
    expect(shouldCheckForUpdate(null, 1_000)).toBe(true);
  });

  it('does not check again straight away', () => {
    // Returning to the app should check, but app-switching happens constantly and
    // every check is a request to the server.
    const now = 1_000_000;
    expect(shouldCheckForUpdate(now - 5_000, now)).toBe(false);
  });

  it('checks once the interval has passed', () => {
    const now = 1_000_000;
    expect(shouldCheckForUpdate(now - CHECK_MIN_INTERVAL_MS, now)).toBe(true);
    expect(shouldCheckForUpdate(now - CHECK_MIN_INTERVAL_MS - 1, now)).toBe(true);
  });

  it('is exactly at the boundary, not just past it', () => {
    const now = 1_000_000;
    expect(shouldCheckForUpdate(now - CHECK_MIN_INTERVAL_MS + 1, now)).toBe(false);
  });

  it('honours a caller-supplied interval', () => {
    expect(shouldCheckForUpdate(500, 1_000, 400)).toBe(true);
    expect(shouldCheckForUpdate(700, 1_000, 400)).toBe(false);
  });
});

describe('isSafeToReload', () => {
  it('reloads when the page is holding nothing', () => {
    expect(isSafeToReload(ctx())).toBe(true);
  });

  it('waits while someone is typing', () => {
    // Tasting notes live in the textarea until they are saved; a silent reload would
    // throw away what was written.
    expect(isSafeToReload(ctx({ editableFocused: true }))).toBe(false);
  });

  it('waits while a dialog is open', () => {
    // A modal almost always has a half-filled form behind it.
    expect(isSafeToReload(ctx({ dialogOpen: true }))).toBe(false);
  });

  it('waits when both are true', () => {
    expect(isSafeToReload(ctx({ editableFocused: true, dialogOpen: true }))).toBe(false);
  });
});
