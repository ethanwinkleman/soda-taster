import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity';
import type { Stash, StashMember, RecentRatingActivity } from '../types/stash';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDb(
  row: any,
  isFavorite = false,
  sodaCount = 0,
  lastTastedAt: string | null = null,
  newActivityCount = 0,
): Stash {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? null,
    ownerId: row.owner_id,
    joinCode: row.join_code,
    createdAt: row.created_at,
    isFavorite,
    sodaCount,
    accentColor: row.accent_color ?? null,
    lastTastedAt,
    newActivityCount,
  };
}

function sortStashes(list: Stash[]): Stash[] {
  return [...list].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    if (a.isFavorite && b.isFavorite) return a.name.localeCompare(b.name);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function markVisited(stashId: string) {
  try {
    localStorage.setItem(`stash_last_visit_${stashId}`, new Date().toISOString());
  } catch {
    // localStorage unavailable
  }
}

interface StashesData {
  stashes: Stash[];
  recentActivity: RecentRatingActivity[];
}

async function loadStashes(userId: string): Promise<StashesData> {
  const { data: memberships } = await supabase
    .from('stash_members')
    .select('stash_id, is_favorite')
    .eq('user_id', userId);

  if (!memberships?.length) return { stashes: [], recentActivity: [] };

  const favoriteMap = new Map(memberships.map((m) => [m.stash_id, m.is_favorite ?? false]));
  const ids = memberships.map((m) => m.stash_id);

  const [{ data }, { data: sodaRows }, { data: activityRows }] = await Promise.all([
    supabase.from('stashes').select('*').in('id', ids),
    supabase.from('stash_sodas').select('stash_id').in('stash_id', ids),
    supabase
      .from('stash_activity')
      .select('stash_id, soda_id, soda_name, score, display_name, user_id, created_at')
      .in('stash_id', ids)
      .in('action', ['rating_added', 'rating_updated'])
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const countMap = new Map<string, number>();
  (sodaRows ?? []).forEach((r) => countMap.set(r.stash_id, (countMap.get(r.stash_id) ?? 0) + 1));

  const lastTastedMap = new Map<string, string>();
  const newActivityCountMap = new Map<string, number>();
  (activityRows ?? []).forEach((r) => {
    if (!lastTastedMap.has(r.stash_id)) lastTastedMap.set(r.stash_id, r.created_at);
    if (r.user_id === userId) return;
    const lastVisit = localStorage.getItem(`stash_last_visit_${r.stash_id}`);
    if (!lastVisit || new Date(r.created_at) > new Date(lastVisit)) {
      newActivityCountMap.set(r.stash_id, (newActivityCountMap.get(r.stash_id) ?? 0) + 1);
    }
  });

  const recentActivity: RecentRatingActivity[] = (activityRows ?? []).slice(0, 5).map((r) => ({
    sodaId: r.soda_id ?? null,
    sodaName: r.soda_name ?? 'Unknown soda',
    stashId: r.stash_id,
    score: r.score != null ? Number(r.score) : null,
    displayName: r.display_name,
    createdAt: r.created_at,
  }));

  const stashes = sortStashes((data ?? []).map((row) =>
    fromDb(
      row,
      favoriteMap.get(row.id) ?? false,
      countMap.get(row.id) ?? 0,
      lastTastedMap.get(row.id) ?? null,
      newActivityCountMap.get(row.id) ?? 0,
    )
  ));

  return { stashes, recentActivity };
}

export function useStashes(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['stashes', userId] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => loadStashes(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const stashes = data?.stashes ?? [];
  const recentActivity = data?.recentActivity ?? [];

  // Real-time: invalidate when any member adds/removes sodas or records ratings
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout>;
    const invalidateDebounced = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ['stashes', userId] }),
        300,
      );
    };
    const channel = supabase
      .channel(`stashes-rt-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stash_activity' }, invalidateDebounced)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stash_sodas' }, invalidateDebounced)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stash_sodas' }, invalidateDebounced)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  function patch(updater: (prev: Stash[]) => Stash[]) {
    queryClient.setQueryData<StashesData>(queryKey, (old) =>
      old ? { ...old, stashes: updater(old.stashes) } : old
    );
  }

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['stashes', userId] });
  }

  async function createStash(name: string): Promise<{ stash: Stash | null; error: string | null }> {
    if (!userId) return { stash: null, error: 'Not logged in' };
    const joinCode = generateJoinCode();
    const { data: row, error } = await supabase
      .from('stashes')
      .insert({ name, owner_id: userId, join_code: joinCode })
      .select()
      .single();
    if (error || !row) return { stash: null, error: error?.message ?? 'Unknown error' };
    await supabase.from('stash_members').insert({ stash_id: row.id, user_id: userId });
    const stash = fromDb(row);
    patch((prev) => sortStashes([stash, ...prev]));
    await invalidate();
    return { stash, error: null };
  }

  async function renameStash(id: string, name: string): Promise<string | null> {
    const { error } = await supabase.from('stashes').update({ name }).eq('id', id);
    if (error) return error.message;
    patch((prev) => sortStashes(prev.map((s) => s.id === id ? { ...s, name } : s)));
    return null;
  }

  async function updateStashIcon(id: string, icon: string | null): Promise<void> {
    patch((prev) => prev.map((s) => s.id === id ? { ...s, icon } : s));
    await supabase.from('stashes').update({ icon }).eq('id', id);
  }

  async function updateAccentColor(id: string, color: string | null): Promise<void> {
    patch((prev) => prev.map((s) => s.id === id ? { ...s, accentColor: color } : s));
    await supabase.from('stashes').update({ accent_color: color }).eq('id', id);
  }

  async function deleteStash(id: string): Promise<string | null> {
    const { error } = await supabase.from('stashes').delete().eq('id', id);
    if (error) return error.message;
    patch((prev) => prev.filter((s) => s.id !== id));
    return null;
  }

  async function joinStash(code: string, displayName?: string): Promise<{ stashId: string | null; error: string | null }> {
    if (!userId) return { stashId: null, error: 'Not logged in' };
    const { data: rpcData } = await supabase.rpc('lookup_stash_by_code', { code: code.toUpperCase().trim() });
    const found = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;
    if (!found) return { stashId: null, error: 'Invalid code — no stash found.' };
    const { error } = await supabase.from('stash_members').insert({ stash_id: found.id, user_id: userId });
    if (error?.code === '23505') {
      patch((prev) => prev.find((s) => s.id === found.id) ? prev : sortStashes([fromDb(found), ...prev]));
      if (userId && displayName && found.id) {
        await logActivity({ stashId: found.id, userId, displayName, action: 'member_joined' });
      }
      return { stashId: found.id, error: null };
    }
    if (error) return { stashId: null, error: error.message };
    if (userId && displayName && found.id) {
      await logActivity({ stashId: found.id, userId, displayName, action: 'member_joined' });
    }
    patch((prev) => sortStashes([fromDb(found), ...prev]));
    await invalidate();
    return { stashId: found.id, error: null };
  }

  async function leaveStash(id: string) {
    if (!userId) return;
    await supabase.from('stash_members').delete().eq('stash_id', id).eq('user_id', userId);
    patch((prev) => prev.filter((s) => s.id !== id));
  }

  async function toggleFavorite(stashId: string): Promise<void> {
    const stash = stashes.find((s) => s.id === stashId);
    if (!stash || !userId) return;
    const newVal = !stash.isFavorite;
    patch((prev) => sortStashes(prev.map((s) => s.id === stashId ? { ...s, isFavorite: newVal } : s)));
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
    loading: isLoading,
    recentActivity,
    createStash,
    renameStash,
    updateStashIcon,
    updateAccentColor,
    deleteStash,
    joinStash,
    leaveStash,
    toggleFavorite,
    getMembers,
    removeMember,
    refresh: invalidate,
  };
}
