/**
 * What a new account still has to do before the app does anything for them.
 *
 * The loop that makes this app worth opening is: keep a collection → put sodas in it →
 * rate them. Someone who stops after step one sees an empty list and no palate profile,
 * and nothing on screen says why.
 *
 * Every step is **derived from what the account actually has**, never from a stored
 * "step 3 of 3" cursor. A wizard cursor goes wrong in both directions: it re-teaches
 * someone who joined a friend's collection that is already full of rated sodas, and it
 * stays finished for someone who deleted everything and started over. It also cannot
 * survive a new device, where a cursor in localStorage does not exist but the account's
 * collections do.
 */

export type StepId = 'create' | 'add' | 'rate';

export interface Progress {
  stashCount: number;
  /** Sodas across every collection the account can see. */
  sodaCount: number;
  /** Ratings this person has left, not ratings on their sodas. */
  ratingCount: number;
}

export interface Step {
  id: StepId;
  title: string;
  /** One line on what it gets you — not what to tap. */
  hint: string;
  done: boolean;
}

export function onboardingSteps(p: Progress): Step[] {
  return [
    {
      id: 'create',
      title: 'Start a collection',
      hint: 'A fridge, a tasting night, a road trip — anything you want to keep track of.',
      done: p.stashCount > 0,
    },
    {
      id: 'add',
      title: 'Add a soda',
      hint: 'Scan a barcode or type the name. Quick Add keeps up at a tasting.',
      done: p.sodaCount > 0,
    },
    {
      id: 'rate',
      title: 'Rate one',
      hint: 'Your palate profile builds itself out of what you score.',
      done: p.ratingCount > 0,
    },
  ];
}

export function completedCount(p: Progress): number {
  return onboardingSteps(p).filter((s) => s.done).length;
}

export function isOnboardingComplete(p: Progress): boolean {
  return onboardingSteps(p).every((s) => s.done);
}

/** The first thing left to do, or null when there is nothing. */
export function nextStep(p: Progress): Step | null {
  return onboardingSteps(p).find((s) => !s.done) ?? null;
}

/**
 * Whether to show the checklist at all.
 *
 * Not shown before the first collection exists: the collections page already has an
 * empty state that says the same thing, and two panels making the same request is worse
 * than one. It disappears on its own when the loop has been completed once — finishing
 * is the dismissal, so nothing has to be stored for the common case.
 */
export function shouldShowOnboarding(p: Progress, dismissed: boolean): boolean {
  return !dismissed && p.stashCount > 0 && !isOnboardingComplete(p);
}
