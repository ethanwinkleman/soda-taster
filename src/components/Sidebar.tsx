import { useState, useEffect } from 'react';
import { NavLink, useMatch, useNavigate, useLocation } from 'react-router-dom';
import {
  Heart, BarChart2, PlusCircle, Refrigerator, LogOut, Share2,
  Users, ChevronDown, ChevronRight, Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../hooks/useGroups';
import { Logo } from './Logo';
import { ShareModal } from './ShareModal';
import { useProfile } from '../hooks/useProfile';

// ── Sub-page definitions ─────────────────────────────────────────────────────
const SUB_PAGES: { suffix: string; icon: LucideIcon; label: string }[] = [
  { suffix: 'favorites', icon: Heart,        label: 'Favorites' },
  { suffix: 'fridges',   icon: Refrigerator, label: 'Fridge'    },
  { suffix: 'insights',  icon: BarChart2,    label: 'Insights'  },
];

const MY_STASH_ROUTES = ['/sodas', '/favorites', '/fridges', '/insights'];

// ── Reusable nav link ────────────────────────────────────────────────────────
function NavItem({
  to,
  icon: Icon,
  label,
  indent = 1,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  indent?: 1 | 2;
}) {
  const pl = indent === 1 ? 'pl-7' : 'pl-10';
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-2.5 ${pl} pr-3 py-2 rounded-xl text-sm font-medium transition-colors ${
          isActive
            ? 'bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
        }`
      }
    >
      <Icon size={15} />
      {label}
    </NavLink>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function Sidebar() {
  const { user, signOut } = useAuth();
  const { groups } = useGroups(user?.id);
  const { profile, saveProfile } = useProfile(user);
  const navigate = useNavigate();
  const location = useLocation();

  const [shareOpen,      setShareOpen]      = useState(false);
  const [myStashOpen,    setMyStashOpen]    = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name      = (user?.user_metadata?.full_name ?? user?.email ?? 'User') as string;
  const initials  = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const isPersonalRoute = MY_STASH_ROUTES.some((r) => location.pathname === r);

  // Auto-expand the group whose shared route is currently active
  const sharedMatch   = useMatch('/shared/:groupId/*');
  const activeGroupId = sharedMatch?.params?.groupId ?? null;

  useEffect(() => {
    if (isPersonalRoute) setMyStashOpen(true);
  }, [isPersonalRoute]);

  useEffect(() => {
    if (activeGroupId) {
      setExpandedGroups((prev) =>
        prev.includes(activeGroupId) ? prev : [...prev, activeGroupId]
      );
    }
  }, [activeGroupId]);

  function toggleGroup(id: string) {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-40">

      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-gray-100 dark:border-gray-800 shrink-0">
        <NavLink to="/"><Logo size="md" /></NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">

        {/* Section label */}
        <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Stashes
        </p>

        <div className="space-y-0.5">

          {/* ── My Stash (personal / private) ──────────────── */}
          <div>
            <div className={`flex items-center gap-0.5 rounded-xl ${isPersonalRoute ? 'bg-sky-50 dark:bg-sky-900/40' : ''}`}>
              <button
                type="button"
                onClick={() => { navigate('/sodas'); setMyStashOpen(true); }}
                className={`flex-1 flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isPersonalRoute
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <span className="w-5 h-5 rounded-md bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shrink-0">
                  <Lock size={10} className="text-white" />
                </span>
                <span className="flex-1 text-left">My Stash</span>
              </button>
              <button
                type="button"
                onClick={() => setMyStashOpen((v) => !v)}
                className={`p-2 rounded-xl transition-colors ${
                  isPersonalRoute
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {myStashOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            </div>
            {myStashOpen && (
              <div className="space-y-0.5 mt-0.5">
                {SUB_PAGES.map(({ suffix, icon, label }) => (
                  <NavItem key={suffix} to={`/${suffix}`} icon={icon} label={label} indent={2} />
                ))}
              </div>
            )}
          </div>

          {/* ── Shared stashes (groups) ─────────────────────── */}
          {groups.map((group) => {
            const isExpanded = expandedGroups.includes(group.id);
            const isActive   = activeGroupId === group.id;
            return (
              <div key={group.id}>
                <div className={`flex items-center gap-0.5 rounded-xl ${isActive ? 'bg-sky-50 dark:bg-sky-900/40' : ''}`}>
                  <button
                    type="button"
                    onClick={() => { navigate(`/groups/${group.id}`); if (!isExpanded) toggleGroup(group.id); }}
                    className={`flex-1 flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {group.name[0].toUpperCase()}
                    </span>
                    <span className="flex-1 text-left truncate">{group.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`p-2 rounded-xl transition-colors ${
                      isActive
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                </div>
                {isExpanded && (
                  <div className="space-y-0.5 mt-0.5">
                    {SUB_PAGES.map(({ suffix, icon, label }) => (
                      <NavItem
                        key={suffix}
                        to={`/shared/${group.id}/${suffix}`}
                        icon={icon}
                        label={label}
                        indent={2}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* New shared stash shortcut */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span className="w-5 h-5 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0">
              <Users size={10} />
            </span>
            <span>New shared stash…</span>
          </button>

        </div>
      </nav>

      {/* Rate a Soda CTA */}
      <div className="px-3 pb-4 shrink-0">
        <NavLink
          to="/add"
          className="flex items-center justify-center gap-2 w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
        >
          <PlusCircle size={18} />
          Rate a Soda
        </NavLink>
      </div>

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
