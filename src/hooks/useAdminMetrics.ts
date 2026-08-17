import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface DailyMetric {
  bucket: string;
  new_users: number;
  new_sodas: number;
  new_ratings: number;
  active_users: number;
}

export interface SummaryMetrics {
  total_users: number;
  total_collections: number;
  total_sodas: number;
  total_ratings: number;
  users_7d: number;
  sodas_7d: number;
  ratings_7d: number;
  active_7d: number;
  activation_pct: number | null;
  retention_pct: number | null;
}

export interface TopSoda {
  soda_name: string;
  soda_brand: string;
  ratings: number;
  avg_score: number;
}

/**
 * Whether the signed-in user is the super admin.
 *
 * Only decides whether to *offer* the page. The data itself is protected by the RPCs,
 * which refuse a non-admin caller — the anon key ships in the bundle, so a client-side
 * check is a convenience, never a security boundary.
 */
export function useIsAdmin(user: User | null | undefined) {
  const { data } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_admins')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
    // Short: the persisted cache would otherwise hold a `false` from before the grant,
    // and a fresh-looking one blocks the refetch that would correct it.
    staleTime: 30 * 1000,
  });
  return data ?? false;
}

/** The browser's timezone, so days break at local midnight rather than UTC. */
function localTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function useAdminMetrics(enabled: boolean, days = 30) {
  const tz = localTimezone();

  const daily = useQuery({
    queryKey: ['admin-daily', days, tz],
    queryFn: async (): Promise<DailyMetric[]> => {
      const { data, error } = await supabase.rpc('admin_daily_metrics', { p_days: days, p_tz: tz });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const summary = useQuery({
    queryKey: ['admin-summary'],
    queryFn: async (): Promise<SummaryMetrics | null> => {
      const { data, error } = await supabase.rpc('admin_summary_metrics');
      if (error) throw new Error(error.message);
      return data?.[0] ?? null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const topSodas = useQuery({
    queryKey: ['admin-top-sodas'],
    queryFn: async (): Promise<TopSoda[]> => {
      const { data, error } = await supabase.rpc('admin_top_sodas', { p_limit: 10 });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    daily: daily.data ?? [],
    summary: summary.data ?? null,
    topSodas: topSodas.data ?? [],
    // isLoading is only true before there is any data. A refetch over existing data
    // leaves it false, which is why refreshing looked like nothing happened — isFetching
    // is the one that reports a refresh in progress.
    loading: daily.isLoading || summary.isLoading,
    refreshing: daily.isFetching || summary.isFetching || topSodas.isFetching,
    error: daily.error ?? summary.error ?? topSodas.error ?? null,
    timezone: tz,
    refetch: () => Promise.all([daily.refetch(), summary.refetch(), topSodas.refetch()]),
  };
}
