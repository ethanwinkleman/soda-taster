import { beforeEach, describe, expect, it } from 'vitest';
import { forgetAll, isReturnNavigation, markLeft, recall, remember, scrollTargetFor } from './returnMemory';

beforeEach(() => forgetAll());

describe('isReturnNavigation', () => {
  it('is a return on back or forward onto an entry that was left', () => {
    markLeft('k3x9');
    expect(isReturnNavigation('POP', 'k3x9')).toBe(true);
  });
  it('is not a return on a cold start or a reload, which are also reported as POP', () => {
    expect(isReturnNavigation('POP', 'default')).toBe(false);
    expect(isReturnNavigation('POP', 'k3x9')).toBe(false);
  });
  it('is a return onto the first entry of the session once it has been left', () => {
    // Open the app on a collection, open a soda, press back: the key is `default`
    // both times, and only the second is a return.
    expect(isReturnNavigation('POP', 'default')).toBe(false);
    markLeft('default');
    expect(isReturnNavigation('POP', 'default')).toBe(true);
  });
  it('is not a return on a push or a replace', () => {
    markLeft('k3x9');
    expect(isReturnNavigation('PUSH', 'k3x9')).toBe(false);
    expect(isReturnNavigation('REPLACE', 'k3x9')).toBe(false);
  });
});

describe('recall', () => {
  it('hands back what was remembered, but only on a return', () => {
    remember('stash:1:search', 'cola');
    expect(recall('stash:1:search', true, '')).toBe('cola');
    expect(recall('stash:1:search', false, '')).toBe('');
  });
  it('falls back when nothing is held', () => {
    expect(recall('stash:2:search', true, 'fallback')).toBe('fallback');
  });
  it('keeps falsy values rather than treating them as missing', () => {
    remember('a', 0); remember('b', false); remember('c', '');
    expect(recall('a', true, 9)).toBe(0);
    expect(recall('b', true, true)).toBe(false);
    expect(recall('c', true, 'x')).toBe('');
  });
});

describe('scrollTargetFor', () => {
  it('goes to the top on a fresh navigation, whatever is remembered', () => {
    remember('scroll:k1', 1680);
    expect(scrollTargetFor('PUSH', 'k1')).toBe(0);
  });
  it('goes back to where you were on a return', () => {
    remember('scroll:k1', 1680); markLeft('k1');
    expect(scrollTargetFor('POP', 'k1')).toBe(1680);
  });
  it('goes to the top on a return to somewhere never scrolled', () => {
    markLeft('k2');
    expect(scrollTargetFor('POP', 'k2')).toBe(0);
  });
  it('goes to the top on a cold start', () => {
    remember('scroll:default', 900);
    expect(scrollTargetFor('POP', 'default')).toBe(0);
  });
  it('never returns a negative or non-numeric position', () => {
    remember('scroll:k3', -40); remember('scroll:k4', NaN); markLeft('k3'); markLeft('k4');
    expect(scrollTargetFor('POP', 'k3')).toBe(0);
    expect(scrollTargetFor('POP', 'k4')).toBe(0);
  });
});
