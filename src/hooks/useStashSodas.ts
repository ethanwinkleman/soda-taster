import { useEffect, useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity';
import { averageScore } from '../lib/score';
import {
  ADD_SODA_KEY, SAVE_RATING_KEY, holdImageFor,
  type AddSodaVars, type SaveRatingVars,
} from '../lib/offlineMutations';
import type { Soda, SodaRating } from '../types/stash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sodaFromDb(row: any): Omit<Soda, 'ratings' | 'avgScore' | 'myRating' | 'commentCount'> {
  return {
    id: row.id,
    stashId: row.stash_id,
    name: row.name,
    brand: row.brand ?? '',
    addedBy: row.added_by,
    inFridge: row.in_fridge ?? false,
    quantity: row.quantity ?? 0,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ratingFromDb(row: any): SodaRating {
  return {
    id: row.id,
    sodaId: row.soda_id,
    userId: row.user_id,
    displayName: row.display_name ?? '',
    score: Number(row.score),
    notes: row.notes ?? null,
    createdAt: row.created_at,
  };
}

async function loadSodas(stashId: string, userId: string): Promise<Soda[]> {
  const [{ data: sodaRows }, { data: commentRows }] = await Promise.all([
    supabase.from('stash_sodas').select('*').eq('stash_id', stashId).order('created_at', { ascending: false }),
    supabase.from('soda_comments').select('soda_id').eq('stash_id', stashId),
  ]);

  const sodaIds = (sodaRows ?? []).map((s) => s.id);

  const { data: ratingRows } = sodaIds.length
    ? await supabase.from('stash_soda_ratings').select('*').in('soda_id', sodaIds).order('created_at', { ascending: true })
    : { data: [] };

  const commentCountMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (commentRows ?? []).forEach((r: any) =>
    commentCountMap.set(r.soda_id, (commentCountMap.get(r.soda_id) ?? 0) + 1),
  );

  return (sodaRows ?? []).map((s) => {
    const ratings = (ratingRows ?? []).filter((r) => r.soda_id === s.id).map(ratingFromDb);
    const avgScore = averageScore(ratings.map((r) => r.score));
    const myRating = ratings.find((r) => r.userId === userId) ?? null;
    return { ...sodaFromDb(s), ratings, avgScore, myRating, commentCount: commentCountMap.get(s.id) ?? 0 };
  });
}

export function useStashSodas(
  stashId: string | undefined,
  userId: string | undefined,
  displayName?: string,
) {
  const queryClient = useQueryClient();
  const queryKey = ['stash-sodas', stashId, userId] as const;
  const uid = useId().replace(/:/g, '');

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => loadSodas(stashId!, userId!),
    enabled: !!(stashId && userId),
    staleTime: 3 * 60 * 1000,
  });

  const sodas = data ?? [];

  function patch(updater: (prev: Soda[]) => Soda[]) {
    queryClient.setQueryData<Soda[]>(queryKey, (old) => updater(old ?? []));
  }

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['stash-sodas', stashId, userId] });
  }

  function invalidateRatings() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['stash-sodas', stashId, userId] }),
      queryClient.invalidateQueries({ queryKey: ['my-ratings', userId] }),
    ]);
  }

  // Resumable writes. mutationFn comes from the defaults registered on the client, so
  // these keep working after a reload; see lib/offlineMutations.
  const addSodaMutation = useMutation<{ sodaId: string }, Error, AddSodaVars>({
    mutationKey: ADD_SODA_KEY,
    onSuccess: () => { void invalidate(); },
    onError: () => { void invalidate(); },
  });

  const saveRatingMutation = useMutation<{ sodaId: string }, Error, SaveRatingVars>({
    mutationKey: SAVE_RATING_KEY,
    onSuccess: () => { void invalidateRatings(); },
    onError: () => { void invalidateRatings(); },
  });

  // Real-time: invalidate the query on any DB change so RQ refetches in the background
  useEffect(() => {
    if (!stashId || !userId) return;

    let timer: ReturnType<typeof setTimeout>;
    const silentRefetch = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ['stash-sodas', stashId, userId] }),
        150,
      );
    };

    const channel = supabase
      .channel(`stash-sodas-rt-${stashId}-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stash_sodas' }, silentRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stash_soda_ratings' }, silentRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'soda_comments' }, silentRefetch)
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [stashId, userId, queryClient]);

  async function act(params: Parameters<typeof logActivity>[0]) {
    if (!stashId || !userId) return;
    await logActivity(params);
  }

  /**
   * Optimistic and non-blocking: the soda lands in the cache immediately and the write
   * is handed to a resumable mutation, which pauses rather than fails when offline.
   * Callers get the id back straight away because we mint it here (see offlineMutations).
   */
  function addSoda(
    name: string,
    brand: string,
    score: number | null,
    dn: string,
    imageFile?: File | null,
    externalImageUrl?: string | null,
  ) {
    if (!stashId || !userId) return null;

    const sodaId = crypto.randomUUID();
    if (imageFile) holdImageFor(sodaId, imageFile);

    const optimisticRating: SodaRating | null = score === null ? null : {
      id: `optimistic-${sodaId}`, sodaId, userId, displayName: dn,
      score, notes: null, createdAt: new Date().toISOString(),
    };

    patch((prev) => [{
      id: sodaId, stashId, name, brand, addedBy: userId,
      inFridge: false, quantity: 0,
      imageUrl: imageFile ? null : externalImageUrl ?? null,
      createdAt: new Date().toISOString(),
      ratings: optimisticRating ? [optimisticRating] : [],
      avgScore: score, myRating: optimisticRating, commentCount: 0,
    }, ...prev]);

    addSodaMutation.mutate({
      sodaId, stashId, userId, name, brand, score, displayName: dn,
      externalImageUrl: externalImageUrl ?? null,
    });

    return { sodaId };
  }

  async function updateSodaImage(sodaId: string, file: File): Promise<string | null> {
    if (!stashId) return 'No stash';
    const path = `${stashId}/${sodaId}`;
    const { error } = await supabase.storage
      .from('soda-images')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) return error.message;
    const { data: { publicUrl } } = supabase.storage.from('soda-images').getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    const { error: dbErr } = await supabase.from('stash_sodas').update({ image_url: url }).eq('id', sodaId);
    if (dbErr) return dbErr.message;
    patch((prev) => prev.map((s) => s.id === sodaId ? { ...s, imageUrl: url } : s));
    return null;
  }

  async function editSoda(sodaId: string, updates: { name?: string; brand?: string }) {
    const soda = sodas.find((s) => s.id === sodaId);
    const previous = queryClient.getQueryData<Soda[]>(queryKey);
    patch((prev) => prev.map((s) => s.id === sodaId ? { ...s, ...updates } : s));
    try {
      const { error } = await supabase.from('stash_sodas').update(updates).eq('id', sodaId);
      // supabase-js resolves with { error } rather than throwing, so a rejected write
      // has to be checked for explicitly. Without this the catch never ran: nothing
      // rolled back, nothing was reported, and the refetch below quietly restored the
      // old values while the page had already said it saved.
      if (error) throw new Error(error.message);
      await act({ stashId: stashId!, userId: userId!, displayName: displayName!, action: 'soda_edited', sodaId, sodaName: updates.name ?? soda?.name });
      await invalidate();
    } catch (err) {
      if (previous) queryClient.setQueryData(queryKey, previous);
      throw err instanceof Error ? err : new Error('Failed to update soda');
    }
  }

  async function removeSoda(sodaId: string) {
    const soda = sodas.find((s) => s.id === sodaId);
    const previous = queryClient.getQueryData<Soda[]>(queryKey);
    patch((prev) => prev.filter((s) => s.id !== sodaId));
    try {
      const { error } = await supabase.from('stash_sodas').delete().eq('id', sodaId);
      if (error) throw error;
      if (soda) {
        await act({ stashId: stashId!, userId: userId!, displayName: displayName!, action: 'soda_removed', sodaId, sodaName: soda.name });
      }
      await invalidate();
    } catch {
      if (previous) queryClient.setQueryData(queryKey, previous);
      throw new Error('Failed to remove soda');
    }
  }

  async function setFridgeStatus(sodaId: string, inFridge: boolean, quantity: number) {
    const previous = queryClient.getQueryData<Soda[]>(queryKey);
    patch((prev) => prev.map((s) => s.id === sodaId ? { ...s, inFridge, quantity } : s));
    const { error } = await supabase
      .from('stash_sodas')
      .update({ in_fridge: inFridge, quantity })
      .eq('id', sodaId);
    if (error) {
      if (previous) queryClient.setQueryData(queryKey, previous);
      throw new Error('Failed to update stock status');
    }
  }

  async function saveRating(sodaId: string, score: number, dn: string, notes?: string) {
    if (!userId) return;
    const soda = sodas.find((s) => s.id === sodaId);
    const isUpdate = !!soda?.myRating;
    const previous = queryClient.getQueryData<Soda[]>(queryKey);
    const trimmedNotes = notes?.trim() || null;

    patch((prev) => prev.map((s) => {
      if (s.id !== sodaId) return s;
      const optimistic: SodaRating = s.myRating
        ? { ...s.myRating, score, notes: trimmedNotes }
        : { id: 'optimistic', sodaId, userId: userId!, displayName: dn, score, notes: trimmedNotes, createdAt: new Date().toISOString() };
      const ratings = isUpdate
        ? s.ratings.map((r) => r.userId === userId ? optimistic : r)
        : [...s.ratings, optimistic];
      const avgScore = averageScore(ratings.map((r) => r.score));
      return { ...s, ratings, avgScore, myRating: optimistic };
    }));

    // Queued rather than awaited: offline this pauses instead of throwing, and the
    // optimistic score above is what the taster sees either way.
    saveRatingMutation.mutate(
      {
        sodaId, stashId: stashId!, userId, score, displayName: dn,
        notes: trimmedNotes, isUpdate, sodaName: soda?.name,
      },
      {
        onError: () => {
          if (previous) queryClient.setQueryData(queryKey, previous);
        },
      },
    );
  }

  async function deleteRating(ratingId: string, sodaId: string) {
    const soda = sodas.find((s) => s.id === sodaId);
    const previous = queryClient.getQueryData<Soda[]>(queryKey);

    patch((prev) => prev.map((s) => {
      if (s.id !== sodaId) return s;
      const ratings = s.ratings.filter((r) => r.id !== ratingId);
      const avgScore = averageScore(ratings.map((r) => r.score));
      return { ...s, ratings, avgScore, myRating: null };
    }));

    try {
      await supabase.from('stash_soda_ratings').delete().eq('id', ratingId);
      await act({ stashId: stashId!, userId: userId!, displayName: displayName!, action: 'rating_removed', sodaId, sodaName: soda?.name });
      await invalidateRatings();
    } catch {
      if (previous) queryClient.setQueryData(queryKey, previous);
      throw new Error('Failed to delete rating');
    }
  }

  return {
    sodas,
    loading: isLoading,
    error: isError,
    addSoda,
    editSoda,
    removeSoda,
    setFridgeStatus,
    updateSodaImage,
    saveRating,
    deleteRating,
    refresh: invalidate,
  };
}
