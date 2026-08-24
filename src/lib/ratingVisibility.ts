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
  count: number;
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
  for (const soda of sodas) {
    for (const rating of visibleRatings(soda)) {
      const bucket = toBucket(rating.score);
      const current = counts.get(bucket);
      if (current !== undefined) counts.set(bucket, current + 1);
    }
  }
  return RATING_BUCKETS.map((score) => ({
    score,
    label: score % 1 === 0 ? String(score) : score.toFixed(1),
    count: counts.get(score) ?? 0,
  }));
}

/** Whether a soda carries at least one visible rating at the given score. */
export function hasVisibleRatingAt(soda: Soda, score: number): boolean {
  return visibleRatings(soda).some((r) => toBucket(r.score) === score);
}
