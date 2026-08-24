import { describe, it, expect } from 'vitest';
import {
  ratingComparison,
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

  it('splits every visible rating into exactly one of the two series', () => {
    const d = ratingDistribution([
      soda([rating('me', 4.5), rating('alice', 4.5)]),
      soda([rating('me', 2)]),
    ]);
    const at = (score: number) => d.find((b) => b.score === score)!;
    expect(at(4.5).mine).toBe(1);
    expect(at(4.5).others).toBe(1);
    expect(at(2).mine).toBe(1);
    expect(at(2).others).toBe(0);
    expect(at(5).mine + at(5).others).toBe(0);
  });

  it('never counts you in the "others" series', () => {
    // The whole point of the split: comparing you against a group that includes you
    // compares you partly against yourself, and the two averages converge.
    const d = ratingDistribution([soda([rating('me', 3)])]);
    const bucket = d.find((b) => b.score === 3)!;
    expect(bucket.mine).toBe(1);
    expect(bucket.others).toBe(0);
  });

  it('does not count ratings it is refusing to show', () => {
    // Alice rated it 5, you have not rated it — that 5 must not appear anywhere.
    const d = ratingDistribution([soda([rating('alice', 5)])]);
    expect(d.every((b) => b.mine === 0 && b.others === 0)).toBe(true);
  });

  it('counts both sides once a blind soda is revealed', () => {
    const d = ratingDistribution([soda([rating('alice', 5), rating('me', 1)])]);
    expect(d.find((b) => b.score === 1)!.mine).toBe(1);
    expect(d.find((b) => b.score === 5)!.others).toBe(1);
  });

  it('attributes each score to whoever actually gave it', () => {
    const d = ratingDistribution([
      soda([rating('me', 4.5), rating('alice', 2)]),
      soda([rating('me', 4.5)]),
      soda([rating('alice', 2), rating('me', 1)]),
    ]);
    expect(d.find((b) => b.score === 4.5)!.mine).toBe(2);
    expect(d.find((b) => b.score === 2)!.mine).toBe(0);    // both 2.0s are Alice's
    expect(d.find((b) => b.score === 2)!.others).toBe(2);
    expect(d.find((b) => b.score === 1)!.mine).toBe(1);
  });

  it('loses no rating in the split', () => {
    const list = [
      soda([rating('me', 5), rating('alice', 5), rating('bob', 1)]),
      soda([rating('me', 2), rating('bob', 2)]),
    ];
    const total = list.reduce((n, s) => n + s.ratings.length, 0);
    const d = ratingDistribution(list);
    expect(d.reduce((n, b) => n + b.mine + b.others, 0)).toBe(total);
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


describe('ratingComparison', () => {
  it('keeps you out of the others average', () => {
    const c = ratingComparison([soda([rating('me', 5), rating('alice', 1)])]);
    expect(c.mine).toEqual({ count: 1, avg: 5 });
    expect(c.others).toEqual({ count: 1, avg: 1 });
    expect(c.delta).toBe(4);
  });

  it('reports the per-soda gap, not the difference of two averages', () => {
    // You rated the two sodas you and Alice both tried a point below her, and also
    // rated a third soda 5 that she never tried. Comparing bare averages would let
    // that third soda flatter you; the shared gap must not move.
    const c = ratingComparison([
      soda([rating('me', 3), rating('alice', 4)]),
      soda([rating('me', 2), rating('alice', 3)]),
      soda([rating('me', 5)]),
    ]);
    expect(c.shared.sodas).toBe(2);
    expect(c.shared.avgGap).toBe(-1);
    // The naive comparison disagrees, which is exactly why the gap exists.
    expect(c.delta).not.toBe(-1);
  });

  it('averages the others on a soda before comparing, so one soda is one vote', () => {
    // Three people rated it 2, you rated it 5. That is a gap of 3, not of nine.
    const c = ratingComparison([
      soda([rating('me', 5), rating('a', 2), rating('b', 2), rating('c', 2)]),
    ]);
    expect(c.shared.avgGap).toBe(3);
  });

  it('never lets the headline pair disagree with the gap', () => {
    // The trap this guards: your overall average can point the opposite way to how
    // you actually score against other people. One soda rated 3 against their 4,
    // plus two nobody else has tried rated 5, gives an overall 4.3 against their 4.0
    // — while you are a full point below them on the only soda you have both tried.
    // The headline reads the shared pair for exactly this reason.
    const c = ratingComparison([
      soda([rating('me', 3), rating('alice', 4)]),
      soda([rating('me', 5)]),
      soda([rating('me', 5)]),
    ]);
    expect(c.mine.avg).toBe(4.3);          // overall, and misleading on its own
    expect(c.delta).toBe(0.3);             // points the wrong way
    expect(c.shared.myAvg).toBe(3);        // what the card shows
    expect(c.shared.othersAvg).toBe(4);
    expect(c.shared.avgGap).toBe(-1);
    // The two numbers on the card and the sentence under them must agree.
    expect(c.shared.myAvg! - c.shared.othersAvg!).toBeCloseTo(c.shared.avgGap!, 5);
  });

  it('keeps the shown pair and the gap consistent under rounding', () => {
    const c = ratingComparison([
      soda([rating('me', 4), rating('alice', 3)]),
      soda([rating('me', 3), rating('alice', 3), rating('bob', 4)]),
      soda([rating('me', 5), rating('alice', 4)]),
    ]);
    expect(c.shared.avgGap).toBeCloseTo(
      Math.round((c.shared.myAvg! - c.shared.othersAvg!) * 10) / 10, 5);
  });

  it('has nothing to say about sodas only one side has rated', () => {
    const c = ratingComparison([soda([rating('me', 5)]), soda([rating('me', 1)])]);
    expect(c.shared.sodas).toBe(0);
    expect(c.shared.avgGap).toBeNull();
    expect(c.shared.myAvg).toBeNull();
    expect(c.shared.othersAvg).toBeNull();
    expect(c.others.avg).toBeNull();
    expect(c.delta).toBeNull();
  });

  it('ignores ratings that are still sealed', () => {
    // You have not rated it, so Alice's 5 is hidden — it cannot show up in her
    // average either, or the chart would leak what the soda page is withholding.
    const c = ratingComparison([soda([rating('alice', 5)])]);
    expect(c.others.count).toBe(0);
    expect(c.mine.count).toBe(0);
  });

  it('says nothing at all for an empty stash', () => {
    const c = ratingComparison([]);
    expect(c.mine.avg).toBeNull();
    expect(c.others.avg).toBeNull();
    expect(c.delta).toBeNull();
    expect(c.shared).toEqual({ sodas: 0, myAvg: null, othersAvg: null, avgGap: null });
  });
});
