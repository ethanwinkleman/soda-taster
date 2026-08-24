import { descriptorLabel } from './flavorNotes';
import type { NotePreference } from './flavorNotes';

/**
 * A hand-kept shelf of root beers worth tracking down, described in the same
 * vocabulary as lib/flavorNotes so a bottle you have never had can be matched
 * against the notes you actually score well.
 *
 * Curated rather than fetched: there is no free, stable API for "notable root beers",
 * and a wrong recommendation here is worse than a short list. Every entry is a soda
 * that genuinely exists and is genuinely findable — add to it by hand.
 */
export interface CatalogSoda {
  name: string;
  brand: string;
  /** Descriptor ids from lib/flavorNotes. */
  notes: string[];
  /** One line on why it is on the shelf. */
  blurb: string;
}

export const ROOT_BEER_CATALOG: CatalogSoda[] = [
  { name: 'Root Beer', brand: 'Sprecher', notes: ['vanilla', 'honey', 'creamy', 'molasses'],
    blurb: 'Fire-brewed in Wisconsin with honey — the reference for the creamy, heavy end of the style.' },
  { name: 'Root Beer', brand: "Virgil's", notes: ['herbal', 'licorice', 'spiced', 'sassafras'],
    blurb: 'Brewed with anise, licorice and molasses. The most botanical of the widely available ones.' },
  { name: 'Root Beer', brand: 'Bundaberg', notes: ['vanilla', 'sweet', 'flat', 'creamy'],
    blurb: 'Australian, brewed over three days, notably soft carbonation.' },
  { name: 'Root Beer', brand: 'Maine Root', notes: ['dry', 'sassafras', 'spiced'],
    blurb: 'Fair-trade cane sugar and markedly less sweet than the mass-market ones.' },
  { name: 'Root Beer', brand: "Boylan's", notes: ['vanilla', 'sassafras', 'fizzy'],
    blurb: 'Cane sugar, sharp carbonation, a clean middle-of-the-road benchmark.' },
  { name: 'Draft Root Beer', brand: 'Abita', notes: ['sassafras', 'vanilla', 'sweet'],
    blurb: 'Louisiana cane sugar brew, sweeter and rounder than most craft entries.' },
  { name: 'Root Beer', brand: 'Barq’s', notes: ['fizzy', 'dry', 'bitter'],
    blurb: 'The one with caffeine, and a bite most root beers deliberately avoid.' },
  { name: 'Root Beer', brand: 'A&W', notes: ['vanilla', 'creamy', 'sweet'],
    blurb: 'The baseline everyone else gets compared to. Worth rating so your scale has a zero point.' },
  { name: 'Root Beer', brand: 'Dad’s', notes: ['wintergreen', 'sassafras', 'sweet'],
    blurb: 'Old-line American brand, distinctly wintergreen-forward.' },
  { name: 'Birch Beer', brand: "Boylan's", notes: ['birch', 'wintergreen', 'dry'],
    blurb: 'If you like root beer for the wintergreen, birch beer is the next stop.' },
  { name: 'Red Birch Beer', brand: 'Pennsylvania Dutch', notes: ['birch', 'wintergreen', 'sweet'],
    blurb: 'Sweeter, redder birch beer — the Pennsylvania style.' },
  { name: 'Sarsaparilla', brand: 'Sioux City', notes: ['sassafras', 'licorice', 'herbal'],
    blurb: 'Closer to the 19th-century original than anything sold as root beer today.' },
  { name: 'Root Beer', brand: 'Zuberfizz', notes: ['vanilla', 'caramel', 'creamy'],
    blurb: 'Colorado micro-brew, heavy on the caramel.' },
  { name: 'Not Your Father’s Root Beer', brand: 'Small Town Brewery', notes: ['spiced', 'vanilla', 'sweet'],
    blurb: 'Alcoholic. Included because it keeps turning up in root beer tastings.' },
  { name: 'Root Beer', brand: 'Hansen’s', notes: ['dry', 'herbal'],
    blurb: 'Lighter and less syrupy than most — a good contrast bottle.' },
  { name: 'Root Beer', brand: 'Frostie', notes: ['vanilla', 'caramel', 'sweet'],
    blurb: 'Classic diner-style, heavy vanilla.' },
];

export interface Recommendation {
  soda: CatalogSoda;
  /** Sum of your average score across the notes it shares with your palate. */
  score: number;
  /** The shared notes, best-scoring first — this is the "why". */
  matched: { id: string; label: string; avg: number }[];
}

/** Normalised key for "is this already in my stash", tolerant of casing and spacing. */
function key(name: string, brand: string): string {
  return `${brand} ${name}`.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Catalog entries you do not already have, ranked by how well they match the notes
 * you score well.
 *
 * Sodas already in the stash are dropped rather than ranked — you asked what else to
 * buy, and a recommendation you already own is noise.
 */
export function recommendSodas(
  preferences: NotePreference[],
  owned: { name: string; brand: string }[],
  limit = 5,
): Recommendation[] {
  const ownedKeys = new Set(owned.map((o) => key(o.name, o.brand)));
  // Only notes you actually like should pull a bottle up the list. Matching on a
  // note you rate 2.0 is an argument against it, not for it.
  const liked = new Map(preferences.filter((p) => p.avg >= 3.5).map((p) => [p.id, p]));
  if (liked.size === 0) return [];

  return ROOT_BEER_CATALOG
    .filter((c) => !ownedKeys.has(key(c.name, c.brand)))
    .map((soda) => {
      const matched = soda.notes
        .filter((n) => liked.has(n))
        .map((n) => ({ id: n, label: descriptorLabel(n), avg: liked.get(n)!.avg }))
        .sort((a, b) => b.avg - a.avg);
      return { soda, matched, score: matched.reduce((sum, m) => sum + m.avg, 0) };
    })
    .filter((r) => r.matched.length > 0)
    .sort((a, b) => b.score - a.score || a.soda.brand.localeCompare(b.soda.brand))
    .slice(0, limit);
}

export interface Retailer {
  name: string;
  search: (query: string) => string;
}

/**
 * Plain search URLs, not an affiliate or commerce integration. Nothing is tracked,
 * no key is needed, and the links keep working whatever these sites do to their APIs.
 */
export const RETAILERS: Retailer[] = [
  { name: 'Amazon',     search: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  { name: 'Total Wine', search: (q) => `https://www.totalwine.com/search/all?text=${encodeURIComponent(q)}` },
  { name: 'Walmart',    search: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}` },
  { name: 'Google',     search: (q) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}` },
];

export function searchQuery(soda: Pick<CatalogSoda, 'name' | 'brand'>): string {
  return `${soda.brand} ${soda.name}`;
}
