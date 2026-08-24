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
   * The honest version of "how different am I".
   *
   * Comparing two averages compares two different sets of sodas — if you happened to
   * rate the good ones, you look generous when you are not. This instead looks only
   * at sodas you and someone else have both rated, takes your score minus their
   * average on each, and averages that. Same sodas, so the difference is you.
   */
  shared: { sodas: number; avgGap: number | null };
}

export function ratingComparison(sodas: Soda[]): RatingComparison {
  const mineScores: number[] = [];
  const otherScores: number[] = [];
  const gaps: number[] = [];

  for (const soda of sodas) {
    const visible = visibleRatings(soda);
    const myScore = soda.myRating?.score ?? null;
    const theirs = visible.filter((r) => r.userId !== soda.myRating?.userId).map((r) => r.score);

    if (myScore !== null) mineScores.push(myScore);
    otherScores.push(...theirs);

    if (myScore !== null && theirs.length > 0) {
      gaps.push(myScore - theirs.reduce((a, b) => a + b, 0) / theirs.length);
    }
  }

  const mean = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

  const myAvg = mean(mineScores);
  const theirAvg = mean(otherScores);

  return {
    mine: { count: mineScores.length, avg: myAvg },
    others: { count: otherScores.length, avg: theirAvg },
    delta: myAvg !== null && theirAvg !== null ? Math.round((myAvg - theirAvg) * 10) / 10 : null,
    shared: { sodas: gaps.length, avgGap: mean(gaps) },
  };
}
