import { motion } from 'framer-motion';
import { Check, ChevronRight, X } from 'lucide-react';
import type { Step, StepId } from '../lib/onboarding';

interface Props {
  steps: Step[];
  /** Tapping an unfinished step goes to the place it happens. */
  onStep: (id: StepId) => void;
  onDismiss: () => void;
}

/**
 * The three things that make the app do anything, and which of them are done.
 *
 * Not a tour and not a modal: it sits in the page, above the collections, and every row
 * is the shortcut to the thing it describes. A tour would explain the same three steps
 * in front of an empty screen and then leave — this stays until the loop has been
 * completed once, then removes itself.
 */
export function GettingStarted({ steps, onStep, onDismiss }: Props) {
  const done = steps.filter((s) => s.done).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      aria-labelledby="getting-started-heading"
      className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h2 id="getting-started-heading" className="font-display font-bold text-gray-900 dark:text-white leading-none">
            Getting started
          </h2>
          <p className="mt-1 font-sans text-[11px] text-gray-500 dark:text-gray-400">
            {done} of {steps.length} done
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Hide getting started"
          className="p-2 -m-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Progress: the same information as "1 of 3", but readable at a glance */}
      <div className="mx-4 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${(done / steps.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <motion.ol
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        className="mt-3 divide-y divide-gray-100 dark:divide-gray-700/60"
      >
        {steps.map((step, i) => (
          <motion.li
            key={step.id}
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
          >
            <motion.button
              type="button"
              onClick={() => onStep(step.id)}
              disabled={step.done}
              whileTap={step.done ? undefined : { scale: 0.99 }}
              className="w-full flex items-start gap-3 px-4 py-3 text-left enabled:hover:bg-gray-50 dark:enabled:hover:bg-gray-700/40 transition-colors disabled:cursor-default"
            >
              <span
                aria-hidden
                className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center font-sans text-[10px] font-bold ${
                  step.done
                    ? 'bg-cyan-500 text-white'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.done ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className={`block font-sans text-sm font-bold ${
                  step.done ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {step.title}
                  {step.done && <span className="sr-only"> (done)</span>}
                </span>
                {!step.done && (
                  <span className="block mt-0.5 font-sans text-xs text-gray-500 dark:text-gray-400 leading-snug">
                    {step.hint}
                  </span>
                )}
              </span>

              {!step.done && (
                <ChevronRight size={15} className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-600" />
              )}
            </motion.button>
          </motion.li>
        ))}
      </motion.ol>
    </motion.section>
  );
}
