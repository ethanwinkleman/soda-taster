import { motion } from 'framer-motion';
import type { DistributionBucket } from '../lib/ratingVisibility';

interface Props {
  buckets: DistributionBucket[];
  /** Currently filtered score, or null for "no filter". */
  selected: number | null;
  onSelect: (score: number | null) => void;
}

/**
 * How often each score gets awarded, across the whole stash.
 *
 * Drawn with plain elements rather than SVG or a chart library — same reasoning as
 * MetricChart, plus each bar has to be a real focusable control here, since clicking
 * one filters the list below. A <button> gets keyboard and screen-reader behaviour
 * for free that a <rect> would need re-implementing.
 *
 * Ten bars, always all ten: an empty bucket is the interesting part of a distribution,
 * so 0.5 and 5.0 stay on the axis even when nobody has ever awarded them.
 */
export function RatingDistribution({ buckets, selected, onSelect }: Props) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) return null;

  const max = Math.max(...buckets.map((b) => b.count));
  // Averaged over ratings, not over sodas — this is "what score do people give",
  // which is the question the chart is here to answer.
  const mean = buckets.reduce((sum, b) => sum + b.score * b.count, 0) / total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] p-4 mb-3"
    >
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
          Rating spread
        </p>
        <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 tabular-nums">
          {total} rating{total !== 1 ? 's' : ''} · {mean.toFixed(1)} avg
        </p>
      </div>

      <div className="flex items-end gap-1 h-24" role="group" aria-label="Rating distribution">
        {buckets.map((b) => {
          const isSelected = selected === b.score;
          const isDimmed = selected !== null && !isSelected;
          // Every non-zero bucket keeps a visible stub, so a lone rating at 0.5
          // is still clickable rather than a one-pixel sliver.
          const heightPct = b.count === 0 ? 0 : Math.max(8, (b.count / max) * 100);

          return (
            <button
              key={b.score}
              type="button"
              disabled={b.count === 0}
              onClick={() => onSelect(isSelected ? null : b.score)}
              aria-pressed={isSelected}
              aria-label={`${b.label} stars, ${b.count} rating${b.count !== 1 ? 's' : ''}${
                b.count === 0 ? '' : isSelected ? ' — filtering by this score' : ' — filter by this score'
              }`}
              className={`group flex-1 flex flex-col items-center justify-end h-full min-w-0 rounded-md transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                b.count === 0 ? 'cursor-default' : 'cursor-pointer'
              } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
            >
              <span
                className={`font-sans text-[10px] tabular-nums mb-1 transition-colors ${
                  isSelected
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {b.count || ''}
              </span>
              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`w-full rounded-t-md min-h-0 transition-colors ${
                  isSelected
                    ? 'bg-sky-500'
                    : b.count === 0
                      ? 'bg-transparent'
                      : 'bg-sky-300 dark:bg-sky-700 group-hover:bg-sky-400 dark:group-hover:bg-sky-600'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="flex gap-1 mt-1.5">
        {buckets.map((b) => (
          <span
            key={b.score}
            className={`flex-1 text-center font-sans text-[9px] tabular-nums min-w-0 ${
              selected === b.score
                ? 'text-sky-600 dark:text-sky-400 font-bold'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
