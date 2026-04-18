import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { GroupSodaWithData, GroupSoda, GroupSodaRating, MemberProfile } from '../types/group';
import type { CategoryRatings } from '../types/soda';

export function useGroupSodas(groupId: string | undefined, userId: string | undefined) {
  const [sodas, setSodas] = useState<GroupSodaWithData[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !userId) { setLoading(false); return; }
    fetch();
  }, [groupId, userId]);

  async function fetch() {
    setLoading(true);

    // Fetch members + their profiles
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    const memberIds = (memberRows ?? []).map((m) => m.user_id);
    const { data: profiles } = memberIds.length
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', memberIds)
      : { data: [] };

    const memberProfiles: MemberProfile[] = (profiles ?? []).map((p) => ({
      user_id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    }));
    setMembers(memberProfiles);

    // Fetch sodas
    const { data: sodaRows } = await supabase
      .from('group_sodas')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    const sodaIds = (sodaRows ?? []).map((s) => s.id);

    const [{ data: ratingRows }, { data: favRows }] = await Promise.all([
      sodaIds.length
        ? supabase.from('group_soda_ratings').select('*').in('group_soda_id', sodaIds)
        : { data: [] },
      sodaIds.length
        ? supabase.from('group_soda_favorites').select('*').in('group_soda_id', sodaIds)
        : { data: [] },
    ]);

    const result: GroupSodaWithData[] = (sodaRows ?? []).map((s: GroupSoda) => {
      const memberRatings: GroupSodaRating[] = (ratingRows ?? []).filter(
        (r) => r.group_soda_id === s.id
      );
      const favoritedBy: string[] = (favRows ?? [])
        .filter((f) => f.group_soda_id === s.id)
        .map((f) => f.user_id);
      const avgScore = memberRatings.length
        ? Math.round((memberRatings.reduce((sum, r) => sum + r.overall_score, 0) / memberRatings.length) * 10) / 10
        : null;
      const myRating = memberRatings.find((r) => r.user_id === userId) ?? null;

      return { ...s, memberRatings, favoritedBy, avgScore, myRating };
    });

    setSodas(result);
    setLoading(false);
  }

  async function addSoda(
    data: Omit<GroupSoda, 'id' | 'group_id' | 'created_by' | 'created_at'>,
    rating: { ratings: CategoryRatings; overall_score: number; notes: string }
  ) {
    if (!groupId || !userId) return;

    const { data: soda, error } = await supabase
      .from('group_sodas')
      .insert({ ...data, group_id: groupId, created_by: userId })
      .select()
      .single();

    if (error || !soda) return;

    await supabase.from('group_soda_ratings').insert({
      group_soda_id: soda.id,
      user_id: userId,
      ratings: rating.ratings,
      overall_score: rating.overall_score,
      notes: rating.notes,
    });

    await fetch();
  }

  async function saveRating(
    sodaId: string,
    rating: { ratings: CategoryRatings; overall_score: number; notes: string }
  ) {
    if (!userId) return;
    await supabase.from('group_soda_ratings').upsert(
      { group_soda_id: sodaId, user_id: userId, ...rating },
      { onConflict: 'group_soda_id,user_id' }
    );
    await fetch();
  }

  async function toggleFavorite(sodaId: string) {
    if (!userId) return;
    const soda = sodas.find((s) => s.id === sodaId);
    if (!soda) return;

    if (soda.favoritedBy.includes(userId)) {
      await supabase
        .from('group_soda_favorites')
        .delete()
        .eq('group_soda_id', sodaId)
        .eq('user_id', userId);
    } else {
      await supabase.from('group_soda_favorites').insert({ group_soda_id: sodaId, user_id: userId });
    }
    await fetch();
  }

  return { sodas, members, loading, addSoda, saveRating, toggleFavorite, refresh: fetch };
}
