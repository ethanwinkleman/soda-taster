import { classifyFlavor } from '../utils/tasteProfile';
import type { Soda } from '../types/stash';

/**
 * Flavour notes for a soda, without asking anyone to fill in another form.
 *
 * Two sources, kept separate on purpose:
 *
 *   - the *style baseline*, which is what a root beer tastes of because it is a root
 *     beer. Safe to state about any soda we can classify, and safe precisely because
 *     it claims nothing specific about this bottle.
 *   - what your own stash actually wrote, mined out of the notes people already leave
 *     on their ratings.
 *
 * Nothing here guesses. A soda whose name we cannot classify gets no baseline rather
 * than an invented one — tasting notes feed the taste profile and the recommendations
 * below it, so a fabricated "smoky" would quietly steer what the app tells you to buy.
 */

export interface Descriptor {
  id: string;
  label: string;
  /** Matched against free-text rating notes. Kept loose — people type "super sweet". */
  pattern: RegExp;
}

/**
 * The shared vocabulary. Both halves of the feature run through it: mined notes and
 * the catalog are described in the same terms, so "you like wintergreen" can actually
 * be matched against a bottle you have never had.
 */
export const DESCRIPTORS: Descriptor[] = [
  { id: 'sassafras',   label: 'sassafras',   pattern: /sassafras/i },
  { id: 'wintergreen', label: 'wintergreen', pattern: /wintergreen|minty|menthol/i },
  { id: 'vanilla',     label: 'vanilla',     pattern: /vanilla|vanilla-?forward/i },
  { id: 'molasses',    label: 'molasses',    pattern: /molasses|blackstrap/i },
  { id: 'caramel',     label: 'caramel',     pattern: /caramel|butterscotch|toffee/i },
  { id: 'honey',       label: 'honey',       pattern: /honey/i },
  { id: 'licorice',    label: 'licorice',    pattern: /licorice|liquorice|anise/i },
  { id: 'birch',       label: 'birch',       pattern: /birch/i },
  { id: 'herbal',      label: 'herbal',      pattern: /herbal|botanical|medicinal|root[- ]?forward/i },
  { id: 'spiced',      label: 'spiced',      pattern: /spice|cinnamon|clove|nutmeg|allspice/i },
  { id: 'ginger',      label: 'ginger',      pattern: /ginger|peppery|bite\b/i },
  { id: 'citrus',      label: 'citrus',      pattern: /citrus|lemon|lime|orange|grapefruit/i },
  { id: 'smoky',       label: 'smoky',       pattern: /smok(y|e)|charred/i },
  { id: 'creamy',      label: 'creamy',      pattern: /creamy|smooth|velvet|silky/i },
  { id: 'sweet',       label: 'sweet',       pattern: /\bsweet|sugary|syrupy|cloying/i },
  { id: 'dry',         label: 'dry',         pattern: /\bdry\b|crisp|not too sweet|less sweet|restrained/i },
  { id: 'bitter',      label: 'bitter',      pattern: /bitter|astringent|tannic/i },
  { id: 'fizzy',       label: 'sharp carbonation', pattern: /fizzy|carbonat|bubbly|sharp/i },
  { id: 'flat',        label: 'soft carbonation',  pattern: /flat\b|soft carbonation|gentle fizz/i },
];

const BY_ID = new Map(DESCRIPTORS.map((d) => [d.id, d]));

export function descriptorLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/**
 * What a style tastes of. Deliberately short: these are the notes that make the style
 * that style, not a full tasting sheet.
 */
const STYLE_BASELINE: Record<string, string[]> = {
  'Root Beer':     ['sassafras', 'wintergreen', 'vanilla', 'molasses'],
  'Birch Beer':    ['birch', 'wintergreen', 'dry'],
  'Sarsaparilla':  ['sassafras', 'licorice', 'herbal'],
  'Cream Soda':    ['vanilla', 'caramel', 'creamy'],
  'Ginger':        ['ginger', 'spiced', 'citrus'],
  'Cola':          ['citrus', 'spiced', 'caramel'],
  'Citrus':        ['citrus', 'sweet'],
  'Tonic':         ['bitter', 'citrus'],
  'Tea':           ['herbal'],
  'Kombucha':      ['dry', 'herbal'],
  'Lemonade':      ['citrus', 'sweet'],
  'Fruit':         ['sweet'],
  'Sparkling Water': ['dry'],
};

/** Style notes for a soda, or [] when its name tells us nothing. */
export function styleNotes(name: string, brand: string): string[] {
  const style = classifyFlavor(name, brand);
  return style ? (STYLE_BASELINE[style] ?? []) : [];
}

export interface ObservedNote {
  id: string;
  label: string;
  /** How many raters used a word matching this descriptor. */
  count: number;
}

/**
 * Descriptors your stash actually wrote about this soda.
 *
 * One vote per rating, not per mention: someone writing "sweet, too sweet, very sweet"
 * is one opinion, and letting it count three times would make a single rater look like
 * a consensus.
 */
export function observedNotes(notes: (string | null)[]): ObservedNote[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    if (!note) continue;
    for (const d of DESCRIPTORS) {
      if (d.pattern.test(note)) counts.set(d.id, (counts.get(d.id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: descriptorLabel(id), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export interface SodaFlavorProfile {
  style: string | null;
  styleNotes: string[];
  observed: ObservedNote[];
}

export function sodaFlavorProfile(soda: Soda, visibleNotes: (string | null)[]): SodaFlavorProfile {
  return {
    style: classifyFlavor(soda.name, soda.brand),
    styleNotes: styleNotes(soda.name, soda.brand),
    observed: observedNotes(visibleNotes),
  };
}

export interface NotePreference {
  id: string;
  label: string;
  /** Average score across sodas carrying this note. */
  avg: number;
  /** How many rated sodas carried it. */
  sodas: number;
}

/**
 * Which flavour notes you actually score well, across everything you have rated.
 *
 * Uses your own ratings only. The group's opinion of a soda is not evidence about
 * your palate, and half of it may be sealed from you anyway.
 *
 * A note needs `minSodas` behind it to appear: one 5.0 on one bottle is not a
 * preference, and recommending against it would be inventing a pattern from noise.
 */
export function notePreferences(
  rated: { name: string; brand: string; score: number; notes: string | null }[],
  minSodas = 2,
): NotePreference[] {
  const scores = new Map<string, number[]>();
  for (const r of rated) {
    const ids = new Set([
      ...styleNotes(r.name, r.brand),
      ...observedNotes([r.notes]).map((o) => o.id),
    ]);
    for (const id of ids) {
      if (!scores.has(id)) scores.set(id, []);
      scores.get(id)!.push(r.score);
    }
  }
  return [...scores.entries()]
    .filter(([, s]) => s.length >= minSodas)
    .map(([id, s]) => ({
      id,
      label: descriptorLabel(id),
      avg: Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10,
      sodas: s.length,
    }))
    .sort((a, b) => b.avg - a.avg || b.sodas - a.sodas || a.label.localeCompare(b.label));
}
