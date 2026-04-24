import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, LogOut, Share2, Star } from 'lucide-react';
import { StashIcon } from './StashIcon';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { Logo } from './Logo';
import { ShareModal } from './ShareModal';
import { Skeleton } from './Skeleton';
import type { Stash } from '../types/stash';

interface Props {
  stashes: Stash[];
  loading: boolean;
  onToggleFavorite: (stashId: string) => void;
}

export function Sidebar({ stashes, loading, onToggleFavorite }: Props) {
  const { user, signOut } = useAuth();
  const { profile, saveProfile } = useProfile(user);
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name ?? user?.email ?? 'User') as string;
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-gray-50 dark:bg-gray-950 border-r-2 border-gray-800 dark:border-gray-200 z-40">

      {/* Masthead */}
      <div className="px-5 py-4 border-b-[5px] border-double border-gray-800 dark:border-gray-200 shrink-0 flex flex-col items-center gap-1">
        <NavLink to="/" className="block text-center">
          <Logo size="md" />
        </NavLink>
        <p className="text-[9px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 font-sans">
          The Carbonated Chronicle
        </p>
      </div>

      {/* Navigation column */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-500 border-b border-gray-300 dark:border-gray-700 mb-2">
          Your Collections
        </p>

        <div className="space-y-px">
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 pl-3 pr-3 py-2">
              <Skeleton className="w-5 h-5 shrink-0" />
              <Skeleton className="h-3 flex-1" style={{ width: `${55 + (i * 13) % 30}%` }} />
            </div>
          ))}
          <AnimatePresence initial={false}>
          {!loading && stashes.map((stash) => (
            <motion.div
              key={stash.id}
              layout
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="relative group"
            >
              <NavLink
                to={`/stash/${stash.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 pl-3 pr-8 py-2 text-sm font-sans font-medium transition-colors border-l-2 ${
                    isActive
                      ? 'border-gray-900 dark:border-gray-100 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  }`
                }
              >
                {stash.icon ? (
                  <span className="w-5 h-5 border border-gray-400 dark:border-gray-600 flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    <StashIcon name={stash.icon} size={12} />
                  </span>
                ) : (
                  <span className="w-5 h-5 border border-gray-400 dark:border-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 bg-gray-100 dark:bg-gray-800 font-sans">
                    {stash.name[0]?.toUpperCase() ?? '?'}
                  </span>
                )}
                <span className="flex-1 truncate">{stash.name}</span>
              </NavLink>
              <button
                type="button"
                onClick={() => onToggleFavorite(stash.id)}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 transition-opacity ${
                  stash.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                aria-label={stash.isFavorite ? 'Unpin' : 'Pin to top'}
                title={stash.isFavorite ? 'Unpin' : 'Pin to top'}
              >
                <Star
                  size={11}
                  className={stash.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-gray-400 dark:text-gray-500'}
                />
              </button>
            </motion.div>
          ))}
          </AnimatePresence>

          {!loading && stashes.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 font-sans italic">No collections yet</p>
          )}

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 pl-3 pr-3 py-2 text-sm font-sans font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors border-l-2 border-transparent"
          >
            <span className="w-5 h-5 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0">
              <Plus size={10} />
            </span>
            <span>New collection…</span>
          </button>
        </div>
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-4 py-3 border-t-2 border-gray-800 dark:border-gray-200 shrink-0 flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-400" />
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-gray-700 dark:border-gray-300 text-gray-700 dark:text-gray-300 text-xs font-bold flex items-center justify-center shrink-0 font-sans">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate font-sans">{name.split(' ')[0]}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate font-sans">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            aria-label="Share profile"
            title="Share profile"
          >
            <Share2 size={15} />
          </button>
          <button
            type="button"
            onClick={signOut}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}

      {shareOpen && user && (
        <ShareModal
          user={user}
          profile={profile}
          onSave={saveProfile}
          onClose={() => setShareOpen(false)}
        />
      )}
    </aside>
  );
}
