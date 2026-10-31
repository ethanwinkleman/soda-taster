import type { UntastedSoda } from '../hooks/useHomeUntasted';

/**
 * How the home page splits "what now?" out of one list of unrated sodas.
 *
 * `home_untasted` returns every soda the viewer has not rated, across all of their
 * collections. Two different questions are answered from it, and a soda belongs to
 * exactly one of them so the page never lists the same bottle twice.
 */

/**
 * Sodas the rest of the group has already scored, and the viewer has not.
 *
 * These are the sealed ones: rating a soda here is also what unseals everyone else's
 * verdict on it. That is the strongest reason the app has to be opened, and the
 * collections page never mentioned it.
 */
export function waitingOnYou(sodas: UntastedSoda[]): UntastedSoda[] {
  return sodas.filter((s) => s.ratingCount > 0);
}

/**
 * Unrated, nobody else has rated it either, and it is actually in the fridge.
 *
 * Stock is the point: this is the list of things that can be opened right now. A soda
 * flagged in-fridge at quantity 0 is out, not available — the same rule `stockState`
 * applies on the collection page.
 */
export function readyToTry(sodas: UntastedSoda[]): UntastedSoda[] {
  return sodas.filter((s) => s.ratingCount === 0 && s.inFridge && s.quantity > 0);
}
