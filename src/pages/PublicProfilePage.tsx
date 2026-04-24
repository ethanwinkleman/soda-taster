import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CupSoda } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/profile';
import { Logo } from '../components/Logo';
import { ScoreBadge } from '../components/ScoreBadge';

interface PublicRating {
  soda_id: string;
  soda_name: string;
  soda_brand: string;
  score: number;
  rated_at: string;
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<PublicRating[]>([]);
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

    const { data: ratingRows } = await supabase.rpc('get_public_ratings', { p_user_id: prof.id });

    setProfile(prof);
    setRatings(ratingRows ?? []);
    setStatus('ready');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-gray-50 dark:bg-gray-950 border-b-[5px] border-double border-gray-800 dark:border-gray-200 px-4 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-xs font-sans font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          Sign in
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10">
        {status === 'loading' && (
          <div className="flex justify-center py-24">
            <div className="w-5 h-5 border-2 border-gray-700 dark:border-gray-300 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {status === 'not_found' && (
          <div className="text-center py-24">
            <p className="font-display italic text-gray-500 dark:text-gray-400">No correspondent found with that name.</p>
          </div>
        )}

        {status === 'private' && (
          <div className="text-center py-24">
            <p className="font-display italic text-gray-500 dark:text-gray-400">This correspondent's records are private.</p>
          </div>
        )}

        {status === 'ready' && profile && (
          <div>
            {/* Profile header */}
            <div className="mb-8">
              <div className="border-t-2 border-gray-800 dark:border-gray-200 mb-2" />
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name ?? ''}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-700 dark:border-gray-300 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 border-2 border-gray-700 dark:border-gray-300 flex items-center justify-center text-xl font-black font-display text-gray-700 dark:text-gray-300 shrink-0">
                    {(profile.display_name ?? username ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="font-display text-2xl font-black italic text-gray-900 dark:text-white">
                    {profile.display_name ?? username}
                  </h1>
                  <p className="text-xs font-sans uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mt-0.5">
                    Soda Correspondent
                  </p>
                </div>
              </div>
              <div className="border-b border-gray-400 dark:border-gray-600 mt-3" />
            </div>

            {/* Ratings list */}
            {ratings.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-700">
                <CupSoda size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <p className="font-display italic text-gray-500 dark:text-gray-400">No ratings on record yet.</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-3">
                  {ratings.length} Soda{ratings.length !== 1 ? 's' : ''} Rated
                </p>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b border-gray-300 dark:border-gray-600">
                  {ratings.map((r) => (
                    <div key={r.soda_id} className="flex items-center gap-3 py-3 px-1 bg-white dark:bg-gray-800">
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-gray-900 dark:text-gray-100 truncate">{r.soda_name}</p>
                        {r.soda_brand && (
                          <p className="text-xs font-sans italic text-gray-500 dark:text-gray-400 truncate">{r.soda_brand}</p>
                        )}
                      </div>
                      <ScoreBadge score={r.score} size="sm" />
                    </div>
                  ))}
                </div>

                <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
                  <p className="text-xs font-sans text-gray-400 dark:text-gray-500 mb-3 italic">
                    Track your own soda ratings
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="px-5 py-2 font-sans text-xs font-bold uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
                  >
                    Try Soda Taster
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
