import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Group } from '../types/group';

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function useGroups(userId: string | undefined) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch();
  }, [userId]);

  async function fetch() {
    setLoading(true);
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (!memberships?.length) { setGroups([]); setLoading(false); return; }

    const ids = memberships.map((m) => m.group_id);
    const { data } = await supabase.from('groups').select('*').in('id', ids);
    setGroups(data ?? []);
    setLoading(false);
  }

  async function createGroup(name: string): Promise<{ group: Group | null; error: string | null }> {
    if (!userId) return { group: null, error: 'Not logged in' };
    const join_code = generateJoinCode();
    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name, owner_id: userId, join_code })
      .select()
      .single();

    if (error) return { group: null, error: error.message };

    // Add owner as member
    await supabase.from('group_members').insert({ group_id: group.id, user_id: userId });
    setGroups((prev) => [...prev, group]);
    return { group, error: null };
  }

  async function joinGroup(code: string): Promise<{ groupId: string | null; error: string | null }> {
    if (!userId) return { groupId: null, error: 'Not logged in' };
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('join_code', code.toUpperCase().trim())
      .single();

    if (!group) return { groupId: null, error: 'Invalid code — no group found.' };

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: userId });

    if (error?.code === '23505') {
      // Already a member — still return the group ID so we can navigate there
      setGroups((prev) => prev.find((g) => g.id === group.id) ? prev : [...prev, group]);
      return { groupId: group.id, error: null };
    }
    if (error) return { groupId: null, error: error.message };

    setGroups((prev) => [...prev, group]);
    return { groupId: group.id, error: null };
  }

  async function leaveGroup(groupId: string) {
    if (!userId) return;
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }

  return { groups, loading, createGroup, joinGroup, leaveGroup, refresh: fetch };
}
