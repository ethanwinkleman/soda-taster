import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers, BarChart3 } from 'lucide-react';

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

const TAB = 'flex flex-col items-center justify-center flex-1 h-full transition-colors font-sans';

/**
 * Two tabs: the collections, and the ratings.
 *
 * There were three. The first was a screen whose only content was a search box and a
 * shortlist of unrated sodas — for a household that has rated everything, a screen with
 * nothing on it. Both halves moved onto the ratings page, which is where looking a past
 * rating up already belonged.
 *
 * Three was the ceiling here, not the target: a fourth tab overflowed the bar by 83px at
 * 320, and the bar is `fixed`, so a tab past the edge is invisible rather than
 * scrollable. Anything added back needs that sweep run again.
 */
export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-(--z-header) bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-700 pb-safe">
      <div className="flex items-center h-16">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${TAB} ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400 dark:text-gray-500'}`
          }
        >
          {({ isActive }) => (
            <TabContents active={isActive}>
              <Layers size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="text-[10px] uppercase tracking-widest">Collections</span>
            </TabContents>
          )}
        </NavLink>
        <NavLink
          to="/stats"
          className={({ isActive }) =>
            `${TAB} ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400 dark:text-gray-500'}`
          }
        >
          {({ isActive }) => (
            <TabContents active={isActive}>
              <BarChart3 size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="text-[10px] uppercase tracking-widest">Ratings</span>
            </TabContents>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
