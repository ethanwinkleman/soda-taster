import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { GroupInventoryItem } from '../types/group';

export function useGroupInventory(groupId: string | undefined, userId: string | undefined) {
  const [items, setItems] = useState<GroupInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !userId) { setLoading(false); return; }
    fetch();
  }, [groupId, userId]);

  async function fetch() {
    setLoading(true);

    const { data: invRows } = await supabase
      .from('group_inventory')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    // Get the latest log entry per item to show who last changed it
    const itemIds = (invRows ?? []).map((i) => i.id);
    const { data: logRows } = itemIds.length
      ? await supabase
          .from('group_inventory_log')
          .select('*')
          .in('inventory_item_id', itemIds)
          .order('created_at', { ascending: false })
      : { data: [] };

    // Get profiles for last-changed-by users
    const userIds = [...new Set((logRows ?? []).map((l) => l.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
      : { data: [] };

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name]));

    const result: GroupInventoryItem[] = (invRows ?? []).map((item) => {
      const latestLog = (logRows ?? []).find((l) => l.inventory_item_id === item.id);
      return {
        ...item,
        last_changed_by: latestLog ? profileMap[latestLog.user_id] ?? 'Unknown' : null,
        last_changed_at: latestLog?.created_at ?? null,
      };
    });

    setItems(result);
    setLoading(false);
  }

  async function addItem(sodaName: string, groupSodaId: string | null = null) {
    if (!groupId || !userId) return;

    // Check for duplicate
    const existing = items.find(
      (i) => i.soda_name.toLowerCase() === sodaName.toLowerCase() ||
        (groupSodaId && i.group_soda_id === groupSodaId)
    );
    if (existing) {
      await setQuantity(existing.id, existing.quantity + 1);
      return;
    }

    const { data } = await supabase
      .from('group_inventory')
      .insert({ group_id: groupId, soda_name: sodaName, group_soda_id: groupSodaId, quantity: 1, created_by: userId })
      .select()
      .single();

    if (data) {
      await supabase.from('group_inventory_log').insert({
        inventory_item_id: data.id, user_id: userId, quantity_change: 1, new_quantity: 1,
      });
    }
    await fetch();
  }

  async function setQuantity(itemId: string, newQty: number) {
    if (!userId || newQty < 0) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const change = newQty - item.quantity;
    await supabase.from('group_inventory').update({ quantity: newQty }).eq('id', itemId);
    await supabase.from('group_inventory_log').insert({
      inventory_item_id: itemId, user_id: userId, quantity_change: change, new_quantity: newQty,
    });
    await fetch();
  }

  async function removeItem(itemId: string) {
    if (!userId) return;
    await supabase.from('group_inventory').delete().eq('id', itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function linkSoda(itemId: string, groupSodaId: string) {
    await supabase.from('group_inventory').update({ group_soda_id: groupSodaId }).eq('id', itemId);
    await fetch();
  }

  return { items, loading, addItem, setQuantity, removeItem, linkSoda, refresh: fetch };
}
