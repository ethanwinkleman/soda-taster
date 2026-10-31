import { motion } from 'framer-motion';
import { EyeOff, Sparkles } from 'lucide-react';
import type { Reveal } from '../lib/reveal';
import { formatScore } from '../lib/reveal';

/**
 * The moment after a rating lands.
 *
 * Rating used to produce nothing: you picked a number and the number appeared. This is
 * the one place the app can tell you something you did not already know — either the
 * group's sealed verdict opens in front of you, or yours becomes the sealed one.
 */
export function RevealCard({ reveal, sodaName }: { reveal: Reveal; sodaName: string }) {
  const sealed = reveal.state === 'sealed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] p-5 text-center"
    >
      <div className="flex items-center justify-center gap-1.5 text-sky-600 dark:text-sky-400">
        {sealed ? <EyeOff size={14} /> : <Sparkles size={14} />}
        <span className="font-sans text-[10px] uppercase tracking-[0.2em]">
          {sealed ? 'Your verdict is in' : 'The verdict'}
        </span>
      </div>

      <p className="mt-2 font-display text-2xl font-bold text-gray-900 dark:text-white">
        {reveal.headline}
      </p>
      <p className="mt-1 font-sans text-sm text-gray-600 dark:text-gray-400">{reveal.detail}</p>

      {/* The numbers themselves, yours first. Only drawn once they are unsealed: while
          sealed there is nothing to compare against, and showing a lone figure would be
          the same silent write this card exists to replace. */}
      {!sealed && (
        <motion.div
          className="mt-4 flex items-end justify-center gap-5"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } } }}
        >
          {[{ name: 'You', score: reveal.mine }, ...reveal.others].map((r, i) => (
            <motion.div
              key={`${r.name}-${i}`}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-base tabular-nums ${
                  i === 0
                    ? 'bg-gradient-to-br from-sky-500 to-cyan-500 text-white'
                    : 'border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200'
                }`}
              >
                {formatScore(r.score)}
              </span>
              <span className="font-sans text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 max-w-16 truncate">
                {r.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}

      <p className="mt-4 font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate">
        {sodaName}
      </p>
    </motion.div>
  );
}
