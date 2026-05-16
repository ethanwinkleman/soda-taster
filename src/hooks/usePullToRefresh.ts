import { useEffect, useRef, useState, useCallback } from 'react';

// Raw finger travel needed to trigger a refresh
const RAW_THRESHOLD = 80;
// Visual indicator caps here regardless of how far the user pulls
export const PTR_VISUAL_MAX = 56;
// Maps raw delta → visual distance (half speed = rubber-band feel)
const RESISTANCE = 0.45;

export function usePullToRefresh(onRefresh: () => Promise<void>, enabled = true) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const rawDeltaRef = useRef(0);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    refreshingRef.current = true;
    setRefreshing(true);
    setPullDistance(PTR_VISUAL_MAX);
    try {
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      setPullDistance(0);
      rawDeltaRef.current = 0;
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current || window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (refreshingRef.current || startYRef.current === null) return;
      const raw = e.touches[0].clientY - startYRef.current;
      if (raw <= 0) {
        if (pullingRef.current) { setPullDistance(0); rawDeltaRef.current = 0; }
        return;
      }
      pullingRef.current = true;
      rawDeltaRef.current = raw;
      setPullDistance(Math.min(raw * RESISTANCE, PTR_VISUAL_MAX));
      e.preventDefault();
    }

    function onTouchEnd() {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      startYRef.current = null;
      if (rawDeltaRef.current >= RAW_THRESHOLD) {
        handleRefresh();
      } else {
        setPullDistance(0);
        rawDeltaRef.current = 0;
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, handleRefresh]);

  return { pullDistance, refreshing };
}
