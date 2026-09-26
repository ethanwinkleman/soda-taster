import { describe, it, expect } from 'vitest';
import { navDirection, pathDepth } from './pageTransition';

describe('pathDepth', () => {
  it('counts segments, ignoring the slashes around them', () => {
    expect(pathDepth('/')).toBe(0);
    expect(pathDepth('/stash/abc')).toBe(2);
    expect(pathDepth('/stash/abc/soda/xyz')).toBe(4);
    expect(pathDepth('/stash/abc/')).toBe(2);
  });
});

describe('navDirection', () => {
  it('treats POP as going back, wherever it lands', () => {
    expect(navDirection('POP', '/')).toEqual({ goingBack: true, goingDeeper: false });
    expect(navDirection('POP', '/stash/abc/soda/xyz')).toEqual({ goingBack: true, goingDeeper: false });
  });

  it('fizzes on a push into content', () => {
    expect(navDirection('PUSH', '/stash/abc').goingDeeper).toBe(true);
    expect(navDirection('PUSH', '/stash/abc/soda/xyz').goingDeeper).toBe(true);
  });

  it('does not fizz on the way home', () => {
    // Tapping Collections in the bottom bar is a push, but it is where you came from —
    // a flourish there would fire on the most-travelled route in the app.
    expect(navDirection('PUSH', '/').goingDeeper).toBe(false);
  });

  it('never fizzes on the way back', () => {
    expect(navDirection('POP', '/stash/abc').goingDeeper).toBe(false);
  });

  it('treats a replace like a forward move, since it is not a return', () => {
    expect(navDirection('REPLACE', '/stash/abc')).toEqual({ goingBack: false, goingDeeper: true });
  });
});
