import { NavLink } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';

export function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-50 bg-gray-50 dark:bg-gray-950 pt-[env(safe-area-inset-top)] border-b-[5px] border-double border-gray-800 dark:border-gray-200">
      {/* Dateline bar */}
      <div className="border-b border-gray-300 dark:border-gray-700 mx-0 px-4 py-0.5 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 font-sans">
          The Carbonated Chronicle
        </span>
        <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-sans">
          Est. MMXXVI
        </span>
      </div>
      {/* Masthead row */}
      <div className="h-12 px-4 flex items-center justify-between">
        <NavLink to="/">
          <Logo size="sm" />
        </NavLink>
        <UserMenu />
      </div>
    </header>
  );
}
