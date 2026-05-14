import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RatingInput } from '../utils/tasteProfile';

async function loadMyRatings(userId: string): Promise<RatingInput[]> {
  const { data } = await supabase
    .from('stash_soda_ratings')
    .select('score, stash_sodas(name, brand)')
    .eq('user_id', userId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    sodaName: r.stash_sodas?.name ?? '',
    brand:    r.stash_sodas?.brand ?? '',
    score:    Number(r.score),
  }));
}

export function useMyRatings(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-ratings', userId],
    queryFn: () => loadMyRatings(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
