/**
 * What to say the moment a rating lands.
 *
 * Rating a soda used to be a silent write: you picked a number and the number appeared.
 * Under blind rating it is actually the one moment the app can tell you something you
 * did not already know — either the group's sealed verdict opens, or yours becomes the
 * sealed one. Both are events; neither was ever said out loud.
 *
 * Pure, because the wording is the feature and the wording is what gets it wrong.
 */

export interface OtherScore {
  name: string;
  score: number;
}

export interface Reveal {
  /** `sealed` when you are the first to rate it, so there is nothing to open yet. */
  state: 'sealed' | 'revealed';
  mine: number;
  others: OtherScore[];
  /** The largest distance between your score and anyone else's. 0 when sealed. */
  gap: number;
  /** Whoever you disagree with most — the interesting one to name. */
  furthest: OtherScore | null;
  /** null when sealed, or when you landed on exactly the same score. */
  youWereHigher: boolean | null;
  headline: string;
  detail: string;
}

/** Scores are half-steps, so a gap is too: "2.5", never "2.50" or "3". */
export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function buildReveal(mine: number, others: OtherScore[]): Reveal {
  if (others.length === 0) {
    return {
      state: 'sealed',
      mine,
      others: [],
      gap: 0,
      furthest: null,
      youWereHigher: null,
      headline: 'Sealed',
      // The other half of blind rating, and the half nobody sees: being first is not
      // nothing happening, it is you setting the thing they walk into.
      detail: 'You rated it first. Nobody can see your score until they rate it too.',
    };
  }

  const furthest = others.reduce((a, b) =>
    Math.abs(b.score - mine) > Math.abs(a.score - mine) ? b : a);
  const gap = Math.abs(furthest.score - mine);
  const alone = others.length === 1;

  if (gap === 0) {
    return {
      state: 'revealed', mine, others, gap, furthest, youWereHigher: null,
      headline: 'Dead on',
      detail: alone
        ? `You both said ${formatScore(mine)}.`
        : `Everyone said ${formatScore(mine)}.`,
    };
  }

  const youWereHigher = mine > furthest.score;
  const headline = gap >= 2 ? 'Miles apart' : gap <= 0.5 ? 'Near enough' : 'Split';
  const detail = `${formatScore(gap)} ${gap === 1 ? 'star' : 'stars'} between you and ${furthest.name}` +
    ` — ${youWereHigher ? 'you liked it more' : 'they liked it more'}.`;

  return { state: 'revealed', mine, others, gap, furthest, youWereHigher, headline, detail };
}
