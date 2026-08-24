import { describe, it, expect } from 'vitest';
import {
  isRevealed,
  visibleRatings,
  visibleAvg,
  hiddenCount,
  revealedSodas,
  ratingDistribution,
  hasVisibleRatingAt,
  RATING_BUCKETS,
} from './ratingVisibility';
import type { Soda, SodaRating } from '../types/stash';

function rating(userId: string, score: number): SodaRating {
  return {
    id: `${userId}-${score}`,
    sodaId: 'soda',
    userId,
    displayName: userId,
    score,
    notes: null,
    createdAt: '2026-01-01',
  };
}

function soda(ratings: SodaRating[], me = 'me'): Soda {
  const mine = ratings.find((r) => r.userId === me) ?? null;
  const avg = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10
    : null;
  return {
    id: 'soda', stashId: 'stash', name: 'Root Beer', brand: 'Acme', addedBy: 'me',
    inFridge: false, quantity: 0, imageUrl: null, createdAt: '2026-01-01',
    ratings, avgScore: avg, myRating: mine, commentCount: 0,
  };
}

describe('isRevealed', () => {
  it('hides a soda others have rated but you have not', () => {
    expect(isRevealed(soda([rating('alice', 4.5)]))).toBe(false);
  });

  it('reveals once you have rated it yourself', () => {
    expect(isRevealed(soda([rating('alice', 4.5), rating('me', 3)]))).toBe(true);
  });

  it('reveals an unrated soda — there is no verdict to spoil', () => {
    expect(isRevealed(soda([]))).toBe(true);
  });

  it('reveals when the only rating is your own', () => {
    expect(isRevealed(soda([rating('me', 3)]))).toBe(true);
  });
});

describe('what a blind soda exposes', () => {
  const blind = soda([rating('alice', 4.5), rating('bob', 5)]);

  it('withholds the group average', () => {
    expect(blind.avgScore).not.toBeNull();   // the data is there
    expect(visibleAvg(blind)).toBeNull();    // the view does not show it
  });

  it('withholds every rating', () => {
    expect(visibleRatings(blind)).toEqual([]);
  });

  it('still says how many are being withheld, which gives nothing away', () => {
    expect(hiddenCount(blind)).toBe(2);
  });

  it('reports nothing hidden once revealed', () => {
    expect(hiddenCount(soda([rating('alice', 4.5), rating('me', 3)]))).toBe(0);
  });
});

describe('revealedSodas', () => {
  it('keeps blind sodas out of collection-wide metrics', () => {
    const list = [
      soda([rating('alice', 5)]),                       // blind
      soda([rating('alice', 2), rating('me', 2)]),      // revealed
      soda([]),                                          // unrated, nothing to spoil
    ];
    expect(revealedSodas(list)).toHaveLength(2);
  });
});

describe('ratingDistribution', () => {
  it('has exactly the 10 half-step buckets, 0.5 through 5.0', () => {
    const d = ratingDistribution([]);
    expect(d).toHaveLength(10);
    expect(d.map((b) => b.score)).toEqual(RATING_BUCKETS);
    expect(d[0].score).toBe(0.5);
    expect(d[9].score).toBe(5);
  });

  it('counts every visible rating into its bucket', () => {
    const d = ratingDistribution([
      soda([rating('me', 4.5), rating('alice', 4.5)]),
      soda([rating('me', 2)]),
    ]);
    expect(d.find((b) => b.score === 4.5)!.count).toBe(2);
    expect(d.find((b) => b.score === 2)!.count).toBe(1);
    expect(d.find((b) => b.score === 5)!.count).toBe(0);
  });

  it('does not count ratings it is refusing to show', () => {
    // Alice rated it 5, you have not rated it — that 5 must not appear anywhere.
    const d = ratingDistribution([soda([rating('alice', 5)])]);
    expect(d.every((b) => b.count === 0)).toBe(true);
  });

  it('counts your own rating on a soda others have also rated blind', () => {
    const d = ratingDistribution([soda([rating('alice', 5), rating('me', 1)])]);
    expect(d.find((b) => b.score === 1)!.count).toBe(1);
    expect(d.find((b) => b.score === 5)!.count).toBe(1); // revealed, so both count
  });

  it('counts your own ratings as a separate series', () => {
    const d = ratingDistribution([
      soda([rating('me', 4.5), rating('alice', 2)]),
      soda([rating('me', 4.5)]),
      soda([rating('alice', 2), rating('me', 1)]),
    ]);
    expect(d.find((b) => b.score === 4.5)!.mine).toBe(2);
    expect(d.find((b) => b.score === 2)!.mine).toBe(0);   // both 2.0s are Alice's
    expect(d.find((b) => b.score === 1)!.mine).toBe(1);
  });

  it('counts you inside everyone too — the room includes you', () => {
    const d = ratingDistribution([soda([rating('me', 3)])]);
    const bucket = d.find((b) => b.score === 3)!;
    expect(bucket.count).toBe(1);
    expect(bucket.mine).toBe(1);
  });

  it('never reports more of yours than there are in total', () => {
    // The chart draws yours inset inside everyone's, which is only legible while
    // this holds. It holds because your rating is one of the visible ones.
    const d = ratingDistribution([
      soda([rating('me', 5), rating('alice', 5), rating('bob', 1)]),
      soda([rating('alice', 3)]),
      soda([rating('me', 2), rating('bob', 2)]),
    ]);
    for (const b of d) expect(b.mine).toBeLessThanOrEqual(b.count);
  });

  it('reports none of yours on a soda you have not rated', () => {
    const d = ratingDistribution([soda([rating('alice', 4)])]);
    expect(d.every((b) => b.mine === 0)).toBe(true);
  });

  it('labels whole numbers without a decimal and halves with one', () => {
    const d = ratingDistribution([]);
    expect(d.find((b) => b.score === 3)!.label).toBe('3');
    expect(d.find((b) => b.score === 3.5)!.label).toBe('3.5');
  });
});

describe('hasVisibleRatingAt', () => {
  it('matches a soda by one of its visible ratings', () => {
    const s = soda([rating('me', 4), rating('alice', 2)]);
    expect(hasVisibleRatingAt(s, 4)).toBe(true);
    expect(hasVisibleRatingAt(s, 2)).toBe(true);
    expect(hasVisibleRatingAt(s, 5)).toBe(false);
  });

  it('never matches a blind soda on someone else\'s score', () => {
    expect(hasVisibleRatingAt(soda([rating('alice', 4)]), 4)).toBe(false);
  });
});
