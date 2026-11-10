import { useEffect, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { isReturnNavigation, recall, remember } from '../lib/returnMemory';

/** Whether this page was reached by going back or forward, rather than freshly. */
export function useIsReturn(): boolean {
  const navType = useNavigationType();
  const { key } = useLocation();
  return isReturnNavigation(navType, key);
}

/**
 * `useState` that survives leaving the page and coming back to it.
 *
 * Starts from what was remembered on a return and from `initial` on a fresh visit, so a
 * search box still holds your search after you open a result and press back, and is
 * empty when you walk in from somewhere else. See lib/returnMemory.
 */
export function useReturnState<T>(key: string, initial: T) {
  const returning = useIsReturn();
  const [value, setValue] = useState<T>(() => recall(key, returning, initial));
  useEffect(() => {
    remember(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}
