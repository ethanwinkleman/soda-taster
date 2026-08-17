import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CupSoda } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/profile';
import { Logo } from '../components/Logo';
import { motion } from 'framer-motion';
import { ScoreBadge } from '../components/ScoreBadge';
import { Skeleton } from '../components/Skeleton';

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
      <header className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
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
          <div>
            {/* Profile header */}
            <div className="mb-8">
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-full shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-2.5 w-28" />
                </div>
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 mt-3" />
            </div>

            {/* Ratings list */}
            <Skeleton className="h-2.5 w-32 mb-3" />
            <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b border-gray-200 dark:border-gray-700">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-1">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {status === 'not_found' && (
          <div className="text-center py-24">
            <p className="font-display text-gray-500 dark:text-gray-400">No taster found with that name.</p>
          </div>
        )}

        {status === 'private' && (
          <div className="text-center py-24">
            <p className="font-display text-gray-500 dark:text-gray-400">This taster's ratings are private.</p>
          </div>
        )}

        {status === 'ready' && profile && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Profile header */}
            <div className="mb-8">
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name ?? ''}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-sky-500 dark:ring-sky-400 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-xl font-bold font-display text-white shrink-0">
                    {(profile.display_name ?? username ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                    {profile.display_name ?? username}
                  </h1>
                  <p className="text-xs font-sans uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mt-0.5">
                    Soda Taster
                  </p>
                </div>
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 mt-3" />
            </div>

            {/* Ratings list */}
            {ratings.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <CupSoda size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <p className="font-display text-gray-500 dark:text-gray-400">No ratings yet.</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-3">
                  {ratings.length} Soda{ratings.length !== 1 ? 's' : ''} Rated
                </p>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.035 } } }}
                  className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"
                >
                  {ratings.map((r) => (
                    <motion.div
                      key={r.soda_id}
                      variants={{
                        hidden: { opacity: 0, y: 6 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
                      }}
                      className="flex items-center gap-3 py-3 px-3 bg-white dark:bg-gray-800"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-gray-900 dark:text-gray-100 truncate">{r.soda_name}</p>
                        {r.soda_brand && (
                          <p className="text-xs font-sans text-gray-500 dark:text-gray-400 truncate">{r.soda_brand}</p>
                        )}
                      </div>
                      <ScoreBadge score={r.score} size="sm" />
                    </motion.div>
                  ))}
                </motion.div>

                <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
                  <p className="text-xs font-sans text-gray-400 dark:text-gray-500 mb-3">
                    Track your own soda ratings
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="px-5 py-2 rounded-xl font-sans text-xs font-bold uppercase tracking-wider text-white bg-sky-600 dark:bg-sky-400 dark:text-gray-950 hover:bg-sky-700 dark:hover:bg-sky-300 transition-colors"
                  >
                    Try Soda Taster
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
