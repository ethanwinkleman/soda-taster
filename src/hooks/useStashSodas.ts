import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity';
import type { Soda, SodaRating } from '../types/stash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sodaFromDb(row: any): Omit<Soda, 'ratings' | 'avgScore' | 'myRating'> {
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
    createdAt: row.created_at,
  };
}

export function useStashSodas(
  stashId: string | undefined,
  userId: string | undefined,
  displayName?: string,
) {
  const [sodas, setSodas] = useState<Soda[]>([]);
  const [loading, setLoading] = useState(true);
  const initialFetched = useRef(false);

  const fetchSodas = useCallback(async (silent = false) => {
    if (!stashId || !userId) { setSodas([]); setLoading(false); return; }
    if (!silent || !initialFetched.current) setLoading(true);

    const { data: sodaRows } = await supabase
      .from('stash_sodas')
      .select('*')
      .eq('stash_id', stashId)
      .order('created_at', { ascending: false });

    const sodaIds = (sodaRows ?? []).map((s) => s.id);

    const { data: ratingRows } = sodaIds.length
      ? await supabase
          .from('stash_soda_ratings')
          .select('*')
          .in('soda_id', sodaIds)
          .order('created_at', { ascending: true })
      : { data: [] };

    const result: Soda[] = (sodaRows ?? []).map((s) => {
      const ratings = (ratingRows ?? []).filter((r) => r.soda_id === s.id).map(ratingFromDb);
      const avgScore = ratings.length
        ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
        : null;
      const myRating = ratings.find((r) => r.userId === userId) ?? null;
      return { ...sodaFromDb(s), ratings, avgScore, myRating };
    });

    setSodas(result);
    setLoading(false);
    initialFetched.current = true;
  }, [stashId, userId]);

  useEffect(() => { fetchSodas(); }, [fetchSodas]);

  async function act(params: Parameters<typeof logActivity>[0]) {
    if (!stashId || !userId || !displayName) return;
    await logActivity(params);
  }

  const addSoda = useCallback(async (
    name: string,
    brand: string,
    score: number | null,
    dn: string,
    imageFile?: File | null,
  ) => {
    if (!stashId || !userId) return;

    const { data: soda, error } = await supabase
      .from('stash_sodas')
      .insert({ stash_id: stashId, name, brand, added_by: userId })
      .select()
      .single();

    if (error || !soda) return;

    if (imageFile) {
      const path = `${stashId}/${soda.id}`;
      const { error: upErr } = await supabase.storage
        .from('soda-images')
        .upload(path, imageFile, { upsert: true, contentType: imageFile.type });
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('soda-images').getPublicUrl(path);
        await supabase.from('stash_sodas').update({ image_url: publicUrl }).eq('id', soda.id);
      }
    }

    if (score !== null) {
      await supabase.from('stash_soda_ratings').insert({
        soda_id: soda.id,
        user_id: userId,
        display_name: dn,
        score,
      });
    }

    await act({ stashId, userId, displayName: dn, action: 'soda_added', sodaId: soda.id, sodaName: name });
    await fetchSodas(true);
  }, [stashId, userId, fetchSodas]);

  const updateSodaImage = useCallback(async (sodaId: string, file: File): Promise<string | null> => {
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
    setSodas((prev) => prev.map((s) => s.id === sodaId ? { ...s, imageUrl: url } : s));
    return null;
  }, [stashId]);

  const editSoda = useCallback(async (sodaId: string, updates: { name?: string; brand?: string }) => {
    const soda = sodas.find((s) => s.id === sodaId);
    const { error } = await supabase.from('stash_sodas').update(updates).eq('id', sodaId);
    if (!error) {
      await act({ stashId: stashId!, userId: userId!, displayName: displayName!, action: 'soda_edited', sodaId, sodaName: updates.name ?? soda?.name });
      await fetchSodas(true);
    }
  }, [fetchSodas, sodas, stashId, userId, displayName]);

  const removeSoda = useCallback(async (sodaId: string) => {
    const soda = sodas.find((s) => s.id === sodaId);
    await supabase.from('stash_sodas').delete().eq('id', sodaId);
    if (soda) {
      await act({ stashId: stashId!, userId: userId!, displayName: displayName!, action: 'soda_removed', sodaId, sodaName: soda.name });
    }
    setSodas((prev) => prev.filter((s) => s.id !== sodaId));
  }, [sodas, stashId, userId, displayName]);

  const setFridgeStatus = useCallback(async (sodaId: string, inFridge: boolean, quantity: number) => {
    await supabase
      .from('stash_sodas')
      .update({ in_fridge: inFridge, quantity })
      .eq('id', sodaId);
    setSodas((prev) => prev.map((s) => s.id === sodaId ? { ...s, inFridge, quantity } : s));
  }, []);

  const saveRating = useCallback(async (sodaId: string, score: number, dn: string) => {
    if (!userId) return;
    const soda = sodas.find((s) => s.id === sodaId);
    const isUpdate = !!soda?.myRating;
    await supabase.from('stash_soda_ratings').upsert(
      { soda_id: sodaId, user_id: userId, display_name: dn, score },
      { onConflict: 'soda_id,user_id' },
    );
    await act({ stashId: stashId!, userId, displayName: dn, action: isUpdate ? 'rating_updated' : 'rating_added', sodaId, sodaName: soda?.name });
    await fetchSodas(true);
  }, [userId, sodas, fetchSodas, stashId]);

  const deleteRating = useCallback(async (ratingId: string, sodaId: string) => {
    const soda = sodas.find((s) => s.id === sodaId);
    await supabase.from('stash_soda_ratings').delete().eq('id', ratingId);
    await act({ stashId: stashId!, userId: userId!, displayName: displayName!, action: 'rating_removed', sodaId, sodaName: soda?.name });
    await fetchSodas(true);
  }, [fetchSodas, sodas, stashId, userId, displayName]);

  return {
    sodas,
    loading,
    addSoda,
    editSoda,
    removeSoda,
    setFridgeStatus,
    updateSodaImage,
    saveRating,
    deleteRating,
    refresh: fetchSodas,
  };
}
