import { useState, useEffect, useCallback } from 'react';
import type { InventoryEntry } from '../types/inventory';
import { supabase } from '../lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDb(row: any): InventoryEntry {
  return {
    id: row.id,
    sodaName: row.soda_name,
    quantity: row.quantity,
    sodaId: row.soda_id ?? null,
    createdAt: row.created_at,
  };
}

export function useInventory(userId: string | undefined) {
  const [items, setItems] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!userId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('soda_name', { ascending: true });
    if (!error && data) setItems(data.map(fromDb));
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const add = useCallback(async (sodaName: string, sodaId: string | null) => {
    if (!userId) return;
    // If entry already exists for this soda, increment instead
    const existing = items.find(
      (i) => sodaId ? i.sodaId === sodaId : i.sodaName.toLowerCase() === sodaName.toLowerCase()
    );
    if (existing) {
      await setQuantity(existing.id, existing.quantity + 1);
      return;
    }
    const { error } = await supabase.from('inventory').insert({
      user_id: userId,
      soda_name: sodaName,
      quantity: 1,
      soda_id: sodaId,
    });
    if (!error) await fetchItems();
    else alert(`Failed to add item: ${error.message}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, items, fetchItems]);

  const setQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity < 0) return;
    const { error } = await supabase
      .from('inventory')
      .update({ quantity })
      .eq('id', id);
    if (!error) setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity } : i));
    else alert(`Failed to update quantity: ${error.message}`);
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
    else alert(`Failed to remove item: ${error.message}`);
  }, []);

  const link = useCallback(async (inventoryId: string, sodaId: string) => {
    const { error } = await supabase
      .from('inventory')
      .update({ soda_id: sodaId })
      .eq('id', inventoryId);
    if (!error) setItems((prev) => prev.map((i) => i.id === inventoryId ? { ...i, sodaId } : i));
  }, []);

  const unlink = useCallback(async (inventoryId: string) => {
    const { error } = await supabase
      .from('inventory')
      .update({ soda_id: null })
      .eq('id', inventoryId);
    if (!error) setItems((prev) => prev.map((i) => i.id === inventoryId ? { ...i, sodaId: null } : i));
  }, []);

  return { items, loading, add, setQuantity, remove, link, unlink };
}
