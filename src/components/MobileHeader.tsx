import { NavLink } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';

export function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-100 dark:border-gray-800 pt-[env(safe-area-inset-top)]">
      <div className="h-14 px-4 flex items-center justify-between">
        <NavLink to="/">
          <Logo size="sm" />
        </NavLink>
        <UserMenu />
      </div>
    </header>
  );
}
