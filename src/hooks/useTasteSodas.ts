import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { storageObjectPath } from '../lib/imageUrls';
import { signSodaImages } from '../lib/imageSigning';

export interface SodaScore {
  name: string;
  score: number;
}

export interface TasteSoda {
  id: string;
  stashId: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  /** Your own score, or null if you have not rated it. Always yours to see. */
  myScore: number | null;
  /** Everyone else's, which the database only hands over once you have rated. */
  others: SodaScore[];
}

/**
 * Every soda across every collection the viewer belongs to, with the scores they are
 * allowed to see.
 *
 * This is the one read the app's main screen runs. "Have we had this before?" and "rate
 * this quickly" are the same question asked of the same box — you type a name, and
 * either it is here with a score against it, which is the answer, or it is not and you
 * add it. Scoping that to a collection first would put a step in front of the only two
 * things anyone does often.
 *
 * **Other people's scores are sealed by the policy, not by this code.** A plain read of
 * `stash_soda_ratings` returns your own rows always and everyone else's only for sodas
 * you have already rated (`20260101002000`) — which is exactly the set where showing
 * them is right. No RPC needed, and no second copy of the blind-rating rule.
 */
async function loadTasteSodas(stashIds: string[], userId: string): Promise<TasteSoda[]> {
  const { data: sodaRows, error: sodaError } = await supabase
    .from('stash_sodas')
    .select('id, stash_id, name, brand, image_url')
    .in('stash_id', stashIds);

  // supabase-js resolves with { error } rather than throwing, and a failed read here
  // renders as "you own no sodas" — an empty search box that looks like an answer.
  if (sodaError) throw new Error(sodaError.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ids = (sodaRows ?? []).map((r: any) => r.id);
  // Deliberately narrow: id, who, and the number. No notes, no timestamps, no uuids —
  // the list draws a name and a score, and this read is run on every search.
  const { data: ratingRows, error: ratingError } = ids.length
    ? await supabase
        .from('stash_soda_ratings')
        .select('soda_id, user_id, display_name, score')
        .in('soda_id', ids)
    : { data: [], error: null };

  if (ratingError) throw new Error(ratingError.message);

  const mine = new Map<string, number>();
  const theirs = new Map<string, SodaScore[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (ratingRows ?? []) as any[]) {
    if (r.user_id === userId) {
      mine.set(r.soda_id, Number(r.score));
    } else {
      const list = theirs.get(r.soda_id) ?? [];
      list.push({ name: r.display_name || 'Someone', score: Number(r.score) });
      theirs.set(r.soda_id, list);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sodas: TasteSoda[] = (sodaRows ?? []).map((row: any) => ({
    id: row.id,
    stashId: row.stash_id,
    name: row.name,
    brand: row.brand ?? '',
    imageUrl: row.image_url ?? null,
    myScore: mine.get(row.id) ?? null,
    others: theirs.get(row.id) ?? [],
  }));

  const paths = sodas.map((s) => storageObjectPath(s.imageUrl)).filter((p): p is string => p !== null);
  if (paths.length) {
    const signed = await signSodaImages(paths);
    for (const s of sodas) {
      const path = storageObjectPath(s.imageUrl);
      if (path !== null) s.imageUrl = signed.get(path) ?? null;
    }
  }
  return sodas;
}

export function useTasteSodas(stashIds: string[], userId: string | undefined) {
  const key = [...stashIds].sort().join(',');
  const { data, isLoading, error } = useQuery({
    queryKey: ['taste-sodas', key, userId],
    queryFn: () => loadTasteSodas(stashIds, userId!),
    enabled: !!userId && stashIds.length > 0,
    staleTime: 60 * 1000,
  });

  return {
    sodas: data ?? [],
    loading: !!userId && stashIds.length > 0 && isLoading,
    error: (error ?? null) as Error | null,
  };
}
