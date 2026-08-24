import { motion } from 'framer-motion';
import type { SodaFlavorProfile } from '../lib/flavorNotes';

interface Props {
  profile: SodaFlavorProfile;
  /** Ratings withheld until you rate — their notes are withheld with them. */
  sealedCount: number;
}

/**
 * What this soda tastes of, without anyone filling in another form.
 *
 * Two rows, labelled differently on purpose. "Typical of the style" is a claim about
 * root beer in general and is safe to make about any bottle we can classify; "your
 * stash says" is a claim about this bottle, and only appears when someone actually
 * wrote it down. Blurring the two would be the whole problem — a generated tasting
 * note that reads like an observed one is worse than no note at all.
 */
export function FlavorNotes({ profile, sealedCount }: Props) {
  const { style, styleNotes, observed } = profile;
  if (!style && observed.length === 0 && sealedCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] p-4"
    >
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 mb-3">
        Flavour notes
      </p>

      {styleNotes.length > 0 && (
        <div className="mb-3">
          <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
            Typical of {style}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {styleNotes.map((n) => (
              <span
                key={n}
                className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 font-sans text-[11px] text-gray-600 dark:text-gray-300"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {observed.length > 0 && (
        <div>
          <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
            Your stash says
          </p>
          <div className="flex flex-wrap gap-1.5">
            {observed.map((n) => (
              <span
                key={n.id}
                className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 font-sans text-[11px] text-sky-700 dark:text-sky-300"
              >
                {n.label}
                {n.count > 1 && <span className="ml-1 tabular-nums opacity-60">×{n.count}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {sealedCount > 0 && (
        <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 italic mt-3">
          {sealedCount} tasting note{sealedCount !== 1 ? 's' : ''} sealed until you rate it.
        </p>
      )}

      {styleNotes.length === 0 && observed.length === 0 && sealedCount === 0 && (
        <p className="font-sans text-xs text-gray-400 dark:text-gray-500 italic">
          Nothing to go on yet — add a note when you rate it.
        </p>
      )}
    </motion.div>
  );
}
