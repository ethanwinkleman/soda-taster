import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/profile';
import type { User } from '@supabase/supabase-js';

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchProfile();
  }, [user?.id]);

  async function fetchProfile() {
    if (!user) return;
    setLoading(true);

    const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (!existing) {
      // Auto-create profile from Google metadata so member names show in groups
      const display_name = (user.user_metadata?.full_name ?? user.email ?? '') as string;
      const avatar_url = (user.user_metadata?.avatar_url ?? null) as string | null;
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: user.id, display_name, avatar_url })
        .select()
        .single();
      setProfile(created ?? null);
    } else {
      setProfile(existing);
    }
    setLoading(false);
  }

  async function saveProfile(updates: { username?: string; is_public?: boolean }): Promise<string | null> {
    if (!user) return 'Not logged in';

    // Sync display_name and avatar_url from Google on every save
    const display_name = (user.user_metadata?.full_name ?? user.email ?? '') as string;
    const avatar_url = (user.user_metadata?.avatar_url ?? null) as string | null;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name, avatar_url, ...updates })
      .select()
      .single();

    if (error) return error.message;
    setProfile(data);
    return null;
  }

  return { profile, loading, saveProfile };
}
