/**
 * Which gradient an unphotographed soda gets for its card.
 *
 * Most sodas have no photo, and a shelf where every placeholder is the same tile is
 * harder to scan than the text list it replaced — you cannot tell two of them apart
 * without reading. Giving each one a stable colour makes them work like book spines:
 * the Moxie is the teal one, and it is the teal one every time you open the app.
 *
 * Stable means derived from the id, not random and not stored: a value picked at render
 * would change on every re-render, and a stored one would be a column to migrate.
 */

/**
 * On-brand pairs only — cherry, fizz teal and the citrus pop, which are the three hues
 * the design system has. Each one's `to` end sits bottom-right, under the scrim that
 * makes the white type legible, so a light end never costs contrast where the name is.
 */
export const TILE_GRADIENTS = [
  'from-sky-500 to-cyan-500',
  'from-cyan-500 to-sky-500',
  'from-sky-600 to-sky-400',
  'from-cyan-600 to-cyan-400',
  'from-amber-500 to-sky-500',
  'from-sky-700 to-cyan-600',
] as const;

export type TileGradient = (typeof TILE_GRADIENTS)[number];

/**
 * A small deterministic hash. Not cryptographic and not meant to be — it only has to
 * spread ids across six buckets and give the same answer on every device.
 */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function tileGradient(id: string): TileGradient {
  return TILE_GRADIENTS[hash(id) % TILE_GRADIENTS.length];
}
