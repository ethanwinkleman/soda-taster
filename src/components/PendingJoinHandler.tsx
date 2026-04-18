import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PENDING_KEY = 'pendingJoinCode';

/**
 * Silently processes a pending group-join code stored in localStorage.
 * Rendered inside AppRoutes (authenticated), so it fires right after sign-in.
 */
export function PendingJoinHandler() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const code = localStorage.getItem(PENDING_KEY);
    if (!code || !user) return;

    localStorage.removeItem(PENDING_KEY);

    (async () => {
      const { data: group } = await supabase
        .from('groups')
        .select('*')
        .eq('join_code', code)
        .single();

      if (!group) return;

      // Insert membership (ignore duplicate error — already a member is fine)
      await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id });

      navigate(`/groups/${group.id}`, { replace: true });
    })();
  }, [user]);

  return null;
}
