import { useState, useEffect, useRef, useCallback } from 'react';

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
 * Reveals a long list a page at a time as a sentinel scrolls into view.
 *
 * The whole collection is already in memory — this is not pagination against the
 * database, it is about not mounting several hundred SodaCards at once on a phone.
 */
export function useInfiniteScroll({ pageSize = 10, total, resetKey }: Options) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      // Start the next page slightly before the sentinel is on screen, so the list
      // grows underneath a fast scroll instead of stalling at the bottom.
      { rootMargin: '400px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return { visibleCount, hasMore, sentinelRef, loadMore };
}
