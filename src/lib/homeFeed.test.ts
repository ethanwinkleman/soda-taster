import { describe, it, expect } from 'vitest';
import type { UntastedSoda } from '../hooks/useHomeUntasted';
import { waitingOnYou, readyToTry } from './homeFeed';

function soda(over: Partial<UntastedSoda> & { id: string }): UntastedSoda {
  return {
    stashId: 'st', stashName: 'Collection', name: over.id, brand: '',
    imageUrl: null, inFridge: false, quantity: 0, createdAt: '2026-01-01',
    ratingCount: 0,
    ...over,
  };
}

describe('waitingOnYou', () => {
  it('is the ones somebody else has already rated', () => {
    const out = waitingOnYou([
      soda({ id: 'sealed', ratingCount: 2 }),
      soda({ id: 'nobody', ratingCount: 0 }),
    ]);
    expect(out.map((s) => s.id)).toEqual(['sealed']);
  });

  // Stock has nothing to do with it: a soda you have run out of still has a verdict
  // sitting behind it, and rating it is still what unseals that.
  it('does not care whether it is in the fridge', () => {
    const out = waitingOnYou([
      soda({ id: 'gone', ratingCount: 1, inFridge: false, quantity: 0 }),
      soda({ id: 'cold', ratingCount: 1, inFridge: true, quantity: 3 }),
    ]);
    expect(out.map((s) => s.id)).toEqual(['gone', 'cold']);
  });

  it('is empty when nobody has rated anything', () => {
    expect(waitingOnYou([soda({ id: 'a' }), soda({ id: 'b' })])).toEqual([]);
  });
});

describe('readyToTry', () => {
  it('is what is actually in the fridge and nobody has rated', () => {
    const out = readyToTry([
      soda({ id: 'cold', inFridge: true, quantity: 2 }),
      soda({ id: 'shelf', inFridge: false, quantity: 0 }),
    ]);
    expect(out.map((s) => s.id)).toEqual(['cold']);
  });

  // In-fridge at quantity 0 is out, not available — the same rule stockState applies.
  it('treats in-fridge at quantity 0 as out', () => {
    expect(readyToTry([soda({ id: 'empty', inFridge: true, quantity: 0 })])).toEqual([]);
  });

  // The two lists never show the same bottle: a sealed soda belongs to waitingOnYou,
  // even when it is sitting in the fridge.
  it('leaves the sealed ones to waitingOnYou', () => {
    const list = [
      soda({ id: 'sealed-cold', ratingCount: 2, inFridge: true, quantity: 1 }),
      soda({ id: 'fresh-cold', ratingCount: 0, inFridge: true, quantity: 1 }),
    ];
    expect(readyToTry(list).map((s) => s.id)).toEqual(['fresh-cold']);
    expect(waitingOnYou(list).map((s) => s.id)).toEqual(['sealed-cold']);
    const both = [...waitingOnYou(list), ...readyToTry(list)].map((s) => s.id);
    expect(new Set(both).size).toBe(both.length);
  });
});
