import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        options: typeof options === 'string' ? { title: options } : options,
        resolve,
      });
    });
  }, []);

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            key="confirm-backdrop"
            className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleCancel}
          >
            <motion.div
              className="w-full max-w-sm bg-white dark:bg-gray-900 border-2 border-gray-800 dark:border-gray-200 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-5">
                <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white leading-tight">
                  {state.options.title}
                </h2>
                {state.options.body && (
                  <p className="mt-2 font-sans text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {state.options.body}
                  </p>
                )}
              </div>
              <div className="flex border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3.5 font-sans text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-r border-gray-200 dark:border-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`flex-1 py-3.5 font-sans text-sm font-bold transition-colors ${
                    state.options.destructive
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950'
                      : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {state.options.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
