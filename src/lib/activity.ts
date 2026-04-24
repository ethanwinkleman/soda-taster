import { supabase } from './supabase';

export type ActivityAction =
  | 'soda_added' | 'soda_edited' | 'soda_removed'
  | 'rating_added' | 'rating_updated' | 'rating_removed'
  | 'member_joined' | 'member_removed';

export async function logActivity(params: {
  stashId: string;
  userId: string;
  displayName: string;
  action: ActivityAction;
  sodaId?: string;
  sodaName?: string;
  score?: number;
}) {
  await supabase.from('stash_activity').insert({
    stash_id: params.stashId,
    user_id: params.userId,
    display_name: params.displayName,
    action: params.action,
    soda_id: params.sodaId ?? null,
    soda_name: params.sodaName ?? null,
    score: params.score ?? null,
  });
}
