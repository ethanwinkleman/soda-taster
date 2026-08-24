import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Header-left content. Plain text gets the standard title style; pass a node for icon + title combos. */
  title?: React.ReactNode;
  /**
   * dialog — centered card, scale-in (settings, forms)
   * sheet  — bottom sheet on mobile with drag-to-dismiss, centered card on sm+ (browsable lists)
   */
  variant?: 'dialog' | 'sheet';
  /** Applied to the scrollable body wrapper */
  bodyClassName?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, variant = 'dialog', bodyClassName, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Moves focus in, keeps Tab inside, and hands focus back to the trigger on close.
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const header = title !== undefined && (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
      {typeof title === 'string' ? (
        <h2 className="font-display font-bold text-gray-900 dark:text-white">{title}</h2>
      ) : (
        title
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="p-3 -m-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (variant === 'sheet' ? (
        <motion.div
          className="fixed inset-0 z-(--z-modal) bg-black/60 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className="w-full sm:max-w-sm bg-gray-50 dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 max-h-[80vh] flex flex-col shadow-[0_-8px_30px_-8px_rgba(26,21,35,0.15)] sm:shadow-2xl focus:outline-none overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 400 || info.offset.y > 120) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {header}
            <div className={twMerge('overflow-y-auto pb-[calc(2.5rem+env(safe-area-inset-bottom))]', bodyClassName)}>{children}</div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          className="fixed inset-0 z-(--z-modal) bg-black/60 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div className="flex min-h-full items-center justify-center p-6">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              className="w-full max-w-sm bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-2xl focus:outline-none"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              {header}
              <div className={bodyClassName}>{children}</div>
            </motion.div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
