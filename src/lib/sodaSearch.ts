import type { TasteSoda } from '../hooks/useTasteSodas';

/**
 * Finding a soda by typing at it.
 *
 * The app's two frequent jobs — "have we had this before?" and "rate this now" — are the
 * same interaction: you type a name, and either it comes back with a score against it,
 * which is the answer, or it does not and you add it. This is that match.
 */

/** Loose enough that a half-remembered name finds it; strict enough to stay short. */
export function searchSodas(sodas: TasteSoda[], query: string, limit = 12): TasteSoda[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);

  const scored = sodas
    .map((s) => {
      const haystack = `${s.name} ${s.brand}`.toLowerCase();
      // Every word has to appear somewhere, so "cherry henry" finds Henry Weinhard's
      // Black Cherry Cream even though nobody would type it in that order.
      if (!terms.every((t) => haystack.includes(t))) return null;
      const name = s.name.toLowerCase();
      // A name that starts with what you typed is almost always the one you meant.
      const rank = name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2;
      return { soda: s, rank };
    })
    .filter((x): x is { soda: TasteSoda; rank: number } => x !== null);

  scored.sort((a, b) => a.rank - b.rank || a.soda.name.localeCompare(b.soda.name));
  return scored.slice(0, limit).map((x) => x.soda);
}

/**
 * Whether the search has already answered "have we had this?" exactly.
 *
 * An exact name match means no amount of scrolling will turn up a better answer, so the
 * "add it as new" escape hatch should get out of the way — offering to add a second
 * Henry Weinhard's is how a collection ends up with three of them.
 */
export function hasExactMatch(results: TasteSoda[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return results.some((s) => s.name.trim().toLowerCase() === q);
}

/** What a result line says about a soda you have already had. */
export function tastedSummary(soda: TasteSoda): string | null {
  if (soda.myScore === null) return null;
  const parts = [`You ${fmt(soda.myScore)}`, ...soda.others.map((o) => `${o.name} ${fmt(o.score)}`)];
  return parts.join(' · ');
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
