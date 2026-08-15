import { useEffect, useState } from 'react';
import { onlineManager, useMutationState } from '@tanstack/react-query';

/**
 * Connection state plus how many writes are waiting to reach the server.
 *
 * Reads `onlineManager` rather than `navigator.onLine` directly so this agrees with
 * whatever TanStack Query itself believes — it is the thing deciding when to pause
 * and resume mutations.
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setIsOnline), []);

  const pending = useMutationState({
    filters: { status: 'pending' },
    select: (m) => m.state.isPaused,
  });

  return {
    isOnline,
    // Paused means queued behind the connection; the rest are simply in flight.
    pendingCount: pending.filter(Boolean).length,
  };
}
