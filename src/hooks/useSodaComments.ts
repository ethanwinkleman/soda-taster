import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

async function loadComments(sodaId: string): Promise<SodaComment[]> {
  const { data } = await supabase
    .from('soda_comments')
    .select('*')
    .eq('soda_id', sodaId)
    .order('created_at', { ascending: true });
  return buildTree((data ?? []).map(fromDb));
}

export function useSodaComments(sodaId: string | undefined, stashId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['soda-comments', sodaId] as const;

  // Was a useState + useEffect fetch, which set state synchronously inside the effect.
  // Moving to useQuery removes that and lines the hook up with the rest of the app:
  // keyed cache, no refetch when several components mount it, background revalidation.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => loadComments(sodaId!),
    enabled: !!sodaId,
    staleTime: 60 * 1000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['soda-comments', sodaId] }),
    [queryClient, sodaId],
  );

  // Real-time: debounced invalidate on any INSERT or DELETE (same pattern as useStashSodas).
  // The 150ms debounce collapses the local mutation echo + realtime event into one fetch.
  useEffect(() => {
    if (!sodaId) return;

    let timer: ReturnType<typeof setTimeout>;
    const silentRefetch = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ['soda-comments', sodaId] }),
        150,
      );
    };

    const channel = supabase
      .channel(`soda-comments-rt-${sodaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'soda_comments', filter: `soda_id=eq.${sodaId}` }, silentRefetch)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'soda_comments', filter: `soda_id=eq.${sodaId}` }, silentRefetch)
      .subscribe();

    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, [sodaId, queryClient]);

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
    if (error) throw new Error('Failed to post comment');
    await refresh();
  }, [sodaId, stashId, refresh]);

  const deleteComment = useCallback(async (commentId: string) => {
    const { error } = await supabase.from('soda_comments').delete().eq('id', commentId);
    if (error) throw new Error('Failed to delete comment');
    await refresh();
  }, [refresh]);

  return { comments: data ?? [], loading: isLoading, addComment, deleteComment, refresh };
}
