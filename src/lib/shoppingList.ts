import type { Soda } from '../types/stash';
import { starGlyphs } from './score';

/**
 * What belongs on a shopping list, and how it is written out.
 *
 * Kept apart from the modal because this is the part that has actually been wrong:
 * it once rendered half-star ratings a glyph short, and it once ignored sodas you were
 * down to the last bottle of.
 */

/** Anything at or above this is worth buying again. */
export const WORTH_BUYING = 4;

/** At or below this many in the fridge counts as running low. */
export const LOW_STOCK = 1;

export type StockState = 'out' | 'low' | 'stocked';

/**
 * A soda can sit in the fridge at quantity 0 — the soda page decrements without
 * clearing the in-fridge flag — and that is out, not low.
 */
export function stockState(soda: Pick<Soda, 'inFridge' | 'quantity'>): StockState {
  if (!soda.inFridge || soda.quantity === 0) return 'out';
  if (soda.quantity <= LOW_STOCK) return 'low';
  return 'stocked';
}

export function shoppingListItems(sodas: Soda[]): Soda[] {
  return sodas
    .filter((s) => (s.myRating?.score ?? 0) >= WORTH_BUYING && stockState(s) !== 'stocked')
    .sort((a, b) => (b.myRating?.score ?? 0) - (a.myRating?.score ?? 0));
}

export function sodaLabel(soda: Pick<Soda, 'name' | 'brand'>): string {
  return soda.brand ? `${soda.name} (${soda.brand})` : soda.name;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function fileStem(stashName: string): string {
  return stashName.replace(/[^a-z0-9]/gi, '_');
}

interface BuildOptions {
  stashName: string;
  items: Soda[];
  quantityOf: (sodaId: string) => number;
  /** Injected so the output is deterministic and testable. */
  date: string;
}

export function buildShoppingText({ stashName, items, quantityOf, date }: BuildOptions): string {
  const totalUnits = items.reduce((sum, s) => sum + quantityOf(s.id), 0);
  const rows = items.map((s) => {
    const qty = quantityOf(s.id);
    // Only the low ones are annotated; "gone" is the default assumption for a list.
    const low = stockState(s) === 'low' ? '  (1 left)' : '';
    return `${starGlyphs(s.myRating!.score)}  ${sodaLabel(s)}${low}${qty > 1 ? `  ×${qty}` : ''}`;
  });
  return [
    `Shopping List — ${stashName}`,
    date,
    '',
    ...rows,
    '',
    `${items.length} item${items.length !== 1 ? 's' : ''}` +
      (totalUnits !== items.length ? ` · ${totalUnits} units` : '') +
      ' · Soda Taster',
  ].join('\n');
}

export function buildShoppingCsv(items: Soda[], quantityOf: (sodaId: string) => number): string {
  const header = ['Name', 'Brand', 'My Rating', 'Stock', 'Quantity'];
  const rows = items.map((s) => [
    csvCell(s.name),
    csvCell(s.brand),
    csvCell(s.myRating!.score),
    csvCell(stockState(s) === 'low' ? '1 left' : 'Out of stock'),
    csvCell(quantityOf(s.id)),
  ]);
  return [header, ...rows].map((r) => r.join(',')).join('\n');
}
