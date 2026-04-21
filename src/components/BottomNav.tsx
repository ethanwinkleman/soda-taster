import { NavLink } from 'react-router-dom';
import { Layers } from 'lucide-react';

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-50 dark:bg-gray-950 border-t-[5px] border-double border-gray-800 dark:border-gray-200">
      <div className="flex items-center justify-center h-16 pb-safe">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 px-8 h-full transition-colors font-sans ${
              isActive
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Layers size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="text-[10px] uppercase tracking-widest">Collections</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
