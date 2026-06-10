import { NavLink, useLocation, matchPath } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';
import type { Stash } from '../types/stash';

interface Props {
  stashes: Stash[];
}

export function MobileHeader({ stashes }: Props) {
  const { pathname } = useLocation();
  const match = matchPath('/stash/:id/*', pathname) ?? matchPath('/stash/:id', pathname);
  const stashName = match ? stashes.find((s) => s.id === match.params.id)?.name : undefined;

  return (
    <header className="md:hidden sticky top-0 z-50 bg-gray-50 dark:bg-gray-950 pt-[env(safe-area-inset-top)] border-b-[5px] border-double border-gray-800 dark:border-gray-200">
      {/* Masthead row */}
      <div className="h-12 px-4 flex items-center justify-between gap-3">
        <NavLink to="/">
          <Logo size="sm" />
        </NavLink>
        {stashName && (
          <span className="flex-1 min-w-0 truncate text-center font-display text-sm font-bold italic text-gray-700 dark:text-gray-300">
            {stashName}
          </span>
        )}
        <UserMenu />
      </div>
    </header>
  );
}
