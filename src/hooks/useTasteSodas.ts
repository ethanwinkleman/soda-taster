import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { storageObjectPath } from '../lib/imageUrls';
import { signSodaImages } from '../lib/imageSigning';

export interface TasteSoda {
  id: string;
  stashId: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  /** Your own score, or null if you have not rated it. Always yours to see. */
  myScore: number | null;
}

/**
 * Every soda in the viewer's collections, with their own score against it.
 *
 * This is what the front door searches: "what are you drinking" has to find a soda you
 * have had before as readily as one you have not, and `home_untasted` by definition
 * only knows about the ones you have not.
 *
 * Only your own ratings are joined, never anyone else's — this read must not become a
 * second way to see a sealed verdict.
 */
async function loadTasteSodas(stashIds: string[], userId: string): Promise<TasteSoda[]> {
  const [{ data: sodaRows, error: sodaError }, { data: mine, error: mineError }] = await Promise.all([
    supabase.from('stash_sodas').select('id, stash_id, name, brand, image_url').in('stash_id', stashIds),
    supabase.from('stash_soda_ratings').select('soda_id, score').eq('user_id', userId),
  ]);

  // supabase-js resolves with { error } rather than throwing, and a failed read here
  // would render as "you own no sodas" — an empty search box that looks like an answer.
  if (sodaError) throw new Error(sodaError.message);
  if (mineError) throw new Error(mineError.message);

  const scores = new Map<string, number>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mine ?? []).map((r: any) => [r.soda_id, Number(r.score)]),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sodas: TasteSoda[] = (sodaRows ?? []).map((row: any) => ({
    id: row.id,
    stashId: row.stash_id,
    name: row.name,
    brand: row.brand ?? '',
    imageUrl: row.image_url ?? null,
    myScore: scores.get(row.id) ?? null,
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
