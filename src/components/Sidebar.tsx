import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Plus, LogOut, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { Logo } from './Logo';
import { ShareModal } from './ShareModal';
import type { Stash } from '../types/stash';

interface Props {
  stashes: Stash[];
}

export function Sidebar({ stashes }: Props) {
  const { user, signOut } = useAuth();
  const { profile, saveProfile } = useProfile(user);
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name ?? user?.email ?? 'User') as string;
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-40">

      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-gray-100 dark:border-gray-800 shrink-0">
        <NavLink to="/"><Logo size="md" /></NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Stashes
        </p>

        <div className="space-y-0.5">
          {stashes.map((stash) => (
            <NavLink
              key={stash.id}
              to={`/stash/${stash.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`
              }
            >
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {stash.name[0]?.toUpperCase() ?? '?'}
              </span>
              <span className="flex-1 truncate">{stash.name}</span>
            </NavLink>
          ))}

          {stashes.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No stashes yet</p>
          )}

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span className="w-5 h-5 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0">
              <Plus size={10} />
            </span>
            <span>New stash…</span>
          </button>
        </div>
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-sky-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name.split(' ')[0]}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors shrink-0"
            aria-label="Share profile"
            title="Share profile"
          >
            <Share2 size={16} />
          </button>
          <button
            type="button"
            onClick={signOut}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
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
