import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CupSoda } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/profile';
import { Logo } from '../components/Logo';

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'loading' | 'not_found' | 'private' | 'ready'>('loading');

  useEffect(() => {
    if (!username) return;
    load();
  }, [username]);

  async function load() {
    setStatus('loading');

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (!prof) { setStatus('not_found'); return; }
    if (!prof.is_public) { setStatus('private'); return; }

    setProfile(prof);
    setStatus('ready');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-sky-500 font-medium hover:underline"
        >
          Sign in
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 py-12">
        {status === 'loading' && (
          <div className="flex justify-center py-24">
            <CupSoda size={36} className="text-sky-300/50 animate-pulse" />
          </div>
        )}

        {status === 'not_found' && (
          <div className="text-center py-24">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Profile not found</h2>
            <p className="text-gray-500 dark:text-gray-400">
              There's no Soda Taster user with that username.
            </p>
          </div>
        )}

        {status === 'private' && (
          <div className="text-center py-24">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">This profile is private</h2>
            <p className="text-gray-500 dark:text-gray-400">
              This user hasn't made their profile public yet.
            </p>
          </div>
        )}

        {status === 'ready' && profile && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? ''}
                  className="w-20 h-20 rounded-full object-cover shadow"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-sky-500 flex items-center justify-center text-white text-2xl font-bold shadow">
                  {(profile.display_name ?? username ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {profile.display_name ?? username}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-10">Soda Taster member</p>

            <div className="mt-8">
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
                Want to track your own soda ratings?
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                Try Soda Taster
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
