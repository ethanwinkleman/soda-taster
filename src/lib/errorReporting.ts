/**
 * What is worth reporting when the app breaks, and what it may say.
 *
 * Kept apart from the reporter itself so the tests exercise exactly what ships without
 * dragging in the Supabase client — the same reason `stockState` and `stars` live in
 * lib/ rather than inside the component that uses them.
 */

import { isChunkLoadError } from './chunkRecovery';

/** A render loop can throw hundreds of times a second; this is a session, not a quota. */
export const MAX_REPORTS_PER_SESSION = 5;

/**
 * Noise that says nothing about this app.
 *
 * - Chunk-load failures are already handled by chunkRecovery, which reloads into the
 *   new build. Reporting them would fill the table with every deploy.
 * - "Script error." is what a cross-origin script gives instead of a message; there is
 *   nothing to act on and no way to tell two of them apart.
 * - The ResizeObserver warning is a benign browser notice that fires in bulk.
 */
const IGNORED = [
  /^Script error\.?$/i,
  /ResizeObserver loop/i,
  /^Load failed$/i,           // Safari's wording for a cancelled fetch, usually a navigation
];

export function shouldReport(message: string | undefined | null): boolean {
  const m = (message ?? '').trim();
  if (!m) return false;                 // nothing to group on, nothing to act on
  if (isChunkLoadError(m)) return false;
  return !IGNORED.some((re) => re.test(m));
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * A route, with the identifying parts taken out.
 *
 * Two reasons, and the first one matters more: `/join/ABC123` carries a working invite
 * code in the path itself, and an error log is not where that belongs. The second is
 * grouping — raw paths would split one broken page into a row per soda.
 */
export function normalisePath(pathname: string): string {
  return pathname
    .replace(UUID, ':id')
    .replace(/^\/join\/[^/]+/, '/join/:code')
    .replace(/^\/u\/[^/]+/, '/u/:username')
    // Anything left that looks like an id rather than a route word.
    .replace(/\/[0-9a-z]{16,}/gi, '/:id');
}

/** Whether this exact message has already been filed in this session. */
export function isDuplicate(message: string, alreadySeen: Set<string>): boolean {
  return alreadySeen.has(message);
}

export function budgetLeft(count: number): boolean {
  return count < MAX_REPORTS_PER_SESSION;
}

