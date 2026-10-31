import { describe, it, expect } from 'vitest';
import { buildReveal, formatScore } from './reveal';

describe('formatScore', () => {
  // Scores are half-steps, so a gap is too. "2.50" and "3" are both wrong for 2.5.
  it('keeps a half and drops a trailing zero', () => {
    expect(formatScore(2.5)).toBe('2.5');
    expect(formatScore(3)).toBe('3');
    expect(formatScore(0.5)).toBe('0.5');
  });
});

describe('buildReveal when you are first', () => {
  const r = buildReveal(4.5, []);

  it('is sealed rather than empty', () => {
    expect(r.state).toBe('sealed');
    expect(r.headline).toBe('Sealed');
  });

  // Being first is the other half of blind rating: something happened, it just
  // happens to the other person later.
  it('says what being first means, not that nothing happened', () => {
    expect(r.detail).toMatch(/rated it first/i);
    expect(r.detail).toMatch(/until they rate it/i);
  });

  it('has no gap and nobody to name', () => {
    expect(r.gap).toBe(0);
    expect(r.furthest).toBeNull();
    expect(r.youWereHigher).toBeNull();
  });
});

describe('buildReveal when someone else has rated', () => {
  it('names the agreement when you match', () => {
    const r = buildReveal(4, [{ name: 'Dana', score: 4 }]);
    expect(r.state).toBe('revealed');
    expect(r.headline).toBe('Dead on');
    expect(r.detail).toBe('You both said 4.');
    // Nobody was higher, so claiming either way would be wrong.
    expect(r.youWereHigher).toBeNull();
  });

  it('reads differently for a group than for a pair', () => {
    const pair = buildReveal(4, [{ name: 'Dana', score: 4 }]);
    const group = buildReveal(4, [{ name: 'Dana', score: 4 }, { name: 'Sam', score: 4 }]);
    expect(pair.detail).toBe('You both said 4.');
    expect(group.detail).toBe('Everyone said 4.');
  });

  it('calls a half-star difference near enough', () => {
    const r = buildReveal(4.5, [{ name: 'Dana', score: 4 }]);
    expect(r.headline).toBe('Near enough');
    expect(r.gap).toBe(0.5);
    expect(r.detail).toBe('0.5 stars between you and Dana — you liked it more.');
  });

  it('calls two stars or more miles apart', () => {
    const r = buildReveal(2, [{ name: 'Dana', score: 4.5 }]);
    expect(r.headline).toBe('Miles apart');
    expect(r.gap).toBe(2.5);
    expect(r.detail).toBe('2.5 stars between you and Dana — they liked it more.');
  });

  it('says star, singular, at exactly one', () => {
    const r = buildReveal(3, [{ name: 'Dana', score: 4 }]);
    expect(r.detail).toContain('1 star between');
    expect(r.detail).not.toContain('1 stars');
  });

  // With three people the interesting comparison is the person you clash with, not
  // whoever happens to be first in the list.
  it('names whoever you disagree with most', () => {
    const r = buildReveal(5, [
      { name: 'Dana', score: 4.5 },
      { name: 'Sam', score: 1.5 },
    ]);
    expect(r.furthest?.name).toBe('Sam');
    expect(r.gap).toBe(3.5);
    expect(r.detail).toContain('Sam');
  });

  it('gets the direction right when they scored higher', () => {
    const r = buildReveal(1, [{ name: 'Dana', score: 5 }]);
    expect(r.youWereHigher).toBe(false);
    expect(r.detail).toContain('they liked it more');
  });

  it('keeps every other score, not just the furthest', () => {
    const r = buildReveal(3, [{ name: 'Dana', score: 4 }, { name: 'Sam', score: 2 }]);
    expect(r.others).toHaveLength(2);
  });
});
