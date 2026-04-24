import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ActivityAction } from '../lib/activity';

export interface ActivityEntry {
  id: string;
  userId: string | null;
  displayName: string;
  action: ActivityAction;
  sodaId: string | null;
  sodaName: string | null;
  score: number | null;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDb(r: any): ActivityEntry {
  return {
    id: r.id,
    userId: r.user_id,
    displayName: r.display_name,
    action: r.action as ActivityAction,
    sodaId: r.soda_id,
    sodaName: r.soda_name,
    score: r.score != null ? Number(r.score) : null,
    createdAt: r.created_at,
  };
}

export function useStashActivity(stashId: string | undefined) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!stashId) return;
    setLoading(true);
    const { data } = await supabase
      .from('stash_activity')
      .select('*')
      .eq('stash_id', stashId)
      .order('created_at', { ascending: false })
      .limit(100);
    setEntries((data ?? []).map(fromDb));
    setLoading(false);
  }, [stashId]);

  return { entries, loading, fetch };
}
