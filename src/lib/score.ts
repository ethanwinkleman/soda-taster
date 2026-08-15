/**
 * Averaging rules for scores, in one place because they were duplicated three times
 * in useStashSodas and drifting was only a matter of time.
 *
 * Scores are half-steps from 0.5 to 5.0, and the displayed average is rounded to one
 * decimal — so an average is not necessarily a valid score itself (4.0 and 4.5 average
 * to 4.3, which no one can award).
 */

export function averageScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(mean * 10) / 10;
}

export function averageOf<T>(items: T[], pick: (item: T) => number | null | undefined): number | null {
  const scores = items.map(pick).filter((s): s is number => typeof s === 'number');
  return averageScore(scores);
}

/**
 * Star glyphs for a score, always five positions wide.
 * Half-steps are real, so 4.5 must not silently render as four stars.
 */
export function starGlyphs(score: number): string {
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
}
