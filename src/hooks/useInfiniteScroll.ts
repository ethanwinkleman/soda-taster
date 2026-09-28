import { useState, useEffect, useCallback } from 'react';

interface Options {
  /** How many to show before any scrolling happens, and how many to add each time. */
  pageSize?: number;
  /** Total available — the window never grows past this. */
  total: number;
  /**
   * Changing this starts the window over at pageSize. Pass whatever the list is
   * keyed on (search text, sort, active filters): without it, clearing a filter
   * would leave you scrolled into the middle of a list you have not seen the top of.
   */
  resetKey: unknown;
}

/**
 * Reveals a long list a page at a time, as a sentinel scrolls into view or is pressed.
 *
 * The whole collection is already in memory — this is not pagination against the
 * database, it is about not mounting several hundred SodaCards at once on a phone.
 *
 * The observer is an enhancement, never the only way forward: `loadMore` is returned so
 * the sentinel can be a button. An observer that silently stops leaves no way to reach
 * the rest of the list at all, and there is no keyboard or screen-reader path into a
 * scroll position either.
 */
export function useInfiniteScroll({ pageSize = 10, total, resetKey }: Options) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  // State, not a ref: writing to a ref does not re-run the effect below, so a sentinel
  // that mounts *after* the effect last ran was never observed — which is the whole
  // list stopping dead at the first page. That happens whenever the sentinel is absent
  // on one render (a loading or empty branch) while `total` is already known, because
  // then nothing in the dependency list changes when it finally appears.
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  // Reset during render rather than in an effect. Doing it in an effect renders the
  // long list once, then immediately re-renders it short — React's documented way to
  // adjust state when an input changes is to compare against the previous value here.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setVisibleCount(pageSize);
  }

  const hasMore = visibleCount < total;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + pageSize, total));
  }, [pageSize, total]);

  useEffect(() => {
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      // Start the next page slightly before the sentinel is on screen, so the list
      // grows underneath a fast scroll instead of stalling at the bottom.
      { rootMargin: '400px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
    // visibleCount is deliberately a dependency: IntersectionObserver reports
    // *crossings*, so a sentinel that is still on screen after the list grows never
    // produces a second callback and the list stops one page short. Re-observing per
    // page delivers a fresh initial entry, which keeps loading until it scrolls away.
  }, [sentinel, hasMore, loadMore, visibleCount]);

  return { visibleCount, hasMore, sentinelRef: setSentinel, loadMore };
}
