import { describe, it, expect } from 'vitest';
import type { TasteSoda } from '../hooks/useTasteSodas';
import { searchSodas, hasExactMatch, tastedSummary } from './sodaSearch';

function soda(over: Partial<TasteSoda> & { name: string }): TasteSoda {
  return {
    id: over.name, stashId: 'st', brand: '', imageUrl: null,
    myScore: null, others: [],
    ...over,
  };
}

const SHELF = [
  soda({ name: "Henry Weinhard's Black Cherry Cream", brand: 'Henry Weinhard' }),
  soda({ name: 'Cherry Coke', brand: 'Coca-Cola' }),
  soda({ name: 'Birch Beer', brand: 'Boylan' }),
  soda({ name: 'Cream Soda', brand: 'Jones' }),
];

describe('searchSodas', () => {
  it('returns nothing for an empty query rather than everything', () => {
    expect(searchSodas(SHELF, '')).toEqual([]);
    expect(searchSodas(SHELF, '   ')).toEqual([]);
  });

  it('finds by a fragment of the name', () => {
    expect(searchSodas(SHELF, 'cherry').map((s) => s.name))
      .toEqual(["Cherry Coke", "Henry Weinhard's Black Cherry Cream"]);
  });

  // A name that starts with what you typed is almost always the one you meant.
  it('puts a prefix match above a mid-name match', () => {
    const out = searchSodas(SHELF, 'cream');
    expect(out[0].name).toBe('Cream Soda');
  });

  it('finds by brand', () => {
    expect(searchSodas(SHELF, 'boylan').map((s) => s.name)).toEqual(['Birch Beer']);
  });

  // Nobody types a long name in its real order from memory.
  it('matches words in any order', () => {
    expect(searchSodas(SHELF, 'cherry henry').map((s) => s.name))
      .toEqual(["Henry Weinhard's Black Cherry Cream"]);
  });

  it('ignores case and surrounding space', () => {
    expect(searchSodas(SHELF, '  BIRCH  ').map((s) => s.name)).toEqual(['Birch Beer']);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 30 }, (_, i) => soda({ name: `Cola ${i}` }));
    expect(searchSodas(many, 'cola', 5)).toHaveLength(5);
  });
});

describe('hasExactMatch', () => {
  // Offering "add it as new" next to the exact soda is how a collection ends up with
  // three Henry Weinhard's.
  it('is true when a result is exactly what was typed', () => {
    const results = searchSodas(SHELF, 'cherry coke');
    expect(hasExactMatch(results, 'cherry coke')).toBe(true);
    expect(hasExactMatch(results, 'CHERRY COKE  ')).toBe(true);
  });

  it('is false for a partial name, where adding a new one may be right', () => {
    expect(hasExactMatch(searchSodas(SHELF, 'cherry'), 'cherry')).toBe(false);
  });

  it('is false with no results at all', () => {
    expect(hasExactMatch([], 'moxie')).toBe(false);
  });
});

describe('tastedSummary', () => {
  it('is null when you have not rated it — there is nothing to recall', () => {
    expect(tastedSummary(soda({ name: 'Moxie' }))).toBeNull();
  });

  it('leads with your own score', () => {
    expect(tastedSummary(soda({ name: 'Moxie', myScore: 5 }))).toBe('You 5');
  });

  it('adds everyone the policy let through', () => {
    expect(tastedSummary(soda({
      name: 'Moxie', myScore: 4.5, others: [{ name: 'Dana', score: 2 }],
    }))).toBe('You 4.5 · Dana 2');
  });

  // Half steps are the whole scale; "4.50" and "5.0" are both wrong.
  it('writes halves as halves and whole numbers plainly', () => {
    expect(tastedSummary(soda({ name: 'M', myScore: 3.5 }))).toBe('You 3.5');
    expect(tastedSummary(soda({ name: 'M', myScore: 3 }))).toBe('You 3');
  });
});
