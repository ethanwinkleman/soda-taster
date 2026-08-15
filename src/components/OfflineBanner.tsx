import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

/**
 * Tells the taster their ratings are safe while the connection is not.
 * Stays out of the way when online with nothing queued.
 */
export function OfflineBanner() {
  const { isOnline, pendingCount } = useOfflineStatus();

  const show = !isOnline || pendingCount > 0;
  const saved = pendingCount === 1 ? '1 change' : `${pendingCount} changes`;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-(--z-header) px-4"
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gray-900 dark:bg-gray-800 text-gray-100 border border-gray-700 shadow-[0_8px_28px_-8px_rgba(26,21,35,0.5)]">
            {isOnline ? (
              <RefreshCw size={13} className="shrink-0 text-cyan-400 animate-spin" />
            ) : (
              <CloudOff size={13} className="shrink-0 text-amber-400" />
            )}
            <span className="font-sans text-xs leading-snug">
              {isOnline
                ? `Syncing ${saved}…`
                : pendingCount > 0
                  ? `Offline — ${saved} saved, will sync`
                  : 'Offline — your ratings are saved here'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
