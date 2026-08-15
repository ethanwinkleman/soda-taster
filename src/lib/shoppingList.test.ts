import { describe, it, expect } from 'vitest';
import type { Soda, SodaRating } from '../types/stash';
import {
  buildShoppingCsv, buildShoppingText, fileStem, shoppingListItems, sodaLabel, stockState,
} from './shoppingList';

function rating(score: number): SodaRating {
  return {
    id: 'r', sodaId: 's', userId: 'me', displayName: 'Me',
    score, notes: null, createdAt: '2026-01-01T00:00:00Z',
  };
}

function soda(over: Partial<Soda> & { id: string; name: string }): Soda {
  return {
    stashId: 'st', brand: '', addedBy: 'me', inFridge: false, quantity: 0, imageUrl: null,
    createdAt: '2026-01-01T00:00:00Z', ratings: [], avgScore: null, myRating: null,
    commentCount: 0, ...over,
  };
}

const qtyOne = () => 1;

describe('stockState', () => {
  it('treats a soda that is not in the fridge as out', () => {
    expect(stockState({ inFridge: false, quantity: 0 })).toBe('out');
  });

  it('treats in-fridge-at-zero as out, not low', () => {
    // The soda page decrements quantity without clearing the in-fridge flag, so this
    // state is reachable and means "gone" — badging it "1 left" would bury it.
    expect(stockState({ inFridge: true, quantity: 0 })).toBe('out');
  });

  it('treats the last bottle as low', () => {
    expect(stockState({ inFridge: true, quantity: 1 })).toBe('low');
  });

  it('treats anything more as stocked', () => {
    expect(stockState({ inFridge: true, quantity: 2 })).toBe('stocked');
    expect(stockState({ inFridge: true, quantity: 9 })).toBe('stocked');
  });
});

describe('shoppingListItems', () => {
  const sodas = [
    soda({ id: 'out5', name: 'Out 5.0', myRating: rating(5) }),
    soda({ id: 'low45', name: 'Low 4.5', myRating: rating(4.5), inFridge: true, quantity: 1 }),
    soda({ id: 'zero4', name: 'Fridge zero 4.0', myRating: rating(4), inFridge: true, quantity: 0 }),
    soda({ id: 'stocked5', name: 'Stocked 5.0', myRating: rating(5), inFridge: true, quantity: 2 }),
    soda({ id: 'meh', name: 'Out 3.5', myRating: rating(3.5) }),
    soda({ id: 'mehlow', name: 'Low 2.0', myRating: rating(2), inFridge: true, quantity: 1 }),
    soda({ id: 'unrated', name: 'Unrated', myRating: null }),
  ];

  it('includes only sodas worth buying that are gone or running low', () => {
    expect(shoppingListItems(sodas).map((s) => s.id)).toEqual(['out5', 'low45', 'zero4']);
  });

  it('excludes a top-rated soda that is well stocked', () => {
    expect(shoppingListItems(sodas).some((s) => s.id === 'stocked5')).toBe(false);
  });

  it('excludes sodas rated below four however low the stock', () => {
    const ids = shoppingListItems(sodas).map((s) => s.id);
    expect(ids).not.toContain('meh');
    expect(ids).not.toContain('mehlow');
  });

  it('excludes unrated sodas', () => {
    expect(shoppingListItems(sodas).some((s) => s.id === 'unrated')).toBe(false);
  });

  it('includes a soda rated exactly four', () => {
    // The threshold is inclusive; an off-by-one here silently drops a whole tier.
    expect(shoppingListItems([soda({ id: 'x', name: 'Four', myRating: rating(4) })])).toHaveLength(1);
  });

  it('sorts by rating, highest first', () => {
    expect(shoppingListItems(sodas).map((s) => s.myRating!.score)).toEqual([5, 4.5, 4]);
  });

  it('returns nothing when everything good is stocked', () => {
    expect(shoppingListItems([sodas[3]])).toEqual([]);
  });
});

describe('buildShoppingText', () => {
  const items = [
    soda({ id: 'a', name: 'Cane Cola', brand: 'Boylan', myRating: rating(5) }),
    soda({ id: 'b', name: 'Sarsaparilla', brand: 'Sprecher', myRating: rating(4.5), inFridge: true, quantity: 1 }),
    soda({ id: 'c', name: 'No Brand', myRating: rating(4) }),
  ];

  it('writes a copyable list', () => {
    expect(buildShoppingText({ stashName: 'Tasting Night', items, quantityOf: qtyOne, date: 'March 3, 2026' }))
      .toBe([
        'Shopping List — Tasting Night',
        'March 3, 2026',
        '',
        '★★★★★  Cane Cola (Boylan)',
        '★★★★½  Sarsaparilla (Sprecher)  (1 left)',
        '★★★★☆  No Brand',
        '',
        '3 items · Soda Taster',
      ].join('\n'));
  });

  it('annotates only the running-low ones', () => {
    const text = buildShoppingText({ stashName: 'S', items, quantityOf: qtyOne, date: 'd' });
    expect(text.match(/\(1 left\)/g)).toHaveLength(1);
  });

  it('shows a multiplier and a unit total once a quantity is raised', () => {
    const text = buildShoppingText({
      stashName: 'S', items, date: 'd',
      quantityOf: (id) => (id === 'a' ? 3 : 1),
    });
    expect(text).toContain('★★★★★  Cane Cola (Boylan)  ×3');
    expect(text).toContain('3 items · 5 units · Soda Taster');
  });

  it('uses the singular for one item', () => {
    const text = buildShoppingText({ stashName: 'S', items: [items[0]], quantityOf: qtyOne, date: 'd' });
    expect(text).toContain('1 item · Soda Taster');
  });
});

describe('buildShoppingCsv', () => {
  it('emits a header and one row per item with its stock state', () => {
    const items = [
      soda({ id: 'a', name: 'Cane Cola', brand: 'Boylan', myRating: rating(5) }),
      soda({ id: 'b', name: 'Sarsaparilla', brand: 'Sprecher', myRating: rating(4.5), inFridge: true, quantity: 1 }),
    ];
    expect(buildShoppingCsv(items, qtyOne)).toBe([
      'Name,Brand,My Rating,Stock,Quantity',
      'Cane Cola,Boylan,5,Out of stock,1',
      'Sarsaparilla,Sprecher,4.5,1 left,1',
    ].join('\n'));
  });

  it('quotes cells containing commas or quotes so columns do not shift', () => {
    const items = [soda({ id: 'a', name: 'Cola, Extra Hot', brand: 'The "Good" Co', myRating: rating(4) })];
    const row = buildShoppingCsv(items, qtyOne).split('\n')[1];
    expect(row).toBe('"Cola, Extra Hot","The ""Good"" Co",4,Out of stock,1');
  });
});

describe('sodaLabel and fileStem', () => {
  it('omits the brand when there is not one', () => {
    expect(sodaLabel({ name: 'Cola', brand: '' })).toBe('Cola');
    expect(sodaLabel({ name: 'Cola', brand: 'Boylan' })).toBe('Cola (Boylan)');
  });

  it('makes a filename-safe stem', () => {
    expect(fileStem("Dad's Tasting Night!")).toBe('Dad_s_Tasting_Night_');
  });
});
