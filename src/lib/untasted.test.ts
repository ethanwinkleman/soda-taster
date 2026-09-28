import { describe, it, expect } from 'vitest';
import type { Soda, SodaRating } from '../types/stash';
import { isUntasted, untastedCount, untastedSodas } from './untasted';

function rating(score: number): SodaRating {
  return { id: 'r', sodaId: 's', userId: 'me', displayName: 'Me', score, notes: null, createdAt: '2026-01-01' };
}

function soda(over: Partial<Soda> & { id: string }): Soda {
  return {
    stashId: 'st',
    name: over.id,
    brand: '',
    addedBy: 'me',
    inFridge: false,
    quantity: 0,
    imageUrl: null,
    createdAt: '2026-01-01',
    myRating: null,
    otherScores: [],
    avgScore: null,
    ratingCount: 0,
    commentCount: 0,
    ...over,
  } as Soda;
}

describe('isUntasted', () => {
  it('is true for a soda nobody has rated', () => {
    expect(isUntasted(soda({ id: 'a' }))).toBe(true);
  });

  it('is false once you have rated it', () => {
    expect(isUntasted(soda({ id: 'a', myRating: rating(4) }))).toBe(false);
  });

  // The whole point: these are the ones you most want to get to, and rating one is also
  // what unseals the group's verdict on it.
  it('is true for a soda the rest of the group has rated but you have not', () => {
    expect(isUntasted(soda({ id: 'a', ratingCount: 3, otherScores: [4, 5, 3] }))).toBe(true);
  });

  it('counts across a collection', () => {
    expect(untastedCount([
      soda({ id: 'a' }),
      soda({ id: 'b', myRating: rating(3) }),
      soda({ id: 'c', ratingCount: 2 }),
    ])).toBe(2);
  });
});

describe('untastedSodas', () => {
  it('leaves out anything you have rated', () => {
    const out = untastedSodas([soda({ id: 'a' }), soda({ id: 'b', myRating: rating(2) })]);
    expect(out.map((s) => s.id)).toEqual(['a']);
  });

  it('puts what is in the fridge first', () => {
    const out = untastedSodas([
      soda({ id: 'shelf' }),
      soda({ id: 'fridge', inFridge: true, quantity: 2 }),
    ]);
    expect(out.map((s) => s.id)).toEqual(['fridge', 'shelf']);
  });

  // A soda can sit in the fridge at quantity 0 — the detail page decrements without
  // clearing the flag. That is out, and it should not outrank one you can actually open.
  it('treats in-fridge at quantity 0 as out, not stocked', () => {
    const out = untastedSodas([
      soda({ id: 'empty', inFridge: true, quantity: 0, createdAt: '2026-06-01' }),
      soda({ id: 'stocked', inFridge: true, quantity: 1, createdAt: '2026-01-01' }),
    ]);
    expect(out.map((s) => s.id)).toEqual(['stocked', 'empty']);
  });

  it('orders newest first within each group', () => {
    const out = untastedSodas([
      soda({ id: 'old-fridge', inFridge: true, quantity: 1, createdAt: '2026-01-01' }),
      soda({ id: 'new-shelf', createdAt: '2026-09-01' }),
      soda({ id: 'new-fridge', inFridge: true, quantity: 1, createdAt: '2026-08-01' }),
      soda({ id: 'old-shelf', createdAt: '2026-02-01' }),
    ]);
    expect(out.map((s) => s.id)).toEqual(['new-fridge', 'old-fridge', 'new-shelf', 'old-shelf']);
  });

  it('returns nothing when everything has been tasted', () => {
    expect(untastedSodas([soda({ id: 'a', myRating: rating(5) })])).toEqual([]);
  });
});
