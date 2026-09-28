import type { Soda } from '../types/stash';
import { stockState } from './shoppingList';

/**
 * Sodas you have added but never rated — the other end of the loop from the shopping
 * list, which is "buy this again". This is "try this next".
 *
 * Kept apart from the page for the same reason `shoppingList` is: the membership rule is
 * the part worth pinning down, and it is easy to get subtly wrong.
 */

/**
 * Untasted means *you* have not rated it, not that nobody has.
 *
 * A soda the rest of the group has already scored is exactly the one you most want to
 * get to — and it is the blind-rating case, where rating it is also what unseals their
 * verdict. Filtering on `ratingCount === 0` instead would hide those completely.
 */
export function isUntasted(soda: Pick<Soda, 'myRating'>): boolean {
  return soda.myRating === null;
}

export function untastedCount(sodas: Soda[]): number {
  return sodas.filter(isUntasted).length;
}

/**
 * Untasted sodas, the ones you can actually drink right now first.
 *
 * Within each group, newest first: a soda added this week is likelier to be the one
 * sitting unopened than one logged a year ago. `stockState` rather than `inFridge`,
 * because a soda can sit in the fridge at quantity 0 — that is out, not stocked.
 */
export function untastedSodas(sodas: Soda[]): Soda[] {
  return sodas
    .filter(isUntasted)
    .sort((a, b) => {
      const aStocked = stockState(a) !== 'out';
      const bStocked = stockState(b) !== 'out';
      if (aStocked !== bStocked) return aStocked ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}
