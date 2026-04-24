import { NavLink } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';

export function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-50 bg-gray-50 dark:bg-gray-950 pt-[env(safe-area-inset-top)] border-b-[5px] border-double border-gray-800 dark:border-gray-200">
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
