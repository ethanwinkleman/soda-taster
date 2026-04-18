import { useState, useEffect, useCallback } from 'react';
import type { SodaEntry } from '../types/soda';
import { supabase, fromDb, toDb } from '../lib/supabase';

export function useSodas(userId: string | undefined) {
  const [sodas, setSodas] = useState<SodaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSodas = useCallback(async () => {
    if (!userId) {
      setSodas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('sodas')
      .select('*')
      .order('date_rated', { ascending: false });

    if (error) {
      console.error('Failed to fetch sodas:', error.message);
      setError(error.message);
    } else {
      setSodas((data ?? []).map(fromDb));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSodas();
  }, [fetchSodas]);

  const add = useCallback(async (soda: SodaEntry) => {
    if (!userId) return;
    const { error } = await supabase
      .from('sodas')
      .insert(toDb(soda, userId));

    if (error) {
      console.error('Failed to add soda:', error.message);
      alert(`Failed to save soda: ${error.message}`);
      return;
    }
    await fetchSodas();
  }, [userId, fetchSodas]);

  const update = useCallback(async (soda: SodaEntry) => {
    if (!userId) return;
    const { error } = await supabase
      .from('sodas')
      .update(toDb(soda, userId))
      .eq('id', soda.id);

    if (error) {
      console.error('Failed to update soda:', error.message);
      alert(`Failed to update soda: ${error.message}`);
      return;
    }
    await fetchSodas();
  }, [userId, fetchSodas]);

  const remove = useCallback(async (id: string) => {
    if (!userId) return;
    const { error } = await supabase.from('sodas').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete soda:', error.message);
      alert(`Failed to delete soda: ${error.message}`);
      return;
    }
    setSodas((prev) => prev.filter((s) => s.id !== id));
  }, [userId]);

  const toggleFavorite = useCallback(async (id: string) => {
    const soda = sodas.find((s) => s.id === id);
    if (soda) await update({ ...soda, isFavorite: !soda.isFavorite });
  }, [sodas, update]);

  return { sodas, loading, error, add, update, remove, toggleFavorite };
}
