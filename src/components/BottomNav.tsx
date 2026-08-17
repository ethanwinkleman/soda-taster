import { NavLink, useLocation, matchPath } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers, Plus } from 'lucide-react';

/** Shared so the active indicator slides between tabs rather than cutting. */
const INDICATOR = 'bottomnav-active';

function TabContents({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.span
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className="relative flex flex-col items-center justify-center gap-0.5"
    >
      {active && (
        <motion.span
          layoutId={INDICATOR}
          className="absolute -top-2 h-0.5 w-6 rounded-full bg-sky-500 dark:bg-sky-400"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
      {children}
    </motion.span>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();
  const match = matchPath('/stash/:id/*', pathname) ?? matchPath('/stash/:id', pathname);
  const stashId = match?.params.id;
  const onAddPage = !!matchPath('/stash/:id/add', pathname);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-(--z-header) bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-700 pb-safe">
      <div className="flex items-center justify-around h-16">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-8 h-full transition-colors font-sans ${
              isActive
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-gray-400 dark:text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <TabContents active={isActive}>
              <Layers size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="text-[10px] uppercase tracking-widest">Collections</span>
            </TabContents>
          )}
        </NavLink>
        {stashId && (
          <NavLink
            to={`/stash/${stashId}/add`}
            className={`flex flex-col items-center justify-center px-8 h-full transition-colors font-sans ${
              onAddPage
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <TabContents active={onAddPage}>
              <Plus size={20} strokeWidth={onAddPage ? 2.5 : 1.75} />
              <span className="text-[10px] uppercase tracking-widest">Add</span>
            </TabContents>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
