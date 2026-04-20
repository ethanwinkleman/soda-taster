import { NavLink } from 'react-router-dom';
import { Layers } from 'lucide-react';

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-center h-16 pb-safe">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 px-8 h-full text-xs font-medium transition-colors ${
              isActive
                ? 'text-sky-500 dark:text-sky-400'
                : 'text-gray-400 dark:text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Layers size={22} strokeWidth={isActive ? 2.5 : 1.75} />
              <span>Stashes</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
