/**
 * What a page looked like when you left it, so that coming back to it is coming *back*.
 *
 * A route is unmounted when you navigate away and mounted fresh when you return, which
 * throws away everything that made it the page you were on: how far down you were, how
 * much of a long list had been revealed, what you had typed into its search. Returning
 * to a collection after opening a soda used to land a third of the way up a list that
 * had gone back to its first ten cards — measured: left at scrollY 1680, came back to
 * 440, because the restored position was clamped to a page that had shrunk.
 *
 * This is deliberately memory for the session and nothing more: a plain Map, gone on
 * reload. It is only ever read on a *return* (back or forward), never on a fresh visit,
 * so walking into a collection from the sidebar starts clean even if you searched it
 * an hour ago.
 */

const memory = new Map<string, unknown>();

export function remember(key: string, value: unknown): void {
  memory.set(key, value);
}

/** The remembered value on a return; the fallback on a fresh visit or when nothing is held. */
export function recall<T>(key: string, returning: boolean, fallback: T): T {
  if (!returning || !memory.has(key)) return fallback;
  return memory.get(key) as T;
}

/** For tests. */
export function forgetAll(): void {
  memory.clear();
}

/** Call when a history entry is navigated away from. It can be returned to after that. */
export function markLeft(locationKey: string): void {
  memory.set(`left:${locationKey}`, true);
}

/**
 * A return is a POP onto a history entry that was left earlier in this session.
 *
 * POP alone is not enough: React Router reports a cold start as POP too, and so is a
 * reload, and neither has anything to come back to. The location key cannot tell them
 * apart either — the first entry of a session is `default` both on the cold start and
 * when you later press back onto it, which is exactly the case of opening the app on a
 * collection, opening a soda and coming back. Having left the entry is what
 * distinguishes them, and it is forgotten on reload along with everything else here.
 */
export function isReturnNavigation(navType: string, locationKey: string): boolean {
  return navType === 'POP' && memory.get(`left:${locationKey}`) === true;
}

/** Where the window should be after a navigation: where you left it, or the top. */
export function scrollTargetFor(navType: string, locationKey: string): number {
  const y = recall<number>(`scroll:${locationKey}`, isReturnNavigation(navType, locationKey), 0);
  return Number.isFinite(y) && y > 0 ? y : 0;
}
