import { describe, it, expect } from 'vitest';
import {
  onboardingSteps,
  completedCount,
  isOnboardingComplete,
  nextStep,
  shouldShowOnboarding,
  type Progress,
} from './onboarding';

const p = (over: Partial<Progress> = {}): Progress => ({
  stashCount: 0, sodaCount: 0, ratingCount: 0, ...over,
});

describe('onboardingSteps', () => {
  it('marks each step from what the account has', () => {
    const steps = onboardingSteps(p({ stashCount: 1, sodaCount: 2, ratingCount: 0 }));
    expect(steps.map((s) => [s.id, s.done])).toEqual([
      ['create', true], ['add', true], ['rate', false],
    ]);
  });

  it('keeps the order stable, so the list does not reshuffle as steps complete', () => {
    expect(onboardingSteps(p()).map((s) => s.id)).toEqual(['create', 'add', 'rate']);
    expect(onboardingSteps(p({ stashCount: 3, sodaCount: 9, ratingCount: 4 })).map((s) => s.id))
      .toEqual(['create', 'add', 'rate']);
  });

  it('does not require the steps to be done in order', () => {
    // Joining a friend's collection lands you with sodas already in it.
    const steps = onboardingSteps(p({ stashCount: 1, sodaCount: 12, ratingCount: 0 }));
    expect(steps.find((s) => s.id === 'add')?.done).toBe(true);
    expect(steps.find((s) => s.id === 'rate')?.done).toBe(false);
  });
});

describe('completedCount', () => {
  it('counts what is done', () => {
    expect(completedCount(p())).toBe(0);
    expect(completedCount(p({ stashCount: 1 }))).toBe(1);
    expect(completedCount(p({ stashCount: 1, sodaCount: 1, ratingCount: 1 }))).toBe(3);
  });
});

describe('nextStep', () => {
  it('is the first thing left to do', () => {
    expect(nextStep(p())?.id).toBe('create');
    expect(nextStep(p({ stashCount: 1 }))?.id).toBe('add');
    expect(nextStep(p({ stashCount: 1, sodaCount: 1 }))?.id).toBe('rate');
  });

  it('skips over anything already done', () => {
    expect(nextStep(p({ stashCount: 1, sodaCount: 4 }))?.id).toBe('rate');
  });

  it('is null once the loop has been completed', () => {
    expect(nextStep(p({ stashCount: 1, sodaCount: 1, ratingCount: 1 }))).toBeNull();
  });
});

describe('shouldShowOnboarding', () => {
  it('stays hidden before the first collection — the empty state says it already', () => {
    expect(shouldShowOnboarding(p(), false)).toBe(false);
  });

  it('appears once there is a collection but the loop is unfinished', () => {
    expect(shouldShowOnboarding(p({ stashCount: 1 }), false)).toBe(true);
    expect(shouldShowOnboarding(p({ stashCount: 1, sodaCount: 5 }), false)).toBe(true);
  });

  it('disappears on its own when the loop is complete, with nothing stored', () => {
    expect(shouldShowOnboarding(p({ stashCount: 1, sodaCount: 1, ratingCount: 1 }), false)).toBe(false);
  });

  it('respects an explicit dismissal', () => {
    expect(shouldShowOnboarding(p({ stashCount: 1 }), true)).toBe(false);
  });

  it('comes back for an account that emptied itself out', () => {
    // Derived state, not a cursor: delete every soda and the step is undone again.
    expect(isOnboardingComplete(p({ stashCount: 1, sodaCount: 0, ratingCount: 0 }))).toBe(false);
    expect(shouldShowOnboarding(p({ stashCount: 1 }), false)).toBe(true);
  });
});
