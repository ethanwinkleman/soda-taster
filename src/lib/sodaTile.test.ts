import { describe, it, expect } from 'vitest';
import { tileGradient, TILE_GRADIENTS } from './sodaTile';

describe('tileGradient', () => {
  // The whole point is that the Moxie is the teal one every time you open the app.
  it('is stable for the same id', () => {
    expect(tileGradient('abc')).toBe(tileGradient('abc'));
    expect(tileGradient('11111111-2222-3333-4444-555555555555'))
      .toBe(tileGradient('11111111-2222-3333-4444-555555555555'));
  });

  it('only ever returns a gradient from the set', () => {
    for (const id of ['a', 'b', 'soda-1', '', '٣', 'x'.repeat(200)]) {
      expect(TILE_GRADIENTS).toContain(tileGradient(id));
    }
  });

  it('does not throw on an empty id', () => {
    expect(() => tileGradient('')).not.toThrow();
  });

  // A hash that sends every uuid to the same bucket would compile, pass the checks
  // above, and leave the shelf exactly as monotonous as one fixed colour.
  it('spreads realistic ids across the whole set', () => {
    const ids = Array.from({ length: 300 }, (_, i) =>
      `${i.toString(16).padStart(8, '0')}-aaaa-bbbb-cccc-ddddeeeeffff`);
    const used = new Set(ids.map(tileGradient));
    expect(used.size).toBe(TILE_GRADIENTS.length);
  });

  // Sequential ids are the realistic worst case for a weak hash.
  it('does not give consecutive ids the same colour', () => {
    const a = tileGradient('soda-1');
    const b = tileGradient('soda-2');
    const c = tileGradient('soda-3');
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });
});
