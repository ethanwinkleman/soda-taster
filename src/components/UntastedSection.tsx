import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CupSoda, EyeOff, Refrigerator } from 'lucide-react';
import type { UntastedSoda } from '../hooks/useHomeUntasted';
import { hapticTap } from '../lib/haptics';

interface Props {
  title: string;
  /** One line under the heading saying why this list is worth looking at. */
  blurb: string;
  sodas: UntastedSoda[];
  tone: 'sealed' | 'fridge';
  /** Beyond this, the rest are summarised rather than listed. */
  max?: number;
}

const listVariants = { visible: { transition: { staggerChildren: 0.04 } } };
const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const } },
};

/**
 * A short list of sodas the viewer could act on right now.
 *
 * Deliberately shows no score. Everything here is unrated by the viewer, so under the
 * blind-rating rule every verdict on it is sealed — the count is the whole point: it
 * says there is something to find out without saying what.
 */
export function UntastedSection({ title, blurb, sodas, tone, max = 4 }: Props) {
  const navigate = useNavigate();
  if (sodas.length === 0) return null;

  const shown = sodas.slice(0, max);
  const rest = sodas.length - shown.length;

  return (
    <section className="mb-6">
      <h2 className="font-display text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        {title}
      </h2>
      <p className="mt-0.5 mb-2 font-sans text-xs text-gray-500 dark:text-gray-400">{blurb}</p>

      <motion.div
        className="space-y-2"
        initial="hidden"
        animate="visible"
        variants={listVariants}
      >
        {shown.map((soda) => (
          <motion.button
            key={soda.id}
            type="button"
            variants={rowVariants}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => { hapticTap(); navigate(`/stash/${soda.stashId}/soda/${soda.id}`); }}
            className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] flex items-center gap-3 p-3"
          >
            {soda.imageUrl ? (
              <img
                src={soda.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-gray-700 dark:to-gray-800">
                <CupSoda size={20} className="text-sky-400 dark:text-gray-500" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-gray-900 dark:text-gray-100 truncate leading-snug">
                {soda.name}
              </p>
              <p className="mt-0.5 font-sans text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 truncate">
                {soda.stashName}
                {soda.brand && ` · ${soda.brand}`}
              </p>
            </div>

            {tone === 'sealed' ? (
              <span
                className="shrink-0 flex items-center gap-1 font-sans text-[10px] uppercase tracking-wide text-sky-600 dark:text-sky-400"
                title="Rate it yourself to see what everyone else gave it"
              >
                <EyeOff size={12} />
                {soda.ratingCount}
              </span>
            ) : (
              <span className="shrink-0 flex items-center gap-1 font-sans text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <Refrigerator size={12} />
                {soda.quantity > 0 ? `×${soda.quantity}` : ''}
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>

      {rest > 0 && (
        <p className="mt-2 font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 tabular-nums">
          and {rest} more
        </p>
      )}
    </section>
  );
}
