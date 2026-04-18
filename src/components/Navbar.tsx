import { NavLink } from 'react-router-dom';
import { List, Heart, BarChart2, PlusCircle, CupSoda, Refrigerator } from 'lucide-react';
import { UserMenu } from './UserMenu';

const links = [
  { to: '/', icon: <List size={20} />, label: 'All Sodas' },
  { to: '/favorites', icon: <Heart size={20} />, label: 'Favorites' },
  { to: '/inventory', icon: <Refrigerator size={20} />, label: 'Inventory' },
  { to: '/charts', icon: <BarChart2 size={20} />, label: 'Charts' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-lg no-underline">
          <CupSoda size={24} className="text-sky-400" />
          <span>Soda Taster</span>
        </NavLink>

        <nav className="flex items-center gap-1">
          {links.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`
              }
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/add"
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <PlusCircle size={18} />
            <span className="hidden sm:inline">Add Soda</span>
          </NavLink>
          <div className="ml-1">
            <UserMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}
