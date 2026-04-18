import { NavLink } from 'react-router-dom';
import { List, Heart, BarChart2, PlusCircle, Package, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

const links = [
  { to: '/', icon: List, label: 'All Sodas', end: true },
  { to: '/favorites', icon: Heart, label: 'Favorites', end: false },
  { to: '/inventory', icon: Package, label: 'Inventory', end: false },
  { to: '/charts', icon: BarChart2, label: 'Charts', end: false },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name ?? user?.email ?? 'User') as string;
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-40">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-gray-100 dark:border-gray-800 shrink-0">
        <NavLink to="/">
          <Logo size="md" />
        </NavLink>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Add Soda CTA */}
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
            onClick={signOut}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
