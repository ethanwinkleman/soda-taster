import { describe, it, expect } from 'vitest';
import { averageScore, averageOf, starGlyphs } from './score';

describe('averageScore', () => {
  it('returns null for no ratings rather than NaN', () => {
    // Guards the display path: 0/0 would render as "NaN" on a soda nobody has rated.
    expect(averageScore([])).toBeNull();
  });

  it('averages and rounds to one decimal', () => {
    expect(averageScore([5, 4, 4])).toBe(4.3);
    expect(averageScore([4])).toBe(4);
  });

  it('handles half-step scores', () => {
    expect(averageScore([4.5])).toBe(4.5);
    expect(averageScore([5, 4.5, 4])).toBe(4.5);
  });

  it('can produce an average that is not itself an awardable score', () => {
    // 4.0 and 4.5 average to 4.25 -> 4.3, which no one can select. Intended.
    expect(averageScore([4, 4.5])).toBe(4.3);
  });

  it('does not accumulate floating point error into the displayed value', () => {
    expect(averageScore([0.5, 0.5, 0.5])).toBe(0.5);
    expect(averageScore([3.5, 3.5, 4])).toBe(3.7);
  });
});

describe('averageOf', () => {
  it('skips entries with no score instead of counting them as zero', () => {
    const sodas = [{ avg: 5 }, { avg: null }, { avg: 4 }];
    expect(averageOf(sodas, (s) => s.avg)).toBe(4.5);
  });

  it('returns null when nothing is rated', () => {
    expect(averageOf([{ avg: null }], (s) => s.avg)).toBeNull();
  });
});

describe('starGlyphs', () => {
  it('renders whole scores as five positions', () => {
    expect(starGlyphs(5)).toBe('★★★★★');
    expect(starGlyphs(4)).toBe('★★★★☆');
    expect(starGlyphs(0)).toBe('☆☆☆☆☆');
  });

  it('gives half scores their own glyph and still spans five positions', () => {
    // Regression: '★'.repeat(4.5) truncated to four glyphs and dropped the rest.
    expect(starGlyphs(4.5)).toBe('★★★★½');
    expect(starGlyphs(0.5)).toBe('½☆☆☆☆');
    expect(starGlyphs(2.5)).toBe('★★½☆☆');
  });

  it('always spans exactly five positions for every valid score', () => {
    for (let s = 0.5; s <= 5; s += 0.5) {
      expect([...starGlyphs(s)]).toHaveLength(5);
    }
  });
});
