import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity';
import type { Stash, StashMember } from '../types/stash';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDb(row: any, isFavorite = false, sodaCount = 0): Stash {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? null,
    ownerId: row.owner_id,
    joinCode: row.join_code,
    createdAt: row.created_at,
    isFavorite,
    sodaCount,
  };
}

function sortStashes(list: Stash[]): Stash[] {
  return [...list].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    if (a.isFavorite && b.isFavorite) return a.name.localeCompare(b.name);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function useStashes(userId: string | undefined) {
  const [stashes, setStashes] = useState<Stash[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setStashes([]); setLoading(false); return; }
    fetchStashes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchStashes() {
    if (!userId) return;
    setLoading(true);

    const { data: memberships } = await supabase
      .from('stash_members')
      .select('stash_id, is_favorite')
      .eq('user_id', userId);

    if (!memberships?.length) { setStashes([]); setLoading(false); return; }

    const favoriteMap = new Map(memberships.map((m) => [m.stash_id, m.is_favorite ?? false]));
    const ids = memberships.map((m) => m.stash_id);
    const [{ data }, { data: sodaRows }] = await Promise.all([
      supabase.from('stashes').select('*').in('id', ids),
      supabase.from('stash_sodas').select('stash_id').in('stash_id', ids),
    ]);

    const countMap = new Map<string, number>();
    (sodaRows ?? []).forEach((r) => countMap.set(r.stash_id, (countMap.get(r.stash_id) ?? 0) + 1));

    const result = (data ?? []).map((row) =>
      fromDb(row, favoriteMap.get(row.id) ?? false, countMap.get(row.id) ?? 0)
    );
    setStashes(sortStashes(result));
    setLoading(false);
  }

  async function createStash(name: string): Promise<{ stash: Stash | null; error: string | null }> {
    if (!userId) return { stash: null, error: 'Not logged in' };

    const joinCode = generateJoinCode();
    const { data, error } = await supabase
      .from('stashes')
      .insert({ name, owner_id: userId, join_code: joinCode })
      .select()
      .single();

    if (error || !data) return { stash: null, error: error?.message ?? 'Unknown error' };

    await supabase.from('stash_members').insert({ stash_id: data.id, user_id: userId });
    const stash = fromDb(data);
    setStashes((prev) => sortStashes([stash, ...prev]));
    return { stash, error: null };
  }

  async function renameStash(id: string, name: string): Promise<string | null> {
    const { error } = await supabase.from('stashes').update({ name }).eq('id', id);
    if (error) return error.message;
    setStashes((prev) => sortStashes(prev.map((s) => s.id === id ? { ...s, name } : s)));
    return null;
  }

  async function updateStashIcon(id: string, icon: string | null): Promise<void> {
    setStashes((prev) => prev.map((s) => s.id === id ? { ...s, icon } : s));
    await supabase.from('stashes').update({ icon }).eq('id', id);
  }

  async function deleteStash(id: string): Promise<string | null> {
    const { error } = await supabase.from('stashes').delete().eq('id', id);
    if (error) return error.message;
    setStashes((prev) => prev.filter((s) => s.id !== id));
    return null;
  }

  async function joinStash(code: string, displayName?: string): Promise<{ stashId: string | null; error: string | null }> {
    if (!userId) return { stashId: null, error: 'Not logged in' };

    const { data } = await supabase.rpc('lookup_stash_by_code', { code: code.toUpperCase().trim() });
    const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!found) return { stashId: null, error: 'Invalid code — no stash found.' };

    const { error } = await supabase
      .from('stash_members')
      .insert({ stash_id: found.id, user_id: userId });

    if (error?.code === '23505') {
      setStashes((prev) => prev.find((s) => s.id === found.id) ? prev : sortStashes([fromDb(found), ...prev]));
      if (userId && displayName && found.id) {
        await logActivity({ stashId: found.id, userId, displayName, action: 'member_joined' });
      }
      return { stashId: found.id, error: null };
    }
    if (error) return { stashId: null, error: error.message };

    if (userId && displayName && found.id) {
      await logActivity({ stashId: found.id, userId, displayName, action: 'member_joined' });
    }
    setStashes((prev) => sortStashes([fromDb(found), ...prev]));
    return { stashId: found.id, error: null };
  }

  async function leaveStash(id: string) {
    if (!userId) return;
    await supabase.from('stash_members').delete().eq('stash_id', id).eq('user_id', userId);
    setStashes((prev) => prev.filter((s) => s.id !== id));
  }

  async function toggleFavorite(stashId: string): Promise<void> {
    const stash = stashes.find((s) => s.id === stashId);
    if (!stash || !userId) return;
    const newVal = !stash.isFavorite;
    setStashes((prev) => sortStashes(prev.map((s) => s.id === stashId ? { ...s, isFavorite: newVal } : s)));
    await supabase
      .from('stash_members')
      .update({ is_favorite: newVal })
      .eq('stash_id', stashId)
      .eq('user_id', userId);
  }

  async function getMembers(stashId: string): Promise<StashMember[]> {
    const { data: memberRows } = await supabase
      .from('stash_members')
      .select('user_id, joined_at')
      .eq('stash_id', stashId);

    if (!memberRows?.length) return [];

    const userIds = memberRows.map((m) => m.user_id);

    const [{ data: profiles }, { data: sodaRows }] = await Promise.all([
      supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds),
      supabase.from('stash_sodas').select('id').eq('stash_id', stashId),
    ]);

    // Fall back to the display_name stored on ratings if the profile has none
    let ratingNames: { user_id: string; display_name: string }[] = [];
    if (sodaRows?.length) {
      const sodaIds = sodaRows.map((s) => s.id);
      const { data } = await supabase
        .from('stash_soda_ratings')
        .select('user_id, display_name')
        .in('soda_id', sodaIds)
        .in('user_id', userIds);
      ratingNames = (data ?? []).filter((r) => r.display_name);
    }

    return memberRows.map((m) => {
      const profile = (profiles ?? []).find((p) => p.id === m.user_id);
      const ratingName = ratingNames.find((r) => r.user_id === m.user_id)?.display_name ?? null;
      return {
        userId: m.user_id,
        displayName: profile?.display_name ?? ratingName,
        avatarUrl: profile?.avatar_url ?? null,
        joinedAt: m.joined_at,
      };
    });
  }

  async function removeMember(stashId: string, targetUserId: string, displayName?: string) {
    await supabase
      .from('stash_members')
      .delete()
      .eq('stash_id', stashId)
      .eq('user_id', targetUserId);
    if (userId && displayName) {
      await logActivity({ stashId, userId, displayName, action: 'member_removed' });
    }
  }

  return {
    stashes,
    loading,
    createStash,
    renameStash,
    updateStashIcon,
    deleteStash,
    joinStash,
    leaveStash,
    toggleFavorite,
    getMembers,
    removeMember,
    refresh: fetchStashes,
  };
}
