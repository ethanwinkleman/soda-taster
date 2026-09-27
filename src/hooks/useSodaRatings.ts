import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ratingFromDb } from './useStashSodas';
import type { SodaRating } from '../types/stash';

/**
 * The full ratings for one soda — who said what, and any notes.
 *
 * The collection list deliberately carries only scores, so the two places that show
 * people fetch them for the soda they are showing: the detail page's breakdown and the
 * share card.
 *
 * No client-side gating: since 20260101002000 the policy returns your own rating always
 * and everyone else's only once you have filed yours, so a blind soda comes back with
 * just your row — or none. What the UI draws and what the database will hand over are
 * the same rule, in one place.
 */
export function useSodaRatings(sodaId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['soda-ratings', sodaId],
    queryFn: async (): Promise<SodaRating[]> => {
      const { data, error } = await supabase
        .from('stash_soda_ratings')
        .select('*')
        .eq('soda_id', sodaId!)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []).map(ratingFromDb);
    },
    enabled: !!sodaId,
    staleTime: 60 * 1000,
  });

  return { ratings: data ?? [], loading: isLoading, error: (error as Error | null) ?? null };
}
