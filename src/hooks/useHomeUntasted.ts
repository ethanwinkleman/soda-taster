import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { storageObjectPath } from '../lib/imageUrls';
import { signSodaImages } from '../lib/imageSigning';

export interface UntastedSoda {
  id: string;
  stashId: string;
  stashName: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  inFridge: boolean;
  quantity: number;
  createdAt: string;
  /** How many other members have rated it. Never their scores — those are sealed. */
  ratingCount: number;
}

/**
 * Everything the viewer has not rated, across every collection they belong to.
 *
 * One round trip rather than one per collection, which is why this is an RPC
 * (`20260101002400`) rather than a loop over `stash_soda_list`. No scores come back at
 * all: the viewer has not rated any of these, so every one of them is sealed.
 */
async function loadUntasted(): Promise<UntastedSoda[]> {
  const { data, error } = await supabase.rpc('home_untasted', { p_limit: 24 });

  // supabase-js resolves with { error } rather than throwing. Unchecked, a failed read
  // would render as "nothing is waiting on you" — the most misleading empty state here,
  // because it is indistinguishable from being completely caught up.
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sodas: UntastedSoda[] = (data ?? []).map((row: any) => ({
    id: row.id,
    stashId: row.stash_id,
    stashName: row.stash_name ?? '',
    name: row.name,
    brand: row.brand ?? '',
    imageUrl: row.image_url ?? null,
    inFridge: row.in_fridge ?? false,
    quantity: row.quantity ?? 0,
    createdAt: row.created_at,
    ratingCount: Number(row.rating_count ?? 0),
  }));

  // The bucket is private, so what the row holds is an object path. Signed in one batch,
  // the same as the collection list does.
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

export function useHomeUntasted(userId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['home-untasted', userId],
    queryFn: loadUntasted,
    enabled: !!userId,
    // Shorter than the collection list's three minutes: this is the part of the page
    // that is supposed to feel current when someone else has just rated something.
    staleTime: 60 * 1000,
  });

  return {
    sodas: data ?? [],
    loading: !!userId && isLoading,
    error: (error ?? null) as Error | null,
  };
}
