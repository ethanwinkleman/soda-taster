import { NavLink } from 'react-router-dom';
import { List, Heart, BarChart2, Package, Plus } from 'lucide-react';

const tabs = [
  { to: '/', icon: List, label: 'Sodas', end: true },
  { to: '/favorites', icon: Heart, label: 'Favorites', end: false },
  { to: '/inventory', icon: Package, label: 'Inventory', end: false },
  { to: '/charts', icon: BarChart2, label: 'Charts', end: false },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center h-16 pb-safe">
        {/* First 2 tabs */}
        {tabs.slice(0, 2).map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-xs font-medium transition-colors ${
                isActive
                  ? 'text-sky-500 dark:text-sky-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Center FAB */}
        <div className="flex-shrink-0 flex items-center justify-center px-4">
          <NavLink
            to="/add"
            className="w-14 h-14 -mt-5 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30 transition-colors"
            aria-label="Rate a Soda"
          >
            <Plus size={28} strokeWidth={2.5} />
          </NavLink>
        </div>

        {/* Last 2 tabs */}
        {tabs.slice(2).map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-xs font-medium transition-colors ${
                isActive
                  ? 'text-sky-500 dark:text-sky-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
