import { NavLink } from 'react-router-dom';
import { CupSoda } from 'lucide-react';
import { UserMenu } from './UserMenu';

export function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-100 dark:border-gray-800">
      <div className="h-14 px-4 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2">
          <CupSoda size={22} className="text-sky-400" />
          <span className="font-bold text-gray-900 dark:text-white">Soda Taster</span>
        </NavLink>
        <UserMenu />
      </div>
    </header>
  );
}
