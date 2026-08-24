import type { Soda, SodaRating } from '../types/stash';

/**
 * Blind rating: a soda's group verdict stays hidden until you have filed your own.
 *
 * Seeing that three people called it a 4.5 makes it very hard to write down the 3.0
 * you actually tasted, and a stash where everyone anchors on the first rating has
 * stopped measuring anything. The reveal is a one-way door you open yourself.
 *
 * Two cases are never hidden, because there is no verdict to spoil:
 *   - nobody has rated it yet
 *   - the only rating is your own
 */
export function isRevealed(soda: Soda): boolean {
  return soda.myRating !== null || soda.ratings.length === 0;
}

/** Ratings you may see: all of them once revealed, otherwise only your own. */
export function visibleRatings(soda: Soda): SodaRating[] {
  if (isRevealed(soda)) return soda.ratings;
  return soda.myRating ? [soda.myRating] : [];
}

/** The group average, or null while the soda is still blind. */
export function visibleAvg(soda: Soda): number | null {
  return isRevealed(soda) ? soda.avgScore : null;
}

/**
 * How many ratings are being withheld.
 *
 * The count is deliberately still shown. "3 ratings hidden" is a reason to go taste
 * the thing, and unlike the scores it gives nothing away about what they said.
 */
export function hiddenCount(soda: Soda): number {
  return isRevealed(soda) ? 0 : soda.ratings.length - visibleRatings(soda).length;
}

/**
 * Sodas whose group numbers may be used in collection-wide metrics.
 *
 * The average, the top three and the "most divisive" pick all read avgScore, so a
 * blind soda has to be left out of them — otherwise the leaderboard prints the exact
 * score the soda page is refusing to show.
 */
export function revealedSodas(sodas: Soda[]): Soda[] {
  return sodas.filter(isRevealed);
}

/** The 10 scores a rating can take: 0.5 … 5.0 in half steps. */
export const RATING_BUCKETS = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5);

/** Snap a score to its half-step bucket. */
export function toBucket(score: number): number {
  return Math.round(score * 2) / 2;
}

export interface DistributionBucket {
  score: number;
  label: string;
  /** Yours. */
  mine: number;
  /** Everyone else's. Disjoint from `mine` — you are not in both. */
  others: number;
}

/**
 * Ratings per score across a stash.
 *
 * Built from *visible* ratings only. Counting blind sodas here would leak the very
 * numbers isRevealed() is withholding — in a small stash, one unrated soda plus a
 * total is enough to work out what everyone else gave it.
 */
export function ratingDistribution(sodas: Soda[]): DistributionBucket[] {
  const counts = new Map<number, number>(RATING_BUCKETS.map((s) => [s, 0]));
  const mine = new Map<number, number>(RATING_BUCKETS.map((s) => [s, 0]));

  const bump = (map: Map<number, number>, score: number) => {
    const bucket = toBucket(score);
    const current = map.get(bucket);
    if (current !== undefined) map.set(bucket, current + 1);
  };

  for (const soda of sodas) {
    // The two series are disjoint: your rating goes in yours, everyone else's in
    // theirs. Counting yourself into both — which is what "Everyone" used to mean —
    // compares you against a group that is mostly you, so the averages converge and
    // the bars have to be drawn nested to stay truthful. Splitting them makes the
    // comparison real and lets the bars sit side by side.
    for (const rating of visibleRatings(soda)) {
      if (rating.userId === soda.myRating?.userId) bump(mine, rating.score);
      else bump(counts, rating.score);
    }
  }

  return RATING_BUCKETS.map((score) => ({
    score,
    label: score % 1 === 0 ? String(score) : score.toFixed(1),
    mine: mine.get(score) ?? 0,
    others: counts.get(score) ?? 0,
  }));
}

/** Whether a soda carries at least one visible rating at the given score. */
export function hasVisibleRatingAt(soda: Soda, score: number): boolean {
  return visibleRatings(soda).some((r) => toBucket(r.score) === score);
}


export interface RatingComparison {
  mine: { count: number; avg: number | null };
  others: { count: number; avg: number | null };
  /** Your average minus theirs. Positive means you rate more generously. */
  delta: number | null;
  /**
   * The comparable pair, and the only one worth putting side by side.
   *
   * Overall averages cover different sets of sodas: yours includes ones nobody else
   * has tried, theirs cannot. That is not a rounding difference — the two can point
   * in opposite directions. Rate one soda 3 against their 4, then rate two more at 5
   * that nobody else has touched, and your overall average is 4.3 against their 4.0
   * while you are a full point below them on the only soda you have both tried.
   *
   * These are restricted to sodas you and someone else have both rated, one vote per
   * soda. Because both are plain means over the same set, avgGap is exactly
   * myAvg - othersAvg, so the headline and the sentence can never disagree.
   */
  shared: { sodas: number; myAvg: number | null; othersAvg: number | null; avgGap: number | null };
}

export function ratingComparison(sodas: Soda[]): RatingComparison {
  const mineScores: number[] = [];
  const otherScores: number[] = [];
  // One entry per soda you have both rated, so a soda with three other raters
  // counts once rather than three times.
  const sharedMine: number[] = [];
  const sharedOthers: number[] = [];

  for (const soda of sodas) {
    const visible = visibleRatings(soda);
    const myScore = soda.myRating?.score ?? null;
    const theirs = visible.filter((r) => r.userId !== soda.myRating?.userId).map((r) => r.score);

    if (myScore !== null) mineScores.push(myScore);
    otherScores.push(...theirs);

    if (myScore !== null && theirs.length > 0) {
      sharedMine.push(myScore);
      sharedOthers.push(theirs.reduce((a, b) => a + b, 0) / theirs.length);
    }
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const rawMean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const mean = (xs: number[]) => {
    const m = rawMean(xs);
    return m === null ? null : round1(m);
  };

  const myAvg = mean(mineScores);
  const theirAvg = mean(otherScores);

  // Gap from the unrounded means, then rounded once — rounding each side first can
  // shift the gap by a tenth and make it disagree with the two numbers shown.
  const sharedMineMean = rawMean(sharedMine);
  const sharedOthersMean = rawMean(sharedOthers);

  return {
    mine: { count: mineScores.length, avg: myAvg },
    others: { count: otherScores.length, avg: theirAvg },
    delta: myAvg !== null && theirAvg !== null ? round1(myAvg - theirAvg) : null,
    shared: {
      sodas: sharedMine.length,
      myAvg: mean(sharedMine),
      othersAvg: mean(sharedOthers),
      avgGap:
        sharedMineMean !== null && sharedOthersMean !== null
          ? round1(sharedMineMean - sharedOthersMean)
          : null,
    },
  };
}
