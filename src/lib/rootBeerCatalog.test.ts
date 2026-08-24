import { describe, it, expect } from 'vitest';
import { ROOT_BEER_CATALOG, recommendSodas, RETAILERS, searchQuery } from './rootBeerCatalog';
import { DESCRIPTORS } from './flavorNotes';
import type { NotePreference } from './flavorNotes';

const VOCAB = new Set(DESCRIPTORS.map((d) => d.id));

function pref(id: string, avg: number, sodas = 3): NotePreference {
  return { id, label: id, avg, sodas };
}

describe('the catalog itself', () => {
  it('describes every soda in the shared vocabulary', () => {
    // A typo'd note id is silent: the soda simply never matches anything and quietly
    // stops being recommendable. This is the check that catches it.
    const unknown = ROOT_BEER_CATALOG.flatMap((s) =>
      s.notes.filter((n) => !VOCAB.has(n)).map((n) => `${s.brand} ${s.name}: "${n}"`),
    );
    expect(unknown).toEqual([]);
  });

  it('gives every entry a brand, a name and a reason', () => {
    for (const s of ROOT_BEER_CATALOG) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.brand.length).toBeGreaterThan(0);
      expect(s.blurb.length).toBeGreaterThan(10);
      expect(s.notes.length).toBeGreaterThan(0);
    }
  });

  it('lists no duplicates', () => {
    const keys = ROOT_BEER_CATALOG.map((s) => `${s.brand}|${s.name}`.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('recommendSodas', () => {
  it('recommends nothing until it knows what you like', () => {
    expect(recommendSodas([], [])).toEqual([]);
  });

  it('ignores notes you score badly — a match on those is an argument against', () => {
    expect(recommendSodas([pref('bitter', 1.5)], [])).toEqual([]);
  });

  it('ranks a soda by the notes it shares with your palate', () => {
    const recs = recommendSodas([pref('creamy', 4.8), pref('vanilla', 4.6)], []);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].matched.length).toBeGreaterThan(0);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
    }
  });

  it('explains itself — every recommendation names the notes behind it', () => {
    const recs = recommendSodas([pref('wintergreen', 4.7)], []);
    expect(recs[0].matched.map((m) => m.id)).toContain('wintergreen');
  });

  it('never recommends something already in your stash', () => {
    const all = recommendSodas([pref('vanilla', 4.6)], [], 50);
    const target = all[0].soda;
    const without = recommendSodas([pref('vanilla', 4.6)], [{ name: target.name, brand: target.brand }], 50);
    expect(without.map((r) => `${r.soda.brand}|${r.soda.name}`))
      .not.toContain(`${target.brand}|${target.name}`);
  });

  it('matches an owned soda despite different casing and punctuation', () => {
    const all = recommendSodas([pref('vanilla', 4.6)], [], 50);
    const target = all[0].soda;
    const without = recommendSodas(
      [pref('vanilla', 4.6)],
      [{ name: target.name.toUpperCase(), brand: `  ${target.brand.toLowerCase()}  ` }],
      50,
    );
    expect(without.map((r) => `${r.soda.brand}|${r.soda.name}`))
      .not.toContain(`${target.brand}|${target.name}`);
  });

  it('respects the limit', () => {
    expect(recommendSodas([pref('vanilla', 4.6), pref('sweet', 4.5)], [], 3).length).toBeLessThanOrEqual(3);
  });
});

describe('retailer links', () => {
  it('URL-encodes the query so brands with punctuation still work', () => {
    const url = RETAILERS[0].search("Dad's Root Beer");
    expect(url).not.toContain(' ');
    expect(url).toContain('Root');
    expect(() => new URL(url)).not.toThrow();
  });

  it('builds every retailer link as a valid absolute https URL', () => {
    for (const r of RETAILERS) {
      const url = new URL(r.search(searchQuery({ name: 'Root Beer', brand: 'Sprecher' })));
      expect(url.protocol).toBe('https:');
    }
  });

  it('searches for brand and name together', () => {
    expect(searchQuery({ name: 'Root Beer', brand: 'Sprecher' })).toBe('Sprecher Root Beer');
  });
});
