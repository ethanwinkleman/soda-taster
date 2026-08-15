import { describe, it, expect } from 'vitest';
import { classifyFlavor, computeStats, generateProfile } from './tasteProfile';
import type { RatingInput } from './tasteProfile';

function r(sodaName: string, brand: string, score: number): RatingInput {
  return { sodaName, brand, score };
}

describe('classifyFlavor', () => {
  it('matches on the soda name', () => {
    expect(classifyFlavor('Sprecher Root Beer', 'Sprecher')).toBe('Root Beer');
    expect(classifyFlavor('Blood Orange Fizz', 'San Pellegrino')).toBe('Citrus');
  });

  it('prefers the more specific rule when several could match', () => {
    // Rule order matters: birch beer and root beer both contain "beer", and
    // sarsaparilla must not fall through to something broader.
    expect(classifyFlavor('Birch Beer', '')).toBe('Birch Beer');
    expect(classifyFlavor('Sarsaparilla No. 7', '')).toBe('Sarsaparilla');
  });

  it('is case insensitive', () => {
    expect(classifyFlavor('ROOT BEER', '')).toBe('Root Beer');
  });

  it('falls back to the brand when the name gives nothing away', () => {
    expect(classifyFlavor('No. 7', 'Reeds Ginger')).toBe('Ginger');
  });

  it('returns null when nothing matches, rather than guessing', () => {
    expect(classifyFlavor('Mystery Bottle', 'Unknown')).toBeNull();
  });
});

describe('computeStats', () => {
  it('counts ratings, distinct brands and the average', () => {
    const stats = computeStats([r('A', 'Boylan', 5), r('B', 'Boylan', 4), r('C', 'Fentimans', 3)]);
    expect(stats).toEqual({ total: 3, uniqueBrands: 2, avg: 4 });
  });

  it('ignores blank and whitespace-only brands when counting distinct ones', () => {
    const stats = computeStats([r('A', '', 5), r('B', '   ', 4), r('C', 'Boylan', 3)]);
    expect(stats.uniqueBrands).toBe(1);
  });

  it('returns zeroes rather than NaN with no ratings', () => {
    expect(computeStats([])).toEqual({ total: 0, uniqueBrands: 0, avg: 0 });
  });

  it('rounds the average to one decimal', () => {
    expect(computeStats([r('A', 'X', 5), r('B', 'X', 4), r('C', 'X', 4)]).avg).toBe(4.3);
  });
});

describe('generateProfile', () => {
  const fiveRootBeers = [
    r('Sprecher Root Beer', 'Sprecher', 5),
    r('Virgil Root Beer', 'Virgil', 4.5),
    r('Bundaberg Root Beer', 'Bundaberg', 4),
    r('Barq Root Beer', 'Barq', 4),
    r('A&W Root Beer', 'A&W', 3.5),
  ];

  it('stays quiet until there is enough to say something', () => {
    // The card is hidden below five ratings; returning prose from two would be noise.
    expect(generateProfile(fiveRootBeers.slice(0, 4))).toBeNull();
    expect(generateProfile([])).toBeNull();
  });

  it('produces a profile once five ratings exist', () => {
    const profile = generateProfile(fiveRootBeers);
    expect(profile).toBeTruthy();
    expect(profile).toContain('Root beer');
  });

  it('mentions the dominant flavour and the scoring personality', () => {
    const profile = generateProfile(fiveRootBeers)!;
    expect(profile).toMatch(/root beer/i);
    // avg here is 4.2, the "generous taster" band
    expect(profile).toContain('generous taster');
  });

  it('describes a demanding palate differently from a generous one', () => {
    const harsh = fiveRootBeers.map((x) => ({ ...x, score: 2 }));
    expect(generateProfile(harsh)!).toContain('demanding critic');
  });

  it('copes with ratings it cannot classify at all', () => {
    const unknowns = Array.from({ length: 5 }, (_, i) => r(`Mystery ${i}`, 'Unknown', 4));
    const profile = generateProfile(unknowns);
    expect(profile).toBeTruthy();
    expect(profile).not.toContain('undefined');
    expect(profile).not.toContain('NaN');
  });

  it('never leaks undefined or NaN into the prose', () => {
    const mixed = [
      r('Sprecher Root Beer', 'Sprecher', 5),
      r('Cherry Cream Soda', 'Boylan', 4.5),
      r('Ginger Beer', "Reed's", 3.5),
      r('Mystery Bottle', '', 4),
      r('Blood Orange', 'San Pellegrino', 4.5),
      r('Tonic Water', 'Fever-Tree', 3),
    ];
    const profile = generateProfile(mixed)!;
    expect(profile).not.toMatch(/undefined|NaN|\[object/);
    expect(profile.length).toBeGreaterThan(40);
  });
});

describe('flavour rules are case insensitive', () => {
  // Regression: the Citrus and Fruit rules were the only two missing the /i flag, so
  // normally-capitalised names — which is how everyone types them — silently failed
  // to classify, quietly hollowing out two of the largest categories.
  it.each([
    ['Blood Orange Fizz', 'San Pellegrino', 'Citrus'],
    // A cherry cola is a cola: the Cola rule sits above Fruit and wins on order.
    ['Cherry Cola Fizz', 'Fentimans', 'Cola'],
    ['Grapefruit Sparkling', 'Q Mixers', 'Citrus'],
    ['Black Cherry', 'Fentimans', 'Fruit'],
    ['Watermelon Soda', '', 'Fruit'],
    ['Lemon Lime', '', 'Citrus'],
  ])('classifies %s', (name, brand, expected) => {
    expect(classifyFlavor(name, brand)).toBe(expected);
  });

  it('classifies every rule the same however it is capitalised', () => {
    const names = ['Root Beer', 'Sarsaparilla', 'Ginger Beer', 'Cream Soda', 'Lemonade',
                   'Kombucha', 'Tonic', 'Cola', 'Orange', 'Cherry'];
    for (const n of names) {
      expect(classifyFlavor(n.toUpperCase(), '')).toBe(classifyFlavor(n.toLowerCase(), ''));
    }
  });
});
