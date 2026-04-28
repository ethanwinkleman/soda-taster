import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SodaComment {
  id: string;
  sodaId: string;
  stashId: string;
  userId: string;
  displayName: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  replies: SodaComment[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDb(row: any): Omit<SodaComment, 'replies'> {
  return {
    id: row.id,
    sodaId: row.soda_id,
    stashId: row.stash_id,
    userId: row.user_id,
    displayName: row.display_name,
    body: row.body,
    parentId: row.parent_id ?? null,
    createdAt: row.created_at,
  };
}

function buildTree(flat: Omit<SodaComment, 'replies'>[]): SodaComment[] {
  const map = new Map<string, SodaComment>();
  flat.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  const roots: SodaComment[] = [];
  flat.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(map.get(c.id)!);
    } else {
      roots.push(map.get(c.id)!);
    }
  });
  return roots;
}

export function useSodaComments(sodaId: string | undefined, stashId: string | undefined) {
  const [comments, setComments] = useState<SodaComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!sodaId) return;
    setLoading(true);
    const { data } = await supabase
      .from('soda_comments')
      .select('*')
      .eq('soda_id', sodaId)
      .order('created_at', { ascending: true });
    setComments(buildTree((data ?? []).map(fromDb)));
    setLoading(false);
  }, [sodaId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Real-time: debounced re-fetch on any INSERT or DELETE (same pattern as useStashSodas).
  // The 150ms debounce collapses the local mutation echo + realtime event into one fetch.
  useEffect(() => {
    if (!sodaId) return;

    let timer: ReturnType<typeof setTimeout>;
    const silentRefetch = () => {
      clearTimeout(timer);
      timer = setTimeout(() => fetchComments(), 150);
    };

    const channel = supabase
      .channel(`soda-comments-rt-${sodaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'soda_comments', filter: `soda_id=eq.${sodaId}` }, silentRefetch)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'soda_comments', filter: `soda_id=eq.${sodaId}` }, silentRefetch)
      .subscribe();

    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, [sodaId, fetchComments]);

  const addComment = useCallback(async (
    userId: string,
    displayName: string,
    body: string,
    parentId?: string,
  ) => {
    if (!sodaId || !stashId || !body.trim()) return;
    const { error } = await supabase.from('soda_comments').insert({
      soda_id: sodaId,
      stash_id: stashId,
      user_id: userId,
      display_name: displayName,
      body: body.trim(),
      parent_id: parentId ?? null,
    });
    if (!error) await fetchComments();
  }, [sodaId, stashId, fetchComments]);

  const deleteComment = useCallback(async (commentId: string) => {
    await supabase.from('soda_comments').delete().eq('id', commentId);
    await fetchComments();
  }, [fetchComments]);

  return { comments, loading, addComment, deleteComment, refresh: fetchComments };
}
