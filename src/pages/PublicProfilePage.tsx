import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CupSoda } from 'lucide-react';
import { supabase, fromDb } from '../lib/supabase';
import type { Profile } from '../types/profile';
import type { SodaEntry } from '../types/soda';
import { SodaCard } from '../components/SodaCard';
import { Logo } from '../components/Logo';

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sodas, setSodas] = useState<SodaEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'not_found' | 'private' | 'ready'>('loading');

  useEffect(() => {
    if (!username) return;
    load();
  }, [username]);

  async function load() {
    setStatus('loading');

    // Look up profile by username
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (!prof) { setStatus('not_found'); return; }
    if (!prof.is_public) { setStatus('private'); return; }

    setProfile(prof);

    // Fetch their sodas (RLS allows this for public profiles)
    const { data: rows } = await supabase
      .from('sodas')
      .select('*')
      .eq('user_id', prof.id)
      .order('date_rated', { ascending: false });

    setSodas((rows ?? []).map(fromDb));
    setStatus('ready');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Simple public header */}
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

      <main className="max-w-4xl mx-auto px-4 py-8 pb-10">
        {status === 'loading' && (
          <div className="flex justify-center py-24">
            <CupSoda size={36} className="text-sky-300/50 animate-pulse" />
          </div>
        )}

        {status === 'not_found' && (
          <div className="text-center py-24">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Profile not found</h2>
            <p className="text-gray-500 dark:text-gray-400">There's no Soda Taster user with that username.</p>
          </div>
        )}

        {status === 'private' && (
          <div className="text-center py-24">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">This profile is private</h2>
            <p className="text-gray-500 dark:text-gray-400">This user hasn't made their ratings public yet.</p>
          </div>
        )}

        {status === 'ready' && profile && (
          <>
            {/* Profile header */}
            <div className="flex items-center gap-4 mb-8">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name ?? ''} className="w-16 h-16 rounded-full object-cover shadow" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center text-white text-xl font-bold shadow">
                  {(profile.display_name ?? username ?? '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.display_name ?? username}
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {sodas.length} soda{sodas.length !== 1 ? 's' : ''} rated
                </p>
              </div>
            </div>

            {sodas.length === 0 ? (
              <div className="text-center py-16">
                <CupSoda size={48} className="text-sky-300/50 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No sodas rated yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sodas.map((soda) => (
                  <SodaCard
                    key={soda.id}
                    soda={soda}
                    onToggleFavorite={() => {}}
                    readOnly
                  />
                ))}
              </div>
            )}

            {/* Footer CTA */}
            <div className="mt-12 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">Want to track your own soda ratings?</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                Try Soda Taster
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
